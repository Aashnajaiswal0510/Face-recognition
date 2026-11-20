'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Camera,
  Square,
  AlertCircle,
  Loader2,
  BookmarkCheck,
  VideoOff,
} from 'lucide-react';
import {
  EMOTION_META,
  type AppSettings,
  type FaceDetectionOutput,
} from '@/lib/types';
import {
  detectAndClassifyFaces,
  drawAnnotatedDetections,
  ensureModelsLoaded,
} from '@/lib/visionEngine';

export default function WebcamDetectionView({
  settings,
  onDatabaseUpdated,
}: {
  settings: AppSettings;
  onDatabaseUpdated: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const runningRef = useRef(false);
  const rafRef = useRef<number | null>(null);
  const lastLogTimeRef = useRef<number>(0);

  const [cameraActive, setCameraActive] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detections, setDetections] = useState<FaceDetectionOutput[]>([]);
  const [fps, setFps] = useState<number>(0);
  const [loggedCount, setLoggedCount] = useState<number>(0);

  const persistFaces = useCallback(
    async (faces: FaceDetectionOutput[]) => {
      if (!faces.length) return;
      try {
        const res = await fetch('/api/detections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            detections: faces.map((f) => ({
              source: 'webcam',
              emotion: f.emotion,
              confidence: f.confidence,
              face_index: f.faceIndex,
            })),
          }),
        });
        if (res.ok) {
          setLoggedCount((prev) => prev + faces.length);
          onDatabaseUpdated();
        }
      } catch {
        // Ignore transient logging failure during stream
      }
    },
    [onDatabaseUpdated]
  );

  const stopCamera = useCallback(() => {
    runningRef.current = false;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) {
        track.stop();
      }
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setFps(0);
    setDetections([]);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const startCamera = async () => {
    setError(null);
    setStarting(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Webcam API is unavailable in this browser context.');
      }

      await ensureModelsLoaded();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 960 }, height: { ideal: 540 }, facingMode: 'user' },
        audio: false,
      });

      streamRef.current = stream;
      if (!videoRef.current) throw new Error('Video element unavailable.');

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      runningRef.current = true;
      setCameraActive(true);
      setStarting(false);

      let frameCounter = 0;
      let fpsWindowStart = performance.now();

      const processFrame = async () => {
        if (!runningRef.current || !videoRef.current || !overlayCanvasRef.current) return;

        const video = videoRef.current;
        if (video.readyState >= 2 && video.videoWidth > 0) {
          try {
            const faces = await detectAndClassifyFaces(video, settings);
            if (!runningRef.current) return;

            setDetections(faces);
            drawAnnotatedDetections(
              overlayCanvasRef.current,
              video.videoWidth,
              video.videoHeight,
              faces
            );

            frameCounter += 1;
            const now = performance.now();
            if (now - fpsWindowStart >= 1000) {
              setFps(Number(((frameCounter * 1000) / (now - fpsWindowStart)).toFixed(1)));
              frameCounter = 0;
              fpsWindowStart = now;
            }

            if (
              settings.webcamAutoLog &&
              faces.length > 0 &&
              now - lastLogTimeRef.current >= settings.webcamLogIntervalSec * 1000
            ) {
              lastLogTimeRef.current = now;
              void persistFaces(faces);
            }
          } catch {
            // Continue frame loop if single frame decode drops
          }
        }

        if (runningRef.current) {
          rafRef.current = requestAnimationFrame(processFrame);
        }
      };

      rafRef.current = requestAnimationFrame(processFrame);
    } catch (err) {
      stopCamera();
      setStarting(false);
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError(
          'Camera permission denied. Please grant webcam access in your browser settings and try again.'
        );
      } else if (err instanceof DOMException && err.name === 'NotFoundError') {
        setError('No webcam device detected on this machine.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to start webcam stream.');
      }
    }
  };

  const primaryFace = detections[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#172033] tracking-tight">
            Live Webcam Detection
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Real-time frame processing: Webcam → Face Detector → 48×48 Grayscale → CNN Softmax → SQLite Log.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {!cameraActive ? (
            <button
              type="button"
              onClick={startCamera}
              disabled={starting}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#315EAD] rounded-lg hover:bg-[#274c8e] disabled:opacity-60 transition-colors whitespace-nowrap shrink-0"
            >
              {starting ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Camera className="w-3.5 h-3.5" />
              )}
              {starting ? 'Initializing CNN & Camera...' : 'Start Camera'}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => persistFaces(detections)}
                disabled={detections.length === 0}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#172033] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-[#16A36A]" />
                Log Snapshot Now
              </button>
              <button
                type="button"
                onClick={stopCamera}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#E05252] rounded-lg hover:bg-[#c53f3f] transition-colors whitespace-nowrap shrink-0"
              >
                <Square className="w-3.5 h-3.5" />
                Stop Camera
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2.5 text-xs bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Live Metrics Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <p className="text-xs text-[#64748B]">Primary Emotion</p>
          <p
            className="text-xl font-bold mt-1"
            style={{
              color: primaryFace ? EMOTION_META[primaryFace.emotion].color : '#172033',
            }}
          >
            {primaryFace ? primaryFace.emotion : '—'}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <p className="text-xs text-[#64748B]">Confidence Score</p>
          <p className="text-xl font-bold text-[#172033] mt-1 font-mono-tabular">
            {primaryFace ? `${primaryFace.confidence.toFixed(1)}%` : '0.0%'}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <p className="text-xs text-[#64748B]">Faces in Frame</p>
          <p className="text-xl font-bold text-[#172033] mt-1 font-mono-tabular">
            {detections.length}
          </p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
          <p className="text-xs text-[#64748B]">Detection FPS · Logged</p>
          <p className="text-xl font-bold text-[#172033] mt-1 font-mono-tabular">
            {fps} FPS <span className="text-xs font-normal text-[#64748B]">· {loggedCount} saved</span>
          </p>
        </div>
      </div>

      {/* Live Video + Side Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-8 bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#64748B]">
            <span className="font-semibold text-[#172033] text-sm">Camera Viewport</span>
            <span>
              {cameraActive
                ? settings.webcamAutoLog
                  ? `Auto-logging every ${settings.webcamLogIntervalSec}s`
                  : 'Manual snapshot logging'
                : 'Camera standby'}
            </span>
          </div>

          <div className="relative bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            <video
              ref={videoRef}
              playsInline
              muted
              className={`w-full h-full object-contain ${cameraActive ? 'block' : 'hidden'}`}
            />
            <canvas
              ref={overlayCanvasRef}
              className={`absolute inset-0 w-full h-full object-contain pointer-events-none ${
                cameraActive ? 'block' : 'hidden'
              }`}
            />

            {!cameraActive && (
              <div className="text-center p-6 space-y-2">
                <VideoOff className="w-10 h-10 text-[#94A3B8] mx-auto" />
                <p className="text-sm font-medium text-[#172033]">Webcam Feed Inactive</p>
                <p className="text-xs text-[#64748B] max-w-sm">
                  Click &ldquo;Start Camera&rdquo; to request browser camera permissions and run real-time multi-face CNN emotion recognition.
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-[#172033]">Detected Faces in Frame</h2>
          {!cameraActive ? (
            <p className="text-xs text-[#64748B] py-8 text-center">
              Start the webcam to inspect real-time softmax scores per face.
            </p>
          ) : detections.length === 0 ? (
            <p className="text-xs text-[#64748B] py-8 text-center">
              No face detected in current frame. Center your face in good lighting.
            </p>
          ) : (
            <div className="space-y-4">
              {detections.map((face) => (
                <div
                  key={face.faceIndex}
                  className="p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#172033]">
                      Face #{face.faceIndex} ·{' '}
                      <span style={{ color: EMOTION_META[face.emotion].color }}>
                        {face.emotion}
                      </span>
                    </span>
                    <span className="text-xs font-mono-tabular font-semibold text-[#172033]">
                      {face.confidence.toFixed(1)}%
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {face.probabilities.slice(0, 4).map((p) => (
                      <div key={p.emotion} className="flex items-center gap-2 text-[11px]">
                        <span className="w-16 text-[#64748B]">{p.emotion}</span>
                        <div className="flex-1 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${p.probability}%`,
                              backgroundColor: EMOTION_META[p.emotion].color,
                            }}
                          />
                        </div>
                        <span className="w-11 text-right font-mono-tabular text-[#172033]">
                          {p.probability.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
