import anyio
import torch
from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Any, List
from .prompt_predict import scan_url

router = APIRouter(prefix="/prompt-injection", tags=["Prompt Injection Detection"])

class PromptRequest(BaseModel):
    text: str

class PromptResponse(BaseModel):
    label: str
    confidence: float
    logits: Any

class UrlPromptRequest(BaseModel):
    url: str

class UrlPromptResponse(BaseModel):
    url: str
    total_chunks: int
    flagged: int
    threat_score: float
    verdict: str
    results: List[Any]

@router.post("/predict", response_model=PromptResponse)
async def predict_prompt_injection(request_data: PromptRequest, request: Request):
    # Fix B7: Use app.state models
    tokenizer = getattr(request.app.state, "prompt_tokenizer", None)
    model = getattr(request.app.state, "prompt_model", None)
    
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Prompt injection model is not available.")

    device = "cuda" if any(p.is_cuda for p in model.parameters()) else "cpu"

    try:
        def _sync_predict():
            inputs = tokenizer(request_data.text, return_tensors="pt").to(device)
            with torch.no_grad():
                outputs = model(**inputs)
                logits = outputs.logits.squeeze().cpu().numpy().tolist()
                prob = torch.softmax(outputs.logits, dim=1).squeeze().cpu().numpy()
                label = "INJECTION" if prob[1] > 0.5 else "SAFE"
                confidence = float(prob[1] if prob[1] > 0.5 else prob[0])
            return label, confidence, logits

        label, confidence, logits = await anyio.to_thread.run_sync(_sync_predict)
        
        return PromptResponse(
            label=label,
            confidence=round(confidence, 4),
            logits=logits
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

@router.post("/scan-website", response_model=UrlPromptResponse)
async def scan_website_prompt(request_data: UrlPromptRequest, request: Request):
    tokenizer = getattr(request.app.state, "prompt_tokenizer", None)
    model = getattr(request.app.state, "prompt_model", None)
    
    if model is None or tokenizer is None:
        raise HTTPException(status_code=503, detail="Prompt injection model is not available.")

    device = "cuda" if any(p.is_cuda for p in model.parameters()) else "cpu"

    try:
        result = await anyio.to_thread.run_sync(
            scan_url, request_data.url, model, tokenizer, device
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Website scan failed: {str(e)}")
