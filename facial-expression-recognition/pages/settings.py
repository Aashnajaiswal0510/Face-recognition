"""Settings and system diagnostics page."""

import streamlit as st

from config import DB_PATH, EMOTION_MODEL_PATH


def render() -> None:
    st.title("Settings")
    st.caption("Runtime configuration and local storage paths.")

    st.write("**SQLite Database Path:**", f"`{DB_PATH}`")
    st.write("**CNN Model Path:**", f"`{EMOTION_MODEL_PATH}`")
    st.write("**Model File Exists:**", EMOTION_MODEL_PATH.exists())
    st.write("**Database File Exists:**", DB_PATH.exists())
