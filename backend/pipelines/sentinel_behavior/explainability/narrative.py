"""
explainability/narrative.py — Groq LLM Narrative Generator for SENTINEL AI

This module generates a human-readable 3-sentence threat narrative using
the Groq API (Llama 3 70B model). The narrative is targeted at Security
Operations Center analysts: precise, data-driven, and free of ML jargon.

If GROQ_API_KEY is missing or if the API call fails or times out, a
deterministic fallback string is returned instead — the app never crashes
due to a missing API key.
"""

from dotenv import load_dotenv
load_dotenv()

import os
import warnings
from typing import List

# ---------------------------------------------------------------------------
# Groq client — optional, falls back gracefully
# ---------------------------------------------------------------------------
try:
    from groq import Groq, APIError, APITimeoutError
    _GROQ_AVAILABLE = True
except ImportError:
    Groq = None  # type: ignore
    _GROQ_AVAILABLE = False
    warnings.warn(
        "groq package not installed. Narrative generation will use fallback mode.",
        RuntimeWarning,
        stacklevel=2,
    )


# ---------------------------------------------------------------------------
# System prompt (exact text from specification)
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = (
    "You are SENTINEL AI, a cybersecurity threat explainer "
    "for a Security Operations Center. "
    "You receive structured threat analysis data and produce "
    "a precise, factual 3-sentence explanation for security analysts. "
    "Sentence 1: State exactly what type of threat was detected, "
    "the severity, and the primary evidence (be specific with "
    "numbers, locations, times from the data given to you). "
    "Sentence 2: List the top 2-3 specific features or rules "
    "that triggered the alert, explaining what each means "
    "in plain English with the actual values. "
    "Sentence 3: Give one specific, actionable mitigation step "
    "appropriate for this exact threat type and severity level. "
    "Never say 'SHAP value' or 'feature attribution' or "
    "'isolation forest' or 'autoencoder' — speak like a "
    "senior security analyst, not a data scientist. "
    "Output ONLY the 3 sentences. No preamble, no labels, "
    "no markdown."
)

# ---------------------------------------------------------------------------
# Rule tag -> plain English descriptions
# ---------------------------------------------------------------------------

_RULE_PLAIN_ENGLISH = {
    "IMPOSSIBLE_TRAVEL": "Impossible travel — login from two geographically distant locations within a physically impossible timeframe",
    "CREDENTIAL_STUFFING_BURST": "Credential stuffing — rapid succession of failed login attempts from the same IP address",
    "NEW_DEVICE_NEW_COUNTRY": "New device from new country — first-time device and first-time country combination",
    "OFF_HOURS_NEW_DEVICE": "Off-hours new device — login between midnight and 5am from an unrecognized device",
    "DORMANT_ACCOUNT_REACTIVATION": "Dormant account reactivation — account inactive for over 60 days, now accessed from a new device",
}


def _build_user_message(
    threat_type: str,
    severity_score: int,
    confidence: float,
    rules_fired: List[str],
    shap_features: List[dict],
    event: dict,
) -> str:
    """
    Build the structured user-facing prompt for the Groq LLM.

    Args:
        threat_type: The primary threat classification string.
        severity_score: Severity 0-100.
        confidence: Confidence probability in [0, 1].
        rules_fired: List of rule tag strings that fired.
        shap_features: Top SHAP feature dicts with "label" and "shap_value".
        event: The raw login event dict.

    Returns:
        Formatted user message string for the LLM.
    """
    rules_plain = "\n".join(
        f"  - {_RULE_PLAIN_ENGLISH.get(r, r)}"
        for r in rules_fired
    ) or "  - None"

    top3_shap = shap_features[:3]
    shap_text = "\n".join(
        f"  - {f.get('label', f.get('feature', '?'))}: {f.get('shap_value', 0.0):.4f} ({f.get('direction', '?')} contributor)"
        for f in top3_shap
    ) or "  - N/A"

    ts = event.get("timestamp", "unknown time")
    city = event.get("city", "unknown city")
    country = event.get("country", "unknown country")
    device = f"{event.get('device_os', '?')} / {event.get('device_browser', '?')}"

    message = (
        f"THREAT ANALYSIS REPORT\n"
        f"======================\n"
        f"Threat Type: {threat_type}\n"
        f"Severity Score: {severity_score}/100\n"
        f"Confidence: {confidence * 100:.1f}%\n\n"
        f"Triggered Security Rules:\n{rules_plain}\n\n"
        f"Top Behavioral Signals:\n{shap_text}\n\n"
        f"Login Event Details:\n"
        f"  - Timestamp: {ts}\n"
        f"  - Location: {city}, {country}\n"
        f"  - Device: {device}\n"
    )
    return message


def generate_narrative(
    threat_type: str,
    severity_score: int,
    confidence: float,
    rules_fired: List[str],
    shap_features: List[dict],
    event: dict,
) -> str:
    """
    Generate a 3-sentence SOC analyst narrative for a detected threat.
    """
    load_dotenv()
    api_key = os.getenv("GROQ_API_KEY")
    print(f"DEBUG: API KEY FOUND: {bool(api_key)}")

    if not api_key:
        print("WARNING: GROQ_API_KEY not set. Using fallback narrative.")
        return _fallback_narrative(rules_fired, severity_score)

    if not _GROQ_AVAILABLE:
        print("WARNING: groq package not available. Using fallback narrative.")
        return _fallback_narrative(rules_fired, severity_score)

    user_message = _build_user_message(
        threat_type, severity_score, confidence,
        rules_fired, shap_features, event,
    )

    try:
        from groq import Groq
        client = Groq(api_key=api_key)
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.15,
            max_tokens=220,
        )
        content = response.choices[0].message.content
        narrative = content.strip() if content else ""
        return narrative
    except Exception as e:
        print(f"GROQ ERROR: {type(e).__name__}: {e}")
        return _fallback_narrative(rules_fired, severity_score)


def _fallback_narrative(rules_fired: List[str], severity_score: int) -> str:
    """
    Return a deterministic fallback narrative when the Groq API is unavailable.

    Args:
        rules_fired: List of rule tag strings.
        severity_score: Integer severity score 0-100.

    Returns:
        A concise fallback narrative string.
    """
    if rules_fired:
        return (
            f"Login flagged: {', '.join(rules_fired)}. "
            f"Severity: {severity_score}/100. "
            f"Review this session immediately."
        )
    return (
        f"Anomalous login pattern detected with severity {severity_score}/100. "
        f"Behavioral baseline deviation observed across multiple signals. "
        f"Investigate the associated session and consider MFA re-verification."
    )
