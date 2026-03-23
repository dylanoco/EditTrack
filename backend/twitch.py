"""
Twitch API helpers for Source Fetching.
Uses app access token (Client Credentials); token is cached in memory.
"""
from __future__ import annotations

import os
import re
import time
from typing import Any, Optional

import httpx

# In-memory token cache: (access_token, expires_at timestamp)
_token_cache: Optional[tuple[str, float]] = None
_TOKEN_BUFFER_SEC = 60  # Refresh token this many seconds before expiry

TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token"
TWITCH_HELIX_BASE = "https://api.twitch.tv/helix"


def _get_client_credentials() -> tuple[str, str]:
    client_id = os.getenv("TWITCH_CLIENT_ID")
    client_secret = os.getenv("TWITCH_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise ValueError("TWITCH_CLIENT_ID and TWITCH_CLIENT_SECRET must be set")
    return client_id, client_secret


def get_app_token() -> str:
    """Return a valid app access token, using cache if not expired."""
    global _token_cache
    now = time.time()
    if _token_cache is not None:
        token, expires_at = _token_cache
        if now < expires_at - _TOKEN_BUFFER_SEC:
            return token

    client_id, client_secret = _get_client_credentials()
    resp = httpx.post(
        TWITCH_TOKEN_URL,
        data={
            "client_id": client_id,
            "client_secret": client_secret,
            "grant_type": "client_credentials",
        },
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        timeout=10.0,
    )
    resp.raise_for_status()
    data = resp.json()
    token = data["access_token"]
    expires_in = data.get("expires_in", 0)
    _token_cache = (token, now + expires_in)
    return token


def resolve_broadcaster_id(channel_identifier: str) -> Optional[str]:
    """
    Resolve Twitch channel name/identifier to broadcaster user id.
    Twitch API expects 'login' (lowercase). Returns None if not found.
    """
    if not (channel_identifier or channel_identifier.strip()):
        return None
    login = channel_identifier.strip().lower()
    client_id, _ = _get_client_credentials()
    token = get_app_token()

    resp = httpx.get(
        f"{TWITCH_HELIX_BASE}/users",
        params={"login": login},
        headers={
            "Authorization": f"Bearer {token}",
            "Client-Id": client_id,
        },
        timeout=10.0,
    )
    resp.raise_for_status()
    data = resp.json()
    users = data.get("data") or []
    if not users:
        return None
    return users[0].get("id")


def fetch_clips(
    broadcaster_id: str,
    first: int = 100,
    started_at: Optional[str] = None,
    ended_at: Optional[str] = None,
) -> list[dict[str, Any]]:
    """
    Fetch clips for a broadcaster. Returns list of clip objects.
    Optional started_at/ended_at in RFC3339 format for date range.
    """
    client_id, _ = _get_client_credentials()
    token = get_app_token()

    params: dict[str, Any] = {"broadcaster_id": broadcaster_id, "first": min(first, 100)}
    if started_at:
        params["started_at"] = started_at
    if ended_at:
        params["ended_at"] = ended_at

    all_clips: list[dict[str, Any]] = []
    cursor: Optional[str] = None

    while True:
        if cursor:
            params["after"] = cursor
        resp = httpx.get(
            f"{TWITCH_HELIX_BASE}/clips",
            params=params,
            headers={
                "Authorization": f"Bearer {token}",
                "Client-Id": client_id,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        clips = data.get("data") or []
        all_clips.extend(clips)
        pagination = data.get("pagination") or {}
        cursor = pagination.get("cursor")
        if not cursor or len(clips) < params["first"]:
            break

    return all_clips


def _parse_twitch_duration_to_seconds(raw: Optional[str]) -> Optional[int]:
    """
    Parse Twitch video duration strings like '2h3m10s' into seconds.
    """
    if not raw:
        return None
    total = 0
    for value, unit in re.findall(r"(\d+)([hms])", raw.lower()):
        n = int(value)
        if unit == "h":
            total += n * 3600
        elif unit == "m":
            total += n * 60
        elif unit == "s":
            total += n
    return total if total > 0 else None


def fetch_vods(
    user_id: str,
    first: int = 100,
) -> list[dict[str, Any]]:
    """
    Fetch VODs (videos) for a broadcaster user_id.
    """
    client_id, _ = _get_client_credentials()
    token = get_app_token()

    params: dict[str, Any] = {
        "user_id": user_id,
        "type": "archive",
        "first": min(first, 100),
    }
    all_vods: list[dict[str, Any]] = []
    cursor: Optional[str] = None

    while True:
        if cursor:
            params["after"] = cursor
        resp = httpx.get(
            f"{TWITCH_HELIX_BASE}/videos",
            params=params,
            headers={
                "Authorization": f"Bearer {token}",
                "Client-Id": client_id,
            },
            timeout=15.0,
        )
        resp.raise_for_status()
        data = resp.json()
        vods = data.get("data") or []
        all_vods.extend(vods)
        pagination = data.get("pagination") or {}
        cursor = pagination.get("cursor")
        if not cursor or len(vods) < params["first"]:
            break

    for vod in all_vods:
        vod["duration_sec"] = _parse_twitch_duration_to_seconds(vod.get("duration"))

    return all_vods
