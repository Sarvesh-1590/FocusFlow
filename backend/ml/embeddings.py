from sentence_transformers import SentenceTransformer
import numpy as np
from typing import Optional

_model: Optional[SentenceTransformer] = None

def load_embedding_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer("all-MiniLM-L6-v2")
    return _model

def embed_sentences(sentences: list[str], model: SentenceTransformer) -> np.ndarray:
    """Embed a list of sentences into vectors."""
    return model.encode(sentences, convert_to_numpy=True, normalize_embeddings=True)

def embed_single(text: str, model: SentenceTransformer) -> np.ndarray:
    """Embed a single sentence."""
    return model.encode([text], convert_to_numpy=True, normalize_embeddings=True)[0]
