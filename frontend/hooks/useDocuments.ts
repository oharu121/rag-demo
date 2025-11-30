"use client";

import { useState, useCallback, useEffect } from "react";
import type { Document } from "../lib/types";
import {
  fetchDocuments,
  uploadDocument,
  deleteDocument,
  rebuildVectorstore,
} from "../lib/api";
import { UI_TEXT, UPLOAD_CONFIG } from "../lib/constants";

export function useDocuments() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRebuilding, setIsRebuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const docs = await fetchDocuments();
      setDocuments(docs);
    } catch (err) {
      setError(err instanceof Error ? err.message : UI_TEXT.networkError);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const upload = useCallback(async (file: File) => {
    // Validate file
    if (!file.name.endsWith(".txt")) {
      setError(UI_TEXT.invalidFileType);
      return false;
    }

    if (file.size > UPLOAD_CONFIG.maxFileSize) {
      setError(UI_TEXT.fileTooLarge);
      return false;
    }

    setIsUploading(true);
    setError(null);

    try {
      await uploadDocument(file);
      await loadDocuments();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : UI_TEXT.uploadError);
      return false;
    } finally {
      setIsUploading(false);
    }
  }, [loadDocuments]);

  const remove = useCallback(async (docId: string) => {
    setError(null);
    try {
      await deleteDocument(docId);
      await loadDocuments();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : UI_TEXT.serverError);
      return false;
    }
  }, [loadDocuments]);

  const rebuild = useCallback(async () => {
    setIsRebuilding(true);
    setError(null);
    try {
      const result = await rebuildVectorstore();
      await loadDocuments();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : UI_TEXT.serverError);
      return null;
    } finally {
      setIsRebuilding(false);
    }
  }, [loadDocuments]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load documents on mount
  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  // Separate sample and uploaded documents
  const sampleDocuments = documents.filter((d) => d.type === "sample");
  const uploadedDocuments = documents.filter((d) => d.type === "uploaded");

  return {
    documents,
    sampleDocuments,
    uploadedDocuments,
    isLoading,
    isUploading,
    isRebuilding,
    error,
    loadDocuments,
    upload,
    remove,
    rebuild,
    clearError,
  };
}
