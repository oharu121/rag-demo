"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { useChat } from "@/hooks/useChat";
import { useServerStatus } from "@/hooks/useServerStatus";
import { useDocuments } from "@/hooks/useDocuments";
import { UI_TEXT } from "@/lib/constants";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { DocumentDrawer } from "./DocumentDrawer";
import { DocumentPreviewModal } from "./DocumentPreviewModal";
import { DocumentChipsBar } from "./DocumentChipsBar";
import { ServerStartingOverlay } from "./ServerStartingOverlay";
import { WelcomeCallout } from "./WelcomeCallout";
import { ChatCallout } from "./ChatCallout";
import { DocumentsCallout } from "./DocumentsCallout";
import { DatasetSelector } from "./DatasetSelector";
import { EvaluationSummaryBubble } from "./EvaluationSummaryBubble";
import { streamEvaluation } from "@/lib/api";
import type { Document, ChunkingStrategy, DocumentSet, ScoringData, EvaluationScore } from "@/lib/types";
import type { ChatInputRef } from "./ChatInput";

export function ChatInterface() {
  const {
    messages,
    isLoading,
    error,
    sendMessage,
    clearMessages,
    clearError,
    setIsLoading,
    startEvaluationQuestion,
    appendEvaluationToken,
    completeEvaluationQuestion,
  } = useChat();
  const { isReady, isStarting } = useServerStatus();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showChatCallout, setShowChatCallout] = useState(false);
  const [showDocuments, setShowDocuments] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
  const [documentSet, setDocumentSet] = useState<DocumentSet>("original");
  const [strategy, setStrategy] = useState<ChunkingStrategy>("standard");
  const [useReranking, setUseReranking] = useState<boolean>(false);
  // Pass documentSet to useDocuments so it fetches the correct document list
  const documentsHook = useDocuments(documentSet);
  const { sampleDocuments, uploadedDocuments } = documentsHook;
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationProgress, setEvaluationProgress] = useState({ current: 0, total: 0 });
  const [evaluationScore, setEvaluationScore] = useState<EvaluationScore | null>(null);
  // DatasetSelector collapse state
  const [isDatasetSelectorExpanded, setIsDatasetSelectorExpanded] = useState(true);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const documentButtonRef = useRef<HTMLButtonElement>(null);
  const datasetSelectorRef = useRef<HTMLDivElement>(null);
  const chatInputContainerRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<ChatInputRef>(null);

  const totalDocuments = sampleDocuments.length + uploadedDocuments.length;

  // Compute category scores from evaluation messages
  const categoryScores = useMemo(() => {
    const scores: Record<string, { correct: number; total: number }> = {};

    // Iterate through message pairs (user question + assistant answer)
    for (let i = 0; i < messages.length; i += 2) {
      const userMsg = messages[i];
      const assistantMsg = messages[i + 1];

      if (userMsg?.category && assistantMsg?.scoring) {
        const cat = userMsg.category;
        if (!scores[cat]) scores[cat] = { correct: 0, total: 0 };
        scores[cat].total++;
        if (assistantMsg.scoring.isCorrect) scores[cat].correct++;
      }
    }

    return scores;
  }, [messages]);

  // Wrap sendMessage to include current options
  const handleSendMessage = useCallback(
    (content: string) => {
      sendMessage(content, { documentSet, strategy, useReranking });
      // Auto-collapse after first message
      if (!hasUserInteracted) {
        setHasUserInteracted(true);
        setIsDatasetSelectorExpanded(false);
      }
    },
    [sendMessage, documentSet, strategy, useReranking, hasUserInteracted]
  );

  // Clear chat when dataset changes
  const handleDocumentSetChange = useCallback(
    (newDocumentSet: DocumentSet) => {
      if (newDocumentSet !== documentSet) {
        clearMessages();
        setDocumentSet(newDocumentSet);
        setEvaluationScore(null);
      }
    },
    [documentSet, clearMessages]
  );

  // Run evaluation test with streaming
  const handleRunEvaluation = useCallback(async () => {
    if (isEvaluating || isLoading) return;

    // Auto-collapse after first test
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      setIsDatasetSelectorExpanded(false);
    }

    setIsEvaluating(true);
    setEvaluationScore(null);
    clearMessages();
    setEvaluationProgress({ current: 0, total: 0 }); // Will update on first query_start event

    try {
      for await (const event of streamEvaluation(documentSet, strategy, useReranking)) {
        switch (event.type) {
          case "query_start":
            // Start new question - add user message and streaming assistant placeholder
            setEvaluationProgress({ current: event.data.index + 1, total: event.data.total });
            startEvaluationQuestion(event.data.question, event.data.category);
            break;

          case "token":
            // Append token to current streaming answer
            appendEvaluationToken(event.data.token);
            break;

          case "query_done":
            // Complete current answer with scoring
            const scoring: ScoringData = {
              isCorrect: event.data.scoring.is_correct,
              foundTerms: event.data.scoring.found_terms,
              missingTerms: event.data.scoring.missing_terms,
              prohibitedFound: event.data.scoring.prohibited_found,
              explanation: event.data.scoring.explanation,
            };
            completeEvaluationQuestion(scoring);
            break;

          case "complete":
            // All queries done - set final score
            setEvaluationScore(event.data.score);
            break;

          case "error":
            console.error("Evaluation error:", event.data.message);
            break;
        }
      }
    } catch (err) {
      console.error("Evaluation failed:", err);
    } finally {
      setIsEvaluating(false);
      setEvaluationProgress({ current: 0, total: 0 });
    }
  }, [isEvaluating, isLoading, documentSet, strategy, useReranking, clearMessages, startEvaluationQuestion, appendEvaluationToken, completeEvaluationQuestion, hasUserInteracted]);

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

  // Preload avatar GIFs
  useEffect(() => {
    const preloadImages = [
      "/avatars/maya-idling.gif",
      "/avatars/maya-speaking.gif",
      "/avatars/maya-thinking.gif",
    ];
    preloadImages.forEach((src) => {
      const img = new Image();
      img.src = src;
    });
  }, []);

  return (
    <>
      {/* Server starting overlay */}
      <ServerStartingOverlay isVisible={isStarting} />

      <div className={`flex flex-col h-screen transition-all duration-500 ${
          documentSet === "optimized"
            ? "bg-linear-to-br from-emerald-50/50 via-white to-green-50/30"
            : "bg-linear-to-br from-slate-50 via-white to-blue-50/30"
        }`}>
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
            <div className="flex items-center gap-3">
              {/* Document button */}
              <button
                ref={documentButtonRef}
                onClick={() => setIsDrawerOpen(true)}
                className={`group flex items-center gap-2.5 px-5 py-2.5 text-sm font-medium
                         text-gray-700 bg-white/80 rounded-xl border border-gray-200/60
                         hover:bg-white hover:border-gray-300 hover:shadow-lg
                         active:scale-[0.98] transition-all duration-200
                         ${showWelcome ? "animate-pulse-glow" : ""}`}
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
          </div>
        </header>

        {/* Persistent document chips bar */}
        <DocumentChipsBar
          documents={allDocuments}
          onPreview={setPreviewDoc}
          onShowMore={() => setIsDrawerOpen(true)}
        />

        {/* Dataset selector bar */}
        <div ref={datasetSelectorRef}>
          <DatasetSelector
            documentSet={documentSet}
            strategy={strategy}
            useReranking={useReranking}
            onDocumentSetChange={handleDocumentSetChange}
            onStrategyChange={setStrategy}
            onUseRerankingChange={setUseReranking}
            disabled={isLoading}
            onRunEvaluation={handleRunEvaluation}
            isEvaluating={isEvaluating}
            evaluationProgress={evaluationProgress}
            isReady={isReady}
            isExpanded={isDatasetSelectorExpanded}
            onToggleExpand={() => setIsDatasetSelectorExpanded(!isDatasetSelectorExpanded)}
          />
        </div>

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

                {/* Document info section */}
                {totalDocuments > 0 ? (
                  <p className="text-gray-500 mt-3 mb-8">
                    {UI_TEXT.welcomeWithDocs}
                    <br />
                    <span className="text-sm text-gray-400">
                      上のドキュメントをクリックしてプレビュー
                    </span>
                  </p>
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
                        onClick={() => handleSendMessage(prompt)}
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

              {/* Evaluation summary bubble - appears after all messages */}
              {evaluationScore && !isEvaluating && (
                <div className="animate-fade-in-up mt-6">
                  <EvaluationSummaryBubble
                    score={evaluationScore}
                    categoryScores={categoryScores}
                    documentSet={documentSet}
                    strategy={strategy}
                    useReranking={useReranking}
                  />
                </div>
              )}
            </div>

            <div ref={messagesEndRef} />
          </div>
        </main>

        {/* Input area */}
        <div ref={chatInputContainerRef}>
          <ChatInput ref={chatInputRef} onSend={handleSendMessage} disabled={isLoading || isEvaluating || !isReady} />
        </div>

        {/* Document drawer */}
        <DocumentDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          documentsHook={documentsHook}
        />

        {/* Callout 1: Settings + Test - show when server is ready and not starting */}
        {!isStarting && showWelcome && (
          <WelcomeCallout
            onDismiss={() => {
              setShowWelcome(false);
              // Show chat callout after welcome
              setTimeout(() => setShowChatCallout(true), 300);
            }}
            targetRef={datasetSelectorRef}
          />
        )}

        {/* Callout 2: Chat + Chunks - show after welcome is dismissed */}
        {showChatCallout && (
          <ChatCallout
            onDismiss={() => {
              setShowChatCallout(false);
              // Show documents callout after chat
              setTimeout(() => setShowDocuments(true), 300);
            }}
            targetRef={chatInputContainerRef}
          />
        )}

        {/* Callout 3: Documents - show after chat callout is dismissed */}
        {showDocuments && (
          <DocumentsCallout
            onDismiss={() => {
              setShowDocuments(false);
              // Focus chat input after tutorial completes
              setTimeout(() => chatInputRef.current?.focus(), 100);
            }}
            targetRef={documentButtonRef}
          />
        )}

        {/* Document preview modal */}
        <DocumentPreviewModal
          doc={previewDoc}
          onClose={() => setPreviewDoc(null)}
        />
      </div>
    </>
  );
}
