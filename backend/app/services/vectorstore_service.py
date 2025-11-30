"""
ベクトルストアサービス
"""

from pathlib import Path

from langchain_chroma import Chroma
from langchain_core.documents import Document

from app.config import get_settings
from app.services.embedding_service import get_embedding_service


class VectorStoreService:
    """Chromaベクトルストア管理サービス"""

    def __init__(self):
        self.settings = get_settings()
        self._vectorstore: Chroma | None = None

    @property
    def db_path(self) -> Path:
        """ベクトルDBのパス"""
        return self.settings.chroma_db_dir

    @property
    def is_ready(self) -> bool:
        """ベクトルストアが準備できているかチェック"""
        return self._vectorstore is not None

    def get_or_create(self, chunks: list[Document] | None = None) -> Chroma:
        """既存のベクトルストアを取得、または新規作成"""
        embedding_service = get_embedding_service()

        if self.db_path.exists() and chunks is None:
            # 既存のベクトルストアを読み込み
            print(f"既存のベクトルストアを読み込み中: {self.db_path}", flush=True)
            self._vectorstore = Chroma(
                persist_directory=str(self.db_path),
                embedding_function=embedding_service.embeddings,
            )
            return self._vectorstore

        if chunks is None:
            raise ValueError("既存のベクトルストアがなく、チャンクも提供されていません")

        # 新規ベクトルストアを作成
        print(f"新しいベクトルストアを作成中: {self.db_path}", flush=True)
        self._vectorstore = Chroma.from_documents(
            documents=chunks,
            embedding=embedding_service.embeddings,
            persist_directory=str(self.db_path),
        )
        return self._vectorstore

    def rebuild(self, chunks: list[Document]) -> Chroma:
        """ベクトルストアを再構築"""
        # 既存のコレクションを削除
        if self._vectorstore is not None:
            try:
                self._vectorstore._client.delete_collection(
                    self._vectorstore._collection.name
                )
            except Exception:
                pass  # コレクションが存在しない場合

        # 新規作成
        return self.get_or_create(chunks)

    def get_retriever(self, k: int | None = None):
        """リトリーバーを取得"""
        if self._vectorstore is None:
            raise ValueError("ベクトルストアが初期化されていません")

        k = k or self.settings.retriever_k
        return self._vectorstore.as_retriever(search_kwargs={"k": k})

    def exists(self) -> bool:
        """ベクトルストアが存在するかチェック"""
        return self.db_path.exists()


# シングルトンインスタンス
_vectorstore_service: VectorStoreService | None = None


def get_vectorstore_service() -> VectorStoreService:
    """ベクトルストアサービスのインスタンスを取得"""
    global _vectorstore_service
    if _vectorstore_service is None:
        _vectorstore_service = VectorStoreService()
    return _vectorstore_service
