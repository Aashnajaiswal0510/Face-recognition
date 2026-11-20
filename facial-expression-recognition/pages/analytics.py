"""Emotion Analytics — Emotion Trend Tracker page."""

from datetime import date, timedelta
import streamlit as st

from src.analytics import (
    build_bar_chart,
    build_confidence_histogram,
    build_donut_chart,
    build_source_comparison_chart,
    build_trend_line_chart,
    compute_distribution,
)
from src.database import fetch_detections


def render() -> None:
    st.title("Emotion Analytics — Trend Tracker")
    st.caption("Interactive trend charts powered by persistent SQLite detection records.")

    f1, f2 = st.columns(2)
    timeframe = f1.selectbox(
        "Timeframe",
        ["All Time", "Today", "Last 7 Days", "Last 30 Days", "Custom Date Range"],
    )
    source = f2.selectbox("Source", ["All", "upload", "webcam"])

    today = date.today()
    start_str, end_str = None, None
    if timeframe == "Today":
        start_str = today.isoformat()
        end_str = today.isoformat()
    elif timeframe == "Last 7 Days":
        start_str = (today - timedelta(days=6)).isoformat()
        end_str = today.isoformat()
    elif timeframe == "Last 30 Days":
        start_str = (today - timedelta(days=29)).isoformat()
        end_str = today.isoformat()
    elif timeframe == "Custom Date Range":
        d1, d2 = st.columns(2)
        start_str = d1.date_input("Start Date", value=today - timedelta(days=7)).isoformat()
        end_str = d2.date_input("End Date", value=today).isoformat()

    df = fetch_detections(
        source=None if source == "All" else source,
        start_date=start_str,
        end_date=end_str,
    )

    if df.empty:
        st.info("No records match the selected filters.")
        return

    counts = df["emotion"].value_counts()
    cols = st.columns(6)
    cols[0].metric("Total Detections", len(df))
    cols[1].metric("Happy Count", int(counts.get("Happy", 0)))
    cols[2].metric("Sad Count", int(counts.get("Sad", 0)))
    cols[3].metric("Angry Count", int(counts.get("Angry", 0)))
    cols[4].metric("Neutral Count", int(counts.get("Neutral", 0)))
    cols[5].metric("Most Common", str(counts.idxmax()))

    dist_df = compute_distribution(df)
    c1, c2 = st.columns(2)
    with c1:
        st.subheader("Emotion Distribution (Donut)")
        st.plotly_chart(build_donut_chart(dist_df), use_container_width=True)
    with c2:
        st.subheader("Emotion Frequency (Bar)")
        st.plotly_chart(build_bar_chart(dist_df), use_container_width=True)

    st.subheader("Emotion Trends Over Time")
    trend_fig = build_trend_line_chart(df)
    if trend_fig:
        st.plotly_chart(trend_fig, use_container_width=True)

    c3, c4 = st.columns(2)
    with c3:
        st.subheader("Image vs Webcam Detections")
        src_fig = build_source_comparison_chart(df)
        if src_fig:
            st.plotly_chart(src_fig, use_container_width=True)
    with c4:
        st.subheader("Confidence Distribution (Histogram)")
        hist_fig = build_confidence_histogram(df)
        if hist_fig:
            st.plotly_chart(hist_fig, use_container_width=True)
