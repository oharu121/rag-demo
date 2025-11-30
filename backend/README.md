---
title: RAG Backend API
emoji: 🔍
colorFrom: blue
colorTo: purple
sdk: docker
app_port: 7860
---

# RAG Backend API

RAGドキュメント検索デモ用バックエンドAPI

## エンドポイント

- `GET /api/health` - ヘルスチェック
- `POST /api/chat` - チャット (ストリーミング対応)
- `GET /api/documents` - ドキュメント一覧
- `POST /api/documents/upload` - ドキュメントアップロード
- `DELETE /api/documents/{id}` - ドキュメント削除
- `POST /api/documents/rebuild` - ベクトルストア再構築

## 技術スタック

- FastAPI
- LangChain
- Chroma (ベクトルDB)
- HuggingFace Embeddings (intfloat/multilingual-e5-large)
- Google Gemini 2.0 Flash (LLM)
