"""Multi-face group detection page."""

import cv2
import numpy as np
from PIL import Image
import streamlit as st

from src.database import insert_detection


def render(detector, classifier) -> None:
    st.title("Multi-Face Detection")
    st.caption("Processes every detected face independently and logs per-face indices into SQLite.")

    if classifier is None or not classifier.is_ready:
        st.error(classifier.load_error if classifier else "CNN model unavailable.")
        return

    uploaded = st.file_uploader("Upload Multi-Face Photo", type=["jpg", "jpeg", "png"])
    if uploaded is None:
        return

    image_rgb = np.array(Image.open(uploaded).convert("RGB"))
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)

    if st.button("Detect All Faces", type="primary"):
        annotated_bgr, predictions = classifier.analyze_image(image_bgr, detector)
        if not predictions:
            st.warning("No faces detected in this image.")
            return

        st.image(cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB), use_container_width=True)
        for pred in predictions:
            insert_detection("upload", pred.emotion, pred.confidence, pred.face_index)

        cols = st.columns(min(3, len(predictions)))
        for idx, pred in enumerate(predictions):
            with cols[idx % len(cols)]:
                st.markdown(f"**Face #{pred.face_index} — {pred.emotion}**")
                st.caption(f"Confidence: {pred.confidence:.2f}% · Box: {pred.box}")
                st.image(pred.gray_48, width=84)
