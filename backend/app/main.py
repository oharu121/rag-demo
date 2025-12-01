"""
RAG Backend API - FastAPI メインアプリケーション
"""

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.config import get_settings
from app.routers import chat, documents, health
from app.services.rag_service import get_rag_service
from app.utils.errors import RAGException


@asynccontextmanager
async def lifespan(app: FastAPI):
    """アプリケーションのライフサイクル管理"""
    print("=" * 50, flush=True)
    print("RAG Backend API を起動中...", flush=True)
    print("=" * 50, flush=True)

    # RAGサービスを初期化
    try:
        rag_service = get_rag_service()
        rag_service.initialize()
        print("初期化完了!", flush=True)
    except Exception as e:
        print(f"初期化エラー: {e}", flush=True)

    # 登録されたルートを出力
    print("=" * 50, flush=True)
    print("登録されたルート:", flush=True)
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            print(f"  {route.methods} {route.path}", flush=True)
    print("=" * 50, flush=True)

    yield

    print("RAG Backend API を終了中...", flush=True)


# FastAPIアプリケーションを作成
app = FastAPI(
    title="RAG Backend API",
    description="RAGドキュメント検索デモ用バックエンドAPI",
    version="1.0.0",
    lifespan=lifespan,
)

# 設定を取得
settings = get_settings()

# CORSミドルウェアを設定
origins = settings.allowed_origins.copy()
if settings.frontend_url:
    origins.append(settings.frontend_url)

# Vercelのプレビューデプロイ用
origins.append("https://*.vercel.app")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# グローバル例外ハンドラ
@app.exception_handler(RAGException)
async def rag_exception_handler(request: Request, exc: RAGException):
    """RAG例外のハンドラ"""
    return JSONResponse(
        status_code=400,
        content={
            "error": exc.message,
            "code": exc.code,
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """一般例外のハンドラ"""
    print(f"予期しないエラー: {exc}", flush=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "内部エラーが発生しました。",
            "code": "INTERNAL_ERROR",
        },
    )


# ルーターを登録
app.include_router(health.router, prefix="/api")
app.include_router(chat.router, prefix="/api")
app.include_router(documents.router, prefix="/api")


# ルートエンドポイント
@app.get("/")
async def root():
    """ルートエンドポイント"""
    return {
        "message": "RAG Backend API",
        "docs": "/docs",
        "health": "/api/health",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=settings.port,
        reload=True,
    )
