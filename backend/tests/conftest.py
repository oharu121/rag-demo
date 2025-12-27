"""
Pytest configuration and fixtures for backend tests.
"""

import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch


@pytest.fixture
def mock_services():
    """Mock all heavy services to avoid loading ML models in tests."""
    with (
        patch("app.routers.health.get_embedding_service") as mock_embed,
        patch("app.routers.health.get_vectorstore_service") as mock_vs,
        patch("app.routers.health.get_document_service") as mock_doc,
    ):
        # Configure mocks
        mock_embed.return_value.is_ready = True
        mock_vs.return_value.is_ready = True
        mock_doc.return_value.list_documents.return_value = []

        yield {
            "embedding": mock_embed,
            "vectorstore": mock_vs,
            "document": mock_doc,
        }


@pytest.fixture
def client(mock_services):
    """Test client with mocked services."""
    # Patch lifespan to skip heavy initialization
    with patch("app.main.get_rag_service"):
        from app.main import app

        with TestClient(app) as test_client:
            yield test_client
