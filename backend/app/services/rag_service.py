"""
RAGサービス - ストリーミング対応 + 戦略切り替え対応
"""

import asyncio
import json
import re
import time
from pathlib import Path
from typing import AsyncGenerator, Optional

from google.api_core.exceptions import ResourceExhausted
from langchain_core.callbacks import BaseCallbackHandler
from langchain_core.documents import Document
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnablePassthrough
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings, ChunkingStrategy, DocumentSet
from app.services.document_service import get_document_service
from app.services.vectorstore_service import get_vectorstore_service
from app.services.embedding_service import get_embedding_service
from app.utils.errors import RAGException, ErrorMessages, GeminiAPIException


def classify_gemini_error(error: Exception) -> GeminiAPIException:
    """
    Gemini APIエラーをリトライ可能/不可能に分類する

    Args:
        error: 発生した例外

    Returns:
        GeminiAPIException: 分類された例外
    """
    error_str = str(error)

    if isinstance(error, ResourceExhausted):
        # limit: 0 の場合はクォータ枯渇（リトライ不可）
        if "limit: 0" in error_str:
            return GeminiAPIException(
                ErrorMessages.GEMINI_QUOTA_EXHAUSTED,
                "QUOTA_EXHAUSTED",
                is_retryable=False,
            )

        # retry in Xs の形式からリトライ待機時間を抽出
        retry_match = re.search(r"retry in (\d+\.?\d*)s", error_str, re.IGNORECASE)
        retry_after = float(retry_match.group(1)) if retry_match else None

        return GeminiAPIException(
            ErrorMessages.GEMINI_RATE_LIMITED,
            "RATE_LIMITED",
            is_retryable=True,
            retry_after=retry_after,
        )

    # その他のGeminiエラー
    return GeminiAPIException(
        ErrorMessages.GEMINI_API_ERROR,
        "GEMINI_ERROR",
        is_retryable=False,
    )


class StreamingCallbackHandler(BaseCallbackHandler):
    """ストリーミングコールバックハンドラ"""

    def __init__(self, queue: asyncio.Queue):
        self.queue = queue

    def on_llm_new_token(self, token: str, **kwargs) -> None:
        """新しいトークンが生成されたときに呼ばれる"""
        self.queue.put_nowait({"type": "token", "data": {"token": token}})


def format_docs_with_citations(
    docs: list[Document],
    use_parent_content: bool = False,
    use_original_content: bool = False,
) -> str:
    """引用メタデータ付きでドキュメントをフォーマット

    Args:
        docs: ドキュメントのリスト
        use_parent_content: Parent-Child戦略で親コンテンツを使用するか
        use_original_content: Hypothetical Questions戦略で元コンテンツを使用するか
    """
    formatted = []
    for doc in docs:
        source = doc.metadata.get("source", "unknown")
        start_line = doc.metadata.get("start_line", "?")
        end_line = doc.metadata.get("end_line", "?")

        # 読みやすさのためファイル名のみ使用
        filename = Path(source).name

        header = f"[{filename}:{start_line}-{end_line}]"

        # Hypothetical Questions戦略の場合、元のチャンクコンテンツを使用
        # (インデックスは質問だが、LLMには元のコンテンツを渡す)
        if use_original_content and doc.metadata.get("original_content"):
            content = doc.metadata["original_content"]
        # Parent-child戦略の場合、親コンテンツを使用
        elif use_parent_content and doc.metadata.get("parent_content"):
            content = doc.metadata["parent_content"]
        else:
            content = doc.page_content

        formatted.append(f"{header}\n{content}")

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
            max_retries=0,  # Disable LangChain's internal retry - we handle retries ourselves
        )

    def initialize(
        self,
        document_set: Optional[DocumentSet] = None,
        strategy: Optional[ChunkingStrategy] = None,
    ) -> None:
        """サービスを初期化"""
        # 埋め込みサービスを初期化
        embedding_service = get_embedding_service()
        _ = embedding_service.embeddings  # モデルをロード

        # Use defaults if not specified
        document_set = document_set or self.settings.default_document_set
        strategy = strategy or self.settings.default_chunking_strategy

        # ドキュメントサービスを取得
        doc_service = get_document_service()
        vectorstore_service = get_vectorstore_service()

        # ベクトルストアを初期化 (指定されたdocument_setとstrategyで)
        if vectorstore_service.exists(document_set, strategy):
            vectorstore_service.get_or_create(
                document_set=document_set,
                strategy=strategy,
            )
        elif doc_service.has_documents(document_set):
            documents = doc_service.load_documents(document_set)
            chunks = doc_service.split_documents(documents, strategy)
            vectorstore_service.get_or_create(chunks, document_set, strategy)

        self._initialized = True
        print(f"RAGサービスの初期化完了 (document_set={document_set.value}, strategy={strategy.value})", flush=True)

    def ensure_collection_ready(
        self,
        document_set: DocumentSet,
        strategy: ChunkingStrategy,
    ) -> bool:
        """Ensure the specified collection is ready, building if necessary"""
        vectorstore_service = get_vectorstore_service()
        doc_service = get_document_service()

        # Try to set active collection (loads from disk if exists)
        if vectorstore_service.set_active_collection(document_set, strategy):
            return True

        # Need to build the collection
        if not doc_service.has_documents(document_set):
            return False

        print(f"Building collection: {document_set.value}_{strategy.value}", flush=True)
        documents = doc_service.load_documents(document_set)
        chunks = doc_service.split_documents(documents, strategy)
        vectorstore_service.get_or_create(chunks, document_set, strategy)
        return True

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
        document_set: Optional[DocumentSet] = None,
        strategy: Optional[ChunkingStrategy] = None,
        use_reranking: Optional[bool] = None,
    ) -> AsyncGenerator[dict, None]:
        """ストリーミングでRAGクエリを実行"""
        start_time = time.time()

        # Use defaults if not specified
        document_set = document_set or self.settings.default_document_set
        strategy = strategy or self.settings.default_chunking_strategy
        use_reranking = use_reranking or False

        # 初期化チェック
        if not self._initialized:
            self.initialize(document_set, strategy)

        # Ensure the requested collection is ready
        if not self.ensure_collection_ready(document_set, strategy):
            yield {
                "type": "error",
                "data": {"message": f"ドキュメントセット '{document_set.value}' が見つかりません"},
            }
            return

        vectorstore_service = get_vectorstore_service()

        # 関連ドキュメントをスコア付きで取得
        # リランキングが有効な場合は多めに取得
        retrieval_k = self.settings.reranker_initial_k if use_reranking else None
        docs_with_scores = vectorstore_service.similarity_search_with_score(
            question,
            document_set=document_set,
            strategy=strategy,
            k=retrieval_k,
        )

        # リランキングを適用
        if use_reranking and docs_with_scores:
            from app.services.reranker_service import get_reranker_service
            reranker = get_reranker_service()
            docs_with_scores = reranker.rerank(
                question,
                docs_with_scores,
                top_k=self.settings.reranker_top_k,
            )

        # docsのみのリストも作成
        docs = [doc for doc, score in docs_with_scores]

        # Determine content source based on strategy
        use_parent = strategy == ChunkingStrategy.PARENT_CHILD
        use_original = strategy == ChunkingStrategy.HYPOTHETICAL_QUESTIONS

        # チャンク情報を送信（スコア付き）
        chunks_info = []
        for doc, score in docs_with_scores:
            source = doc.metadata.get("source", "unknown")
            chunk_info = {
                "filename": Path(source).name,
                "start_line": doc.metadata.get("start_line", 0),
                "end_line": doc.metadata.get("end_line", 0),
                "content": doc.page_content,
                "content_preview": doc.page_content[:150] + "..." if len(doc.page_content) > 150 else doc.page_content,
                "score": round(float(score), 4),
                "chunking_strategy": doc.metadata.get("chunking_strategy", "unknown"),
            }

            # Add parent content if available (Parent-Child strategy)
            if doc.metadata.get("parent_content"):
                chunk_info["has_parent"] = True
                chunk_info["parent_content_preview"] = doc.metadata["parent_content"][:200] + "..."

            # Add original content if available (Hypothetical Questions strategy)
            if doc.metadata.get("original_content"):
                chunk_info["is_question"] = True
                chunk_info["original_content"] = doc.metadata["original_content"]
                chunk_info["original_content_preview"] = doc.metadata["original_content"][:200] + "..."

            chunks_info.append(chunk_info)

        # Send chunks event (renamed from sources for clarity)
        yield {
            "type": "chunks",
            "data": {
                "chunks": chunks_info,
                "document_set": document_set.value,
                "strategy": strategy.value,
            }
        }

        # Also send sources for backwards compatibility
        sources = []
        for doc, score in docs_with_scores:
            source = doc.metadata.get("source", "unknown")
            sources.append({
                "filename": Path(source).name,
                "start_line": doc.metadata.get("start_line", 0),
                "end_line": doc.metadata.get("end_line", 0),
                "content_preview": doc.page_content[:100] + "..." if len(doc.page_content) > 100 else doc.page_content,
            })

        yield {"type": "sources", "data": {"sources": sources}}

        # コンテキストをフォーマット
        # - parent-childの場合は親コンテンツを使用
        # - hypothetical_questionsの場合は元のチャンクコンテンツを使用
        context = format_docs_with_citations(
            docs,
            use_parent_content=use_parent,
            use_original_content=use_original,
        )
        history_text = format_history(history or [])

        # プロンプトを構築
        template = """あなたは親切なアシスタントです。以下のコンテキストに基づいて質問に答えてください。

## 引用形式
各コンテキストには[ファイル名:行番号]形式の出典が付いています。
回答で情報を引用する際は、同じ形式で引用してください（例：[規程.md:10-20]）。

## 回答形式
- 重要なポイントは**太字**で強調してください
- 複数の項目がある場合は箇条書き（* または -）を使用してください
- 段落間は空行を入れてください

コンテキストに答えが見つからない場合は、「この情報はドキュメントに含まれていません。」と答えてください。

{history_section}

コンテキスト:
{context}

質問: {question}

回答:"""

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

        # 非同期でチェーンを実行（リトライロジック付き）
        async def run_chain():
            max_retries = 2
            base_delay = 2.0

            for attempt in range(max_retries + 1):
                try:
                    await asyncio.to_thread(
                        chain.invoke,
                        {
                            "context": context,
                            "question": question,
                            "history_section": history_section,
                        },
                    )
                    # 成功した場合は終了
                    break
                except ResourceExhausted as e:
                    gemini_error = classify_gemini_error(e)

                    if not gemini_error.is_retryable or attempt == max_retries:
                        # リトライ不可またはリトライ回数超過
                        await queue.put({
                            "type": "error",
                            "data": {
                                "message": gemini_error.message,
                                "code": gemini_error.code,
                            },
                        })
                        break

                    # リトライ可能 - 待機してリトライ
                    delay = gemini_error.retry_after or (base_delay * (2 ** attempt))
                    print(f"Gemini API rate limited. Retrying in {delay:.1f}s (attempt {attempt + 1}/{max_retries})", flush=True)
                    await asyncio.sleep(delay)
                except TypeError as e:
                    # langchain-google-genai の一時的なエラー
                    # (例: 'Response' object is not subscriptable)
                    if attempt < max_retries:
                        delay = base_delay * (2 ** attempt)
                        print(f"LLM TypeError (attempt {attempt + 1}/{max_retries}): {e}. Retrying in {delay:.1f}s", flush=True)
                        await asyncio.sleep(delay)
                    else:
                        print(f"LLM error after {max_retries + 1} attempts: {e}", flush=True)
                        await queue.put({
                            "type": "error",
                            "data": {
                                "message": ErrorMessages.LLM_ERROR,
                                "code": "LLM_ERROR",
                            },
                        })
                        break
                except Exception as e:
                    # その他のエラー - リトライしない
                    print(f"LLM error: {e}", flush=True)
                    await queue.put({
                        "type": "error",
                        "data": {
                            "message": ErrorMessages.LLM_ERROR,
                            "code": "LLM_ERROR",
                        },
                    })
                    break

            # 終了シグナル
            await queue.put(None)

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
        yield {
            "type": "done",
            "data": {
                "processing_time_ms": processing_time,
                "document_set": document_set.value,
                "strategy": strategy.value,
            }
        }

    def rebuild_vectorstore(
        self,
        document_set: Optional[DocumentSet] = None,
        strategy: Optional[ChunkingStrategy] = None,
    ) -> int:
        """ベクトルストアを再構築"""
        document_set = document_set or self.settings.default_document_set
        strategy = strategy or self.settings.default_chunking_strategy

        doc_service = get_document_service()
        vectorstore_service = get_vectorstore_service()

        if not doc_service.has_documents(document_set):
            raise RAGException(ErrorMessages.NO_DOCUMENTS, "NO_DOCUMENTS")

        documents = doc_service.load_documents(document_set)
        chunks = doc_service.split_documents(documents, strategy)
        vectorstore_service.rebuild(chunks, document_set, strategy)

        return len(chunks)

    def get_available_options(self) -> dict:
        """Get available strategies and document sets for the UI"""
        doc_service = get_document_service()
        vectorstore_service = get_vectorstore_service()

        return {
            "strategies": doc_service.get_available_strategies(),
            "document_sets": doc_service.get_available_document_sets(),
            "collections": vectorstore_service.get_available_collections(),
            "defaults": {
                "strategy": self.settings.default_chunking_strategy.value,
                "document_set": self.settings.default_document_set.value,
            }
        }

    def query(
        self,
        question: str,
        history: list[dict] | None = None,
        document_set: Optional[str] = None,
        strategy: Optional[str] = None,
        use_reranking: Optional[bool] = None,
    ) -> dict:
        """
        Synchronous RAG query for evaluation scripts.

        Args:
            question: The query question
            history: Optional conversation history
            document_set: Document set name (string for evaluation convenience)
            strategy: Chunking strategy name (string for evaluation convenience)
            use_reranking: Whether to apply cross-encoder reranking

        Returns:
            dict with 'answer' and 'chunks' keys
        """
        # Convert string params to enums if provided
        doc_set_enum = DocumentSet(document_set) if document_set else self.settings.default_document_set
        strategy_enum = ChunkingStrategy(strategy) if strategy else self.settings.default_chunking_strategy
        use_reranking = use_reranking or False

        # Initialize if needed
        if not self._initialized:
            self.initialize(doc_set_enum, strategy_enum)

        # Ensure the requested collection is ready
        if not self.ensure_collection_ready(doc_set_enum, strategy_enum):
            return {
                "answer": f"ドキュメントセット '{doc_set_enum.value}' が見つかりません",
                "chunks": []
            }

        vectorstore_service = get_vectorstore_service()

        # Get docs with scores
        # リランキングが有効な場合は多めに取得
        retrieval_k = self.settings.reranker_initial_k if use_reranking else None
        docs_with_scores = vectorstore_service.similarity_search_with_score(
            question,
            document_set=doc_set_enum,
            strategy=strategy_enum,
            k=retrieval_k,
        )

        # リランキングを適用
        if use_reranking and docs_with_scores:
            from app.services.reranker_service import get_reranker_service
            reranker = get_reranker_service()
            docs_with_scores = reranker.rerank(
                question,
                docs_with_scores,
                top_k=self.settings.reranker_top_k,
            )

        docs = [doc for doc, score in docs_with_scores]

        # Determine content source based on strategy
        use_parent = strategy_enum == ChunkingStrategy.PARENT_CHILD
        use_original = strategy_enum == ChunkingStrategy.HYPOTHETICAL_QUESTIONS

        # Build chunks info
        chunks_info = []
        for doc, score in docs_with_scores:
            source = doc.metadata.get("source", "unknown")
            chunk_info = {
                "filename": Path(source).name,
                "start_line": doc.metadata.get("start_line", 0),
                "end_line": doc.metadata.get("end_line", 0),
                "content": doc.page_content,
                "content_preview": doc.page_content[:150] + "..." if len(doc.page_content) > 150 else doc.page_content,
                "score": round(float(score), 4),
            }
            if doc.metadata.get("parent_content"):
                chunk_info["has_parent"] = True
                chunk_info["parent_content_preview"] = doc.metadata["parent_content"][:200] + "..."
            if doc.metadata.get("original_content"):
                chunk_info["is_question"] = True
                chunk_info["original_content"] = doc.metadata["original_content"]
                chunk_info["original_content_preview"] = doc.metadata["original_content"][:200] + "..."
            chunks_info.append(chunk_info)

        # Format context
        # - parent-childの場合は親コンテンツを使用
        # - hypothetical_questionsの場合は元のチャンクコンテンツを使用
        context = format_docs_with_citations(
            docs,
            use_parent_content=use_parent,
            use_original_content=use_original,
        )
        history_text = format_history(history or [])

        # Build prompt
        template = """あなたは親切なアシスタントです。以下のコンテキストに基づいて質問に答えてください。

## 引用形式
各コンテキストには[ファイル名:行番号]形式の出典が付いています。
回答で情報を引用する際は、同じ形式で引用してください（例：[規程.md:10-20]）。

## 回答形式
- 重要なポイントは**太字**で強調してください
- 複数の項目がある場合は箇条書き（* または -）を使用してください
- 段落間は空行を入れてください

コンテキストに答えが見つからない場合は、「この情報はドキュメントに含まれていません。」と答えてください。

{history_section}

コンテキスト:
{context}

質問: {question}

回答:"""

        history_section = f"会話履歴:\n{history_text}\n" if history_text else ""

        prompt = ChatPromptTemplate.from_template(template)

        # Get LLM (non-streaming)
        llm = self._get_llm(streaming=False)

        # Build and run chain
        chain = prompt | llm | StrOutputParser()

        invoke_params = {
            "context": context,
            "question": question,
            "history_section": history_section,
        }

        try:
            answer = chain.invoke(invoke_params)
        except ResourceExhausted as e:
            gemini_error = classify_gemini_error(e)
            return {
                "answer": gemini_error.message,
                "chunks": chunks_info,
                "error": gemini_error.code,
            }
        except TypeError as e:
            # langchain-google-genai の一時的なエラー - 1回リトライ
            print(f"LLM TypeError, retrying: {e}", flush=True)
            time.sleep(2)
            try:
                answer = chain.invoke(invoke_params)
            except Exception as retry_e:
                return {
                    "answer": f"エラーが発生しました: {str(retry_e)}",
                    "chunks": chunks_info,
                    "error": "LLM_ERROR",
                }
        except Exception as e:
            return {
                "answer": f"エラーが発生しました: {str(e)}",
                "chunks": chunks_info,
                "error": "LLM_ERROR",
            }

        return {
            "answer": answer,
            "chunks": chunks_info,
        }


# シングルトンインスタンス
_rag_service: RAGService | None = None


def get_rag_service() -> RAGService:
    """RAGサービスのインスタンスを取得"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service
