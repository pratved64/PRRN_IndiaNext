from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time as _time
import logging

# Import shared loaders — routes import from here too, no circular dependency
from pipelines.shared.model_loader import get_phishing_model, get_vit_model

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.tokenizer = None
    app.state.model = None
    app.state.vit_processor = None
    app.state.vit_model = None
    print("Backend started - models will be loaded on first use")
    yield
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
from pipelines.phishing.api_routes import router as phishing_router
app.include_router(phishing_router, prefix="/api")

from pipelines.url.url_routes import router as url_router
app.include_router(url_router, prefix="/api")

from pipelines.video_deepfake.video_routes import router as video_router
app.include_router(video_router, prefix="/api")

@app.get("/api/health")
async def health_check(request: Request):
    sentinel_loaded = False
    users_trained = 0
    try:
        if hasattr(request.app.state, 'if_manager') and request.app.state.if_manager:
            users_trained = len(request.app.state.if_manager.models)
            sentinel_loaded = users_trained > 0
    except Exception:
        pass

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