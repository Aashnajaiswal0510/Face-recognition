"""Model Information page displaying CNN specifications and real evaluation metrics."""

import json
import pandas as pd
import streamlit as st

from config import (
    CONFUSION_MATRIX_PLOT_PATH,
    TRAINING_HISTORY_PLOT_PATH,
    TRAINING_METRICS_PATH,
)


def render() -> None:
    st.title("Model Information")
    st.caption("Convolutional Neural Network specification and FER2013 evaluation results.")

    specs = {
        "Model Architecture": "Convolutional Neural Network (3 Conv Blocks + BatchNorm + Dropout)",
        "Dataset": "FER2013",
        "Face Detection": "OpenCV Haar Cascade (haarcascade_frontalface_default.xml)",
        "Input Size": "48 × 48",
        "Input Format": "Grayscale (1 channel)",
        "Output Classes": "7 (Angry, Disgust, Fear, Happy, Neutral, Sad, Surprise)",
        "Framework": "TensorFlow / Keras",
    }
    st.table(pd.DataFrame(specs.items(), columns=["Specification", "Value"]))

    if not TRAINING_METRICS_PATH.exists():
        st.warning(
            "Model evaluation metrics are not available yet because `src/model_training.py` "
            "has not been executed against the FER2013 dataset."
        )
        st.code("python src/model_training.py --dataset dataset --epochs 40", language="bash")
        return

    metrics = json.loads(TRAINING_METRICS_PATH.read_text(encoding="utf-8"))
    m1, m2, m3 = st.columns(3)
    m1.metric("Final Train Accuracy", f"{metrics['trainAccuracy'][-1] * 100:.2f}%")
    m2.metric("Final Val Accuracy", f"{metrics['valAccuracy'][-1] * 100:.2f}%")
    m3.metric("Test Accuracy", f"{metrics['testAccuracy'] * 100:.2f}%")

    if TRAINING_HISTORY_PLOT_PATH.exists():
        st.image(str(TRAINING_HISTORY_PLOT_PATH), caption="Training & Validation Accuracy / Loss")
    if CONFUSION_MATRIX_PLOT_PATH.exists():
        st.image(str(CONFUSION_MATRIX_PLOT_PATH), caption="FER2013 Confusion Matrix")

    if "classificationReport" in metrics:
        st.subheader("Classification Report")
        st.dataframe(pd.DataFrame(metrics["classificationReport"]).T, use_container_width=True)
