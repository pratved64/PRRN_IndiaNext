"""
main.py — SENTINEL AI FastAPI Application Entry Point

This is the top-level FastAPI application for the SENTINEL AI anomalous
behavior detection system. It wires together all backend components:

  - Data generator (synthetic in-memory session store)
  - Feature engineer (raw event -> numeric feature vector)
  - Rule engine (deterministic security rule checks)
  - Isolation Forest (per-user ML anomaly scoring)
  - Autoencoder (reconstruction-error anomaly scoring)
  - SHAP explainer (feature attribution)
  - Groq LLM narrative generator
  - Score fusion (ensemble verdict)

Endpoints:
  POST /analyze              — Analyze a login event
  GET  /demo-scenarios       — List all 5 demo attack scenarios
  POST /demo/{scenario_id}   — Run a demo scenario through full pipeline
  GET  /user/{user_id}/history — Last 20 event summaries for a user
  GET  /health               — System health and readiness check

Run with: uvicorn main:app --reload
"""

import os
import sys
from dotenv import load_dotenv
from pathlib import Path

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

def _load_env():
    here = Path(__file__).parent
    for candidate in [here, here.parent, here.parent.parent]:
        env_file = candidate / ".env"
        if env_file.exists():
            load_dotenv(dotenv_path=env_file)
            print(f"Loaded .env from {env_file}")
            return
    load_dotenv()

_load_env()

import time
import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Dict, List, Optional, Any

from fastapi import APIRouter
from fastapi import HTTPException, Request, Response, Body

from data_generator import get_all_sessions, get_user_normal_sessions, DEMO_ATTACK_EVENTS
from feature_engineer import extract_features, get_feature_names
from rule_engine import run_rules
from models.isolation_forest import UserIsolationForest
from models.autoencoder import AutoencoderManager
from explainability.shap_explainer import format_shap_for_display
from explainability.narrative import generate_narrative
from scorer import fuse_scores, get_recommended_action
from schemas import (
    LoginEvent,
    ExplanationPayload,
    DemoScenario,
    FusionBreakdown,
    ShapFeature,
    HistorySummaryItem,
)
from demo_scenarios import DEMO_SCENARIOS, DEMO_SCENARIOS_BY_ID

# ---------------------------------------------------------------------------
# Logging setup
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger("sentinel_ai")

# ---------------------------------------------------------------------------
# In-memory history store
# (maps user_id -> list of {event, verdict, severity_score})
# ---------------------------------------------------------------------------

_history_store: Dict[str, List[dict]] = {}


# ---------------------------------------------------------------------------
# Startup function - called from root main.py lifespan
# ---------------------------------------------------------------------------

async def startup_sentinel(app):
    """
    Runs all model training and stores results in app.state.
    Called from root main.py lifespan.
    """
    logger.info("=" * 60)
    logger.info("SENTINEL AI — Starting model training pipeline...")
    logger.info("=" * 60)

    # 1. Load sessions
    all_sessions = get_all_sessions()
    app.state.all_sessions = all_sessions
    user_ids = list(all_sessions.keys())

    # 2. Isolation Forest — train on normal sessions per user
    logger.info("--- Isolation Forest Training ---")
    isolation_forest_manager = UserIsolationForest()
    # Build per-user normal session dicts
    normal_sessions_per_user: Dict[str, List[dict]] = {
        uid: get_user_normal_sessions(uid) for uid in user_ids
    }
    isolation_forest_manager.train_all_users(normal_sessions_per_user, extract_features)
    app.state.if_manager = isolation_forest_manager

    # 3. Autoencoder — train per user on normal feature vectors
    logger.info("--- Autoencoder Training ---")
    ae_managers: Dict[str, AutoencoderManager] = {}
    feature_names = get_feature_names()

    for user_id in user_ids:
        normal_sessions = normal_sessions_per_user[user_id]
        print(f"  Training Autoencoder for {user_id}...", end=" ", flush=True)
        feature_vectors: List[List[float]] = []
        for idx, event in enumerate(normal_sessions):
            history = normal_sessions[:idx]
            vec = extract_features(event, history)
            feature_vectors.append(vec)

        ae = AutoencoderManager()
        if len(feature_vectors) >= 2:
            ae.train(feature_vectors)
            print(f"done ({len(feature_vectors)} sessions)")
        else:
            print(f"skipped (insufficient data)")

        ae_managers[user_id] = ae

    app.state.ae_managers = ae_managers

    # 4. Store feature names for reuse
    app.state.feature_names = feature_names

    logger.info("=" * 60)
    logger.info("SENTINEL AI — models loaded and ready")
    logger.info(f"Users trained: {len(user_ids)} ({', '.join(user_ids)})")
    logger.info("=" * 60)


# ---------------------------------------------------------------------------
# Router initialization
# ---------------------------------------------------------------------------

router = APIRouter()


# ---------------------------------------------------------------------------
# Core analysis pipeline (shared by /analyze and /demo/{scenario_id})
# ---------------------------------------------------------------------------

async def _run_analysis_pipeline(
    event,
    app_state,
) -> ExplanationPayload:
    """
    Execute the full 12-step analysis pipeline for a login event.

    Steps:
        1. Retrieve user history from in-memory store.
        2. Convert event to dict.
        3. Extract feature vector.
        4. Run rule engine.
        5. Score with Isolation Forest.
        6. Score with Autoencoder.
        7. Fuse scores.
        8. Compute SHAP values and format for display.
        9. Get per-feature Autoencoder reconstruction errors.
       10. Generate LLM narrative (8-second timeout, fallback on timeout).
       11. Build recommended_action string.
       12. Return ExplanationPayload.

    Args:
        event: Validated LoginEvent Pydantic object or dict.
        app_state:  FastAPI app.state carrying trained models and sessions.

    Returns:
        ExplanationPayload with all analysis fields populated.
    """
    t_start = time.perf_counter()

    if isinstance(event, dict):
        event_dict = event
    else:
        event_dict = event.model_dump()

    user_id = event_dict["user_id"]
    feature_names: List[str] = app_state.feature_names

    # Step 1 — User history (strictly prior events only)
    all_sessions: Dict[str, List[dict]] = app_state.all_sessions
    from feature_engineer import _parse_ts
    event_ts = _parse_ts(event_dict["timestamp"])
    user_history: List[dict] = [
        e for e in all_sessions.get(user_id, [])
        if _parse_ts(e["timestamp"]) < event_ts
    ]

    # Step 2 — (event_dict is already instantiated above)

    # Step 3 — Feature extraction
    try:
        feature_vector = extract_features(event_dict, user_history)
    except Exception as e:
        print(f"Feature extraction failed: {e}")
        feature_vector = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]

    # Step 4 — Rule engine
    rule_result = run_rules(event_dict, user_history)

    # Step 5 — Isolation Forest score
    if_manager: UserIsolationForest = app_state.if_manager
    if_score = if_manager.score(user_id, feature_vector)

    # Step 6 — Autoencoder score
    ae_managers: Dict[str, AutoencoderManager] = app_state.ae_managers
    ae_manager: Optional[AutoencoderManager] = ae_managers.get(user_id)
    if ae_manager is not None and ae_manager.model is not None:
        ae_score = ae_manager.score(feature_vector)
        ae_feature_errors = ae_manager.get_feature_errors(feature_vector, feature_names)
    else:
        ae_score = 0.0
        ae_feature_errors = [{"feature": n, "reconstruction_error": 0.0} for n in feature_names]

    # Step 7 — Score fusion
    fusion = fuse_scores(if_score, ae_score, rule_result)
    severity_score: int = fusion["severity_score"]
    verdict: str = fusion["verdict"]
    confidence: float = fusion["confidence"]

    # Step 8 — SHAP values
    raw_shap = if_manager.get_shap_values(user_id, feature_vector, feature_names)
    formatted_shap = format_shap_for_display(raw_shap)
    shap_features = [ShapFeature(**item) for item in formatted_shap]

    # Step 9 — Autoencoder errors already computed in step 6

    # Step 10 — LLM narrative (async with 8-second timeout, fallback on timeout/error)
    threat_type = rule_result.get("highest_severity_rule") or verdict
    try:
        narrative = await asyncio.wait_for(
            asyncio.get_event_loop().run_in_executor(
                None,
                generate_narrative,
                threat_type,
                severity_score,
                confidence,
                rule_result["rules_fired"],
                formatted_shap,
                event_dict,
            ),
            timeout=8.0,
        )
    except asyncio.TimeoutError:
        logger.warning("LLM narrative timed out (>8s). Using fallback.")
        from explainability.narrative import _fallback_narrative
        narrative = _fallback_narrative(rule_result["rules_fired"], severity_score)

    # Step 11 — Recommended action
    recommended_action = get_recommended_action(verdict)

    # Step 12 — Compute processing time
    processing_time_ms = (time.perf_counter() - t_start) * 1000

    # Append event to in-memory user session history (for future analyses)
    if user_id not in app_state.all_sessions:
        app_state.all_sessions[user_id] = []
    app_state.all_sessions[user_id].append(event_dict)

    # Update lightweight history store for /user/{user_id}/history
    if user_id not in _history_store:
        _history_store[user_id] = []
    _history_store[user_id].append({
        "event_id": event_dict["event_id"],
        "timestamp": event_dict["timestamp"],
        "city": event_dict["city"],
        "country": event_dict["country"],
        "verdict": verdict,
        "severity_score": severity_score,
    })

    return ExplanationPayload(
        event_id=event_dict["event_id"],
        user_id=user_id,
        severity_score=severity_score,
        verdict=verdict,
        confidence=confidence,
        rules_fired=rule_result["rules_fired"],
        highest_severity_rule=rule_result["highest_severity_rule"],
        shap_features=shap_features,
        autoencoder_feature_errors=ae_feature_errors,
        narrative=narrative,
        recommended_action=recommended_action,
        fusion_breakdown=FusionBreakdown(
            if_contribution=fusion["if_contribution"],
            ae_contribution=fusion["ae_contribution"],
            rule_contribution=fusion["rule_contribution"],
        ),
        processing_time_ms=round(processing_time_ms, 2),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post(
    "/analyze",
    response_model=ExplanationPayload,
    tags=["Core"]
)
async def analyze_login(
    request: Request,
    event: LoginEvent = Body(
        ...,
        example={
            "event_id": "evt-live-001",
            "user_id": "user_001",
            "timestamp": "2025-03-16T22:28:00",
            "ip": "45.33.32.156",
            "latitude": 51.5074,
            "longitude": -0.1278,
            "city": "London",
            "country": "United Kingdom",
            "device_os": "Windows",
            "device_browser": "Edge",
            "success": True,
            "failure_count": 0,
            "session_duration_mins": 12,
            "is_vpn": False
        }
    )
):
    """Analyze a login event for anomalous behavior."""
    return await _run_analysis_pipeline(
        event, request.app.state
    )


@router.post(
    "/analyze/test",
    response_model=ExplanationPayload,
    tags=["Demo"],
    summary="Quick Pipeline Test"
)
async def analyze_test(request: Request):
    """
    Runs a hardcoded impossible travel attack 
    through the full pipeline with no request 
    body needed. Use this to verify the entire 
    system is working end to end.
    """
    test_event = LoginEvent(
        event_id="test-hardcoded-001",
        user_id="user_001",
        timestamp="2025-03-16T22:28:00",
        ip="45.33.32.156",
        latitude=51.5074,
        longitude=-0.1278,
        city="London",
        country="United Kingdom",
        device_os="Windows",
        device_browser="Edge",
        success=True,
        failure_count=0,
        session_duration_mins=12,
        is_vpn=False
    )
    return await _run_analysis_pipeline(
        test_event, request.app.state
    )


@router.get("/demo-scenarios", response_model=List[DemoScenario], tags=["Demo"])
async def list_demo_scenarios() -> List[DemoScenario]:
    """
    Return all 5 pre-built attack demo scenarios.

    Each scenario includes the attack metadata and the associated LoginEvent
    that can be submitted to /analyze for a full pipeline run.

    Returns:
        List of 5 DemoScenario objects.
    """
    return DEMO_SCENARIOS


@router.post("/demo/{scenario_id}", response_model=ExplanationPayload, tags=["Demo"])
async def run_demo_scenario(scenario_id: str, request: Request) -> ExplanationPayload:
    """
    Run a pre-built demo scenario through the full analysis pipeline.

    Looks up the scenario by ID, extracts its LoginEvent, and submits it
    to the same pipeline as POST /analyze.

    Args:
        scenario_id: One of "scenario_1" through "scenario_5".
        request: FastAPI Request object (used to access app.state).

    Returns:
        ExplanationPayload for the scenario's attack event.

    Raises:
        HTTPException 404: If the scenario_id does not exist.
    """
    scenario = DEMO_SCENARIOS_BY_ID.get(scenario_id)
    if not scenario:
        raise HTTPException(
            status_code=404,
            detail=f"Demo scenario '{scenario_id}' not found. "
                   f"Valid IDs: {list(DEMO_SCENARIOS_BY_ID.keys())}",
        )
    return await _run_analysis_pipeline(scenario.event, request.app.state)


@router.get("/user/{user_id}/history", response_model=List[HistorySummaryItem], tags=["Users"])
async def get_user_history(user_id: str) -> List[HistorySummaryItem]:
    """
    Return the last 20 login event summaries for a given user.

    Each item contains only the event_id, timestamp, location, verdict, and
    severity_score — not the full ExplanationPayload.

    Args:
        user_id: The user identifier (e.g., "user_001").

    Returns:
        List of up to 20 HistorySummaryItem objects, most recent last.

    Raises:
        HTTPException 404: If no history exists for this user_id.
    """
    history = _history_store.get(user_id, [])
    if not history:
        raise HTTPException(
            status_code=404,
            detail=f"No analyzed history found for user '{user_id}'. "
                   f"Submit at least one /analyze request for this user first.",
        )
    last_20 = history[-20:]
    return [HistorySummaryItem(**item) for item in last_20]


@router.get("/health", tags=["System"])
async def health_check(request: Request) -> dict:
    """
    Return the system health and model readiness status.

    Args:
        request: FastAPI Request object (used to access app.state).

    Returns:
        Dict with "status", "models_loaded", and "users_trained" keys.
    """
    print("DEBUG: Entered health_check endpoint")
    try:
        if_manager: UserIsolationForest = request.app.state.if_manager
        users_trained = len(if_manager.models)
        models_loaded = users_trained > 0
    except AttributeError:
        models_loaded = False
        users_trained = 0

    return {
        "status": "ok",
        "models_loaded": models_loaded,
        "users_trained": users_trained,
    }


if __name__ == "__main__":
    import uvicorn
    from contextlib import asynccontextmanager
    from fastapi import FastAPI
    from fastapi.middleware.cors import CORSMiddleware
    
    @asynccontextmanager
    async def _standalone_lifespan(a: FastAPI):
        await startup_sentinel(a)
        yield
    
    standalone_app = FastAPI(
        lifespan=_standalone_lifespan
    )
    standalone_app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    standalone_app.include_router(router)
    uvicorn.run(
        standalone_app, 
        host="0.0.0.0", 
        port=8001
    )
