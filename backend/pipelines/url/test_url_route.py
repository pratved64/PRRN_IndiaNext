import pytest
import httpx

# Clean, absolute imports based on the backend folder
from main import app  
from pipelines.url import url_routes

@pytest.mark.asyncio
async def test_analyze_url_safe_link(monkeypatch):
    async def fake_resolve_url(original: str) -> str:
        return "https://www.example.com/"

    def fake_analyze_email(resolved: str, model, tokenizer):
        return {
            "risk_score": 0.10,
            "highlighted_words": [{"word": "example", "score": 0.1}],
        }

    # Patch the functions directly in the url_routes module
    monkeypatch.setattr(url_routes, "resolve_url", fake_resolve_url)
    monkeypatch.setattr(url_routes, "analyze_email", fake_analyze_email)

    app.state.model = object()
    app.state.tokenizer = object()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/analyze/url", json={"url": "https://short.safe/url"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["classification"] == "Low Risk: Looks Safe"
    assert data["resolved_url"] == "https://www.example.com/"


@pytest.mark.asyncio
async def test_analyze_url_malicious_link(monkeypatch):
    async def fake_resolve_url(original: str) -> str:
        return "http://gimmeyourmoney.com"

    def fake_analyze_email(resolved: str, model, tokenizer):
        return {
            "risk_score": 0.92,
            "highlighted_words": [{"word": "login", "score": 0.9}],
        }

    monkeypatch.setattr(url_routes, "resolve_url", fake_resolve_url)
    monkeypatch.setattr(url_routes, "analyze_email", fake_analyze_email)

    app.state.model = object()
    app.state.tokenizer = object()

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.post("/analyze/url", json={"url": "http://tiny.cc/obfuscated"})

    assert resp.status_code == 200
    data = resp.json()
    assert data["classification"] == "High Risk: Phishing Attempt Detected"
    assert data["resolved_url"] == "http://gimmeyourmoney.com"