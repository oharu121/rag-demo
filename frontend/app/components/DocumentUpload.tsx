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
      className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
        isDragging
          ? "border-blue-400 bg-blue-50/50 scale-[1.02] shadow-lg shadow-blue-100/50"
          : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/50"
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Decorative corner elements */}
      <div className={`absolute top-3 left-3 w-3 h-3 border-l-2 border-t-2 rounded-tl-lg transition-colors ${isDragging ? "border-blue-400" : "border-gray-300"}`} />
      <div className={`absolute top-3 right-3 w-3 h-3 border-r-2 border-t-2 rounded-tr-lg transition-colors ${isDragging ? "border-blue-400" : "border-gray-300"}`} />
      <div className={`absolute bottom-3 left-3 w-3 h-3 border-l-2 border-b-2 rounded-bl-lg transition-colors ${isDragging ? "border-blue-400" : "border-gray-300"}`} />
      <div className={`absolute bottom-3 right-3 w-3 h-3 border-r-2 border-b-2 rounded-br-lg transition-colors ${isDragging ? "border-blue-400" : "border-gray-300"}`} />

      {isUploading ? (
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-lg animate-pulse" />
            <LoadingSpinner size="lg" />
          </div>
          <p className="text-sm font-medium text-gray-600">アップロード中...</p>
          <p className="text-xs text-gray-400">しばらくお待ちください</p>
        </div>
      ) : (
        <>
          <div className={`w-14 h-14 mx-auto mb-4 rounded-2xl flex items-center justify-center transition-all duration-300 ${
            isDragging
              ? "bg-blue-100 scale-110"
              : "bg-gray-100 group-hover:bg-gray-200"
          }`}>
            <svg
              className={`w-7 h-7 transition-colors ${isDragging ? "text-blue-600" : "text-gray-400"}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
          </div>
          <p className={`text-sm font-medium mb-1 transition-colors ${isDragging ? "text-blue-600" : "text-gray-700"}`}>
            {isDragging ? "ここにドロップ" : UI_TEXT.uploadInstruction}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            または
          </p>
          <label className="inline-block">
            <span
              className="px-5 py-2.5 text-sm font-medium text-blue-600
                       bg-blue-50 rounded-xl
                       hover:bg-blue-100 hover:shadow-md
                       active:scale-95 transition-all duration-200"
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
          <p className="mt-4 text-xs text-gray-400 flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            最大 {UPLOAD_CONFIG.maxFileSize / 1024 / 1024}MB・テキストファイル(.txt)のみ
          </p>
        </>
      )}
    </div>
  );
}
