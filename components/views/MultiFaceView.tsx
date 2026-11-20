'use client';

import React, { useRef, useState } from 'react';
import {
  Users,
  Upload,
  ScanFace,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  EMOTION_META,
  type AppSettings,
  type FaceDetectionOutput,
} from '@/lib/types';
import { detectAndClassifyFaces, drawAnnotatedDetections } from '@/lib/visionEngine';

export default function MultiFaceView({
  settings,
  onDatabaseUpdated,
}: {
  settings: AppSettings;
  onDatabaseUpdated: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [faces, setFaces] = useState<FaceDetectionOutput[] | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'warning' | 'error'; text: string } | null>(null);

  const handleSelectFile = (file: File) => {
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setNotice({ type: 'error', text: 'Please select a JPG, JPEG, or PNG image.' });
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setFaces(null);
    setNotice(null);
  };

  const handleAnalyzeGroup = async () => {
    if (!previewUrl) return;
    setAnalyzing(true);
    setNotice(null);
    try {
      const img = new Image();
      img.src = previewUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to decode image'));
      });

      const detected = await detectAndClassifyFaces(img, settings);
      setFaces(detected);

      if (detected.length === 0) {
        setNotice({
          type: 'warning',
          text: 'No faces detected in this image. Adjust minimum confidence in Settings if faces are small.',
        });
        return;
      }

      requestAnimationFrame(() => {
        if (canvasRef.current) {
          drawAnnotatedDetections(
            canvasRef.current,
            img.naturalWidth,
            img.naturalHeight,
            detected,
            { drawSource: img }
          );
        }
      });

      const res = await fetch('/api/detections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detections: detected.map((f) => ({
            source: 'upload',
            emotion: f.emotion,
            confidence: f.confidence,
            face_index: f.faceIndex,
          })),
        }),
      });
      if (!res.ok) throw new Error('Failed to store multi-face records in SQLite.');

      onDatabaseUpdated();
      setNotice({
        type: 'success',
        text: `Processed ${detected.length} independent ${
          detected.length === 1 ? 'face' : 'faces'
        } and logged each face_index (0–${detected.length - 1}) into detections.db.`,
      });
    } catch (err) {
      setNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Multi-face inference failed.',
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFaces(null);
    setNotice(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#172033] tracking-tight">
          Multi-Face Detection
        </h1>
        <p className="text-sm text-[#64748B] mt-0.5">
          Detect and classify multiple faces simultaneously in group photos. Each face is cropped to 48×48 grayscale, scored independently, and recorded with its <span className="font-mono-tabular">face_index</span>.
        </p>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
        <input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleSelectFile(f);
          }}
        />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] flex items-center justify-center">
            <Users className="w-5 h-5 text-[#315EAD]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#172033]">Group & Multi-Subject Analyzer</p>
            <p className="text-xs text-[#64748B]">
              Supports up to 20 simultaneous faces sorted left-to-right
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#172033] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-[#315EAD]" />
            Select Group Photo
          </button>
          {previewUrl && (
            <>
              <button
                type="button"
                onClick={handleAnalyzeGroup}
                disabled={analyzing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#315EAD] rounded-lg hover:bg-[#274c8e] disabled:opacity-60 transition-colors"
              >
                {analyzing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ScanFace className="w-3.5 h-3.5" />
                )}
                {analyzing ? 'Detecting Faces...' : 'Detect All Faces'}
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#E05252] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#FEF2F2] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {notice && (
        <div
          className={`flex items-center gap-2 text-xs rounded-xl px-4 py-3 border ${
            notice.type === 'success'
              ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#15803D]'
              : notice.type === 'warning'
              ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
          }`}
        >
          {notice.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{notice.text}</span>
        </div>
      )}

      {previewUrl && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-[#172033]">
              {faces && faces.length > 0 ? 'Multi-Face Bounding Box Map' : 'Selected Image'}
            </h2>
            {faces && (
              <span className="text-xs font-mono-tabular text-[#64748B]">
                Total Faces: {faces.length}
              </span>
            )}
          </div>
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center justify-center overflow-hidden min-h-[260px]">
            {faces && faces.length > 0 ? (
              <canvas ref={canvasRef} className="max-w-full max-h-[500px] object-contain" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Multi-face upload preview"
                className="max-w-full max-h-[500px] object-contain"
              />
            )}
          </div>
        </div>
      )}

      {faces && faces.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {faces.map((face) => (
            <div
              key={face.faceIndex}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-mono-tabular text-[#64748B]">
                    face_index: {face.faceIndex} · box ({face.box.x}, {face.box.y},{' '}
                    {face.box.width}×{face.box.height})
                  </p>
                  <p
                    className="text-lg font-bold mt-1"
                    style={{ color: EMOTION_META[face.emotion].color }}
                  >
                    {face.emotion}
                  </p>
                  <p className="text-xs font-mono-tabular text-[#172033] font-semibold">
                    Confidence: {face.confidence.toFixed(2)}%
                  </p>
                </div>

                {face.grayscale48DataUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={face.grayscale48DataUrl}
                    alt={`Face ${face.faceIndex} preprocessed 48x48`}
                    className="w-14 h-14 rounded-lg border border-[#E2E8F0] shrink-0"
                    style={{ imageRendering: 'pixelated' }}
                  />
                )}
              </div>

              <div className="space-y-1.5 pt-2 border-t border-[#E2E8F0]">
                {face.probabilities.slice(0, 5).map((p) => (
                  <div key={p.emotion} className="flex items-center gap-2 text-xs">
                    <span className="w-16 text-[#64748B]">{p.emotion}</span>
                    <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${p.probability}%`,
                          backgroundColor: EMOTION_META[p.emotion].color,
                        }}
                      />
                    </div>
                    <span className="w-12 text-right font-mono-tabular text-[#172033]">
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
  );
}
