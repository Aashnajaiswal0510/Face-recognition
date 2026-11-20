'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Camera,
  Upload,
  BarChart3,
  History,
  Users,
  ImageIcon,
  Video,
  Sparkles,
  Gauge,
  CalendarDays,
  RefreshCw,
} from 'lucide-react';
import { EMOTION_META, type ActiveSection, type DashboardStats } from '@/lib/types';
import { EmotionBarChart, EmotionDonutChart } from '@/components/Charts';

export default function DashboardView({
  onNavigate,
}: {
  onNavigate: (section: ActiveSection) => void;
}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/detections?mode=stats', { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load SQLite statistics');
      const data: DashboardStats = await res.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    fetch('/api/detections?mode=stats', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load SQLite statistics');
        return res.json() as Promise<DashboardStats>;
      })
      .then((data) => {
        if (active) {
          setStats(data);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Unable to fetch dashboard data');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading && !stats) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-28 bg-white border border-[#E2E8F0] rounded-xl p-5 animate-pulse"
            />
          ))}
        </div>
        <div className="h-72 bg-white border border-[#E2E8F0] rounded-xl p-6 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center space-y-3">
        <p className="text-sm font-medium text-[#E05252]">{error}</p>
        <button
          type="button"
          onClick={loadStats}
          className="px-4 py-2 text-xs font-medium text-white bg-[#315EAD] rounded-lg hover:bg-[#274c8e] transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const s = stats!;
  const isEmpty = s.totalFacesDetected === 0;

  const kpiCards = [
    {
      label: 'Total Faces Detected',
      value: s.totalFacesDetected.toLocaleString(),
      icon: Users,
      sub: 'Cumulative across all frames',
    },
    {
      label: 'Total Images Analyzed',
      value: s.totalImagesAnalyzed.toLocaleString(),
      icon: ImageIcon,
      sub: 'Static upload sessions',
    },
    {
      label: 'Total Webcam Detections',
      value: s.totalWebcamDetections.toLocaleString(),
      icon: Video,
      sub: 'Live camera frame logs',
    },
    {
      label: 'Most Frequent Emotion',
      value: s.mostFrequentEmotion ?? '—',
      icon: Sparkles,
      sub: s.mostFrequentEmotion ? 'Dominant class in SQLite' : 'No detections recorded yet',
    },
    {
      label: 'Average Model Confidence',
      value: s.totalFacesDetected > 0 ? `${s.averageConfidence.toFixed(1)}%` : '0.0%',
      icon: Gauge,
      sub: 'CNN softmax top-1 mean',
    },
    {
      label: "Today's Detections",
      value: s.todaysDetections.toLocaleString(),
      icon: CalendarDays,
      sub: 'Recorded on local date',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#172033] tracking-tight">
            System Overview
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Real-time telemetry from local SQLite store (<span className="font-mono-tabular">detections.db</span>) and CNN inference engine.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadStats}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#172033] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors whitespace-nowrap shrink-0"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => onNavigate('image-detection')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-[#315EAD] rounded-lg hover:bg-[#274c8e] transition-colors whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            Upload Image
          </button>
          <button
            type="button"
            onClick={() => onNavigate('webcam-detection')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#315EAD] bg-white border border-[#315EAD]/30 rounded-lg hover:bg-[#EFF6FF] transition-colors whitespace-nowrap shrink-0"
          >
            <Camera className="w-3.5 h-3.5" />
            Start Webcam
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex items-start justify-between shadow-[0_1px_2px_rgba(15,23,42,0.03)]"
            >
              <div>
                <p className="text-xs font-medium text-[#64748B]">{card.label}</p>
                <p className="text-2xl font-bold text-[#172033] mt-1.5 font-mono-tabular">
                  {card.value}
                </p>
                <p className="text-xs text-[#64748B] mt-1">{card.sub}</p>
              </div>
              <div className="w-9 h-9 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#315EAD]" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Empty State Banner when DB has 0 rows */}
      {isEmpty ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-10 text-center space-y-4">
          <div className="w-12 h-12 rounded-xl bg-[#EFF6FF] border border-[#DBEAFE] flex items-center justify-center mx-auto">
            <Upload className="w-5 h-5 text-[#315EAD]" />
          </div>
          <div className="max-w-md mx-auto space-y-1.5">
            <h2 className="text-base font-semibold text-[#172033]">
              No Detections Recorded in SQLite Yet
            </h2>
            <p className="text-sm text-[#64748B]">
              Run your first facial expression analysis using an uploaded portrait, group photo, or live webcam stream. Every detected face is logged automatically to <span className="font-mono-tabular">detections.db</span>.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-1">
            <button
              type="button"
              onClick={() => onNavigate('image-detection')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-[#315EAD] rounded-lg hover:bg-[#274c8e] transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              Analyze First Image
            </button>
            <button
              type="button"
              onClick={() => onNavigate('webcam-detection')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#172033] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-[#315EAD]" />
              Open Live Webcam
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Emotion Distribution Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#172033]">
                    Emotion Distribution (Donut)
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Share of all 7 FER2013 emotion classes
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate('analytics')}
                  className="text-xs font-medium text-[#315EAD] hover:underline whitespace-nowrap shrink-0"
                >
                  Open Trend Tracker
                </button>
              </div>
              <EmotionDonutChart data={s.distribution} total={s.totalFacesDetected} />
            </div>

            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold text-[#172033]">
                    Class Frequency Breakdown
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Detection counts and percentage share
                  </p>
                </div>
              </div>
              <EmotionBarChart data={s.distribution} />
            </div>
          </div>

          {/* Recent Detections Table */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-[#172033]">Recent Detections</h2>
                <p className="text-xs text-[#64748B]">
                  Latest face predictions persisted in SQLite
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('history')}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#315EAD] hover:underline whitespace-nowrap shrink-0"
              >
                <History className="w-3.5 h-3.5" />
                View Full History
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-[#64748B]">
                    <th className="py-2.5 px-4">ID</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Emotion</th>
                    <th className="py-2.5 px-4 text-right">Confidence</th>
                    <th className="py-2.5 px-4">Source</th>
                    <th className="py-2.5 px-4 text-right">Face Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-sm">
                  {s.recentDetections.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-mono-tabular text-xs text-[#64748B]">
                        #{row.id}
                      </td>
                      <td className="py-2.5 px-4 font-mono-tabular text-xs text-[#172033]">
                        {row.timestamp}
                      </td>
                      <td className="py-2.5 px-4 font-medium text-[#172033]">
                        <span className="inline-flex items-center gap-2 text-xs">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: EMOTION_META[row.emotion]?.color ?? '#64748B' }}
                          />
                          {row.emotion}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular text-xs font-semibold text-[#172033]">
                        {row.confidence.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B] capitalize">
                        {row.source}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular text-xs text-[#64748B]">
                        {row.face_index}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Quick Actions Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            title: 'Upload Image',
            desc: 'Analyze JPG or PNG portraits',
            icon: Upload,
            target: 'image-detection' as ActiveSection,
          },
          {
            title: 'Start Webcam',
            desc: 'Real-time live video stream',
            icon: Camera,
            target: 'webcam-detection' as ActiveSection,
          },
          {
            title: 'View Analytics',
            desc: 'Emotion Trend Tracker charts',
            icon: BarChart3,
            target: 'analytics' as ActiveSection,
          },
          {
            title: 'View History',
            desc: 'Search & export SQLite CSV',
            icon: History,
            target: 'history' as ActiveSection,
          },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.title}
              type="button"
              onClick={() => onNavigate(action.target)}
              className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-left hover:border-[#315EAD]/40 hover:bg-[#F8FAFC] transition-colors flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-[#315EAD]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#172033]">{action.title}</p>
                <p className="text-xs text-[#64748B] truncate">{action.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
