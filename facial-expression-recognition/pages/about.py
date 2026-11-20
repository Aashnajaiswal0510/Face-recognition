"""About Project page aligned with the MUIT Noida BCA Synopsis."""

import streamlit as st


def render() -> None:
    st.title("Facial Expression Recognition Using Deep Learning (CNN)")
    st.markdown(
        """
        **Submitted By:** Aashna Jaiswal (Enroll No.: `MUIT/24-25/17072024001`, Roll No.: `2402031117001`)  
        **Under the guidance of:** Mrs. Shabda (Maharishi School of Engineering & Technology)  
        **Institution:** Maharishi University of Information Technology, Noida · Session 2026–2027
        """
    )

    st.subheader("Project Objective")
    st.write(
        "To detect human faces in static images and real-time webcam video and classify facial expressions "
        "into seven standard emotion categories using a Convolutional Neural Network."
    )

    st.subheader("System Pipeline")
    st.code(
        "Input → Face Detection (Haar Cascade) → Preprocessing (48×48 Grayscale) → "
        "CNN Classification → Result Display → SQLite Database → Emotion Analytics"
    )

    st.subheader("Seven Standard Emotion Classes")
    emotions = [
        ("Angry", "Lowered inner eyebrows, tightened eyelids, pressed lips."),
        ("Disgust", "Wrinkled nose bridge, raised upper lip, squinted eyes."),
        ("Fear", "Raised and drawn-together eyebrows, widened eyelids."),
        ("Happy", "Raised cheeks, crow's-feet wrinkles, upturned mouth corners."),
        ("Neutral", "Relaxed facial musculature without overt expression."),
        ("Sad", "Inner eyebrows angled upward, drooping eyelids, downturned mouth."),
        ("Surprise", "Arched eyebrows, wide-open eyes, dropped jaw."),
    ]
    for name, desc in emotions:
        st.markdown(f"- **{name}:** {desc}")

    st.subheader("Technologies Used")
    st.write("Python, TensorFlow/Keras, OpenCV, Streamlit, SQLite 3, NumPy, Pandas, scikit-learn, and FER2013.")
