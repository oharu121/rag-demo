"""
ドキュメント管理ルーター
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Query

from typing import Literal

from app.config import DocumentSet
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
from app.services.vectorstore_service import get_vectorstore_service
from app.utils.errors import DocumentException, RAGException, ErrorMessages

router = APIRouter(prefix="/documents", tags=["documents"])


@router.get("/debug/routes", include_in_schema=False)
async def debug_routes():
    """デバッグ用: ルート確認"""
    return {
        "message": "Documents router is working",
        "available_routes": [
            "GET /api/documents",
            "GET /api/documents/debug/routes",
            "GET /api/documents/debug/test-content/{doc_id}",
            "GET /api/documents/{doc_id}/content",
            "POST /api/documents/upload",
            "DELETE /api/documents/{doc_id}",
            "POST /api/documents/rebuild",
            "POST /api/documents/build-all",
        ]
    }


@router.get("/debug/test-content/{doc_id}", include_in_schema=False)
async def debug_test_content(doc_id: str):
    """デバッグ用: コンテンツエンドポイントのテスト"""
    print(f"[DEBUG] debug_test_content called with doc_id: {doc_id}", flush=True)
    doc_service = get_document_service()
    all_docs = doc_service.list_documents()
    doc_ids = [d.id for d in all_docs]
    return {
        "received_doc_id": doc_id,
        "available_doc_ids": doc_ids,
        "doc_id_found": doc_id in doc_ids,
    }


@router.get("", summary="List documents", response_model=DocumentListResponse)
async def list_documents(
    document_set: str = Query("original", description="Document set to list: 'original' or 'optimized'")
) -> DocumentListResponse:
    """全てのドキュメント一覧を取得"""
    doc_service = get_document_service()
    # Convert string to enum
    try:
        doc_set_enum = DocumentSet(document_set)
    except ValueError:
        doc_set_enum = DocumentSet.ORIGINAL
    documents = doc_service.list_documents(document_set=doc_set_enum)

    return DocumentListResponse(
        documents=[
            DocumentInfo(
                id=doc.id,
                filename=doc.filename,
                type=doc.type if doc.type in ("sample", "uploaded") else "sample",  # type: ignore[arg-type]
                status=doc.status if doc.status in ("ready", "processing", "error") else "ready",  # type: ignore[arg-type]
                line_count=doc.line_count,
            )
            for doc in documents
        ],
        total=len(documents),
    )


@router.post("/upload", summary="Upload document", response_model=DocumentUploadResponse)
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


@router.get("/{doc_id}/content", summary="Get document content", response_model=DocumentContentResponse)
async def get_document_content(doc_id: str) -> DocumentContentResponse:
    """ドキュメントの内容を取得"""
    print(f"[DEBUG] get_document_content called with doc_id: {doc_id}", flush=True)
    try:
        doc_service = get_document_service()
        print(f"[DEBUG] Searching for document: {doc_id}", flush=True)
        doc_info, content = doc_service.get_document_content(doc_id)
        print(f"[DEBUG] Found document: {doc_info.filename}", flush=True)

        return DocumentContentResponse(
            id=doc_info.id,
            filename=doc_info.filename,
            content=content,
            line_count=doc_info.line_count,
        )
    except DocumentException as e:
        print(f"[DEBUG] DocumentException: {e.message}", flush=True)
        raise HTTPException(status_code=404, detail=e.message)
    except Exception as e:
        print(f"[DEBUG] Unexpected error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{doc_id}", summary="Delete document", response_model=DocumentDeleteResponse)
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


@router.post("/rebuild", summary="Rebuild vector store", response_model=RebuildResponse)
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


@router.get("/options", summary="Get available options")
async def get_options():
    """Get available strategies, document sets, and collections for the UI"""
    rag_service = get_rag_service()
    return rag_service.get_available_options()


@router.post("/build-all", summary="Pre-build all collections")
async def build_all_collections():
    """
    Pre-build all vector collections for faster switching.
    Builds all combinations of document_set × chunking_strategy.
    """
    try:
        vectorstore_service = get_vectorstore_service()
        results = vectorstore_service.build_all_collections()

        # Count new vs existing
        new_count = sum(1 for v in results.values() if v >= 0)
        existing_count = sum(1 for v in results.values() if v < 0)

        return {
            "status": "completed",
            "collections": results,
            "summary": {
                "new_collections": new_count,
                "existing_collections": existing_count,
                "total": len(results),
            },
            "message": f"Built {new_count} new collections, {existing_count} already existed.",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
