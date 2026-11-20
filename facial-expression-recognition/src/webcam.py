"""Real-time OpenCV webcam capture and CNN frame processor."""

import time
from typing import List, Tuple
import cv2
import numpy as np

from src.database import insert_detection
from src.emotion_classifier import EmotionClassifier, FacePrediction
from src.face_detection import FaceDetector


class WebcamProcessor:
    """Captures webcam frames and runs Haar Cascade + CNN inference."""

    def __init__(self, camera_index: int = 0) -> None:
        self.camera_index = camera_index
        self.capture: cv2.VideoCapture | None = None

    def open(self) -> None:
        self.capture = cv2.VideoCapture(self.camera_index)
        if not self.capture.isOpened():
            self.capture = None
            raise RuntimeError(
                f"Unable to open webcam device at index {self.camera_index}. "
                "Check camera permissions and hardware availability."
            )

    def close(self) -> None:
        if self.capture is not None:
            self.capture.release()
            self.capture = None

    def read_and_process(
        self,
        detector: FaceDetector,
        classifier: EmotionClassifier,
        log_to_db: bool = False,
    ) -> Tuple[np.ndarray, List[FacePrediction], float]:
        if self.capture is None or not self.capture.isOpened():
            raise RuntimeError("Webcam is not active.")

        t0 = time.perf_counter()
        ok, frame_bgr = self.capture.read()
        if not ok or frame_bgr is None:
            raise RuntimeError("Failed to read frame from webcam.")

        annotated_bgr, predictions = classifier.analyze_image(frame_bgr, detector)
        if log_to_db and predictions:
            for pred in predictions:
                insert_detection(
                    source="webcam",
                    emotion=pred.emotion,
                    confidence=pred.confidence,
                    face_index=pred.face_index,
                )

        elapsed = max(1e-6, time.perf_counter() - t0)
        fps = round(1.0 / elapsed, 1)
        annotated_rgb = cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)
        return annotated_rgb, predictions, fps
