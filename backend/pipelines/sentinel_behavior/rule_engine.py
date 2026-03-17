"""
rule_engine.py — Deterministic Rule Engine for SENTINEL AI

This module implements 5 hard-coded security rules that fire when specific,
deterministic conditions are met in a login event. Fired rules boost the
overall severity score and provide human-readable alert tags.

Rules are evaluated independently and their score boosts are summed (capped
at 60). The result is combined later with ML model scores by scorer.py.
"""

from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple

from .feature_engineer import (
    haversine_km,
    _parse_ts,
    _feature_is_new_device,
    _feature_is_new_country,
    _feature_days_since_last_login,
)


# ---------------------------------------------------------------------------
# Rule definitions: (tag, score_boost)
# ---------------------------------------------------------------------------

_RULE_IMPOSSIBLE_TRAVEL = ("IMPOSSIBLE_TRAVEL", 45)
_RULE_CREDENTIAL_STUFFING = ("CREDENTIAL_STUFFING_BURST", 40)
_RULE_NEW_DEVICE_COUNTRY = ("NEW_DEVICE_NEW_COUNTRY", 30)
_RULE_OFF_HOURS_NEW_DEVICE = ("OFF_HOURS_NEW_DEVICE", 25)
_RULE_DORMANT_ACCOUNT = ("DORMANT_ACCOUNT_REACTIVATION", 20)

_MAX_SCORE_BOOST = 60


# ---------------------------------------------------------------------------
# Individual rule check functions
# ---------------------------------------------------------------------------

def _check_impossible_travel(event: dict, user_history: List[dict]) -> Optional[Tuple[str, int]]:
    """
    RULE_1: IMPOSSIBLE_TRAVEL
    Fire if geographic velocity between the current event and the last
    successful login exceeds 900 km/hr.

    Args:
        event: The current login event.
        user_history: Prior login events for this user.

    Returns:
        (tag, boost) tuple if rule fires, else None.
    """
    prior_successful = [e for e in user_history if e.get("success", False)]
    if not prior_successful:
        return None

    last = prior_successful[-1]
    event_ts = _parse_ts(event["timestamp"])
    last_ts = _parse_ts(last["timestamp"])
    elapsed_hours = (event_ts - last_ts).total_seconds() / 3600.0

    if elapsed_hours <= 0:
        return None

    dist_km = haversine_km(
        last["latitude"], last["longitude"],
        event["latitude"], event["longitude"],
    )
    velocity = dist_km / elapsed_hours

    if velocity > 900.0:
        return _RULE_IMPOSSIBLE_TRAVEL
    return None


def _check_credential_stuffing(event: dict, user_history: List[dict]) -> Optional[Tuple[str, int]]:
    """
    RULE_2: CREDENTIAL_STUFFING_BURST
    Fire if more than 8 failed logins from the same IP occurred in the last
    5 minutes before this event.

    Args:
        event: The current login event.
        user_history: Prior login events for this user.

    Returns:
        (tag, boost) tuple if rule fires, else None.
    """
    event_ts = _parse_ts(event["timestamp"])
    event_ip = event.get("ip", "")
    window_seconds = 5 * 60

    count = 0
    for e in user_history:
        if e.get("ip") == event_ip and not e.get("success", True):
            e_ts = _parse_ts(e["timestamp"])
            delta = (event_ts - e_ts).total_seconds()
            if 0 <= delta <= window_seconds:
                count += 1

    if count > 8:
        return _RULE_CREDENTIAL_STUFFING
    return None


def _check_new_device_new_country(event: dict, user_history: List[dict]) -> Optional[Tuple[str, int]]:
    """
    RULE_3: NEW_DEVICE_NEW_COUNTRY
    Fire if both the device combination and the country are unseen in history.

    Args:
        event: The current login event.
        user_history: Prior login events for this user.

    Returns:
        (tag, boost) tuple if rule fires, else None.
    """
    is_new_device = _feature_is_new_device(event, user_history)
    is_new_country = _feature_is_new_country(event, user_history)

    if is_new_device == 1.0 and is_new_country == 1.0:
        return _RULE_NEW_DEVICE_COUNTRY
    return None


def _check_off_hours_new_device(event: dict, user_history: List[dict]) -> Optional[Tuple[str, int]]:
    """
    RULE_4: OFF_HOURS_NEW_DEVICE
    Fire if the login is between midnight and 5am AND from a new device.

    Args:
        event: The current login event.
        user_history: Prior login events for this user.

    Returns:
        (tag, boost) tuple if rule fires, else None.
    """
    event_hour = _parse_ts(event["timestamp"]).hour
    is_new_device = _feature_is_new_device(event, user_history)

    if 0 <= event_hour < 5 and is_new_device == 1.0:
        return _RULE_OFF_HOURS_NEW_DEVICE
    return None


def _check_dormant_account(event: dict, user_history: List[dict]) -> Optional[Tuple[str, int]]:
    """
    RULE_5: DORMANT_ACCOUNT_REACTIVATION
    Fire if the account has been inactive for more than 60 days AND the
    current event uses a new device.

    Args:
        event: The current login event.
        user_history: Prior login events for this user.

    Returns:
        (tag, boost) tuple if rule fires, else None.
    """
    days_norm = _feature_days_since_last_login(event, user_history)
    days = days_norm * 90.0  # un-normalize: normalized by /90, so multiply back
    is_new_device = _feature_is_new_device(event, user_history)

    if days > 60 and is_new_device == 1.0:
        return _RULE_DORMANT_ACCOUNT
    return None


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def run_rules(event: dict, user_history: List[dict]) -> Dict:
    """
    Evaluate all 5 security rules against the given login event and user
    history. Returns a summary dict with fired tags, total score boost, and
    the highest-severity rule that fired.

    Rules evaluated (in order):
        1. IMPOSSIBLE_TRAVEL          — geo velocity > 900 km/hr
        2. CREDENTIAL_STUFFING_BURST  — >8 failed logins from same IP in 5min
        3. NEW_DEVICE_NEW_COUNTRY     — new device AND new country simultaneously
        4. OFF_HOURS_NEW_DEVICE       — midnight-5am login from new device
        5. DORMANT_ACCOUNT_REACTIVATION — inactive >60 days, new device login

    Args:
        event: The login event dict to evaluate.
        user_history: List of all prior login event dicts for this user,
                      in chronological order up to (but not including) event.

    Returns:
        A dict with keys:
            "rules_fired" (list[str]): Tags of all triggered rules.
            "rule_score_boost" (int): Sum of boosts, capped at 60.
            "highest_severity_rule" (str | None): Tag of the highest-boost rule.
    """
    rule_checks = [
        _check_impossible_travel(event, user_history),
        _check_credential_stuffing(event, user_history),
        _check_new_device_new_country(event, user_history),
        _check_off_hours_new_device(event, user_history),
        _check_dormant_account(event, user_history),
    ]

    fired: List[Tuple[str, int]] = [r for r in rule_checks if r is not None]

    rules_fired_tags = [tag for tag, _ in fired]
    total_boost = min(sum(boost for _, boost in fired), _MAX_SCORE_BOOST)

    highest: Optional[str] = None
    if fired:
        highest = max(fired, key=lambda x: x[1])[0]

    return {
        "rules_fired": rules_fired_tags,
        "rule_score_boost": total_boost,
        "highest_severity_rule": highest,
    }
