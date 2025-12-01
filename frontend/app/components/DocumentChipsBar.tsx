"use client";

import { forwardRef } from "react";
import type { Document } from "@/lib/types";

interface DocumentChipsBarProps {
  documents: Document[];
  onPreview: (doc: Document) => void;
  onShowMore: () => void;
}

export const DocumentChipsBar = forwardRef<HTMLDivElement, DocumentChipsBarProps>(
  function DocumentChipsBar({ documents, onPreview, onShowMore }, ref) {
    if (documents.length === 0) return null;

    return (
      <div className="shrink-0 border-b border-gray-100 bg-gray-50/50">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div
            ref={ref}
            className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
          >
            {/* Label */}
            <span className="text-xs text-gray-400 shrink-0 mr-1">
              ドキュメント:
            </span>

            {/* Document chips */}
            {documents.slice(0, 5).map((doc) => (
              <button
                key={doc.id}
                onClick={() => onPreview(doc)}
                className="group flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200
                         rounded-lg hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-sm
                         transition-all duration-200 shrink-0"
              >
                <div
                  className="w-5 h-5 rounded bg-linear-to-br from-blue-100 to-indigo-100
                            flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors"
                >
                  <svg
                    className="w-3 h-3 text-blue-600"
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
                <span className="text-xs text-gray-600 group-hover:text-blue-600 truncate max-w-[100px]">
                  {doc.filename.replace(/\.txt$/, "")}
                </span>
              </button>
            ))}

            {/* Show more button */}
            {documents.length > 5 && (
              <button
                onClick={onShowMore}
                className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors shrink-0"
              >
                +{documents.length - 5} more
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
);
