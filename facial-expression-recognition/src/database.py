"""SQLite 3 database management module for detections.db."""

from contextlib import contextmanager
from pathlib import Path
import sqlite3
from typing import Dict, Iterator, List, Optional
import pandas as pd

from config import DB_PATH, EMOTION_LABELS


@contextmanager
def get_connection(db_path: Path = DB_PATH) -> Iterator[sqlite3.Connection]:
    conn = sqlite3.connect(str(db_path), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def init_db(db_path: Path = DB_PATH) -> None:
    """Create the detections table and indexes if they do not exist."""
    with get_connection(db_path) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS detections (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
                source TEXT NOT NULL CHECK(source IN ('upload', 'webcam')),
                emotion TEXT NOT NULL,
                confidence REAL NOT NULL,
                face_index INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_detections_emotion ON detections(emotion)"
        )
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_detections_source ON detections(source)"
        )


def insert_detection(
    source: str,
    emotion: str,
    confidence: float,
    face_index: int = 0,
    db_path: Path = DB_PATH,
) -> int:
    if source not in ("upload", "webcam"):
        raise ValueError(f"Invalid source '{source}'. Must be 'upload' or 'webcam'.")
    if emotion not in EMOTION_LABELS:
        raise ValueError(f"Invalid emotion '{emotion}'.")

    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.execute(
            """
            INSERT INTO detections (timestamp, source, emotion, confidence, face_index)
            VALUES (datetime('now', 'localtime'), ?, ?, ?, ?)
            """,
            (source, emotion, round(float(confidence), 2), int(face_index)),
        )
        return int(cursor.lastrowid)


def fetch_detections(
    emotion: Optional[str] = None,
    source: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    db_path: Path = DB_PATH,
) -> pd.DataFrame:
    init_db(db_path)
    conditions: List[str] = []
    params: List[object] = []

    if emotion and emotion != "All":
        conditions.append("emotion = ?")
        params.append(emotion)
    if source and source in ("upload", "webcam"):
        conditions.append("source = ?")
        params.append(source)
    if start_date:
        conditions.append("date(timestamp) >= date(?)")
        params.append(start_date)
    if end_date:
        conditions.append("date(timestamp) <= date(?)")
        params.append(end_date)
    if search:
        like = f"%{search.strip()}%"
        conditions.append(
            "(CAST(id AS TEXT) LIKE ? OR emotion LIKE ? OR source LIKE ? OR timestamp LIKE ?)"
        )
        params.extend([like, like, like, like])

    where_sql = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"""
        SELECT id, timestamp, source, emotion, confidence, face_index
        FROM detections
        {where_sql}
        ORDER BY id DESC
    """
    with get_connection(db_path) as conn:
        return pd.read_sql_query(query, conn, params=params)


def get_dashboard_summary(db_path: Path = DB_PATH) -> Dict[str, object]:
    init_db(db_path)
    with get_connection(db_path) as conn:
        row = conn.execute(
            """
            SELECT
                COUNT(*) AS total_faces,
                SUM(CASE WHEN source = 'upload' AND face_index = 0 THEN 1 ELSE 0 END) AS total_images,
                SUM(CASE WHEN source = 'webcam' THEN 1 ELSE 0 END) AS total_webcam,
                AVG(confidence) AS avg_confidence,
                SUM(CASE WHEN date(timestamp) = date('now', 'localtime') THEN 1 ELSE 0 END) AS today_count
            FROM detections
            """
        ).fetchone()

        top_row = conn.execute(
            """
            SELECT emotion, COUNT(*) AS cnt
            FROM detections
            GROUP BY emotion
            ORDER BY cnt DESC
            LIMIT 1
            """
        ).fetchone()

    return {
        "total_faces": int(row["total_faces"] or 0),
        "total_images": int(row["total_images"] or 0),
        "total_webcam": int(row["total_webcam"] or 0),
        "avg_confidence": round(float(row["avg_confidence"] or 0.0), 2),
        "today_count": int(row["today_count"] or 0),
        "most_frequent_emotion": top_row["emotion"] if top_row else None,
    }


def export_to_csv(output_path: Path, df: Optional[pd.DataFrame] = None) -> Path:
    output_path.parent.mkdir(parents=True, exist_ok=True)
    target_df = df if df is not None else fetch_detections()
    target_df.to_csv(output_path, index=False)
    return output_path


def clear_history(db_path: Path = DB_PATH) -> int:
    init_db(db_path)
    with get_connection(db_path) as conn:
        cursor = conn.execute("DELETE FROM detections")
        return int(cursor.rowcount)
