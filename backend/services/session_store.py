import redis
import json
import os
from typing import Optional

_client: Optional[redis.Redis] = None

def get_redis() -> redis.Redis:
    global _client
    if _client is None:
        _client = redis.from_url(
            os.getenv("REDIS_URL", "redis://localhost:6379"),
            decode_responses=True,
        )
    return _client

SESSION_TTL = 60 * 60 * 4  # 4 hours


def create_session(session_id: str) -> dict:
    r = get_redis()
    session = {
        "id": session_id,
        "transcript": [],
        "summaries": [],
        "action_items": [],
        "decisions": [],
        "open_questions": [],
        "vectors": [],
        "active": True,
    }
    r.setex(f"session:{session_id}", SESSION_TTL, json.dumps(session))
    return session


def get_session(session_id: str) -> Optional[dict]:
    r = get_redis()
    data = r.get(f"session:{session_id}")
    return json.loads(data) if data else None


def update_session(session_id: str, session: dict):
    r = get_redis()
    r.setex(f"session:{session_id}", SESSION_TTL, json.dumps(session))


def append_transcript(session_id: str, entry: dict):
    session = get_session(session_id)
    if not session:
        return
    session["transcript"].append(entry)
    update_session(session_id, session)


def append_summary(session_id: str, summary: dict):
    session = get_session(session_id)
    if not session:
        return
    session["summaries"].append(summary)
    update_session(session_id, session)


def append_action_item(session_id: str, item: dict):
    session = get_session(session_id)
    if not session:
        return
    session["action_items"].append(item)
    update_session(session_id, session)


def close_session(session_id: str):
    session = get_session(session_id)
    if session:
        session["active"] = False
        update_session(session_id, session)
