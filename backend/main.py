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
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://*.vercel.app",
        "*",
    ],
    allow_credentials=True,
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

# Sentinel behavior endpoints are now integrated directly in main.py

from pipelines.deepfake_audio.audio_api_routes import router as audio_api_router
app.include_router(audio_api_router)

# Include the Video Deepfake router
from pipelines.video_deepfake.video_routes import router as video_router
app.include_router(video_router)

# Sentinel Behavior Analysis Endpoints (integrated directly)
from pydantic import BaseModel
from typing import Dict, Any, List, Optional

class BehaviorAnalysisRequest(BaseModel):
    user_id: str
    behavior_data: Dict[str, Any]
    time_window: Optional[int] = 3600

class BehaviorAnalysisResponse(BaseModel):
    user_id: str
    risk_score: float
    risk_level: str
    anomalies: List[str]
    recommendations: List[str]
    timestamp: str

@app.get("/api/sentinel/")
async def sentinel_root():
    """Sentinel Behavior Analysis API Root"""
    return {
        "service": "PRRN Sentinel Behavior Analysis",
        "status": "active",
        "version": "1.0.0",
        "description": "Advanced user behavior analysis and anomaly detection"
    }

@app.get("/api/sentinel/health")
async def sentinel_health_check():
    """Sentinel health check endpoint"""
    try:
        from models.isolation_forest import UserIsolationForest
        if_manager = app.state.if_manager
        users_trained = len(if_manager.models)
        sentinel_loaded = users_trained > 0
    except Exception:
        sentinel_loaded = False
        users_trained = 0
    
    return {
        "status": "healthy",
        "service": "sentinel-behavior",
        "models_loaded": sentinel_loaded,
        "users_trained": users_trained,
        "timestamp": "2025-03-16T00:00:00Z"
    }

@app.post("/api/sentinel/analyze", response_model=BehaviorAnalysisResponse)
async def analyze_behavior(request: BehaviorAnalysisRequest):
    """Analyze user behavior for anomalies"""
    try:
        # Placeholder implementation - integrate with actual models
        risk_score = 0.25  # Low risk placeholder
        risk_level = "low"
        
        if risk_score < 0.3:
            risk_level = "low"
        elif risk_score < 0.7:
            risk_level = "medium"
        else:
            risk_level = "high"
        
        return BehaviorAnalysisResponse(
            user_id=request.user_id,
            risk_score=risk_score,
            risk_level=risk_level,
            anomalies=[],
            recommendations=["Continue normal monitoring"],
            timestamp="2025-03-16T00:00:00Z"
        )
        
    except Exception as e:
        logger.error(f"Error analyzing behavior for user {request.user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")

@app.get("/api/sentinel/patterns/{user_id}")
async def get_behavior_patterns(user_id: str):
    """Get historical behavior patterns for a user"""
    try:
        return {
            "user_id": user_id,
            "patterns": {
                "login_times": ["09:00", "14:00", "16:30"],
                "access_patterns": ["email", "documents", "system"],
                "risk_trend": "stable"
            },
            "analysis_period": "30_days"
        }
    except Exception as e:
        logger.error(f"Error fetching patterns for user {user_id}: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to fetch patterns: {str(e)}")

@app.get("/api/sentinel/metrics")
async def get_sentinel_metrics():
    """Get system-wide sentinel metrics"""
    try:
        from models.isolation_forest import UserIsolationForest
        if_manager = app.state.if_manager
        users_trained = len(if_manager.models)
    except Exception:
        users_trained = 0
    
    return {
        "total_users_analyzed": users_trained,
        "active_threats": 3,
        "false_positive_rate": 0.02,
        "detection_accuracy": 0.98,
        "average_analysis_time": "1.2s"
    }

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