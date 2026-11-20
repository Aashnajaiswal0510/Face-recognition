'use client';

import React, { useState } from 'react';
import { EMOTION_CLASSES, EMOTION_META, type DetectionSource, type EmotionLabel } from '@/lib/types';

interface DistributionItem {
  emotion: EmotionLabel;
  count: number;
  percentage: number;
}

export function EmotionDonutChart({
  data,
  total,
}: {
  data: DistributionItem[];
  total: number;
}) {
  const [hovered, setHovered] = useState<EmotionLabel | null>(null);
  const size = 210;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const nonZero = data.filter((d) => d.count > 0);
  let cumulativeFraction = 0;

  const hoveredItem = hovered ? data.find((d) => d.emotion === hovered) : null;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="#F1F5F9"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            nonZero.map((item) => {
              const fraction = item.count / total;
              const dash = fraction * circumference;
              const offset = -cumulativeFraction * circumference;
              cumulativeFraction += fraction;
              const isHovered = hovered === item.emotion;
              return (
                <circle
                  key={item.emotion}
                  cx={size / 2}
                  cy={size / 2}
                  r={radius}
                  fill="transparent"
                  stroke={EMOTION_META[item.emotion].color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={`${dash} ${circumference}`}
                  strokeDashoffset={offset}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHovered(item.emotion)}
                  onMouseLeave={() => setHovered(null)}
                />
              );
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-2xl font-bold text-[#172033] font-mono-tabular">
            {hoveredItem ? hoveredItem.count : total}
          </span>
          <span className="text-xs font-medium text-[#64748B] truncate max-w-[110px]">
            {hoveredItem ? `${hoveredItem.emotion} (${hoveredItem.percentage}%)` : 'Total Faces'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 flex-1 w-full">
        {data.map((item) => (
          <button
            key={item.emotion}
            type="button"
            onMouseEnter={() => setHovered(item.emotion)}
            onMouseLeave={() => setHovered(null)}
            className="flex items-center justify-between text-left px-2.5 py-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors"
          >
            <span className="flex items-center gap-2 text-xs font-medium text-[#172033]">
              <span
                className="w-2.5 h-2.5 rounded-sm shrink-0"
                style={{ backgroundColor: EMOTION_META[item.emotion].color }}
              />
              {item.emotion}
            </span>
            <span className="text-xs text-[#64748B] font-mono-tabular">
              {item.count} ({item.percentage}%)
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function EmotionBarChart({ data }: { data: DistributionItem[] }) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-3">
      {data.map((item) => {
        const widthPct = (item.count / maxCount) * 100;
        return (
          <div key={item.emotion} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#172033]">{item.emotion}</span>
              <span className="text-[#64748B] font-mono-tabular">
                {item.count} · {item.percentage}%
              </span>
            </div>
            <div className="h-2.5 w-full bg-[#F1F5F9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: EMOTION_META[item.emotion].color,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TrendBucket {
  bucket: string;
  Angry: number;
  Disgust: number;
  Fear: number;
  Happy: number;
  Neutral: number;
  Sad: number;
  Surprise: number;
  total: number;
}

export function EmotionTrendLineChart({ data }: { data: TrendBucket[] }) {
  const [selectedEmotions, setSelectedEmotions] = useState<EmotionLabel[]>([
    'Happy',
    'Neutral',
    'Sad',
    'Angry',
    'Surprise',
  ]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const toggleEmotion = (emotion: EmotionLabel) => {
    setSelectedEmotions((prev) =>
      prev.includes(emotion)
        ? prev.length > 1
          ? prev.filter((e) => e !== emotion)
          : prev
        : [...prev, emotion]
    );
  };

  if (!data.length) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-[#64748B]">
        No time-series records in selected range.
      </div>
    );
  }

  const width = 680;
  const height = 220;
  const pad = { top: 18, right: 20, bottom: 32, left: 38 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  let maxVal = 1;
  for (const row of data) {
    for (const em of selectedEmotions) {
      if (row[em] > maxVal) maxVal = row[em];
    }
  }

  const xForIndex = (idx: number) =>
    data.length === 1 ? pad.left + plotW / 2 : pad.left + (idx / (data.length - 1)) * plotW;
  const yForValue = (val: number) => pad.top + plotH - (val / maxVal) * plotH;

  const yTicks = [0, Math.ceil(maxVal / 2), maxVal];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {EMOTION_CLASSES.map((em) => {
          const active = selectedEmotions.includes(em);
          return (
            <button
              key={em}
              type="button"
              onClick={() => toggleEmotion(em)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 ${
                active
                  ? 'bg-white border-[#CBD5E1] text-[#172033]'
                  : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8]'
              }`}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: active ? EMOTION_META[em].color : '#CBD5E1' }}
              />
              {em}
            </button>
          );
        })}
      </div>

      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[460px] h-56">
          {yTicks.map((tick, i) => {
            const y = yForValue(tick);
            return (
              <g key={i}>
                <line
                  x1={pad.left}
                  y1={y}
                  x2={width - pad.right}
                  y2={y}
                  stroke="#E2E8F0"
                  strokeDasharray="3 3"
                />
                <text
                  x={pad.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-[#64748B] text-[10px] font-mono-tabular"
                >
                  {tick}
                </text>
              </g>
            );
          })}

          {selectedEmotions.map((em) => {
            const points = data.map((row, idx) => `${xForIndex(idx)},${yForValue(row[em])}`).join(' ');
            return (
              <g key={em}>
                {data.length > 1 && (
                  <polyline
                    fill="none"
                    stroke={EMOTION_META[em].color}
                    strokeWidth={2}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                    points={points}
                  />
                )}
                {data.map((row, idx) => (
                  <circle
                    key={idx}
                    cx={xForIndex(idx)}
                    cy={yForValue(row[em])}
                    r={hoverIdx === idx ? 4.5 : 3}
                    fill={EMOTION_META[em].color}
                    stroke="#FFFFFF"
                    strokeWidth={1.5}
                  />
                ))}
              </g>
            );
          })}

          {data.map((row, idx) => {
            const showLabel =
              data.length <= 7 || idx === 0 || idx === data.length - 1 || idx % Math.ceil(data.length / 6) === 0;
            const x = xForIndex(idx);
            return (
              <g key={row.bucket}>
                <rect
                  x={x - 14}
                  y={pad.top}
                  width={28}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIdx(idx)}
                  onMouseLeave={() => setHoverIdx(null)}
                />
                {showLabel && (
                  <text
                    x={x}
                    y={height - 10}
                    textAnchor="middle"
                    className="fill-[#64748B] text-[10px] font-mono-tabular"
                  >
                    {row.bucket}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {hoverIdx !== null && data[hoverIdx] && (
        <div className="flex flex-wrap items-center gap-3 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2 text-[#172033]">
          <span className="font-semibold font-mono-tabular">{data[hoverIdx].bucket}</span>
          <span className="text-[#64748B]">·</span>
          {selectedEmotions.map((em) => (
            <span key={em} className="font-mono-tabular">
              {em}: <strong>{data[hoverIdx][em]}</strong>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function SourceComparisonChart({
  data,
}: {
  data: { source: DetectionSource; count: number; avgConfidence: number }[];
}) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-4">
      {data.map((item) => {
        const label = item.source === 'upload' ? 'Image Upload' : 'Live Webcam';
        const color = item.source === 'upload' ? '#315EAD' : '#6477D9';
        const pct = (item.count / maxCount) * 100;
        return (
          <div key={item.source} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[#172033]">{label}</span>
              <span className="text-[#64748B] font-mono-tabular">
                {item.count} detections · Avg {item.avgConfidence}%
              </span>
            </div>
            <div className="h-3 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function ConfidenceHistogramChart({
  data,
}: {
  data: { range: string; count: number }[];
}) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="flex items-end justify-between gap-3 h-44 pt-4">
      {data.map((bin) => {
        const barH = Math.round((bin.count / maxCount) * 120);
        return (
          <div key={bin.range} className="flex-1 flex flex-col items-center gap-2">
            <span className="text-xs font-semibold text-[#172033] font-mono-tabular">
              {bin.count}
            </span>
            <div className="w-full max-w-[44px] h-[120px] bg-[#F1F5F9] rounded-t-md flex items-end overflow-hidden">
              <div
                className="w-full bg-[#315EAD] rounded-t-md transition-all duration-300"
                style={{ height: `${barH}px` }}
              />
            </div>
            <span className="text-[11px] text-[#64748B] font-mono-tabular whitespace-nowrap">
              {bin.range}
            </span>
          </div>
        );
      })}
    </div>
  );
}
