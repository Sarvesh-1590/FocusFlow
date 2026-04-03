from bertopic import BERTopic
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity
import numpy as np
from typing import Optional

_model: Optional[BERTopic] = None

def load_topic_model() -> BERTopic:
    """Load a lightweight BERTopic model for topic shift detection."""
    global _model
    if _model is None:
        _model = BERTopic(
            embedding_model="all-MiniLM-L6-v2",
            min_topic_size=2,
            verbose=False,
        )
    return _model


def detect_topic_shift(
    embeddings: np.ndarray,
    threshold: float = 0.35,
) -> list[int]:
    """
    Detect indices where topic shifts occur using cosine similarity
    between consecutive sentence embeddings.
    Returns list of sentence indices where a new topic begins.
    """
    if len(embeddings) < 3:
        return []

    shift_indices = []
    window = 2

    for i in range(window, len(embeddings)):
        prev_window = embeddings[max(0, i - window):i]
        prev_centroid = prev_window.mean(axis=0, keepdims=True)
        curr = embeddings[i:i+1]
        sim = cosine_similarity(prev_centroid, curr)[0][0]
        if sim < (1.0 - threshold):
            shift_indices.append(i)

    return shift_indices


def segment_transcript(
    sentences: list[str],
    embeddings: np.ndarray,
    threshold: float = 0.35,
) -> list[list[str]]:
    """
    Split transcript into topic segments based on embedding shifts.
    Returns list of sentence groups, one per topic segment.
    """
    shift_points = detect_topic_shift(embeddings, threshold)
    segments = []
    prev = 0
    for idx in shift_points:
        if idx - prev >= 2:
            segments.append(sentences[prev:idx])
            prev = idx
    segments.append(sentences[prev:])
    return [s for s in segments if s]
