'use client';

import React, { useRef, useState } from 'react';
import {
  Upload,
  ScanFace,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ImagePlus,
} from 'lucide-react';
import {
  EMOTION_META,
  type AppSettings,
  type FaceDetectionOutput,
} from '@/lib/types';
import { detectAndClassifyFaces, drawAnnotatedDetections } from '@/lib/visionEngine';

export default function ImageDetectionView({
  settings,
  onDatabaseUpdated,
}: {
  settings: AppSettings;
  onDatabaseUpdated: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const annotatedCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [pipelineStep, setPipelineStep] = useState<string>('');
  const [results, setResults] = useState<FaceDetectionOutput[] | null>(null);
  const [selectedFaceIdx, setSelectedFaceIdx] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const handleFile = (file: File) => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      setStatusMessage({
        type: 'error',
        text: 'Unsupported file format. Please upload a JPG, JPEG, or PNG image.',
      });
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setFileName(file.name);
    setResults(null);
    setStatusMessage(null);
    setSelectedFaceIdx(0);
  };

  const handleClear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileName('');
    setResults(null);
    setStatusMessage(null);
    setPipelineStep('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAnalyze = async () => {
    if (!previewUrl) return;
    setAnalyzing(true);
    setStatusMessage(null);
    setResults(null);

    try {
      setPipelineStep('Loading CNN weights & decoding image...');
      const img = new Image();
      img.src = previewUrl;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to decode uploaded image'));
      });

      setPipelineStep('Detecting faces & extracting 48×48 grayscale tensors...');
      const detections = await detectAndClassifyFaces(img, settings);

      if (detections.length === 0) {
        setResults([]);
        setStatusMessage({
          type: 'warning',
          text: 'No human face detected in this image. Try a clearer frontal face photo or lower the detection threshold in Settings.',
        });
        setPipelineStep('');
        return;
      }

      setResults(detections);
      setSelectedFaceIdx(0);

      // Draw annotated output after state update paints canvas
      requestAnimationFrame(() => {
        if (annotatedCanvasRef.current) {
          drawAnnotatedDetections(
            annotatedCanvasRef.current,
            img.naturalWidth,
            img.naturalHeight,
            detections,
            { drawSource: img }
          );
        }
      });

      setPipelineStep('Persisting face predictions to SQLite (detections.db)...');
      const saveRes = await fetch('/api/detections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          detections: detections.map((d) => ({
            source: 'upload',
            emotion: d.emotion,
            confidence: d.confidence,
            face_index: d.faceIndex,
          })),
        }),
      });

      if (!saveRes.ok) {
        throw new Error('CNN inference succeeded, but saving to SQLite failed.');
      }

      onDatabaseUpdated();
      setStatusMessage({
        type: 'success',
        text: `Analyzed ${detections.length} ${
          detections.length === 1 ? 'face' : 'faces'
        } via CNN and saved to detections.db.`,
      });
      setPipelineStep('');
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Unexpected error during CNN analysis.',
      });
      setPipelineStep('');
    } finally {
      setAnalyzing(false);
    }
  };

  const activeFace =
    results && results.length > 0 ? results[selectedFaceIdx] ?? results[0] : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#172033] tracking-tight">
          Emotion Detection — Image Upload
        </h1>
        <p className="text-sm text-[#64748B] mt-0.5">
          Upload a JPG or PNG image to run face detection, 48×48 grayscale preprocessing, and 7-class CNN expression classification.
        </p>
      </div>

      {/* Upload Dropzone + Controls */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-5">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) handleFile(file);
          }}
          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            isDragging
              ? 'border-[#315EAD] bg-[#EFF6FF]'
              : 'border-[#CBD5E1] bg-[#F8FAFC] hover:border-[#94A3B8]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,image/jpeg,image/png"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
          <div className="w-11 h-11 rounded-xl bg-white border border-[#E2E8F0] flex items-center justify-center mx-auto mb-3">
            <ImagePlus className="w-5 h-5 text-[#315EAD]" />
          </div>
          <p className="text-sm font-medium text-[#172033]">
            {fileName ? `Selected: ${fileName}` : 'Drag and drop a facial image here'}
          </p>
          <p className="text-xs text-[#64748B] mt-1">
            Supports JPG, JPEG, and PNG formats · Single or multi-face portraits
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#172033] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F1F5F9] transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#315EAD]" />
              Browse Image
            </button>
            {previewUrl && (
              <>
                <button
                  type="button"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#315EAD] rounded-lg hover:bg-[#274c8e] disabled:opacity-60 transition-colors"
                >
                  {analyzing ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <ScanFace className="w-3.5 h-3.5" />
                  )}
                  {analyzing ? 'Analyzing...' : 'Analyze Image'}
                </button>
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={analyzing}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#E05252] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#FEF2F2] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear Image
                </button>
              </>
            )}
          </div>
        </div>

        {pipelineStep && (
          <div className="flex items-center gap-2 text-xs text-[#315EAD] bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg px-4 py-2.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            <span>{pipelineStep}</span>
          </div>
        )}

        {statusMessage && (
          <div
            className={`flex items-center gap-2 text-xs rounded-lg px-4 py-2.5 border ${
              statusMessage.type === 'success'
                ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#15803D]'
                : statusMessage.type === 'warning'
                ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                : 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
        )}
      </div>

      {/* Preview & Annotated CNN Results */}
      {previewUrl && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left: Image / Annotated Bounding Boxes */}
          <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#172033]">
                {results && results.length > 0
                  ? 'Annotated CNN Detection Output'
                  : 'Uploaded Image Preview'}
              </h2>
              {results && (
                <span className="text-xs font-mono-tabular text-[#64748B]">
                  {results.length} {results.length === 1 ? 'face' : 'faces'} detected
                </span>
              )}
            </div>

            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg overflow-hidden flex items-center justify-center min-h-[280px]">
              {results && results.length > 0 ? (
                <canvas
                  ref={annotatedCanvasRef}
                  className="max-w-full max-h-[480px] object-contain"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewUrl}
                  alt="Uploaded facial expression preview"
                  className="max-w-full max-h-[480px] object-contain"
                />
              )}
            </div>
          </div>

          {/* Right: Prediction Summary & 7-Class Softmax Distribution */}
          <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-5">
            {!results ? (
              <div className="py-12 text-center space-y-2">
                <ScanFace className="w-8 h-8 text-[#94A3B8] mx-auto" />
                <p className="text-sm font-medium text-[#172033]">Ready for CNN Inference</p>
                <p className="text-xs text-[#64748B]">
                  Click &ldquo;Analyze Image&rdquo; to run face detection and 7-class emotion classification.
                </p>
              </div>
            ) : results.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <AlertCircle className="w-8 h-8 text-[#E9A23B] mx-auto" />
                <p className="text-sm font-medium text-[#172033]">No Face Regions Found</p>
                <p className="text-xs text-[#64748B]">
                  Ensure the face is well-lit, unobstructed, and facing the camera.
                </p>
              </div>
            ) : (
              activeFace && (
                <>
                  {results.length > 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-[#E2E8F0]">
                      {results.map((face, idx) => (
                        <button
                          key={face.faceIndex}
                          type="button"
                          onClick={() => setSelectedFaceIdx(idx)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                            selectedFaceIdx === idx
                              ? 'bg-[#315EAD] text-white'
                              : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172033]'
                          }`}
                        >
                          Face #{face.faceIndex} ({face.emotion})
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-medium text-[#64748B]">
                        Detected Emotion (Face #{activeFace.faceIndex})
                      </p>
                      <p
                        className="text-2xl font-bold mt-1"
                        style={{ color: EMOTION_META[activeFace.emotion].color }}
                      >
                        {activeFace.emotion}
                      </p>
                      <p className="text-xs text-[#64748B] mt-1">
                        Confidence:{' '}
                        <span className="font-semibold text-[#172033] font-mono-tabular">
                          {activeFace.confidence.toFixed(2)}%
                        </span>
                      </p>
                    </div>

                    {settings.showPreprocessedCrop && activeFace.grayscale48DataUrl && (
                      <div className="text-center shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={activeFace.grayscale48DataUrl}
                          alt={`Face ${activeFace.faceIndex} 48x48 grayscale`}
                          className="w-16 h-16 rounded-lg border border-[#E2E8F0] object-cover mx-auto"
                          style={{ imageRendering: 'pixelated' }}
                        />
                        <span className="text-[11px] text-[#64748B] font-mono-tabular block mt-1">
                          48×48 Gray
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0]">
                    <p className="text-xs font-semibold text-[#172033]">
                      7-Class Softmax Probability Breakdown
                    </p>
                    {activeFace.probabilities.map((prob) => (
                      <div key={prob.emotion} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-[#172033]">{prob.emotion}</span>
                          <span className="font-mono-tabular text-[#64748B]">
                            {prob.probability.toFixed(2)}%
                          </span>
                        </div>
                        <div className="h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${prob.probability}%`,
                              backgroundColor: EMOTION_META[prob.emotion].color,
                            }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
