"use client";

import { useState, useEffect, RefObject } from "react";
import { UI_TEXT } from "@/lib/constants";

interface DocumentsCalloutProps {
  onDismiss: () => void;
  targetRef: RefObject<HTMLButtonElement | null>;
}

export function DocumentsCallout({
  onDismiss,
  targetRef,
}: DocumentsCalloutProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, right: 0 });

  useEffect(() => {
    // Small delay to let the previous callout fade out
    const timer = setTimeout(() => setIsVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  // Calculate position based on target element (Documents button)
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

      {/* Callout anchored below Documents button */}
      <div
        className="fixed z-50 animate-fade-in-down"
        style={{
          top: position.top,
          right: position.right,
          animationDelay: "100ms",
        }}
      >
        <div className="relative bg-white rounded-2xl shadow-2xl p-4 max-w-xs border border-gray-100">
          {/* Arrow pointing up toward Documents button */}
          <div
            className="absolute -top-2 right-6 w-4 h-4 bg-white border-l border-t border-gray-100 transform rotate-45"
          />

          {/* Content */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
              {/* Folder/documents icon */}
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
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                {UI_TEXT.documentsCalloutTitle}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {UI_TEXT.documentsCalloutMessage}
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="mt-3 w-full py-2 px-3 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl
                     font-medium text-sm shadow-md shadow-emerald-500/25
                     hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg
                     active:scale-[0.98] transition-all duration-200"
          >
            {UI_TEXT.calloutDismiss}
          </button>
        </div>
      </div>
    </>
  );
}
