"use client";

import type { Message } from "@/lib/types";
import { SourceCitation } from "./SourceCitation";
import { LoadingSpinner } from "./LoadingSpinner";

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-[80%] ${
          isUser
            ? "bg-blue-600 text-white rounded-2xl rounded-br-md"
            : "bg-gray-100 text-gray-900 rounded-2xl rounded-bl-md"
        } px-4 py-3`}
      >
        {/* Message content */}
        <div className="whitespace-pre-wrap break-words">
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
          )}
        </div>

        {/* Sources (for assistant messages) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, index) => (
                <SourceCitation key={index} source={source} />
              ))}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {message.isStreaming && !message.content && (
          <div className="flex items-center gap-2 text-gray-500">
            <LoadingSpinner size="sm" />
            <span className="text-sm">回答を生成中...</span>
          </div>
        )}
      </div>
    </div>
  );
}
