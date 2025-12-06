import { describe, it, expect } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useChat } from "@/hooks/useChat";
import { server } from "@/mocks/server";
import { http, HttpResponse, delay } from "msw";
import { API_CONFIG } from "@/lib/constants";

const baseUrl = API_CONFIG.baseUrl;

describe("useChat", () => {
  it("initializes with empty state", () => {
    const { result } = renderHook(() => useChat());

    expect(result.current.messages).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("adds user message and streams assistant response", async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage("Hello");
    });

    // User message should be added immediately
    expect(result.current.messages[0].role).toBe("user");
    expect(result.current.messages[0].content).toBe("Hello");

    // Wait for streaming to complete
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 }
    );

    // Assistant message should be populated
    expect(result.current.messages).toHaveLength(2);
    expect(result.current.messages[1].role).toBe("assistant");
    expect(result.current.messages[1].content).toBe("Hello World");
    expect(result.current.messages[1].isStreaming).toBe(false);
  });

  it("receives sources from SSE stream", async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage("test");
    });

    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
      },
      { timeout: 5000 }
    );

    // Check sources were parsed
    expect(result.current.messages[1].sources).toBeDefined();
    expect(result.current.messages[1].sources).toHaveLength(1);
    expect(result.current.messages[1].sources![0].filename).toBe("sample.txt");
  });

  it("handles SSE error events", async () => {
    server.use(
      http.post(`${baseUrl}/api/chat`, () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                'event: error\ndata: {"message":"Server error","code":"500"}\n\n'
              )
            );
            controller.close();
          },
        });
        return new HttpResponse(stream, {
          headers: { "Content-Type": "text/event-stream" },
        });
      })
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage("test");
    });

    await waitFor(() => {
      expect(result.current.error).toBe("Server error");
    });
  });

  it("handles network errors", async () => {
    server.use(
      http.post(`${baseUrl}/api/chat`, () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage("test");
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("does not send empty messages", async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage("");
      result.current.sendMessage("   ");
    });

    expect(result.current.messages).toHaveLength(0);
  });

  it("prevents concurrent requests", async () => {
    // Slow down the response
    server.use(
      http.post(`${baseUrl}/api/chat`, async () => {
        await delay(500);
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode('event: token\ndata: {"token":"Response"}\n\n')
            );
            controller.enqueue(
              encoder.encode('event: done\ndata: {"processing_time_ms":100}\n\n')
            );
            controller.close();
          },
        });
        return new HttpResponse(stream, {
          headers: { "Content-Type": "text/event-stream" },
        });
      })
    );

    const { result } = renderHook(() => useChat());

    // Send first message
    act(() => {
      result.current.sendMessage("First");
    });

    // Try to send second while first is loading
    await act(async () => {
      result.current.sendMessage("Second");
    });

    // Only one user message should exist
    const userMessages = result.current.messages.filter((m) => m.role === "user");
    expect(userMessages).toHaveLength(1);
    expect(userMessages[0].content).toBe("First");
  });

  it("clears messages and error", async () => {
    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage("Hello");
    });

    await waitFor(() => {
      expect(result.current.messages.length).toBeGreaterThan(0);
    });

    act(() => {
      result.current.clearMessages();
    });

    expect(result.current.messages).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("clears error only with clearError", async () => {
    server.use(
      http.post(`${baseUrl}/api/chat`, () => {
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                'event: error\ndata: {"message":"Test error","code":"500"}\n\n'
              )
            );
            controller.close();
          },
        });
        return new HttpResponse(stream, {
          headers: { "Content-Type": "text/event-stream" },
        });
      })
    );

    const { result } = renderHook(() => useChat());

    await act(async () => {
      result.current.sendMessage("test");
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    act(() => {
      result.current.clearError();
    });

    expect(result.current.error).toBeNull();
    // Messages should still exist
    expect(result.current.messages.length).toBeGreaterThan(0);
  });
});
