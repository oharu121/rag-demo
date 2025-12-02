"use client";

import type { Message } from "@/lib/types";
import { SourceCitation } from "./SourceCitation";
import { LoadingSpinner } from "./LoadingSpinner";
import { MayaAvatar, type AvatarState } from "./MayaAvatar";

/**
 * Renders message content with inline citations styled in blue
 * Citations like [filename.txt:10-20] are highlighted
 */
function renderContentWithCitations(content: string): React.ReactNode {
  const citationRegex = /(\[[^\]:\s]+:\d+-\d+\])/g;
  const parts = content.split(citationRegex);

  return parts.map((part, index) => {
    if (citationRegex.test(part)) {
      // Reset regex lastIndex since we're reusing it
      citationRegex.lastIndex = 0;
      return (
        <span key={index} className="text-blue-600 font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  // Determine avatar state based on message streaming status
  const avatarState: AvatarState = message.isStreaming
    ? message.content
      ? "speaking"
      : "thinking"
    : "idling";

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] bg-linear-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md shadow-md shadow-blue-500/20 px-5 py-3.5 transition-all duration-200 hover:shadow-lg">
          <div className="whitespace-pre-wrap wrap-break-word leading-relaxed text-white/95">
            {message.content}
          </div>
        </div>
      </div>
    );
  }

  // Assistant message with avatar
  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-3 max-w-[90%]">
        <MayaAvatar state={avatarState} size={56} />
        <div className="bg-white text-gray-800 rounded-2xl rounded-tl-md shadow-md border border-gray-100 px-5 py-3.5 transition-all duration-200 hover:shadow-lg">
          {/* Message content */}
          <div className="whitespace-pre-wrap wrap-break-word leading-relaxed text-gray-700">
            {renderContentWithCitations(message.content)}
            {message.isStreaming && (
              <span className="inline-block w-0.5 h-5 ml-1 bg-current animate-typing-cursor rounded-full" />
            )}
          </div>

          {/* Sources - only show sources actually cited in the response */}
          {message.sources && message.sources.length > 0 && (() => {
            const citedSources = message.sources.filter(source =>
              message.content.includes(source.filename)
            );
            if (citedSources.length === 0) return null;
            return (
              <div className="mt-4 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 mb-2">
                  <svg
                    className="w-3.5 h-3.5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  <span className="text-xs font-medium text-gray-400">
                    参照元
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {citedSources.map((source, index) => (
                    <SourceCitation key={index} source={source} />
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Loading indicator */}
          {message.isStreaming && !message.content && (
            <div className="flex items-center gap-3 py-1">
              <LoadingSpinner size="sm" />
              <span className="text-sm text-gray-500">回答を生成中...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
