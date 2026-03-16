from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel
from typing import Any
from .load_prompt_model import tokenizer, model, DEVICE
import torch

router = APIRouter(prefix="/prompt-injection", tags=["Prompt Injection Detection"])

class PromptRequest(BaseModel):
    text: str

class PromptResponse(BaseModel):
    label: str
    confidence: float
    logits: Any

@router.post("/predict", response_model=PromptResponse)
async def predict_prompt_injection(request_data: PromptRequest, request: Request):
    try:
        inputs = tokenizer(request_data.text, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            outputs = model(**inputs)
            logits = outputs.logits.squeeze().cpu().numpy().tolist()
            prob = torch.softmax(outputs.logits, dim=1).squeeze().cpu().numpy()
            label = "Prompt Injection" if prob[1] > 0.5 else "Safe"
            confidence = float(prob[1] if prob[1] > 0.5 else prob[0])
        return PromptResponse(label=label, confidence=confidence, logits=logits)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
