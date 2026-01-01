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

    role: Literal["user", "assistant"] = Field(
        ..., description="Message sender role"
    )
    content: str = Field(
        ..., description="Message content"
    )


class ChatRequest(BaseModel):
    """チャットリクエスト"""

    message: str = Field(
        ...,
        min_length=1,
        max_length=2000,
        description="The user's question to ask the RAG system",
        json_schema_extra={"example": "契約社員の有給休暇は何日ですか？"},
    )
    history: list[MessageHistory] = Field(
        default_factory=list,
        description="Previous conversation messages for context",
    )
    document_set: Optional[DocumentSet] = Field(
        None,
        description="Document set to search: 'original' or 'optimized'",
    )
    strategy: Optional[ChunkingStrategy] = Field(
        None,
        description="Chunking strategy: 'standard', 'large', or 'parent_child'",
    )
    use_reranking: Optional[bool] = Field(
        None,
        description="Enable cross-encoder reranking for improved relevance",
    )


class Source(BaseModel):
    """引用元情報"""

    filename: str = Field(..., description="Source document filename")
    start_line: int = Field(..., description="Starting line number in document")
    end_line: int = Field(..., description="Ending line number in document")
    content_preview: str = Field(..., description="Preview of the matched content")


class ChatResponse(BaseModel):
    """チャットレスポンス（非ストリーミング用）"""

    answer: str = Field(..., description="Generated answer from the RAG system")
    sources: list[Source] = Field(..., description="Source documents used for the answer")
    processing_time_ms: int = Field(..., description="Processing time in milliseconds")


# Document schemas
class DocumentInfo(BaseModel):
    """ドキュメント情報"""

    id: str = Field(..., description="Unique document identifier")
    filename: str = Field(..., description="Document filename")
    type: Literal["sample", "uploaded"] = Field(..., description="Document type")
    status: Literal["ready", "processing", "error"] = Field(..., description="Processing status")
    line_count: int = Field(0, description="Number of lines in document")


class DocumentListResponse(BaseModel):
    """ドキュメント一覧レスポンス"""

    documents: list[DocumentInfo] = Field(..., description="List of documents")
    total: int = Field(..., description="Total number of documents")


class DocumentUploadResponse(BaseModel):
    """ドキュメントアップロードレスポンス"""

    id: str = Field(..., description="Uploaded document ID")
    filename: str = Field(..., description="Uploaded filename")
    status: str = Field(..., description="Upload status")
    message: str = Field(..., description="Status message")


class DocumentDeleteResponse(BaseModel):
    """ドキュメント削除レスポンス"""

    success: bool = Field(..., description="Whether deletion succeeded")
    message: str = Field(..., description="Status message")


class DocumentContentResponse(BaseModel):
    """ドキュメント内容レスポンス"""

    id: str = Field(..., description="Document ID")
    filename: str = Field(..., description="Document filename")
    content: str = Field(..., description="Full document content")
    line_count: int = Field(..., description="Number of lines")


class RebuildResponse(BaseModel):
    """再構築レスポンス"""

    status: str = Field(..., description="Rebuild status")
    chunk_count: int = Field(..., description="Number of chunks created")
    message: str = Field(..., description="Status message")


# Health schemas
class HealthResponse(BaseModel):
    """ヘルスチェックレスポンス"""

    status: str = Field(..., description="Service status", json_schema_extra={"example": "ok"})
    model_loaded: bool = Field(..., description="Whether embedding model is loaded")
    vectorstore_ready: bool = Field(..., description="Whether vector store is initialized")
    document_count: int = Field(..., description="Number of indexed documents")


# Error schemas
class ErrorResponse(BaseModel):
    """エラーレスポンス"""

    error: str = Field(..., description="Error message")
    code: str = Field(..., description="Error code", json_schema_extra={"example": "RATE_LIMIT_EXCEEDED"})
    detail: str | None = Field(None, description="Additional error details")
