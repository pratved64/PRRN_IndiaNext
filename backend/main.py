from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time as _time
import logging

# Import shared loaders
from pipelines.shared.model_loader import get_phishing_model, get_vit_model

# Import Routers
from pipelines.phishing.api_routes import router as phishing_router
from pipelines.url.url_routes import router as url_router
from pipelines.video_deepfake.video_routes import router as video_router
from pipelines.deepfake_audio.audio_api_routes import router as audio_router
from pipelines.prompt_injection_website.api_routes import router as prompt_router
from pipelines.sentinel_behavior.main import router as sentinel_router, startup_sentinel

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Load Models at Startup (Fix B1)
    print("=" * 50)
    print("abhedya.sec | INITIALIZING AI ENGINE...")
    
    # 1. Load Phishing/URL Model (DistilBERT)
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        db_name = "cybersectony/phishing-email-detection-distilbert_v2.4.1"
        app.state.tokenizer = AutoTokenizer.from_pretrained(db_name)
        app.state.model = AutoModelForSequenceClassification.from_pretrained(db_name)
        app.state.model.eval()
        print("-> Phishing/URL Model: LOADED")
    except Exception as e:
        print(f"-> Phishing/URL Model: FAILED ({e})")
        app.state.model = None

    # 2. Load ViT Model
    try:
        from transformers import ViTImageProcessor, ViTForImageClassification
        vit_name = "prithivMLmods/Deep-Fake-Detector-v2-Model"
        app.state.vit_processor = ViTImageProcessor.from_pretrained(vit_name)
        app.state.vit_model = ViTForImageClassification.from_pretrained(vit_name)
        app.state.vit_model.eval()
        print("-> ViT Deepfake Model: LOADED")
    except Exception as e:
        print(f"-> ViT Deepfake Model: FAILED ({e})")
        app.state.vit_model = None

    # 3. Load Audio Deepfake Model (Fix B6)
    try:
        from transformers import Wav2Vec2Processor, Wav2Vec2ForSequenceClassification
        from pipelines.deepfake_audio.load_audio_model import AudioClassifier
        import torch
        
        audio_model_id = "facebook/wav2vec2-base-960h"
        app.state.audio_processor = Wav2Vec2Processor.from_pretrained(audio_model_id)
        app.state.audio_model = Wav2Vec2ForSequenceClassification.from_pretrained(audio_model_id)
        app.state.audio_classifier = AudioClassifier()
        print("-> Audio Deepfake Model: LOADED")
    except Exception as e:
        print(f"-> Audio Deepfake Model: FAILED ({e})")
        app.state.audio_model = None

    # 4. Load Prompt Injection Model (Fix B7)
    try:
        from transformers import AutoTokenizer, AutoModelForSequenceClassification
        prompt_model_id = "deepset/deberta-v3-base-injection"
        app.state.prompt_tokenizer = AutoTokenizer.from_pretrained(prompt_model_id)
        app.state.prompt_model = AutoModelForSequenceClassification.from_pretrained(prompt_model_id)
        app.state.prompt_model.eval()
        print("-> Prompt Injection Model: LOADED")
    except Exception as e:
        print(f"-> Prompt Injection Model: FAILED ({e})")
        app.state.prompt_model = None

    # 5. Initialize Sentinel Behavior Analytics
    try:
        await startup_sentinel(app)
        print("-> Sentinel Engine: INITIALIZED")
    except Exception as e:
        print(f"-> Sentinel Engine: FAILED ({e})")

    print("abhedya.sec | AI ENGINE READY")
    print("=" * 50)
    
    yield
    print("abhedya.sec | SHUTTING DOWN...")

app = FastAPI(title="PRRN IndiaNext — Unified Backend", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("backend")

@app.middleware("http")
async def log_requests(request: Request, call_next) -> Response:
    start = _time.perf_counter()
    response = await call_next(request)
    elapsed = (_time.perf_counter() - start) * 1000
    logger.info("%s %s \u2192 %d (%.1f ms)", request.method, request.url.path, response.status_code, elapsed)
    return response

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error("Unhandled error on %s: %s", request.url, exc)
    return JSONResponse(status_code=500, content={"error": type(exc).__name__, "message": str(exc), "path": str(request.url)})

# Routers
app.include_router(phishing_router, prefix="/api")
app.include_router(url_router, prefix="/api")
app.include_router(video_router, prefix="/api")
app.include_router(audio_router, prefix="/api")
app.include_router(prompt_router, prefix="/api")
app.include_router(sentinel_router, prefix="/api/sentinel")

@app.get("/api/health")
async def health_check(request: Request):
    """
    Unified Health Check (Fix B9)
    Reports status of all loaded models and services.
    """
    state = request.app.state
    
    # Check individual models
    phishing_loaded = hasattr(state, 'model') and state.model is not None
    vit_loaded = hasattr(state, 'vit_model') and state.vit_model is not None
    audio_loaded = hasattr(state, 'audio_model') and state.audio_model is not None
    prompt_loaded = hasattr(state, 'prompt_model') and state.prompt_model is not None
    
    # Sentinel check
    sentinel_loaded = False
    users_trained = 0
    try:
        if hasattr(state, "if_manager") and state.if_manager:
            users_trained = len(state.if_manager.models)
            sentinel_loaded = users_trained > 0
    except Exception:
        pass

    return {
        "status": "ok",
        "timestamp": _time.time(),
        "version": "1.0.0",
        "models": {
            "distilbert_phishing": "loaded" if phishing_loaded else "missing",
            "vit_deepfake": "loaded" if vit_loaded else "missing",
            "wav2vec2_audio": "loaded" if audio_loaded else "missing",
            "deberta_prompt": "loaded" if prompt_loaded else "missing",
            "sentinel_if": "ready" if sentinel_loaded else "training"
        },
        "sentinel_metrics": {
            "users_trained_count": users_trained
        },
        "services": {
            "api_gateway": "active",
            "ml_inference_threads": "enabled"
        }
    }