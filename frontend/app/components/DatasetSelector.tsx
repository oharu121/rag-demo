"use client";

import { useState } from "react";
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
    icon: "warning",
  },
  optimized: {
    title: "最適化済み",
    subtitle: "18件（従業員タイプ別に分割）",
    description: "正社員・パート・アルバイト別に規定を分割し、正確に検索可能",
    icon: "check",
  },
} as const;

const STRATEGY_INFO = {
  standard: { name: "標準", description: "1000文字/200オーバーラップ" },
  large: { name: "大きめ", description: "2000文字/500オーバーラップ" },
  parent_child: { name: "親子", description: "小チャンク検索+親コンテキスト" },
} as const;

export function DatasetSelector({
  documentSet,
  strategy,
  onDocumentSetChange,
  onStrategyChange,
  disabled = false,
}: DatasetSelectorProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
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
            </div>
          </div>
        </button>
      </div>

      {/* Advanced settings (collapsed) */}
      <div className="max-w-4xl mx-auto mt-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg
            className={`w-3 h-3 transition-transform ${showAdvanced ? "rotate-180" : ""}`}
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
          <span>詳細設定</span>
        </button>

        {showAdvanced && (
          <div className="mt-3 p-3 bg-white/60 rounded-lg border border-gray-200">
            <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              チャンキング戦略
            </label>
            <div className="mt-2 flex gap-2">
              {(Object.keys(STRATEGY_INFO) as ChunkingStrategy[]).map((s) => (
                <button
                  key={s}
                  onClick={() => onStrategyChange(s)}
                  disabled={disabled}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition-all ${
                    strategy === s
                      ? "border-blue-400 bg-blue-50 text-blue-700"
                      : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
                  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {STRATEGY_INFO[s].name}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              {STRATEGY_INFO[strategy].description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
