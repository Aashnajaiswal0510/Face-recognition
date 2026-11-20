"""Image upload emotion detection page."""

import cv2
import numpy as np
from PIL import Image
import streamlit as st

from src.database import insert_detection


def render(detector, classifier) -> None:
    st.title("Emotion Detection — Image Upload")
    st.caption("Pipeline: Image → Haar Cascade → 48×48 Grayscale → CNN → SQLite")

    if classifier is None or not classifier.is_ready:
        st.error(classifier.load_error if classifier else "CNN model unavailable.")
        return

    uploaded = st.file_uploader("Upload Image (JPG, JPEG, PNG)", type=["jpg", "jpeg", "png"])
    if uploaded is None:
        st.info("Upload a portrait or multi-face image to classify facial expressions.")
        return

    pil_image = Image.open(uploaded).convert("RGB")
    image_rgb = np.array(pil_image)
    image_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)

    col_preview, col_result = st.columns([3, 2])
    with col_preview:
        st.image(image_rgb, caption="Uploaded Image", use_container_width=True)

    if st.button("Analyze Image", type="primary"):
        with st.spinner("Running Haar Cascade & CNN inference..."):
            annotated_bgr, predictions = classifier.analyze_image(image_bgr, detector)

        if not predictions:
            st.warning("No human face detected in the uploaded image.")
            return

        annotated_rgb = cv2.cvtColor(annotated_bgr, cv2.COLOR_BGR2RGB)
        with col_preview:
            st.image(annotated_rgb, caption=f"Detected {len(predictions)} face(s)", use_container_width=True)

        for pred in predictions:
            insert_detection(
                source="upload",
                emotion=pred.emotion,
                confidence=pred.confidence,
                face_index=pred.face_index,
            )

        with col_result:
            st.success(f"Saved {len(predictions)} face prediction(s) to detections.db")
            for pred in predictions:
                st.subheader(f"Face #{pred.face_index}: {pred.emotion} ({pred.confidence:.2f}%)")
                st.image(pred.gray_48, caption="48×48 Grayscale Input", width=96)
                st.bar_chart(pred.probabilities)
