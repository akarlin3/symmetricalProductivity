import React from 'react';
import {
  Activity,
  Bell,
  Coffee,
  FastForward,
  Flame,
  Music,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Smartphone,
  Wind,
  Zap,
} from 'lucide-react';
import {
  Level2BreakProtocol,
  StressResetProtocol,
  SymmetryState,
  TimerRunMode,
} from '../types/symmetry';
import { computeShiftMetrics } from '../state/defaultState';
import {
  ANDROID_CHANNEL_ID,
  NotificationLogEntry,
  SymmetryNotificationEvent,
} from '../utils/notifications';
import { DualRingTimerSvg } from './DualRingTimerSvg';
import { BreathingVisualizer478 } from './BreathingVisualizer478';
import { triggerHaptic } from '../utils/haptics';

interface Tab2TimerTriageProps {
  state: SymmetryState;
  onToggleTimerRun: () => void;
  onResetCurrentStage: () => void;
  onFastForwardCurrentStage: () => void;
  onSwitchTimerMode: (mode: TimerRunMode) => void;
  onSelectL1Minutes: (mins: 3 | 5) => void;
  onSelectL2Minutes: (mins: 10 | 15) => void;
  onSelectL2Protocol: (protocol: Level2BreakProtocol) => void;
  onSelectL3Minutes: (mins: 60 | 90 | 120) => void;
  onTriggerStressReset: (protocol?: StressResetProtocol, mins?: 15 | 20) => void;
  onCompleteStressResetInto5mFlashcards: () => void;
  onToggleRecoveryFlashcardTimer: () => void;
  onCompleteRecoveryFlashcard5m: () => void;
  notificationLog: NotificationLogEntry[];
  notificationsGranted: boolean;
  swOfflineReady: boolean;
  onRequestNotificationPermissions: () => void;
  onManualTriggerNotification: (
    eventType: SymmetryNotificationEvent,
    title: string,
    body: string
  ) => void;
  onOpenMiniHudPip?: () => void;
  isMiniHudOpen?: boolean;
}

export const Tab2TimerTriage: React.FC<Tab2TimerTriageProps> = ({
  state,
  onToggleTimerRun,
  onResetCurrentStage,
  onFastForwardCurrentStage,
  onSwitchTimerMode,
  onSelectL1Minutes,
  onSelectL2Minutes,
  onSelectL2Protocol,
  onSelectL3Minutes,
  onTriggerStressReset,
  onCompleteStressResetInto5mFlashcards,
  onToggleRecoveryFlashcardTimer,
  onCompleteRecoveryFlashcard5m,
  notificationLog,
  notificationsGranted,
  swOfflineReady,
  onRequestNotificationPermissions,
  onManualTriggerNotification,
  onOpenMiniHudPip,
  isMiniHudOpen,
}) => {
  const { timer } = state;
  const metrics = computeShiftMetrics(state);

  const formatMMSS = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const stageBadgeText =
    timer.mode === 'WORK_20M'
      ? timer.workStage === 'IGNITION_5M'
        ? '5m Startup Step (IGNITION_5M)'
        : '15m Momentum (MOMENTUM_15M)'
      : timer.mode === 'BREAK_L1'
      ? `Level 1 Same-Task Micro-Reset (${timer.l1DurationMinutes}m)`
      : timer.mode === 'BREAK_L2'
      ? `Level 2 Task-Switch Buffer (${timer.l2DurationMinutes}m)`
      : timer.mode === 'BREAK_L3'
      ? `Level 3 Mid-Day Reset (${timer.l3DurationMinutes}m)`
      : `Stress / Fatigue Reset (${timer.stressDurationMinutes}m)`;

  return (
    <div className="space-y-5 animate-tab-enter">
      {/* Queued 5m Flashcard Block Banner (Triggered after Stress / Fatigue Reset completes) */}
      {timer.queuedRecoveryFlashcard5m && (
        <div
          id="queued-5m-flashcard-banner"
          className="p-4 sm:p-5 rounded-3xl backdrop-blur-xl bg-emerald-500/15 border border-emerald-400/50 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] text-emerald-100 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-mono text-[10px] font-bold uppercase">
                Post-Reset Queue Active
              </span>
              <h2 className="text-sm sm:text-base font-bold text-white">
                5m Flashcard Recovery Block Queued
              </h2>
            </div>
            <p className="text-xs text-emerald-100/85">
              Physical reset finished. Heavy reading/writing remains suspended while completing this 5-minute Flashcard ramp.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-xl bg-black/50 border border-emerald-400/50 font-mono tabular-nums text-lg font-bold text-emerald-300">
              {formatMMSS(timer.recoveryFlashcardSecondsLeft)}
            </div>
            <button
              id="btn-toggle-recovery-flashcard-timer"
              type="button"
              onClick={onToggleRecoveryFlashcardTimer}
              className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {timer.recoveryFlashcardRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause 5m Cards</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>Start 5m Cards</span>
                </>
              )}
            </button>
            <button
              id="btn-complete-recovery-flashcard"
              type="button"
              onClick={onCompleteRecoveryFlashcard5m}
              className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-emerald-400/40 text-emerald-100 font-semibold text-xs cursor-pointer"
            >
              Complete 5m Block
            </button>
          </div>
        </div>
      )}

      {/* SPLIT-SCREEN 12-COLUMN BENTO HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (5 COLS, STICKY): 280x280 DUAL-RING TIMER HUD */}
        <section
          aria-labelledby="timer-engine-heading"
          className="lg:col-span-5 lg:sticky lg:top-24 rounded-3xl bento-surface p-5 sm:p-6 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span
                id="timer-stage-badge"
                className={`px-2.5 py-1 rounded-full font-mono text-[11px] font-bold uppercase tracking-wider border ${
                  timer.mode === 'WORK_20M' && timer.workStage === 'IGNITION_5M'
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                    : timer.mode === 'WORK_20M' && timer.workStage === 'MOMENTUM_15M'
                    ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
                    : timer.mode === 'STRESS_RESET'
                    ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                    : 'bg-indigo-500/15 border-indigo-400/50 text-indigo-200'
                }`}
              >
                {stageBadgeText}
              </span>

              <span className="text-xs font-mono tabular-nums text-slate-400">
                Chain: {timer.chainedBlocksCount} / 2
              </span>
            </div>

            <div>
              <h2
                id="timer-engine-heading"
                className="text-base sm:text-lg font-bold text-white tracking-tight"
              >
                {timer.activeTaskTitle}
              </h2>
              <p className="text-xs font-mono text-slate-400 mt-0.5">
                {metrics.durationPrefix} • Two-Stage 20m Block (5m Startup → 15m Momentum)
              </p>
            </div>

            {/* Dual-Ring 280x280 Interactive SVG */}
            <div className="py-1 flex items-center justify-center">
              <DualRingTimerSvg
                timer={timer}
                isEveningTheme={metrics.isZeroWorkLeft}
                formattedTime={formatMMSS(timer.secondsLeft)}
                stageBadgeText={stageBadgeText}
                onToggleRun={() => {
                  triggerHaptic([15]);
                  onToggleTimerRun();
                }}
                onOpenMiniHudPip={onOpenMiniHudPip}
                isMiniHudOpen={isMiniHudOpen}
              />
            </div>

            {/* Primary Timer Controls */}
            <div className="grid grid-cols-3 gap-2">
              <button
                id="btn-timer-start-pause"
                type="button"
                onClick={() => {
                  triggerHaptic([15]);
                  onToggleTimerRun();
                }}
                className={`py-3 px-4 rounded-2xl font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer ${
                  timer.isRunning
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                }`}
              >
                {timer.isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start</span>
                  </>
                )}
              </button>

              <button
                id="btn-timer-fast-forward"
                type="button"
                onClick={onFastForwardCurrentStage}
                className="py-3 px-3 rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] border border-cyan-500/40 text-cyan-200 font-mono font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                title="Complete current stage immediately to test auto-rollover or break routing"
              >
                <FastForward className="w-4 h-4" />
                <span>Skip Stage</span>
              </button>

              <button
                id="btn-timer-reset-stage"
                type="button"
                onClick={onResetCurrentStage}
                className="py-3 px-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 font-mono font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
            </div>

            {/* Active 5-Minute Startup Micro-Script */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
                <span className="flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>5m Startup Micro-Script</span>
                </span>
                <span>{timer.activeTaskType}</span>
              </div>
              <p className="text-xs font-mono text-amber-100 leading-relaxed">
                “{timer.activeStartupPrompt}”
              </p>
            </div>

            {/* Quick Mode Switcher */}
            <div className="pt-2 border-t border-white/[0.08] flex flex-wrap gap-1.5">
              {(
                [
                  { id: 'WORK_20M', label: '20m Work (5m+15m)' },
                  { id: 'BREAK_L1', label: `L1 Break (${timer.l1DurationMinutes}m)` },
                  { id: 'BREAK_L2', label: `L2 Buffer (${timer.l2DurationMinutes}m)` },
                  { id: 'BREAK_L3', label: `L3 Mid-Day (${timer.l3DurationMinutes}m)` },
                  { id: 'STRESS_RESET', label: `Stress Reset (${timer.stressDurationMinutes}m)` },
                ] as { id: TimerRunMode; label: string }[]
              ).map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onSwitchTimerMode(m.id)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border cursor-pointer ${
                    timer.mode === m.id
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                      : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* RIGHT COLUMN (7 COLS): BENTO BREAK ROUTER + 4-7-8 BREATHING PACER + LOCK-SCREEN ALARMS */}
        <section
          aria-labelledby="break-triage-heading"
          className="lg:col-span-7 space-y-4"
        >
          {/* Bento Card 1: 4-7-8 Stress / Fatigue Reset & Breathing Visualizer */}
          <div
            id="stress-fatigue-reset-card"
            className="p-5 rounded-3xl backdrop-blur-xl bg-amber-500/[0.07] border border-amber-500/35 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.12)] space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wind className="w-4 h-4 text-amber-400 shrink-0" />
                  <h2
                    id="break-triage-heading"
                    className="text-sm font-bold uppercase tracking-wider font-mono text-amber-200"
                  >
                    Stress / Fatigue Reset &amp; 4-7-8 Visual Pacer
                  </h2>
                </div>
                <p className="text-xs text-amber-100/80">
                  Suspends heavy reading/writing, runs a 15–20m physical reset timer (4-7-8 breathing visual pace, espresso, or compression boots), then queues a 5m Flashcard block.
                </p>
              </div>

              <button
                id="btn-trigger-stress-reset"
                type="button"
                onClick={() =>
                  onTriggerStressReset(timer.stressProtocol, timer.stressDurationMinutes)
                }
                className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs cursor-pointer shrink-0 shadow-lg shadow-amber-500/20"
              >
                Start {timer.stressDurationMinutes}m Stress Reset
              </button>
            </div>

            {/* Protocol & Duration Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-500/20">
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    {
                      id: 'BREATHING_478',
                      label:
                        state.breakOptions?.stressBreathingLabel ||
                        '4-7-8 Breathing Visual Pace',
                    },
                    {
                      id: 'ESPRESSO',
                      label:
                        state.breakOptions?.stressEspressoLabel ||
                        'Espresso Reset',
                    },
                    {
                      id: 'COMPRESSION_BOOTS',
                      label:
                        state.breakOptions?.stressBootsLabel ||
                        'Compression Boots',
                    },
                  ] as { id: StressResetProtocol; label: string }[]
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onTriggerStressReset(p.id, timer.stressDurationMinutes)}
                    className={`px-2.5 py-1.5 rounded-xl font-mono text-xs border cursor-pointer ${
                      timer.stressProtocol === p.id
                        ? 'bg-amber-400/25 border-amber-300 text-amber-100 font-bold'
                        : 'bg-black/30 border-amber-500/25 text-amber-200/80 hover:text-amber-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 font-mono text-xs">
                {([15, 20] as const).map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onTriggerStressReset(timer.stressProtocol, mins)}
                    className={`px-2.5 py-1 rounded-xl border cursor-pointer ${
                      timer.stressDurationMinutes === mins
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                        : 'bg-black/30 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive 4-7-8 Breathing Visualizer */}
            <BreathingVisualizer478
              id="triage-breathing-478-visualizer"
              isActiveContext={true}
              defaultExpanded={true}
              variant="slate"
            />

            {timer.mode === 'STRESS_RESET' && (
              <div className="pt-2 border-t border-amber-500/25 flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-mono text-amber-200">
                  Active Reset: {formatMMSS(timer.secondsLeft)} remaining
                </span>
                <button
                  id="btn-finish-stress-into-flashcards"
                  type="button"
                  onClick={onCompleteStressResetInto5mFlashcards}
                  className="px-3 py-1.5 rounded-xl bg-amber-300 hover:bg-amber-200 text-slate-950 font-mono text-xs font-bold cursor-pointer"
                >
                  Finish Reset Now → Queue 5m Flashcards
                </button>
              </div>
            )}
          </div>

          {/* Bento Row 2: 3 Break Levels (Same-Task 3-5m, Task-Switch 10-15m, Mid-Day 60-120m) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Level 1: Same-Task Break (3-5m Micro-Reset) */}
            <div className="p-4 rounded-3xl bento-surface flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 font-mono text-[10px] text-cyan-200 font-bold">
                  LEVEL 1 • SAME-TASK
                </span>
                <h3 className="text-sm font-bold text-white pt-1">
                  3–5m Micro-Reset
                </h3>
                <p className="text-xs text-slate-400">
                  {state.breakOptions?.l1Label ||
                    'Max 2 chained 20m blocks [40m] before a mandatory 10–15m break.'}
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {([3, 5] as const).map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    disabled={timer.chainedBlocksCount >= 2}
                    onClick={() => onSelectL1Minutes(mins)}
                    className={`flex-1 py-2 rounded-xl font-mono text-xs font-bold border cursor-pointer disabled:opacity-40 ${
                      timer.mode === 'BREAK_L1' && timer.l1DurationMinutes === mins
                        ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
                    }`}
                  >
                    {mins}m Reset
                  </button>
                ))}
              </div>
            </div>

            {/* Level 2: Task-Switch Buffer (10-15m) */}
            <div className="p-4 rounded-3xl bento-surface flex flex-col justify-between space-y-3">
              <div className="space-y-1.5">
                <span className="px-2 py-0.5 rounded-md bg-indigo-500/15 border border-indigo-400/40 font-mono text-[10px] text-indigo-200 font-bold">
                  LEVEL 2 • TASK-SWITCH
                </span>
                <h3 className="text-sm font-bold text-white pt-0.5">
                  10–15m Buffer
                </h3>
                <div className="space-y-1 pt-1">
                  {(
                    [
                      {
                        id: 'ESPRESSO' as Level2BreakProtocol,
                        label: state.breakOptions?.l2EspressoLabel || 'Espresso',
                        icon: Coffee,
                      },
                      {
                        id: 'BASS_GUITAR_5M' as Level2BreakProtocol,
                        label:
                          state.breakOptions?.l2MusicLabel ||
                          '5m Cold Song (Bass/Guitar)',
                        icon: Music,
                      },
                      {
                        id: 'TENS_NORMATEC_15M' as Level2BreakProtocol,
                        label:
                          state.breakOptions?.l2PhysicalLabel ||
                          '15m TENS / Normatec',
                        icon: Activity,
                      },
                    ] as const
                  ).map((p) => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => onSelectL2Protocol(p.id)}
                        className={`w-full px-2.5 py-1 rounded-lg font-mono text-[11px] border flex items-center gap-1.5 cursor-pointer ${
                          timer.l2Protocol === p.id
                            ? 'bg-indigo-500/20 border-indigo-400 text-indigo-100 font-bold'
                            : 'bg-white/[0.03] border-white/[0.07] text-slate-300'
                        }`}
                      >
                        <Icon className="w-3 h-3 shrink-0" />
                        <span className="truncate">{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {([10, 15] as const).map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onSelectL2Minutes(mins)}
                    className={`flex-1 py-2 rounded-xl font-mono text-xs font-bold border cursor-pointer ${
                      timer.mode === 'BREAK_L2' && timer.l2DurationMinutes === mins
                        ? 'bg-indigo-400 text-slate-950 border-indigo-300'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>

            {/* Level 3: Mid-Day Reset (60-120m) */}
            <div className="p-4 rounded-3xl bento-surface flex flex-col justify-between space-y-3">
              <div className="space-y-1">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 font-mono text-[10px] text-emerald-200 font-bold">
                  LEVEL 3 • SPLIT-SHIFT
                </span>
                <h3 className="text-sm font-bold text-white pt-1">
                  60–120m Mid-Day Reset
                </h3>
                <p className="text-xs text-slate-400">
                  Mandatory after 7 completed blocks in Surge Mode (14–15 blocks).
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                {([60, 90, 120] as const).map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => onSelectL3Minutes(mins)}
                    className={`flex-1 py-2 rounded-xl font-mono text-xs font-bold border cursor-pointer ${
                      timer.mode === 'BREAK_L3' && timer.l3DurationMinutes === mins
                        ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                        : 'bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.08] text-slate-200'
                    }`}
                  >
                    {mins}m
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bento Row 3: Lock-Screen Notification & Capacitor Channel Console */}
          <div className="p-5 rounded-3xl bento-surface space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider font-mono text-slate-200">
                  Lock-Screen Alarms &amp; Capacitor Channel ({ANDROID_CHANNEL_ID})
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded-md font-mono text-[10px] border ${
                    swOfflineReady
                      ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                      : 'bg-white/[0.04] border-white/[0.08] text-slate-400'
                  }`}
                >
                  {swOfflineReady ? 'SW Ready' : 'Web Audio + SW'}
                </span>
                <button
                  id="btn-request-notification-permissions"
                  type="button"
                  onClick={onRequestNotificationPermissions}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-cyan-500/40 text-cyan-200 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Bell className="w-3 h-3" />
                  <span>{notificationsGranted ? 'Channel Active' : 'Enable Alerts'}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                id="btn-test-notif-rollover"
                type="button"
                onClick={() =>
                  onManualTriggerNotification(
                    'ROLLOVER_5M_TO_15M',
                    '5m Startup Complete — Rolling into 15m Momentum',
                    `Auto-rolling into 15m Momentum (MOMENTUM_15M) for "${timer.activeTaskTitle}".`
                  )
                }
                className="p-2.5 rounded-xl bg-black/30 hover:bg-white/[0.05] border border-white/[0.08] text-left font-mono text-[11px] text-cyan-200 cursor-pointer flex items-center justify-between"
              >
                <span>1. 5m → 15m Rollover</span>
                <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              </button>

              <button
                id="btn-test-notif-checkin"
                type="button"
                onClick={() =>
                  onManualTriggerNotification(
                    'CHECKIN_20M_CHIME',
                    '20m Check-In: Keep going, switch, or rest?',
                    '20m Check-In reached. Keep going, switch, or rest?'
                  )
                }
                className="p-2.5 rounded-xl bg-black/30 hover:bg-white/[0.05] border border-white/[0.08] text-left font-mono text-[11px] text-amber-200 cursor-pointer flex items-center justify-between"
              >
                <span>2. 20m Check-In Chime</span>
                <Bell className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              </button>

              <button
                id="btn-test-notif-60m-break"
                type="button"
                onClick={() =>
                  onManualTriggerNotification(
                    'MANDATORY_60M_BREAK',
                    '60m Limit Reached: Take a 5–10m physical break',
                    '60m continuous window complete. Enforcing mandatory 5–10m physical break.'
                  )
                }
                className="p-2.5 rounded-xl bg-black/30 hover:bg-white/[0.05] border border-white/[0.08] text-left font-mono text-[11px] text-emerald-200 cursor-pointer flex items-center justify-between"
              >
                <span>3. 60m Break Alert</span>
                <ShieldAlert className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              </button>
            </div>

            {notificationLog.length > 0 && (
              <div className="max-h-24 overflow-y-auto space-y-1 pt-1">
                {notificationLog.slice(0, 3).map((entry) => (
                  <div
                    key={entry.id}
                    className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.06] font-mono text-[11px] flex items-center justify-between gap-2"
                  >
                    <span className="text-slate-200 truncate">{entry.title}</span>
                    <span className="text-[10px] text-cyan-300 shrink-0">
                      {entry.deliveryTarget}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
