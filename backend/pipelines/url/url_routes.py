import httpx
import anyio
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List

from pipelines.phishing.phishing import analyze_email
from pipelines.url.url_resolver import resolve_url

router = APIRouter(prefix="/analyze", tags=["URL Analysis"])


class UrlRequest(BaseModel):
    url: str = Field(..., description="The URL to analyze (shorteners will be resolved)")


class HighlightedWord(BaseModel):
    word: str
    score: float


class UrlResponse(BaseModel):
    risk_score: float
    classification: str
    original_url: str
    resolved_url: str
    highlighted_words: List[HighlightedWord]


def translate_risk_score(score: float) -> str:
    if score >= 0.75:
        return "High Risk: Phishing Attempt Detected"
    elif score >= 0.40:
        return "Medium Risk: Suspicious Elements Found"
    else:
        return "Low Risk: Looks Safe"


@router.post("/url", response_model=UrlResponse)
async def analyze_url_endpoint(request_data: UrlRequest, request: Request):
    """
    Resolves the URL (including shorteners) and runs shared DistilBERT inference.
    Returns risk_score, classification, original_url, resolved_url, and highlighted_words.
    """
    model = request.app.state.model
    tokenizer = request.app.state.tokenizer

    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Phishing models are unavailable or still loading.")

    original_url = request_data.url

    # Step 1: Resolve the URL (async — SSRF protection inside resolve_url)
    try:
        resolved_url = await resolve_url(original_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except httpx.TimeoutException:
        raise HTTPException(status_code=408, detail="Timeout: The URL did not respond within 3 seconds.")
    except httpx.RequestError as e:
        raise HTTPException(status_code=400, detail=f"Could not reach URL: {str(e)}")

    # Step 2: Run inference on the resolved URL (offloaded to thread pool per RULES.md)
    try:
        result = await anyio.to_thread.run_sync(analyze_email, resolved_url, model, tokenizer)

        risk_score = result["risk_score"]

        return UrlResponse(
            risk_score=risk_score,
            classification=translate_risk_score(risk_score),
            original_url=original_url,
            resolved_url=resolved_url,
            highlighted_words=[
                HighlightedWord(word=w["word"], score=w["score"])
                for w in result["highlighted_words"]
            ],
        )
    except Exception as e:
        # RULES.md: Fail gracefully
        raise HTTPException(status_code=500, detail=f"URL analysis failed: {str(e)}")
