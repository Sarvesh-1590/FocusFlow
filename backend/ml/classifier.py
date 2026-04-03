"""
DistilBERT action item classifier.
Fine-tuned on the AMI Meeting Corpus to classify sentences into:
  - action_item
  - decision
  - open_question
  - general

For the hackathon demo we ship a rule-augmented zero-shot baseline
using a pre-trained NLI model, which performs well out of the box.
Swap `MODEL_NAME` to your fine-tuned checkpoint after training.
"""

from transformers import pipeline
from typing import Optional
import os

MODEL_NAME = "cross-encoder/nli-deberta-v3-small"

_classifier = None
_classifier_type = "zero-shot"
LABELS = ["action item", "decision", "open question", "general discussion"]
LABEL_MAP = {
    "action item": "action_item",
    "decision": "decision",
    "open question": "open_question",
    "general discussion": "general",
    "action_item": "action_item",
    "open_question": "open_question"
}


def load_classifier():
    global _classifier, _classifier_type
    if _classifier is None:
        model_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "scripts", "focusflow-classifier")
        if os.path.exists(model_path):
            print(f"Loading fine-tuned classifier from {model_path}")
            _classifier = pipeline(
                "text-classification",
                model=model_path,
                tokenizer=model_path,
                device=-1,
            )
            _classifier_type = "fine-tuned"
        else:
            print("Fine-tuned model not found, falling back to zero-shot-classification.")
            _classifier = pipeline(
                "zero-shot-classification",
                model="typeform/distilbert-base-uncased-mnli",
                device=-1,
            )
            _classifier_type = "zero-shot"
    return _classifier


def classify_sentence(sentence: str, classifier) -> dict:
    """
    Classify a single sentence and return label + confidence.
    Returns dict: { label, confidence }
    """
    if len(sentence.strip()) < 8:
        return {"label": "general", "confidence": 1.0}

    if _classifier_type == "fine-tuned":
        result = classifier(sentence)[0]
        top_label = result["label"]
        top_score = result["score"]
    else:
        result = classifier(sentence, candidate_labels=LABELS, multi_label=False)
        top_label = result["labels"][0]
        top_score = result["scores"][0]

    return {
        "label": LABEL_MAP.get(top_label, "general"),
        "confidence": round(top_score, 3),
    }

def classify_batch(sentences: list[str], classifier) -> list[dict]:
    """Classify a batch of sentences."""
    return [classify_sentence(s, classifier) for s in sentences]


def extract_structured_items(
    sentences: list[str],
    timestamps: list[float],
    speaker_labels: list[str],
    classifier,
    confidence_threshold: float = 0.6,
) -> dict:
    """
    Run classifier over sentences and return structured action items,
    decisions, and open questions above confidence threshold.
    """
    action_items = []
    decisions = []
    open_questions = []

    for i, sentence in enumerate(sentences):
        result = classify_sentence(sentence, classifier)
        if result["confidence"] < confidence_threshold:
            continue

        entry = {
            "text": sentence,
            "confidence": result["confidence"],
            "timestamp": timestamps[i] if i < len(timestamps) else 0,
            "speaker": speaker_labels[i] if i < len(speaker_labels) else "Unknown",
        }

        if result["label"] == "action_item":
            action_items.append(entry)
        elif result["label"] == "decision":
            decisions.append(entry)
        elif result["label"] == "open_question":
            open_questions.append(entry)

    return {
        "action_items": action_items,
        "decisions": decisions,
        "open_questions": open_questions,
    }
