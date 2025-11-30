"""
RAGサービス - ストリーミング対応
"""

import asyncio
import json
import time
from pathlib import Path
from typing import AsyncGenerator

from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.services.document_service import get_document_service
from app.services.vectorstore_service import get_vectorstore_service
from app.services.embedding_service import get_embedding_service
from app.utils.errors import RAGException, ErrorMessages


class StreamingCallbackHandler(BaseCallbackHandler):
    """ストリーミングコールバックハンドラ"""

    def __init__(self, queue: asyncio.Queue):
        self.queue = queue

    def on_llm_new_token(self, token: str, **kwargs) -> None:
        """新しいトークンが生成されたときに呼ばれる"""
        self.queue.put_nowait({"type": "token", "data": {"token": token}})


def format_docs_with_citations(docs: list[Document]) -> str:
    """引用メタデータ付きでドキュメントをフォーマット"""
    formatted = []
    for doc in docs:
        source = doc.metadata.get("source", "unknown")
        start_line = doc.metadata.get("start_line", "?")
        end_line = doc.metadata.get("end_line", "?")

        # 読みやすさのためファイル名のみ使用
        filename = Path(source).name

        header = f"[出典: {filename}, {start_line}-{end_line}行目]"
        formatted.append(f"{header}\n{doc.page_content}")

    return "\n\n---\n\n".join(formatted)


def format_history(history: list[dict]) -> str:
    """会話履歴をフォーマット"""
    if not history:
        return ""

    formatted = []
    for msg in history[-6:]:  # 直近6件のみ
        role = "ユーザー" if msg.get("role") == "user" else "アシスタント"
        content = msg.get("content", "")
        formatted.append(f"{role}: {content}")

    return "\n".join(formatted)


class RAGService:
    """RAGサービス"""

    def __init__(self):
        self.settings = get_settings()
        self._llm: ChatGoogleGenerativeAI | None = None
        self._initialized = False

    def _get_llm(self, streaming: bool = False, callback_handler: BaseCallbackHandler | None = None) -> ChatGoogleGenerativeAI:
        """LLMインスタンスを取得"""
        if not self.settings.google_api_key:
            raise RAGException(ErrorMessages.API_KEY_MISSING, "API_KEY_MISSING")

        callbacks = [callback_handler] if callback_handler else None

        return ChatGoogleGenerativeAI(
            model=self.settings.llm_model,
            google_api_key=self.settings.google_api_key,
            temperature=self.settings.llm_temperature,
            streaming=streaming,
            callbacks=callbacks,
        )

    def initialize(self) -> None:
        """サービスを初期化"""
        if self._initialized:
            return

        # 埋め込みサービスを初期化
        embedding_service = get_embedding_service()
        _ = embedding_service.embeddings  # モデルをロード

        # ドキュメントサービスを取得
        doc_service = get_document_service()
        vectorstore_service = get_vectorstore_service()

        # ベクトルストアを初期化
        if vectorstore_service.exists():
            vectorstore_service.get_or_create()
        elif doc_service.has_documents():
            documents = doc_service.load_documents()
            chunks = doc_service.split_documents(documents)
            vectorstore_service.get_or_create(chunks)

        self._initialized = True
        print("RAGサービスの初期化完了", flush=True)

    @property
    def is_ready(self) -> bool:
        """サービスが準備できているかチェック"""
        vectorstore_service = get_vectorstore_service()
        embedding_service = get_embedding_service()
        return (
            self._initialized
            and vectorstore_service.is_ready
            and embedding_service.is_ready
        )

    async def stream_query(
        self,
        question: str,
        history: list[dict] | None = None,
    ) -> AsyncGenerator[dict, None]:
        """ストリーミングでRAGクエリを実行"""
        start_time = time.time()

        # 初期化チェック
        if not self._initialized:
            self.initialize()

        vectorstore_service = get_vectorstore_service()
        if not vectorstore_service.is_ready:
            yield {
                "type": "error",
                "data": {"message": ErrorMessages.VECTORSTORE_NOT_READY},
            }
            return

        # リトリーバーを取得
        retriever = vectorstore_service.get_retriever()

        # 関連ドキュメントを取得
        docs = retriever.invoke(question)

        # ソース情報を先に送信
        sources = []
        for doc in docs:
            source = doc.metadata.get("source", "unknown")
            sources.append({
                "filename": Path(source).name,
                "start_line": doc.metadata.get("start_line", 0),
                "end_line": doc.metadata.get("end_line", 0),
                "content_preview": doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content,
            })

        yield {"type": "sources", "data": {"sources": sources}}

        # コンテキストをフォーマット
        context = format_docs_with_citations(docs)
        history_text = format_history(history or [])

        # プロンプトを構築
        template = """あなたは親切なアシスタントです。以下のコンテキストに基づいて質問に答えてください。
各コンテキストチャンクには、出典ファイルと行番号が角括弧で表示されています。
回答にコンテキストの情報を使用する場合は、[ファイル名:行番号]の形式で引用してください。

コンテキストに答えが見つからない場合は、「この情報はドキュメントに含まれていません。」と答えてください。

{history_section}

コンテキスト:
{context}

質問: {question}

回答（引用を含めてください）:"""

        history_section = ""
        if history_text:
            history_section = f"会話履歴:\n{history_text}\n"

        prompt = ChatPromptTemplate.from_template(template)

        # ストリーミング用のキューを作成
        queue: asyncio.Queue = asyncio.Queue()
        callback_handler = StreamingCallbackHandler(queue)

        # LLMを取得（ストリーミング有効）
        llm = self._get_llm(streaming=True, callback_handler=callback_handler)

        # チェーンを構築
        chain = prompt | llm | StrOutputParser()

        # 非同期でチェーンを実行
        async def run_chain():
            try:
                await asyncio.to_thread(
                    chain.invoke,
                    {
                        "context": context,
                        "question": question,
                        "history_section": history_section,
                    },
                )
            finally:
                await queue.put(None)  # 終了シグナル

        # チェーンをバックグラウンドで実行
        task = asyncio.create_task(run_chain())

        # トークンをストリーミング
        while True:
            try:
                item = await asyncio.wait_for(queue.get(), timeout=60.0)
                if item is None:
                    break
                yield item
            except asyncio.TimeoutError:
                break

        await task

        # 完了イベントを送信
        processing_time = int((time.time() - start_time) * 1000)
        yield {"type": "done", "data": {"processing_time_ms": processing_time}}

    def rebuild_vectorstore(self) -> int:
        """ベクトルストアを再構築"""
        doc_service = get_document_service()
        vectorstore_service = get_vectorstore_service()

        if not doc_service.has_documents():
            raise RAGException(ErrorMessages.NO_DOCUMENTS, "NO_DOCUMENTS")

        documents = doc_service.load_documents()
        chunks = doc_service.split_documents(documents)
        vectorstore_service.rebuild(chunks)

        return len(chunks)


# シングルトンインスタンス
_rag_service: RAGService | None = None


def get_rag_service() -> RAGService:
    """RAGサービスのインスタンスを取得"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
