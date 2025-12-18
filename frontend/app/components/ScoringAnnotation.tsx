"use client";

export interface ScoringData {
  isCorrect: boolean;
  foundTerms: string[];
  missingTerms: string[];
  prohibitedFound: string[];
  explanation: string;
}

interface ScoringAnnotationProps {
  scoring: ScoringData;
}

export function ScoringAnnotation({ scoring }: ScoringAnnotationProps) {
  const { isCorrect, foundTerms, missingTerms, prohibitedFound, explanation } = scoring;

  // For failures, show up to 3 expected terms as hint
  const expectedHint = missingTerms.length > 0
    ? missingTerms.slice(0, 3).join("」「")
    : null;

  return (
    <div
      className={`mt-3 p-3 rounded-lg border ${
        isCorrect
          ? "bg-emerald-50 border-emerald-200"
          : "bg-red-50 border-red-200"
      }`}
    >
      <div className="flex items-center gap-2">
        {isCorrect ? (
          <>
            <span className="text-lg">✅</span>
            <span className="font-medium text-emerald-700">正解</span>
          </>
        ) : (
          <>
            <span className="text-lg">❌</span>
            <span className="font-medium text-red-700">不正解</span>
          </>
        )}
      </div>
      <p
        className={`mt-1 text-sm ${
          isCorrect ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {explanation}
      </p>
      {isCorrect && foundTerms.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          検出: {foundTerms.join(", ")}
        </p>
      )}
      {!isCorrect && expectedHint && (
        <p className="mt-1 text-xs text-gray-500">
          期待: 「{expectedHint}」など
        </p>
      )}
      {!isCorrect && prohibitedFound.length > 0 && (
        <p className="mt-1 text-xs text-red-500">
          誤検出: {prohibitedFound.join(", ")}
        </p>
      )}
    </div>
  );
}
