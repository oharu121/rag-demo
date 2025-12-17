"""
アプリケーション設定
"""

from enum import Enum
from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings


class ChunkingStrategy(str, Enum):
    """チャンキング戦略"""
    STANDARD = "standard"      # 1000/200 - baseline
    LARGE = "large"            # 2000/500 - more context
    PARENT_CHILD = "parent_child"  # small chunks for retrieval, parent for context


class DocumentSet(str, Enum):
    """ドキュメントセット"""
    ORIGINAL = "original"      # Original regulation docs
    OPTIMIZED = "optimized"    # Preprocessed/restructured docs


# Chunking strategy configurations
CHUNKING_CONFIGS = {
    ChunkingStrategy.STANDARD: {"chunk_size": 1000, "chunk_overlap": 200},
    ChunkingStrategy.LARGE: {"chunk_size": 2000, "chunk_overlap": 500},
    ChunkingStrategy.PARENT_CHILD: {
        "parent_chunk_size": 2000,
        "parent_chunk_overlap": 200,
        "child_chunk_size": 400,
        "child_chunk_overlap": 50,
    },
}


# Base directory (computed once at module load)
_BASE_DIR = Path(__file__).parent


class Settings(BaseSettings):
    """アプリケーション設定"""

    # API Keys
    google_api_key: str = ""

    # Paths - use the module-level constant
    base_dir: Path = _BASE_DIR
    documents_dir: Path = _BASE_DIR / "data" / "regulations"
    documents_dir_optimized: Path = _BASE_DIR / "data" / "regulations-optimized"
    uploads_dir: Path = _BASE_DIR / "data" / "uploads"
    chroma_db_dir: Path = _BASE_DIR.parent / "chroma_db"
    evaluation_queries_path: Path = _BASE_DIR / "data" / "evaluation" / "test_queries_light.json"

    # Embedding Model - Better Japanese support
    embedding_model: str = "intfloat/multilingual-e5-large"

    # LLM Model
    llm_model: str = "gemini-2.0-flash"
    llm_temperature: float = 0.3

    # RAG Config (default values - can be overridden by strategy)
    chunk_size: int = 1000
    chunk_overlap: int = 200
    retriever_k: int = 4  # Increased from 3 to get more context

    # Default strategy and dataset
    default_chunking_strategy: ChunkingStrategy = ChunkingStrategy.STANDARD
    default_document_set: DocumentSet = DocumentSet.ORIGINAL

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
