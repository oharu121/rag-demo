/**
 * 日本語UIテキストと定数
 */

export const UI_TEXT = {
  // Header
  appTitle: "RAG ドキュメント検索デモ",
  appSubtitle: "ドキュメントについて質問してください",

  // Chat
  inputPlaceholder: "質問を入力してください...",
  sendButton: "送信",
  stopButton: "停止",

  // Loading states
  processingMessage: "回答を生成中...",
  embeddingMessage: "文書を検索中...",
  initializingMessage: "システムを初期化中...",

  // Server status
  serverStartingTitle: "サーバー起動中...",
  serverStartingMessage: "AIモデルを読み込んでいます。初回は1〜2分かかることがあります。",
  serverStartingHint: "Hugging Face Spacesの無料プランでは、48時間非アクティブ後にスリープします。",

  // Error messages
  networkError: "ネットワークエラーが発生しました。再試行してください。",
  rateLimitError: "リクエスト制限に達しました。しばらくお待ちください。",
  serverError: "サーバーエラーが発生しました。",
  uploadError: "ファイルのアップロードに失敗しました。",
  invalidFileType: "テキストファイル(.txt)またはマークダウン(.md)のみ対応しています。",
  fileTooLarge: "ファイルサイズは1MB以下にしてください。",
  quotaExhausted: "APIの利用枠を超えました。しばらくしてから再度お試しください。",
  geminiRateLimited: "リクエストが多すぎます。少々お待ちください。",

  // Documents
  documentsTitle: "ドキュメント",
  sampleDocuments: "サンプル文書",
  uploadedDocuments: "アップロード済み",
  uploadInstruction: ".txt または .md ファイルをドラッグ＆ドロップ",
  uploadButton: "ファイルを選択",
  deleteConfirm: "この文書を削除しますか？",
  rebuildButton: "インデックスを再構築",
  rebuildSuccess: "インデックスを再構築しました",

  // Status
  documentReady: "準備完了",
  documentProcessing: "処理中...",
  noDocuments: "ドキュメントがありません",

  // Empty states
  welcomeMessage: "こんにちは！ドキュメントについて質問してください。",
  noMessagesYet: "まだメッセージがありません",

  // Actions
  closeDrawer: "閉じる",
  openDocuments: "ドキュメント管理",

  // Citations
  sourceLabel: "出典",
  linesLabel: "行",

  // Onboarding
  onboardingMessage: "すぐに質問を始められます。自分のドキュメントをアップロードすることもできます。",
  onboardingDismiss: "OK",
  manageDocuments: "ドキュメントを管理",

  // Preview hint callout
  previewHintTitle: "ドキュメントをプレビュー",
  previewHintMessage: "クリックするとドキュメントの内容を確認できます。",

  // Upload guide callout
  uploadGuideTitle: "ドキュメントをアップロード",
  uploadGuideMessage: "ファイルをアップロード後、「インデックスを再構築」ボタンを押すと検索対象に追加されます。",

  // Welcome screen
  welcomeWithDocs: "以下のドキュメントについて質問できます",

  // Generic prompts (for user-uploaded documents)
  genericPrompt1: "この文書の要約を教えて",
  genericPrompt2: "主なポイントは何ですか？",
  genericPrompt3: "重要な情報をリストアップして",

  // Document preview modal
  documentLoading: "読み込み中...",
  documentLoadError: "ドキュメントの読み込みに失敗しました",
} as const;

// API Configuration
export const API_CONFIG = {
  baseUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:7860",
  endpoints: {
    chat: "/api/chat",
    documents: "/api/documents",
    upload: "/api/documents/upload",
    rebuild: "/api/documents/rebuild",
    health: "/api/health",
  },
} as const;

// File upload constraints
export const UPLOAD_CONFIG = {
  maxFileSize: 1024 * 1024, // 1MB
  allowedTypes: [".txt", ".md"],
  allowedMimeTypes: ["text/plain", "text/markdown"],
} as const;

// Error code to message mapping
export const ERROR_CODE_MESSAGES: Record<string, string> = {
  RATE_LIMITED: UI_TEXT.geminiRateLimited,
  QUOTA_EXHAUSTED: UI_TEXT.quotaExhausted,
  RATE_LIMIT_EXCEEDED: UI_TEXT.rateLimitError,
  GLOBAL_RATE_LIMIT_EXCEEDED: UI_TEXT.rateLimitError,
  GEMINI_ERROR: UI_TEXT.serverError,
  LLM_ERROR: UI_TEXT.serverError,
  INTERNAL_ERROR: UI_TEXT.serverError,
} as const;
