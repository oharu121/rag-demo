"use client";

import { useEffect, useState } from "react";
import { UI_TEXT } from "@/lib/constants";
import { useDocuments } from "@/hooks/useDocuments";
import { DocumentList } from "./DocumentList";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { DocumentUpload } from "./DocumentUpload";
import { LoadingSpinner } from "./LoadingSpinner";
import type { Document } from "@/lib/types";

type DocumentsHookReturn = ReturnType<typeof useDocuments>;

interface DocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  documentsHook?: DocumentsHookReturn;
}

export function DocumentDrawer({ isOpen, onClose, documentsHook }: DocumentDrawerProps) {
  // Use provided hook or create our own
  const internalHook = useDocuments();
  const {
    sampleDocuments,
    uploadedDocuments,
    isLoading,
    isUploading,
    isRebuilding,
    error,
    upload,
    remove,
    rebuild,
    clearError,
  } = documentsHook || internalHook;

  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with blur */}
      <div
        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40 animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50
                   shadow-2xl animate-slide-in-right flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {UI_TEXT.documentsTitle}
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">ドキュメントを管理</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-gray-100 rounded-xl transition-all duration-200
                     hover:scale-105 active:scale-95"
            aria-label="閉じる"
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
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Error message */}
          {error && (
            <div
              className="mb-5 p-4 bg-linear-to-r from-red-50 to-rose-50 border border-red-200/60
                          rounded-xl animate-fade-in-down"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-red-100 flex items-center justify-center shrink-0">
                    <svg
                      className="w-4 h-4 text-red-600"
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
                  <span className="text-sm text-red-800">{error}</span>
                </div>
                <button
                  onClick={clearError}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                >
                  <svg
                    className="w-4 h-4"
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
            </div>
          )}

          {/* Upload section */}
          <div className="mb-6">
            <DocumentUpload onUpload={upload} isUploading={isUploading} />
          </div>

          {/* Loading state */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <p className="mt-3 text-sm text-gray-500">読み込み中...</p>
            </div>
          ) : (
            <>
              {/* Sample documents */}
              <DocumentList
                title={UI_TEXT.sampleDocuments}
                documents={sampleDocuments}
                onPreview={setPreviewDoc}
              />

              {/* Uploaded documents */}
              <DocumentList
                title={UI_TEXT.uploadedDocuments}
                documents={uploadedDocuments}
                onDelete={remove}
                onPreview={setPreviewDoc}
                showDelete
              />

              {/* Empty state */}
              {sampleDocuments.length === 0 &&
                uploadedDocuments.length === 0 && (
                  <div className="text-center py-12 animate-fade-in">
                    <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-2xl flex items-center justify-center">
                      <svg
                        className="w-8 h-8 text-gray-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-500 font-medium">
                      {UI_TEXT.noDocuments}
                    </p>
                    <p className="text-sm text-gray-400 mt-1">
                      上のエリアにファイルをドロップしてください
                    </p>
                  </div>
                )}
            </>
          )}
        </div>

        {/* Footer with rebuild button */}
        <div className="shrink-0 px-6 py-5 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={rebuild}
            disabled={
              isRebuilding ||
              (sampleDocuments.length === 0 && uploadedDocuments.length === 0)
            }
            className="w-full py-3.5 px-4 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-xl
                     font-medium shadow-md shadow-blue-500/25
                     hover:from-blue-600 hover:to-blue-700 hover:shadow-lg hover:shadow-blue-500/30
                     disabled:from-gray-300 disabled:to-gray-400 disabled:shadow-none
                     active:scale-[0.98] transition-all duration-200
                     flex items-center justify-center gap-2.5"
          >
            {isRebuilding ? (
              <>
                <LoadingSpinner
                  size="sm"
                  className="border-white/30 border-t-white"
                />
                <span>処理中...</span>
              </>
            ) : (
              <>
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
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                <span>{UI_TEXT.rebuildButton}</span>
              </>
            )}
          </button>
          <p className="text-xs text-gray-400 text-center mt-3">
            ドキュメントの追加・削除後に実行してください
          </p>
        </div>
      </div>

      {/* Document preview modal */}
      <DocumentPreviewModal
        doc={previewDoc}
        onClose={() => setPreviewDoc(null)}
      />
    </>
  );
}
