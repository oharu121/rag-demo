"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { UI_TEXT } from "../../lib/constants";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, disabled = false }: ChatInputProps) {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
    }
  }, [input]);

  const handleSubmit = () => {
    if (input.trim() && !disabled) {
      onSend(input.trim());
      setInput("");
      // Reset height
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-end gap-3">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={UI_TEXT.inputPlaceholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none rounded-xl border border-gray-300
                       px-4 py-3 pr-12 text-base
                       focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
                       disabled:bg-gray-100 disabled:cursor-not-allowed
                       placeholder:text-gray-400"
              style={{ minHeight: "48px", maxHeight: "150px" }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={disabled || !input.trim()}
            className="shrink-0 h-12 px-6 rounded-xl
                     bg-blue-600 text-white font-medium
                     hover:bg-blue-700 active:bg-blue-800
                     disabled:bg-gray-300 disabled:cursor-not-allowed
                     transition-colors"
          >
            {UI_TEXT.sendButton}
          </button>
        </div>
        <p className="mt-2 text-xs text-gray-500 text-center">
          Enterで送信、Shift + Enterで改行
        </p>
      </div>
    </div>
  );
}
