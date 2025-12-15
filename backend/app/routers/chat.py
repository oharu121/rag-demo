"""
チャットルーター - ストリーミング対応
"""

import json

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

from app.models.schemas import ChatRequest, ErrorResponse
from app.services.rag_service import get_rag_service
from app.utils.rate_limiter import rate_limiter, global_rate_limiter
from app.utils.errors import RateLimitException, RAGException, ErrorMessages

router = APIRouter(prefix="/chat", tags=["chat"])


def get_client_ip(request: Request) -> str:
    """クライアントIPを取得"""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


@router.post("")
async def chat(request: Request, chat_request: ChatRequest):
    """
    RAGチャットエンドポイント（ストリーミング対応）

    Server-Sent Events (SSE) 形式でレスポンスを返す:
    - event: sources - 引用元情報
    - event: token - 生成されたトークン
    - event: done - 完了シグナル
    - event: error - エラー
    """
    # グローバルレート制限チェック（APIキー全体の制限）
    if not global_rate_limiter.check_limit():
        async def global_rate_limit_error():
            error_data = {
                "type": "error",
                "data": {
                    "message": ErrorMessages.RATE_LIMIT_EXCEEDED,
                    "code": "GLOBAL_RATE_LIMIT_EXCEEDED",
                },
            }
            yield f"event: error\ndata: {json.dumps(error_data, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            global_rate_limit_error(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    # Per-IPレート制限チェック（単一ユーザーの乱用防止）
    client_ip = get_client_ip(request)
    if not rate_limiter.check_limit(client_ip):
        async def rate_limit_error():
            error_data = {
                "type": "error",
                "data": {
                    "message": ErrorMessages.RATE_LIMIT_EXCEEDED,
                    "code": "RATE_LIMIT_EXCEEDED",
                },
            }
            yield f"event: error\ndata: {json.dumps(error_data, ensure_ascii=False)}\n\n"

        return StreamingResponse(
            rate_limit_error(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )

    async def generate():
        try:
            rag_service = get_rag_service()

            # 会話履歴を辞書形式に変換
            history = [
                {"role": msg.role, "content": msg.content}
                for msg in chat_request.history
            ]

            async for event in rag_service.stream_query(
                chat_request.message,
                history,
                document_set=chat_request.document_set,
                strategy=chat_request.strategy,
            ):
                event_type = event.get("type", "token")
                event_data = json.dumps(event.get("data", {}), ensure_ascii=False)
                yield f"event: {event_type}\ndata: {event_data}\n\n"

        except RAGException as e:
            error_data = {"message": e.message, "code": e.code}
            yield f"event: error\ndata: {json.dumps(error_data, ensure_ascii=False)}\n\n"
        except Exception as e:
            error_data = {"message": ErrorMessages.INTERNAL_ERROR, "code": "INTERNAL_ERROR"}
            yield f"event: error\ndata: {json.dumps(error_data, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
