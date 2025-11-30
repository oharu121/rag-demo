"use client";

import type { Document } from "../../lib/types";
import { UI_TEXT } from "../../lib/constants";

interface DocumentListProps {
  title: string;
  documents: Document[];
  onDelete?: (docId: string) => void;
  showDelete?: boolean;
}

export function DocumentList({
  title,
  documents,
  onDelete,
  showDelete = false,
}: DocumentListProps) {
  if (documents.length === 0) {
    return null;
  }

  const handleDelete = (doc: Document) => {
    if (onDelete && window.confirm(UI_TEXT.deleteConfirm)) {
      onDelete(doc.id);
    }
  };

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold text-gray-500 mb-2">{title}</h3>
      <ul className="space-y-2">
        {documents.map((doc) => (
          <li
            key={doc.id}
            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
          >
            <div className="flex items-center gap-3 min-w-0">
              <svg
                className="w-5 h-5 text-gray-400 shrink-0"
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
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {doc.filename}
                </p>
                <p className="text-xs text-gray-500">{doc.lineCount} 行</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  doc.status === "ready"
                    ? "bg-green-100 text-green-700"
                    : doc.status === "processing"
                    ? "bg-yellow-100 text-yellow-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {doc.status === "ready"
                  ? UI_TEXT.documentReady
                  : doc.status === "processing"
                  ? UI_TEXT.documentProcessing
                  : "エラー"}
              </span>
              {showDelete && onDelete && (
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  title="削除"
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
