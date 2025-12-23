"use client";

import type { ChunkingStrategy, DocumentSet, EvaluationScore } from "@/lib/types";
import {
  CATEGORY_DISPLAY_INFO,
  CATEGORY_ORDER,
  STRATEGY_INSIGHTS,
  getStrategyInsightKey,
} from "@/lib/constants";
import { MayaAvatar } from "./MayaAvatar";

// Dataset and strategy display names
const DATASET_NAMES: Record<DocumentSet, string> = {
  original: "元データ",
  optimized: "最適化済み",
};

const STRATEGY_NAMES: Record<ChunkingStrategy, string> = {
  standard: "標準チャンク",
  large: "大きめチャンク",
  parent_child: "親子チャンク",
  hypothetical_questions: "仮説質問生成",
};

export interface CategoryScore {
  correct: number;
  total: number;
}

interface EvaluationSummaryBubbleProps {
  score: EvaluationScore;
  categoryScores: Record<string, CategoryScore>;
  documentSet: DocumentSet;
  strategy: ChunkingStrategy;
  useReranking: boolean;
}

export function EvaluationSummaryBubble({
  score,
  categoryScores,
  documentSet,
  strategy,
  useReranking,
}: EvaluationSummaryBubbleProps) {
  const isGood = score.percentage >= 75;
  const isPerfect = score.percentage === 100;

  // Get strategy insight
  const insightKey = getStrategyInsightKey(documentSet, strategy, useReranking);
  const insight = STRATEGY_INSIGHTS[insightKey];

  // Create progress bar segments (10 segments)
  const filledSegments = Math.round((score.correct / score.total) * 10);

  return (
    <div className="flex justify-start">
      <div className="flex items-start gap-3 max-w-[90%]">
        <MayaAvatar state="idling" size={56} />
        <div className="bg-white text-gray-800 rounded-2xl rounded-tl-md shadow-md border border-gray-100 px-5 py-4 transition-all duration-200 hover:shadow-lg">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📊</span>
            <span className="font-semibold text-gray-900">精度テスト結果</span>
            {isPerfect && <span>🎉</span>}
          </div>

          {/* Configuration badges */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span
              className={`px-2.5 py-1 text-xs font-medium rounded-lg ${
                documentSet === "optimized"
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-gray-100 text-gray-700"
              }`}
            >
              {DATASET_NAMES[documentSet]}
            </span>
            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-100 text-blue-700">
              {STRATEGY_NAMES[strategy]}
            </span>
            <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-100 text-purple-700">
              {useReranking ? "リランキングあり" : "リランキングなし"}
            </span>
          </div>

          {/* Score display */}
          <div className="flex items-center gap-4 mb-4">
            <span
              className={`text-3xl font-bold ${
                isPerfect
                  ? "text-emerald-600"
                  : isGood
                    ? "text-emerald-600"
                    : "text-amber-600"
              }`}
            >
              {score.percentage}%
            </span>
            <span className="text-gray-500">
              ({score.correct}/{score.total} 正解)
            </span>
            {/* Progress bar */}
            <div className="flex gap-0.5">
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className={`w-2.5 h-5 rounded-sm ${
                    i < filledSegments
                      ? isPerfect
                        ? "bg-emerald-500"
                        : isGood
                          ? "bg-emerald-500"
                          : "bg-amber-500"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-600 mb-2">
              カテゴリ別成績:
            </div>
            <div className="space-y-1.5">
              {CATEGORY_ORDER.map((categoryKey) => {
                const catScore = categoryScores[categoryKey];
                if (!catScore || catScore.total === 0) return null;

                const categoryInfo = CATEGORY_DISPLAY_INFO[categoryKey];
                const catPercentage = Math.round(
                  (catScore.correct / catScore.total) * 100
                );
                const isPassing = catScore.correct === catScore.total;
                const isFailing = catScore.correct === 0;

                return (
                  <div key={categoryKey} className="flex items-center gap-2">
                    {/* Status icon */}
                    <span className="w-4 text-center">
                      {isPassing ? "✅" : isFailing ? "❌" : "⚠️"}
                    </span>

                    {/* Category label */}
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded border ${categoryInfo.bgColor} ${categoryInfo.color}`}
                    >
                      {categoryInfo.label}
                    </span>

                    {/* Score */}
                    <span className="text-sm text-gray-600 min-w-[3rem]">
                      {catScore.correct}/{catScore.total}
                    </span>

                    {/* Mini progress bar */}
                    <div className="flex gap-0.5">
                      {Array.from({ length: catScore.total }).map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-3 rounded-sm ${
                            i < catScore.correct
                              ? isPassing
                                ? "bg-emerald-400"
                                : "bg-amber-400"
                              : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>

                    {/* Warning for failing categories */}
                    {isFailing && (
                      <span className="text-xs text-red-500 ml-1">← 要改善</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Strategy insight */}
          {insight && (
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <span className="text-base">💡</span>
                <p className="text-sm text-blue-800 leading-relaxed">{insight}</p>
              </div>
            </div>
          )}

          {/* Generic message if no insight available */}
          {!insight && (
            <p className="text-sm text-gray-500">
              {isGood
                ? "例外ケースを正確に処理できています。"
                : "他の設定も試してみてください。"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
