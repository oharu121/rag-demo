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
  const { isCorrect, foundTerms, explanation } = scoring;

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
      {foundTerms.length > 0 && (
        <p className="mt-1 text-xs text-gray-500">
          Found: {foundTerms.join(", ")}
        </p>
      )}
    </div>
  );
}
