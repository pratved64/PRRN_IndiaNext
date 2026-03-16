"""
scorer.py — Ensemble Score Fusion for SENTINEL AI

This module fuses the anomaly scores from the Isolation Forest (IF) and
Autoencoder (AE) models with the rule engine's score boost to produce a
single authoritative severity score, verdict, and confidence level.

Weighted fusion: IF contributes 45%, AE contributes 35%, rules contribute
up to 20%. Certain rules (IMPOSSIBLE_TRAVEL, CREDENTIAL_STUFFING_BURST)
impose hard minimum scores to prevent under-counting severe attacks.
"""

from typing import Dict, List


# ---------------------------------------------------------------------------
# Recommended actions by verdict
# ---------------------------------------------------------------------------

_RECOMMENDED_ACTIONS = {
    "MALICIOUS": (
        "Force immediate session termination. "
        "Trigger MFA re-authentication. "
        "Notify account owner via registered email. "
        "Escalate to Tier-2 SOC analyst."
    ),
    "SUSPICIOUS": (
        "Flag session for manual review. "
        "Send account owner a security alert email. "
        "Monitor subsequent activity closely."
    ),
    "SAFE": "No action required. Session logged for baseline.",
}


def fuse_scores(
    if_score: float,
    ae_score: float,
    rule_result: Dict,
) -> Dict:
    """
    Fuse Isolation Forest, Autoencoder, and rule engine scores into a single
    severity verdict for a login event.

    Fusion formula:
        base_score = (if_score * 0.45) + (ae_score * 0.35)
        rule_boost = rule_score_boost / 100.0 * 0.20
        overrides:
            IMPOSSIBLE_TRAVEL       → base_score = max(base_score, 0.80)
            CREDENTIAL_STUFFING_BURST → base_score = max(base_score, 0.75)
        raw_score = min((base_score + rule_boost) * 100, 100)
        severity_score = round(raw_score)

    Verdict thresholds:
        >= 70 → MALICIOUS
        >= 40 → SUSPICIOUS
        else  → SAFE

    Confidence:
        rules fired    → 0.92
        severity >= 70 → 0.85
        severity >= 40 → 0.71
        else           → 0.94

    Args:
        if_score: Isolation Forest anomaly score, float in [0, 1].
        ae_score: Autoencoder anomaly score, float in [0, 1].
        rule_result: Dict from run_rules() with keys:
                         "rules_fired"           (list[str])
                         "rule_score_boost"      (int)
                         "highest_severity_rule" (str | None)

    Returns:
        Dict with keys:
            "severity_score"   (int):   0-100
            "verdict"          (str):   "MALICIOUS" | "SUSPICIOUS" | "SAFE"
            "confidence"       (float): probability
            "if_contribution"  (float): IF's contribution in 0-100 points
            "ae_contribution"  (float): AE's contribution in 0-100 points
            "rule_contribution"(float): rule boost contribution in 0-100 points
    """
    rules_fired: List[str] = rule_result.get("rules_fired", [])
    rule_score_boost: int = rule_result.get("rule_score_boost", 0)

    # Weighted base score (max possible: 0.45 + 0.35 = 0.80)
    base_score = (if_score * 0.45) + (ae_score * 0.35)

    # Hard overrides for the most dangerous rule types
    if "IMPOSSIBLE_TRAVEL" in rules_fired:
        base_score = max(base_score, 0.80)
    if "CREDENTIAL_STUFFING_BURST" in rules_fired:
        base_score = max(base_score, 0.75)

    # Rule boost: up to 0.20 on top
    rule_boost = (rule_score_boost / 100.0) * 0.20

    # Final score
    raw_score = min((base_score + rule_boost) * 100.0, 100.0)
    severity_score = int(round(raw_score))

    # Verdict
    if severity_score >= 70:
        verdict = "MALICIOUS"
    elif severity_score >= 40:
        verdict = "SUSPICIOUS"
    else:
        verdict = "SAFE"

    # Confidence
    if len(rules_fired) > 0:
        confidence = 0.92
    elif severity_score >= 70:
        confidence = 0.85
    elif severity_score >= 40:
        confidence = 0.71
    else:
        confidence = 0.94

    return {
        "severity_score": severity_score,
        "verdict": verdict,
        "confidence": confidence,
        "if_contribution": round(if_score * 0.45 * 100, 1),
        "ae_contribution": round(ae_score * 0.35 * 100, 1),
        "rule_contribution": round(rule_boost * 100, 1),
    }


def get_recommended_action(verdict: str) -> str:
    """
    Return the recommended SOC action string for a given verdict.

    Args:
        verdict: One of "MALICIOUS", "SUSPICIOUS", "SAFE".

    Returns:
        Human-readable action string.
    """
    return _RECOMMENDED_ACTIONS.get(verdict, "Review session manually.")
