"""Detection History page with search, filters, CSV export, and clear confirmation."""

import streamlit as st

from config import EMOTION_LABELS, EXPORTS_DIR
from src.database import clear_history, export_to_csv, fetch_detections


def render() -> None:
    st.title("Detection History")
    st.caption("Searchable, filterable SQLite log of all facial expression predictions.")

    c1, c2, c3, c4 = st.columns(4)
    search = c1.text_input("Search", placeholder="ID, emotion, timestamp...")
    emotion = c2.selectbox("Emotion", ["All"] + EMOTION_LABELS)
    source = c3.selectbox("Source", ["All", "upload", "webcam"])
    use_dates = c4.checkbox("Filter by Date")

    start_str, end_str = None, None
    if use_dates:
        d1, d2 = st.columns(2)
        start_str = d1.date_input("From").isoformat()
        end_str = d2.date_input("To").isoformat()

    df = fetch_detections(
        emotion=emotion,
        source=None if source == "All" else source,
        start_date=start_str,
        end_date=end_str,
        search=search or None,
    )

    if df.empty:
        st.info("No matching detection records found in detections.db.")
        return

    st.dataframe(df, use_container_width=True, hide_index=True)

    col_exp, col_clr = st.columns([1, 1])
    csv_data = df.to_csv(index=False).encode("utf-8")
    col_exp.download_button(
        label="Export Filtered Records to CSV",
        data=csv_data,
        file_name="detections_export.csv",
        mime="text/csv",
    )

    if col_exp.button("Save CSV to exports/"):
        out = export_to_csv(EXPORTS_DIR / "detections_export.csv", df)
        st.success(f"Saved CSV export to {out}")

    with col_clr:
        confirm = st.checkbox("Confirm permanent deletion of all history")
        if st.button("Clear All History", disabled=not confirm):
            deleted = clear_history()
            st.success(f"Deleted {deleted} records from detections.db.")
            st.rerun()
