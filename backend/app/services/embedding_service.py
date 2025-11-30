"""
埋め込みモデルサービス
"""

from functools import lru_cache

from langchain_huggingface import HuggingFaceEmbeddings

from app.config import get_settings


class EmbeddingService:
    """埋め込みモデル管理サービス"""

    _instance: "EmbeddingService | None" = None
    _embeddings: HuggingFaceEmbeddings | None = None

    def __new__(cls) -> "EmbeddingService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if self._embeddings is None:
            self._initialize()

    def _initialize(self) -> None:
        """埋め込みモデルを初期化"""
        settings = get_settings()
        print(f"埋め込みモデルを読み込み中: {settings.embedding_model}", flush=True)
        print("(初回実行時は約2.2GBのモデルをダウンロードします...)", flush=True)

        self._embeddings = HuggingFaceEmbeddings(
            model_name=settings.embedding_model,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},  # e5モデル用に正規化
        )
        print("埋め込みモデルの準備完了!", flush=True)

    @property
    def embeddings(self) -> HuggingFaceEmbeddings:
        """埋め込みモデルインスタンスを取得"""
        if self._embeddings is None:
            self._initialize()
        return self._embeddings  # type: ignore

    @property
    def is_ready(self) -> bool:
        """モデルが準備できているかチェック"""
        return self._embeddings is not None


@lru_cache
def get_embedding_service() -> EmbeddingService:
    """埋め込みサービスのシングルトンインスタンスを取得"""
    return EmbeddingService()
