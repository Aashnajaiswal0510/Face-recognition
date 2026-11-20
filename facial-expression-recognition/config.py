"""Central configuration for Facial Expression Recognition Using Deep Learning (CNN)."""

from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
ROOT_WORKSPACE_DIR = BASE_DIR.parent

# Share the root detections.db so the Python/Streamlit app and Next.js dashboard stay unified
DB_PATH = ROOT_WORKSPACE_DIR / "detections.db"

MODELS_DIR = BASE_DIR / "models"
EMOTION_MODEL_PATH = MODELS_DIR / "emotion_model.h5"
HAAR_CASCADE_PATH = MODELS_DIR / "haarcascade_frontalface_default.xml"
TRAINING_METRICS_PATH = MODELS_DIR / "training_metrics.json"
CONFUSION_MATRIX_PLOT_PATH = MODELS_DIR / "confusion_matrix.png"
TRAINING_HISTORY_PLOT_PATH = MODELS_DIR / "training_history.png"

DATASET_DIR = BASE_DIR / "dataset"
EXPORTS_DIR = BASE_DIR / "exports"

EMOTION_LABELS = [
    "Angry",
    "Disgust",
    "Fear",
    "Happy",
    "Neutral",
    "Sad",
    "Surprise",
]

INPUT_SIZE = (48, 48)

EMOTION_COLORS = {
    "Angry": "#E05252",
    "Disgust": "#8B5CF6",
    "Fear": "#D97706",
    "Happy": "#16A36A",
    "Neutral": "#64748B",
    "Sad": "#315EAD",
    "Surprise": "#0891B2",
}

THEME = {
    "primary_bg": "#F8FAFC",
    "secondary_bg": "#FFFFFF",
    "primary_accent": "#315EAD",
    "secondary_accent": "#6477D9",
    "text_main": "#172033",
    "text_secondary": "#64748B",
    "border": "#E2E8F0",
    "success": "#16A36A",
    "warning": "#E9A23B",
    "danger": "#E05252",
}
