import anyio
from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel
from typing import Optional
import os
import tempfile
from .predict import predict_audio

router = APIRouter(prefix="/deepfake-audio", tags=["Deepfake Audio Detection"])

class AudioPredictionResponse(BaseModel):
    label: str
    confidence: float
    real_prob: float
    fake_prob: float
    severity: str

@router.post("/predict", response_model=AudioPredictionResponse)
async def predict_deepfake_audio(request: Request, file: UploadFile | None = File(None)):
    if file is None:
        raise HTTPException(status_code=400, detail="No file uploaded. Please attach an audio file in 'file' field.")
    
    # Fix B6: Use app.state models
    model = request.app.state.audio_model
    processor = request.app.state.audio_processor
    classifier = request.app.state.audio_classifier
    device = "cuda" if any(p.is_cuda for p in model.parameters()) else "cpu"

    if model is None or processor is None or classifier is None:
        raise HTTPException(status_code=503, detail="Audio deepfake model is not available.")

    temp_path = None
    try:
        # Save uploaded file to a temp location using tempfile for safety
        suffix = os.path.splitext(file.filename or "audio")[-1] or ".wav"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            temp_path = tmp.name

        # Offload logic to thread
        result = await anyio.to_thread.run_sync(
            predict_audio, temp_path, model, processor, classifier, device
        )
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)
