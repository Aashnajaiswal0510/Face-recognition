"""Dashboard overview page backed by SQLite detections.db."""

import streamlit as st
from src.analytics import build_bar_chart, build_donut_chart, compute_distribution
from src.database import fetch_detections, get_dashboard_summary


def render(classifier) -> None:
    st.title("System Dashboard")
    st.caption("Facial Expression Recognition Using Deep Learning (CNN) · Live SQLite Summary")

    if classifier is None or not classifier.is_ready:
        st.warning(
            "Trained CNN model (`models/emotion_model.h5`) is not present yet. "
            "Run `python src/model_training.py` with the FER2013 dataset to enable Python inference."
        )

    summary = get_dashboard_summary()
    cols = st.columns(3)
    cols[0].metric("Total Faces Detected", summary["total_faces"])
    cols[1].metric("Total Images Analyzed", summary["total_images"])
    cols[2].metric("Total Webcam Detections", summary["total_webcam"])

    cols2 = st.columns(3)
    cols2[0].metric("Most Frequent Emotion", summary["most_frequent_emotion"] or "—")
    cols2[1].metric("Average Confidence", f"{summary['avg_confidence']:.2f}%")
    cols2[2].metric("Today's Detections", summary["today_count"])

    df = fetch_detections()
    if df.empty:
        st.info("No detections recorded in `detections.db` yet. Upload an image or start the webcam.")
        return

    dist_df = compute_distribution(df)
    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Emotion Distribution (Donut)")
        st.plotly_chart(build_donut_chart(dist_df), use_container_width=True)
    with c2:
        st.subheader("Emotion Frequency (Bar)")
        st.plotly_chart(build_bar_chart(dist_df), use_container_width=True)

    st.subheader("Recent Detections")
    st.dataframe(df.head(10), use_container_width=True, hide_index=True)
