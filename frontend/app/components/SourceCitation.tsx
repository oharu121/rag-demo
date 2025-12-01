"use client";

import { useState } from "react";
import type { Source } from "@/lib/types";
import { UI_TEXT } from "@/lib/constants";

interface SourceCitationProps {
  source: Source;
}

export function SourceCitation({ source }: SourceCitationProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <span className="relative inline-block">
      <button
        className="group inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                   bg-linear-to-r from-blue-50 to-indigo-50 text-blue-700
                   rounded-full border border-blue-100
                   hover:from-blue-100 hover:to-indigo-100 hover:border-blue-200
                   hover:shadow-md hover:shadow-blue-100/50
                   active:scale-95 transition-all duration-200"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <svg
          className="w-3.5 h-3.5 text-blue-500 group-hover:text-blue-600 transition-colors"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
        <span className="group-hover:text-blue-800 transition-colors">
          {source.filename}:{source.startLine}-{source.endLine}
        </span>
      </button>

      {showTooltip && (
        <div
          className="absolute z-50 bottom-full left-0 mb-2 w-80 p-4
                     bg-gray-900 text-white text-sm rounded-xl shadow-2xl
                     animate-fade-in-up"
          style={{ animationDuration: "150ms" }}
        >
          {/* Header */}
          <div className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-700">
            <div className="w-7 h-7 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-blue-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <div className="font-medium text-white">{source.filename}</div>
              <div className="text-xs text-gray-400">
                {UI_TEXT.linesLabel} {source.startLine}-{source.endLine}
              </div>
            </div>
          </div>

          {/* Content preview */}
          <div className="text-gray-300 text-xs leading-relaxed bg-gray-800/50 rounded-lg p-3 max-h-32 overflow-y-auto">
            <code className="whitespace-pre-wrap font-mono">
              {source.contentPreview}
            </code>
          </div>

          {/* Arrow */}
          <div
            className="absolute bottom-0 left-6 transform translate-y-full
                       border-8 border-transparent border-t-gray-900"
          />
        </div>
      )}
    </span>
  );
}
