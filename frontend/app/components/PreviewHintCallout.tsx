"use client";

import { useState, useEffect, RefObject } from "react";
import { UI_TEXT } from "@/lib/constants";

interface PreviewHintCalloutProps {
  onDismiss: () => void;
  targetRef: RefObject<HTMLDivElement | null>;
}

export function PreviewHintCallout({
  onDismiss,
  targetRef,
}: PreviewHintCalloutProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    // Small delay to let the page render first
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Calculate position based on target element
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
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 animate-fade-in"
        onClick={handleDismiss}
      />

      {/* Callout anchored below target */}
      <div
        className="fixed z-50 animate-fade-in-down -translate-x-1/2"
        style={{
          top: position.top,
          left: position.left,
          animationDelay: "100ms",
        }}
      >
        <div className="relative bg-white rounded-2xl shadow-2xl p-4 max-w-xs border border-gray-100">
          {/* Arrow pointing up toward target */}
          <div
            className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l border-t border-gray-100 transform rotate-45"
          />

          {/* Content */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                {UI_TEXT.previewHintTitle}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {UI_TEXT.previewHintMessage}
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="mt-3 w-full py-2 px-3 bg-linear-to-r from-indigo-500 to-purple-600 text-white rounded-xl
                     font-medium text-sm shadow-md shadow-indigo-500/25
                     hover:from-indigo-600 hover:to-purple-700 hover:shadow-lg
                     active:scale-[0.98] transition-all duration-200"
          >
            {UI_TEXT.onboardingDismiss}
          </button>
        </div>
      </div>
    </>
  );
}
