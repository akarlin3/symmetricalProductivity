import React from 'react';
import {
  Calendar,
  Download,
  Lock,
  Moon,
  RotateCcw,
  Sliders,
  Sun,
  Zap,
} from 'lucide-react';
import { FixedEventType, SymmetryState, TabId } from '../types/symmetry';
import { computeShiftMetrics } from '../state/defaultState';

interface HeaderBarProps {
  state: SymmetryState;
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenPipelineDrawer: () => void;
  onOpenStateModal: () => void;
  onToggleZeroWorkSimulation: () => void;
  onResetDefault: () => void;
  isEveningTheme: boolean;
}

const FIXED_EVENT_LABELS: Record<FixedEventType, string | null> = {
  NONE: null,
  LAB_2H: 'Fixed Event: 09:00 AM – 11:00 AM Lab (~2h)',
  VOLUNTEER: 'Fixed Event: 01:00 PM – 03:00 PM Volunteer Shift',
  EVENING_OUTING_6PM: 'Fixed Event: 6:00 PM Evening Outing',
};

export const HeaderBar: React.FC<HeaderBarProps> = ({
  state,
  activeTab,
  onSelectTab,
  onOpenPipelineDrawer,
  onOpenStateModal,
  onToggleZeroWorkSimulation,
  onResetDefault,
  isEveningTheme,
}) => {
  const metrics = computeShiftMetrics(state);
  const fixedEventDisplay = FIXED_EVENT_LABELS[state.fixedEvent];

  const tabs: { id: TabId; label: string; shortLabel: string; badge?: string }[] = [
    {
      id: 'PIPELINE',
      label: '1. Focus Pipeline',
      shortLabel: 'Pipeline',
      badge: `${metrics.totalCompletedBlocks}/${metrics.totalTargetBlocks}`,
    },
    {
      id: 'TIMER',
      label: '2. Active Timer & Triage',
      shortLabel: 'Timer',
      badge: state.timer.workStage === 'IGNITION_5M' ? '5m' : '15m',
    },
    {
      id: 'RECHARGE',
      label: '3. Evening Recharge Menu',
      shortLabel: 'Recharge',
      badge: metrics.isZeroWorkLeft ? 'UNLOCKED' : '0m Lock',
    },
    {
      id: 'ROADMAP',
      label: '4. Long-Term Roadmap',
      shortLabel: 'Roadmap',
      badge: '4-Rung',
    },
  ];

  return (
    <header
      className={`sticky top-0 z-30 border-b transition-colors duration-300 ${
        isEveningTheme
          ? 'bg-stone-950/95 border-amber-900/50 text-amber-50'
          : 'bg-slate-950/95 border-slate-800 text-slate-100'
      } backdrop-blur-md`}
    >
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3">
        {/* Top Row: App Brand, Duration-Only Counter, Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border font-mono font-bold text-sm ${
                isEveningTheme
                  ? 'bg-amber-950/70 border-amber-700/60 text-amber-300'
                  : 'bg-sky-950/70 border-sky-700/60 text-sky-300'
              }`}
            >
              SM
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold tracking-tight">
                  SymmetryManager
                </h1>
                <span
                  className={`text-[11px] font-mono uppercase px-2 py-0.5 rounded-md border ${
                    isEveningTheme
                      ? 'bg-amber-900/40 border-amber-700/60 text-amber-200'
                      : 'bg-slate-900 border-slate-700 text-slate-300'
                  }`}
                >
                  {isEveningTheme ? 'End-of-Shift Lock' : `${state.loadMode}${state.cruisePlus ? '+' : ''} Mode`}
                </span>
              </div>
              <p className="text-xs text-slate-400 hidden sm:block">
                Duration-Only Focus Pipeline &amp; Deterministic State Machine
              </p>
            </div>
          </div>

          {/* Center / Primary Duration-Only Readout (Rule 1) */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              id="duration-only-header-badge"
              className={`px-3 py-1.5 rounded-xl border font-mono text-xs sm:text-sm font-bold tracking-tight flex items-center gap-2 shadow-inner ${
                metrics.isZeroWorkLeft
                  ? 'bg-amber-950/80 border-amber-600/70 text-amber-200'
                  : 'bg-slate-900 border-sky-600/50 text-sky-200'
              }`}
              title="Duration-Only Display (No wall-clock timestamps unless Fixed Event logged)"
            >
              {metrics.isZeroWorkLeft ? (
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Zap className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              )}
              <span>{metrics.durationPrefix}</span>
            </div>

            {fixedEventDisplay && (
              <div
                id="fixed-event-timestamp-pill"
                className="px-2.5 py-1.5 rounded-xl bg-amber-950/50 border border-amber-700/50 text-amber-200 font-mono text-xs flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{fixedEventDisplay}</span>
              </div>
            )}
          </div>

          {/* Utility Buttons: 7-Day Pipeline Drawer, Simulate 0m Work Left, State.md Import/Export */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-open-pipeline-drawer"
              type="button"
              onClick={onOpenPipelineDrawer}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                isEveningTheme
                  ? 'bg-stone-900 hover:bg-stone-800 border-amber-800/60 text-amber-100'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">7-Day Table</span>
            </button>

            <button
              id="btn-toggle-zero-work-sim"
              type="button"
              onClick={onToggleZeroWorkSimulation}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                metrics.isZeroWorkLeft
                  ? 'bg-sky-950/80 hover:bg-sky-900 border-sky-700 text-sky-200'
                  : 'bg-amber-950/70 hover:bg-amber-900/80 border-amber-700/60 text-amber-200'
              }`}
              title="Toggle between On-Duty remaining blocks and 0m work left (End-of-Shift Lock)"
            >
              {metrics.isZeroWorkLeft ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Resume Shift</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Test 0m Lock</span>
                </>
              )}
            </button>

            <button
              id="btn-open-state-io"
              type="button"
              onClick={onOpenStateModal}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition cursor-pointer ${
                isEveningTheme
                  ? 'bg-stone-900 hover:bg-stone-800 border-amber-800/60 text-amber-100'
                  : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
              }`}
              title="Import or Export state.md / JSON"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden md:inline">state.md</span>
            </button>

            <button
              id="btn-reset-default-state"
              type="button"
              onClick={onResetDefault}
              className="p-1.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer"
              title="Reset to default state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Row: 4-Tab Navigation Bar */}
        <nav
          aria-label="Primary Tabs"
          className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-1.5"
        >
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`tab-nav-${t.id.toLowerCase()}`}
                type="button"
                onClick={() => onSelectTab(t.id)}
                className={`px-3 py-2 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-between gap-1.5 transition cursor-pointer ${
                  isActive
                    ? isEveningTheme
                      ? 'bg-amber-900/50 border-amber-500/80 text-amber-100 shadow-sm'
                      : 'bg-sky-950/90 border-sky-500/80 text-sky-100 shadow-sm'
                    : isEveningTheme
                    ? 'bg-stone-900/60 hover:bg-stone-900 border-stone-800 text-stone-400'
                    : 'bg-slate-900/60 hover:bg-slate-900 border-slate-800/90 text-slate-400'
                }`}
              >
                <span className="truncate">
                  <span className="hidden md:inline">{t.label}</span>
                  <span className="md:hidden">{t.shortLabel}</span>
                </span>
                {t.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isActive
                        ? isEveningTheme
                          ? 'bg-amber-800/80 text-amber-100'
                          : 'bg-sky-800/80 text-sky-100'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
