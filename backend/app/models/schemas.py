"""
Pydantic スキーマ定義
"""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, Field

from app.config import ChunkingStrategy, DocumentSet


# Chat schemas
class MessageHistory(BaseModel):
    """会話履歴のメッセージ"""

    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    """チャットリクエスト"""

    message: str = Field(..., min_length=1, max_length=2000)
    history: list[MessageHistory] = Field(default_factory=list)
    document_set: Optional[DocumentSet] = None
    strategy: Optional[ChunkingStrategy] = None
    use_reranking: Optional[bool] = None  # Enable cross-encoder reranking


class Source(BaseModel):
    """引用元情報"""

    filename: str
    start_line: int
    end_line: int
    content_preview: str


class ChatResponse(BaseModel):
    """チャットレスポンス（非ストリーミング用）"""

    answer: str
    sources: list[Source]
    processing_time_ms: int


# Document schemas
class DocumentInfo(BaseModel):
    """ドキュメント情報"""

    id: str
    filename: str
    type: Literal["sample", "uploaded"]
    status: Literal["ready", "processing", "error"]
    line_count: int = 0


class DocumentListResponse(BaseModel):
    """ドキュメント一覧レスポンス"""

    documents: list[DocumentInfo]
    total: int


class DocumentUploadResponse(BaseModel):
    """ドキュメントアップロードレスポンス"""

    id: str
    filename: str
    status: str
    message: str


class DocumentDeleteResponse(BaseModel):
    """ドキュメント削除レスポンス"""

    success: bool
    message: str


class DocumentContentResponse(BaseModel):
    """ドキュメント内容レスポンス"""

    id: str
    filename: str
    content: str
    line_count: int


class RebuildResponse(BaseModel):
    """再構築レスポンス"""

    status: str
    chunk_count: int
    message: str


# Health schemas
class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""

    status: str
    model_loaded: bool
    vectorstore_ready: bool
    document_count: int


# Error schemas
class ErrorResponse(BaseModel):
    """エラーレスポンス"""

    error: str
    code: str
    detail: str | None = None
