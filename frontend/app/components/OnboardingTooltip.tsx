"use client";

import { useState, useEffect, RefObject } from "react";
import { UI_TEXT } from "@/lib/constants";

const STORAGE_KEY = "rag-demo-onboarding-seen";

interface OnboardingTooltipProps {
  documentCount: number;
  onDismiss: () => void;
  targetRef: RefObject<HTMLButtonElement | null>;
  /** If true, dismissal persists across sessions via localStorage. Default: false (session only) */
  persistDismissal?: boolean;
}

export function OnboardingTooltip({
  documentCount,
  onDismiss,
  targetRef,
  persistDismissal = false,
}: OnboardingTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    // Check if user has already seen the onboarding (only if persistence is enabled)
    if (persistDismissal) {
      const hasSeen = localStorage.getItem(STORAGE_KEY);
      if (hasSeen) return;
    }

    if (documentCount > 0) {
      // Small delay to let the page render first
      const timer = setTimeout(() => setIsVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [documentCount, persistDismissal]);

  // Calculate position based on target button
  useEffect(() => {
    if (isVisible && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 12, // 12px below the button
        right: window.innerWidth - rect.right, // Align right edge with button
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

      {/* Tooltip anchored to button */}
      <div
        className="fixed z-50 animate-fade-in-down"
        style={{
          top: position.top,
          right: position.right,
          animationDelay: "100ms",
        }}
      >
        <div className="relative bg-white rounded-2xl shadow-2xl p-5 max-w-sm border border-gray-100">
          {/* Arrow pointing up toward button */}
          <div
            className="absolute -top-2 right-8 w-4 h-4 bg-white border-l border-t border-gray-100 transform rotate-45"
          />

          {/* Content */}
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-linear-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/25">
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
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1.5">
                {documentCount}件のドキュメントが準備されています
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {UI_TEXT.onboardingMessage}
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
            {UI_TEXT.onboardingDismiss}
          </button>
        </div>
      </div>
    </>
  );
}

// Helper to check if onboarding has been seen (only relevant when persistDismissal=true)
export function hasSeenOnboarding(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(STORAGE_KEY) === "true";
}

// Helper to reset onboarding for testing (only relevant when persistDismissal=true)
export function resetOnboarding(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
