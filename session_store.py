"""
In-memory session store. No database needed for a 24h demo.
Sessions live as long as the process is running.
"""

from typing import Any, Dict

_sessions: Dict[str, Dict[str, Any]] = {}


def create_session(session_id: str, data: Dict[str, Any]) -> None:
    _sessions[session_id] = data


def get_session(session_id: str) -> Dict[str, Any]:
    if session_id not in _sessions:
        raise KeyError(f"Session '{session_id}' not found")
    return _sessions[session_id]


def session_exists(session_id: str) -> bool:
    return session_id in _sessions


def list_sessions() -> list:
    return list(_sessions.keys())
