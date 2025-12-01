"use client";

import { UI_TEXT } from "@/lib/constants";

interface ServerStartingOverlayProps {
  isVisible: boolean;
}

export function ServerStartingOverlay({
  isVisible,
}: ServerStartingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-linear-to-br from-slate-50 via-white to-blue-50/50 z-50 flex items-center justify-center">
      <div className="text-center max-w-md px-6 animate-fade-in">
        {/* Animated loader */}
        <div className="relative w-28 h-28 mx-auto mb-8">
          {/* Glow effect */}
          <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-2xl animate-pulse" />

          {/* Outer ring */}
          <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />

          {/* Spinning ring */}
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin" />

          {/* Second spinning ring (slower, opposite direction) */}
          <div
            className="absolute inset-2 border-4 border-transparent border-b-indigo-400 border-l-indigo-400 rounded-full animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          />

          {/* Inner icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-14 h-14 bg-linear-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
              <svg
                className="w-7 h-7 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-semibold text-gray-900 mb-3">
          {UI_TEXT.serverStartingTitle}
        </h2>

        {/* Message */}
        <p className="text-gray-500 mb-6 leading-relaxed">
          {UI_TEXT.serverStartingMessage}
        </p>

        {/* Progress dots */}
        <div className="flex justify-center gap-2 mb-8">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-2.5 h-2.5 bg-linear-to-r from-blue-500 to-indigo-500 rounded-full animate-bounce shadow-sm shadow-blue-500/50"
              style={{ animationDelay: `${i * 150}ms` }}
            />
          ))}
        </div>

        {/* Hint */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100/80 rounded-full">
          <svg
            className="w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <p className="text-xs text-gray-500">{UI_TEXT.serverStartingHint}</p>
        </div>
      </div>
    </div>
  );
}
