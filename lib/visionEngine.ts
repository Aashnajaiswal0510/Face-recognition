'use client';

import type * as FaceApiTypes from '@vladmandic/face-api';
import {
  EMOTION_CLASSES,
  EMOTION_META,
  type AppSettings,
  type EmotionLabel,
  type EmotionProbability,
  type FaceDetectionOutput,
} from './types';

let faceapiModule: typeof FaceApiTypes | null = null;
let modelsPromise: Promise<void> | null = null;
let loadedState: 'idle' | 'loading' | 'ready' | 'error' = 'idle';
let lastLoadError: string | null = null;

const MODEL_URI = '/models';

const EXPRESSION_KEY_MAP: Record<string, EmotionLabel> = {
  angry: 'Angry',
  disgusted: 'Disgust',
  fearful: 'Fear',
  happy: 'Happy',
  neutral: 'Neutral',
  sad: 'Sad',
  surprised: 'Surprise',
};

async function getFaceApi(): Promise<typeof FaceApiTypes> {
  if (typeof window === 'undefined') {
    throw new Error('CNN vision engine runs only in the browser.');
  }
  if (!faceapiModule) {
    faceapiModule = await import('@vladmandic/face-api');
  }
  return faceapiModule;
}

export function getModelStatus(): {
  state: 'idle' | 'loading' | 'ready' | 'error';
  error: string | null;
} {
  return { state: loadedState, error: lastLoadError };
}

export async function ensureModelsLoaded(): Promise<void> {
  if (loadedState === 'ready') return;
  if (modelsPromise) return modelsPromise;

  loadedState = 'loading';
  lastLoadError = null;

  modelsPromise = (async () => {
    try {
      const faceapi = await getFaceApi();
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URI),
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URI),
        faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URI),
      ]);
      loadedState = 'ready';
    } catch (err) {
      loadedState = 'error';
      lastLoadError =
        err instanceof Error ? err.message : 'Failed to load CNN weights from /models';
      modelsPromise = null;
      throw err;
    }
  })();

  return modelsPromise;
}

export function extract48x48GrayscaleCrop(
  source: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  box: { x: number; y: number; width: number; height: number }
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 48;
  canvas.height = 48;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const sx = Math.max(0, Math.floor(box.x));
  const sy = Math.max(0, Math.floor(box.y));
  const sw = Math.max(1, Math.floor(box.width));
  const sh = Math.max(1, Math.floor(box.height));

  ctx.drawImage(source, sx, sy, sw, sh, 0, 0, 48, 48);
  const imgData = ctx.getImageData(0, 0, 48, 48);
  const data = imgData.data;

  // Convert RGB -> Grayscale using ITU-R BT.601 luminance weights (matches OpenCV cvtColor BGR2GRAY)
  for (let i = 0; i < data.length; i += 4) {
    const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/png');
}

export async function detectAndClassifyFaces(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement,
  settings: AppSettings
): Promise<FaceDetectionOutput[]> {
  await ensureModelsLoaded();
  const faceapi = await getFaceApi();

  const options =
    settings.detectorBackend === 'tiny_face_detector'
      ? new faceapi.TinyFaceDetectorOptions({
          inputSize: 416,
          scoreThreshold: settings.minConfidence,
        })
      : new faceapi.SsdMobilenetv1Options({
          minConfidence: settings.minConfidence,
          maxResults: 20,
        });

  const detections = await faceapi.detectAllFaces(input, options).withFaceExpressions();

  // Sort faces left-to-right, top-to-bottom for deterministic face_index
  const sorted = [...detections].sort((a, b) => {
    const dx = a.detection.box.x - b.detection.box.x;
    if (Math.abs(dx) > 40) return dx;
    return a.detection.box.y - b.detection.box.y;
  });

  return sorted.map((item, idx) => {
    const box = item.detection.box;
    const rawExpressions = item.expressions as unknown as Record<string, number>;

    const probMap = new Map<EmotionLabel, number>();
    let sum = 0;
    for (const [rawKey, prob] of Object.entries(rawExpressions)) {
      const mapped = EXPRESSION_KEY_MAP[rawKey];
      if (mapped && typeof prob === 'number' && !Number.isNaN(prob)) {
        probMap.set(mapped, prob);
        sum += prob;
      }
    }

    const probabilities: EmotionProbability[] = EMOTION_CLASSES.map((emotion) => {
      const val = probMap.get(emotion) ?? 0;
      const normalized = sum > 0 ? (val / sum) * 100 : 0;
      return {
        emotion,
        probability: Number(normalized.toFixed(2)),
      };
    });

    let topEmotion: EmotionLabel = 'Neutral';
    let topProb = -1;
    for (const p of probabilities) {
      if (p.probability > topProb) {
        topProb = p.probability;
        topEmotion = p.emotion;
      }
    }

    const grayscale48DataUrl = settings.showPreprocessedCrop
      ? extract48x48GrayscaleCrop(input, box)
      : '';

    return {
      faceIndex: idx,
      box: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height),
      },
      emotion: topEmotion,
      confidence: Number(topProb.toFixed(2)),
      probabilities: [...probabilities].sort((a, b) => b.probability - a.probability),
      grayscale48DataUrl,
    };
  });
}

export function drawAnnotatedDetections(
  canvas: HTMLCanvasElement,
  sourceWidth: number,
  sourceHeight: number,
  detections: FaceDetectionOutput[],
  options?: { drawSource?: HTMLImageElement | HTMLCanvasElement; mirror?: boolean }
) {
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, sourceWidth, sourceHeight);

  if (options?.drawSource) {
    ctx.drawImage(options.drawSource, 0, 0, sourceWidth, sourceHeight);
  }

  const lineScale = Math.max(1.5, Math.min(3.5, sourceWidth / 380));
  const fontSize = Math.max(12, Math.min(20, Math.round(sourceWidth / 44)));

  for (const det of detections) {
    const color = EMOTION_META[det.emotion].color;
    const x = options?.mirror ? sourceWidth - det.box.x - det.box.width : det.box.x;
    const y = det.box.y;
    const w = det.box.width;
    const h = det.box.height;

    // Bounding box
    ctx.strokeStyle = color;
    ctx.lineWidth = lineScale;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 6);
    ctx.stroke();

    // Label banner above bounding box
    const labelText = `#${det.faceIndex} ${det.emotion} ${det.confidence.toFixed(1)}%`;
    ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
    const metrics = ctx.measureText(labelText);
    const padX = 8;
    const padY = 5;
    const labelW = metrics.width + padX * 2;
    const labelH = fontSize + padY * 2;
    const labelY = y - labelH - 4 >= 0 ? y - labelH - 4 : y + 4;
    const labelX = Math.max(2, Math.min(x, sourceWidth - labelW - 2));

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(labelX, labelY, labelW, labelH, 5);
    ctx.fill();

    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.fillText(labelText, labelX + padX, labelY + labelH / 2);
  }
}
