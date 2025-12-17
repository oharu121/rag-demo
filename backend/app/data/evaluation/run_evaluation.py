"""
RAG Evaluation Script

This script evaluates the RAG system's accuracy on test queries,
specifically comparing performance on general rules vs exception cases.

Usage:
    python run_evaluation.py [--baseline] [--improved]
"""

import json
import sys
import os
from pathlib import Path
from datetime import datetime

# Add backend to path
sys.path.insert(0, str(Path(__file__).parent.parent / "backend"))

from typing import Optional


def load_test_queries(path: str = "test_queries.json") -> dict:
    """Load test queries from JSON file."""
    with open(Path(__file__).parent / path, "r", encoding="utf-8") as f:
        return json.load(f)


def check_answer_quality(
    answer: str,
    expected_contains: list[str],
    must_not_contain: Optional[list[str]] = None
) -> tuple[bool, str]:
    """
    Check if answer contains expected content and doesn't contain prohibited content.

    Returns:
        (is_correct, reason)
    """
    answer_lower = answer.lower()

    # Check for required content
    found_required = []
    missing_required = []
    for term in expected_contains:
        if term.lower() in answer_lower or term in answer:
            found_required.append(term)
        else:
            missing_required.append(term)

    # Check for prohibited content
    found_prohibited = []
    if must_not_contain:
        for term in must_not_contain:
            if term.lower() in answer_lower or term in answer:
                found_prohibited.append(term)

    # Determine correctness
    # Must have at least one required term and no prohibited terms
    has_required = len(found_required) > 0
    has_prohibited = len(found_prohibited) > 0

    is_correct = has_required and not has_prohibited

    # Build reason
    reasons = []
    if found_required:
        reasons.append(f"Found: {found_required}")
    if missing_required:
        reasons.append(f"Missing: {missing_required}")
    if found_prohibited:
        reasons.append(f"Prohibited found: {found_prohibited}")

    return is_correct, "; ".join(reasons)


def run_evaluation(
    rag_service,
    queries: list[dict],
    save_results: bool = True,
    results_prefix: str = "results"
) -> dict:
    """
    Run evaluation on all queries and return results.
    """
    results = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "total_queries": len(queries),
        },
        "summary": {
            "total": 0,
            "correct": 0,
            "incorrect": 0,
            "by_category": {
                "general": {"total": 0, "correct": 0},
                "exception": {"total": 0, "correct": 0}
            }
        },
        "details": []
    }

    for query in queries:
        print(f"\nProcessing: {query['id']} - {query['question'][:50]}...")

        try:
            # Get answer from RAG
            answer, sources = rag_service.query(query["question"])

            # Check answer quality
            is_correct, reason = check_answer_quality(
                answer,
                query["expected_answer_contains"],
                query.get("expected_answer_must_not_contain")
            )

            # Update summary
            results["summary"]["total"] += 1
            category = query["category"]
            results["summary"]["by_category"][category]["total"] += 1

            if is_correct:
                results["summary"]["correct"] += 1
                results["summary"]["by_category"][category]["correct"] += 1
            else:
                results["summary"]["incorrect"] += 1

            # Store details
            results["details"].append({
                "id": query["id"],
                "category": category,
                "question": query["question"],
                "answer": answer[:500] + "..." if len(answer) > 500 else answer,
                "is_correct": is_correct,
                "reason": reason,
                "sources": [s.metadata.get("source", "unknown") for s in sources] if sources else []
            })

            status = "✓" if is_correct else "✗"
            print(f"  {status} {reason}")

        except Exception as e:
            print(f"  ERROR: {e}")
            results["details"].append({
                "id": query["id"],
                "category": query["category"],
                "question": query["question"],
                "answer": None,
                "is_correct": False,
                "reason": f"Error: {str(e)}",
                "sources": []
            })
            results["summary"]["total"] += 1
            results["summary"]["incorrect"] += 1
            results["summary"]["by_category"][query["category"]]["total"] += 1

    # Calculate percentages
    total = results["summary"]["total"]
    if total > 0:
        results["summary"]["accuracy"] = round(
            results["summary"]["correct"] / total * 100, 1
        )

        for cat in ["general", "exception"]:
            cat_total = results["summary"]["by_category"][cat]["total"]
            if cat_total > 0:
                cat_correct = results["summary"]["by_category"][cat]["correct"]
                results["summary"]["by_category"][cat]["accuracy"] = round(
                    cat_correct / cat_total * 100, 1
                )

    # Save results
    if save_results:
        results_dir = Path(__file__).parent / "results"
        results_dir.mkdir(exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = results_dir / f"{results_prefix}_{timestamp}.json"

        with open(results_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        print(f"\nResults saved to: {results_file}")

    return results


def print_summary(results: dict):
    """Print evaluation summary."""
    summary = results["summary"]

    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)
    print(f"\nOverall Accuracy: {summary.get('accuracy', 0)}%")
    print(f"  Correct: {summary['correct']}/{summary['total']}")
    print()

    print("By Category:")
    for cat, stats in summary["by_category"].items():
        acc = stats.get("accuracy", 0)
        print(f"  {cat.upper():12} : {acc}% ({stats['correct']}/{stats['total']})")

    print("\n" + "=" * 60)

    # Show incorrect answers
    incorrect = [d for d in results["details"] if not d["is_correct"]]
    if incorrect:
        print("\nINCORRECT ANSWERS:")
        print("-" * 40)
        for item in incorrect:
            print(f"\n[{item['id']}] {item['question']}")
            print(f"  Category: {item['category']}")
            print(f"  Reason: {item['reason']}")
            if item['answer']:
                print(f"  Answer preview: {item['answer'][:200]}...")


class MockRAGService:
    """Mock RAG service for testing the evaluation script."""

    def query(self, question: str) -> tuple[str, list]:
        # Return dummy response for testing
        return f"This is a mock answer for: {question}", []


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Run RAG evaluation")
    parser.add_argument("--mock", action="store_true", help="Use mock RAG service")
    parser.add_argument("--prefix", default="results", help="Results file prefix")
    args = parser.parse_args()

    # Load queries
    data = load_test_queries()
    queries = data["queries"]

    print(f"Loaded {len(queries)} test queries")
    print(f"  General: {len([q for q in queries if q['category'] == 'general'])}")
    print(f"  Exception: {len([q for q in queries if q['category'] == 'exception'])}")

    if args.mock:
        print("\nUsing MOCK RAG service (for testing evaluation script)")
        rag_service = MockRAGService()
    else:
        # Import real RAG service
        try:
            from app.services.rag_service import RAGService
            from app.services.document_service import DocumentService
            from app.services.vectorstore_service import VectorStoreService
            from app.services.embedding_service import EmbeddingService

            print("\nInitializing RAG service...")
            embedding_service = EmbeddingService()
            vectorstore_service = VectorStoreService(embedding_service)
            document_service = DocumentService(vectorstore_service)
            rag_service = RAGService(vectorstore_service)

            print("RAG service initialized successfully")
        except ImportError as e:
            print(f"Error importing RAG service: {e}")
            print("Use --mock flag to test the evaluation script")
            return

    # Run evaluation
    results = run_evaluation(rag_service, queries, results_prefix=args.prefix)

    # Print summary
    print_summary(results)


if __name__ == "__main__":
    main()
