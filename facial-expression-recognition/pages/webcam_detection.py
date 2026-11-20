"""Live webcam facial expression detection page."""

import time
import streamlit as st

from src.webcam import WebcamProcessor


def render(detector, classifier) -> None:
    st.title("Live Webcam Detection")
    st.caption("Real-time Haar Cascade face tracking and CNN expression recognition.")

    if classifier is None or not classifier.is_ready:
        st.error(classifier.load_error if classifier else "CNN model unavailable.")
        return

    col1, col2 = st.columns([1, 1])
    start_btn = col1.button("Start Camera", type="primary")
    stop_btn = col2.button("Stop Camera")
    log_enabled = st.checkbox("Persist detections to SQLite every 2 seconds", value=True)

    if "webcam_running" not in st.session_state:
        st.session_state["webcam_running"] = False

    if start_btn:
        st.session_state["webcam_running"] = True
    if stop_btn:
        st.session_state["webcam_running"] = False

    frame_placeholder = st.empty()
    metrics_placeholder = st.empty()

    if st.session_state["webcam_running"]:
        processor = WebcamProcessor(camera_index=0)
        try:
            processor.open()
            last_log = 0.0
            while st.session_state["webcam_running"]:
                now = time.time()
                should_log = log_enabled and (now - last_log >= 2.0)
                frame_rgb, predictions, fps = processor.read_and_process(
                    detector, classifier, log_to_db=should_log
                )
                if should_log and predictions:
                    last_log = now

                frame_placeholder.image(frame_rgb, channels="RGB", use_container_width=True)
                if predictions:
                    top = predictions[0]
                    metrics_placeholder.info(
                        f"Emotion: {top.emotion} | Confidence: {top.confidence:.2f}% | "
                        f"Faces: {len(predictions)} | FPS: {fps}"
                    )
                else:
                    metrics_placeholder.warning(f"No face detected | FPS: {fps}")
        except Exception as exc:
            st.error(f"Webcam error: {exc}")
            st.session_state["webcam_running"] = False
        finally:
            processor.close()
    else:
        st.info("Click 'Start Camera' to begin real-time webcam emotion detection.")
