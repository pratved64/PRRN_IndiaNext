"""
schemas.py — Pydantic v2 Schemas for SENTINEL AI

This module defines all request and response data models used by the FastAPI
application. Strict typing is enforced using Pydantic v2 BaseModel.
"""

from typing import List, Optional
from pydantic import BaseModel, ConfigDict


class LoginEvent(BaseModel):
    event_id: str
    user_id: str
    timestamp: str
    ip: str
    latitude: float
    longitude: float
    city: str
    country: str
    device_os: str
    device_browser: str
    success: bool
    failure_count: int
    session_duration_mins: int
    is_vpn: bool = False

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
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
        }
    )


class ShapFeature(BaseModel):
    """
    One SHAP-attributed feature contribution from the Isolation Forest model.

    Attributes:
        feature: Raw snake_case feature name.
        label: Human-readable feature label.
        shap_value: SHAP attribution value (positive = pushes toward anomaly).
        direction: "risk" if shap_value >= 0, "safe" otherwise.
        magnitude: Absolute value of shap_value for ranking purposes.
    """

    feature: str
    label: str
    shap_value: float
    direction: str
    magnitude: float


class FusionBreakdown(BaseModel):
    """
    Breakdown of how each model contributed to the final severity score.

    Attributes:
        if_contribution: Isolation Forest's contribution in score points (0-45).
        ae_contribution: Autoencoder's contribution in score points (0-35).
        rule_contribution: Rule engine's boost contribution in score points (0-20).
    """

    if_contribution: float
    ae_contribution: float
    rule_contribution: float


class ExplanationPayload(BaseModel):
    """
    Full analysis response payload returned by the /analyze endpoint.

    Attributes:
        event_id: ID of the analyzed login event.
        user_id: User who performed the login.
        severity_score: Final severity score 0-100.
        verdict: "MALICIOUS", "SUSPICIOUS", or "SAFE".
        confidence: Model confidence probability in [0, 1].
        rules_fired: Tags of all deterministic rules that triggered.
        highest_severity_rule: Tag of the single most severe rule, or None.
        shap_features: Top 5 SHAP feature attributions.
        autoencoder_feature_errors: Per-feature reconstruction errors from AE.
        narrative: 3-sentence SOC analyst narrative from Groq LLM (or fallback).
        recommended_action: Prescribed SOC response for the verdict level.
        fusion_breakdown: Score contribution from each model component.
        processing_time_ms: End-to-end processing latency in milliseconds.
    """

    event_id: str
    user_id: str
    severity_score: int
    verdict: str
    confidence: float
    rules_fired: List[str]
    highest_severity_rule: Optional[str]
    shap_features: List[ShapFeature]
    autoencoder_feature_errors: List[dict]
    narrative: str
    recommended_action: str
    fusion_breakdown: FusionBreakdown
    processing_time_ms: float


class DemoScenario(BaseModel):
    """
    A pre-built attack scenario for rapid demonstration.

    Attributes:
        scenario_id: Identifier string, "scenario_id" through "scenario_5".
        name: Short human-readable name for the attack.
        description: One-sentence description of what the scenario demonstrates.
        attack_type: One of the canonical attack type strings.
        event: The LoginEvent object that represents this attack.
    """

    scenario_id: str
    name: str
    description: str
    attack_type: str
    event: LoginEvent


class HistorySummaryItem(BaseModel):
    """
    A compact summary record for the user history endpoint.

    Attributes:
        event_id: Login event identifier.
        timestamp: ISO 8601 timestamp of the event.
        city: Login city.
        country: Login country.
        verdict: Analysis verdict for this event.
        severity_score: Analysis severity score.
    """

    event_id: str
    timestamp: str
    city: str
    country: str
    verdict: str
    severity_score: int
