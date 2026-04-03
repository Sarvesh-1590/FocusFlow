from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Request, Depends, HTTPException
import uuid
import json
import base64
import asyncio

from auth import get_current_user, decode_access_token
from services.session_store import (
    create_session, get_session, close_session,
    append_transcript, append_action_item, append_summary
)
from ml.stt import transcribe_audio
from ml.embeddings import embed_single
from ml.classifier import classify_sentence
from ml.drift_detector import predict_drift
from ml.rag import add_to_store
from services.ollama_client import summarize_segment

router = APIRouter()
active_connections: dict[str, WebSocket] = {}
session_buffers: dict[str, dict] = {}
SUMMARY_WORD_THRESHOLD = 150
MAX_TRANSCRIPT_CHARS = 500_000


@router.post("/start")
async def start_session():
    session_id = str(uuid.uuid4())
    create_session(session_id)
    session_buffers[session_id] = {
        "sentences": [], "timestamps": [], "speakers": [],
        "word_count": 0, "last_summary_at": 0, "total_chars": 0,
    }
    return {"session_id": session_id, "status": "created"}


@router.post("/{session_id}/end")
async def end_session(session_id: str):
    close_session(session_id)
    session_buffers.pop(session_id, None)
    ws = active_connections.pop(session_id, None)
    if ws:
        try:
            await ws.close()
        except Exception:
            pass
    return {"status": "ended"}


@router.get("/{session_id}")
async def get_session_data(session_id: str):
    session = get_session(session_id)
    if not session:
        return {"error": "Session not found"}
    return session


@router.websocket("/{session_id}/ws")
async def session_websocket(websocket: WebSocket, session_id: str):
    await websocket.accept()
    active_connections[session_id] = websocket
    app = websocket.app
    embedder = app.state.model_cache.get("embedder")
    classifier = app.state.model_cache.get("classifier")

    try:
        while True:
            raw = await asyncio.wait_for(websocket.receive_text(), timeout=120)
            message = json.loads(raw)
            msg_type = message.get("type")

            if msg_type == "ping":
                await websocket.send_json({"type": "pong"})

            elif msg_type == "audio_chunk":
                audio_b64 = message.get("data", "")
                if len(audio_b64) > 5_000_000:
                    await websocket.send_json({"type": "error", "message": "Chunk too large"})
                    continue
                audio_bytes = base64.b64decode(audio_b64)
                try:
                    result = await transcribe_audio(audio_bytes)
                except Exception as e:
                    await websocket.send_json({"type": "error", "message": str(e)[:100]})
                    continue

                buf = session_buffers.get(session_id)
                if not buf:
                    continue

                for seg in result.get("segments", []):
                    text = seg.get("text", "").strip()
                    if not text or len(text) < 3:
                        continue
                    buf["total_chars"] += len(text)
                    if buf["total_chars"] > MAX_TRANSCRIPT_CHARS:
                        await websocket.send_json({"type": "warning", "message": "Session very long. Consider ending."})
                        break

                    ts = float(seg.get("start", 0))
                    speaker = str(seg.get("speaker", "Speaker"))[:50]

                    await websocket.send_json({"type": "transcript", "text": text, "timestamp": ts, "speaker": speaker})

                    try:
                        embedding = embed_single(text, embedder)
                        add_to_store(session_id, text, embedding, ts)
                    except Exception as e:
                        print(f"RAG Embed Error: {e}")

                    append_transcript(session_id, {"text": text, "timestamp": ts, "speaker": speaker})
                    buf["sentences"].append(text)
                    buf["timestamps"].append(ts)
                    buf["speakers"].append(speaker)
                    buf["word_count"] += len(text.split())

                    try:
                        clf = classify_sentence(text, classifier)
                        label = clf.get("label", "general")
                        conf = clf.get("confidence", 0.0)
                        if conf >= 0.65 and label != "general":
                            entry = {"type": label, "text": text, "confidence": conf, "timestamp": ts, "speaker": speaker}
                            await websocket.send_json(entry)
                            if label == "action_item":
                                append_action_item(session_id, entry)
                    except Exception:
                        pass

                    if buf["word_count"] - buf["last_summary_at"] >= SUMMARY_WORD_THRESHOLD:
                        try:
                            recent = " ".join(buf["sentences"][-25:])
                            summary_text = summarize_segment(recent)
                            await websocket.send_json({"type": "summary", "text": summary_text, "timestamp": ts})
                            append_summary(session_id, {"text": summary_text, "timestamp": ts})
                            buf["last_summary_at"] = buf["word_count"]
                        except Exception:
                            pass

            elif msg_type == "behavior":
                data = message.get("data", {})
                safe = {
                    "keyboard_idle_seconds":    min(float(data.get("keyboard_idle_seconds", 0)), 600),
                    "mouse_movement_delta":      min(float(data.get("mouse_movement_delta", 0)), 10),
                    "topic_shift_score":         min(float(data.get("topic_shift_score", 0)), 1),
                    "audio_energy_variance":     min(float(data.get("audio_energy_variance", 0.3)), 1),
                    "time_since_last_ui_action": min(float(data.get("time_since_last_ui_action", 0)), 600),
                    "words_per_minute_drop":     min(float(data.get("words_per_minute_drop", 0)), 1),
                    "scroll_activity":           min(float(data.get("scroll_activity", 0)), 50),
                }
                try:
                    drift_result = predict_drift(safe)
                    if drift_result.get("trigger_nudge"):
                        session = get_session(session_id)
                        ctx = ""
                        if session and session.get("summaries"):
                            ctx = session["summaries"][-1].get("text", "")
                        await websocket.send_json({
                            "type": "drift_nudge",
                            "drift_probability": drift_result["drift_probability"],
                            "context": ctx[:300] or "Meeting is in progress.",
                        })
                except Exception:
                    pass

    except asyncio.TimeoutError:
        try:
            await websocket.close(code=1001)
        except Exception:
            pass
    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"WS error [{session_id}]: {e}")
    finally:
        active_connections.pop(session_id, None)
