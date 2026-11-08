import React from 'react';
import {
  Calendar,
  Clock,
  Download,
  ListChecks,
  Lock,
  Moon,
  RotateCcw,
  Sliders,
  Sun,
  Zap,
} from 'lucide-react';
import { FixedEventType, SymmetryState, TabId } from '../types/symmetry';
import {
  computeShiftMetrics,
  getLogicalDayKey,
  isPre4amRolloverWindow,
} from '../state/defaultState';
import { triggerHaptic } from '../utils/haptics';

interface HeaderBarProps {
  state: SymmetryState;
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onOpenTodayLogDrawer: () => void;
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
  onOpenTodayLogDrawer,
  onOpenPipelineDrawer,
  onOpenStateModal,
  onToggleZeroWorkSimulation,
  onResetDefault,
  isEveningTheme,
}) => {
  const metrics = computeShiftMetrics(state);
  const fixedEventDisplay = FIXED_EVENT_LABELS[state.fixedEvent];
  const logicalDay = state.logicalDayKey || getLogicalDayKey();
  const isLateShiftPre4am = isPre4amRolloverWindow();
  const todayLoggedCount = (state.todayBlockLog || []).filter(
    (entry) => entry.logicalDate === logicalDay
  ).length;

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
      className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-colors duration-500 ${
        isEveningTheme
          ? 'bg-[#0a0807]/85 border-amber-500/20 text-amber-50 shadow-[inset_0_-1px_0_0_rgba(245,158,11,0.12)]'
          : 'bg-[#060911]/80 border-white/[0.08] text-slate-100 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        {/* Top Row: Brand, Duration-Only Counter, Milestones, Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border font-mono font-bold text-xs tracking-tighter transition-all duration-500 ${
                isEveningTheme
                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-200 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.2)]'
                  : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]'
              }`}
            >
              SM
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className={`font-bold tracking-tight ${
                    isEveningTheme
                      ? 'font-serif text-xl sm:text-2xl text-amber-50 font-normal tracking-normal'
                      : 'text-base sm:text-lg text-white'
                  }`}
                >
                  {isEveningTheme ? 'Evening Recharge Sanctuary' : 'SymmetryManager'}
                </h1>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border transition-colors duration-500 ${
                    isEveningTheme
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : 'bg-white/[0.04] border-white/[0.12] text-cyan-300'
                  }`}
                >
                  {isEveningTheme
                    ? 'End-of-Shift Lock'
                    : `${state.loadMode}${state.cruisePlus ? '+' : ''} Mode`}
                </span>
                <span
                  className={`hidden lg:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    isEveningTheme
                      ? 'bg-stone-900/70 border-amber-900/50 text-amber-200/80'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
                  }`}
                  title="4:00 AM Day-Rollover Boundary (hours < 4 count as previous shift day)"
                >
                  <Clock className="w-3 h-3" />
                  <span>
                    Shift {logicalDay} {isLateShiftPre4am ? '(Pre-4AM Window)' : '(4AM Rollover)'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Center / Primary Duration-Only Readout (Rule 1) + Milestones */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              id="duration-only-header-badge"
              className={`px-3 py-1.5 rounded-xl border font-mono tabular-nums text-xs sm:text-sm font-bold tracking-tight flex items-center gap-2 transition-colors duration-500 ${
                metrics.isZeroWorkLeft || isEveningTheme
                  ? 'bg-amber-500/15 border-amber-500/45 text-amber-200 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.14)]'
                  : 'bg-cyan-500/10 border-cyan-400/40 text-cyan-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
              }`}
              title="Duration-Only Display (No wall-clock timestamps unless Fixed Event logged)"
            >
              {metrics.isZeroWorkLeft ? (
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Zap
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isEveningTheme ? 'text-amber-400' : 'text-cyan-400'
                  }`}
                />
              )}
              <span className="tabular-nums">{metrics.durationPrefix}</span>
            </div>

            {fixedEventDisplay && (
              <div
                id="fixed-event-timestamp-pill"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 font-mono tabular-nums text-xs flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{fixedEventDisplay}</span>
              </div>
            )}

            {/* Compact Upcoming Milestones Pills */}
            <div
              id="upcoming-milestones-banner"
              className="hidden xl:flex items-center gap-1.5"
            >
              {(state.upcomingMilestones?.length
                ? state.upcomingMilestones
                : ['Nov 12: Anatomy Exam', 'Dec 8–9: Comp Exam']
              ).map((milestone, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold border ${
                    isEveningTheme
                      ? 'bg-white/[0.03] border-amber-500/25 text-amber-200/90'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-300'
                  }`}
                >
                  {milestone}
                </span>
              ))}
            </div>
          </div>

          {/* Utility Buttons: Today's Log, 7-Day Pipeline Drawer, Simulate 0m Work Left, State.md Import/Export */}
          <div className="flex items-center gap-1.5">
            <button
              id="btn-open-today-log-drawer"
              type="button"
              onClick={() => {
                triggerHaptic([10]);
                onOpenTodayLogDrawer();
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer ${
                isEveningTheme
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/45 text-amber-100'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
              }`}
              title="Open Editable Today's Block Log drawer (since 4:00 AM logical day)"
            >
              <ListChecks className="w-3.5 h-3.5 shrink-0" />
              <span>Today&apos;s Log ({todayLoggedCount} blocks)</span>
            </button>

            <button
              id="btn-open-pipeline-drawer"
              type="button"
              onClick={onOpenPipelineDrawer}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                isEveningTheme
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-amber-500/25 text-amber-100'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.09] text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">7-Day Table</span>
            </button>

            <button
              id="btn-toggle-zero-work-sim"
              type="button"
              onClick={() => {
                triggerHaptic([15]);
                onToggleZeroWorkSimulation();
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                metrics.isZeroWorkLeft
                  ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/45 text-cyan-200'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/45 text-amber-200'
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
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                isEveningTheme
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-amber-500/25 text-amber-100'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.09] text-slate-200'
              }`}
              title="Open State Sync modal (Copy State JSON / Markdown, Import State JSON, New Day Reset)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">State Sync</span>
            </button>

            <button
              id="btn-reset-default-state"
              type="button"
              onClick={onResetDefault}
              className={`p-1.5 rounded-xl border cursor-pointer ${
                isEveningTheme
                  ? 'border-amber-500/20 bg-white/[0.03] hover:bg-white/[0.08] text-amber-300/70 hover:text-amber-200'
                  : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-slate-400 hover:text-slate-200'
              }`}
              title="Reset to default state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Row: Segmented Glassmorphic 4-Tab Bar */}
        <nav
          aria-label="Primary Tabs"
          className={`mt-2.5 p-1 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-1 ${
            isEveningTheme
              ? 'bg-black/40 border-amber-500/20'
              : 'bg-white/[0.02] border-white/[0.07]'
          }`}
        >
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`tab-nav-${t.id.toLowerCase()}`}
                type="button"
                onClick={() => onSelectTab(t.id)}
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-1.5 transition cursor-pointer ${
                  isActive
                    ? isEveningTheme
                      ? 'bg-amber-500/20 border border-amber-400/50 text-amber-100 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.18)]'
                      : 'bg-cyan-500/15 border border-cyan-400/45 text-cyan-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]'
                    : isEveningTheme
                    ? 'border border-transparent hover:bg-white/[0.04] text-stone-400 hover:text-amber-100'
                    : 'border border-transparent hover:bg-white/[0.04] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="truncate">
                  <span className="hidden md:inline">{t.label}</span>
                  <span className="md:hidden">{t.shortLabel}</span>
                </span>
                {t.badge && (
                  <span
                    className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? isEveningTheme
                          ? 'bg-amber-500/30 text-amber-100'
                          : 'bg-cyan-500/25 text-cyan-100'
                        : isEveningTheme
                        ? 'bg-white/[0.05] text-stone-400'
                        : 'bg-white/[0.05] text-slate-400'
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
