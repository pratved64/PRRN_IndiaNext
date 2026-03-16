"""
demo_scenarios.py — Pre-Built Attack Scenarios for SENTINEL AI

This module exposes a list of 5 DemoScenario Pydantic objects, one per
canonical attack event from data_generator.DEMO_ATTACK_EVENTS. Each scenario
provides human-readable metadata alongside the associated LoginEvent so that
the /demo/{scenario_id} endpoint can run complete analyses instantly.
"""

import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from data_generator import DEMO_ATTACK_EVENTS
from schemas import DemoScenario, LoginEvent


def _event_to_login_event(event: dict) -> LoginEvent:
    """
    Convert a raw event dict (from data_generator) to a LoginEvent Pydantic model.

    Args:
        event: Raw login event dict with all required keys.

    Returns:
        Validated LoginEvent instance.
    """
    return LoginEvent(
        event_id=event["event_id"],
        user_id=event["user_id"],
        timestamp=event["timestamp"],
        ip=event["ip"],
        latitude=event["latitude"],
        longitude=event["longitude"],
        city=event["city"],
        country=event["country"],
        device_os=event["device_os"],
        device_browser=event["device_browser"],
        success=event["success"],
        failure_count=event["failure_count"],
        session_duration_mins=event["session_duration_mins"],
        is_vpn=event.get("is_vpn", False),
    )


# ---------------------------------------------------------------------------
# The 5 DEMO_SCENARIOS list
# ---------------------------------------------------------------------------

DEMO_SCENARIOS = [
    DemoScenario(
        scenario_id="scenario_1",
        name="Impossible Travel — Mumbai to London",
        description=(
            "user_001 logs in from Mumbai at 22:00 UTC and then from London "
            "just 28 minutes later — physically impossible at ~6,800 km apart."
        ),
        attack_type="IMPOSSIBLE_TRAVEL",
        event=_event_to_login_event(DEMO_ATTACK_EVENTS[0]),
    ),
    DemoScenario(
        scenario_id="scenario_2",
        name="Credential Stuffing Burst — 15 Failures in 90 Seconds",
        description=(
            "user_002's account receives 15 consecutive failed login attempts "
            "from IP 45.33.32.156 within a 90-second window at 3am."
        ),
        attack_type="CREDENTIAL_STUFFING",
        event=_event_to_login_event(DEMO_ATTACK_EVENTS[1]),
    ),
    DemoScenario(
        scenario_id="scenario_3",
        name="New Device & New Country at 3am — Lagos, Nigeria",
        description=(
            "user_003 logs in at 3:17am from Lagos, Nigeria using Chrome/Android — "
            "a device and country never seen in their profile."
        ),
        attack_type="NEW_DEVICE_NIGHT",
        event=_event_to_login_event(DEMO_ATTACK_EVENTS[2]),
    ),
    DemoScenario(
        scenario_id="scenario_4",
        name="Dormant Account Reactivation — Dubai Login After 95 Days",
        description=(
            "user_001's account was inactive for 95 days and is now accessed "
            "from Dubai on an unrecognized Safari/MacOS device."
        ),
        attack_type="DORMANT_REACTIVATION",
        event=_event_to_login_event(DEMO_ATTACK_EVENTS[3]),
    ),
    DemoScenario(
        scenario_id="scenario_5",
        name="Contextual Anomaly — Tor Browser + VPN at Normal Hour",
        description=(
            "user_002 logs in at their typical time from their usual city, "
            "but uses Linux/Tor Browser with a VPN and had 3 failures first."
        ),
        attack_type="CONTEXTUAL_ANOMALY",
        event=_event_to_login_event(DEMO_ATTACK_EVENTS[4]),
    ),
]

# Build a lookup dict for O(1) access in the API
DEMO_SCENARIOS_BY_ID = {s.scenario_id: s for s in DEMO_SCENARIOS}
