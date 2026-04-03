from fastapi import APIRouter, HTTPException
from services.session_store import get_session
from services.ollama_client import generate_digest
from ml.rag import clear_store

router = APIRouter()

@router.get("/{session_id}/digest")
async def get_digest(session_id: str):
    """Generate a post-meeting digest from the full session."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    full_text = " ".join(
        seg["text"] for seg in session.get("transcript", [])
    )
    action_items = [i["text"] for i in session.get("action_items", [])]
    decisions = [d["text"] for d in session.get("decisions", [])]

    digest = generate_digest(full_text, action_items, decisions)
    clear_store(session_id)

    return {
        "digest": digest,
        "action_items": session.get("action_items", []),
        "decisions": session.get("decisions", []),
        "open_questions": session.get("open_questions", []),
        "total_sentences": len(session.get("transcript", [])),
    }

@router.get("/{session_id}/transcript")
async def get_transcript(session_id: str):
    """Return the full transcript for a session."""
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"transcript": session.get("transcript", [])}
