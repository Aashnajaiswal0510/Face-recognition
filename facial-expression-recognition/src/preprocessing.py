"""Image preprocessing module for 48x48 grayscale CNN input."""

from typing import Tuple
import cv2
import numpy as np

from config import INPUT_SIZE


def preprocess_face(
    image_bgr: np.ndarray,
    box: Tuple[int, int, int, int],
    target_size: Tuple[int, int] = INPUT_SIZE,
) -> Tuple[np.ndarray, np.ndarray]:
    """Extract face ROI, convert to grayscale, resize to 48x48, and normalize [0, 1].

    Returns:
        tensor: shape (1, 48, 48, 1) float32 ready for Keras CNN prediction.
        gray_48: shape (48, 48) uint8 for visual inspection.
    """
    x, y, w, h = box
    img_h, img_w = image_bgr.shape[:2]

    x1 = max(0, x)
    y1 = max(0, y)
    x2 = min(img_w, x + w)
    y2 = min(img_h, y + h)

    roi = image_bgr[y1:y2, x1:x2]
    if roi.size == 0:
        raise ValueError("Extracted face region of interest is empty.")

    gray = cv2.cvtColor(roi, cv2.COLOR_BGR2GRAY) if len(roi.shape) == 3 else roi
    gray_48 = cv2.resize(gray, target_size, interpolation=cv2.INTER_AREA)

    normalized = gray_48.astype("float32") / 255.0
    tensor = np.expand_dims(normalized, axis=-1)
    tensor = np.expand_dims(tensor, axis=0)
    return tensor, gray_48
