import re
import httpx
import anyio
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field
from typing import List
from functools import partial
from pipelines.phishing.phishing import analyze_email
from pipelines.url.url_resolver import resolve_url
from pipelines.shared.model_loader import get_phishing_model

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

_URL_TOKENIZER_PATTERN = re.compile(r"[./:-]+")

def _preprocess_url_for_model(url: str) -> str:
    """
    Lightweight URL normalizer for the phishing model:
      - Replace '.', '/', ':', '-' (including runs of them) with a single space
      - Collapse any consecutive whitespace to a single space
      - Strip leading/trailing spaces
    """
    # Replace URL separators with a single space
    text = _URL_TOKENIZER_PATTERN.sub(" ", url)
    # Collapse any extra spaces that might appear
    text = " ".join(text.split())
    return text

@router.post("/url", response_model=UrlResponse)
async def analyze_url_endpoint(request_data: UrlRequest, request: Request):
    """
    Resolves the URL (including shorteners) and runs shared DistilBERT inference.
    Returns risk_score, classification, original_url, resolved_url, and highlighted_words.
    """
    # Fix B4: Use app.state models
    tokenizer = request.app.state.tokenizer
    model = request.app.state.model

    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Phishing detection model is not available.")

    original_url = request_data.url

    # Step 1: Resolve the URL (async — SSRF protection inside resolve_url)
    try:
        resolved_url = await resolve_url(original_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except (httpx.TimeoutException, httpx.RequestError):
        resolved_url = original_url

    # Step 2: Run inference on the resolved URL (offloaded to thread pool)
    try:
        clean_text = _preprocess_url_for_model(resolved_url)
        context_text = f"The following URL needs to be checked for phishing: {clean_text}"
        
        fn = partial(analyze_email, context_text, model, tokenizer)
        result = await anyio.to_thread.run_sync(fn)
        risk_score = result["risk_score"]
        
        # Correct thresholds (0.7, 0.4)
        if risk_score >= 0.7:
            classification = "High Risk: Phishing / Malicious Intent Detected"
        elif risk_score >= 0.4:
            classification = "Medium Risk: Suspicious Elements Found"
        else:
            classification = "Low Risk: Looks Safe"

        return UrlResponse(
            risk_score=risk_score,
            classification=classification,
            original_url=original_url,
            resolved_url=resolved_url,
            highlighted_words=[
                HighlightedWord(word=w["word"], score=w["score"])
                for w in result["highlighted_words"]
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"URL analysis failed: {str(e)}")