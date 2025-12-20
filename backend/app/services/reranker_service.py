"""
Re-ranking Service using Cross-Encoder

Re-ranking is a post-retrieval step that re-scores documents using a more
accurate (but slower) cross-encoder model. This can improve precision by
better understanding query-document relevance.

Flow:
  1. Vector search retrieves k=10 candidates (fast, approximate)
  2. Cross-encoder scores each candidate against query (slow, accurate)
  3. Return top 4 by cross-encoder score

This is a RUNTIME operation - no index rebuild needed.
"""

from functools import lru_cache

from langchain_core.documents import Document

from app.config import get_settings


class RerankerService:
    """Cross-encoder based re-ranking service."""

    def __init__(self):
        self._model = None
        self.settings = get_settings()

    def _get_model(self):
        """Lazy load the cross-encoder model."""
        if self._model is None:
            from sentence_transformers import CrossEncoder

            print(f"[Reranker] Loading model: {self.settings.reranker_model}", flush=True)
            self._model = CrossEncoder(self.settings.reranker_model)
            print("[Reranker] Model loaded successfully", flush=True)
        return self._model

    def rerank(
        self,
        query: str,
        documents: list[tuple[Document, float]],
        top_k: int | None = None,
    ) -> list[tuple[Document, float]]:
        """
        Re-rank documents using cross-encoder.

        Args:
            query: The user's question
            documents: List of (Document, similarity_score) tuples from vector search
            top_k: Number of top documents to return (default: settings.reranker_top_k)

        Returns:
            Re-ranked list of (Document, reranker_score) tuples
        """
        if not documents:
            return []

        top_k = top_k or self.settings.reranker_top_k

        # If we have fewer docs than top_k, just return them all
        if len(documents) <= top_k:
            return documents

        model = self._get_model()

        # Prepare query-document pairs for cross-encoder
        # Use the actual content that will be sent to LLM
        pairs = []
        for doc, _ in documents:
            # Handle different content sources based on chunking strategy
            if doc.metadata.get("original_content"):
                # Hypothetical Questions strategy
                content = doc.metadata["original_content"]
            elif doc.metadata.get("parent_content"):
                # Parent-Child strategy
                content = doc.metadata["parent_content"]
            else:
                # Standard/Large chunk strategies
                content = doc.page_content
            pairs.append((query, content))

        # Score all pairs
        scores = model.predict(pairs)

        # Combine documents with new scores
        scored_docs = list(zip(documents, scores))

        # Sort by cross-encoder score (higher is better)
        scored_docs.sort(key=lambda x: x[1], reverse=True)

        # Return top_k with cross-encoder scores
        result = []
        for (doc, _old_score), new_score in scored_docs[:top_k]:
            result.append((doc, float(new_score)))

        print(f"[Reranker] Re-ranked {len(documents)} docs → top {len(result)}", flush=True)
        return result


# Singleton instance
_reranker_service: RerankerService | None = None


@lru_cache
def get_reranker_service() -> RerankerService:
    """Get singleton RerankerService instance."""
    global _reranker_service
    if _reranker_service is None:
        _reranker_service = RerankerService()
    return _reranker_service
