"""
XGBoost attention drift detector.
Trained on behavioral signals to predict when a user's attention has drifted.

Features per 30-second window:
  - keyboard_idle_seconds     : seconds since last keypress
  - mouse_movement_delta      : normalized mouse distance (0-1)
  - topic_shift_score         : cosine distance from prev embedding window
  - audio_energy_variance     : variance in audio amplitude
  - time_since_last_ui_action : seconds since last UI interaction
  - words_per_minute_drop     : drop from baseline WPM (0-1)
  - scroll_activity           : scroll events in window (normalized)

Output: drift_probability (0-1). Score > 0.65 → trigger nudge.
"""

import xgboost as xgb
import numpy as np
from sklearn.preprocessing import StandardScaler
import joblib
import os
from typing import Optional

DRIFT_THRESHOLD = 0.65
MODEL_PATH = os.path.join(os.path.dirname(__file__), "drift_model.json")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "drift_scaler.pkl")

FEATURE_NAMES = [
    "keyboard_idle_seconds",
    "mouse_movement_delta",
    "topic_shift_score",
    "audio_energy_variance",
    "time_since_last_ui_action",
    "words_per_minute_drop",
    "scroll_activity",
]

_model: Optional[xgb.XGBClassifier] = None
_scaler: Optional[StandardScaler] = None


def _generate_synthetic_training_data(n=2000):
    """
    Generate synthetic labeled behavioral data for hackathon.
    In production: replace with real user study data.
    """
    rng = np.random.default_rng(42)

    # Engaged users: low idle, active mouse, low topic shift, etc.
    engaged = rng.uniform(
        low=[0, 0.3, 0.0, 0.1, 0, 0.0, 0.2],
        high=[10, 1.0, 0.2, 0.5, 15, 0.2, 1.0],
        size=(n // 2, 7),
    )

    # Drifted users: high idle, low mouse, high topic shift, etc.
    drifted = rng.uniform(
        low=[30, 0.0, 0.3, 0.0, 60, 0.4, 0.0],
        high=[120, 0.2, 0.9, 0.15, 300, 1.0, 0.1],
        size=(n // 2, 7),
    )

    X = np.vstack([engaged, drifted])
    y = np.array([0] * (n // 2) + [1] * (n // 2))
    idx = rng.permutation(len(X))
    return X[idx], y[idx]


def _load_real_training_data():
    """
    Attempt to load real user telemetry data from data/user_study.csv.
    """
    data_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "user_study.csv")
    if not os.path.exists(data_path):
        return None, None

    try:
        # Assuming last column is the binary 'is_drifted' target
        data = np.genfromtxt(data_path, delimiter=',', skip_header=1)
        X = data[:, :-1]
        y = data[:, -1]
        print(f"Loaded {len(X)} real behavioral samples from {data_path}")
        return X, y
    except Exception as e:
        print(f"Failed to load real data: {e}")
        return None, None


def load_drift_model():
    global _model, _scaler

    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        _model = xgb.XGBClassifier()
        _model.load_model(MODEL_PATH)
        _scaler = joblib.load(SCALER_PATH)
        print("Drift model loaded from disk.")
    else:
        print("Training drift model...")
        X, y = _load_real_training_data()
        
        if X is None or y is None:
            print("Falling back to synthetic training data...")
            X, y = _generate_synthetic_training_data()

        _scaler = StandardScaler()
        X_scaled = _scaler.fit_transform(X)
        _model = xgb.XGBClassifier(
            n_estimators=100,
            max_depth=4,
            learning_rate=0.1,
            use_label_encoder=False,
            eval_metric="logloss",
            random_state=42,
        )
        _model.fit(X_scaled, y)
        _model.save_model(MODEL_PATH)
        joblib.dump(_scaler, SCALER_PATH)
        print("Drift model trained and saved.")

    return _model


def predict_drift(features: dict) -> dict:
    """
    Predict drift probability from a feature dict.
    Returns { drift_probability, is_drifted, trigger_nudge }
    """
    if _model is None or _scaler is None:
        return {"drift_probability": 0.0, "is_drifted": False, "trigger_nudge": False}

    vec = np.array([[features.get(f, 0.0) for f in FEATURE_NAMES]])
    vec_scaled = _scaler.transform(vec)
    prob = float(_model.predict_proba(vec_scaled)[0][1])

    return {
        "drift_probability": round(prob, 3),
        "is_drifted": prob >= DRIFT_THRESHOLD,
        "trigger_nudge": prob >= DRIFT_THRESHOLD,
    }
