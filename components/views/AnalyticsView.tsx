'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { BarChart3, Filter, RefreshCw } from 'lucide-react';
import { type AnalyticsSummary } from '@/lib/types';
import {
  ConfidenceHistogramChart,
  EmotionBarChart,
  EmotionDonutChart,
  EmotionTrendLineChart,
  SourceComparisonChart,
} from '@/components/Charts';

type PresetRange = 'today' | '7d' | '30d' | 'all' | 'custom';

export default function AnalyticsView() {
  const [preset, setPreset] = useState<PresetRange>('all');
  const [source, setSource] = useState<'all' | 'upload' | 'webcam'>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [data, setData] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const buildParams = useCallback(() => {
    const params = new URLSearchParams();
    params.set('preset', preset);
    if (source !== 'all') params.set('source', source);
    if (preset === 'custom') {
      if (startDate) params.set('startDate', startDate);
      if (endDate) params.set('endDate', endDate);
    }
    return params.toString();
  }, [preset, source, startDate, endDate]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/analytics?${buildParams()}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Failed to load analytics from SQLite.');
      const json: AnalyticsSummary = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Analytics query error');
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    let active = true;
    fetch(`/api/analytics?${buildParams()}`, { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load analytics from SQLite.');
        return res.json() as Promise<AnalyticsSummary>;
      })
      .then((json) => {
        if (active) {
          setData(json);
          setError(null);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err instanceof Error ? err.message : 'Analytics query error');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [buildParams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#172033] tracking-tight">
            Emotion Analytics — Trend Tracker
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Aggregated facial expression trends queried directly from SQLite (<span className="font-mono-tabular">detections.db</span>).
          </p>
        </div>

        <button
          type="button"
          onClick={loadAnalytics}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#172033] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] transition-colors self-start sm:self-auto whitespace-nowrap shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
          Refresh Analytics
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#64748B] mr-1">
            <Filter className="w-3.5 h-3.5" />
            Timeframe:
          </span>
          {(
            [
              { id: 'today', label: 'Today' },
              { id: '7d', label: 'Last 7 Days' },
              { id: '30d', label: 'Last 30 Days' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom Range' },
            ] as { id: PresetRange; label: string }[]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setPreset(item.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                preset === item.id
                  ? 'bg-[#315EAD] text-white'
                  : 'bg-[#F8FAFC] text-[#64748B] hover:text-[#172033]'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {preset === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-label="Start date"
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#172033]"
              />
              <span className="text-xs text-[#64748B]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-label="End date"
                className="px-2.5 py-1.5 text-xs bg-white border border-[#E2E8F0] rounded-lg text-[#172033]"
              />
            </div>
          )}

          <div className="flex items-center gap-1 p-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg">
            {(['all', 'upload', 'webcam'] as const).map((src) => (
              <button
                key={src}
                type="button"
                onClick={() => setSource(src)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md capitalize transition-colors ${
                  source === src
                    ? 'bg-white text-[#172033] shadow-xs border border-[#E2E8F0]'
                    : 'text-[#64748B] hover:text-[#172033]'
                }`}
              >
                {src === 'all' ? 'All Sources' : src}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] rounded-xl p-4 text-xs">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white border border-[#E2E8F0] rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data && data.totalDetections === 0 ? (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-12 text-center space-y-2">
          <BarChart3 className="w-9 h-9 text-[#94A3B8] mx-auto" />
          <h2 className="text-base font-semibold text-[#172033]">
            No Matching Records in Selected Filter
          </h2>
          <p className="text-xs text-[#64748B] max-w-md mx-auto">
            There are zero detection rows in <span className="font-mono-tabular">detections.db</span> for the active timeframe and source filter. Run image or webcam detections to populate real trend charts.
          </p>
        </div>
      ) : (
        data && (
          <>
            {/* 6 Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
              {[
                { label: 'Total Detections', value: data.totalDetections },
                { label: 'Happy Count', value: data.happyCount },
                { label: 'Sad Count', value: data.sadCount },
                { label: 'Angry Count', value: data.angryCount },
                { label: 'Neutral Count', value: data.neutralCount },
                { label: 'Most Common', value: data.mostCommonEmotion ?? '—' },
              ].map((card) => (
                <div
                  key={card.label}
                  className="bg-white border border-[#E2E8F0] rounded-xl p-4"
                >
                  <p className="text-xs text-[#64748B]">{card.label}</p>
                  <p className="text-xl font-bold text-[#172033] mt-1 font-mono-tabular">
                    {typeof card.value === 'number' ? card.value.toLocaleString() : card.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Chart 1 & 2: Donut + Bar */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-[#172033]">
                    1. Emotion Distribution (Donut Chart)
                  </h2>
                  <p className="text-xs text-[#64748B]">Proportional share of detected classes</p>
                </div>
                <EmotionDonutChart data={data.distribution} total={data.totalDetections} />
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-[#172033]">
                    2. Emotion Frequency (Bar Chart)
                  </h2>
                  <p className="text-xs text-[#64748B]">Absolute count per emotion category</p>
                </div>
                <EmotionBarChart data={data.distribution} />
              </div>
            </div>

            {/* Chart 3: Trends Over Time */}
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
              <div>
                <h2 className="text-base font-semibold text-[#172033]">
                  3. Emotion Trends Over Time (Line Chart)
                </h2>
                <p className="text-xs text-[#64748B]">
                  Toggle emotion series below to inspect temporal changes across sessions
                </p>
              </div>
              <EmotionTrendLineChart data={data.trendsOverTime} />
            </div>

            {/* Chart 4 & 5: Source Comparison + Confidence Histogram */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-[#172033]">
                    4. Image vs Webcam Detections
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Volume and average CNN confidence by capture source
                  </p>
                </div>
                <SourceComparisonChart data={data.sourceComparison} />
              </div>

              <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 space-y-4">
                <div>
                  <h2 className="text-base font-semibold text-[#172033]">
                    5. Confidence Distribution (Histogram)
                  </h2>
                  <p className="text-xs text-[#64748B]">
                    Softmax probability buckets across filtered detections
                  </p>
                </div>
                <ConfidenceHistogramChart data={data.confidenceHistogram} />
              </div>
            </div>
          </>
        )
      )}
    </div>
  );
}
