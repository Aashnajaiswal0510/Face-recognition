'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  ScanFace,
  Camera,
  Users,
  BarChart3,
  History,
  Cpu,
  BookOpen,
  Settings,
  Menu,
  X,
  Database,
  BrainCircuit,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import {
  DEFAULT_SETTINGS,
  type ActiveSection,
  type AppSettings,
  type TrainingMetricsPayload,
} from '@/lib/types';
import { ensureModelsLoaded, getModelStatus } from '@/lib/visionEngine';
import DashboardView from '@/components/views/DashboardView';
import ImageDetectionView from '@/components/views/ImageDetectionView';
import WebcamDetectionView from '@/components/views/WebcamDetectionView';
import MultiFaceView from '@/components/views/MultiFaceView';
import AnalyticsView from '@/components/views/AnalyticsView';
import HistoryView from '@/components/views/HistoryView';
import ModelInfoView from '@/components/views/ModelInfoView';
import AboutProjectView from '@/components/views/AboutProjectView';
import SettingsView from '@/components/views/SettingsView';

const NAV_ITEMS: {
  id: ActiveSection;
  label: string;
  icon: React.ElementType;
}[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'image-detection', label: 'Emotion Detection', icon: ScanFace },
  { id: 'webcam-detection', label: 'Live Webcam Detection', icon: Camera },
  { id: 'multi-face', label: 'Multi-Face Detection', icon: Users },
  { id: 'analytics', label: 'Emotion Analytics', icon: BarChart3 },
  { id: 'history', label: 'Detection History', icon: History },
  { id: 'model-info', label: 'Model Information', icon: Cpu },
  { id: 'about', label: 'About Project', icon: BookOpen },
  { id: 'settings', label: 'Settings', icon: Settings },
];

const SETTINGS_STORAGE_KEY = 'fer_cnn_settings_v1';

export default function AppShell() {
  const [activeSection, setActiveSection] = useState<ActiveSection>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);

  const [modelState, setModelState] = useState<'idle' | 'loading' | 'ready' | 'error'>('loading');
  const [dbHealth, setDbHealth] = useState({
    connected: true,
    dbFile: 'detections.db',
    totalRecords: 0,
    sizeBytes: 0,
  });
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetricsPayload>({
    available: false,
  });

  const refreshHealth = useCallback(async () => {
    try {
      const res = await fetch('/api/health', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.db) setDbHealth(json.db);
        if (json.trainingMetrics) setTrainingMetrics(json.trainingMetrics);
      }
    } catch {
      setDbHealth((prev) => ({ ...prev, connected: false }));
    }
  }, []);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      try {
        const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (saved && active) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(saved) });
        }
      } catch {
        // ignore storage errors
      }
    });

    fetch('/api/health', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!active || !json) return;
        if (json.db) setDbHealth(json.db);
        if (json.trainingMetrics) setTrainingMetrics(json.trainingMetrics);
      })
      .catch(() => {
        if (active) setDbHealth((prev) => ({ ...prev, connected: false }));
      });

    ensureModelsLoaded()
      .then(() => {
        if (active) setModelState('ready');
      })
      .catch(() => {
        if (active) setModelState(getModelStatus().state);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleUpdateSettings = (next: AppSettings) => {
    setSettings(next);
    try {
      localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  };

  const handleNavigate = (section: ActiveSection) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
  };

  const activeNav = NAV_ITEMS.find((item) => item.id === activeSection) ?? NAV_ITEMS[0];

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-[#E2E8F0] flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#315EAD] flex items-center justify-center shrink-0">
          <ScanFace className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-[#172033] leading-tight truncate">
            FER Vision
          </p>
          <p className="text-[11px] text-[#64748B] truncate">CNN Expression Platform</p>
        </div>
      </div>

      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNavigate(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors text-left whitespace-nowrap ${
                isActive
                  ? 'bg-[#EFF6FF] text-[#315EAD] font-semibold'
                  : 'text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#172033]'
              }`}
            >
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive ? 'text-[#315EAD]' : 'text-[#64748B]'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-[#E2E8F0] space-y-2 text-xs">
        <div className="flex items-center justify-between text-[#64748B]">
          <span className="inline-flex items-center gap-1.5">
            <BrainCircuit className="w-3.5 h-3.5 text-[#315EAD]" />
            CNN Model
          </span>
          <span
            className={`font-medium ${
              modelState === 'ready'
                ? 'text-[#16A36A]'
                : modelState === 'error'
                ? 'text-[#E05252]'
                : 'text-[#E9A23B]'
            }`}
          >
            {modelState === 'ready'
              ? 'Loaded'
              : modelState === 'error'
              ? 'Unavailable'
              : 'Loading'}
          </span>
        </div>

        <div className="flex items-center justify-between text-[#64748B]">
          <span className="inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-[#64748B]" />
            SQLite DB
          </span>
          <span
            className={`font-medium font-mono-tabular ${
              dbHealth.connected ? 'text-[#16A36A]' : 'text-[#E05252]'
            }`}
          >
            {dbHealth.connected ? `${dbHealth.totalRecords} rows` : 'Offline'}
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#172033] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-[256px] shrink-0 bg-white border-r border-[#E2E8F0] sticky top-0 h-screen">
        {renderSidebarContent()}
      </aside>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-[#172033]/30"
            />
            <motion.aside
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ duration: 0.18 }}
              className="relative w-[260px] max-w-[80vw] bg-white h-full border-r border-[#E2E8F0] z-10"
            >
              <button
                type="button"
                aria-label="Close navigation"
                onClick={() => setMobileMenuOpen(false)}
                className="absolute top-4 right-3 p-1.5 rounded-lg text-[#64748B] hover:bg-[#F8FAFC]"
              >
                <X className="w-4 h-4" />
              </button>
              {renderSidebarContent()}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Header */}
        <header className="bg-white border-b border-[#E2E8F0] px-4 sm:px-8 h-16 flex items-center justify-between gap-4 sticky top-0 z-30">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label="Open navigation menu"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg border border-[#E2E8F0] text-[#172033] hover:bg-[#F8FAFC]"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-xs text-[#64748B] min-w-0">
              <span className="hidden sm:inline font-medium text-[#172033] whitespace-nowrap">
                Facial Expression Recognition
              </span>
              <span className="hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-[#315EAD] truncate">{activeNav.label}</span>
            </div>
          </div>

          <div className="flex items-center gap-5 shrink-0">
            <div className="hidden md:flex items-center gap-4 text-xs text-[#64748B]">
              <span>
                Model:{' '}
                <strong
                  className={
                    modelState === 'ready'
                      ? 'text-[#16A36A]'
                      : modelState === 'error'
                      ? 'text-[#E05252]'
                      : 'text-[#E9A23B]'
                  }
                >
                  {modelState === 'ready'
                    ? 'CNN Ready'
                    : modelState === 'error'
                    ? 'Load Error'
                    : 'Initializing'}
                </strong>
              </span>
              <span aria-hidden="true">·</span>
              <span>
                Database:{' '}
                <strong className={dbHealth.connected ? 'text-[#16A36A]' : 'text-[#E05252]'}>
                  {dbHealth.connected ? 'SQLite Connected' : 'Disconnected'}
                </strong>
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleNavigate('image-detection')}
              className="px-3.5 py-2 text-xs font-medium text-white bg-[#315EAD] rounded-lg hover:bg-[#274c8e] transition-colors whitespace-nowrap shrink-0"
            >
              Analyze Image
            </button>
          </div>
        </header>

        {/* Viewport Container */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1320px] w-full mx-auto">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.16 }}
          >
            {activeSection === 'dashboard' && (
              <DashboardView onNavigate={handleNavigate} />
            )}
            {activeSection === 'image-detection' && (
              <ImageDetectionView
                settings={settings}
                onDatabaseUpdated={refreshHealth}
              />
            )}
            {activeSection === 'webcam-detection' && (
              <WebcamDetectionView
                settings={settings}
                onDatabaseUpdated={refreshHealth}
              />
            )}
            {activeSection === 'multi-face' && (
              <MultiFaceView
                settings={settings}
                onDatabaseUpdated={refreshHealth}
              />
            )}
            {activeSection === 'analytics' && <AnalyticsView />}
            {activeSection === 'history' && (
              <HistoryView onDatabaseUpdated={refreshHealth} />
            )}
            {activeSection === 'model-info' && (
              <ModelInfoView trainingMetrics={trainingMetrics} />
            )}
            {activeSection === 'about' && <AboutProjectView />}
            {activeSection === 'settings' && (
              <SettingsView
                settings={settings}
                onUpdateSettings={handleUpdateSettings}
                dbHealth={dbHealth}
              />
            )}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
