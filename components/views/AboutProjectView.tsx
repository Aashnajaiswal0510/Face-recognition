'use client';

import React from 'react';
import {
  Flame,
  Frown,
  AlertOctagon,
  Smile,
  Meh,
  CloudRain,
  Zap,
  ArrowRight,
  GraduationCap,
} from 'lucide-react';
import { EMOTION_CLASSES, EMOTION_META, type EmotionLabel } from '@/lib/types';

const EMOTION_ICONS: Record<EmotionLabel, React.ElementType> = {
  Angry: Flame,
  Disgust: AlertOctagon,
  Fear: Zap,
  Happy: Smile,
  Neutral: Meh,
  Sad: CloudRain,
  Surprise: Frown,
};

export default function AboutProjectView() {
  const pipelineSteps = [
    'Input (Image / Webcam)',
    'Face Detection',
    'Preprocessing (48×48 Grayscale)',
    'CNN Classification',
    'Result Display',
    'SQLite Database',
    'Emotion Analytics',
  ];

  const technologies = [
    { name: 'Python 3.9–3.11', role: 'Core ML & backend runtime' },
    { name: 'TensorFlow / Keras & TF.js', role: 'Deep CNN model training & inference' },
    { name: 'OpenCV', role: 'Haar Cascade face detection & webcam I/O' },
    { name: 'Streamlit & Next.js', role: 'Interactive web dashboard & trend UI' },
    { name: 'SQLite 3 (detections.db)', role: 'Serverless relational detection log' },
    { name: 'NumPy & Pandas', role: 'Tensor normalization & tabular analytics' },
    { name: 'FER2013 Dataset', role: '7-class facial expression benchmark' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#172033] tracking-tight">
          Facial Expression Recognition Using Deep Learning (CNN)
        </h1>
        <p className="text-sm text-[#64748B] mt-0.5">
          Academic project synopsis, architecture specification, and seven standard emotion classes.
        </p>
      </div>

      {/* Academic Attribution & Objective */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-[#172033]">Project Objective</h2>
          <p className="text-sm text-[#64748B] leading-relaxed">
            To detect human faces in static images and real-time webcam video and classify facial expressions into seven standard emotion categories using a Convolutional Neural Network (CNN). Beyond single-frame classification, the system integrates multi-face detection and a persistent SQLite-backed Emotion Trend Tracker for historical analytics and CSV reporting.
          </p>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-[#315EAD]" />
            <h2 className="text-base font-semibold text-[#172033]">Academic Synopsis</h2>
          </div>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-2">
              <dt className="text-[#64748B]">Submitted By</dt>
              <dd className="font-medium text-[#172033]">Aashna Jaiswal</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#64748B]">Program</dt>
              <dd className="font-medium text-[#172033]">BCA (2026–2027)</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#64748B]">Enrollment No.</dt>
              <dd className="font-mono-tabular text-[#172033]">MUIT/24-25/17072024001</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#64748B]">Guidance</dt>
              <dd className="font-medium text-[#172033]">Mrs. Shabda</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-[#64748B]">Institution</dt>
              <dd className="font-medium text-[#172033] text-right">MUIT, Noida</dd>
            </div>
          </dl>
        </div>
      </div>

      {/* End-to-End Pipeline */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#172033]">Project Workflow & Architecture</h2>
        <div className="flex flex-wrap items-center gap-2">
          {pipelineSteps.map((step, i) => (
            <React.Fragment key={step}>
              <div className="px-3.5 py-2 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs font-medium text-[#172033]">
                {step}
              </div>
              {i < pipelineSteps.length - 1 && (
                <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Seven Emotion Categories */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-[#172033]">
          Seven Standard Emotion Categories
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {EMOTION_CLASSES.map((emotion) => {
            const Icon = EMOTION_ICONS[emotion];
            const meta = EMOTION_META[emotion];
            return (
              <div
                key={emotion}
                className="p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] space-y-2"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: meta.softBg }}
                  >
                    <Icon className="w-4 h-4" style={{ color: meta.color }} />
                  </div>
                  <h3 className="text-sm font-semibold text-[#172033]">{emotion}</h3>
                </div>
                <p className="text-xs text-[#64748B] leading-relaxed">{meta.description}</p>
                <p className="text-[11px] text-[#172033]">
                  <span className="font-medium">Visual Cues:</span> {meta.facialCues}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Technologies & SQLite Schema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-[#172033]">Core Technology Stack</h2>
          <div className="divide-y divide-[#E2E8F0]">
            {technologies.map((tech) => (
              <div key={tech.name} className="py-2.5 flex items-center justify-between gap-4 text-xs">
                <span className="font-semibold text-[#172033]">{tech.name}</span>
                <span className="text-[#64748B] text-right">{tech.role}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3">
          <h2 className="text-base font-semibold text-[#172033]">
            SQLite Schema (<span className="font-mono-tabular">detections</span> Table)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] text-[#64748B]">
                  <th className="py-2 pr-3">Field</th>
                  <th className="py-2 pr-3">Type</th>
                  <th className="py-2">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {[
                  ['id', 'INTEGER (PK)', 'Auto-incrementing detection identifier'],
                  ['timestamp', 'DATETIME', 'Date and time the detection occurred'],
                  ['source', 'TEXT', "'upload' or 'webcam'"],
                  ['emotion', 'TEXT', 'Predicted emotion label (7 classes)'],
                  ['confidence', 'REAL', 'Softmax confidence percentage (0–100)'],
                  ['face_index', 'INTEGER', 'Index of face within its source frame'],
                ].map(([f, t, d]) => (
                  <tr key={f}>
                    <td className="py-2 pr-3 font-mono-tabular font-semibold text-[#172033]">{f}</td>
                    <td className="py-2 pr-3 font-mono-tabular text-[#315EAD]">{t}</td>
                    <td className="py-2 text-[#64748B]">{d}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
