'use client';

import React from 'react';
import { Sliders, Database, FolderCode, RotateCcw } from 'lucide-react';
import { DEFAULT_SETTINGS, type AppSettings } from '@/lib/types';

export default function SettingsView({
  settings,
  onUpdateSettings,
  dbHealth,
}: {
  settings: AppSettings;
  onUpdateSettings: (next: AppSettings) => void;
  dbHealth: {
    connected: boolean;
    dbFile: string;
    totalRecords: number;
    sizeBytes: number;
  };
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#172033] tracking-tight">Settings</h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Configure CNN face detector parameters, webcam logging behavior, and inspect local SQLite persistence.
          </p>
        </div>

        <button
          type="button"
          onClick={() => onUpdateSettings(DEFAULT_SETTINGS)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#172033] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />
          Reset Defaults
        </button>
      </div>

      {/* Inference & Webcam Preferences */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-6">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-[#315EAD]" />
          <h2 className="text-base font-semibold text-[#172033]">
            CNN Inference & Webcam Controls
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#172033]">
              Face Detector Architecture
            </label>
            <select
              value={settings.detectorBackend}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  detectorBackend: e.target.value as AppSettings['detectorBackend'],
                })
              }
              className="w-full px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#172033]"
            >
              <option value="ssd_mobilenetv1">
                SSD MobileNetV1 (Higher multi-face accuracy)
              </option>
              <option value="tiny_face_detector">
                Tiny Face Detector (Faster webcam FPS)
              </option>
            </select>
            <p className="text-xs text-[#64748B]">
              Selects the face localization network executed prior to 48×48 grayscale emotion classification.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#172033]">
                Minimum Face Detection Threshold
              </label>
              <span className="text-xs font-mono-tabular font-semibold text-[#315EAD]">
                {Math.round(settings.minConfidence * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.3}
              max={0.9}
              step={0.05}
              value={settings.minConfidence}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  minConfidence: Number(e.target.value),
                })
              }
              className="w-full accent-[#315EAD]"
            />
            <p className="text-xs text-[#64748B]">
              Lower values detect smaller or angled faces; higher values reduce false positives.
            </p>
          </div>

          <div className="space-y-2">
            <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] cursor-pointer">
              <div>
                <p className="text-xs font-semibold text-[#172033]">
                  Auto-Log Webcam Detections to SQLite
                </p>
                <p className="text-[11px] text-[#64748B] mt-0.5">
                  Periodically persist live webcam predictions into detections.db
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.webcamAutoLog}
                onChange={(e) =>
                  onUpdateSettings({ ...settings, webcamAutoLog: e.target.checked })
                }
                className="w-4 h-4 accent-[#315EAD]"
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[#172033]">
                Webcam Auto-Log Interval (Seconds)
              </label>
              <span className="text-xs font-mono-tabular font-semibold text-[#315EAD]">
                {settings.webcamLogIntervalSec}s
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={15}
              step={1}
              disabled={!settings.webcamAutoLog}
              value={settings.webcamLogIntervalSec}
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  webcamLogIntervalSec: Number(e.target.value),
                })
              }
              className="w-full accent-[#315EAD] disabled:opacity-40"
            />
            <p className="text-xs text-[#64748B]">
              Prevents redundant per-frame database writes during continuous camera monitoring.
            </p>
          </div>
        </div>

        <label className="flex items-center justify-between p-3.5 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] cursor-pointer">
          <div>
            <p className="text-xs font-semibold text-[#172033]">
              Render 48×48 Grayscale Preprocessed Crops
            </p>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Displays the exact grayscale resized face tensor beside CNN predictions
            </p>
          </div>
          <input
            type="checkbox"
            checked={settings.showPreprocessedCrop}
            onChange={(e) =>
              onUpdateSettings({ ...settings, showPreprocessedCrop: e.target.checked })
            }
            className="w-4 h-4 accent-[#315EAD]"
          />
        </label>
      </div>

      {/* SQLite & Python Deliverables Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-[#315EAD]" />
            <h2 className="text-base font-semibold text-[#172033]">SQLite Database Status</h2>
          </div>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
              <dt className="text-[#64748B]">Connection State</dt>
              <dd
                className={`font-semibold ${
                  dbHealth.connected ? 'text-[#16A36A]' : 'text-[#E05252]'
                }`}
              >
                {dbHealth.connected ? 'Connected' : 'Disconnected'}
              </dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
              <dt className="text-[#64748B]">Database File</dt>
              <dd className="font-mono-tabular text-[#172033]">{dbHealth.dbFile}</dd>
            </div>
            <div className="flex justify-between py-1.5 border-b border-[#E2E8F0]">
              <dt className="text-[#64748B]">Stored Rows</dt>
              <dd className="font-mono-tabular text-[#172033]">
                {dbHealth.totalRecords.toLocaleString()}
              </dd>
            </div>
            <div className="flex justify-between py-1.5">
              <dt className="text-[#64748B]">File Size</dt>
              <dd className="font-mono-tabular text-[#172033]">
                {(dbHealth.sizeBytes / 1024).toFixed(2)} KB
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <FolderCode className="w-4 h-4 text-[#315EAD]" />
            <h2 className="text-base font-semibold text-[#172033]">
              Python + Streamlit Source Package
            </h2>
          </div>
          <p className="text-xs text-[#64748B] leading-relaxed">
            The complete modular Python implementation (TensorFlow/Keras CNN, OpenCV Haar Cascade, Streamlit UI, and SQLite3 backend sharing the exact <span className="font-mono-tabular">detections.db</span> schema) is located in <span className="font-mono-tabular text-[#172033]">facial-expression-recognition/</span>.
          </p>
          <pre className="text-xs font-mono-tabular bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-3 text-[#172033] overflow-x-auto">
{`cd facial-expression-recognition
pip install -r requirements.txt
streamlit run app.py`}
          </pre>
        </div>
      </div>
    </div>
  );
}
