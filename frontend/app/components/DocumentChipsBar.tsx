"use client";

import { forwardRef, useEffect, useRef } from "react";
import type { Document } from "@/lib/types";

interface DocumentChipsBarProps {
  documents: Document[];
  onPreview: (doc: Document) => void;
  onShowMore: () => void;
}

export const DocumentChipsBar = forwardRef<HTMLDivElement, DocumentChipsBarProps>(
  function DocumentChipsBar({ documents, onPreview, onShowMore }, ref) {
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Enable horizontal scrolling with mouse wheel
    useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const handleWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          e.preventDefault();
          container.scrollLeft += e.deltaY;
        }
      };

      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }, [documents.length]);

    if (documents.length === 0) return null;

    return (
      <div ref={ref} className="shrink-0 border-b border-gray-100 bg-gray-50/50">
        <div className="max-w-4xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2">
            {/* Label - fixed */}
            <span className="text-xs text-gray-400 shrink-0">
              ドキュメント:
            </span>

            {/* Scrollable chips container */}
            <div
              ref={scrollContainerRef}
              className="flex items-center gap-2 overflow-x-auto scrollbar-hide"
            >
              {/* Document chips */}
              {documents.slice(0, 8).map((doc) => (
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
              {documents.length > 8 && (
                <button
                  onClick={onShowMore}
                  className="px-2.5 py-1.5 text-xs text-gray-400 hover:text-blue-600 transition-colors shrink-0"
                >
                  +{documents.length - 8} more
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
);
