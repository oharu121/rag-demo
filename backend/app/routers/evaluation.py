"""
評価ルーター - RAG精度テスト用API
"""

import asyncio
import json
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.config import DocumentSet, ChunkingStrategy, get_settings
from app.services.rag_service import get_rag_service


router = APIRouter(prefix="/evaluate", tags=["evaluation"])

# Set up logging for evaluation
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)


# Load light test queries
def load_test_queries() -> list[dict]:
    """Load test queries from JSON file."""
    settings = get_settings()
    queries_path = settings.evaluation_queries_path

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
    strategy: str = "standard",
    use_reranking: bool = False,
) -> EvaluationResponse:
    """
    Run quick evaluation with 4 test queries on the specified dataset.

    Args:
        document_set: "original" or "optimized"
        strategy: "standard", "large", or "parent_child"
        use_reranking: Whether to apply cross-encoder reranking

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
            logger.info(f"[Evaluation] Processing: {query['id']} - {query['question'][:30]}...")
            print(f"[Evaluation] Processing: {query['id']} - {query['question'][:30]}...", flush=True)

            try:
                # Query RAG
                result = rag_service.query(
                    question=query["question"],
                    document_set=document_set,
                    strategy=strategy,
                    use_reranking=use_reranking,
                )
                answer = result.get("answer", "")

                # Log full answer for debugging
                logger.info(f"[Evaluation] Q: {query['question']}")
                logger.info(f"[Evaluation] A: {answer[:300]}...")
                print(f"[Evaluation] Answer preview: {answer[:200]}...", flush=True)

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
                logger.info(f"[Evaluation] {status} {scoring['explanation']} | found={scoring['found_terms']} | prohibited={scoring['prohibited_found']}")
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


@router.get("/stream")
async def stream_evaluation(
    document_set: str = "original",
    strategy: str = "standard",
    use_reranking: bool = False,
):
    """
    Stream evaluation results with token-by-token answer streaming.

    SSE Event types:
    - query_start: {id, category, question, index, total}
    - token: {token}
    - query_done: {id, answer, scoring: {is_correct, found_terms, missing_terms, prohibited_found, explanation}}
    - complete: {score: {correct, total, percentage}}
    - error: {message}
    """

    async def generate():
        try:
            print(f"[Eval] Starting evaluation: document_set={document_set}, strategy={strategy}, use_reranking={use_reranking}", flush=True)

            # Validate inputs
            try:
                doc_set_enum = DocumentSet(document_set)
            except ValueError:
                yield f"event: error\ndata: {json.dumps({'message': f'Invalid document_set: {document_set}'})}\n\n"
                return

            try:
                strategy_enum = ChunkingStrategy(strategy)
            except ValueError:
                yield f"event: error\ndata: {json.dumps({'message': f'Invalid strategy: {strategy}'})}\n\n"
                return

            # Load test queries
            test_queries = load_test_queries()
            total = len(test_queries)
            print(f"[Eval] Loaded {total} test queries", flush=True)

            # Get RAG service
            rag_service = get_rag_service()

            correct_count = 0

            for index, query in enumerate(test_queries):
                query_id = query["id"]
                question = query["question"]

                # Log query start
                print(f"[Eval {index+1}/{total}] Q: {question}", flush=True)

                # Send query_start event
                yield f"event: query_start\ndata: {json.dumps({'id': query_id, 'category': query['category'], 'question': question, 'index': index, 'total': total})}\n\n"

                try:
                    # Stream the answer token by token
                    full_answer = ""

                    async for event in rag_service.stream_query(
                        question=question,
                        document_set=doc_set_enum,
                        strategy=strategy_enum,
                        use_reranking=use_reranking,
                    ):
                        if event["type"] == "token":
                            token = event["data"]["token"]
                            full_answer += token
                            yield f"event: token\ndata: {json.dumps({'token': token})}\n\n"
                        elif event["type"] == "error":
                            yield f"event: error\ndata: {json.dumps(event['data'])}\n\n"
                            return
                        # Skip sources/chunks/done events - we only need tokens

                    # Log answer for debugging (print goes to HF Spaces logs)
                    print(f"[Eval {index+1}/{total}] A: {full_answer[:200]}...", flush=True)

                    # Check answer quality
                    scoring = check_answer_quality(
                        full_answer,
                        query["expected_answer_contains"],
                        query.get("expected_answer_must_not_contain"),
                    )

                    if scoring["is_correct"]:
                        correct_count += 1

                    status = "✓" if scoring["is_correct"] else "✗"
                    print(f"[Eval {index+1}/{total}] {status} found={scoring['found_terms']} | missing={scoring['missing_terms']} | prohibited={scoring['prohibited_found']}", flush=True)

                    # Send query_done event with scoring
                    query_done_data = {
                        "id": query_id,
                        "answer": full_answer[:500] + "..." if len(full_answer) > 500 else full_answer,
                        "scoring": {
                            "is_correct": scoring["is_correct"],
                            "found_terms": scoring["found_terms"],
                            "missing_terms": scoring["missing_terms"],
                            "prohibited_found": scoring["prohibited_found"],
                            "explanation": scoring["explanation"],
                        }
                    }
                    yield f"event: query_done\ndata: {json.dumps(query_done_data)}\n\n"

                except Exception as e:
                    print(f"[Eval {index+1}/{total}] ERROR: {e}", flush=True)
                    # Send error for this query but continue with others
                    query_done_data = {
                        "id": query_id,
                        "answer": f"Error: {str(e)}",
                        "scoring": {
                            "is_correct": False,
                            "found_terms": [],
                            "missing_terms": query["expected_answer_contains"],
                            "prohibited_found": [],
                            "explanation": f"エラーが発生しました: {str(e)}",
                        }
                    }
                    yield f"event: query_done\ndata: {json.dumps(query_done_data)}\n\n"

            # Send complete event with final score
            percentage = round(correct_count / total * 100, 1) if total > 0 else 0
            complete_data = {
                "score": {
                    "correct": correct_count,
                    "total": total,
                    "percentage": percentage,
                }
            }
            yield f"event: complete\ndata: {json.dumps(complete_data)}\n\n"

            # Final summary
            print(f"[Eval] Complete: {correct_count}/{total} ({percentage}%)", flush=True)

        except FileNotFoundError as e:
            print(f"[Eval] File not found: {e}", flush=True)
            yield f"event: error\ndata: {json.dumps({'message': str(e)})}\n\n"
        except Exception as e:
            print(f"[Eval] Unexpected error: {e}", flush=True)
            yield f"event: error\ndata: {json.dumps({'message': f'Evaluation failed: {str(e)}'})}\n\n"

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
