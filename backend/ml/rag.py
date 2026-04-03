"""
FAISS-based RAG pipeline for real-time Q&A over meeting transcript.
Stores sentence embeddings in a session-scoped FAISS index.
On query: embed question, retrieve top-k relevant sentences, pass to Claude.
"""

import faiss
import numpy as np
from typing import Optional

# Per-session FAISS stores: session_id -> { index, sentences, timestamps }
_session_stores: dict = {}


def get_or_create_store(session_id: str, dim: int = 384) -> dict:
    if session_id not in _session_stores:
        index = faiss.IndexFlatIP(dim)  # Inner product = cosine on normalized vecs
        _session_stores[session_id] = {
            "index": index,
            "sentences": [],
            "timestamps": [],
        }
    return _session_stores[session_id]


def add_to_store(session_id: str, sentence: str, embedding: np.ndarray, timestamp: float = 0.0):
    """Add a sentence and its embedding to the session FAISS store."""
    store = get_or_create_store(session_id)
    vec = embedding.astype("float32").reshape(1, -1)
    store["index"].add(vec)
    store["sentences"].append(sentence)
    store["timestamps"].append(timestamp)


def retrieve(session_id: str, query_embedding: np.ndarray, top_k: int = 5) -> list[str]:
    """
    Retrieve top-k most relevant sentences for a query embedding.
    Returns list of sentence strings.
    """
    store = _session_stores.get(session_id)
    if not store or store["index"].ntotal == 0:
        return []

    k = min(top_k, store["index"].ntotal)
    query = query_embedding.astype("float32").reshape(1, -1)
    _, indices = store["index"].search(query, k)

    results = []
    for idx in indices[0]:
        if 0 <= idx < len(store["sentences"]):
            ts = store["timestamps"][idx]
            text = store["sentences"][idx]
            results.append(f"[{ts:.0f}s] {text}")

    return results


def clear_store(session_id: str):
    """Remove a session's FAISS store (call on meeting end)."""
    _session_stores.pop(session_id, None)
