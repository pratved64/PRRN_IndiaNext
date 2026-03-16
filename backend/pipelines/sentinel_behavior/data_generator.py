"""
data_generator.py — Synthetic Login Data Generator for SENTINEL AI

This module generates in-memory synthetic login event data for three simulated
users (user_001, user_002, user_003), each with 200 normal sessions reflecting
their typical login behavior. It also injects exactly 5 predefined attack
scenarios into the dataset for demo and testing purposes.

All data is stored in Python dicts/lists — no database is used.
"""

import uuid
import random
from datetime import datetime, timedelta, timezone
from typing import Dict, List


# ---------------------------------------------------------------------------
# Constants — User Profiles
# ---------------------------------------------------------------------------

USER_PROFILES = {
    "user_001": {
        "city": "Mumbai",
        "country": "India",
        "latitude": 19.0760,
        "longitude": 72.8777,
        "device_os": "Windows",
        "device_browser": "Chrome",
        "login_hour_start": 9,   # 9am IST
        "login_hour_end": 19,    # 7pm IST
        "ip_prefix": "192.168.1",
    },
    "user_002": {
        "city": "Bangalore",
        "country": "India",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "device_os": "MacOS",
        "device_browser": "Firefox",
        "login_hour_start": 10,  # 10am IST
        "login_hour_end": 20,    # 8pm IST
        "ip_prefix": "192.168.2",
    },
    "user_003": {
        "city": "Delhi",
        "country": "India",
        "latitude": 28.6139,
        "longitude": 77.2090,
        "device_os": "iPhone",
        "device_browser": "Safari",
        "login_hour_start": 8,   # 8am IST
        "login_hour_end": 18,    # 6pm IST
        "ip_prefix": "192.168.3",
    },
}

# Reference date for generating sessions (90 days up to 2025-03-15)
_BASE_DATE = datetime(2025, 3, 15, tzinfo=timezone.utc)
_SESSION_DAYS = 90  # normal sessions span last 90 days
_NORMAL_SESSION_COUNT = 200


# ---------------------------------------------------------------------------
# Helper — single normal login event
# ---------------------------------------------------------------------------

def _make_normal_event(user_id: str, timestamp: datetime) -> dict:
    """
    Create one synthetic normal login event dict for the given user.

    Args:
        user_id: The user identifier string.
        timestamp: The datetime for this login event.

    Returns:
        A dict with all required login event keys.
    """
    profile = USER_PROFILES[user_id]
    ip_last_octet = random.randint(1, 254)
    return {
        "event_id": str(uuid.uuid4()),
        "user_id": user_id,
        "timestamp": timestamp.isoformat(),
        "ip": f"{profile['ip_prefix']}.{ip_last_octet}",
        "latitude": profile["latitude"] + random.uniform(-0.005, 0.005),
        "longitude": profile["longitude"] + random.uniform(-0.005, 0.005),
        "city": profile["city"],
        "country": profile["country"],
        "device_os": profile["device_os"],
        "device_browser": profile["device_browser"],
        "success": True,
        "failure_count": 0,
        "session_duration_mins": random.randint(5, 45),
        "is_vpn": False,
    }


# ---------------------------------------------------------------------------
# Helper — generate all normal sessions for one user
# ---------------------------------------------------------------------------

def _generate_normal_sessions(user_id: str) -> List[dict]:
    """
    Generate exactly 200 normal login sessions for a given user.

    Sessions are spread across the last 90 days with login hours matching
    the user's typical window.

    Args:
        user_id: The user identifier string.

    Returns:
        A list of 200 login event dicts in chronological order.
    """
    profile = USER_PROFILES[user_id]
    sessions = []
    random.seed(hash(user_id) % (2**31))  # reproducible per user

    for i in range(_NORMAL_SESSION_COUNT):
        # Spread sessions across 90 days
        day_offset = int(i * _SESSION_DAYS / _NORMAL_SESSION_COUNT)
        base_day = _BASE_DATE - timedelta(days=_SESSION_DAYS - day_offset)
        # Random hour within user's login window
        login_hour = random.randint(profile["login_hour_start"], profile["login_hour_end"] - 1)
        login_minute = random.randint(0, 59)
        ts = base_day.replace(hour=login_hour, minute=login_minute, second=random.randint(0, 59))
        sessions.append(_make_normal_event(user_id, ts))

    sessions.sort(key=lambda e: e["timestamp"])
    return sessions


# ---------------------------------------------------------------------------
# Attack Scenario Events
# ---------------------------------------------------------------------------

# ATTACK_1 — Impossible Travel (user_001)
_ATTACK_1_NORMAL = {
    "event_id": str(uuid.uuid4()),
    "user_id": "user_001",
    "timestamp": "2025-03-16T22:00:00+00:00",
    "ip": "192.168.1.100",
    "latitude": 19.0760,
    "longitude": 72.8777,
    "city": "Mumbai",
    "country": "India",
    "device_os": "Windows",
    "device_browser": "Chrome",
    "success": True,
    "failure_count": 0,
    "session_duration_mins": 20,
    "is_vpn": False,
}

ATTACK_1 = {
    "event_id": str(uuid.uuid4()),
    "user_id": "user_001",
    "timestamp": "2025-03-16T22:28:00+00:00",
    "ip": "82.117.45.33",
    "latitude": 51.5074,
    "longitude": -0.1278,
    "city": "London",
    "country": "United Kingdom",
    "device_os": "Windows",
    "device_browser": "Edge",
    "success": True,
    "failure_count": 0,
    "session_duration_mins": 15,
    "is_vpn": False,
}

# ATTACK_2 — Credential Stuffing Burst (user_002)
# 15 failed login attempts within 90 seconds from 45.33.32.156
def _make_attack_2_events() -> List[dict]:
    """
    Generate 15 failed login attempts for user_002 simulating credential stuffing.

    Returns:
        List of 15 attack event dicts.
    """
    events = []
    base_ts = datetime(2025, 3, 16, 3, 0, 0, tzinfo=timezone.utc)
    for i in range(1, 16):
        offset_secs = int((i - 1) * (90 / 15))  # spread across 90 seconds
        ts = base_ts + timedelta(seconds=offset_secs)
        events.append({
            "event_id": str(uuid.uuid4()),
            "user_id": "user_002",
            "timestamp": ts.isoformat(),
            "ip": "45.33.32.156",
            "latitude": 12.9716,
            "longitude": 77.5946,
            "city": "Bangalore",
            "country": "India",
            "device_os": "MacOS",
            "device_browser": "Firefox",
            "success": False,
            "failure_count": i,
            "session_duration_mins": 0,
            "is_vpn": False,
        })
    return events


ATTACK_2_EVENTS = _make_attack_2_events()
# The "representative" attack event for DEMO_ATTACK_EVENTS is the last one (highest failure_count)
ATTACK_2 = ATTACK_2_EVENTS[-1]

# ATTACK_3 — New Device + New Country at 3am (user_003)
ATTACK_3 = {
    "event_id": str(uuid.uuid4()),
    "user_id": "user_003",
    "timestamp": "2025-03-16T03:17:00+00:00",
    "ip": "197.210.55.12",
    "latitude": 6.5244,
    "longitude": 3.3792,
    "city": "Lagos",
    "country": "Nigeria",
    "device_os": "Android",
    "device_browser": "Chrome",
    "success": True,
    "failure_count": 0,
    "session_duration_mins": 8,
    "is_vpn": False,
}

# ATTACK_4 — Dormant Account Reactivation (user_001)
ATTACK_4 = {
    "event_id": str(uuid.uuid4()),
    "user_id": "user_001",
    "timestamp": "2025-03-16T14:00:00+00:00",
    "ip": "94.200.15.77",
    "latitude": 25.2048,
    "longitude": 55.2708,
    "city": "Dubai",
    "country": "United Arab Emirates",
    "device_os": "MacOS",
    "device_browser": "Safari",
    "success": True,
    "failure_count": 0,
    "session_duration_mins": 25,
    "is_vpn": False,
}

# ATTACK_5 — Contextual Anomaly (user_002) — normal hour/location, suspicious device+VPN+failures
ATTACK_5 = {
    "event_id": str(uuid.uuid4()),
    "user_id": "user_002",
    "timestamp": "2025-03-16T11:00:00+00:00",
    "ip": "12.34.56.78",
    "latitude": 12.9716,
    "longitude": 77.5946,
    "city": "Bangalore",
    "country": "India",
    "device_os": "Linux",
    "device_browser": "Tor Browser",
    "success": True,
    "failure_count": 3,
    "session_duration_mins": 12,
    "is_vpn": True,
}

# The 5 canonical attack events used by demo scenarios and API
DEMO_ATTACK_EVENTS: List[dict] = [
    ATTACK_1,
    ATTACK_2,
    ATTACK_3,
    ATTACK_4,
    ATTACK_5,
]


# ---------------------------------------------------------------------------
# In-memory session store
# ---------------------------------------------------------------------------

def _build_all_sessions() -> Dict[str, List[dict]]:
    """
    Build the full in-memory session store for all 3 users.

    Each user gets their 200 normal sessions plus the injected attack events
    relevant to them (sorted by timestamp).

    Returns:
        Dict mapping user_id -> list of all that user's login events.
    """
    sessions: Dict[str, List[dict]] = {}

    for user_id in USER_PROFILES:
        normal = _generate_normal_sessions(user_id)
        sessions[user_id] = list(normal)

    # Inject attack events into respective users
    # Attack 1: user_001 — first inject the "just before" normal event at 22:00,
    #   then the attack at 22:28
    sessions["user_001"].append(_ATTACK_1_NORMAL)
    sessions["user_001"].append(ATTACK_1)
    # Attack 2: user_002 — all 15 burst attempts
    sessions["user_002"].extend(ATTACK_2_EVENTS)
    # Attack 3: user_003
    sessions["user_003"].append(ATTACK_3)
    # Attack 4: user_001
    sessions["user_001"].append(ATTACK_4)
    # Attack 5: user_002
    sessions["user_002"].append(ATTACK_5)

    # Sort each user's sessions by timestamp
    for uid in sessions:
        sessions[uid].sort(key=lambda e: e["timestamp"])

    return sessions


# Module-level singleton — built once at import time
_ALL_SESSIONS: Dict[str, List[dict]] = _build_all_sessions()


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def get_all_sessions() -> Dict[str, List[dict]]:
    """
    Return the complete in-memory session store for all users.

    Returns:
        Dict mapping user_id -> list of all login event dicts for that user.
    """
    return _ALL_SESSIONS


def get_user_normal_sessions(user_id: str) -> List[dict]:
    """
    Return only the non-attack (normal baseline) sessions for a given user.

    This is used for training the anomaly detection models so that the
    baselines are built purely from normal behavior.

    Args:
        user_id: The user identifier.

    Returns:
        List of login event dicts that are NOT attack events.
    """
    attack_event_ids = {e["event_id"] for e in DEMO_ATTACK_EVENTS}
    # Also exclude the credential stuffing burst events
    attack_event_ids.update(e["event_id"] for e in ATTACK_2_EVENTS)
    # Exclude the "prior" Mumbai event used to set up Impossible Travel context
    attack_event_ids.add(_ATTACK_1_NORMAL["event_id"])

    all_user_sessions = _ALL_SESSIONS.get(user_id, [])
    return [s for s in all_user_sessions if s["event_id"] not in attack_event_ids]
