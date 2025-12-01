"use client";

import type { Document } from "@/lib/types";
import { UI_TEXT } from "@/lib/constants";

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
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h3>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {documents.length}
        </span>
      </div>
      <ul className="space-y-2">
        {documents.map((doc, index) => (
          <li
            key={doc.id}
            className="group flex items-center justify-between p-3.5 bg-white rounded-xl
                     border border-gray-100 hover:border-gray-200 hover:shadow-md
                     transition-all duration-200 animate-fade-in-up"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-100
                            flex items-center justify-center shrink-0
                            group-hover:from-blue-100 group-hover:to-indigo-200 transition-colors">
                <svg
                  className="w-5 h-5 text-blue-600"
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
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {doc.filename}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{doc.lineCount} 行</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
                  doc.status === "ready"
                    ? "bg-gradient-to-r from-emerald-50 to-green-100 text-emerald-700"
                    : doc.status === "processing"
                    ? "bg-gradient-to-r from-amber-50 to-yellow-100 text-amber-700"
                    : "bg-gradient-to-r from-red-50 to-rose-100 text-red-700"
                }`}
              >
                {doc.status === "ready" ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {UI_TEXT.documentReady}
                  </span>
                ) : doc.status === "processing" ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {UI_TEXT.documentProcessing}
                  </span>
                ) : (
                  "エラー"
                )}
              </span>
              {showDelete && onDelete && (
                <button
                  onClick={() => handleDelete(doc)}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50
                           rounded-lg transition-all duration-200 opacity-0 group-hover:opacity-100"
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
