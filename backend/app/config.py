"""
アプリケーション設定
"""

from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """アプリケーション設定"""

    # API Keys
    google_api_key: str = ""

    # Paths
    base_dir: Path = Path(__file__).parent
    documents_dir: Path = base_dir / "data" / "sample_documents"
    uploads_dir: Path = base_dir / "data" / "uploads"
    chroma_db_dir: Path = base_dir.parent / "chroma_db"

    # Embedding Model - Better Japanese support
    embedding_model: str = "intfloat/multilingual-e5-large"

    # LLM Model
    llm_model: str = "gemini-2.0-flash"
    llm_temperature: float = 0.3

    # RAG Config
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retriever_k: int = 3

    # Rate Limiting
    requests_per_minute: int = 15  # Per-IP limit
    global_requests_per_minute: int = 10  # Global limit for Gemini free tier

    # CORS
    frontend_url: str = ""
    allowed_origins: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ]

    # Server
    port: int = 7860  # HF Spaces default port

    class Config:
        env_file = ".env"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    """設定のシングルトンインスタンスを取得"""
    return Settings()
