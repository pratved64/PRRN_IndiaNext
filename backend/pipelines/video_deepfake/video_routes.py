"""
video_routes.py — Phase 5: API Integration

POST /analyze/video
  • Accepts a video UploadFile
  • Saves to a temp .mp4, runs the pipeline, returns JSON
  • Deletes temp file in the finally block (no disk bloat)
"""
import base64
import tempfile
import os
import anyio
import cv2

from fastapi import APIRouter, HTTPException, Request, UploadFile, File
from pydantic import BaseModel

from pipelines.video_deepfake.video_processor import extract_faces_from_video
from pipelines.video_deepfake.deepfake_detector import run_inference, generate_attention_heatmap

router = APIRouter(prefix="/analyze", tags=["Video Deepfake Analysis"])


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class VideoResponse(BaseModel):
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


def _run_pipeline(video_path: str, model, processor) -> dict:
    """
    Synchronous pipeline entry point — safe to call from a thread pool.
    Steps 5.3:
      1. Extract and crop faces from video
      2. Run ViT inference
      3. Generate attention heatmap for the first face
    """
    # Phase 1 & 2: frame scanning + face detection & cropping (handled inside helper)
    face_crops = extract_faces_from_video(video_path)
    if not face_crops:
        raise ValueError("No faces detected in the video. Cannot classify.")

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


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/video", response_model=VideoResponse)
async def analyze_video_endpoint(
    request: Request,
    file: UploadFile = File(..., description="Video file to analyze (.mp4, .mov, .avi)"),
):
    """
    Step 5.1–5.4: Accept a video upload, run the deepfake pipeline, return JSON.
    The temporary file is always cleaned up in the finally block.
    """
    model = request.app.state.vit_model
    processor = request.app.state.vit_processor

    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Deepfake model is unavailable or still loading.")

    tmp_path: str | None = None

    try:
        # Step 5.2: Write upload to a temp file
        suffix = os.path.splitext(file.filename or "upload")[-1] or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(await file.read())
            tmp_path = tmp.name

        # Step 5.3: Run synchronous pipeline in thread pool (RULES.md: never block the event loop)
        result = await anyio.to_thread.run_sync(_run_pipeline, tmp_path, model, processor)

        # Step 5.4: Return JSON payload
        return VideoResponse(
            risk_score=result["risk_score"],
            classification=_translate_risk(result["risk_score"]),
            heatmap_base64=result["heatmap_base64"],
            frames_analyzed=result["frames_analyzed"],
        )

    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")
    finally:
        # Step 5.4: Always delete the temp file — no disk bloat
        if tmp_path and os.path.exists(tmp_path):
            os.remove(tmp_path)
