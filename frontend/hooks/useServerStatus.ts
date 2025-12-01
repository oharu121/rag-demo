"use client";

import { useState, useEffect, useCallback } from "react";
import { checkHealth } from "@/lib/api";
import type { HealthResponse } from "@/lib/types";

export type ServerStatus = "checking" | "starting" | "ready" | "error";

export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>("checking");
  const [healthData, setHealthData] = useState<HealthResponse | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const checkServerHealth = useCallback(async () => {
    try {
      const health = await checkHealth();
      setHealthData(health);

      if (health.model_loaded && health.vectorstore_ready) {
        setStatus("ready");
      } else {
        // Server is up but still initializing
        setStatus("starting");
        // Retry after 3 seconds
        setTimeout(() => setRetryCount((c) => c + 1), 3000);
      }
    } catch {
      // Server not responding - might be cold starting
      setStatus("starting");
      // Retry after 5 seconds
      setTimeout(() => setRetryCount((c) => c + 1), 5000);
    }
  }, []);

  useEffect(() => {
    checkServerHealth();
  }, [checkServerHealth, retryCount]);

  const retry = useCallback(() => {
    setStatus("checking");
    setRetryCount((c) => c + 1);
  }, []);

  return {
    status,
    healthData,
    isReady: status === "ready",
    isStarting: status === "starting" || status === "checking",
    retry,
  };
}
