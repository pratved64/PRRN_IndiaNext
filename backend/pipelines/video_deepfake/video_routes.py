"""
video_routes.py — Phase 5: API Integration
The Unified API Router
POST /analyze/media
  • Accepts an UploadFile (image or video)
  • Extracts faces (Smart Extraction for videos, single crop for images)
  • Runs the Deepfake ViT pipeline, returns JSON
"""
import base64
import tempfile
import os
import anyio
import cv2

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel

from pipelines.video_deepfake.video_processor import (
    extract_faces_from_video,
    extract_face_from_image,
)
from pipelines.video_deepfake.deepfake_detector import run_inference, generate_attention_heatmap

router = APIRouter(prefix="/analyze", tags=["Media Deepfake Analysis"])

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class MediaResponse(BaseModel):
    risk_score: float
    classification: str
    heatmap_base64: str
    frames_analyzed: int

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _translate_risk(score: float) -> str:
    if score >= 0.75:
        return "High Risk: Deepfake Detected"
    elif score >= 0.40:
        return "Medium Risk: Suspicious Artifacts Found"
    else:
        return "Low Risk: Likely Authentic"


def _run_ml_pipeline(face_crops, model, processor) -> dict:
    """
    Shared ML core:
      1. Take one or more RGB 224×224 face crops
      2. Run ViT inference
      3. Generate attention heatmap for the first face
    """
    if not face_crops:
        raise ValueError("No faces detected in the media. Cannot classify.")

    # Phase 3: ViT inference
    result = run_inference(face_crops, model, processor)
    risk_score = result["risk_score"]

    # Phase 4: Attention heatmap (first face only — most representative)
    heatmap_bgr = generate_attention_heatmap(face_crops[0], model, processor)

    # Encode heatmap as JPEG → base64 string
    success, buffer = cv2.imencode(".jpg", heatmap_bgr)
    if not success:
        raise RuntimeError("Failed to encode heatmap image.")
    heatmap_b64 = base64.b64encode(buffer.tobytes()).decode("utf-8")

    return {
        "risk_score": risk_score,
        "heatmap_base64": heatmap_b64,
        "frames_analyzed": len(face_crops),
    }

def _run_video_pipeline(video_path: str, model, processor) -> dict:
    face_crops = extract_faces_from_video(video_path, target_face_count=30)
    return _run_ml_pipeline(face_crops, model, processor)

def _run_image_pipeline(image_bytes: bytes, model, processor) -> dict:
    face_crops = extract_face_from_image(image_bytes)
    return _run_ml_pipeline(face_crops, model, processor)

# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/media", response_model=MediaResponse)
async def analyze_media_endpoint(
    request: Request,
    file: UploadFile = File(..., description="Image or video file to analyze"),
):
    """
    Step 5.1–5.4: Accept media upload, check MIME type, route to image/video processor, return JSON.
    """
    model = request.app.state.vit_model
    processor = request.app.state.vit_processor

    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Deepfake model is unavailable or still loading.")

    content_type = file.content_type or ""

    # curl and other tools sometimes default to application/octet-stream
    # Fallback to guessing based on filename extension
    if content_type == "application/octet-stream" or not content_type:
        ext = os.path.splitext(file.filename.lower())[1] if file.filename else ""
        if ext in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]:
            content_type = "image/"
        elif ext in [".mp4", ".mov", ".avi", ".mkv"]:
            content_type = "video/"

    try:
        if content_type.startswith("image/"):
            # Process image in memory
            image_bytes = await file.read()
            result = await anyio.to_thread.run_sync(_run_image_pipeline, image_bytes, model, processor)
            
        elif content_type.startswith("video/"):
            # Process video via temp file
            tmp_path = None
            try:
                suffix = os.path.splitext(file.filename or "upload")[-1] or ".mp4"
                with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
                    tmp.write(await file.read())
                    tmp_path = tmp.name

                result = await anyio.to_thread.run_sync(_run_video_pipeline, tmp_path, model, processor)
            finally:
                if tmp_path and os.path.exists(tmp_path):
                    os.remove(tmp_path)
        else:
            raise ValueError(f"Unsupported media type: {content_type}")

        return MediaResponse(
            risk_score=result["risk_score"],
            classification=_translate_risk(result["risk_score"]),
            heatmap_base64=result["heatmap_base64"],
            frames_analyzed=result["frames_analyzed"],
        )

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Media analysis failed: {str(e)}")
