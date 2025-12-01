"""
ドキュメント管理ルーター
"""

from fastapi import APIRouter, UploadFile, File, HTTPException

from app.models.schemas import (
    DocumentListResponse,
    DocumentInfo,
    DocumentUploadResponse,
    DocumentDeleteResponse,
    DocumentContentResponse,
    RebuildResponse,
    ErrorResponse,
)
from app.services.document_service import get_document_service
from app.services.rag_service import get_rag_service
from app.utils.errors import DocumentException, RAGException, ErrorMessages

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("", response_model=DocumentListResponse)
async def list_documents() -> DocumentListResponse:
    """全てのドキュメント一覧を取得"""
    doc_service = get_document_service()
    documents = doc_service.list_documents()

    return DocumentListResponse(
        documents=[
            DocumentInfo(
                id=doc.id,
                filename=doc.filename,
                type=doc.type,
                status=doc.status,
                line_count=doc.line_count,
            )
            for doc in documents
        ],
        total=len(documents),
    )


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(file: UploadFile = File(...)) -> DocumentUploadResponse:
    """新しいドキュメントをアップロード"""
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail=ErrorMessages.INVALID_REQUEST,
        )

    try:
        doc_service = get_document_service()
        content = await file.read()
        doc_info = await doc_service.upload_document(file.filename, content)

        return DocumentUploadResponse(
            id=doc_info.id,
            filename=doc_info.filename,
            status=doc_info.status,
            message="ドキュメントをアップロードしました。ベクトルストアを再構築してください。",
        )
    except DocumentException as e:
        raise HTTPException(status_code=400, detail=e.message)


@router.get("/{doc_id}/content", response_model=DocumentContentResponse)
async def get_document_content(doc_id: str) -> DocumentContentResponse:
    """ドキュメントの内容を取得"""
    try:
        doc_service = get_document_service()
        doc_info, content = doc_service.get_document_content(doc_id)

        return DocumentContentResponse(
            id=doc_info.id,
            filename=doc_info.filename,
            content=content,
            line_count=doc_info.line_count,
        )
    except DocumentException as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.delete("/{doc_id}", response_model=DocumentDeleteResponse)
async def delete_document(doc_id: str) -> DocumentDeleteResponse:
    """アップロードされたドキュメントを削除"""
    try:
        doc_service = get_document_service()
        doc_service.delete_document(doc_id)

        return DocumentDeleteResponse(
            success=True,
            message="ドキュメントを削除しました。ベクトルストアを再構築してください。",
        )
    except DocumentException as e:
        raise HTTPException(status_code=404, detail=e.message)


@router.post("/rebuild", response_model=RebuildResponse)
async def rebuild_vectorstore() -> RebuildResponse:
    """ベクトルストアを再構築"""
    try:
        rag_service = get_rag_service()
        chunk_count = rag_service.rebuild_vectorstore()

        return RebuildResponse(
            status="completed",
            chunk_count=chunk_count,
            message=f"ベクトルストアを再構築しました。{chunk_count}個のチャンクを作成しました。",
        )
    except RAGException as e:
        raise HTTPException(status_code=400, detail=e.message)
