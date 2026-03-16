"""
feature_engineer.py — Feature Extraction for SENTINEL AI

This module converts raw login event dicts and a user's session history into
a numerical feature vector for use by the ML anomaly detection models.
All 7 features are computed and returned as a Python list of floats in a
fixed, documented order.
"""

import math
from datetime import datetime, timezone
from typing import List


# ---------------------------------------------------------------------------
# Haversine utility (shared with rule_engine.py)
# ---------------------------------------------------------------------------

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Compute the great-circle distance in kilometres between two geographic
    coordinates using the Haversine formula.

    Args:
        lat1: Latitude of point 1 in decimal degrees.
        lon1: Longitude of point 1 in decimal degrees.
        lat2: Latitude of point 2 in decimal degrees.
        lon2: Longitude of point 2 in decimal degrees.

    Returns:
        Distance in kilometres as a float.
    """
    R = 6371.0  # Earth's radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    d_phi = math.radians(lat2 - lat1)
    d_lam = math.radians(lon2 - lon1)
    a = math.sin(d_phi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(d_lam / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c


def _parse_ts(ts_str: str) -> datetime:
    """
    Parse an ISO 8601 timestamp string into a timezone-aware datetime.
    Handles ISO with T/space separators, microseconds, and timezone offsets.

    Args:
        ts_str: ISO 8601 datetime string.

    Returns:
        A timezone-aware datetime object in UTC. Falls back to current UTC 
        time if parsing fails.
    """
    if not ts_str or ts_str == "string":
        return datetime.utcnow().replace(tzinfo=timezone.utc)
    
    try:
        # Standardize Z to offset
        ts_str = ts_str.replace("Z", "+00:00")
        # Handle space separator (ISO 8601 allows T or space)
        if " " in ts_str and "T" not in ts_str:
            ts_str = ts_str.replace(" ", "T")
            
        dt = datetime.fromisoformat(ts_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except (ValueError, TypeError):
        print(f"WARNING: Could not parse timestamp '{ts_str}', using current UTC time as fallback")
        return datetime.utcnow().replace(tzinfo=timezone.utc)


# ---------------------------------------------------------------------------
# Feature computation helpers
# ---------------------------------------------------------------------------

def _feature_hour_deviation(event: dict, user_history: List[dict]) -> float:
    """
    Compute the normalized hour deviation of this event from the user's
    historical mean login hour.

    feature = abs(event_hour - mean_history_hour) / 12.0

    Args:
        event: The login event dict.
        user_history: List of prior login event dicts for this user.

    Returns:
        Float in [0, 1] (can slightly exceed 1 theoretically, but 12.0 denom
        covers the max possible deviation of 12 hours).
    """
    event_hour = _parse_ts(event["timestamp"]).hour
    if not user_history:
        return 0.0
    hours = [_parse_ts(e["timestamp"]).hour for e in user_history]
    mean_hour = sum(hours) / len(hours)
    return abs(event_hour - mean_hour) / 12.0


def _feature_geo_velocity(event: dict, user_history: List[dict]) -> float:
    """
    Compute normalized geographic velocity (km/hr) between this event and
    the most recent successful login in user_history.

    velocity = haversine_distance / hours_elapsed
    Capped at 2000.0 km/hr, then normalized by dividing by 2000.0.

    Args:
        event: The current login event dict.
        user_history: List of prior login event dicts.

    Returns:
        Float in [0, 1]. Higher = greater velocity = more suspicious.
    """
    # Find the last successful login
    prior_successful = [e for e in user_history if e.get("success", False)]
    if not prior_successful:
        return 0.0

    last = prior_successful[-1]
    event_ts = _parse_ts(event["timestamp"])
    last_ts = _parse_ts(last["timestamp"])

    elapsed_hours = (event_ts - last_ts).total_seconds() / 3600.0
    if elapsed_hours <= 0:
        return 0.0

    dist_km = haversine_km(
        last["latitude"], last["longitude"],
        event["latitude"], event["longitude"],
    )
    velocity = dist_km / elapsed_hours
    velocity = min(velocity, 2000.0)
    return velocity / 2000.0


def _feature_is_new_device(event: dict, user_history: List[dict]) -> float:
    """
    Return 1.0 if the (device_os, device_browser) combination of this event
    has never appeared in the user's history, else 0.0.

    Args:
        event: The current login event dict.
        user_history: List of prior login event dicts.

    Returns:
        1.0 (new device) or 0.0 (known device).
    """
    current_device = (event.get("device_os", ""), event.get("device_browser", ""))
    known_devices = {
        (e.get("device_os", ""), e.get("device_browser", ""))
        for e in user_history
    }
    return 1.0 if current_device not in known_devices else 0.0


def _feature_burst_score(event: dict, user_history: List[dict]) -> float:
    """
    Count the number of failed login events in user_history within the last
    5 minutes before this event, normalized by 20.0, capped at 1.0.

    Args:
        event: The current login event dict.
        user_history: List of prior login event dicts.

    Returns:
        Float in [0, 1]. Higher = more failed attempts recently.
    """
    event_ts = _parse_ts(event["timestamp"])
    window_seconds = 5 * 60

    burst_count = 0
    for e in user_history:
        if not e.get("success", True) or e.get("failure_count", 0) > 0:
            e_ts = _parse_ts(e["timestamp"])
            delta = (event_ts - e_ts).total_seconds()
            if 0 <= delta <= window_seconds:
                burst_count += 1

    return min(burst_count / 20.0, 1.0)


def _feature_is_new_country(event: dict, user_history: List[dict]) -> float:
    """
    Return 1.0 if the event's country has never appeared in user_history.

    Args:
        event: The current login event dict.
        user_history: List of prior login event dicts.

    Returns:
        1.0 (new country) or 0.0 (known country).
    """
    known_countries = {e.get("country", "") for e in user_history}
    return 1.0 if event.get("country", "") not in known_countries else 0.0


def _feature_days_since_last_login(event: dict, user_history: List[dict]) -> float:
    """
    Return normalized days since the user's last successful login.

    Normalized by dividing by 90.0, capped at 1.0.
    Returns 0.0 if no prior successful login exists.

    Args:
        event: The current login event dict.
        user_history: List of prior login event dicts.

    Returns:
        Float in [0, 1].
    """
    prior_successful = [e for e in user_history if e.get("success", False)]
    if not prior_successful:
        return 0.0

    event_ts = _parse_ts(event["timestamp"])
    last_ts = _parse_ts(prior_successful[-1]["timestamp"])
    days = (event_ts - last_ts).total_seconds() / 86400.0
    return min(days / 90.0, 1.0)


def _feature_failure_ratio(event: dict) -> float:
    """
    Return the normalized failure count for this event.

    Computed as min(failure_count, 20) / 20.0.

    Args:
        event: The current login event dict.

    Returns:
        Float in [0, 1].
    """
    failure_count = event.get("failure_count", 0)
    return min(failure_count, 20) / 20.0


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_feature_names() -> List[str]:
    """
    Return the ordered list of 7 feature names produced by extract_features().

    Returns:
        List of 7 feature name strings in the canonical order.
    """
    return [
        "hour_deviation",
        "geo_velocity",
        "is_new_device",
        "burst_score",
        "is_new_country",
        "days_since_last_login",
        "failure_ratio",
    ]


def extract_features(event: dict, user_history: List[dict]) -> List[float]:
    """
    Extract a 7-element numerical feature vector from a login event and the
    user's session history prior to that event.

    Features (in order):
        1. hour_deviation             — how unusual the login time is
        2. geo_velocity               — speed of location change (km/hr)
        3. is_new_device              — 1.0 if unseen device combination
        4. burst_score                — density of recent failed logins
        5. is_new_country             — 1.0 if unseen country
        6. days_since_last_login      — how long the account was dormant
        7. failure_ratio              — normalized failure count on this event

    Args:
        event: The login event dict to analyze.
        user_history: List of all prior login event dicts for this user,
                      in chronological order up to (but not including) event.

    Returns:
        A Python list of 7 floats, each in [0, 1]. Returns all zeros on failure.
    """
    
    # Defensive validation: fix missing/invalid timestamps before processing
    ts = event.get("timestamp")
    if not ts or ts == "string":
        print(f"WARNING: Invalid main event timestamp '{ts}', replacing with current UTC time.")
        event["timestamp"] = datetime.utcnow().replace(tzinfo=timezone.utc).isoformat()

    try:
        return [
            _feature_hour_deviation(event, user_history),
            _feature_geo_velocity(event, user_history),
            _feature_is_new_device(event, user_history),
            _feature_burst_score(event, user_history),
            _feature_is_new_country(event, user_history),
            _feature_days_since_last_login(event, user_history),
            _feature_failure_ratio(event),
        ]
    except Exception as e:
        print(f"ERROR: Exception during feature extraction for event {event.get('event_id')}: {e}")
        return [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0]
