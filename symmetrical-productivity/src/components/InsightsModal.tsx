import React, { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  CheckCircle2,
  Flame,
  Layers,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import { DailyHistoryEntry, DailyHistoryMode, SymmetryState } from '../types/symmetry';
import { syncTodayIntoDailyHistory } from '../state/defaultState';
import { MobileBottomSheet } from './MobileBottomSheet';
import { soundEngine } from '../utils/soundEngine';

interface InsightsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: SymmetryState;
  isEvening: boolean;
}

const MODE_META: Record<
  DailyHistoryMode,
  {
    label: string;
    shortLabel: string;
    cellClass: string;
    badgeClass: string;
    dotClass: string;
    description: string;
  }
> = {
  CRUISE: {
    label: 'Cruise (Cyan / Indigo)',
    shortLabel: 'Cruise',
    cellClass:
      'bg-gradient-to-br from-cyan-400/85 to-indigo-500/85 border-cyan-300/60 shadow-[0_0_8px_rgba(34,211,238,0.22)]',
    badgeClass: 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200',
    dotClass: 'bg-gradient-to-br from-cyan-400 to-indigo-500',
    description: '11–12 blocks (3h 40m–4h 00m) sustainable daily baseline',
  },
  SURGE: {
    label: 'Surge (Amber)',
    shortLabel: 'Surge',
    cellClass:
      'bg-amber-500/85 border-amber-300/70 shadow-[0_0_8px_rgba(245,158,11,0.28)]',
    badgeClass: 'bg-amber-500/15 border-amber-400/50 text-amber-200',
    dotClass: 'bg-amber-400',
    description: '14–15 blocks (max 2 consecutive days + mandatory 60m Reset)',
  },
  TAPER: {
    label: 'Taper (Emerald)',
    shortLabel: 'Taper',
    cellClass:
      'bg-emerald-500/80 border-emerald-300/60 shadow-[0_0_8px_rgba(16,185,129,0.24)]',
    badgeClass: 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200',
    dotClass: 'bg-emerald-400',
    description: '7–9 blocks (Lab / Volunteer / Pre-Exam Taper protection)',
  },
  EVENING_RECHARGE: {
    label: 'Evening Recharge (Warm Terracotta)',
    shortLabel: 'Evening Recharge',
    cellClass:
      'bg-[#d96b43]/85 border-[#f4a261]/70 shadow-[0_0_8px_rgba(217,107,67,0.3)]',
    badgeClass: 'bg-[#d96b43]/20 border-[#f4a261]/50 text-[#f8c59f]',
    dotClass: 'bg-[#e07a5f]',
    description: 'Full shift cleared to [0m work left] + 5-Pillar Recharge active',
  },
};

export const InsightsModal: React.FC<InsightsModalProps> = ({
  isOpen,
  onClose,
  state,
  isEvening,
}) => {
  const history90 = useMemo(() => syncTodayIntoDailyHistory(state), [state]);
  const [selectedDay, setSelectedDay] = useState<DailyHistoryEntry | null>(null);
  const [modeFilter, setModeFilter] = useState<DailyHistoryMode | 'ALL'>('ALL');

  const inspectedEntry =
    selectedDay || history90[history90.length - 1] || null;

  // Compute 90-day mode counts and Two-Stroke Input vs Output totals
  const telemetry = useMemo(() => {
    const counts: Record<DailyHistoryMode, number> = {
      CRUISE: 0,
      SURGE: 0,
      TAPER: 0,
      EVENING_RECHARGE: 0,
    };

    let cumulativeBlocks90 = 0;
    let cumulativeInput90 = 0;
    let cumulativeOutput90 = 0;
    let cumulativeEveningSessions90 = 0;

    let maxConsecutiveSurgeDays = 0;
    let runningSurgeStreak = 0;

    for (const day of history90) {
      counts[day.mode] = (counts[day.mode] || 0) + 1;
      cumulativeBlocks90 += day.blocksCompleted;
      cumulativeInput90 += day.inputBlocks;
      cumulativeOutput90 += day.outputBlocks;
      cumulativeEveningSessions90 += day.eveningSessions;

      if (day.mode === 'SURGE') {
        runningSurgeStreak += 1;
        if (runningSurgeStreak > maxConsecutiveSurgeDays) {
          maxConsecutiveSurgeDays = runningSurgeStreak;
        }
      } else {
        runningSurgeStreak = 0;
      }
    }

    // Last 7 days rolling average
    const last7 = history90.slice(-7);
    const last7TotalBlocks = last7.reduce((acc, d) => acc + d.blocksCompleted, 0);
    const rolling7DayAvgBlocks =
      last7.length > 0 ? +(last7TotalBlocks / last7.length).toFixed(1) : 0;
    const rolling7DayAvgMinutes = Math.round(rolling7DayAvgBlocks * 20);

    // Active tracks Input (Baseline + Media 3A/3B/3C) vs Output (Closed List Projects)
    const activeTracks = state.roadmapTracks.filter(
      (t) => !t.isSandbox || t.activeThisWeek
    );
    const tracksForRatio =
      activeTracks.length > 0 ? activeTracks : state.roadmapTracks;

    const trackInputBlocks = tracksForRatio.reduce(
      (sum, t) => sum + t.inputBlocksCredited,
      0
    );
    const trackOutputBlocks = tracksForRatio.reduce(
      (sum, t) => sum + t.outputBlocksCredited,
      0
    );

    // Combine active track credits with today's live media 3A/3B/3C starts
    const stickyMediaStarts =
      (state.recharge.stickySlots['3A_FICTION']?.fiveMinStarts || 0) +
      (state.recharge.stickySlots['3B_NONFICTION']?.fiveMinStarts || 0) +
      (state.recharge.stickySlots['3C_VIDEO']?.fiveMinStarts || 0);

    const totalActiveInput = trackInputBlocks + stickyMediaStarts;
    const totalActiveOutput = trackOutputBlocks;
    const totalActiveCombined = Math.max(1, totalActiveInput + totalActiveOutput);
    const activeInputPct = Math.round(
      (totalActiveInput / totalActiveCombined) * 100
    );
    const activeOutputPct = 100 - activeInputPct;

    const total90Combined = Math.max(1, cumulativeInput90 + cumulativeOutput90);
    const history90InputPct = Math.round(
      (cumulativeInput90 / total90Combined) * 100
    );
    const history90OutputPct = 100 - history90InputPct;

    // Verify 7-day pipeline consecutive Surge compliance as well
    let pipelineMaxSurgeStreak = 0;
    let currentPipeSurge = 0;
    for (const pDay of state.pipelineDays) {
      if (pDay.loadMode === 'SURGE') {
        currentPipeSurge += 1;
        if (currentPipeSurge > pipelineMaxSurgeStreak) {
          pipelineMaxSurgeStreak = currentPipeSurge;
        }
      } else {
        currentPipeSurge = 0;
      }
    }

    const worstSurgeStreak = Math.max(
      maxConsecutiveSurgeDays,
      pipelineMaxSurgeStreak,
      state.surgeConsecutiveDays
    );
    const isSurgeRuleCompliant = worstSurgeStreak <= 2;

    return {
      counts,
      cumulativeBlocks90,
      cumulativeInput90,
      cumulativeOutput90,
      cumulativeEveningSessions90,
      rolling7DayAvgBlocks,
      rolling7DayAvgMinutes,
      last7,
      totalActiveInput,
      totalActiveOutput,
      activeInputPct,
      activeOutputPct,
      history90InputPct,
      history90OutputPct,
      worstSurgeStreak,
      isSurgeRuleCompliant,
      stickyMediaStarts,
    };
  }, [history90, state]);

  if (!isOpen) return null;

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      id="modal-empirical-insights"
      ariaLabel="Empirical Insights Telemetry & 90-Day Symmetry Heatmap"
      desktopVariant="modal"
      maxWidthClass="max-w-5xl"
      isEvening={isEvening}
    >
      {/* Modal Header */}
      <div className="px-5 py-4 border-b border-white/[0.08] flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isEvening
                ? 'bg-amber-500/15 border-amber-400/40 text-amber-300'
                : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Empirical Insights &amp; 90-Day Symmetry Telemetry
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-semibold">
                Zero Punitive Streak Counters
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              90-Day Load Mode Distribution • Two-Stroke Input/Output Ratio • Capacity Health Audit
            </p>
          </div>
        </div>

        <button
          id="btn-close-insights-modal"
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 cursor-pointer"
          aria-label="Close Empirical Insights Modal"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable Telemetry Body */}
      <div className="p-5 overflow-y-auto space-y-5 flex-1">
        {/* SECTION 1: CAPACITY HEALTH AUDIT */}
        <section
          id="insights-capacity-health-audit"
          className="rounded-2xl border border-white/[0.09] bg-slate-950/65 p-4 space-y-3.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-mono uppercase tracking-wider font-bold text-slate-100">
                1. Capacity Health Audit (7-Day Rolling &amp; Circuit Breaker Compliance)
              </h3>
            </div>
            <span
              id="badge-surge-compliance-status"
              className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold flex items-center gap-1.5 border ${
                telemetry.isSurgeRuleCompliant
                  ? 'bg-emerald-500/15 border-emerald-400/50 text-emerald-200'
                  : 'bg-amber-500/20 border-amber-400/60 text-amber-200'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {telemetry.isSurgeRuleCompliant
                  ? `COMPLIANT: <= 2 Consecutive Surge Days (Max ${telemetry.worstSurgeStreak}/2)`
                  : `WARNING: Surge Streak ${telemetry.worstSurgeStreak}/2 — Step Down to Taper`}
              </span>
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 7-Day Rolling Average Blocks/Day */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400">
                <span>7-Day Rolling Average</span>
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span
                  id="metric-7day-rolling-avg"
                  className="text-2xl font-bold font-mono text-cyan-300"
                >
                  {telemetry.rolling7DayAvgBlocks} blks/day
                </span>
                <span className="text-xs font-mono text-slate-400">
                  ({Math.floor(telemetry.rolling7DayAvgMinutes / 60)}h{' '}
                  {String(telemetry.rolling7DayAvgMinutes % 60).padStart(2, '0')}m)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Target Cruise corridor: <span className="font-mono text-slate-200">7.0–12.5 blks/day</span>. Last 7 days sparkline:
              </p>
              <div className="flex items-end gap-1.5 pt-1 h-9">
                {telemetry.last7.map((d) => {
                  const heightPct = Math.max(20, Math.min(100, Math.round((d.blocksCompleted / 15) * 100)));
                  const meta = MODE_META[d.mode];
                  return (
                    <div
                      key={d.logicalDate}
                      className="flex-1 flex flex-col items-center gap-0.5"
                      title={`${d.logicalDate}: ${d.blocksCompleted} blocks (${meta.shortLabel})`}
                    >
                      <div className="w-full h-6 bg-slate-900 rounded flex items-end overflow-hidden p-0.5">
                        <div
                          className={`w-full rounded-sm ${meta.dotClass}`}
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="text-[9px] font-mono text-slate-400">
                        {d.blocksCompleted}b
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Consecutive Surge Rule Audit */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400">
                <span>Surge Circuit Breaker Audit</span>
                <Flame className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-300">
                  {state.surgeConsecutiveDays} / 2
                </span>
                <span className="text-xs font-mono text-slate-400">
                  active streak (90d peak: {telemetry.worstSurgeStreak}/2)
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Hard governor rule: <span className="font-mono text-slate-200">&lt;= 2 consecutive Surge days</span> followed by an automatic Taper or Cruise recovery shift.
              </p>
              <div className="pt-1 flex items-center gap-2 text-[11px] font-mono text-emerald-300">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span>Mid-Day 60–120m Reset enforced after Block 7 on Surge shifts</span>
              </div>
            </div>

            {/* 90-Day Cumulative Throughput & Recharge */}
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase text-slate-400">
                <span>90-Day Cumulative Rhythm</span>
                <Sparkles className="w-3.5 h-3.5 text-[#f4a261]" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-slate-100">
                  {telemetry.cumulativeBlocks90.toLocaleString()} blks
                </span>
                <span className="text-xs font-mono text-[#f4a261]">
                  • {telemetry.cumulativeEveningSessions90} Evening Sessions
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Tracks daily Load Mode transitions without punitive streak resets. Taper days and Evening Recharge are first-class states.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 2: 90-DAY SYMMETRY HEATMAP */}
        <section
          id="insights-90day-heatmap-section"
          className="rounded-2xl border border-white/[0.09] bg-slate-950/65 p-4 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs sm:text-sm font-mono uppercase tracking-wider font-bold text-slate-100">
                  2. 90-Day Activity Heatmap (State-Aware Rhythm Grid)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Color-coded by daily operating state. Click any day cell to inspect its Input/Output and Evening Recharge telemetry.
              </p>
            </div>

            {/* Mode Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playTactileClick('UI_TAP');
                  setModeFilter('ALL');
                }}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition cursor-pointer ${
                  modeFilter === 'ALL'
                    ? 'bg-white/15 border-white/40 text-white font-bold'
                    : 'bg-white/[0.03] border-white/[0.08] text-slate-400 hover:text-slate-200'
                }`}
              >
                All 90d
              </button>
              {(['CRUISE', 'SURGE', 'TAPER', 'EVENING_RECHARGE'] as DailyHistoryMode[]).map(
                (m) => {
                  const meta = MODE_META[m];
                  const isActive = modeFilter === m;
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        soundEngine.playTactileClick('UI_TAP');
                        setModeFilter(isActive ? 'ALL' : m);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border flex items-center gap-1.5 transition cursor-pointer ${
                        isActive
                          ? meta.badgeClass + ' font-bold'
                          : 'bg-white/[0.03] border-white/[0.08] text-slate-300 hover:bg-white/[0.07]'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${meta.dotClass}`} />
                      <span>
                        {meta.shortLabel} ({telemetry.counts[m]})
                      </span>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* 90-Day Heatmap Grid (15 columns x 6 rows on desktop, 10x9 on mobile) */}
          <div
            id="heatmap-90day-grid"
            className="grid grid-cols-10 sm:grid-cols-15 gap-1.5 p-3 rounded-xl bg-black/40 border border-white/[0.06]"
          >
            {history90.map((entry, idx) => {
              const meta = MODE_META[entry.mode];
              const isSelected = inspectedEntry?.logicalDate === entry.logicalDate;
              const isDimmed = modeFilter !== 'ALL' && entry.mode !== modeFilter;
              const isTodayCell = idx === history90.length - 1;

              return (
                <button
                  key={entry.logicalDate}
                  id={`heatmap-cell-${entry.logicalDate}`}
                  type="button"
                  onClick={() => {
                    soundEngine.playTactileClick('UI_TAP');
                    setSelectedDay(entry);
                  }}
                  title={`${entry.logicalDate} • ${meta.shortLabel} • ${entry.blocksCompleted} blocks (In: ${entry.inputBlocks} / Out: ${entry.outputBlocks}) • ${entry.eveningSessions} evening sessions`}
                  className={`h-7 sm:h-8 rounded-lg border transition-all flex flex-col items-center justify-center relative cursor-pointer ${
                    meta.cellClass
                  } ${isDimmed ? 'opacity-20 scale-95' : 'hover:scale-105'} ${
                    isSelected
                      ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-950 scale-105 z-10'
                      : ''
                  }`}
                >
                  <span className="text-[9px] font-mono font-bold text-slate-950/90 leading-none">
                    {entry.blocksCompleted}
                  </span>
                  {isTodayCell && (
                    <span className="w-1.5 h-1.5 rounded-full bg-white absolute top-0.5 right-0.5" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected Day Inspector Bar */}
          {inspectedEntry && (
            <div
              id="heatmap-selected-day-inspector"
              className="p-3.5 rounded-xl bg-white/[0.04] border border-white/[0.1] flex flex-wrap items-center justify-between gap-3 text-xs font-mono"
            >
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 font-bold">
                  {inspectedEntry.logicalDate}
                  {inspectedEntry.logicalDate ===
                  history90[history90.length - 1]?.logicalDate
                    ? ' (Today)'
                    : ''}
                </span>
                <span
                  className={`px-2.5 py-1 rounded-lg border font-bold ${
                    MODE_META[inspectedEntry.mode].badgeClass
                  }`}
                >
                  {MODE_META[inspectedEntry.mode].label}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 text-slate-300">
                <span>
                  Blocks:{' '}
                  <strong className="text-white">
                    {inspectedEntry.blocksCompleted} blks (
                    {inspectedEntry.blocksCompleted * 20}m)
                  </strong>
                </span>
                <span>
                  Input:{' '}
                  <strong className="text-cyan-300">
                    {inspectedEntry.inputBlocks}b
                  </strong>
                </span>
                <span>
                  Output:{' '}
                  <strong className="text-emerald-300">
                    {inspectedEntry.outputBlocks}b
                  </strong>
                </span>
                <span>
                  Evening Recharge:{' '}
                  <strong className="text-[#f4a261]">
                    {inspectedEntry.eveningSessions} sessions
                  </strong>
                </span>
              </div>
            </div>
          )}
        </section>

        {/* SECTION 3: TWO-STROKE BALANCE METER */}
        <section
          id="insights-two-stroke-balance-meter"
          className="rounded-2xl border border-white/[0.09] bg-slate-950/65 p-4 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs sm:text-sm font-mono uppercase tracking-wider font-bold text-slate-100">
                  3. Two-Stroke Balance Meter (INPUT vs. OUTPUT Ratio)
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Compares cumulative <span className="font-mono text-cyan-300">INPUT (Baseline Floor + Media 3A/3B/3C)</span> against <span className="font-mono text-emerald-300">OUTPUT (Closed List Deliverable Projects)</span> across active tracks.
              </p>
            </div>

            <div className="px-3 py-1 rounded-xl bg-white/[0.04] border border-white/[0.09] font-mono text-xs">
              <span className="text-cyan-300 font-bold">
                INPUT {telemetry.activeInputPct}%
              </span>
              <span className="text-slate-500 mx-1.5">/</span>
              <span className="text-emerald-300 font-bold">
                OUTPUT {telemetry.activeOutputPct}%
              </span>
            </div>
          </div>

          {/* Primary Visual Ratio Bar (Active Tracks + Media 3A/3B/3C) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-300 font-semibold">
                INPUT: {telemetry.totalActiveInput} blocks (Baseline + Media 3A/3B/3C:{' '}
                +{telemetry.stickyMediaStarts} starts)
              </span>
              <span className="text-emerald-300 font-semibold">
                OUTPUT: {telemetry.totalActiveOutput} blocks (Closed List Projects)
              </span>
            </div>

            <div className="h-5 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden flex p-0.5 relative">
              <div
                id="two-stroke-input-bar"
                className="h-full rounded-l-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-500 flex items-center justify-start pl-2.5 text-[10px] font-mono font-bold text-slate-950"
                style={{ width: `${Math.max(12, telemetry.activeInputPct)}%` }}
              >
                {telemetry.activeInputPct}% IN
              </div>
              <div
                id="two-stroke-output-bar"
                className="h-full rounded-r-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-500 flex items-center justify-end pr-2.5 text-[10px] font-mono font-bold text-slate-950"
                style={{ width: `${Math.max(12, telemetry.activeOutputPct)}%` }}
              >
                {telemetry.activeOutputPct}% OUT
              </div>
              {/* 50% Equilibrium Marker */}
              <div
                className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/70"
                title="50/50 Equilibrium Target"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>
                90-Day Cumulative Ledger: {telemetry.cumulativeInput90}b Input (
                {telemetry.history90InputPct}%) / {telemetry.cumulativeOutput90}b Output (
                {telemetry.history90OutputPct}%)
              </span>
              <span>Center Marker: 50% / 50% Symmetry</span>
            </div>
          </div>

          {/* Per-Track Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
            {state.roadmapTracks.map((track) => {
              const tTotal = Math.max(
                1,
                track.inputBlocksCredited + track.outputBlocksCredited
              );
              const tInPct = Math.round(
                (track.inputBlocksCredited / tTotal) * 100
              );
              const tOutPct = 100 - tInPct;

              return (
                <div
                  key={track.id}
                  className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-slate-100 truncate">
                      {track.name}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                        track.isSandbox
                          ? 'bg-amber-500/15 text-amber-300'
                          : 'bg-cyan-500/15 text-cyan-300'
                      }`}
                    >
                      {track.isSandbox ? 'SANDBOX' : 'CORE'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="text-cyan-300">
                      In: {track.inputBlocksCredited}b ({tInPct}%)
                    </span>
                    <span className="text-emerald-300">
                      Out: {track.outputBlocksCredited}b ({tOutPct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-900 overflow-hidden flex">
                    <div
                      className="h-full bg-cyan-400"
                      style={{ width: `${tInPct}%` }}
                    />
                    <div
                      className="h-full bg-emerald-400"
                      style={{ width: `${tOutPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Modal Footer */}
      <div className="px-5 py-3.5 border-t border-white/[0.08] bg-black/30 flex items-center justify-between text-xs font-mono text-slate-400 shrink-0">
        <span className="flex items-center gap-1.5">
          <Activity className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            Auto-persisted in state.dailyHistory ({history90.length} logical days tracked)
          </span>
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold cursor-pointer"
        >
          Done
        </button>
      </div>
    </MobileBottomSheet>
  );
};
