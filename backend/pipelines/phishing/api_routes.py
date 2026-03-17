import anyio
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, HttpUrl, Field
from typing import List

# Import our AI pipeline logic
from pipelines.phishing.phishing import analyze_email

router = APIRouter(prefix="/analyze", tags=["Phishing Analysis"])


class ThreatRequest(BaseModel):
    text: str = Field(..., description="The raw email HTML or text content to analyze")


class HighlightedWord(BaseModel):
    word: str
    score: float


class ThreatResponse(BaseModel):
    risk_score: float = Field(..., description="Probability between 0 and 1 that this is phishing")
    classification: str = Field(..., description="Human-readable threat level translation")
    highlighted_words: List[HighlightedWord] = Field(..., description="Top phrases influencing the score")


def translate_risk_score(score: float) -> str:
    # Fix B3: Correct thresholds (0.7, 0.4) as per architecture
    if score >= 0.7:
        return "High Risk: Phishing Attempt Detected"
    elif score >= 0.4:
        return "Medium Risk: Suspicious Elements Found"
    else:
        return "Low Risk: Looks Safe"


@router.post("/text", response_model=ThreatResponse)
async def analyze_text_endpoint(request_data: ThreatRequest, request: Request):
    """
    Step 4: API Endpoint
    Accepts text, runs DistilBERT + LIG, returns results.
    """
    if not request_data.text.strip():
        raise HTTPException(status_code=400, detail="Empty text payload.")

    # Fix B3: Use app.state models
    model = request.app.state.model
    tokenizer = request.app.state.tokenizer

    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Phishing detection model is not available.")

    try:
        # Offload heavy ML work to a separate thread
        result = await anyio.to_thread.run_sync(analyze_email, request_data.text, model, tokenizer)
        
        risk_score = result["risk_score"]
        classification = translate_risk_score(risk_score)
        
        return ThreatResponse(
            risk_score=risk_score,
            classification=classification,
            highlighted_words=[
                HighlightedWord(word=w["word"], score=w["score"])
                for w in result["highlighted_words"]
            ]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")