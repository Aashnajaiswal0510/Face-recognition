"""Main Streamlit entry point for Facial Expression Recognition Using Deep Learning (CNN)."""

from pathlib import Path
import streamlit as st

from config import EMOTION_MODEL_PATH
from src.database import init_db
from src.emotion_classifier import EmotionClassifier
from src.face_detection import FaceDetector
from views_router import render_page

st.set_page_config(
    page_title="Facial Expression Recognition (CNN)",
    page_icon="🔍",
    layout="wide",
    initial_sidebar_state="expanded",
)

css_path = Path(__file__).parent / "assets" / "styles.css"
if css_path.exists():
    st.markdown(f"<style>{css_path.read_text(encoding='utf-8')}</style>", unsafe_allow_html=True)

init_db()


@st.cache_resource
def load_vision_components():
    detector = FaceDetector()
    classifier = EmotionClassifier(EMOTION_MODEL_PATH)
    return detector, classifier


try:
    detector, classifier = load_vision_components()
except Exception as exc:
    detector = None
    classifier = None
    st.sidebar.error(f"Initialization error: {exc}")

st.sidebar.title("FER Vision (CNN)")
st.sidebar.caption("Facial Expression Recognition Platform")

PAGES = [
    "Dashboard",
    "Emotion Detection",
    "Live Webcam Detection",
    "Multi-Face Detection",
    "Emotion Analytics",
    "Detection History",
    "Model Information",
    "About Project",
    "Settings",
]

if "active_page" not in st.session_state:
    st.session_state["active_page"] = "Dashboard"

selected = st.sidebar.radio(
    "Navigation",
    PAGES,
    index=PAGES.index(st.session_state["active_page"]),
)
st.session_state["active_page"] = selected

st.sidebar.divider()
st.sidebar.write("**Model Status:**", "Ready" if classifier and classifier.is_ready else "Not Trained")
st.sidebar.write("**Database:**", "SQLite Connected (`detections.db`)")

render_page(selected, detector, classifier)
