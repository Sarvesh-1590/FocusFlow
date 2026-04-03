import threading
import time
from typing import Any, Dict

from .embeddings import load_embedding_model
from .topic_model import load_topic_model
from .classifier import load_classifier
from .drift_detector import load_drift_model
from .rewriter import load_rewriter
from .stt import load_stt_model

class ModelCache:
    def __init__(self):
        self._lock = threading.Lock()
        self._cache: Dict[str, Any] = {}
        self._last_access: Dict[str, float] = {}
        self._ttl = 3600  # 1 hour unused retention

    def _check_expire(self):
        now = time.time()
        expired = [k for k, t in self._last_access.items() if now - t > self._ttl]
        for key in expired:
            self._cache.pop(key, None)
            self._last_access.pop(key, None)

    def get(self, key: str):
        with self._lock:
            self._check_expire()
            if key in self._cache:
                self._last_access[key] = time.time()
                return self._cache[key]

            model = self._load_model(key)
            self._cache[key] = model
            self._last_access[key] = time.time()
            return model

    def _load_model(self, key: str):
        if key == "embedder":
            return load_embedding_model()
        if key == "topic_model":
            return load_topic_model()
        if key == "classifier":
            return load_classifier()
        if key == "drift_model":
            return load_drift_model()
        if key == "rewriter":
            return load_rewriter()
        if key == "stt":
            return load_stt_model()
        raise ValueError(f"Unknown model key: {key}")
