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

// Category display info for evaluation questions (shared across components)
export const CATEGORY_DISPLAY_INFO: Record<string, { label: string; color: string; bgColor: string }> = {
  implicit_exception: {
    label: "暗黙の例外",
    color: "text-amber-700",
    bgColor: "bg-amber-100 border-amber-200",
  },
  multi_hop: {
    label: "複数ホップ推論",
    color: "text-purple-700",
    bgColor: "bg-purple-100 border-purple-200",
  },
  negation: {
    label: "否定の理解",
    color: "text-red-700",
    bgColor: "bg-red-100 border-red-200",
  },
  conditional: {
    label: "条件判定",
    color: "text-blue-700",
    bgColor: "bg-blue-100 border-blue-200",
  },
  not_in_documents: {
    label: "存在しない情報",
    color: "text-gray-600",
    bgColor: "bg-gray-100 border-gray-200",
  },
  cross_document: {
    label: "複数文書横断",
    color: "text-emerald-700",
    bgColor: "bg-emerald-100 border-emerald-200",
  },
} as const;

// Category display order for consistent rendering
export const CATEGORY_ORDER = [
  "implicit_exception",
  "multi_hop",
  "negation",
  "conditional",
  "not_in_documents",
  "cross_document",
] as const;

// Strategy insights from .classmethod analysis (keyed by {dataset}_{strategy}_{reranking})
export const STRATEGY_INSIGHTS: Record<string, string> = {
  // Original dataset configurations
  original_standard_false:
    "標準チャンクでは、例外規定が本文と分離されているため、複数ホップ推論や比較計算で必要な情報が取得されにくい傾向があります。",
  original_large_false:
    "大きなチャンクにより、一般規則と例外が同一チャンク内に保持され、統合的な情報取得が可能になっています。",
  original_standard_true:
    "リランキングが意味的類似性に基づいて例外規定をフィルタリングし、「アルバイト」と「第2条の2に定める者」のような別名表現を見逃しています。",
  original_parent_child_false:
    "親子チャンクは詳細な分類情報の取得に優れていますが、階層間をまたぐ比較計算が苦手です。",
  original_parent_child_true:
    "リランキングが子チャンクを除外すると親チャンクの情報が不完全になり、例外規定の取得精度が低下します。",
  original_hypothetical_questions_false:
    "仮想質問は条件付きルールの理解に優れていますが、セクション間の比較計算では情報ギャップを埋められません。",

  // Optimized dataset configurations
  optimized_standard_false:
    "従業員タイプ別にドキュメントを事前分割することで、情報分散の問題を解消し、標準チャンクでも100%の精度を達成しています。",
} as const;

// Helper to get insight key from config
export function getStrategyInsightKey(
  documentSet: string,
  strategy: string,
  useReranking: boolean
): string {
  return `${documentSet}_${strategy}_${useReranking}`;
}
