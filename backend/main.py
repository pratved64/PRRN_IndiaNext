from dotenv import load_dotenv
load_dotenv()

from contextlib import asynccontextmanager
import os
import sys
import time
import logging

from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

@asynccontextmanager
async def lifespan(app: FastAPI):
    import sys as _sys, os as _os
    _sys.path.insert(0, _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), "sentinel_behavior"))
    from sentinel_behavior.main import startup_sentinel
    await startup_sentinel(app)
    print("SENTINEL AI — all models loaded")
    yield
    print("Backend shutting down.")

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

from pipelines.api_routes import router as phishing_router
app.include_router(phishing_router)

from sentinel_behavior.main import router as sentinel_router
app.include_router(sentinel_router, prefix="/api/sentinel", tags=["Sentinel"])

from pipelines.deepfake_audio.audio_api_routes import router as audio_api_router
app.include_router(audio_api_router)

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