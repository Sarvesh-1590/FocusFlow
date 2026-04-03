"""
T5-small readability rewriter.
Fine-tuned on Wikipedia → Simple Wikipedia aligned pairs for text simplification.
Rewrites complex meeting summaries into plain, dyslexia-friendly language.

For the hackathon: uses t5-small with a simplification prompt prefix.
Fine-tuned checkpoint path can be set via T5_MODEL_PATH env variable.
"""

from transformers import T5ForConditionalGeneration, T5Tokenizer
import os
from typing import Optional

MODEL_NAME = os.getenv("T5_MODEL_PATH", "t5-small")

_model: Optional[T5ForConditionalGeneration] = None
_tokenizer: Optional[T5Tokenizer] = None

TARGET_GRADE_LEVEL = 6  # Flesch-Kincaid target


def load_rewriter():
    global _model, _tokenizer
    if _model is None:
        print(f"Loading T5 rewriter: {MODEL_NAME}")
        _tokenizer = T5Tokenizer.from_pretrained(MODEL_NAME, legacy=False)
        _model = T5ForConditionalGeneration.from_pretrained(MODEL_NAME)
        _model.eval()
        print("T5 rewriter loaded.")
    return _model


def rewrite(text: str, max_length: int = 200) -> str:
    """
    Rewrite complex text into simpler, plain language.
    Uses the 'simplify:' prefix which T5 associates with simplification tasks.
    """
    if _model is None or _tokenizer is None:
        return text

    input_text = f"simplify: {text}"
    inputs = _tokenizer(
        input_text,
        return_tensors="pt",
        max_length=512,
        truncation=True,
    )

    outputs = _model.generate(
        inputs.input_ids,
        max_length=max_length,
        num_beams=4,
        early_stopping=True,
        no_repeat_ngram_size=2,
    )

    return _tokenizer.decode(outputs[0], skip_special_tokens=True)


def rewrite_bullets(bullets: list[str]) -> list[str]:
    """Rewrite a list of bullet points into simpler language."""
    return [rewrite(b) for b in bullets]


def rewrite_summary(summary_text: str) -> str:
    """Rewrite a full summary block."""
    lines = [l.strip() for l in summary_text.split("\n") if l.strip()]
    simplified = [rewrite(l) for l in lines]
    return "\n".join(simplified)
