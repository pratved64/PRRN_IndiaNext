from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import os
from .predict import predict_audio
router = APIRouter(prefix="/deepfake-audio", tags=["Deepfake Audio Detection"])
class AudioPredictionResponse(BaseModel):
    label: str
    confidence: float
    real_prob: float
    fake_prob: float
    severity: str
@router.post("/predict", response_model=AudioPredictionResponse)
async def predict_deepfake_audio(file: UploadFile | None = File(None)):
    if file is None:
        raise HTTPException(status_code=400, detail="No file uploaded. Please attach an audio file in 'file' field.")
    try:
        # Save uploaded file to a temp location
        temp_path = f"temp_{file.filename}"
        with open(temp_path, "wb") as f:
            f.write(await file.read())
        result = predict_audio(temp_path)
        os.remove(temp_path)
        return result
    except ValueError as e:
        # decode/format problems -> client error
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
