"use client";

import { useCallback, useState } from "react";
import { UI_TEXT, UPLOAD_CONFIG } from "@/lib/constants";
import { LoadingSpinner } from "./LoadingSpinner";

interface DocumentUploadProps {
  onUpload: (file: File) => Promise<boolean>;
  isUploading: boolean;
}

export function DocumentUpload({ onUpload, isUploading }: DocumentUploadProps) {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const txtFiles = files.filter((f) => f.name.endsWith(".txt"));

      for (const file of txtFiles) {
        await onUpload(file);
      }
    },
    [onUpload]
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      for (const file of Array.from(files)) {
        await onUpload(file);
      }

      // Reset input
      e.target.value = "";
    },
    [onUpload]
  );

  return (
    <div
      className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
        isDragging
          ? "border-blue-500 bg-blue-50"
          : "border-gray-300 hover:border-gray-400"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {isUploading ? (
        <div className="flex flex-col items-center gap-2">
          <LoadingSpinner size="lg" />
          <p className="text-sm text-gray-600">アップロード中...</p>
        </div>
      ) : (
        <>
          <svg
            className="w-10 h-10 mx-auto text-gray-400 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-sm text-gray-600 mb-2">
            {UI_TEXT.uploadInstruction}
          </p>
          <label className="inline-block">
            <span
              className="px-4 py-2 text-sm font-medium text-blue-600
                       bg-blue-50 rounded-lg cursor-pointer
                       hover:bg-blue-100 transition-colors"
            >
              {UI_TEXT.uploadButton}
            </span>
            <input
              type="file"
              accept=".txt"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
          </label>
          <p className="mt-2 text-xs text-gray-500">
            最大 {UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB
          </p>
        </>
      )}
    </div>
  );
}
