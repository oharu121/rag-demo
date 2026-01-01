"""
Tests for health check and root endpoints.
"""


def test_root_endpoint(client):
    """Test root endpoint redirects to Swagger docs."""
    response = client.get("/", follow_redirects=False)
    assert response.status_code == 307
    assert response.headers["location"] == "/docs"


def test_health_endpoint(client):
    """Test health check endpoint returns expected structure."""
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "model_loaded" in data
    assert "vectorstore_ready" in data
    assert "document_count" in data
