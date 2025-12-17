"use client";

interface EvaluationSummaryProps {
  correct: number;
  total: number;
  datasetName: string;
}

export function EvaluationSummary({
  correct,
  total,
  datasetName,
}: EvaluationSummaryProps) {
  const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
  const isGood = percentage >= 75;

  // Create progress bar segments
  const filledSegments = Math.round((correct / total) * 10);

  return (
    <div
      className={`mx-6 mb-4 p-4 rounded-xl border ${
        isGood
          ? "bg-linear-to-r from-emerald-50 to-green-50 border-emerald-200"
          : "bg-linear-to-r from-amber-50 to-orange-50 border-amber-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900">
              テスト結果: {datasetName}
            </span>
            {isGood && <span>✨</span>}
          </div>
          <div className="mt-1 flex items-center gap-3">
            <span
              className={`text-2xl font-bold ${
                isGood ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {percentage}%
            </span>
            <span className="text-gray-500">
              ({correct}/{total} 正解)
            </span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex gap-1">
          {Array.from({ length: 10 }).map((_, i) => (
            <div
              key={i}
              className={`w-3 h-6 rounded-sm ${
                i < filledSegments
                  ? isGood
                    ? "bg-emerald-500"
                    : "bg-amber-500"
                  : "bg-gray-200"
              }`}
            />
          ))}
        </div>
      </div>

      <p className="mt-3 text-sm text-gray-600">
        {isGood
          ? "例外ケースを正確に処理できています"
          : "他のデータセットでも試してみてください"}
      </p>
    </div>
  );
}
