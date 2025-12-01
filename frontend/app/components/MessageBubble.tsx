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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] ${
          isUser
            ? "bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl rounded-br-md shadow-md shadow-blue-500/20"
            : "bg-white text-gray-800 rounded-2xl rounded-bl-md shadow-md border border-gray-100"
        } px-5 py-3.5 transition-all duration-200 hover:shadow-lg`}
      >
        {/* Assistant avatar indicator */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-100">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-medium text-gray-500">AI アシスタント</span>
          </div>
        )}

        {/* Message content */}
        <div className={`whitespace-pre-wrap break-words leading-relaxed ${isUser ? "text-white/95" : "text-gray-700"}`}>
          {message.content}
          {message.isStreaming && (
            <span className="inline-block w-0.5 h-5 ml-1 bg-current animate-typing-cursor rounded-full" />
          )}
        </div>

        {/* Sources (for assistant messages) */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-1.5 mb-2">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              <span className="text-xs font-medium text-gray-400">参照ソース</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {message.sources.map((source, index) => (
                <SourceCitation key={index} source={source} />
              ))}
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {message.isStreaming && !message.content && (
          <div className="flex items-center gap-3 py-1">
            <LoadingSpinner size="sm" />
            <span className="text-sm text-gray-500">回答を生成中...</span>
          </div>
        )}
      </div>
    </div>
  );
}
