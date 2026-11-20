'use client';

import React from 'react';
import { Cpu, Layers, Database, Info, Terminal } from 'lucide-react';
import { EMOTION_CLASSES, type TrainingMetricsPayload } from '@/lib/types';

export default function ModelInfoView({
  trainingMetrics,
}: {
  trainingMetrics: TrainingMetricsPayload;
}) {
  const specs = [
    { label: 'Model Architecture', value: 'Convolutional Neural Network (CNN)' },
    { label: 'Benchmark Dataset', value: 'FER2013 (35,887 labeled 48×48 faces)' },
    { label: 'Face Detection', value: 'Haar Cascade (Python) · SSD MobileNet / TinyFace (Web)' },
    { label: 'Input Tensor Size', value: '48 × 48 pixels' },
    { label: 'Input Channel Format', value: 'Grayscale (1 channel, normalized [0, 1])' },
    { label: 'Output Classes', value: '7 Classes (Softmax Probability Vector)' },
    { label: 'Deep Learning Framework', value: 'TensorFlow / Keras (Python) · TensorFlow.js (Web)' },
  ];

  const cnnLayers = [
    'Input (48, 48, 1) — Normalized Grayscale ROI',
    'Block 1: Conv2D(32, 3×3, ReLU) + BatchNorm + Conv2D(32) + MaxPool(2×2) + Dropout(0.25)',
    'Block 2: Conv2D(64, 3×3, ReLU) + BatchNorm + Conv2D(64) + MaxPool(2×2) + Dropout(0.25)',
    'Block 3: Conv2D(128, 3×3, ReLU) + BatchNorm + Conv2D(128) + MaxPool(2×2) + Dropout(0.25)',
    'Classifier Head: Flatten → Dense(256, ReLU) + BatchNorm + Dropout(0.5) → Dense(7, Softmax)',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#172033] tracking-tight">
          Model Information
        </h1>
        <p className="text-sm text-[#64748B] mt-0.5">
          CNN architecture specifications, preprocessing contract, and genuine training evaluation metrics.
        </p>
      </div>

      {/* Specification Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {specs.map((spec) => (
          <div key={spec.label} className="bg-white border border-[#E2E8F0] rounded-xl p-4">
            <p className="text-xs text-[#64748B]">{spec.label}</p>
            <p className="text-sm font-semibold text-[#172033] mt-1">{spec.value}</p>
          </div>
        ))}
      </div>

      {/* CNN Layer Stack */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Layers className="w-4 h-4 text-[#315EAD]" />
          <h2 className="text-base font-semibold text-[#172033]">
            Keras CNN Architecture (<span className="font-mono-tabular">src/model_training.py</span>)
          </h2>
        </div>
        <div className="space-y-2">
          {cnnLayers.map((layer, index) => (
            <div
              key={layer}
              className="flex items-center gap-3 px-4 py-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs"
            >
              <span className="font-mono-tabular font-semibold text-[#315EAD] w-6">
                0{index + 1}
              </span>
              <span className="font-mono-tabular text-[#172033]">{layer}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Evaluation Metrics (Strict Authenticity Rule) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Cpu className="w-4 h-4 text-[#315EAD]" />
          <h2 className="text-base font-semibold text-[#172033]">
            Training & Evaluation Metrics
          </h2>
        </div>

        {!trainingMetrics.available ? (
          <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-6 space-y-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-[#315EAD] shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-[#172033]">
                  FER2013 Training Metrics Not Yet Generated on Disk
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  Per strict evaluation integrity rules, training accuracy, validation accuracy, loss curves, classification reports, and confusion matrices are never fabricated. Live inference in this web dashboard runs using real pre-trained TensorFlow.js CNN weights (<span className="font-mono-tabular">face_expression_model</span>). To train your custom Keras <span className="font-mono-tabular">emotion_model.h5</span> on FER2013 and populate <span className="font-mono-tabular">models/training_metrics.json</span>:
                </p>
              </div>
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#172033]">
                <Terminal className="w-3.5 h-3.5 text-[#315EAD]" />
                Local Python Training Workflow
              </div>
              <pre className="text-xs font-mono-tabular text-[#172033] overflow-x-auto leading-relaxed">
{`cd facial-expression-recognition
pip install -r requirements.txt
# Place FER2013 train/ & test/ folders (or fer2013.csv) inside dataset/
python src/model_training.py --dataset dataset --epochs 40`}
              </pre>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <p className="text-xs text-[#64748B]">Final Test Accuracy</p>
                <p className="text-xl font-bold text-[#16A36A] font-mono-tabular mt-1">
                  {((trainingMetrics.testAccuracy ?? 0) * 100).toFixed(2)}%
                </p>
              </div>
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <p className="text-xs text-[#64748B]">Final Test Loss</p>
                <p className="text-xl font-bold text-[#172033] font-mono-tabular mt-1">
                  {(trainingMetrics.testLoss ?? 0).toFixed(4)}
                </p>
              </div>
              <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
                <p className="text-xs text-[#64748B]">Evaluation Timestamp</p>
                <p className="text-sm font-semibold text-[#172033] font-mono-tabular mt-1.5">
                  {trainingMetrics.trainedAt ?? 'Recorded'}
                </p>
              </div>
            </div>

            {trainingMetrics.confusionMatrix && (
              <div className="overflow-x-auto">
                <p className="text-xs font-semibold text-[#172033] mb-2">Confusion Matrix</p>
                <table className="text-xs font-mono-tabular border-collapse border border-[#E2E8F0]">
                  <thead>
                    <tr className="bg-[#F8FAFC]">
                      <th className="p-2 border border-[#E2E8F0] text-left">True \ Pred</th>
                      {EMOTION_CLASSES.map((c) => (
                        <th key={c} className="p-2 border border-[#E2E8F0]">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trainingMetrics.confusionMatrix.map((row, rIdx) => (
                      <tr key={rIdx}>
                        <td className="p-2 border border-[#E2E8F0] font-semibold bg-[#F8FAFC]">
                          {EMOTION_CLASSES[rIdx]}
                        </td>
                        {row.map((val, cIdx) => (
                          <td
                            key={cIdx}
                            className={`p-2 border border-[#E2E8F0] text-right ${
                              rIdx === cIdx ? 'bg-[#EFF6FF] font-bold text-[#315EAD]' : ''
                            }`}
                          >
                            {val}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Output Classes Reference */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-[#315EAD]" />
          <h2 className="text-base font-semibold text-[#172033]">
            FER2013 Canonical Class Index Mapping
          </h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
          {EMOTION_CLASSES.map((em, idx) => (
            <div
              key={em}
              className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-center"
            >
              <span className="text-[11px] font-mono-tabular text-[#64748B]">Class {idx}</span>
              <p className="text-sm font-semibold text-[#172033] mt-0.5">{em}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
