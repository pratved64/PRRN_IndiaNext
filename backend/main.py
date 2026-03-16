from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

# IMPORT AS REQUIRED
# from qdrant_client import QdrantClient
# from sqlalchemy import create_engine
# from sqlalchemy.orm import sessionmaker

from transformers import AutoTokenizer, AutoModelForSequenceClassification, ViTForImageClassification, ViTImageProcessor
from contextlib import asynccontextmanager
import os
import sys
import time
import logging

DISTILBERT_MODEL = "cybersectony/phishing-email-detection-distilbert_v2.4.1"
VIT_MODEL = "prithivMLmods/Deep-Fake-Detector-v2-Model"

@asynccontextmanager
async def lifespan(app: FastAPI):
    # --- DistilBERT phishing model ---
    print("Loading phishing detection model...")
    try:
        app.state.tokenizer = AutoTokenizer.from_pretrained(DISTILBERT_MODEL)
        distilbert = AutoModelForSequenceClassification.from_pretrained(DISTILBERT_MODEL)
        distilbert.eval()
        app.state.model = distilbert
        print("Phishing model loaded.")
    except Exception as e:
        print(f"Warning: Could not load phishing model. Error: {e}")
        app.state.tokenizer = None
        app.state.model = None

    # --- ViT deepfake model ---
    print("Loading deepfake detection model...")
    try:
        app.state.vit_processor = ViTImageProcessor.from_pretrained(VIT_MODEL)
        vit = ViTForImageClassification.from_pretrained(VIT_MODEL)
        vit.eval()
        app.state.vit_model = vit
        print("Deepfake model loaded.")
    except Exception as e:
        print(f"Warning: Could not load deepfake model. Error: {e}")
        app.state.vit_processor = None
        app.state.vit_model = None
    
    yield
    
    # Teardown
    app.state.tokenizer = None
    app.state.model = None
    app.state.vit_processor = None
    app.state.vit_model = None

app = FastAPI(title="PRRN IndiaNext — Unified Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

import time as _time
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backend")

@app.middleware("http")
async def log_requests(request: Request, call_next) -> Response:
    start = _time.perf_counter()
    response = await call_next(request)
    elapsed = (_time.perf_counter() - start) * 1000
    logger.info("%s %s \\u2192 %d (%.1f ms)", request.method, request.url.path, response.status_code, elapsed)
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s: %s", request.url, exc)
    return JSONResponse(status_code=500, content={"error": type(exc).__name__, "message": str(exc), "path": str(request.url)})

# Include the Phishing Pipeline router
from pipelines.phishing.api_routes import router as phishing_router
app.include_router(phishing_router)

# Include the URL Analysis router
from pipelines.url.url_routes import router as url_router
app.include_router(url_router)

from pipelines.sentinel_behavior.main import router as sentinel_router
app.include_router(sentinel_router, prefix="/api/sentinel", tags=["Sentinel"])

from pipelines.deepfake_audio.audio_api_routes import router as audio_api_router
app.include_router(audio_api_router)

# Include the Video Deepfake router
from pipelines.video_deepfake.video_routes import router as video_router
app.include_router(video_router)

# Include the Deepfake Audio API router
from pipelines.deepfake_audio.audio_api_routes import router as deepfake_audio_router
app.include_router(deepfake_audio_router)

from pipelines.prompt_injection_website.api_routes import router as prompt_injection_router
app.include_router(prompt_injection_router)

@app.get("/api/health")
async def health_check(request: Request):
    try:
        from models.isolation_forest import UserIsolationForest
        if_manager = request.app.state.if_manager
        users_trained = len(if_manager.models)
        sentinel_loaded = users_trained > 0
    except Exception:
        sentinel_loaded = False
        users_trained = 0

    return {
        "status": "ok",
        "message": "Backend is locked and loaded.",
        "sentinel_models_loaded": sentinel_loaded,
        "users_trained": users_trained,
        "services": {
            "phishing_pipeline": "active",
            "behavior_detection": "active" if sentinel_loaded else "loading",
        },
    }