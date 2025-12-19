"use client";

import type { ChunkingStrategy, DocumentSet } from "@/lib/types";

interface DatasetSelectorProps {
  documentSet: DocumentSet;
  strategy: ChunkingStrategy;
  onDocumentSetChange: (value: DocumentSet) => void;
  onStrategyChange: (value: ChunkingStrategy) => void;
  disabled?: boolean;
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

export function DatasetSelector({
  documentSet,
  strategy,
  onDocumentSetChange,
  onStrategyChange,
  disabled = false,
}: DatasetSelectorProps) {
  const isOptimized = documentSet === "optimized";

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
    </div>
  );
}
