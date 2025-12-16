"use client";

import { useState, useEffect, RefObject } from "react";
import { UI_TEXT } from "@/lib/constants";

interface UploadGuideCalloutProps {
  onDismiss: () => void;
  targetRef: RefObject<HTMLButtonElement | null> | HTMLButtonElement | null;
}

export function UploadGuideCallout({ onDismiss, targetRef }: UploadGuideCalloutProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<{ bottom: number; left: number } | null>(null);

  useEffect(() => {
    // Small delay to let the drawer animate in first
    const timer = setTimeout(() => setIsVisible(true), 400);
    return () => clearTimeout(timer);
  }, []);

  // Calculate position above the target button
  useEffect(() => {
    const target = targetRef && 'current' in targetRef ? targetRef.current : targetRef;
    if (isVisible && target) {
      const updatePosition = () => {
        const rect = target.getBoundingClientRect();
        setPosition({
          bottom: window.innerHeight - rect.top + 16, // 16px above button
          left: rect.left + rect.width / 2, // Center horizontally
        });
      };
      updatePosition();
      window.addEventListener('resize', updatePosition);
      return () => window.removeEventListener('resize', updatePosition);
    }
  }, [isVisible, targetRef]);

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  if (!isVisible || !position) return null;

  return (
    <>
      {/* Backdrop - lower z-index than drawer (z-50) but clickable */}
      <div
        className="fixed inset-0 bg-black/20 z-45 animate-fade-in"
        onClick={handleDismiss}
      />

      {/* Callout positioned above the re-index button */}
      <div
        className="fixed z-55 animate-fade-in-down"
        style={{
          bottom: position.bottom,
          left: position.left,
          transform: "translateX(-50%)",
          animationDelay: "100ms",
        }}
      >
        <div className="relative bg-white rounded-2xl shadow-2xl p-5 w-80 border border-gray-100">
          {/* Arrow pointing down */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -bottom-2 w-4 h-4 bg-white border-r border-b border-gray-100 rotate-45"
          />

          {/* Content */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-linear-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/25">
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                {UI_TEXT.uploadGuideTitle}
              </h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                {UI_TEXT.uploadGuideMessage}
              </p>
            </div>
          </div>

          {/* Dismiss button */}
          <button
            onClick={handleDismiss}
            className="mt-4 w-full py-2.5 px-3 bg-linear-to-r from-emerald-500 to-teal-600 text-white rounded-xl
                     font-medium text-sm shadow-md shadow-emerald-500/25
                     hover:from-emerald-600 hover:to-teal-700 hover:shadow-lg
                     active:scale-[0.98] transition-all duration-200"
          >
            {UI_TEXT.onboardingDismiss}
          </button>
        </div>
      </div>
    </>
  );
}
