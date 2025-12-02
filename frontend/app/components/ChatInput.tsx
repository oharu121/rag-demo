"use client";

import { useState, useRef, useEffect, KeyboardEvent, forwardRef, useImperativeHandle } from "react";
import { UI_TEXT } from "@/lib/constants";

interface ChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
}

export interface ChatInputRef {
  focus: () => void;
}

export const ChatInput = forwardRef<ChatInputRef, ChatInputProps>(function ChatInput({ onSend, disabled = false }, ref) {
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Expose focus method to parent
  useImperativeHandle(ref, () => ({
    focus: () => textareaRef.current?.focus(),
  }));

  // Auto-focus on mount
  useEffect(() => {
    if (!disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [disabled]);

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

  const canSend = input.trim() && !disabled;

  return (
    <div className="glass border-t border-white/20 p-4 shadow-lg shadow-gray-200/50">
      <div className="max-w-4xl mx-auto">
        <div
          className={`relative flex items-end gap-3 p-2 bg-white rounded-2xl border-2 transition-all duration-200 ${
            isFocused
              ? "border-blue-400 shadow-lg shadow-blue-100/50"
              : "border-gray-200 hover:border-gray-300"
          }`}
        >
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={UI_TEXT.inputPlaceholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none bg-transparent px-3 py-2.5 text-base
                       disabled:text-gray-400
                       placeholder:text-gray-400"
              style={{ minHeight: "44px", maxHeight: "150px" }}
            />
          </div>
          <button
            onClick={handleSubmit}
            disabled={!canSend}
            className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center
                     transition-all duration-200 ${
                       canSend
                         ? "bg-linear-to-r from-blue-500 to-blue-600 text-white shadow-md shadow-blue-500/30 hover:shadow-lg hover:shadow-blue-500/40 hover:scale-105 active:scale-95"
                         : "bg-gray-100 text-gray-400"
                     }`}
            aria-label="送信"
          >
            <svg
              className={`w-5 h-5 transition-transform duration-200 ${
                canSend ? "translate-x-0.5" : ""
              }`}
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
        <p className="mt-2.5 text-xs text-gray-400 text-center flex items-center justify-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-[10px]">
            Enter
          </kbd>
          <span>で送信</span>
          <span className="text-gray-300">•</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono text-[10px]">
            Shift + Enter
          </kbd>
          <span>で改行</span>
        </p>
      </div>
    </div>
  );
});
