"use client";

import { useState, useEffect, RefObject } from "react";
import { UI_TEXT } from "@/lib/constants";

const STORAGE_KEY = "rag-demo-welcome-seen";

interface WelcomeCalloutProps {
  onDismiss: () => void;
  targetRef: RefObject<HTMLDivElement | null>;
  /** If true, dismissal persists across sessions via localStorage. Default: false (session only) */
  persistDismissal?: boolean;
}

export function WelcomeCallout({
  onDismiss,
  targetRef,
  persistDismissal = false,
}: WelcomeCalloutProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // Check if user has already seen the welcome (only if persistence is enabled)
    if (persistDismissal) {
      const hasSeen = localStorage.getItem(STORAGE_KEY);
      if (hasSeen) return;
    }

    // Small delay to let the page render first
    const timer = setTimeout(() => setIsVisible(true), 500);
    return () => clearTimeout(timer);
  }, [persistDismissal]);

  // Calculate position based on target element (DatasetSelector area)
  useEffect(() => {
    if (isVisible && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 12, // 12px below the target
        left: rect.left + rect.width / 2, // Center horizontally
      });
    }
  }, [isVisible, targetRef]);

  const handleDismiss = () => {
    if (persistDismissal) {
      localStorage.setItem(STORAGE_KEY, "true");
    }
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/30 z-40 animate-fade-in"
        onClick={handleDismiss}
      />

      {/* Tooltip anchored below DatasetSelector, centered */}
      <div
        className="fixed z-50 animate-fade-in-down -translate-x-1/2"
        style={{
          top: position.top,
          left: position.left,
          animationDelay: "100ms",
        }}
      >
        <div className="relative bg-white rounded-2xl shadow-2xl p-5 max-w-sm border border-gray-100">
          {/* Arrow pointing up toward DatasetSelector */}
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-100 transform rotate-45"
          />

          {/* Content */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
              {/* Waving hand / welcome icon */}
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1.5">
                {UI_TEXT.welcomeCalloutTitle}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {UI_TEXT.welcomeCalloutMessage}
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="mt-4 w-full py-2.5 px-4 bg-linear-to-r from-blue-500 to-blue-600 text-white rounded-xl
                     font-medium text-sm shadow-md shadow-blue-500/25
                     hover:from-blue-600 hover:to-blue-700 hover:shadow-lg
                     active:scale-[0.98] transition-all duration-200"
          >
            {UI_TEXT.calloutDismiss}
          </button>
        </div>
      </div>
    </>
  );
}

// Helper to check if welcome has been seen (only relevant when persistDismissal=true)
export function hasSeenWelcome(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

// Helper to reset welcome for testing (only relevant when persistDismissal=true)
export function resetWelcome(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
