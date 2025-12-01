/**
 * Backend API client
 */

import { API_CONFIG } from "./constants";
import type {
  Document,
  DocumentListResponse,
  DocumentUploadResponse,
  HealthResponse,
  Message,
  RebuildResponse,
  Source,
  SSEEvent,
} from "./types";

const { baseUrl, endpoints } = API_CONFIG;

/**
 * ヘルスチェック
 */
export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${baseUrl}${endpoints.health}`);
  if (!response.ok) {
    throw new Error("Health check failed");
  }
  return response.json();
}

/**
 * ドキュメント一覧を取得
 */
export async function fetchDocuments(): Promise<Document[]> {
  const response = await fetch(`${baseUrl}${endpoints.documents}`);
  if (!response.ok) {
    throw new Error("Failed to fetch documents");
  }
  const data: DocumentListResponse = await response.json();
  return data.documents.map((doc) => ({
    id: doc.id,
    filename: doc.filename,
    type: doc.type,
    status: doc.status,
    lineCount: doc.lineCount || 0,
  }));
}

/**
 * ドキュメントをアップロード
 */
export async function uploadDocument(
  file: File
): Promise<DocumentUploadResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${baseUrl}${endpoints.upload}`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Upload failed");
  }

  return response.json();
}

/**
 * ドキュメントを削除
 */
export async function deleteDocument(docId: string): Promise<void> {
  const response = await fetch(`${baseUrl}${endpoints.documents}/${docId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Delete failed");
  }
}

/**
 * ベクトルストアを再構築
 */
export async function rebuildVectorstore(): Promise<RebuildResponse> {
  const response = await fetch(`${baseUrl}${endpoints.rebuild}`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || "Rebuild failed");
  }

  return response.json();
}

/**
 * SSE ストリーミングチャット
 */
export async function* streamChat(
  message: string,
  history: Pick<Message, "role" | "content">[]
): AsyncGenerator<SSEEvent, void, unknown> {
  const response = await fetch(`${baseUrl}${endpoints.chat}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      history: history.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    throw new Error("Chat request failed");
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("No response body");
  }

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Process complete SSE events
    const lines = buffer.split("\n");
    buffer = lines.pop() || ""; // Keep incomplete line in buffer

    let currentEvent: string | null = null;

    for (const line of lines) {
      if (line.startsWith("event: ")) {
        currentEvent = line.slice(7).trim();
      } else if (line.startsWith("data: ") && currentEvent) {
        try {
          const data = JSON.parse(line.slice(6));
          yield { type: currentEvent, data } as SSEEvent;
        } catch {
          // Ignore parse errors
        }
        currentEvent = null;
      }
    }
  }
}

/**
 * ソース情報をパースしてMessage形式に変換
 */
export function parseSourcesFromAPI(
  apiSources: Array<{
    filename: string;
    start_line: number;
    end_line: number;
    content_preview: string;
  }>
): Source[] {
  return apiSources.map((s) => ({
    filename: s.filename,
    startLine: s.start_line,
    endLine: s.end_line,
    contentPreview: s.content_preview,
  }));
}
