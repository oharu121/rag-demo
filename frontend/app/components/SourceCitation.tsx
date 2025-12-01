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
        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium
                   bg-blue-100 text-blue-800 rounded-full hover:bg-blue-200
                   transition-colors cursor-pointer"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <svg
          className="w-3 h-3"
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
        {source.filename}:{source.startLine}-{source.endLine}
      </button>

      {showTooltip && (
        <div
          className="absolute z-50 bottom-full left-0 mb-2 w-72 p-3
                     bg-gray-900 text-white text-xs rounded-lg shadow-lg"
        >
          <div className="font-semibold mb-1">
            {UI_TEXT.sourceLabel}: {source.filename}
          </div>
          <div className="text-gray-300 mb-2">
            {UI_TEXT.linesLabel} {source.startLine}-{source.endLine}
          </div>
          <div className="text-gray-400 border-t border-gray-700 pt-2">
            {source.contentPreview}
          </div>
          <div
            className="absolute bottom-0 left-4 transform translate-y-full
                       border-8 border-transparent border-t-gray-900"
          />
        </div>
      )}
    </span>
  );
}
