from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, HttpUrl, Field
from typing import List

# Import our AI pipeline logic
# In a real app we might put the route in routes/phishing.py and logic here, 
# but per instructions, we are restricting work to pipelines/phishing.py 
# so we will add the router here for easy importing to main.py later.
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
    """
    Step 4.3: Add the Translation Layer.
    Map the raw probability score to a string response for the frontend.
    """
    if score >= 0.75:
        return "High Risk: Phishing Attempt Detected"
    elif score >= 0.40:
        return "Medium Risk: Suspicious Elements Found"
    else:
        return "Low Risk: Looks Safe"


@router.post("/text", response_model=ThreatResponse)
async def analyze_text_endpoint(request_data: ThreatRequest, request: Request):
    """
    Step 4.1 & 4.2: ThreatRequest / ThreatResponse schemas and POST endpoint
    """
    model = request.app.state.model
    tokenizer = request.app.state.tokenizer
    
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Phishing Models are currently unavailable or still loading.")

    try:
        # Run the heavy PyTorch logic
        # (In a production system using FastAPI, we would run this in a threadpool 
        # so it doesn't block the async event loop. We will wrap it in anyio.to_thread 
        # as per the RULES.md "Ensure heavy ml inference don't block main event loop")
        import anyio
        
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
        # RULES.md: Fail Gracefully
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


