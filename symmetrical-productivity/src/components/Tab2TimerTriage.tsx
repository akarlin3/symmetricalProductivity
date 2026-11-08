import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  Coffee,
  FastForward,
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
} from '../services/notifications';

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
}) => {
  const { timer } = state;
  const metrics = computeShiftMetrics(state);

  // 4-7-8 Breathing Visual Pacer local cycle counter (4s inhale + 7s hold + 8s exhale = 19s cycle)
  const [breathTick, setBreathTick] = useState(0);

  useEffect(() => {
    if (timer.mode !== 'STRESS_RESET' || timer.stressProtocol !== 'BREATHING_478') {
      return;
    }
    const cycleAnchorMs = Date.now();
    const updateBreathFromTimestamp = () => {
      const elapsedSec = Math.max(0, Math.floor((Date.now() - cycleAnchorMs) / 1000));
      setBreathTick(elapsedSec % 19);
    };
    updateBreathFromTimestamp();
    const id = window.setInterval(updateBreathFromTimestamp, 250);
    return () => window.clearInterval(id);
  }, [timer.mode, timer.stressProtocol]);

  const formatMMSS = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Determine 4-7-8 phase from breathTick (0..18)
  let breathPhaseLabel = 'Inhale (4s)';
  let breathPhaseSecLeft = 4 - breathTick;
  let breathProgressPct = ((breathTick + 1) / 4) * 100;
  if (breathTick >= 4 && breathTick < 11) {
    breathPhaseLabel = 'Hold (7s)';
    breathPhaseSecLeft = 11 - breathTick;
    breathProgressPct = ((breathTick - 4 + 1) / 7) * 100;
  } else if (breathTick >= 11) {
    breathPhaseLabel = 'Exhale (8s)';
    breathPhaseSecLeft = 19 - breathTick;
    breathProgressPct = ((breathTick - 11 + 1) / 8) * 100;
  }

  return (
    <div className="space-y-6">
      {/* Queued 5m Flashcard Block Banner (Triggered after Stress / Fatigue Reset completes) */}
      {timer.queuedRecoveryFlashcard5m && (
        <div
          id="queued-5m-flashcard-banner"
          className="p-4 sm:p-5 rounded-2xl bg-emerald-950/70 border border-emerald-500/80 text-emerald-100 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono text-xs font-bold uppercase">
                Post-Reset Queue Active
              </span>
              <h2 className="text-sm sm:text-base font-bold">
                5m Flashcard Recovery Block Queued
              </h2>
            </div>
            <p className="text-xs text-emerald-200/90">
              Physical reset finished. Heavy reading/writing remains suspended while completing this 5-minute Flashcard ramp.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-emerald-600/60 font-mono text-lg font-bold text-emerald-300">
              {formatMMSS(timer.recoveryFlashcardSecondsLeft)}
            </div>
            <button
              id="btn-toggle-recovery-flashcard-5m"
              type="button"
              onClick={onToggleRecoveryFlashcardTimer}
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {timer.recoveryFlashcardRunning ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  <span>Pause 5m Cards</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  <span>Start 5m Cards</span>
                </>
              )}
            </button>
            <button
              id="btn-complete-recovery-flashcard-5m"
              type="button"
              onClick={onCompleteRecoveryFlashcard5m}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-emerald-700 text-emerald-200 font-mono text-xs cursor-pointer"
            >
              Complete 5m Block
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left = Two-Stage 20m Timer Console, Right = Break Triage & Stress Reset */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Primary Two-Stage Timer & Active Mode Console */}
        <section
          aria-labelledby="active-timer-console-heading"
          className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-5"
        >
          <div className="space-y-4">
            {/* Mode Switch Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex flex-wrap gap-1.5 rounded-xl bg-slate-950 p-1 border border-slate-800">
                {(
                  [
                    { id: 'WORK_20M', label: '20m Work Block' },
                    { id: 'BREAK_L1', label: 'L1 Break (3–5m)' },
                    { id: 'BREAK_L2', label: 'L2 Buffer (10–15m)' },
                    { id: 'BREAK_L3', label: 'L3 Mid-Day (60–120m)' },
                    { id: 'STRESS_RESET', label: 'Stress Reset (15–20m)' },
                  ] as { id: TimerRunMode; label: string }[]
                ).map((m) => (
                  <button
                    key={m.id}
                    id={`btn-timer-mode-${m.id.toLowerCase()}`}
                    type="button"
                    onClick={() => onSwitchTimerMode(m.id)}
                    className={`px-2.5 py-1 rounded-lg font-mono text-xs transition cursor-pointer ${
                      timer.mode === m.id
                        ? m.id === 'STRESS_RESET'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'bg-sky-500 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <span className="font-mono text-xs text-slate-400">
                Chained Blocks:{' '}
                <strong className="text-sky-300">
                  [{timer.chainedBlocksCount} / 2] ({timer.chainedBlocksCount * 20}m)
                </strong>
              </span>
            </div>

            {/* Two-Stage Indicator Bar when in WORK_20M mode */}
            {timer.mode === 'WORK_20M' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div
                  id="stage-indicator-ignition-5m"
                  className={`p-3 rounded-xl border transition ${
                    timer.workStage === 'IGNITION_5M'
                      ? 'bg-sky-950/70 border-sky-500 text-sky-100'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold">STAGE 1: IGNITION_5M</span>
                    <span>05:00</span>
                  </div>
                  <div className="text-[11px] mt-1">
                    5-Minute Startup Step (Auto-rolls into Momentum)
                  </div>
                </div>

                <div
                  id="stage-indicator-momentum-15m"
                  className={`p-3 rounded-xl border transition ${
                    timer.workStage === 'MOMENTUM_15M'
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-100'
                      : 'bg-slate-950/50 border-slate-800 text-slate-400'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold">STAGE 2: MOMENTUM_15M</span>
                    <span>15:00</span>
                  </div>
                  <div className="text-[11px] mt-1">
                    15-Minute Momentum Execution (Completes 20m Block)
                  </div>
                </div>
              </div>
            )}

            {/* Central Digital Clock Display */}
            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="px-2.5 py-0.5 rounded-md bg-slate-900 border border-slate-700 font-mono text-xs text-sky-300 uppercase">
                  {timer.mode === 'WORK_20M'
                    ? timer.workStage === 'IGNITION_5M'
                      ? '5m Startup Step (IGNITION_5M)'
                      : '15m Momentum (MOMENTUM_15M)'
                    : timer.mode === 'BREAK_L1'
                    ? `Level 1 Same-Task Micro-Reset (${timer.l1DurationMinutes}m)`
                    : timer.mode === 'BREAK_L2'
                    ? `Level 2 Task-Switch Buffer (${timer.l2DurationMinutes}m)`
                    : timer.mode === 'BREAK_L3'
                    ? `Level 3 Mid-Day Reset (${timer.l3DurationMinutes}m)`
                    : `Stress / Fatigue Reset (${timer.stressDurationMinutes}m)`}
                </span>
              </div>

              <div
                id="main-timer-digits"
                className="text-5xl sm:text-6xl font-mono font-bold tracking-tight text-slate-100 py-1"
              >
                {formatMMSS(timer.secondsLeft)}
              </div>

              {timer.mode === 'WORK_20M' && (
                <div className="max-w-lg mx-auto space-y-1">
                  <div className="text-xs sm:text-sm font-bold text-slate-200">
                    Active Task: {timer.activeTaskTitle}
                  </div>
                  <div className="text-xs text-slate-400 bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2">
                    <strong className="text-sky-300 font-mono">5m Startup Step:</strong>{' '}
                    {timer.activeStartupPrompt}
                  </div>
                </div>
              )}

              {/* 4-7-8 Breathing Visual Pacer when in STRESS_RESET mode */}
              {timer.mode === 'STRESS_RESET' &&
                timer.stressProtocol === 'BREATHING_478' && (
                  <div
                    id="breathing-478-visual-pacer"
                    className="max-w-md mx-auto p-4 rounded-xl bg-slate-900 border border-amber-600/50 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-amber-300 font-bold flex items-center gap-1.5">
                        <Wind className="w-4 h-4" />
                        <span>4-7-8 Breathing Visual Pacer</span>
                      </span>
                      <span className="text-slate-200 font-bold">
                        {breathPhaseLabel} — {breathPhaseSecLeft}s
                      </span>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-950 overflow-hidden">
                      <div
                        className="h-full bg-amber-400 transition-all duration-500"
                        style={{ width: `${breathProgressPct}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400">
                      <span>Inhale 4s</span>
                      <span>Hold 7s</span>
                      <span>Exhale 8s</span>
                    </div>
                  </div>
                )}
            </div>
          </div>

          {/* Primary Transport Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-slate-800">
            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-timer-start-pause"
                type="button"
                disabled={metrics.isZeroWorkLeft && timer.mode === 'WORK_20M'}
                onClick={onToggleTimerRun}
                className="px-4 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer"
              >
                {timer.isRunning ? (
                  <>
                    <Pause className="w-4 h-4" />
                    <span>Pause Timer</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    <span>
                      {timer.mode === 'WORK_20M'
                        ? timer.workStage === 'IGNITION_5M'
                          ? 'Start 5m Startup Step'
                          : 'Resume 15m Momentum'
                        : 'Start Break / Reset Timer'}
                    </span>
                  </>
                )}
              </button>

              <button
                id="btn-timer-fast-forward-stage"
                type="button"
                onClick={onFastForwardCurrentStage}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
                title="Advance current stage to 00:00 (Tests auto-roll from 5m Startup -> 15m Momentum -> Break Router)"
              >
                <FastForward className="w-3.5 h-3.5 text-sky-400" />
                <span>
                  {timer.mode === 'WORK_20M'
                    ? timer.workStage === 'IGNITION_5M'
                      ? 'Auto-Roll 5m → 15m'
                      : 'Complete 20m Block'
                    : timer.mode === 'STRESS_RESET'
                    ? 'Finish Reset → Queue 5m Cards'
                    : 'Complete Break'}
                </span>
              </button>
            </div>

            <button
              id="btn-timer-reset-stage"
              type="button"
              onClick={onResetCurrentStage}
              className="px-3 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </section>

        {/* Right Column: Auto-Routed Break Levels & Stress / Fatigue Reset Button */}
        <section
          aria-labelledby="break-triage-heading"
          className="lg:col-span-5 space-y-4"
        >
          {/* Break Router Card */}
          <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3.5">
            <div>
              <h2
                id="break-triage-heading"
                className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono"
              >
                Break &amp; Triage Routing
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Max 2 chained 20m blocks [40m] before a mandatory 10–15m Level 2 break.
              </p>
            </div>

            {/* Level 1: Same-Task Micro-Reset (3-5m) */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-sky-300">
                  Level 1: Same-Task Micro-Reset (3–5m)
                </span>
                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                  {([3, 5] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onSelectL1Minutes(m)}
                      className={`px-2 py-0.5 rounded font-mono text-xs cursor-pointer ${
                        timer.l1DurationMinutes === m && timer.mode === 'BREAK_L1'
                          ? 'bg-sky-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Permitted after 1st 20m block when staying on the same task. Locked once 2 blocks [40m] are chained.
              </p>
            </div>

            {/* Level 2: Task-Switch Buffer (10-15m) */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-emerald-300">
                  Level 2: Task-Switch Buffer (10–15m)
                </span>
                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                  {([10, 15] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onSelectL2Minutes(m)}
                      className={`px-2 py-0.5 rounded font-mono text-xs cursor-pointer ${
                        timer.l2DurationMinutes === m && timer.mode === 'BREAK_L2'
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-1.5">
                {(
                  [
                    {
                      id: 'ESPRESSO',
                      label: 'Espresso Protocol (Step away from desk)',
                      icon: Coffee,
                    },
                    {
                      id: 'BASS_GUITAR_5M',
                      label: '5m Cold Song on Bass / Guitar',
                      icon: Music,
                    },
                    {
                      id: 'TENS_NORMATEC_15M',
                      label: '15m TENS / Normatec Compression',
                      icon: Activity,
                    },
                  ] as {
                    id: Level2BreakProtocol;
                    label: string;
                    icon: React.FC<{ className?: string }>;
                  }[]
                ).map((p) => {
                  const Icon = p.icon;
                  const active = timer.l2Protocol === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => onSelectL2Protocol(p.id)}
                      className={`px-2.5 py-1.5 rounded-lg border text-left text-xs flex items-center gap-2 transition cursor-pointer ${
                        active
                          ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-200 font-semibold'
                          : 'bg-slate-900/70 hover:bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Level 3: Mid-Day Reset (60-120m) */}
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-amber-300">
                  Level 3: Mid-Day Reset (60–120m)
                </span>
                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                  {([60, 90, 120] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => onSelectL3Minutes(m)}
                      className={`px-2 py-0.5 rounded font-mono text-xs cursor-pointer ${
                        timer.l3DurationMinutes === m && timer.mode === 'BREAK_L3'
                          ? 'bg-amber-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-slate-400">
                Mandatory after 7 completed blocks in Surge Mode (14–15 block shift).
              </p>
            </div>
          </div>

          {/* Stress / Fatigue Reset Card (Rule 6) */}
          <div
            id="stress-fatigue-reset-card"
            className="p-4 sm:p-5 rounded-2xl bg-amber-950/30 border border-amber-700/60 space-y-3.5"
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-300 font-mono flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  <span>Stress / Fatigue Reset Button</span>
                </h3>
                <p className="text-xs text-slate-300 mt-1">
                  Suspends heavy reading/writing, runs a 15–20m physical reset timer (4-7-8 breathing visual pace, espresso, or compression boots), then queues a 5m Flashcard block.
                </p>
              </div>
            </div>

            {/* Modality Selector */}
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'BREATHING_478', label: '4-7-8 Breathing' },
                  { id: 'ESPRESSO', label: 'Espresso' },
                  { id: 'COMPRESSION_BOOTS', label: 'Compression Boots' },
                ] as { id: StressResetProtocol; label: string }[]
              ).map((sp) => (
                <button
                  key={sp.id}
                  type="button"
                  onClick={() => onTriggerStressReset(sp.id, timer.stressDurationMinutes)}
                  className={`px-2 py-1.5 rounded-lg border font-mono text-[11px] transition cursor-pointer ${
                    timer.stressProtocol === sp.id && timer.mode === 'STRESS_RESET'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold'
                      : 'bg-slate-950 hover:bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  {sp.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-trigger-stress-reset"
                type="button"
                onClick={() => onTriggerStressReset(timer.stressProtocol, 15)}
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4" />
                <span>Trigger 15–20m Stress / Fatigue Reset</span>
              </button>

              <button
                id="btn-complete-stress-queue-flashcard"
                type="button"
                onClick={onCompleteStressResetInto5mFlashcards}
                className="px-3 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-600/60 text-amber-200 font-mono text-xs cursor-pointer"
                title="Complete physical reset and immediately queue 5m Flashcard block"
              >
                Queue 5m Flashcards
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Android Lock-Screen Local Notifications & Offline PWA Panel */}
      <section
        id="android-lockscreen-notifications-panel"
        aria-labelledby="lockscreen-notifications-heading"
        className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-sky-400" />
              <h2
                id="lockscreen-notifications-heading"
                className="text-sm font-bold uppercase tracking-wider font-mono text-slate-200"
              >
                Android Lock-Screen Notifications &amp; Offline PWA Engine
              </h2>
              <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-700/60 text-sky-300 font-mono text-[10px]">
                Channel: {ANDROID_CHANNEL_ID} (IMPORTANCE_HIGH / VISIBILITY_PUBLIC)
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Fires Capacitor LocalNotifications (<code className="text-sky-300">allowWhileIdle: true</code>) and Service Worker lock-screen alerts on 5m Startup Step rollover, 20m Check-In chimes, and 60m Mandatory Break alerts.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              id="pwa-sw-status-badge"
              className="px-2.5 py-1 rounded-lg bg-emerald-950/70 border border-emerald-700/60 text-emerald-300 font-mono text-xs"
            >
              SW Offline Cache: {swOfflineReady ? 'READY' : 'ACTIVE'}
            </span>
            <button
              id="btn-request-notification-perm"
              type="button"
              onClick={onRequestNotificationPermissions}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Bell className="w-3.5 h-3.5 text-sky-400" />
              <span>
                {notificationsGranted
                  ? 'Lock-Screen Alerts: GRANTED'
                  : 'Enable Lock-Screen Alerts'}
              </span>
            </button>
          </div>
        </div>

        {/* 3 Lock-Screen Alert Triggers */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            id="btn-test-notif-5m-rollover"
            type="button"
            onClick={() =>
              onManualTriggerNotification(
                'ROLLOVER_5M_TO_15M',
                '5m Startup Step Complete → 15m Momentum',
                `Auto-rolling into 15m Momentum (MOMENTUM_15M) for "${timer.activeTaskTitle}".`
              )
            }
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-sky-700/50 text-left transition cursor-pointer"
          >
            <div className="font-mono text-xs font-bold text-sky-300">
              1. 5m Startup Step Rollover
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Fires at 00:00 of IGNITION_5M when auto-rolling into MOMENTUM_15M
            </div>
          </button>

          <button
            id="btn-test-notif-20m-checkin"
            type="button"
            onClick={() =>
              onManualTriggerNotification(
                'CHECKIN_20M_CHIME',
                '20m Check-In Chime',
                'Keep going, switch, or rest? (Immediate Sticky swap unlocked).'
              )
            }
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-emerald-700/50 text-left transition cursor-pointer"
          >
            <div className="font-mono text-xs font-bold text-emerald-300">
              2. 20m Check-In Chime
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Fires at 20m &amp; 40m milestones in Recharge &amp; Flow Extension
            </div>
          </button>

          <button
            id="btn-test-notif-60m-break"
            type="button"
            onClick={() =>
              onManualTriggerNotification(
                'MANDATORY_60M_BREAK',
                '60m Mandatory Physical Break Alert',
                '60 minutes elapsed. Step away from monitor for mandatory 5–10m physical break.'
              )
            }
            className="p-3 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-amber-700/50 text-left transition cursor-pointer"
          >
            <div className="font-mono text-xs font-bold text-amber-300">
              3. 60m Mandatory Break Alert
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Fires at 60m continuous Flow Extension / Evening Recharge limit
            </div>
          </button>
        </div>

        {/* Dispatched Lock-Screen Notification Feed */}
        {notificationLog.length > 0 && (
          <div
            id="lockscreen-notification-log-list"
            className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
          >
            <div className="text-[11px] font-mono uppercase text-slate-400">
              Recent Dispatched Lock-Screen Alerts ({notificationLog.length})
            </div>
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {notificationLog.slice(0, 5).map((entry) => (
                <div
                  key={entry.id}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-sky-300 mr-2">
                      [{entry.eventType}]
                    </span>
                    <strong className="text-slate-100">{entry.title}:</strong>{' '}
                    <span className="text-slate-300">{entry.body}</span>
                  </div>
                  <span className="font-mono text-[10px] text-slate-400">
                    Channel: {entry.channelId}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
