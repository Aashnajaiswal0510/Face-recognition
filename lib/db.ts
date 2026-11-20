import path from 'node:path';
import fs from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import {
  EMOTION_CLASSES,
  type AnalyticsSummary,
  type DashboardStats,
  type DetectionRecord,
  type DetectionSource,
  type EmotionLabel,
  type TrainingMetricsPayload,
} from './types';

const DB_PATH = path.join(process.cwd(), 'detections.db');
const TRAINING_METRICS_PATH = path.join(
  process.cwd(),
  'facial-expression-recognition',
  'models',
  'training_metrics.json'
);

let dbInstance: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    dbInstance.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS detections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp DATETIME DEFAULT (datetime('now', 'localtime')),
        source TEXT NOT NULL CHECK(source IN ('upload', 'webcam')),
        emotion TEXT NOT NULL,
        confidence REAL NOT NULL,
        face_index INTEGER NOT NULL DEFAULT 0
      );
      CREATE INDEX IF NOT EXISTS idx_detections_timestamp ON detections(timestamp);
      CREATE INDEX IF NOT EXISTS idx_detections_emotion ON detections(emotion);
      CREATE INDEX IF NOT EXISTS idx_detections_source ON detections(source);
    `);
  }
  return dbInstance;
}

function isValidEmotion(val: string): val is EmotionLabel {
  return (EMOTION_CLASSES as string[]).includes(val);
}

export function getDatabaseHealth() {
  try {
    const db = getDb();
    const row = db.prepare('SELECT COUNT(*) as total FROM detections').get() as
      | { total: number }
      | undefined;
    const stats = fs.existsSync(DB_PATH) ? fs.statSync(DB_PATH) : null;
    return {
      connected: true,
      dbFile: 'detections.db',
      totalRecords: Number(row?.total ?? 0),
      sizeBytes: stats ? stats.size : 0,
    };
  } catch (err) {
    return {
      connected: false,
      dbFile: 'detections.db',
      totalRecords: 0,
      sizeBytes: 0,
      error: err instanceof Error ? err.message : 'Database connection error',
    };
  }
}

export function getTrainingMetrics(): TrainingMetricsPayload {
  try {
    if (!fs.existsSync(TRAINING_METRICS_PATH)) {
      return { available: false };
    }
    const raw = fs.readFileSync(TRAINING_METRICS_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    return { available: true, ...parsed };
  } catch {
    return { available: false };
  }
}

export interface InsertDetectionInput {
  source: DetectionSource;
  emotion: EmotionLabel;
  confidence: number;
  face_index: number;
  timestamp?: string;
}

export function insertDetections(items: InsertDetectionInput[]): DetectionRecord[] {
  if (!items.length) return [];
  const db = getDb();
  const inserted: DetectionRecord[] = [];
  const stmtWithTs = db.prepare(`
    INSERT INTO detections (timestamp, source, emotion, confidence, face_index)
    VALUES (?, ?, ?, ?, ?)
  `);
  const stmtDefaultTs = db.prepare(`
    INSERT INTO detections (timestamp, source, emotion, confidence, face_index)
    VALUES (datetime('now', 'localtime'), ?, ?, ?, ?)
  `);
  const selectById = db.prepare(
    'SELECT id, timestamp, source, emotion, confidence, face_index FROM detections WHERE id = ?'
  );

  db.exec('BEGIN TRANSACTION');
  try {
    for (const item of items) {
      if (item.source !== 'upload' && item.source !== 'webcam') {
        throw new Error(`Invalid detection source: ${item.source}`);
      }
      if (!isValidEmotion(item.emotion)) {
        throw new Error(`Invalid emotion label: ${item.emotion}`);
      }
      const boundedConf = Math.max(0, Math.min(100, Number(item.confidence.toFixed(2))));
      const faceIdx = Math.max(0, Math.floor(Number(item.face_index) || 0));

      const res = item.timestamp
        ? stmtWithTs.run(item.timestamp, item.source, item.emotion, boundedConf, faceIdx)
        : stmtDefaultTs.run(item.source, item.emotion, boundedConf, faceIdx);

      const created = selectById.get(Number(res.lastInsertRowid)) as unknown as DetectionRecord;
      if (created) inserted.push(created);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return inserted;
}

export function getDashboardStats(): DashboardStats {
  const db = getDb();

  const totalsRow = db
    .prepare(
      `
      SELECT
        COUNT(*) AS totalFaces,
        SUM(CASE WHEN source = 'upload' AND face_index = 0 THEN 1 ELSE 0 END) AS totalImages,
        SUM(CASE WHEN source = 'webcam' THEN 1 ELSE 0 END) AS totalWebcam,
        AVG(confidence) AS avgConfidence,
        SUM(CASE WHEN date(timestamp) = date('now', 'localtime') THEN 1 ELSE 0 END) AS todaysDetections
      FROM detections
    `
    )
    .get() as {
    totalFaces: number;
    totalImages: number | null;
    totalWebcam: number | null;
    avgConfidence: number | null;
    todaysDetections: number | null;
  };

  const totalFacesDetected = Number(totalsRow?.totalFaces ?? 0);

  const distRows = db
    .prepare(
      `
      SELECT emotion, COUNT(*) as count
      FROM detections
      GROUP BY emotion
    `
    )
    .all() as { emotion: string; count: number }[];

  const countMap = new Map<EmotionLabel, number>();
  for (const label of EMOTION_CLASSES) countMap.set(label, 0);
  for (const r of distRows) {
    if (isValidEmotion(r.emotion)) {
      countMap.set(r.emotion, Number(r.count));
    }
  }

  let mostFrequentEmotion: EmotionLabel | null = null;
  let maxCount = 0;
  const distribution = EMOTION_CLASSES.map((emotion) => {
    const count = countMap.get(emotion) ?? 0;
    if (count > maxCount) {
      maxCount = count;
      mostFrequentEmotion = emotion;
    }
    const percentage =
      totalFacesDetected > 0 ? Number(((count / totalFacesDetected) * 100).toFixed(1)) : 0;
    return { emotion, count, percentage };
  });

  const recentDetections = db
    .prepare(
      `
      SELECT id, timestamp, source, emotion, confidence, face_index
      FROM detections
      ORDER BY id DESC
      LIMIT 8
    `
    )
    .all() as unknown as DetectionRecord[];

  return {
    totalFacesDetected,
    totalImagesAnalyzed: Number(totalsRow?.totalImages ?? 0),
    totalWebcamDetections: Number(totalsRow?.totalWebcam ?? 0),
    mostFrequentEmotion,
    averageConfidence:
      totalsRow?.avgConfidence != null ? Number(Number(totalsRow.avgConfidence).toFixed(2)) : 0,
    todaysDetections: Number(totalsRow?.todaysDetections ?? 0),
    distribution,
    recentDetections,
  };
}

export interface DetectionQueryFilters {
  search?: string;
  emotion?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: 'id' | 'timestamp' | 'confidence' | 'emotion' | 'source';
  sortDir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

function buildWhereClause(filters: {
  search?: string;
  emotion?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
}) {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.emotion && filters.emotion !== 'All' && isValidEmotion(filters.emotion)) {
    conditions.push('emotion = ?');
    params.push(filters.emotion);
  }
  if (filters.source && (filters.source === 'upload' || filters.source === 'webcam')) {
    conditions.push('source = ?');
    params.push(filters.source);
  }
  if (filters.startDate) {
    conditions.push('date(timestamp) >= date(?)');
    params.push(filters.startDate);
  }
  if (filters.endDate) {
    conditions.push('date(timestamp) <= date(?)');
    params.push(filters.endDate);
  }
  if (filters.search && filters.search.trim()) {
    const q = `%${filters.search.trim()}%`;
    conditions.push('(CAST(id AS TEXT) LIKE ? OR emotion LIKE ? OR source LIKE ? OR timestamp LIKE ?)');
    params.push(q, q, q, q);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereSql, params };
}

export function queryDetections(filters: DetectionQueryFilters = {}) {
  const db = getDb();
  const { whereSql, params } = buildWhereClause(filters);

  const allowedCols = new Set(['id', 'timestamp', 'confidence', 'emotion', 'source']);
  const sortCol = filters.sortBy && allowedCols.has(filters.sortBy) ? filters.sortBy : 'id';
  const sortDir = filters.sortDir === 'asc' ? 'ASC' : 'DESC';

  const page = Math.max(1, Number(filters.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(filters.pageSize ?? 15)));
  const offset = (page - 1) * pageSize;

  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM detections ${whereSql}`)
    .get(...params) as { total: number };
  const total = Number(countRow?.total ?? 0);

  const records = db
    .prepare(
      `
      SELECT id, timestamp, source, emotion, confidence, face_index
      FROM detections
      ${whereSql}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT ? OFFSET ?
    `
    )
    .all(...params, pageSize, offset) as unknown as DetectionRecord[];

  return {
    records,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export function getAnalytics(options: {
  preset?: 'today' | '7d' | '30d' | 'all' | 'custom';
  startDate?: string;
  endDate?: string;
  source?: string;
}): AnalyticsSummary {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.source && (options.source === 'upload' || options.source === 'webcam')) {
    conditions.push('source = ?');
    params.push(options.source);
  }

  const preset = options.preset ?? 'all';
  if (preset === 'today') {
    conditions.push("date(timestamp) = date('now', 'localtime')");
  } else if (preset === '7d') {
    conditions.push("date(timestamp) >= date('now', 'localtime', '-6 days')");
  } else if (preset === '30d') {
    conditions.push("date(timestamp) >= date('now', 'localtime', '-29 days')");
  } else if (preset === 'custom') {
    if (options.startDate) {
      conditions.push('date(timestamp) >= date(?)');
      params.push(options.startDate);
    }
    if (options.endDate) {
      conditions.push('date(timestamp) <= date(?)');
      params.push(options.endDate);
    }
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db
    .prepare(
      `
      SELECT id, timestamp, source, emotion, confidence, face_index
      FROM detections
      ${whereSql}
      ORDER BY timestamp ASC
    `
    )
    .all(...params) as unknown as DetectionRecord[];

  const totalDetections = rows.length;
  const counts: Record<EmotionLabel, number> = {
    Angry: 0,
    Disgust: 0,
    Fear: 0,
    Happy: 0,
    Neutral: 0,
    Sad: 0,
    Surprise: 0,
  };

  const buckets = new Map<
    string,
    {
      Angry: number;
      Disgust: number;
      Fear: number;
      Happy: number;
      Neutral: number;
      Sad: number;
      Surprise: number;
      total: number;
    }
  >();

  const sourceStats: Record<DetectionSource, { count: number; sumConf: number }> = {
    upload: { count: 0, sumConf: 0 },
    webcam: { count: 0, sumConf: 0 },
  };

  const histBins = [
    { range: '0-20%', min: 0, max: 20, count: 0 },
    { range: '20-40%', min: 20, max: 40, count: 0 },
    { range: '40-60%', min: 40, max: 60, count: 0 },
    { range: '60-80%', min: 60, max: 80, count: 0 },
    { range: '80-100%', min: 80, max: 100.01, count: 0 },
  ];

  for (const r of rows) {
    if (isValidEmotion(r.emotion)) {
      counts[r.emotion] += 1;
    }

    const bucketKey = preset === 'today' ? r.timestamp.slice(11, 13) + ':00' : r.timestamp.slice(0, 10);
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, {
        Angry: 0,
        Disgust: 0,
        Fear: 0,
        Happy: 0,
        Neutral: 0,
        Sad: 0,
        Surprise: 0,
        total: 0,
      });
    }
    const b = buckets.get(bucketKey)!;
    if (isValidEmotion(r.emotion)) {
      b[r.emotion] += 1;
    }
    b.total += 1;

    if (r.source === 'upload' || r.source === 'webcam') {
      sourceStats[r.source].count += 1;
      sourceStats[r.source].sumConf += Number(r.confidence);
    }

    const conf = Number(r.confidence);
    for (const bin of histBins) {
      if (conf >= bin.min && conf < bin.max) {
        bin.count += 1;
        break;
      }
    }
  }

  let mostCommonEmotion: EmotionLabel | null = null;
  let maxVal = 0;
  const distribution = EMOTION_CLASSES.map((emotion) => {
    const count = counts[emotion];
    if (count > maxVal) {
      maxVal = count;
      mostCommonEmotion = emotion;
    }
    const percentage = totalDetections > 0 ? Number(((count / totalDetections) * 100).toFixed(1)) : 0;
    return { emotion, count, percentage };
  });

  const trendsOverTime = Array.from(buckets.entries()).map(([bucket, values]) => ({
    bucket,
    ...values,
  }));

  const sourceComparison: { source: DetectionSource; count: number; avgConfidence: number }[] = [
    {
      source: 'upload',
      count: sourceStats.upload.count,
      avgConfidence:
        sourceStats.upload.count > 0
          ? Number((sourceStats.upload.sumConf / sourceStats.upload.count).toFixed(1))
          : 0,
    },
    {
      source: 'webcam',
      count: sourceStats.webcam.count,
      avgConfidence:
        sourceStats.webcam.count > 0
          ? Number((sourceStats.webcam.sumConf / sourceStats.webcam.count).toFixed(1))
          : 0,
    },
  ];

  return {
    totalDetections,
    happyCount: counts.Happy,
    sadCount: counts.Sad,
    angryCount: counts.Angry,
    neutralCount: counts.Neutral,
    mostCommonEmotion,
    distribution,
    trendsOverTime,
    sourceComparison,
    confidenceHistogram: histBins.map(({ range, count }) => ({ range, count })),
  };
}

export function exportDetectionsCsv(filters: DetectionQueryFilters = {}): string {
  const db = getDb();
  const { whereSql, params } = buildWhereClause(filters);

  const rows = db
    .prepare(
      `
      SELECT id, timestamp, source, emotion, confidence, face_index
      FROM detections
      ${whereSql}
      ORDER BY id DESC
    `
    )
    .all(...params) as unknown as DetectionRecord[];

  const header = 'id,timestamp,source,emotion,confidence,face_index';
  const escapeCsv = (val: unknown) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = rows.map((r) =>
    [r.id, r.timestamp, r.source, r.emotion, r.confidence.toFixed(2), r.face_index]
      .map(escapeCsv)
      .join(',')
  );

  return [header, ...lines].join('\n');
}

export function clearAllDetections(): number {
  const db = getDb();
  const res = db.prepare('DELETE FROM detections').run();
  return Number(res.changes ?? 0);
}
