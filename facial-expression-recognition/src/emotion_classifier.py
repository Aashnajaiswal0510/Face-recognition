"""CNN emotion classifier module using TensorFlow/Keras."""

from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Tuple
import cv2
import numpy as np

from config import EMOTION_COLORS, EMOTION_LABELS, EMOTION_MODEL_PATH
from src.face_detection import FaceDetector
from src.preprocessing import preprocess_face


@dataclass
class FacePrediction:
    face_index: int
    box: Tuple[int, int, int, int]
    emotion: str
    confidence: float
    probabilities: Dict[str, float]
    gray_48: np.ndarray


class EmotionClassifier:
    """Loads the trained Keras CNN model and runs 7-class expression inference."""

    def __init__(self, model_path: Path = EMOTION_MODEL_PATH) -> None:
        self.model_path = model_path
        self.model = None
        self.load_error: str | None = None
        self._load_model()

    def _load_model(self) -> None:
        if not self.model_path.exists():
            self.load_error = (
                f"Trained CNN model not found at {self.model_path}. "
                "Run 'python src/model_training.py' on FER2013 to generate emotion_model.h5."
            )
            self.model = None
            return

        try:
            import tensorflow as tf

            self.model = tf.keras.models.load_model(str(self.model_path))
            self.load_error = None
        except Exception as exc:
            self.model = None
            self.load_error = f"Failed to load CNN model: {exc}"

    @property
    def is_ready(self) -> bool:
        return self.model is not None

    def predict_face(self, tensor: np.ndarray) -> Tuple[str, float, Dict[str, float]]:
        if not self.is_ready:
            raise RuntimeError(self.load_error or "CNN model is unavailable.")

        raw_preds = self.model.predict(tensor, verbose=0)[0]
        total = float(np.sum(raw_preds))
        if total <= 0:
            raise RuntimeError("Invalid model output probabilities.")

        probs = {
            label: round(float(raw_preds[idx] / total) * 100.0, 2)
            for idx, label in enumerate(EMOTION_LABELS)
        }
        top_idx = int(np.argmax(raw_preds))
        top_emotion = EMOTION_LABELS[top_idx]
        top_confidence = probs[top_emotion]
        return top_emotion, top_confidence, probs

    def analyze_image(
        self,
        image_bgr: np.ndarray,
        detector: FaceDetector,
    ) -> Tuple[np.ndarray, List[FacePrediction]]:
        """Detect all faces, classify each independently, and annotate image."""
        if not self.is_ready:
            raise RuntimeError(self.load_error or "CNN model is unavailable.")

        boxes = detector.detect_faces(image_bgr)
        annotated = image_bgr.copy()
        predictions: List[FacePrediction] = []

        for idx, box in enumerate(boxes):
            tensor, gray_48 = preprocess_face(image_bgr, box)
            emotion, confidence, probs = self.predict_face(tensor)

            x, y, w, h = box
            hex_color = EMOTION_COLORS.get(emotion, "#315EAD").lstrip("#")
            r, g, b = (int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
            bgr_color = (b, g, r)

            cv2.rectangle(annotated, (x, y), (x + w, y + h), bgr_color, 2)
            label = f"#{idx} {emotion} ({confidence:.1f}%)"
            label_y = y - 10 if y - 10 > 18 else y + h + 20
            cv2.putText(
                annotated,
                label,
                (x, label_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                bgr_color,
                2,
                cv2.LINE_AA,
            )

            predictions.append(
                FacePrediction(
                    face_index=idx,
                    box=box,
                    emotion=emotion,
                    confidence=confidence,
                    probabilities=probs,
                    gray_48=gray_48,
                )
            )

        return annotated, predictions
