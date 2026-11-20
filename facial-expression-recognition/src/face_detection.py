"""OpenCV Haar Cascade face detection module."""

from pathlib import Path
from typing import List, Tuple
import cv2
import numpy as np

from config import HAAR_CASCADE_PATH


class FaceDetector:
    """Detects human faces in RGB/BGR images using OpenCV Haar Cascade."""

    def __init__(self, cascade_path: Path = HAAR_CASCADE_PATH) -> None:
        resolved_path = self._resolve_cascade_path(cascade_path)
        self.classifier = cv2.CascadeClassifier(str(resolved_path))
        if self.classifier.empty():
            raise RuntimeError(f"Failed to load Haar Cascade XML from: {resolved_path}")

    @staticmethod
    def _resolve_cascade_path(cascade_path: Path) -> Path:
        if cascade_path.exists():
            return cascade_path
        builtin = Path(cv2.data.haarcascades) / "haarcascade_frontalface_default.xml"
        if builtin.exists():
            return builtin
        raise FileNotFoundError(
            "Haar Cascade file not found in models/ or OpenCV data directory."
        )

    def detect_faces(
        self,
        image_bgr: np.ndarray,
        scale_factor: float = 1.15,
        min_neighbors: int = 5,
        min_size: Tuple[int, int] = (48, 48),
    ) -> List[Tuple[int, int, int, int]]:
        """Return sorted bounding boxes [(x, y, w, h), ...] left-to-right."""
        if image_bgr is None or image_bgr.size == 0:
            return []

        gray = (
            cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
            if len(image_bgr.shape) == 3
            else image_bgr
        )
        gray = cv2.equalizeHist(gray)

        faces = self.classifier.detectMultiScale(
            gray,
            scaleFactor=scale_factor,
            minNeighbors=min_neighbors,
            minSize=min_size,
            flags=cv2.CASCADE_SCALE_IMAGE,
        )
        if len(faces) == 0:
            return []

        boxes = [(int(x), int(y), int(w), int(h)) for (x, y, w, h) in faces]
        boxes.sort(key=lambda b: (b[0], b[1]))
        return boxes
