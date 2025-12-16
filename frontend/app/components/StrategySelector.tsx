"use client";

import { useEffect, useState } from "react";
import { fetchOptions } from "@/lib/api";
import type {
  ChunkingStrategy,
  DocumentSet,
  OptionsResponse,
  StrategyOption,
  DocumentSetOption,
} from "@/lib/types";

interface StrategySelectorProps {
  documentSet: DocumentSet;
  strategy: ChunkingStrategy;
  onDocumentSetChange: (value: DocumentSet) => void;
  onStrategyChange: (value: ChunkingStrategy) => void;
  disabled?: boolean;
}

export function StrategySelector({
  documentSet,
  strategy,
  onDocumentSetChange,
  onStrategyChange,
  disabled = false,
}: StrategySelectorProps) {
  const [options, setOptions] = useState<OptionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchOptions()
      .then(setOptions)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400">
        <div className="animate-spin h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
        読み込み中...
      </div>
    );
  }

  if (!options) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-linear-to-r from-slate-50 to-blue-50/30 border-b border-gray-200/60">
      {/* Document Set Selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          データセット
        </label>
        <select
          value={documentSet}
          onChange={(e) => onDocumentSetChange(e.target.value as DocumentSet)}
          disabled={disabled}
          className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg
                   hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                   disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {options.document_sets.map((ds: DocumentSetOption) => (
            <option key={ds.id} value={ds.id}>
              {ds.name} ({ds.document_count}件)
            </option>
          ))}
        </select>
      </div>

      {/* Strategy Selector */}
      <div className="flex items-center gap-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          チャンキング戦略
        </label>
        <select
          value={strategy}
          onChange={(e) => onStrategyChange(e.target.value as ChunkingStrategy)}
          disabled={disabled}
          className="px-3 py-1.5 text-sm bg-white border border-gray-200 rounded-lg
                   hover:border-blue-300 focus:border-blue-400 focus:ring-2 focus:ring-blue-100
                   disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {options.strategies.map((s: StrategyOption) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Info tooltip */}
      <div className="ml-auto flex items-center gap-1 text-xs text-gray-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          {documentSet === "optimized"
            ? "前処理済みデータ: 従業員タイプ別に分割"
            : "元データ: 例外規定が附則に含まれる"}
        </span>
      </div>
    </div>
  );
}
