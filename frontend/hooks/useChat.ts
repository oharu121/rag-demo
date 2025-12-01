"use client";

import { useState, useCallback, useRef } from "react";
import type { Message, Source, SSEEvent } from "@/lib/types";
import { streamChat, parseSourcesFromAPI } from "@/lib/api";
import { UI_TEXT } from "@/lib/constants";

function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function useChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isLoadingRef = useRef(false);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoadingRef.current) return;

    setError(null);
    setIsLoading(true);
    isLoadingRef.current = true;

    // Add user message
    const userMessage: Message = {
      id: generateId(),
      role: "user",
      content: content.trim(),
      timestamp: new Date(),
    };

    // Create assistant message placeholder
    const assistantMessage: Message = {
      id: generateId(),
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };

    // Capture current history BEFORE adding new messages using functional update
    let capturedHistory: Pick<Message, "role" | "content">[] = [];
    setMessages((prev) => {
      // Capture current messages for history
      capturedHistory = prev.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      return [...prev, userMessage, assistantMessage];
    });

    try {
      abortControllerRef.current = new AbortController();

      // Use captured history (avoids stale closure)
      const history = capturedHistory;

      let sources: Source[] = [];
      let fullContent = "";

      for await (const event of streamChat(content, history)) {
        switch (event.type) {
          case "token":
            fullContent += event.data.token;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, content: fullContent }
                  : m
              )
            );
            break;

          case "sources":
            sources = parseSourcesFromAPI(event.data.sources);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id ? { ...m, sources } : m
              )
            );
            break;

          case "done":
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? { ...m, isStreaming: false }
                  : m
              )
            );
            break;

          case "error":
            setError(event.data.message);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMessage.id
                  ? {
                      ...m,
                      content: event.data.message,
                      isStreaming: false,
                    }
                  : m
              )
            );
            break;
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : UI_TEXT.networkError;
      setError(errorMessage);
      setMessages((prev) =>
        prev.map((m) =>
          m.role === "assistant" && m.isStreaming
            ? { ...m, content: errorMessage, isStreaming: false }
            : m
        )
      );
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
      abortControllerRef.current = null;
    }
  }, []); // No dependencies - uses refs and functional state updates

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    clearError,
  };
}
