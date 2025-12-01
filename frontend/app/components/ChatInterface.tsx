"use client";

import { useRef, useEffect, useState } from "react";
import { useChat } from "@/hooks/useChat";
import { useServerStatus } from "@/hooks/useServerStatus";
import { useDocuments } from "@/hooks/useDocuments";
import { UI_TEXT } from "@/lib/constants";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { DocumentDrawer } from "./DocumentDrawer";
import { ServerStartingOverlay } from "./ServerStartingOverlay";
import { OnboardingTooltip } from "./OnboardingTooltip";

export function ChatInterface() {
  const { messages, isLoading, error, sendMessage, clearError } = useChat();
  const { isReady, isStarting } = useServerStatus();
  const documentsHook = useDocuments();
  const { sampleDocuments, uploadedDocuments } = documentsHook;
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const documentButtonRef = useRef<HTMLButtonElement>(null);

  const totalDocuments = sampleDocuments.length + uploadedDocuments.length;
  const allDocuments = [...sampleDocuments, ...uploadedDocuments];
  const hasSampleDocs = sampleDocuments.length > 0;

  // Get suggested prompts based on document type
  const suggestedPrompts = hasSampleDocs
    ? [
        "会社の休暇制度について教えて",
        "リモートワークのポリシーは?",
        "経費精算の方法は?",
      ]
    : [
        UI_TEXT.genericPrompt1,
        UI_TEXT.genericPrompt2,
        UI_TEXT.genericPrompt3,
      ];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <>
      {/* Server starting overlay */}
      <ServerStartingOverlay isVisible={isStarting} />

      <div className="flex flex-col h-screen bg-linear-to-br from-slate-50 via-white to-blue-50/30">
        {/* Header - Premium glass morphism style */}
        <header className="shrink-0 glass border-b border-white/20 shadow-sm sticky top-0 z-30">
          <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="animate-fade-in">
              <h1 className="text-2xl font-bold bg-linear-to-r from-gray-900 via-gray-800 to-gray-900 bg-clip-text text-transparent">
                {UI_TEXT.appTitle}
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {UI_TEXT.appSubtitle}
              </p>
            </div>
            <button
              ref={documentButtonRef}
              onClick={() => setIsDrawerOpen(true)}
              className={`group flex items-center gap-2.5 px-5 py-2.5 text-sm font-medium
                       text-gray-700 bg-white/80 rounded-xl border border-gray-200/60
                       hover:bg-white hover:border-gray-300 hover:shadow-lg
                       active:scale-[0.98] transition-all duration-200
                       ${showOnboarding ? "animate-pulse-glow" : ""}`}
            >
              <svg
                className="w-5 h-5 text-gray-500 group-hover:text-blue-600 transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span className="group-hover:text-gray-900 transition-colors">
                {UI_TEXT.openDocuments}
              </span>
              {/* Document count badge */}
              {totalDocuments > 0 && (
                <span className="ml-1 px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                  {totalDocuments}
                </span>
              )}
            </button>
          </div>
        </header>

        {/* Messages area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            {/* Error message - Premium alert */}
            {error && (
              <div
                className="mb-6 p-4 bg-linear-to-r from-red-50 to-rose-50 border border-red-200/60
                            rounded-2xl shadow-sm animate-fade-in-down"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                      <svg
                        className="w-5 h-5 text-red-600"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                        />
                      </svg>
                    </div>
                    <span className="text-red-800 font-medium">{error}</span>
                  </div>
                  <button
                    onClick={clearError}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-all"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            )}

            {/* Welcome message when empty - Premium hero section */}
            {messages.length === 0 && (
              <div className="text-center py-12 animate-fade-in-up">
                <div className="relative w-20 h-20 mx-auto mb-5">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-blue-400/20 rounded-full blur-xl animate-pulse" />
                  {/* Icon container */}
                  <div
                    className="relative w-full h-full bg-linear-to-br from-blue-500 to-indigo-600
                                rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/25
                                transform hover:scale-105 transition-transform duration-300"
                  >
                    <svg
                      className="w-10 h-10 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                      />
                    </svg>
                  </div>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                  {UI_TEXT.welcomeMessage}
                </h2>

                {/* Document preview section */}
                {totalDocuments > 0 ? (
                  <div className="mt-6 mb-8">
                    <p className="text-gray-500 mb-4">{UI_TEXT.welcomeWithDocs}</p>

                    {/* Document chips */}
                    <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
                      {allDocuments.slice(0, 5).map((doc, i) => (
                        <button
                          key={doc.id}
                          onClick={() => setIsDrawerOpen(true)}
                          className="group flex items-center gap-2 px-3 py-2 bg-white border border-gray-200
                                   rounded-xl hover:border-blue-300 hover:bg-blue-50/50 hover:shadow-md
                                   transition-all duration-200 animate-fade-in-up"
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          <div className="w-6 h-6 rounded-lg bg-linear-to-br from-blue-100 to-indigo-100
                                        flex items-center justify-center group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors">
                            <svg
                              className="w-3.5 h-3.5 text-blue-600"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                              />
                            </svg>
                          </div>
                          <span className="text-sm text-gray-700 group-hover:text-blue-600 truncate max-w-[120px]">
                            {doc.filename.replace(/\.txt$/, "")}
                          </span>
                        </button>
                      ))}
                      {totalDocuments > 5 && (
                        <button
                          onClick={() => setIsDrawerOpen(true)}
                          className="px-3 py-2 text-sm text-gray-500 hover:text-blue-600 transition-colors"
                        >
                          +{totalDocuments - 5} more
                        </button>
                      )}
                    </div>

                    {/* Manage documents link */}
                    <button
                      onClick={() => setIsDrawerOpen(true)}
                      className="mt-4 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <span>{UI_TEXT.manageDocuments}</span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <p className="text-gray-500 max-w-md mx-auto leading-relaxed mt-3 mb-8">
                    <span className="text-gray-400">
                      右上のボタンからドキュメントを追加してください。
                    </span>
                  </p>
                )}

                {/* Suggested prompts - conditional based on document type */}
                {totalDocuments > 0 && (
                  <div className="flex flex-wrap justify-center gap-3">
                    {suggestedPrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(prompt)}
                        disabled={!isReady}
                        className="px-4 py-2.5 text-sm text-gray-600 bg-white border border-gray-200
                                 rounded-xl hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50
                                 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed
                                 transition-all duration-200"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Message list */}
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <MessageBubble message={message} />
                </div>
              ))}
            </div>

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input area */}
        <ChatInput onSend={sendMessage} disabled={isLoading || !isReady} />

        {/* Document drawer */}
        <DocumentDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          documentsHook={documentsHook}
        />

        {/* Onboarding tooltip - only show when server is ready and not starting */}
        {!isStarting && showOnboarding && (
          <OnboardingTooltip
            documentCount={totalDocuments}
            onDismiss={() => setShowOnboarding(false)}
            targetRef={documentButtonRef}
          />
        )}
      </div>
    </>
  );
}
