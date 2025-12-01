"use client";

import { useState, useEffect } from "react";
import { UI_TEXT } from "@/lib/constants";
import { fetchDocumentContent } from "@/lib/api";
import { LoadingSpinner } from "./LoadingSpinner";
import type { Document } from "@/lib/types";

interface DocumentPreviewModalProps {
  doc: Document | null;
  onClose: () => void;
}

export function DocumentPreviewModal({
  doc,
  onClose,
}: DocumentPreviewModalProps) {
  const [content, setContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!doc) {
      setContent(null);
      setError(null);
      return;
    }

    const loadContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result = await fetchDocumentContent(doc.id);
        setContent(result.content);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : UI_TEXT.documentLoadError
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadContent();
  }, [doc]);

  // Close on escape key and prevent body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (doc) {
      window.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      window.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [doc, onClose]);

  if (!doc) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal container - click outside modal to close */}
      <div
        className="fixed inset-4 md:inset-8 lg:inset-12 z-50 flex items-center justify-center"
        onClick={onClose}
      >
        <div
          className="w-full h-full max-w-4xl mx-auto bg-white rounded-2xl shadow-2xl
                     flex flex-col animate-scale-in overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600
                          flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25"
              >
                <svg
                  className="w-5 h-5 text-white"
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
              <div className="min-w-0">
                <h2 className="text-lg font-semibold text-gray-900 truncate">
                  {doc.filename}
                </h2>
                <p className="text-sm text-gray-500">
                  {doc.lineCount} {UI_TEXT.linesLabel}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200
                       hover:scale-105 active:scale-95"
              aria-label={UI_TEXT.closeDrawer}
            >
              <svg
                className="w-5 h-5 text-gray-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full">
                <LoadingSpinner size="lg" />
                <p className="mt-3 text-sm text-gray-500">
                  {UI_TEXT.documentLoading}
                </p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center mb-4">
                  <svg
                    className="w-8 h-8 text-red-500"
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
                </div>
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            ) : content ? (
              <pre
                className="text-sm text-gray-700 whitespace-pre-wrap font-mono
                           bg-gray-50 rounded-xl p-4 border border-gray-200"
              >
                {content}
              </pre>
            ) : null}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">
                {doc.type === "sample"
                  ? UI_TEXT.sampleDocuments
                  : UI_TEXT.uploadedDocuments}
              </span>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white
                         border border-gray-200 rounded-xl hover:bg-gray-50
                         hover:border-gray-300 transition-all duration-200"
              >
                {UI_TEXT.closeDrawer}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
