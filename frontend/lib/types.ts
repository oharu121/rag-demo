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
  data: { processing_time_ms: number; document_set: string; strategy: string };
}

export interface SSEErrorEvent {
  type: "error";
  data: { message: string; code: string };
}

// Chunk info with score (from chunks event)
export interface ChunkInfo {
  filename: string;
  start_line: number;
  end_line: number;
  content: string;
  content_preview: string;
  score: number;
  chunking_strategy: string;
  has_parent?: boolean;
  parent_content_preview?: string;
}

export interface SSEChunksEvent {
  type: "chunks";
  data: {
    chunks: ChunkInfo[];
    document_set: string;
    strategy: string;
  };
}

export type SSEEvent =
  | SSETokenEvent
  | SSESourcesEvent
  | SSEChunksEvent
  | SSEDoneEvent
  | SSEErrorEvent;

// Strategy and document set options
export type ChunkingStrategy = "standard" | "large" | "parent_child";
export type DocumentSet = "original" | "optimized";

export interface StrategyOption {
  id: string;
  name: string;
  description: string;
}

export interface DocumentSetOption {
  id: string;
  name: string;
  description: string;
  document_count: number;
}

export interface CollectionInfo {
  name: string;
  document_set: string;
  strategy: string;
  is_loaded: boolean;
}

export interface OptionsResponse {
  strategies: StrategyOption[];
  document_sets: DocumentSetOption[];
  collections: CollectionInfo[];
  defaults: {
    strategy: string;
    document_set: string;
  };
}

// Evaluation types
export interface ScoringData {
  isCorrect: boolean;
  foundTerms: string[];
  missingTerms: string[];
  prohibitedFound: string[];
  explanation: string;
}

export interface EvaluationQueryResult {
  id: string;
  category: string;
  question: string;
  answer: string;
  is_correct: boolean;
  found_terms: string[];
  missing_terms: string[];
  prohibited_found: string[];
  explanation: string;
}

export interface EvaluationScore {
  correct: number;
  total: number;
  percentage: number;
}

export interface EvaluationDatasetResult {
  queries: EvaluationQueryResult[];
  score: EvaluationScore;
}

export interface EvaluationResponse {
  status: string;
  document_set: string;
  results: EvaluationDatasetResult;
}

export interface TestQuery {
  id: string;
  category: string;
  question: string;
}
