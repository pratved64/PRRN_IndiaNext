"""
explainability/shap_explainer.py — SHAP Explainability Wrapper for SENTINEL AI

This module wraps the SHAP computation from the IsolationForest module and
provides a display-ready formatter. It converts raw SHAP values into a concise
list of the top 5 features annotated with human-readable labels, rounded
values, and magnitude scores for UI ranking.
"""

from typing import List

# ---------------------------------------------------------------------------
# Feature name -> human-readable label mapping
# ---------------------------------------------------------------------------

_FEATURE_LABELS = {
    "hour_deviation": "Time of day deviation",
    "geo_velocity": "Geographic velocity (km/hr)",
    "is_new_device": "New device detected",
    "burst_score": "Login burst frequency",
    "is_new_country": "New country detected",
    "days_since_last_login": "Days since last login",
    "failure_ratio": "Recent failure rate",
}


def format_shap_for_display(shap_values: List[dict]) -> List[dict]:
    """
    Format raw SHAP values for display in the API response.

    Takes the full list of SHAP feature dicts (as produced by
    UserIsolationForest.get_shap_values()) and returns only the top 5
    features by absolute magnitude, enriched with additional display fields.

    Processing:
        - Limits to top 5 features (already sorted by abs descending).
        - Rounds shap_value to 4 decimal places.
        - Adds "magnitude" = abs(shap_value) for front-end bar chart use.
        - Adds "label" = human-readable string for the feature name.

    Args:
        shap_values: List of dicts with keys "feature", "shap_value",
                     "direction". Already sorted by abs(shap_value) descending.

    Returns:
        List of up to 5 dicts, each with:
            "feature"    (str): raw feature name
            "label"      (str): human-readable label
            "shap_value" (float): rounded to 4 decimal places
            "direction"  (str): "risk" or "safe"
            "magnitude"  (float): abs(shap_value), rounded to 4 dp
    """
    top5 = shap_values[:5]
    result = []
    for item in top5:
        sv = round(item["shap_value"], 4)
        result.append({
            "feature": item["feature"],
            "label": _FEATURE_LABELS.get(item["feature"], item["feature"]),
            "shap_value": sv,
            "direction": item["direction"],
            "magnitude": round(abs(sv), 4),
        })
    return result


def get_feature_label(feature_name: str) -> str:
    """
    Return the human-readable label for a given feature name.

    Args:
        feature_name: The raw snake_case feature key.

    Returns:
        Human-readable label string, or the feature_name itself if not found.
    """
    return _FEATURE_LABELS.get(feature_name, feature_name)
