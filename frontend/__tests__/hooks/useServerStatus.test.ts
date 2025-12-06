import { describe, it, expect } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useServerStatus } from "@/hooks/useServerStatus";
import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { API_CONFIG } from "@/lib/constants";

const baseUrl = API_CONFIG.baseUrl;

describe("useServerStatus", () => {
  it("initializes with checking status", () => {
    const { result } = renderHook(() => useServerStatus());

    expect(result.current.status).toBe("checking");
    expect(result.current.isReady).toBe(false);
    expect(result.current.isStarting).toBe(true);
  });

  it("sets ready status when server is fully initialized", async () => {
    const { result } = renderHook(() => useServerStatus());

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    expect(result.current.isReady).toBe(true);
    expect(result.current.isStarting).toBe(false);
    expect(result.current.healthData).toBeTruthy();
    expect(result.current.healthData?.model_loaded).toBe(true);
  });

  it("sets starting status when model not yet loaded", async () => {
    server.use(
      http.get(`${baseUrl}/api/health`, () => {
        return HttpResponse.json({
          status: "healthy",
          model_loaded: false,
          vectorstore_ready: false,
          document_count: 0,
        });
      })
    );

    const { result } = renderHook(() => useServerStatus());

    await waitFor(() => {
      expect(result.current.status).toBe("starting");
    });

    expect(result.current.isReady).toBe(false);
    expect(result.current.isStarting).toBe(true);
  });

  it("sets starting status when vectorstore not ready", async () => {
    server.use(
      http.get(`${baseUrl}/api/health`, () => {
        return HttpResponse.json({
          status: "healthy",
          model_loaded: true,
          vectorstore_ready: false,
          document_count: 0,
        });
      })
    );

    const { result } = renderHook(() => useServerStatus());

    await waitFor(() => {
      expect(result.current.status).toBe("starting");
    });

    expect(result.current.isReady).toBe(false);
  });

  it("handles server not responding", async () => {
    server.use(
      http.get(`${baseUrl}/api/health`, () => {
        return HttpResponse.error();
      })
    );

    const { result } = renderHook(() => useServerStatus());

    await waitFor(() => {
      expect(result.current.status).toBe("starting");
    });

    expect(result.current.isStarting).toBe(true);
  });

  it("provides retry function that resets status", async () => {
    let callCount = 0;
    server.use(
      http.get(`${baseUrl}/api/health`, () => {
        callCount++;
        return HttpResponse.json({
          status: "healthy",
          model_loaded: true,
          vectorstore_ready: true,
          document_count: 3,
        });
      })
    );

    const { result } = renderHook(() => useServerStatus());

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });

    const initialCallCount = callCount;

    // Call retry - it should reset status and trigger new check
    act(() => {
      result.current.retry();
    });

    // Status should be reset to "checking"
    expect(result.current.status).toBe("checking");

    // Wait for the new health check to complete
    await waitFor(() => {
      expect(callCount).toBeGreaterThan(initialCallCount);
    });

    await waitFor(() => {
      expect(result.current.status).toBe("ready");
    });
  });

  it("exposes health data when available", async () => {
    const { result } = renderHook(() => useServerStatus());

    await waitFor(() => {
      expect(result.current.healthData).not.toBeNull();
    });

    expect(result.current.healthData?.status).toBe("healthy");
    expect(result.current.healthData?.model_loaded).toBe(true);
    expect(result.current.healthData?.vectorstore_ready).toBe(true);
    expect(result.current.healthData?.document_count).toBe(3);
  });
});
