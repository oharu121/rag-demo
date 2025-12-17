"""
Strategy Comparison Evaluation Script

This script evaluates the RAG system across all combinations of:
- Document sets: original, optimized
- Chunking strategies: standard, large, parent_child

Usage:
    cd backend
    python -m evaluation.compare_strategies

Results are saved to evaluation/results/comparison_<timestamp>.json
"""

import json
import sys
import io
from pathlib import Path
from datetime import datetime
from typing import Optional

# Fix Windows console encoding for Japanese output
if sys.platform == "win32":
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

import os

# Add backend to path and change to backend directory for .env loading
backend_dir = Path(__file__).parent.parent / "backend"
sys.path.insert(0, str(backend_dir))
os.chdir(backend_dir)


def load_test_queries(path: str = "test_queries.json") -> dict:
    """Load test queries from JSON file."""
    with open(Path(__file__).parent / path, "r", encoding="utf-8") as f:
        return json.load(f)


def check_answer_quality(
    answer: str,
    expected_contains: list[str],
    must_not_contain: Optional[list[str]] = None
) -> tuple[bool, str, dict]:
    """
    Check if answer contains expected content and doesn't contain prohibited content.

    Returns:
        (is_correct, reason, details)
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

    details = {
        "found_required": found_required,
        "missing_required": missing_required,
        "found_prohibited": found_prohibited,
    }

    return is_correct, "; ".join(reasons), details


def run_single_evaluation(
    rag_service,
    queries: list[dict],
    document_set: str,
    strategy: str,
) -> dict:
    """
    Run evaluation for a single document_set + strategy combination.
    """
    results = {
        "document_set": document_set,
        "strategy": strategy,
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
        try:
            # Get answer from RAG with specific settings
            response = rag_service.query(
                query["question"],
                document_set=document_set,
                strategy=strategy
            )

            answer = response["answer"]
            chunks = response.get("chunks", [])

            # Check answer quality
            is_correct, reason, check_details = check_answer_quality(
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
                "chunks_retrieved": len(chunks),
                "top_chunk_score": chunks[0]["score"] if chunks else None,
                "sources": [c["filename"] for c in chunks[:3]] if chunks else []
            })

        except Exception as e:
            print(f"    ERROR on {query['id']}: {e}")
            results["details"].append({
                "id": query["id"],
                "category": query["category"],
                "question": query["question"],
                "answer": None,
                "is_correct": False,
                "reason": f"Error: {str(e)}",
                "chunks_retrieved": 0,
                "top_chunk_score": None,
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

    return results


def run_comparison(rag_service, queries: list[dict]) -> dict:
    """
    Run evaluation across all combinations of document sets and strategies.
    """
    document_sets = ["original", "optimized"]
    strategies = ["standard", "large", "parent_child"]

    comparison_results = {
        "metadata": {
            "timestamp": datetime.now().isoformat(),
            "total_queries": len(queries),
            "document_sets": document_sets,
            "strategies": strategies,
        },
        "results": [],
        "comparison_matrix": {}
    }

    for doc_set in document_sets:
        comparison_results["comparison_matrix"][doc_set] = {}

        for strategy in strategies:
            print(f"\n{'='*60}")
            print(f"Testing: {doc_set} + {strategy}")
            print(f"{'='*60}")

            result = run_single_evaluation(
                rag_service, queries, doc_set, strategy
            )
            comparison_results["results"].append(result)

            # Add to matrix
            comparison_results["comparison_matrix"][doc_set][strategy] = {
                "overall": result["summary"].get("accuracy", 0),
                "general": result["summary"]["by_category"]["general"].get("accuracy", 0),
                "exception": result["summary"]["by_category"]["exception"].get("accuracy", 0),
            }

            print(f"  Overall: {result['summary'].get('accuracy', 0)}%")
            print(f"  General: {result['summary']['by_category']['general'].get('accuracy', 0)}%")
            print(f"  Exception: {result['summary']['by_category']['exception'].get('accuracy', 0)}%")

    return comparison_results


def print_comparison_table(results: dict):
    """Print a formatted comparison table."""
    matrix = results["comparison_matrix"]

    print("\n" + "=" * 80)
    print("COMPARISON RESULTS")
    print("=" * 80)

    # Header
    print(f"\n{'Dataset':<12} {'Strategy':<15} {'Overall':>10} {'General':>10} {'Exception':>10}")
    print("-" * 67)

    # Data rows
    for doc_set in ["original", "optimized"]:
        for strategy in ["standard", "large", "parent_child"]:
            data = matrix[doc_set][strategy]
            print(f"{doc_set:<12} {strategy:<15} {data['overall']:>9}% {data['general']:>9}% {data['exception']:>9}%")
        print()

    # Best combinations
    print("\n" + "-" * 67)
    print("KEY FINDINGS:")
    print("-" * 67)

    best_overall = None
    best_exception = None
    best_score = 0
    best_exception_score = 0

    for doc_set in matrix:
        for strategy in matrix[doc_set]:
            data = matrix[doc_set][strategy]
            if data["overall"] > best_score:
                best_score = data["overall"]
                best_overall = (doc_set, strategy)
            if data["exception"] > best_exception_score:
                best_exception_score = data["exception"]
                best_exception = (doc_set, strategy)

    if best_overall:
        print(f"\n✓ Best overall accuracy: {best_overall[0]} + {best_overall[1]} ({best_score}%)")
    if best_exception:
        print(f"✓ Best exception handling: {best_exception[0]} + {best_exception[1]} ({best_exception_score}%)")

    # Improvement analysis
    baseline = matrix.get("original", {}).get("standard", {})
    optimized = matrix.get("optimized", {}).get("standard", {})

    if baseline and optimized:
        improvement = optimized.get("exception", 0) - baseline.get("exception", 0)
        print(f"\n→ Optimized dataset improvement on exceptions: +{improvement:.1f}%")


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(description="Compare RAG strategies")
    parser.add_argument("--mock", action="store_true", help="Use mock RAG service")
    parser.add_argument("--save", action="store_true", default=True, help="Save results to file")
    args = parser.parse_args()

    # Load queries
    data = load_test_queries()
    queries = data["queries"]

    print(f"Loaded {len(queries)} test queries")
    print(f"  General: {len([q for q in queries if q['category'] == 'general'])}")
    print(f"  Exception: {len([q for q in queries if q['category'] == 'exception'])}")

    if args.mock:
        print("\nUsing MOCK RAG service")

        class MockRAGService:
            def query(self, question, document_set="original", strategy="standard"):
                # Simulate different accuracy based on settings
                import random
                if document_set == "optimized" and "アルバイト" in question:
                    # Higher chance of correct answer for optimized + exception
                    answer = "アルバイトは紙の通勤届（短期雇用者用）を店舗責任者に提出"
                else:
                    answer = f"Mock answer for: {question}"
                return {
                    "answer": answer,
                    "chunks": [{"filename": "test.md", "score": 0.85}]
                }

        rag_service = MockRAGService()
    else:
        # Import real RAG service
        try:
            from app.services.rag_service import get_rag_service

            print("\nInitializing RAG service...")
            rag_service = get_rag_service()
            print("RAG service initialized successfully")
        except ImportError as e:
            print(f"Error importing RAG service: {e}")
            print("Use --mock flag to test the evaluation script")
            return

    # Run comparison
    results = run_comparison(rag_service, queries)

    # Print comparison table
    print_comparison_table(results)

    # Save results
    if args.save:
        results_dir = Path(__file__).parent / "results"
        results_dir.mkdir(exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_file = results_dir / f"comparison_{timestamp}.json"

        with open(results_file, "w", encoding="utf-8") as f:
            json.dump(results, f, ensure_ascii=False, indent=2)

        print(f"\n\nResults saved to: {results_file}")


if __name__ == "__main__":
    main()
