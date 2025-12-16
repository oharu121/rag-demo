"""
評価ルーター - RAG精度テスト用API
"""

import json
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.config import DocumentSet, ChunkingStrategy
from app.services.rag_service import get_rag_service


router = APIRouter(prefix="/evaluate", tags=["evaluation"])


# Load light test queries
def load_test_queries() -> list[dict]:
    """Load test queries from JSON file."""
    queries_path = Path(__file__).parent.parent.parent.parent / "evaluation" / "test_queries_light.json"
    if not queries_path.exists():
        raise FileNotFoundError(f"Test queries file not found: {queries_path}")

    with open(queries_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return data["queries"]


def check_answer_quality(
    answer: str,
    expected_contains: list[str],
    must_not_contain: Optional[list[str]] = None
) -> dict:
    """
    Check if answer contains expected content and doesn't contain prohibited content.

    Returns:
        dict with is_correct, found_terms, missing_terms, prohibited_found, explanation
    """
    answer_lower = answer.lower()

    # Check for required content
    found_terms = []
    missing_terms = []
    for term in expected_contains:
        if term.lower() in answer_lower or term in answer:
            found_terms.append(term)
        else:
            missing_terms.append(term)

    # Check for prohibited content
    prohibited_found = []
    if must_not_contain:
        for term in must_not_contain:
            if term.lower() in answer_lower or term in answer:
                prohibited_found.append(term)

    # Determine correctness
    has_required = len(found_terms) > 0
    has_prohibited = len(prohibited_found) > 0
    is_correct = has_required and not has_prohibited

    # Build explanation
    if is_correct:
        explanation = "正しい情報が含まれています"
    elif has_prohibited:
        explanation = "誤った情報が含まれています（正社員のルールを回答）"
    elif not has_required:
        explanation = "必要な情報が見つかりません"
    else:
        explanation = "回答の精度に問題があります"

    return {
        "is_correct": is_correct,
        "found_terms": found_terms,
        "missing_terms": missing_terms,
        "prohibited_found": prohibited_found,
        "explanation": explanation,
    }


# Response schemas
class QueryResult(BaseModel):
    """Single query evaluation result"""
    id: str
    category: str
    question: str
    answer: str
    is_correct: bool
    found_terms: list[str]
    missing_terms: list[str]
    prohibited_found: list[str]
    explanation: str


class ScoreResult(BaseModel):
    """Score summary"""
    correct: int
    total: int
    percentage: float


class DatasetResult(BaseModel):
    """Results for a single dataset"""
    queries: list[QueryResult]
    score: ScoreResult


class EvaluationResponse(BaseModel):
    """Full evaluation response"""
    status: str
    document_set: str
    results: DatasetResult


@router.post("/quick", response_model=EvaluationResponse)
async def run_quick_evaluation(
    document_set: str = "original",
    strategy: str = "standard"
) -> EvaluationResponse:
    """
    Run quick evaluation with 4 test queries on the specified dataset.

    Args:
        document_set: "original" or "optimized"
        strategy: "standard", "large", or "parent_child"

    Returns:
        Evaluation results with scoring for each query
    """
    try:
        # Validate inputs
        try:
            doc_set_enum = DocumentSet(document_set)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid document_set: {document_set}")

        try:
            strategy_enum = ChunkingStrategy(strategy)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Invalid strategy: {strategy}")

        # Load test queries
        test_queries = load_test_queries()

        # Get RAG service
        rag_service = get_rag_service()

        # Run evaluation
        query_results = []
        correct_count = 0

        for query in test_queries:
            print(f"[Evaluation] Processing: {query['id']} - {query['question'][:30]}...", flush=True)

            try:
                # Query RAG
                result = rag_service.query(
                    question=query["question"],
                    document_set=document_set,
                    strategy=strategy,
                )
                answer = result.get("answer", "")

                # Check answer quality
                scoring = check_answer_quality(
                    answer,
                    query["expected_answer_contains"],
                    query.get("expected_answer_must_not_contain"),
                )

                if scoring["is_correct"]:
                    correct_count += 1

                query_results.append(QueryResult(
                    id=query["id"],
                    category=query["category"],
                    question=query["question"],
                    answer=answer[:500] + "..." if len(answer) > 500 else answer,
                    is_correct=scoring["is_correct"],
                    found_terms=scoring["found_terms"],
                    missing_terms=scoring["missing_terms"],
                    prohibited_found=scoring["prohibited_found"],
                    explanation=scoring["explanation"],
                ))

                status = "✓" if scoring["is_correct"] else "✗"
                print(f"[Evaluation]   {status} {scoring['explanation']}", flush=True)

            except Exception as e:
                print(f"[Evaluation]   ERROR: {e}", flush=True)
                query_results.append(QueryResult(
                    id=query["id"],
                    category=query["category"],
                    question=query["question"],
                    answer=f"Error: {str(e)}",
                    is_correct=False,
                    found_terms=[],
                    missing_terms=query["expected_answer_contains"],
                    prohibited_found=[],
                    explanation=f"エラーが発生しました: {str(e)}",
                ))

        # Calculate score
        total = len(test_queries)
        percentage = round(correct_count / total * 100, 1) if total > 0 else 0

        return EvaluationResponse(
            status="completed",
            document_set=document_set,
            results=DatasetResult(
                queries=query_results,
                score=ScoreResult(
                    correct=correct_count,
                    total=total,
                    percentage=percentage,
                ),
            ),
        )

    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
    except Exception as e:
        print(f"[Evaluation] Unexpected error: {e}", flush=True)
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")


@router.get("/queries")
async def get_test_queries():
    """Get the list of test queries (for frontend to display questions)."""
    try:
        queries = load_test_queries()
        return {
            "queries": [
                {
                    "id": q["id"],
                    "category": q["category"],
                    "question": q["question"],
                }
                for q in queries
            ]
        }
    except FileNotFoundError as e:
        raise HTTPException(status_code=500, detail=str(e))
