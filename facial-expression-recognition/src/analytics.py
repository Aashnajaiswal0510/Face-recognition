"""Analytics and Plotly visualization module backed by SQLite records."""

from typing import Optional
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go

from config import EMOTION_COLORS, EMOTION_LABELS


def compute_distribution(df: pd.DataFrame) -> pd.DataFrame:
    total = len(df)
    counts = df["emotion"].value_counts().to_dict() if not df.empty else {}
    rows = []
    for label in EMOTION_LABELS:
        cnt = int(counts.get(label, 0))
        pct = round((cnt / total) * 100.0, 1) if total > 0 else 0.0
        rows.append({"emotion": label, "count": cnt, "percentage": pct})
    return pd.DataFrame(rows)


def build_donut_chart(dist_df: pd.DataFrame) -> go.Figure:
    fig = px.pie(
        dist_df,
        names="emotion",
        values="count",
        hole=0.58,
        color="emotion",
        color_discrete_map=EMOTION_COLORS,
    )
    fig.update_layout(
        paper_bgcolor="#FFFFFF",
        plot_bgcolor="#FFFFFF",
        margin=dict(t=20, b=20, l=20, r=20),
        legend=dict(orientation="h", yanchor="bottom", y=-0.15),
    )
    return fig


def build_bar_chart(dist_df: pd.DataFrame) -> go.Figure:
    fig = px.bar(
        dist_df,
        x="emotion",
        y="count",
        color="emotion",
        color_discrete_map=EMOTION_COLORS,
        text="count",
    )
    fig.update_layout(
        showlegend=False,
        paper_bgcolor="#FFFFFF",
        plot_bgcolor="#FFFFFF",
        margin=dict(t=20, b=20, l=20, r=20),
        xaxis_title="Emotion",
        yaxis_title="Detections",
    )
    return fig


def build_trend_line_chart(df: pd.DataFrame) -> Optional[go.Figure]:
    if df.empty:
        return None
    work = df.copy()
    work["date"] = pd.to_datetime(work["timestamp"]).dt.strftime("%Y-%m-%d")
    grouped = work.groupby(["date", "emotion"]).size().reset_index(name="count")
    fig = px.line(
        grouped,
        x="date",
        y="count",
        color="emotion",
        markers=True,
        color_discrete_map=EMOTION_COLORS,
    )
    fig.update_layout(
        paper_bgcolor="#FFFFFF",
        plot_bgcolor="#FFFFFF",
        margin=dict(t=20, b=20, l=20, r=20),
        xaxis_title="Date",
        yaxis_title="Count",
    )
    return fig


def build_source_comparison_chart(df: pd.DataFrame) -> Optional[go.Figure]:
    if df.empty:
        return None
    grouped = (
        df.groupby("source")
        .agg(count=("id", "count"), avg_confidence=("confidence", "mean"))
        .reset_index()
    )
    fig = px.bar(
        grouped,
        x="source",
        y="count",
        color="source",
        color_discrete_map={"upload": "#315EAD", "webcam": "#6477D9"},
        text="count",
    )
    fig.update_layout(
        showlegend=False,
        paper_bgcolor="#FFFFFF",
        plot_bgcolor="#FFFFFF",
        margin=dict(t=20, b=20, l=20, r=20),
        xaxis_title="Source",
        yaxis_title="Detections",
    )
    return fig


def build_confidence_histogram(df: pd.DataFrame) -> Optional[go.Figure]:
    if df.empty:
        return None
    fig = px.histogram(
        df,
        x="confidence",
        nbins=10,
        range_x=[0, 100],
        color_discrete_sequence=["#315EAD"],
    )
    fig.update_layout(
        paper_bgcolor="#FFFFFF",
        plot_bgcolor="#FFFFFF",
        margin=dict(t=20, b=20, l=20, r=20),
        xaxis_title="Confidence (%)",
        yaxis_title="Frequency",
    )
    return fig
