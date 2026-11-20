'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  Search,
  Download,
  Trash2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  History,
  AlertTriangle,
} from 'lucide-react';
import { EMOTION_CLASSES, EMOTION_META, type DetectionRecord } from '@/lib/types';

interface QueryResult {
  records: DetectionRecord[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export default function HistoryView({
  onDatabaseUpdated,
}: {
  onDatabaseUpdated: () => void;
}) {
  const [search, setSearch] = useState('');
  const [emotion, setEmotion] = useState('All');
  const [source, setSource] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<'id' | 'timestamp' | 'confidence' | 'emotion' | 'source'>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);

  const [data, setData] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (emotion !== 'All') params.set('emotion', emotion);
    if (source !== 'All') params.set('source', source);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    params.set('sortBy', sortBy);
    params.set('sortDir', sortDir);
    params.set('page', String(page));
    params.set('pageSize', '15');
    return params.toString();
  }, [search, emotion, source, startDate, endDate, sortBy, sortDir, page]);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/detections?${buildQueryString()}`, { cache: 'no-store' });
      if (res.ok) {
        const json: QueryResult = await res.json();
        setData(json);
      }
    } finally {
      setLoading(false);
    }
  }, [buildQueryString]);

  useEffect(() => {
    let active = true;
    fetch(`/api/detections?${buildQueryString()}`, { cache: 'no-store' })
      .then((res) => (res.ok ? (res.json() as Promise<QueryResult>) : null))
      .then((json) => {
        if (active && json) setData(json);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [buildQueryString]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('desc');
    }
    setPage(1);
  };

  const handleExportCsv = () => {
    const params = new URLSearchParams();
    if (search.trim()) params.set('search', search.trim());
    if (emotion !== 'All') params.set('emotion', emotion);
    if (source !== 'All') params.set('source', source);
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    window.location.href = `/api/export?${params.toString()}`;
  };

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      const res = await fetch('/api/detections', { method: 'DELETE' });
      if (res.ok) {
        setConfirmClear(false);
        setPage(1);
        onDatabaseUpdated();
        await loadHistory();
      }
    } finally {
      setClearing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[#172033] tracking-tight">
            Detection History
          </h1>
          <p className="text-sm text-[#64748B] mt-0.5">
            Persistent SQLite audit log (<span className="font-mono-tabular">detections</span> table) with search, filtering, sorting, and CSV export.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={!data || data.total === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#172033] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[#315EAD]" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setConfirmClear(true)}
            disabled={!data || data.total === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#E05252] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#FEF2F2] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear History
          </button>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search ID, emotion, date..."
            className="w-full pl-8 pr-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#172033] focus:outline-none focus:border-[#315EAD]"
          />
        </div>

        <select
          value={emotion}
          onChange={(e) => {
            setEmotion(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by emotion"
          className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#172033]"
        >
          <option value="All">All Emotions</option>
          {EMOTION_CLASSES.map((em) => (
            <option key={em} value={em}>
              {em}
            </option>
          ))}
        </select>

        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value);
            setPage(1);
          }}
          aria-label="Filter by source"
          className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#172033]"
        >
          <option value="All">All Sources</option>
          <option value="upload">Image Upload</option>
          <option value="webcam">Live Webcam</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          aria-label="Filter start date"
          className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#172033]"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          aria-label="Filter end date"
          className="px-3 py-2 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[#172033]"
        />
      </div>

      {/* Confirmation Dialog */}
      {confirmClear && (
        <div className="bg-[#FEF2F2] border border-[#FECACA] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-xs text-[#991B1B]">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Permanently delete all detection records from <span className="font-mono-tabular">detections.db</span>? This action cannot be undone.
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setConfirmClear(false)}
              className="px-3 py-1.5 text-xs font-medium text-[#172033] bg-white border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClearHistory}
              disabled={clearing}
              className="px-3 py-1.5 text-xs font-medium text-white bg-[#E05252] rounded-lg hover:bg-[#c53f3f] disabled:opacity-60"
            >
              {clearing ? 'Clearing...' : 'Confirm Clear All'}
            </button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl overflow-hidden">
        {loading && !data ? (
          <div className="p-8 text-center text-xs text-[#64748B]">Loading SQLite records...</div>
        ) : !data || data.records.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <History className="w-8 h-8 text-[#94A3B8] mx-auto" />
            <p className="text-sm font-semibold text-[#172033]">No Detection Records Found</p>
            <p className="text-xs text-[#64748B]">
              Try clearing your filters or run a facial expression analysis to populate the SQLite table.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-[#64748B]">
                    {[
                      { key: 'id' as const, label: 'ID', align: 'left' },
                      { key: 'timestamp' as const, label: 'Timestamp', align: 'left' },
                      { key: 'source' as const, label: 'Source', align: 'left' },
                      { key: 'emotion' as const, label: 'Emotion', align: 'left' },
                      { key: 'confidence' as const, label: 'Confidence', align: 'right' },
                    ].map((col) => (
                      <th key={col.key} className={`py-3 px-4 ${col.align === 'right' ? 'text-right' : ''}`}>
                        <button
                          type="button"
                          onClick={() => toggleSort(col.key)}
                          className="inline-flex items-center gap-1 hover:text-[#172033] transition-colors"
                        >
                          {col.label}
                          <ArrowUpDown className="w-3 h-3" />
                        </button>
                      </th>
                    ))}
                    <th className="py-3 px-4 text-right">Face Index</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0] text-sm">
                  {data.records.map((row) => (
                    <tr key={row.id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-mono-tabular text-xs text-[#64748B]">
                        #{row.id}
                      </td>
                      <td className="py-2.5 px-4 font-mono-tabular text-xs text-[#172033]">
                        {row.timestamp}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-[#64748B] capitalize">
                        {row.source}
                      </td>
                      <td className="py-2.5 px-4 text-xs font-medium text-[#172033]">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: EMOTION_META[row.emotion]?.color ?? '#64748B' }}
                          />
                          {row.emotion}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular text-xs font-semibold text-[#172033]">
                        {row.confidence.toFixed(2)}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono-tabular text-xs text-[#64748B]">
                        {row.face_index}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="px-4 py-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#64748B]">
              <span className="font-mono-tabular">
                Showing {data.records.length} of {data.total} records · Page {data.page} of{' '}
                {data.totalPages}
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={data.page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#E2E8F0] rounded-md bg-white hover:bg-[#F8FAFC] disabled:opacity-40 text-[#172033]"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Prev
                </button>
                <button
                  type="button"
                  disabled={data.page >= data.totalPages}
                  onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 border border-[#E2E8F0] rounded-md bg-white hover:bg-[#F8FAFC] disabled:opacity-40 text-[#172033]"
                >
                  Next
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
