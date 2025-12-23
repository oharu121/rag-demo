"use client";

import { useState, useEffect, RefObject } from "react";
import { UI_TEXT } from "@/lib/constants";

interface ChatCalloutProps {
  onDismiss: () => void;
  targetRef: RefObject<HTMLDivElement | null>;
}

export function ChatCallout({
  onDismiss,
  targetRef,
}: ChatCalloutProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ bottom: 0, left: 0 });

  useEffect(() => {
    // Small delay to let the previous callout fade out
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Calculate position above the chat input
  useEffect(() => {
    if (isVisible && targetRef.current) {
      const rect = targetRef.current.getBoundingClientRect();
      setPosition({
        bottom: window.innerHeight - rect.top + 12, // 12px above the input
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
        className="fixed inset-0 bg-black/25 z-40 animate-fade-in"
        onClick={handleDismiss}
      />

      {/* Callout anchored above chat input */}
      <div
        className="fixed z-50 animate-fade-in-up -translate-x-1/2"
        style={{
          bottom: position.bottom,
          left: position.left,
          animationDelay: "100ms",
        }}
      >
        <div className="relative bg-white rounded-2xl shadow-2xl p-4 max-w-xs border border-gray-100">
          {/* Arrow pointing down toward chat input */}
          <div
            className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-r border-b border-gray-100 transform rotate-45"
          />

          {/* Content */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 flex items-center justify-center shrink-0 shadow-lg shadow-indigo-500/25">
              {/* Chat bubble icon */}
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
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                {UI_TEXT.chatCalloutTitle}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {UI_TEXT.chatCalloutMessage}
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
            {UI_TEXT.calloutDismiss}
          </button>
        </div>
      </div>
    </>
  );
}
