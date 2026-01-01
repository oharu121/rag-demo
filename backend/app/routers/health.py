"""
ヘルスチェックルーター
"""

from fastapi import APIRouter

from app.models.schemas import HealthResponse
from app.services.embedding_service import get_embedding_service
from app.services.vectorstore_service import get_vectorstore_service
from app.services.document_service import get_document_service

router = APIRouter(tags=["health"])


@router.get("/health", summary="Health check", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """ヘルスチェックエンドポイント"""
    embedding_service = get_embedding_service()
    vectorstore_service = get_vectorstore_service()
    doc_service = get_document_service()

    documents = doc_service.list_documents()

    return HealthResponse(
        status="ok",
        model_loaded=embedding_service.is_ready,
        vectorstore_ready=vectorstore_service.is_ready,
        document_count=len(documents),
    )
