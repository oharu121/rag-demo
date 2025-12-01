"use client";

import { useEffect } from "react";
import { UI_TEXT } from "@/lib/constants";
import { useDocuments } from "@/hooks/useDocuments";
import { DocumentList } from "./DocumentList";
import { DocumentUpload } from "./DocumentUpload";
import { LoadingSpinner } from "./LoadingSpinner";

interface DocumentDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DocumentDrawer({ isOpen, onClose }: DocumentDrawerProps) {
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
  } = useDocuments();

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
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 h-full w-full max-w-md bg-white z-50
                   shadow-xl transform transition-transform duration-300"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">{UI_TEXT.documentsTitle}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4" style={{ height: "calc(100% - 130px)" }}>
          {/* Error message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-center justify-between">
              <span>{error}</span>
              <button
                onClick={clearError}
                className="text-red-500 hover:text-red-700"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Upload section */}
          <div className="mb-6">
            <DocumentUpload onUpload={upload} isUploading={isUploading} />
          </div>

          {/* Loading state */}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {/* Sample documents */}
              <DocumentList
                title={UI_TEXT.sampleDocuments}
                documents={sampleDocuments}
              />

              {/* Uploaded documents */}
              <DocumentList
                title={UI_TEXT.uploadedDocuments}
                documents={uploadedDocuments}
                onDelete={remove}
                showDelete
              />

              {/* Empty state */}
              {sampleDocuments.length === 0 && uploadedDocuments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 text-gray-300"
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
                  <p>{UI_TEXT.noDocuments}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer with rebuild button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-white">
          <button
            onClick={rebuild}
            disabled={isRebuilding || (sampleDocuments.length === 0 && uploadedDocuments.length === 0)}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg
                     font-medium hover:bg-blue-700 disabled:bg-gray-300
                     disabled:cursor-not-allowed transition-colors
                     flex items-center justify-center gap-2"
          >
            {isRebuilding ? (
              <>
                <LoadingSpinner size="sm" className="border-white border-t-transparent" />
                処理中...
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
                {UI_TEXT.rebuildButton}
              </>
            )}
          </button>
        </div>
      </div>
    </>
  );
}
