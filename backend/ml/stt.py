"""
Speech-to-text using local faster-whisper.
Accepts raw audio bytes (webm/wav) and returns transcript with timestamps.
"""

from faster_whisper import WhisperModel
import os
import tempfile
import logging
from typing import Optional
from faster_whisper import WhisperModel

try:
    import imageio_ffmpeg
    ffmpeg_dir = os.path.dirname(imageio_ffmpeg.get_ffmpeg_exe())
    os.environ["PATH"] += os.pathsep + ffmpeg_dir
except Exception as e:
    logging.warning(f"Could not load imageio_ffmpeg: {e}")

_model: Optional[WhisperModel] = None

def load_stt_model() -> WhisperModel:
    global _model
    if _model is None:
        print("Loading WhisperModel (base.en)...")
        # Run on CPU for broad hackathon compatibility, int8 precision
        _model = WhisperModel("base.en", device="cpu", compute_type="int8")
    return _model

async def transcribe_audio(audio_bytes: bytes, audio_format: str = "webm") -> dict:
    """
    Transcribe audio bytes using local faster-whisper.
    Returns { text, segments: [{ text, start, end, speaker }] }
    """
    model = load_stt_model()

    with tempfile.NamedTemporaryFile(suffix=f".{audio_format}", delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        segments_gen, info = model.transcribe(tmp_path, beam_size=5, vad_filter=True)
        
        segments = []
        full_text = ""
        for seg in segments_gen:
            segments.append({
                "text": seg.text.strip(),
                "start": seg.start,
                "end": seg.end,
                "speaker": "Speaker",
            })
            full_text += seg.text + " "

        if not segments:
            segments = [{
                "text": "",
                "start": 0.0,
                "end": 0.0,
                "speaker": "Speaker",
            }]

        return {"text": full_text.strip(), "segments": segments}

    finally:
        os.unlink(tmp_path)
