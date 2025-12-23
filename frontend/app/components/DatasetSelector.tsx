"use client";

import type { ChunkingStrategy, DocumentSet } from "@/lib/types";

interface DatasetSelectorProps {
  documentSet: DocumentSet;
  strategy: ChunkingStrategy;
  useReranking: boolean;
  onDocumentSetChange: (value: DocumentSet) => void;
  onStrategyChange: (value: ChunkingStrategy) => void;
  onUseRerankingChange: (value: boolean) => void;
  disabled?: boolean;
  // Evaluation props
  onRunEvaluation?: () => void;
  isEvaluating?: boolean;
  evaluationProgress?: { current: number; total: number };
  isReady?: boolean;
  // Collapse props
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const DATASET_INFO = {
  original: {
    title: "元データ",
    subtitle: "6件の規程文書",
    description: "例外規定が附則に埋もれており、検索で見逃されやすい",
    sampleFiles: ["就業規則.md", "通勤手当規程.md", "休暇規程.md"],
  },
  optimized: {
    title: "最適化済み",
    subtitle: "18件（従業員タイプ別に分割）",
    description: "正社員・パート・アルバイト別に規定を分割し、正確に検索可能",
    sampleFiles: ["就業規則_正社員.md", "就業規則_パート.md", "通勤手当規程_アルバイト.md"],
  },
} as const;

const STRATEGY_INFO = {
  standard: {
    name: "標準チャンク",
    description: "文書を均等に分割。基本的な検索に最適",
    pros: "高速",
    cons: "文脈途切れ",
  },
  large: {
    name: "大きめチャンク",
    description: "大きめに分割し重複を持たせる。長い説明文向け",
    pros: "文脈を保持",
    cons: "精度低下の場合",
  },
  parent_child: {
    name: "親子チャンク",
    description: "細かく分割して検索し、周辺文脈も取得",
    pros: "精度と文脈",
    cons: "少し遅い",
  },
  hypothetical_questions: {
    name: "仮説質問生成",
    description: "LLMでユーザー視点の質問を生成しインデックス",
    pros: "エイリアス解決",
    cons: "インデックス時間",
  },
} as const;

const RERANKING_INFO = {
  disabled: {
    name: "リランキングなし",
    description: "ベクトル検索の結果をそのまま使用",
    pros: "高速",
    cons: "精度は検索依存",
  },
  enabled: {
    name: "リランキングあり",
    description: "Cross-Encoderで検索結果を再評価",
    pros: "精度向上",
    cons: "少し遅い",
  },
} as const;

export function DatasetSelector({
  documentSet,
  strategy,
  useReranking,
  onDocumentSetChange,
  onStrategyChange,
  onUseRerankingChange,
  disabled = false,
  onRunEvaluation,
  isEvaluating = false,
  evaluationProgress = { current: 0, total: 0 },
  isReady = true,
  isExpanded = true,
  onToggleExpand,
}: DatasetSelectorProps) {
  const isOptimized = documentSet === "optimized";

  // Collapsed summary bar
  if (!isExpanded) {
    return (
      <div
        className={`px-4 py-3 border-b transition-colors duration-300 ${
          isOptimized
            ? "bg-linear-to-r from-emerald-50/80 to-green-50/50 border-emerald-200/60"
            : "bg-linear-to-r from-slate-50 to-gray-50/50 border-gray-200/60"
        }`}
      >
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          {/* Dataset chip */}
          <span
            className={`px-3 py-1.5 text-sm font-medium rounded-lg ${
              isOptimized
                ? "bg-emerald-100 text-emerald-700"
                : "bg-gray-100 text-gray-700"
            }`}
          >
            {DATASET_INFO[documentSet].title}
          </span>

          {/* Strategy chip */}
          <span className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-100 text-blue-700">
            {STRATEGY_INFO[strategy].name}
          </span>

          {/* Reranking chip */}
          <span className="px-3 py-1.5 text-sm font-medium rounded-lg bg-purple-100 text-purple-700">
            {useReranking ? "リランキングあり" : "リランキングなし"}
          </span>

          <div className="flex-1" />

          {/* Compact test button */}
          {onRunEvaluation && (
            <button
              onClick={onRunEvaluation}
              disabled={isEvaluating || disabled || !isReady}
              className={`px-4 py-2 text-sm font-medium rounded-lg flex items-center gap-2
                         transition-all duration-200
                         ${
                           isEvaluating
                             ? "bg-blue-100 text-blue-700 border border-blue-200"
                             : "bg-blue-500 text-white hover:bg-blue-600 shadow-sm hover:shadow"
                         }
                         disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isEvaluating ? (
                <>
                  <svg
                    className="w-4 h-4 animate-spin"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  <span>
                    {evaluationProgress.total > 0
                      ? `${evaluationProgress.current}/${evaluationProgress.total}`
                      : "準備中..."}
                  </span>
                </>
              ) : (
                <span>精度テスト</span>
              )}
            </button>
          )}

          {/* Expand button */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              title="設定を展開"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Expanded full UI
  return (
    <div
      className={`px-4 py-4 border-b transition-colors duration-300 ${
        isOptimized
          ? "bg-linear-to-r from-emerald-50/80 to-green-50/50 border-emerald-200/60"
          : "bg-linear-to-r from-slate-50 to-gray-50/50 border-gray-200/60"
      }`}
    >
      {/* Dataset selection cards */}
      <div className="flex gap-3 max-w-4xl mx-auto">
        {/* Original dataset card */}
        <button
          onClick={() => onDocumentSetChange("original")}
          disabled={disabled}
          className={`flex-1 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
            documentSet === "original"
              ? "border-gray-400 bg-white shadow-md"
              : "border-gray-200 bg-white/60 hover:border-gray-300 hover:bg-white/80"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                documentSet === "original"
                  ? "border-gray-500 bg-gray-500"
                  : "border-gray-300"
              }`}
            >
              {documentSet === "original" && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {DATASET_INFO.original.title}
                </span>
                <span className="text-xs text-gray-500">
                  {DATASET_INFO.original.subtitle}
                </span>
              </div>
              <div className="mt-2 flex items-start gap-2 text-sm">
                <svg
                  className="w-4 h-4 mt-0.5 text-amber-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
                <span className="text-gray-600">
                  {DATASET_INFO.original.description}
                </span>
              </div>
              {/* Sample files */}
              <div className="mt-2 text-xs text-gray-400">
                {DATASET_INFO.original.sampleFiles.join(", ")} ...
              </div>
            </div>
          </div>
        </button>

        {/* Optimized dataset card */}
        <button
          onClick={() => onDocumentSetChange("optimized")}
          disabled={disabled}
          className={`flex-1 p-4 rounded-xl border-2 text-left transition-all duration-200 ${
            documentSet === "optimized"
              ? "border-emerald-400 bg-white shadow-md ring-2 ring-emerald-100"
              : "border-gray-200 bg-white/60 hover:border-emerald-200 hover:bg-white/80"
          } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center ${
                documentSet === "optimized"
                  ? "border-emerald-500 bg-emerald-500"
                  : "border-gray-300"
              }`}
            >
              {documentSet === "optimized" && (
                <div className="w-2 h-2 rounded-full bg-white" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">
                  {DATASET_INFO.optimized.title}
                </span>
                {documentSet === "optimized" && (
                  <span className="text-emerald-500">✨</span>
                )}
                <span className="text-xs text-gray-500">
                  {DATASET_INFO.optimized.subtitle}
                </span>
              </div>
              <div className="mt-2 flex items-start gap-2 text-sm">
                <svg
                  className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <span className="text-gray-600">
                  {DATASET_INFO.optimized.description}
                </span>
              </div>
              {/* Sample files */}
              <div className="mt-2 text-xs text-gray-400">
                {DATASET_INFO.optimized.sampleFiles.join(", ")} ...
              </div>
            </div>
          </div>
        </button>
      </div>

      {/* Chunking strategy selector - always visible */}
      <div className="max-w-4xl mx-auto mt-4">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          チャンキング戦略
        </label>
        <div className="mt-2 grid grid-cols-4 gap-3">
          {(Object.keys(STRATEGY_INFO) as ChunkingStrategy[]).map((s) => {
            const info = STRATEGY_INFO[s];
            const isSelected = strategy === s;
            return (
              <button
                key={s}
                onClick={() => onStrategyChange(s)}
                disabled={disabled}
                className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-blue-400 bg-blue-50/80 shadow-sm"
                    : "border-gray-200 bg-white/60 hover:border-gray-300 hover:bg-white/80"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-blue-500 bg-blue-500"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className={`font-medium ${isSelected ? "text-blue-900" : "text-gray-900"}`}>
                    {info.name}
                  </span>
                </div>
                <p className={`mt-1.5 text-xs leading-relaxed ${isSelected ? "text-blue-700" : "text-gray-500"}`}>
                  {info.description}
                </p>
                <div className={`mt-2 text-xs ${isSelected ? "text-blue-600" : "text-gray-400"}`}>
                  <span className="text-emerald-600">✓</span>
                  <span className="ml-1">{info.pros}</span>
                  <span className="mx-2">·</span>
                  <span className="text-amber-600">△</span>
                  <span className="ml-1">{info.cons}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reranking selector */}
      <div className="max-w-4xl mx-auto mt-4">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          リランキング
        </label>
        <div className="mt-2 grid grid-cols-2 gap-3">
          {(["disabled", "enabled"] as const).map((option) => {
            const info = RERANKING_INFO[option];
            const isSelected = option === "enabled" ? useReranking : !useReranking;
            return (
              <button
                key={option}
                onClick={() => onUseRerankingChange(option === "enabled")}
                disabled={disabled}
                className={`p-3 rounded-xl border-2 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-purple-400 bg-purple-50/80 shadow-sm"
                    : "border-gray-200 bg-white/60 hover:border-gray-300 hover:bg-white/80"
                } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                      isSelected
                        ? "border-purple-500 bg-purple-500"
                        : "border-gray-300"
                    }`}
                  >
                    {isSelected && (
                      <div className="w-1.5 h-1.5 rounded-full bg-white" />
                    )}
                  </div>
                  <span className={`font-medium ${isSelected ? "text-purple-900" : "text-gray-900"}`}>
                    {info.name}
                  </span>
                </div>
                <p className={`mt-1.5 text-xs leading-relaxed ${isSelected ? "text-purple-700" : "text-gray-500"}`}>
                  {info.description}
                </p>
                <div className={`mt-2 text-xs ${isSelected ? "text-purple-600" : "text-gray-400"}`}>
                  <span className="text-emerald-600">✓</span>
                  <span className="ml-1">{info.pros}</span>
                  <span className="mx-2">·</span>
                  <span className="text-amber-600">△</span>
                  <span className="ml-1">{info.cons}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Run Evaluation button and collapse button */}
      <div className="max-w-4xl mx-auto mt-4 pt-4 border-t border-gray-200/60">
        <div className="flex items-center gap-3">
          {/* Run Evaluation button */}
          {onRunEvaluation && (
            <button
              onClick={onRunEvaluation}
              disabled={isEvaluating || disabled || !isReady}
              className={`flex-1 py-3 px-4 font-medium rounded-xl shadow-lg
                         transition-all duration-200 flex items-center justify-center gap-2
                         ${isEvaluating
                           ? "bg-blue-100 text-blue-700 border border-blue-200"
                           : "bg-linear-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 hover:shadow-xl active:scale-[0.99]"
                         }
                         disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isEvaluating ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <span>
                    {evaluationProgress.total > 0
                      ? `テスト中 ${evaluationProgress.current}/${evaluationProgress.total}`
                      : "準備中..."}
                  </span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>精度テストを実行</span>
                </>
              )}
            </button>
          )}

          {/* Collapse button */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors border border-gray-200"
              title="設定を折りたたむ"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
