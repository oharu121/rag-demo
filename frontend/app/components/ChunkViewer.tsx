"use client";

import { useState } from "react";
import type { ChunkInfo } from "@/lib/types";

interface ChunkViewerProps {
  chunks: ChunkInfo[];
  documentSet: string;
  strategy: string;
}

export function ChunkViewer({ chunks, documentSet, strategy }: ChunkViewerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedChunk, setExpandedChunk] = useState<number | null>(null);

  if (chunks.length === 0) {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return "text-green-600 bg-green-50 border-green-200";
    if (score >= 0.6) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return "高関連性";
    if (score >= 0.6) return "中関連性";
    return "低関連性";
  };

  return (
    <div className="mt-3 border border-gray-200 rounded-xl overflow-hidden bg-white/50">
      {/* Header - always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-50 to-blue-50/50
                 hover:from-slate-100 hover:to-blue-100/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? "rotate-90" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-sm font-medium text-gray-700">
            📊 検索されたチャンク ({chunks.length}件)
          </span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
            {documentSet === "optimized" ? "前処理済み" : "オリジナル"}
          </span>
          <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-700">
            {strategy}
          </span>
        </div>
        <span className="text-xs text-gray-400">
          {isExpanded ? "クリックで閉じる" : "クリックで詳細を表示"}
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="divide-y divide-gray-100">
          {chunks.map((chunk, index) => (
            <div
              key={index}
              className="p-4 hover:bg-gray-50/50 transition-colors"
            >
              {/* Chunk header */}
              <div className="flex items-start justify-between gap-4 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-gray-500">
                    #{index + 1}
                  </span>
                  <span className="text-sm font-medium text-gray-800">
                    {chunk.filename}
                  </span>
                  <span className="text-xs text-gray-400">
                    {chunk.start_line}-{chunk.end_line}行目
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getScoreColor(chunk.score)}`}
                  >
                    {getScoreLabel(chunk.score)}: {chunk.score.toFixed(3)}
                  </span>
                </div>
              </div>

              {/* Content preview */}
              <div
                className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3 font-mono whitespace-pre-wrap cursor-pointer"
                onClick={() => setExpandedChunk(expandedChunk === index ? null : index)}
              >
                {expandedChunk === index ? chunk.content : chunk.content_preview}
              </div>

              {/* Parent content (for parent-child strategy) */}
              {chunk.has_parent && chunk.parent_content_preview && (
                <div className="mt-2 pl-4 border-l-2 border-purple-200">
                  <div className="text-xs text-purple-600 font-medium mb-1">
                    親チャンク（コンテキスト用）:
                  </div>
                  <div className="text-xs text-gray-500 bg-purple-50/50 rounded p-2">
                    {chunk.parent_content_preview}
                  </div>
                </div>
              )}

              {/* Analysis hint */}
              {documentSet === "original" && chunk.filename.includes("規程") && !chunk.filename.includes("_") && (
                <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <span>
                    このチャンクには全従業員向けの一般ルールが含まれている可能性があります。
                    アルバイト向けの例外規定は附則にある場合があります。
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
