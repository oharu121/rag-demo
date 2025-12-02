/**
 * 型定義
 */

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
  timestamp: Date;
  isStreaming?: boolean;
}

export interface Source {
  filename: string;
  startLine: number;
  endLine: number;
  contentPreview: string;
}

export interface Document {
  id: string;
  filename: string;
  type: "sample" | "uploaded";
  status: "ready" | "processing" | "error";
  lineCount: number;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
}

export interface DocumentState {
  documents: Document[];
  isLoading: boolean;
  error: string | null;
}

// API Response types
export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  vectorstore_ready: boolean;
  document_count: number;
}

// Raw API document format (snake_case from backend)
export interface APIDocumentInfo {
  id: string;
  filename: string;
  type: "sample" | "uploaded";
  status: "ready" | "processing" | "error";
  line_count: number;
}

export interface DocumentListResponse {
  documents: APIDocumentInfo[];
  total: number;
}

export interface DocumentUploadResponse {
  id: string;
  filename: string;
  status: string;
  message: string;
}

export interface RebuildResponse {
  status: string;
  chunk_count: number;
  message: string;
}

export interface DocumentContentResponse {
  id: string;
  filename: string;
  content: string;
  line_count: number;
}

// SSE Event types
export interface SSETokenEvent {
  type: "token";
  data: { token: string };
}

// API source format (snake_case from backend)
export interface APISource {
  filename: string;
  start_line: number;
  end_line: number;
  content_preview: string;
}

export interface SSESourcesEvent {
  type: "sources";
  data: { sources: APISource[] };
}

export interface SSEDoneEvent {
  type: "done";
  data: { processing_time_ms: number };
}

export interface SSEErrorEvent {
  type: "error";
  data: { message: string; code: string };
}

export type SSEEvent =
  | SSETokenEvent
  | SSESourcesEvent
  | SSEDoneEvent
  | SSEErrorEvent;
