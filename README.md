# RAG ドキュメント検索デモ

RAG（Retrieval-Augmented Generation）を活用したドキュメント検索システムのデモアプリケーションです。

## 技術スタック

| コンポーネント | 技術 | 説明 |
|--------------|------|------|
| フロントエンド | Next.js 16 / React 19 | Vercelにデプロイ |
| バックエンド | FastAPI / Python 3.12 | Hugging Face Spacesにデプロイ |
| 埋め込みモデル | intfloat/multilingual-e5-large | 日本語に最適化 |
| ベクトルDB | Chroma | ローカル永続化 |
| LLM | Google Gemini 2.0 Flash | 無料枠で利用可能 |

## 機能

- ストリーミングレスポンス（ChatGPTのようなリアルタイム表示）
- マルチターン会話（セッション内で会話履歴を保持）
- ドキュメントアップロード（テキストファイル対応）
- 出典表示（ファイル名・行番号付き）
- レート制限（Gemini無料枠に対応）
- モバイルレスポンシブデザイン

## プロジェクト構成

```
simple-rag-app/
├── frontend/          # Next.js フロントエンド
│   ├── app/
│   │   ├── components/
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── lib/
│   ├── hooks/
│   └── package.json
│
├── backend/           # Python バックエンド
│   ├── app/
│   │   ├── routers/
│   │   ├── services/
│   │   ├── models/
│   │   └── utils/
│   ├── pyproject.toml
│   └── Dockerfile
│
└── README.md
```

## セットアップ

### 前提条件

- Node.js 20+
- Python 3.12+
- uv (Pythonパッケージマネージャー)
- Google API Key ([こちらから取得](https://aistudio.google.com/apikey))

### バックエンドのセットアップ

```bash
cd backend

# 依存関係をインストール
uv sync

# 環境変数を設定
cp .env.example .env
# .envファイルを編集してGOOGLE_API_KEYを設定

# 開発サーバーを起動
uv run uvicorn app.main:app --reload --port 7860
```

### フロントエンドのセットアップ

```bash
cd frontend

# 依存関係をインストール
npm install

# 環境変数を設定（任意）
# NEXT_PUBLIC_API_URL=http://localhost:7860

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 を開いてください。

## デプロイ

このプロジェクトはGitHub Actionsを使用した自動デプロイに対応しています。

### CI/CD アーキテクチャ

```
GitHub (main branch)
    │
    ├─── frontend/** 変更 ──► GitHub Actions (CI) ──► Vercel (自動デプロイ)
    │
    └─── backend/** 変更 ──► GitHub Actions ──► Hugging Face Spaces
```

### 初期セットアップ

#### 1. Hugging Face Spaces

1. [Hugging Face](https://huggingface.co/)でアカウントを作成
2. 新しいSpaceを作成
   - Space name: `rag-demo`（任意）
   - SDK: `Docker`
   - Visibility: Public または Private
3. Secretsに`GOOGLE_API_KEY`を設定

#### 2. GitHub Secrets/Variables の設定

リポジトリの Settings > Secrets and variables > Actions で以下を設定:

**Secrets:**
| Name | Description |
|------|-------------|
| `HF_TOKEN` | Hugging Face Access Token（Write権限必要） |

**Variables:**
| Name | Example | Description |
|------|---------|-------------|
| `HF_USERNAME` | `your-username` | Hugging Faceのユーザー名 |
| `HF_SPACE_NAME` | `rag-demo` | 作成したSpaceの名前 |
| `NEXT_PUBLIC_API_URL` | `https://your-username-rag-demo.hf.space` | バックエンドのURL |

#### 3. Vercel

1. [Vercel](https://vercel.com/)でアカウントを作成
2. GitHubリポジトリをインポート
3. 設定:
   - **Root Directory:** `frontend`
   - **Framework Preset:** Next.js（自動検出）
4. 環境変数に`NEXT_PUBLIC_API_URL`を設定

### デプロイの仕組み

| トリガー | アクション |
|---------|-----------|
| `frontend/**` へのpush | GitHub Actions でビルド検証 → Vercel が自動デプロイ |
| `backend/**` へのpush | GitHub Actions が HF Spaces へ自動デプロイ |

### 手動デプロイ（オプション）

```bash
# バックエンドを手動でHF Spacesにデプロイ
cd backend
git init
git remote add space https://huggingface.co/spaces/YOUR_USERNAME/rag-demo
git add .
git commit -m "Manual deploy"
git push --force space main
```

## API エンドポイント

| メソッド | パス | 説明 |
|---------|------|------|
| GET | /api/health | ヘルスチェック |
| POST | /api/chat | チャット（ストリーミング） |
| GET | /api/documents | ドキュメント一覧 |
| POST | /api/documents/upload | ドキュメントアップロード |
| DELETE | /api/documents/{id} | ドキュメント削除 |
| POST | /api/documents/rebuild | インデックス再構築 |

## 開発者向け情報

### バックエンドのテスト

```bash
cd backend
uv run pytest
```

### フロントエンドのビルド

```bash
cd frontend
npm run build
```

## ライセンス

MIT License

## 作者

このプロジェクトはRAGの学習とデモ目的で作成されました。
