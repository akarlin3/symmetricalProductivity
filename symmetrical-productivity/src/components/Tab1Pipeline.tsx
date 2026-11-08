import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Lock,
  Play,
  Plus,
  ShieldAlert,
  Sliders,
  Unlock,
} from 'lucide-react';
import {
  BaselineBlock,
  FixedEventType,
  LoadMode,
  ProjectPresetType,
  SymmetryState,
  TrackId,
} from '../types/symmetry';
import { computeShiftMetrics } from '../state/defaultState';

interface Tab1PipelineProps {
  state: SymmetryState;
  onSelectLoadMode: (mode: LoadMode, targetBlocks: number, cruisePlus?: boolean) => void;
  onSetSurgeConsecutiveDays: (days: number) => void;
  onSetFixedEvent: (event: FixedEventType) => void;
  onSetSessionDisplayDuration: (mins: 20 | 40) => void;
  onToggleBaselineBlock: (blockId: string) => void;
  onToggleEarlyClearance: () => void;
  onUpdateFlashcardCount: (count: number) => void;
  onLaunchBlockInTimer: (
    sourceId: string,
    title: string,
    taskType: 'FLASHCARDS' | 'READING' | 'SYNTHESIS' | 'PROJECT',
    startupPrompt: string
  ) => void;
  onIncrementProjectBlock: (projectId: string) => void;
  onCompleteProjectItem1: () => void;
  onAddProjectToQueue: (
    title: string,
    presetType: ProjectPresetType,
    totalBlocks: number,
    trackId: TrackId,
    startupStep: string
  ) => void;
  onOpenPipelineDrawer: () => void;
  onTriggerMidDayReset: () => void;
}

export const Tab1Pipeline: React.FC<Tab1PipelineProps> = ({
  state,
  onSelectLoadMode,
  onSetSurgeConsecutiveDays,
  onSetFixedEvent,
  onSetSessionDisplayDuration,
  onToggleBaselineBlock,
  onToggleEarlyClearance,
  onUpdateFlashcardCount,
  onLaunchBlockInTimer,
  onIncrementProjectBlock,
  onCompleteProjectItem1,
  onAddProjectToQueue,
  onOpenPipelineDrawer,
  onTriggerMidDayReset,
}) => {
  const metrics = computeShiftMetrics(state);
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjPreset, setNewProjPreset] = useState<ProjectPresetType>('PAPER_8');
  const [newProjCustomBlocks, setNewProjCustomBlocks] = useState(4);
  const [newProjTrack, setNewProjTrack] = useState<TrackId>('writing');
  const [newProjStartup] = useState(
    'Open document, create section headings, and draft first 3 lines.'
  );

  // Rule 3: Block flashcards from being scheduled/executed as the final block of the night
  const isFinalBlockOfNight = metrics.remainingBlocks === 1;

  // Rule 5: Surge Mode mandatory 60-120m Mid-Day Reset after 7 blocks
  const isSurgeMidDayResetRequired =
    state.loadMode === 'SURGE' &&
    metrics.totalCompletedBlocks >= 7 &&
    !state.midDayResetCompletedToday;

  const isFlashcardBlock = (b: BaselineBlock) =>
    b.category === 'FLASHCARDS_ANATOMY' || b.category === 'FLASHCARDS_COMP';

  const handleAddProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjTitle.trim() || state.projectQueue.length >= 3) return;
    const blocks =
      newProjPreset === 'PAPER_8'
        ? 8
        : newProjPreset === 'SLIDES_4'
        ? 4
        : newProjCustomBlocks;
    onAddProjectToQueue(
      newProjTitle.trim(),
      newProjPreset,
      blocks,
      newProjTrack,
      newProjStartup.trim() || 'Open file and complete initial 5m startup step.'
    );
    setNewProjTitle('');
  };

  return (
    <div className="space-y-6">
      {/* End-of-Shift Lock Banner when 0m work left */}
      {metrics.isZeroWorkLeft && (
        <div
          id="end-of-shift-lock-banner"
          className="p-4 rounded-2xl bg-amber-950/60 border border-amber-600/70 text-amber-100 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide font-mono text-amber-300">
                End-of-Shift Lock Active ([0m work left])
              </h2>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Daily work quota reached. On-duty checklist is locked and Evening Recharge Menu is unlocked in Tab 3.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Surge Mode 7-Block Mandatory Mid-Day Reset Alert */}
      {isSurgeMidDayResetRequired && (
        <div
          id="surge-midday-reset-banner"
          className="p-4 rounded-2xl bg-amber-950/80 border border-amber-500 text-amber-100 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold">
                Circuit Breaker: Mandatory 60–120m Mid-Day Reset Required (7 Blocks Reached)
              </div>
              <p className="text-xs text-amber-200/90 mt-0.5">
                Surge Mode enforces a 60–120m Mid-Day Reset after 7 completed blocks before continuing block #8.
              </p>
            </div>
          </div>
          <button
            id="btn-start-midday-reset"
            type="button"
            onClick={onTriggerMidDayReset}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs cursor-pointer shrink-0"
          >
            Launch 60–120m Mid-Day Reset
          </button>
        </div>
      )}

      {/* Section 1: Duration-Only Status & Load Mode Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Load Mode & Circuit Breaker Card */}
        <section
          aria-labelledby="load-mode-heading"
          className="lg:col-span-7 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="load-mode-heading"
                className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono"
              >
                Load Modes &amp; Circuit Breakers
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Select daily block capacity. Surge Mode caps at 2 consecutive days.
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenPipelineDrawer}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>7-Day Pipeline Drawer</span>
            </button>
          </div>

          {/* 3 Load Mode Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {/* Cruise Mode */}
            <div
              className={`p-3.5 rounded-xl border transition ${
                state.loadMode === 'CRUISE'
                  ? 'bg-sky-950/50 border-sky-500/80 text-slate-100'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase text-sky-300">
                  Cruise Mode
                </span>
                <span className="font-mono text-xs text-slate-400">11–13 blks</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Standard sustainable shift (11–12 blocks, or 13 for Cruise+).
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[11, 12, 13].map((blk) => {
                  const isCruisePlus = blk === 13;
                  const active =
                    state.loadMode === 'CRUISE' &&
                    state.customModeBlockAdjustment === blk;
                  return (
                    <button
                      key={blk}
                      id={`btn-mode-cruise-${blk}`}
                      type="button"
                      onClick={() => onSelectLoadMode('CRUISE', blk, isCruisePlus)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs transition cursor-pointer ${
                        active
                          ? 'bg-sky-500 text-slate-950 font-bold'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {isCruisePlus ? '13 (Cruise+)' : `${blk} blks`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Surge Mode */}
            <div
              className={`p-3.5 rounded-xl border transition ${
                state.loadMode === 'SURGE'
                  ? 'bg-amber-950/40 border-amber-500/80 text-slate-100'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase text-amber-300">
                  Surge Mode
                </span>
                <span className="font-mono text-xs text-slate-400">14–15 blks</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Max 2 consecutive days. Enforces 60–120m Mid-Day Reset at 7 blks.
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[14, 15].map((blk) => {
                  const active =
                    state.loadMode === 'SURGE' &&
                    state.customModeBlockAdjustment === blk;
                  const lockedByCap = state.surgeConsecutiveDays >= 2 && state.loadMode !== 'SURGE';
                  return (
                    <button
                      key={blk}
                      id={`btn-mode-surge-${blk}`}
                      type="button"
                      disabled={lockedByCap}
                      onClick={() => onSelectLoadMode('SURGE', blk, false)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs transition ${
                        lockedByCap
                          ? 'bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed'
                          : active
                          ? 'bg-amber-500 text-slate-950 font-bold cursor-pointer'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer'
                      }`}
                    >
                      {blk} blks
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Taper / Lab Mode */}
            <div
              className={`p-3.5 rounded-xl border transition ${
                state.loadMode === 'TAPER'
                  ? 'bg-emerald-950/40 border-emerald-500/80 text-slate-100'
                  : 'bg-slate-950/70 border-slate-800 text-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold uppercase text-emerald-300">
                  Taper / Lab
                </span>
                <span className="font-mono text-xs text-slate-400">7–9 blks</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                7–9 desk blocks + Fixed Event (~2h Lab shift logged).
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {[7, 8, 9].map((blk) => {
                  const active =
                    state.loadMode === 'TAPER' &&
                    state.customModeBlockAdjustment === blk;
                  return (
                    <button
                      key={blk}
                      id={`btn-mode-taper-${blk}`}
                      type="button"
                      onClick={() => onSelectLoadMode('TAPER', blk, false)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-xs transition cursor-pointer ${
                        active
                          ? 'bg-emerald-500 text-slate-950 font-bold'
                          : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {blk} blks
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Surge Consecutive Day Tracker & Mid-Day Reset Status */}
          <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-mono">
                Consecutive Surge Days:
              </span>
              <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                {[0, 1, 2].map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onSetSurgeConsecutiveDays(d)}
                    className={`px-2 py-0.5 rounded font-mono text-xs cursor-pointer ${
                      state.surgeConsecutiveDays === d
                        ? 'bg-amber-600 text-slate-950 font-bold'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {d}/2
                  </button>
                ))}
              </div>
              {state.surgeConsecutiveDays >= 2 && (
                <span className="text-[11px] font-mono text-amber-400">
                  (2-Day Cap Reached)
                </span>
              )}
            </div>

            <div className="font-mono text-slate-400">
              Mid-Day Reset (at 7 blks):{' '}
              <span
                className={
                  state.midDayResetCompletedToday
                    ? 'text-emerald-400 font-bold'
                    : state.loadMode === 'SURGE'
                    ? 'text-amber-300 font-bold'
                    : 'text-slate-500'
                }
              >
                {state.midDayResetCompletedToday
                  ? 'Completed'
                  : state.loadMode === 'SURGE'
                  ? `Pending (${metrics.totalCompletedBlocks}/7 blks)`
                  : 'N/A (Cruise/Taper)'}
              </span>
            </div>
          </div>
        </section>

        {/* Duration-Only Configuration & Fixed Event Card */}
        <section
          aria-labelledby="duration-config-heading"
          className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2
                id="duration-config-heading"
                className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono"
              >
                Duration-Only Pipeline Readout
              </h2>
              <span className="text-xs font-mono text-sky-400">
                {metrics.totalCompletedBlocks} / {metrics.totalTargetBlocks} blocks done
              </span>
            </div>

            {/* Prominent Duration Display Box */}
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono uppercase text-slate-400">
                  Active Focus Pipeline Counter
                </div>
                <div
                  id="pipeline-main-duration-readout"
                  className="text-lg sm:text-xl font-mono font-bold text-sky-300 mt-0.5"
                >
                  {metrics.durationPrefix}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-mono uppercase text-slate-400">
                  Block Pairing
                </span>
                <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-800">
                  {([20, 40] as const).map((mins) => (
                    <button
                      key={mins}
                      id={`btn-pair-${mins}m`}
                      type="button"
                      onClick={() => onSetSessionDisplayDuration(mins)}
                      className={`px-2 py-0.5 rounded font-mono text-xs cursor-pointer ${
                        state.timer.sessionDisplayDurationMinutes === mins
                          ? 'bg-sky-500 text-slate-950 font-bold'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fixed Event Selector (Rule 1: Wall-clock hidden unless Fixed Event logged) */}
            <div className="space-y-1.5">
              <label
                htmlFor="select-fixed-event"
                className="block text-xs font-medium text-slate-300"
              >
                Fixed Event Exception (Wall-Clock Anchor)
              </label>
              <select
                id="select-fixed-event"
                value={state.fixedEvent}
                onChange={(e) => onSetFixedEvent(e.target.value as FixedEventType)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-200"
              >
                <option value="NONE">
                  None — Strict Duration-Only Display (Zero Wall-Clock Timestamps)
                </option>
                <option value="LAB_2H">
                  Fixed Event: Lab Shift (~2h) [09:00 AM – 11:00 AM]
                </option>
                <option value="VOLUNTEER">
                  Fixed Event: Volunteer Shift [01:00 PM – 03:00 PM]
                </option>
                <option value="EVENING_OUTING_6PM">
                  Fixed Event: 6:00 PM Evening Outing
                </option>
              </select>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-800/80 pt-2.5 flex items-center justify-between">
            <span>Remaining Desk Blocks: {metrics.remainingBlocks}</span>
            <span className="font-mono text-slate-300">
              1 Block = 5m Startup + 15m Momentum
            </span>
          </div>
        </section>
      </div>

      {/* Section 2: 7-Block Daily Core Baseline Tracker (Rule 3) */}
      <section
        aria-labelledby="core-baseline-heading"
        className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="core-baseline-heading"
                className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono"
              >
                Daily Core Baseline (7 Blocks)
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-slate-800 text-sky-300 font-mono text-xs">
                {metrics.completedBaselineCount} / 7 Complete
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              4 Flashcard Blocks (1 Anatomy + 3 Comp, 250-card cap) + 3 Half-Chapter Blocks (2 Reading/Equations + 1 Synthesis)
            </p>
          </div>

          {/* Flashcard 250-Card Cap & Early Clearance Toggle */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono">
              <span className="text-slate-400">Cards:</span>
              <input
                id="input-flashcard-cap"
                type="number"
                min={0}
                max={250}
                value={state.flashcardsReviewedCount}
                onChange={(e) =>
                  onUpdateFlashcardCount(
                    Math.min(250, Math.max(0, Number(e.target.value) || 0))
                  )
                }
                className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-center text-sky-300 font-bold"
              />
              <span className="text-slate-400">/ {state.flashcardsDailyCap} cap</span>
            </div>

            <button
              id="btn-early-clearance-toggle"
              type="button"
              disabled={metrics.isZeroWorkLeft}
              onClick={onToggleEarlyClearance}
              className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                state.earlyClearanceEnabled
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : 'bg-slate-950 hover:bg-slate-800 border-slate-700 text-slate-300'
              }`}
              title="Bank unused flashcard blocks as free time when review deck is cleared early"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                Early Clearance:{' '}
                {state.earlyClearanceEnabled ? 'ON (Unused Banked)' : 'OFF'}
              </span>
            </button>
          </div>
        </div>

        {/* Late-Night Flashcard Blocker Notice when 1 block remains */}
        {isFinalBlockOfNight && (
          <div
            id="late-night-flashcard-blocker-alert"
            className="p-3 rounded-xl bg-amber-950/60 border border-amber-700/70 text-amber-200 text-xs flex items-center gap-2.5"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Final Block Flashcard Blocker Active (20m work left):</strong>{' '}
              Flashcards cannot be scheduled or run as the final block of the night. Complete Synthesis, Reading, or Active Project Item #1 instead.
            </span>
          </div>
        )}

        {/* 7 Baseline Blocks Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {state.baselineBlocks.map((block) => {
            const isFlashcard = isFlashcardBlock(block);
            const blockedAsFinalBlock =
              isFlashcard &&
              isFinalBlockOfNight &&
              !block.completed &&
              !block.bankedViaEarlyClearance;

            return (
              <div
                key={block.id}
                className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 ${
                  block.completed
                    ? 'bg-slate-950/50 border-emerald-800/50 text-slate-300'
                    : block.bankedViaEarlyClearance
                    ? 'bg-emerald-950/20 border-emerald-700/50 text-emerald-200'
                    : blockedAsFinalBlock
                    ? 'bg-slate-950/40 border-amber-800/60 text-slate-500'
                    : 'bg-slate-950/90 border-slate-800 text-slate-100'
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <button
                    id={`btn-toggle-baseline-${block.id}`}
                    type="button"
                    disabled={metrics.isZeroWorkLeft || blockedAsFinalBlock}
                    onClick={() => onToggleBaselineBlock(block.id)}
                    className="mt-0.5 text-slate-400 hover:text-emerald-400 disabled:opacity-40 cursor-pointer shrink-0"
                    title={
                      blockedAsFinalBlock
                        ? 'Blocked: Flashcards cannot be the final block of the night'
                        : 'Toggle block completion'
                    }
                  >
                    {block.completed || block.bankedViaEarlyClearance ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`text-xs sm:text-sm font-semibold ${
                          block.completed ? 'line-through text-slate-400' : ''
                        }`}
                      >
                        {block.title}
                      </span>
                      {block.bankedViaEarlyClearance && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-900/60 border border-emerald-600/50 text-emerald-200 font-mono text-[10px]">
                          BANKED FREE TIME
                        </span>
                      )}
                      {blockedAsFinalBlock && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-950 border border-amber-700 text-amber-300 font-mono text-[10px]">
                          BLOCKED AS FINAL BLOCK
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      <strong className="text-slate-300 font-mono">5m Startup Step:</strong>{' '}
                      {block.startupStep}
                    </p>
                  </div>
                </div>

                {!block.completed && !block.bankedViaEarlyClearance && (
                  <button
                    id={`btn-launch-baseline-${block.id}`}
                    type="button"
                    disabled={metrics.isZeroWorkLeft || blockedAsFinalBlock}
                    onClick={() =>
                      onLaunchBlockInTimer(
                        block.id,
                        block.title,
                        isFlashcard
                          ? 'FLASHCARDS'
                          : block.category === 'SYNTHESIS'
                          ? 'SYNTHESIS'
                          : 'READING',
                        block.startupStep
                      )
                    }
                    className="px-2.5 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 font-mono text-xs flex items-center gap-1 shrink-0 disabled:opacity-40 cursor-pointer"
                  >
                    <Play className="w-3 h-3" />
                    <span>20m</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 3: Active Project Lock (Closed List — Max 3 Items, Item #1 Locked) */}
      <section
        aria-labelledby="active-project-lock-heading"
        className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="active-project-lock-heading"
                className="text-sm font-bold uppercase tracking-wider text-slate-200 font-mono"
              >
                Active Project Lock (Closed List — Max 3 Items)
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-sky-950 border border-sky-700/60 text-sky-300 font-mono text-xs">
                100% Locked to Item #1
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              All discretionary project blocks route exclusively to Item #1 until marked complete (2-page paper = 8 blocks; slide deck = 4 blocks).
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Active Slots: {state.projectQueue.length} / 3
          </span>
        </div>

        {/* 3 Active Queue Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {state.projectQueue.map((item) => {
            const isPrimaryUnlocked = item.slot === 1;
            const progressPct = Math.min(
              100,
              Math.round((item.completedBlocks / item.totalBlocks) * 100)
            );

            return (
              <div
                key={item.id}
                id={`project-slot-${item.slot}`}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition ${
                  isPrimaryUnlocked
                    ? 'bg-slate-950 border-sky-500/80 shadow-sm'
                    : 'bg-slate-950/40 border-slate-800/80 opacity-75'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`px-2 py-0.5 rounded font-mono text-[11px] font-bold flex items-center gap-1 ${
                        isPrimaryUnlocked
                          ? 'bg-sky-500/20 border border-sky-500/50 text-sky-300'
                          : 'bg-slate-900 border border-slate-700 text-slate-400'
                      }`}
                    >
                      {isPrimaryUnlocked ? (
                        <>
                          <Unlock className="w-3 h-3" />
                          <span>ITEM #1 (ACTIVE TARGET)</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3 h-3" />
                          <span>ITEM #{item.slot} (LOCKED)</span>
                        </>
                      )}
                    </span>

                    <span className="font-mono text-xs text-slate-300 font-bold">
                      {item.completedBlocks} / {item.totalBlocks} blks
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-100">{item.title}</h3>

                  {/* Progress Bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        isPrimaryUnlocked ? 'bg-sky-500' : 'bg-slate-600'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>

                  <p className="text-[11px] text-slate-400">
                    <strong className="text-slate-300 font-mono">5m Startup Step:</strong>{' '}
                    {item.startupStep}
                  </p>
                </div>

                {/* Actions — Enabled ONLY for Item #1 */}
                {isPrimaryUnlocked ? (
                  <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                    <button
                      id="btn-launch-project-item1"
                      type="button"
                      disabled={metrics.isZeroWorkLeft}
                      onClick={() =>
                        onLaunchBlockInTimer(
                          item.id,
                          item.title,
                          'PROJECT',
                          item.startupStep
                        )
                      }
                      className="flex-1 px-2.5 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 disabled:opacity-40 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Start 20m Block</span>
                    </button>

                    <button
                      id="btn-log-project-block-item1"
                      type="button"
                      disabled={metrics.isZeroWorkLeft}
                      onClick={() => onIncrementProjectBlock(item.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-mono text-xs cursor-pointer"
                      title="Log +1 completed 20m block on Item #1"
                    >
                      +1 Blk
                    </button>

                    <button
                      id="btn-complete-project-item1"
                      type="button"
                      onClick={onCompleteProjectItem1}
                      className="w-full mt-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-200 font-mono text-xs flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Item #1 Complete &amp; Unlock #2</span>
                    </button>
                  </div>
                ) : (
                  <div className="pt-2 border-t border-slate-800/60 text-[11px] font-mono text-slate-500 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>100% of project blocks locked to Item #1</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Add Project Form when Active Queue < 3 */}
        {state.projectQueue.length < 3 && (
          <form
            onSubmit={handleAddProjectSubmit}
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end"
          >
            <div className="sm:col-span-4">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Project Title (Slot #{state.projectQueue.length + 1})
              </label>
              <input
                type="text"
                required
                placeholder="e.g., Hemodynamics Synthesis Deck"
                value={newProjTitle}
                onChange={(e) => setNewProjTitle(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
              />
            </div>
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Block Quota Preset
              </label>
              <select
                value={newProjPreset}
                onChange={(e) => setNewProjPreset(e.target.value as ProjectPresetType)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono"
              >
                <option value="PAPER_8">2-Page Paper (8 Blocks)</option>
                <option value="SLIDES_4">Slide Deck (4 Blocks)</option>
                <option value="CUSTOM">Custom Block Count</option>
              </select>
            </div>
            {newProjPreset === 'CUSTOM' && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-mono text-slate-400 mb-1">
                  Blocks
                </label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={newProjCustomBlocks}
                  onChange={(e) => setNewProjCustomBlocks(Number(e.target.value) || 4)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono"
                />
              </div>
            )}
            <div className="sm:col-span-3">
              <label className="block text-[11px] font-mono text-slate-400 mb-1">
                Roadmap Track
              </label>
              <select
                value={newProjTrack}
                onChange={(e) => setNewProjTrack(e.target.value as TrackId)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-mono"
              >
                <option value="science">Science / Clinical</option>
                <option value="writing">Writing / Literature</option>
                <option value="personal">Personal / Home</option>
                <option value="coding">Coding / Hardware</option>
                <option value="music">Music</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Slot</span>
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};
