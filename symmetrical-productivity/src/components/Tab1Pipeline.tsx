import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coffee,
  FastForward,
  Flame,
  ListOrdered,
  Lock,
  Music,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sparkles,
  Unlock,
  Wind,
  Zap,
} from 'lucide-react';
import {
  BaselineBlock,
  FixedEventType,
  Level2BreakProtocol,
  LoadMode,
  ProjectPresetType,
  SequentialChecklistStep,
  SmartIntakePlanResult,
  StressResetProtocol,
  SymmetryState,
  TimerRunMode,
  TrackId,
} from '../types/symmetry';
import {
  computeShiftMetrics,
  generateSequentialChecklist,
} from '../state/defaultState';
import { DualRingTimerSvg } from './DualRingTimerSvg';
import { BreathingVisualizer478 } from './BreathingVisualizer478';
import { SmartIntakeBar } from './SmartIntakeBar';
import { triggerHaptic } from '../utils/haptics';

interface PendingIntakeDeliverable {
  title: string;
  presetType: ProjectPresetType;
  totalBlocks: number;
  trackId: TrackId;
  startupStep: string;
  reason: string;
}

interface Tab1PipelineProps {
  state: SymmetryState;
  smartIntakeText: string;
  onChangeSmartIntakeText: (val: string) => void;
  smartIntakePreview: SmartIntakePlanResult | null;
  onSetSmartIntakePreview: (plan: SmartIntakePlanResult | null) => void;
  onApplySmartIntakePlan: (plan: SmartIntakePlanResult) => void;
  onOpenStateModal: () => void;
  apiKeyVersion: number;
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
  onLaunchBreakStepInTimer: (breakMode: 'BREAK_L1' | 'BREAK_L2' | 'BREAK_L3') => void;
  onIncrementProjectBlock: (projectId: string) => void;
  onCompleteProjectItem1: () => void;
  onAddProjectToQueue: (
    title: string,
    presetType: ProjectPresetType,
    totalBlocks: number,
    trackId: TrackId,
    startupStep: string
  ) => void;
  onPromoteDeliverableWithSurge: (
    title: string,
    presetType: ProjectPresetType,
    totalBlocks: number,
    trackId: TrackId,
    startupStep: string
  ) => void;
  onDemoteDeliverableToBacklog: (
    title: string,
    presetType: ProjectPresetType,
    totalBlocks: number,
    trackId: TrackId,
    startupStep: string
  ) => void;
  onRecalibrateStepDownTier: () => void;
  onRecalibrateReSequenceNow: () => void;
  onOpenPipelineDrawer: () => void;
  onTriggerMidDayReset: () => void;
  // Timer HUD & Quick Triage Dock handlers
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
  onGoToRecharge: () => void;
}

export const Tab1Pipeline: React.FC<Tab1PipelineProps> = ({
  state,
  smartIntakeText,
  onChangeSmartIntakeText,
  smartIntakePreview,
  onSetSmartIntakePreview,
  onApplySmartIntakePlan,
  onOpenStateModal,
  apiKeyVersion,
  onSelectLoadMode,
  onSetSurgeConsecutiveDays,
  onSetFixedEvent,
  onSetSessionDisplayDuration,
  onToggleBaselineBlock,
  onToggleEarlyClearance,
  onUpdateFlashcardCount,
  onLaunchBlockInTimer,
  onLaunchBreakStepInTimer,
  onIncrementProjectBlock,
  onCompleteProjectItem1,
  onAddProjectToQueue,
  onPromoteDeliverableWithSurge,
  onDemoteDeliverableToBacklog,
  onRecalibrateStepDownTier,
  onRecalibrateReSequenceNow,
  onOpenPipelineDrawer,
  onTriggerMidDayReset,
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
  onGoToRecharge,
}) => {
  const metrics = computeShiftMetrics(state);
  const { timer } = state;

  const [sequentialViewOpen, setSequentialViewOpen] = useState(false);
  const [recalibrateWizardOpen, setRecalibrateWizardOpen] = useState(false);
  const [lockedDrawerOpen, setLockedDrawerOpen] = useState(false);
  const [loadConfigExpanded, setLoadConfigExpanded] = useState(false);
  const [selectedBaselineId, setSelectedBaselineId] = useState<string>(
    state.baselineBlocks.find((b) => !b.completed && !b.bankedViaEarlyClearance)?.id ||
      state.baselineBlocks[0]?.id ||
      'fc_anat_1'
  );
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjPreset, setNewProjPreset] = useState<ProjectPresetType>('PAPER_8');
  const [newProjCustomBlocks, setNewProjCustomBlocks] = useState(4);
  const [newProjTrack, setNewProjTrack] = useState<TrackId>('writing');
  const [newProjStartup, setNewProjStartup] = useState(
    'Open document, create section headings, and draft first 3 lines.'
  );
  const [pendingIntakeTriage, setPendingIntakeTriage] =
    useState<PendingIntakeDeliverable | null>(null);

  const sequentialSteps = generateSequentialChecklist(state);

  // Rule 3: Block flashcards from being scheduled/executed as the final block of the night
  const isFinalBlockOfNight = metrics.remainingBlocks === 1;

  // Rule 5: Surge Mode mandatory 60-120m Mid-Day Reset after 7 blocks
  const isSurgeMidDayResetRequired =
    state.loadMode === 'SURGE' &&
    metrics.totalCompletedBlocks >= 7 &&
    !state.midDayResetCompletedToday;

  const isFlashcardBlock = (b: BaselineBlock) =>
    b.category === 'FLASHCARDS_ANATOMY' || b.category === 'FLASHCARDS_COMP';

  const formatMMSS = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Auto-Router: compute the exact "Up Next" recommended block
  const nextEligibleBaseline = state.baselineBlocks.find((b) => {
    if (b.completed || b.bankedViaEarlyClearance) return false;
    if (isFinalBlockOfNight && isFlashcardBlock(b)) return false;
    return true;
  });
  const primaryProject = state.projectQueue[0];

  const upNextBlock = nextEligibleBaseline
    ? {
        sourceId: nextEligibleBaseline.id,
        title: nextEligibleBaseline.title,
        badge: isFlashcardBlock(nextEligibleBaseline)
          ? 'CORE FLOOR • FLASHCARDS'
          : nextEligibleBaseline.category === 'SYNTHESIS'
          ? 'CORE FLOOR • SYNTHESIS'
          : 'CORE FLOOR • HALF-CHAPTER',
        taskType: (isFlashcardBlock(nextEligibleBaseline)
          ? 'FLASHCARDS'
          : nextEligibleBaseline.category === 'SYNTHESIS'
          ? 'SYNTHESIS'
          : 'READING') as 'FLASHCARDS' | 'READING' | 'SYNTHESIS' | 'PROJECT',
        startupStep: nextEligibleBaseline.startupStep,
      }
    : {
        sourceId: primaryProject?.id || 'proj_1',
        title: primaryProject?.title || 'Anatomy & Comp Exam Prep Sprint',
        badge: 'LOCKED FOCUS #1 • DISCRETIONARY',
        taskType: 'PROJECT' as const,
        startupStep:
          primaryProject?.startupStep || 'Open deck + clear first 15 cards',
      };

  const flashcardBlocks = state.baselineBlocks.filter(isFlashcardBlock);
  const halfChapterBlocks = state.baselineBlocks.filter((b) => !isFlashcardBlock(b));
  const selectedBaseline =
    state.baselineBlocks.find((b) => b.id === selectedBaselineId) ||
    state.baselineBlocks[0];

  const lockedSecondaryProjects = state.projectQueue.slice(1);

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

  const handleAddProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = newProjTitle.trim();
    if (!cleanTitle) return;
    const blocks =
      newProjPreset === 'PAPER_8'
        ? 8
        : newProjPreset === 'SLIDES_4'
        ? 4
        : newProjCustomBlocks;
    const cleanStartup =
      newProjStartup.trim() || 'Open file and complete initial 5m startup step.';

    const exceedsClosedListCap = state.projectQueue.length >= 3;
    const forcesSurgeDay =
      state.loadMode !== 'SURGE' &&
      7 + blocks > state.customModeBlockAdjustment;

    if (exceedsClosedListCap || forcesSurgeDay) {
      triggerHaptic([15]);
      setPendingIntakeTriage({
        title: cleanTitle,
        presetType: newProjPreset,
        totalBlocks: blocks,
        trackId: newProjTrack,
        startupStep: cleanStartup,
        reason:
          exceedsClosedListCap && forcesSurgeDay
            ? `Closed List is full (${state.projectQueue.length}/3 items) and adding a ${blocks}-block deliverable exceeds today's ${state.loadMode} ceiling.`
            : exceedsClosedListCap
            ? `Closed List is at its 3-item hard cap (${state.projectQueue.length}/3 items locked).`
            : `Adding a ${blocks}-block deliverable alongside the 7-block Baseline Floor would force a Surge day.`,
      });
      return;
    }

    onAddProjectToQueue(
      cleanTitle,
      newProjPreset,
      blocks,
      newProjTrack,
      cleanStartup
    );
    setNewProjTitle('');
  };

  const handleClickSequentialStep = (step: SequentialChecklistStep) => {
    triggerHaptic([15]);
    if (step.kind === 'WORK_BLOCK') {
      onLaunchBlockInTimer(
        step.sourceId || 'proj_1',
        step.title,
        step.taskType || 'PROJECT',
        step.startupStep
      );
    } else if (
      step.kind === 'BREAK_L1' ||
      step.kind === 'BREAK_L2' ||
      step.kind === 'BREAK_L3'
    ) {
      onLaunchBreakStepInTimer(step.kind);
    } else if (step.kind === 'SHUTDOWN') {
      onGoToRecharge();
    }
  };


  return (
    <div className="space-y-4 animate-tab-enter">
      {/* Smart Intake & Week Planner Bar (Gemini 2.5 Flash + Local Offline Fallback) */}
      <SmartIntakeBar
        state={state}
        contextVariant="FOCUS_PIPELINE"
        inputText={smartIntakeText}
        onChangeInputText={onChangeSmartIntakeText}
        previewPlan={smartIntakePreview}
        onSetPreviewPlan={onSetSmartIntakePreview}
        onApplyPlan={onApplySmartIntakePlan}
        onOpenSettingsModal={onOpenStateModal}
        apiKeyVersion={apiKeyVersion}
      />

      {/* End-of-Shift Lock Banner when 0m work left */}
      {metrics.isZeroWorkLeft && (
        <div
          id="end-of-shift-lock-banner"
          className="p-4 rounded-2xl bento-hero-border-evening text-amber-100 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/50 flex items-center justify-center">
              <Lock className="w-5 h-5 text-amber-300 shrink-0" />
            </div>
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-amber-200">
                End-of-Shift Lock Engaged • [0m work left]
              </h2>
              <p className="text-xs text-amber-100/80">
                Daily work quota reached. Pipeline is locked—transition to the Evening Recharge Sanctuary or open Flow Extension.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic([20]);
              onGoToRecharge();
            }}
            className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-bold text-xs cursor-pointer shadow-lg shadow-amber-500/20"
          >
            Enter Evening Recharge Sanctuary →
          </button>
        </div>
      )}

      {/* Surge Mode Mandatory Mid-Day Reset Alert (Rule 5) */}
      {isSurgeMidDayResetRequired && !metrics.isZeroWorkLeft && (
        <div
          id="surge-midday-reset-alert"
          className="p-4 rounded-2xl backdrop-blur-xl bg-amber-500/10 border border-amber-400/50 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.12)] text-amber-100 flex flex-wrap items-center justify-between gap-3"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wide font-mono text-amber-300">
                Surge Circuit Breaker: Mandatory 60–120m Mid-Day Reset Required
              </h2>
              <p className="text-xs text-amber-100/85">
                7 blocks completed in Surge Mode. Complete a 60–120m physical reset before unlocking blocks 8–{state.customModeBlockAdjustment}.
              </p>
            </div>
          </div>
          <button
            id="btn-start-surge-midday-reset"
            type="button"
            onClick={onTriggerMidDayReset}
            className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs font-mono cursor-pointer"
          >
            Start {timer.l3DurationMinutes}m Mid-Day Reset
          </button>
        </div>
      )}

      {/* SPLIT-SCREEN 12-COLUMN BENTO HUD */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* =====================================================================
            LEFT COLUMN (5 COLS, STICKY): CENTERPIECE 280x280 DUAL-RING TIMER HUD
           ===================================================================== */}
        <aside
          aria-label="Centerpiece Dual-Ring Timer HUD"
          className="lg:col-span-5 lg:sticky lg:top-24 rounded-3xl bento-surface p-5 sm:p-6 flex flex-col justify-between space-y-5"
        >
          {/* Top HUD Status Bar */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#22d3ee]" />
              <span className="text-[11px] font-mono uppercase tracking-widest text-slate-300 font-semibold">
                TWO-STAGE 20M ENGINE
              </span>
            </div>

            <div className="flex items-center gap-1">
              {(['WORK_20M', 'BREAK_L1', 'BREAK_L2', 'STRESS_RESET'] as TimerRunMode[]).map(
                (m) => {
                  const active = timer.mode === m;
                  const shortLabel =
                    m === 'WORK_20M'
                      ? '20m'
                      : m === 'BREAK_L1'
                      ? 'L1'
                      : m === 'BREAK_L2'
                      ? 'L2'
                      : '4-7-8';
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        triggerHaptic([10]);
                        onSwitchTimerMode(m);
                      }}
                      className={`px-2 py-0.5 rounded-lg font-mono text-[10px] font-bold border cursor-pointer ${
                        active
                          ? m === 'STRESS_RESET'
                            ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
                            : 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
                          : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {shortLabel}
                    </button>
                  );
                }
              )}
            </div>
          </div>

          {/* Centerpiece 280x280 Dual-Ring SVG Timer with Radial Ambient Glow */}
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
            />
          </div>

          {/* Primary Play / Pause / Skip / Reset Controls */}
          <div className="grid grid-cols-12 gap-2">
            <button
              id="btn-hud-timer-start-pause"
              type="button"
              onClick={() => {
                triggerHaptic([15]);
                onToggleTimerRun();
              }}
              className={`col-span-7 py-3 px-4 rounded-2xl font-mono font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg transition ${
                timer.isRunning
                  ? 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-500/20'
                  : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-500/25'
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
                  <span>
                    {timer.mode === 'WORK_20M' && timer.workStage === 'IGNITION_5M'
                      ? 'Start 5m Ignition'
                      : 'Start Timer'}
                  </span>
                </>
              )}
              <kbd className="ml-1 px-1.5 py-0.5 rounded bg-slate-950/25 text-[10px] font-mono">
                Space
              </kbd>
            </button>

            <button
              id="btn-hud-timer-skip-stage"
              type="button"
              onClick={() => {
                triggerHaptic([15]);
                onFastForwardCurrentStage();
              }}
              className="col-span-3 py-3 px-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.1] text-cyan-200 font-mono font-semibold text-xs flex items-center justify-center gap-1 cursor-pointer"
              title="Skip to next stage (5m Startup → 15m Momentum → Break Router)"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Skip</span>
            </button>

            <button
              id="btn-hud-timer-reset"
              type="button"
              onClick={() => {
                triggerHaptic([10]);
                onResetCurrentStage();
              }}
              className="col-span-2 py-3 rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-slate-300 flex items-center justify-center cursor-pointer"
              title="Reset current stage timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Active 5-Minute Startup Micro-Script Card Right Below Play Button */}
          <div
            id="hud-active-startup-script"
            className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)] space-y-2"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span>ACTIVE 5M STARTUP MICRO-SCRIPT</span>
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] font-mono text-[10px] text-cyan-200 uppercase">
                {timer.activeTaskType}
              </span>
            </div>

            <div className="text-xs sm:text-sm font-semibold text-white truncate">
              {timer.activeTaskTitle}
            </div>

            <p className="text-xs font-mono text-amber-200/95 bg-amber-500/10 border border-amber-400/30 rounded-xl px-3 py-2 leading-relaxed">
              “{timer.activeStartupPrompt}”
            </p>
          </div>

          {/* Embedded 4-7-8 Breathing Visualizer when Stress Reset is active */}
          {timer.mode === 'STRESS_RESET' && (
            <div className="space-y-2.5">
              <BreathingVisualizer478
                id="hud-breathing-478"
                isActiveContext={timer.mode === 'STRESS_RESET'}
                defaultExpanded={true}
                variant="slate"
                compact={true}
              />
              <button
                type="button"
                onClick={onCompleteStressResetInto5mFlashcards}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs cursor-pointer"
              >
                Finish Reset → Queue 5m Flashcard Ramp
              </button>
            </div>
          )}

          {/* Post-Reset Queued 5m Flashcard Recovery Ramp */}
          {timer.queuedRecoveryFlashcard5m && (
            <div
              id="hud-queued-5m-flashcard"
              className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-100 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-emerald-300">
                  POST-RESET 5M FLASHCARD RAMP
                </span>
                <span className="font-mono font-bold text-sm tabular-nums text-emerald-200">
                  {formatMMSS(timer.recoveryFlashcardSecondsLeft)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onToggleRecoveryFlashcardTimer}
                  className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                >
                  {timer.recoveryFlashcardRunning ? 'Pause 5m Ramp' : 'Start 5m Ramp'}
                </button>
                <button
                  type="button"
                  onClick={onCompleteRecoveryFlashcard5m}
                  className="py-1.5 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-emerald-100 font-mono text-xs cursor-pointer"
                >
                  Complete
                </button>
              </div>
            </div>
          )}
        </aside>

        {/* =====================================================================
            RIGHT COLUMN (7 COLS): 3-ROW BENTO GRID
           ===================================================================== */}
        <div className="lg:col-span-7 space-y-4">
          {/* -------------------------------------------------------------------
              TOP BENTO ROW: "UP NEXT" AUTO-ROUTER HERO CARD + LOAD MODE PILL
             ------------------------------------------------------------------- */}
          <section
            id="bento-up-next-hero"
            aria-label="Up Next Auto-Router and Load Mode"
            className="rounded-3xl bento-hero-border p-5 space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-400/20 border border-cyan-300/50 text-cyan-200 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-cyan-300" />
                    <span>UP NEXT AUTO-ROUTER</span>
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.1] font-mono text-[10px] text-slate-300">
                    {upNextBlock.badge}
                  </span>
                  {isFinalBlockOfNight && (
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/50 font-mono text-[10px] text-amber-200">
                      Final Block Guard: Flashcards Locked
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight pt-0.5">
                  {upNextBlock.title}
                </h2>
                <p className="text-xs font-mono text-cyan-100/85">
                  5m Startup: “{upNextBlock.startupStep}”
                </p>
              </div>

              {/* One-Click Space Launch Button */}
              <button
                id="btn-up-next-launch"
                type="button"
                disabled={metrics.isZeroWorkLeft || isSurgeMidDayResetRequired}
                onClick={() => {
                  triggerHaptic([15]);
                  onLaunchBlockInTimer(
                    upNextBlock.sourceId,
                    upNextBlock.title,
                    upNextBlock.taskType,
                    upNextBlock.startupStep
                  );
                }}
                className="px-4 py-2.5 rounded-2xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/25 shrink-0"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch 5m Startup</span>
                <kbd className="px-1.5 py-0.5 rounded bg-slate-950/20 text-[10px] font-mono">
                  Space
                </kbd>
              </button>
            </div>

            {/* Compact Load Mode & Duration-Only Countdown Bar */}
            <div className="pt-3 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    {
                      mode: 'CRUISE' as LoadMode,
                      label: 'Cruise (11–12)',
                      defaultBlocks: 12,
                    },
                    {
                      mode: 'SURGE' as LoadMode,
                      label: `Surge (14–15 • ${state.surgeConsecutiveDays}/2d)`,
                      defaultBlocks: 14,
                    },
                    {
                      mode: 'TAPER' as LoadMode,
                      label: 'Taper / Lab (7–9)',
                      defaultBlocks: 8,
                    },
                  ] as const
                ).map((item) => {
                  const active = state.loadMode === item.mode;
                  const surgeLocked =
                    item.mode === 'SURGE' &&
                    state.surgeConsecutiveDays >= 2 &&
                    state.loadMode !== 'SURGE';
                  return (
                    <button
                      key={item.mode}
                      id={`mode-card-${item.mode.toLowerCase()}`}
                      type="button"
                      disabled={surgeLocked}
                      onClick={() =>
                        onSelectLoadMode(item.mode, item.defaultBlocks, false)
                      }
                      className={`px-2.5 py-1 rounded-xl font-mono text-[11px] font-semibold border transition cursor-pointer ${
                        active
                          ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-100'
                          : surgeLocked
                          ? 'bg-red-950/30 border-red-800/40 text-red-300/60 cursor-not-allowed'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] text-slate-300'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                <span className="px-2.5 py-1 rounded-xl bg-black/40 border border-cyan-500/35 font-mono text-xs font-bold tabular-nums text-cyan-200">
                  {metrics.durationPrefix}
                </span>

                <button
                  id="btn-toggle-sequential-checklist"
                  type="button"
                  onClick={() => {
                    triggerHaptic([12]);
                    setSequentialViewOpen(!sequentialViewOpen);
                  }}
                  className={`px-2.5 py-1 rounded-xl font-mono text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer transition ${
                    sequentialViewOpen
                      ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-bold shadow-md shadow-cyan-500/20'
                      : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/50 text-cyan-200'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Sequential Checklist View</span>
                </button>

                <button
                  id="btn-recalibrate-day"
                  type="button"
                  onClick={() => {
                    triggerHaptic([12]);
                    setRecalibrateWizardOpen(!recalibrateWizardOpen);
                  }}
                  className={`px-2.5 py-1 rounded-xl font-mono text-[11px] font-semibold border flex items-center gap-1.5 cursor-pointer transition ${
                    recalibrateWizardOpen
                      ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                      : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/50 text-amber-200'
                  }`}
                  title="Recalibrate Remainder of Day (Step down one Load Mode tier or re-sequence remaining blocks)"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Recalibrate Remainder of Day</span>
                </button>

                <button
                  type="button"
                  onClick={() => setLoadConfigExpanded(!loadConfigExpanded)}
                  className="px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.09] text-slate-300 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3 h-3" />
                  <span>Tune</span>
                  {loadConfigExpanded ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            {/* Mid-Shift "Recalibrate Remainder of Day" Option A / Option B Triage Wizard */}
            {recalibrateWizardOpen && (
              <div
                id="recalibrate-day-wizard"
                className="p-4 rounded-2xl bg-amber-950/35 border border-amber-400/50 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                    <h3 className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-amber-200">
                      Mid-Shift Triage: Recalibrate Remainder of Day
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-amber-200/80">
                    Current: {state.loadMode} ({metrics.totalCompletedBlocks}/{metrics.totalTargetBlocks} blks • {metrics.remainingWorkFormatted})
                  </span>
                </div>
                <p className="text-xs text-slate-300">
                  Day started late or stalled out? Select <strong>Option A</strong> to step today down one Load Mode tier, or <strong>Option B</strong> to keep {state.loadMode} Mode and re-sequence all remaining blocks starting now:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    id="btn-recalibrate-option-a"
                    type="button"
                    onClick={() => {
                      triggerHaptic([15]);
                      onRecalibrateStepDownTier();
                      setRecalibrateWizardOpen(false);
                    }}
                    className="p-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-left space-y-1 cursor-pointer shadow-md"
                  >
                    <div className="text-xs font-extrabold uppercase">
                      Option A: Step Down One Load Mode Tier
                    </div>
                    <div className="text-[11px] font-medium opacity-90">
                      {state.loadMode === 'SURGE'
                        ? 'Step down Surge (14–15) → Cruise Mode (12 blocks)'
                        : state.loadMode === 'CRUISE'
                        ? 'Step down Cruise (11–13) → Taper Floor (8 blocks)'
                        : 'Compress Taper Floor → 7-Block Core Floor + Early Clearance'}
                    </div>
                  </button>

                  <button
                    id="btn-recalibrate-option-b"
                    type="button"
                    onClick={() => {
                      triggerHaptic([15]);
                      onRecalibrateReSequenceNow();
                      setSequentialViewOpen(true);
                      setRecalibrateWizardOpen(false);
                    }}
                    className="p-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-cyan-400/50 text-cyan-100 font-mono text-left space-y-1 cursor-pointer"
                  >
                    <div className="text-xs font-extrabold uppercase text-cyan-300">
                      Option B: Keep {state.loadMode} Mode &amp; Re-Sequence Now
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Reset chained counter to 0/2, re-sequence remaining {metrics.remainingBlocks} blocks starting now, and open Sequential Checklist.
                    </div>
                  </button>
                </div>
              </div>
            )}

            {/* Expandable Fine-Tuning Tray (Target Blocks, Fixed Event, Session 20m/40m, Surge Day Sim) */}
            {loadConfigExpanded && (
              <div className="pt-3 border-t border-white/[0.08] grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.07] space-y-1.5">
                  <span className="text-[10px] uppercase text-slate-400 block">
                    Target Blocks &amp; Display
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {state.loadMode === 'CRUISE' &&
                      [11, 12, 13].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => onSelectLoadMode('CRUISE', n, n === 13)}
                          className={`px-2 py-0.5 rounded border text-[11px] cursor-pointer ${
                            state.customModeBlockAdjustment === n
                              ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-bold'
                              : 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                          }`}
                        >
                          {n === 13 ? '13 (Cruise+)' : `${n} blks`}
                        </button>
                      ))}
                    {state.loadMode === 'SURGE' &&
                      [14, 15].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => onSelectLoadMode('SURGE', n, false)}
                          className={`px-2 py-0.5 rounded border text-[11px] cursor-pointer ${
                            state.customModeBlockAdjustment === n
                              ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                              : 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                          }`}
                        >
                          {n} blks
                        </button>
                      ))}
                    {state.loadMode === 'TAPER' &&
                      [7, 8, 9].map((n) => (
                        <button
                          key={n}
                          type="button"
                          onClick={() => onSelectLoadMode('TAPER', n, false)}
                          className={`px-2 py-0.5 rounded border text-[11px] cursor-pointer ${
                            state.customModeBlockAdjustment === n
                              ? 'bg-emerald-400 text-slate-950 border-emerald-300 font-bold'
                              : 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                          }`}
                        >
                          {n} blks
                        </button>
                      ))}
                    {([20, 40] as const).map((mins) => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => onSetSessionDisplayDuration(mins)}
                        className={`px-2 py-0.5 rounded border text-[11px] cursor-pointer ${
                          timer.sessionDisplayDurationMinutes === mins
                            ? 'bg-indigo-500/30 border-indigo-400 text-indigo-100 font-bold'
                            : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
                        }`}
                      >
                        [{mins}m]
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.07] space-y-1.5">
                  <span className="text-[10px] uppercase text-slate-400 block">
                    Fixed Event Anchor
                  </span>
                  <select
                    id="select-fixed-event"
                    value={state.fixedEvent}
                    onChange={(e) => onSetFixedEvent(e.target.value as FixedEventType)}
                    className="w-full bg-slate-950 border border-white/[0.12] rounded-lg px-2 py-1 text-[11px] text-slate-200"
                  >
                    <option value="NONE">None (Duration-Only)</option>
                    <option value="LAB_2H">Lab (~2h: 09:00–11:00 AM)</option>
                    <option value="VOLUNTEER">Volunteer (01:00–03:00 PM)</option>
                    <option value="EVENING_OUTING_6PM">6:00 PM Evening Outing</option>
                  </select>
                </div>

                <div className="p-2.5 rounded-xl bg-black/30 border border-white/[0.07] space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-slate-400">
                      Surge Consecutive Cap
                    </span>
                    <button
                      type="button"
                      onClick={onOpenPipelineDrawer}
                      className="text-[10px] text-cyan-300 underline cursor-pointer"
                    >
                      7-Day Table
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {[0, 1, 2].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onSetSurgeConsecutiveDays(d)}
                        className={`flex-1 py-0.5 rounded border text-[11px] cursor-pointer ${
                          state.surgeConsecutiveDays === d
                            ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold'
                            : 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                        }`}
                      >
                        {d}/2d
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* -------------------------------------------------------------------
              SEQUENTIAL 20M CHECKLIST VIEW (INTERLEAVED BLOCKS + AUTO-BREAKS + RUNNING COUNTDOWN)
             ------------------------------------------------------------------- */}
          {sequentialViewOpen && (
            <section
              id="sequential-checklist-view"
              aria-label="Sequential 20m Checklist Generator"
              className="rounded-3xl bento-surface p-5 space-y-3.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
                <div>
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold">
                    <ListOrdered className="w-3.5 h-3.5 text-cyan-400" />
                    <span>
                      SEQUENTIAL 20M CHECKLIST • INTERLEAVED BLOCKS + AUTO-BREAKS
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-0.5">
                    Full Daily Runway (Block 1 → [0m work left — Hard Shutdown])
                  </h3>
                  <p className="text-[11px] font-mono text-slate-400">
                    4 Flashcards spaced early/mid-shift (never final block) • 3 Half-Chapter blocks • 100% Discretionary locked to Closed List #1 • Click any row to launch timer.
                  </p>
                </div>

                <span className="px-3 py-1 rounded-xl bg-cyan-500/15 border border-cyan-400/50 font-mono text-xs font-bold text-cyan-200">
                  {metrics.totalTargetBlocks} Work Blocks + Auto-Breaks
                </span>
              </div>

              <div className="space-y-2 max-h-[540px] overflow-y-auto pr-1">
                {sequentialSteps.map((step) => {
                  const isWork = step.kind === 'WORK_BLOCK';
                  const isBreakL1 = step.kind === 'BREAK_L1';
                  const isBreakL2 = step.kind === 'BREAK_L2';
                  const isBreakL3 = step.kind === 'BREAK_L3';
                  const isShutdown = step.kind === 'SHUTDOWN';

                  return (
                    <div
                      key={step.id}
                      id={`seq-row-${step.id}`}
                      onClick={() => handleClickSequentialStep(step)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleClickSequentialStep(step);
                        }
                      }}
                      className={`p-3 rounded-2xl border transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                        step.isCurrentNext
                          ? 'bg-cyan-500/15 border-cyan-400/70 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]'
                          : step.completed || step.banked
                          ? 'bg-emerald-950/20 border-emerald-500/30 opacity-75'
                          : isShutdown
                          ? 'bg-amber-950/30 border-amber-500/45 text-amber-100'
                          : isBreakL3
                          ? 'bg-amber-500/10 border-amber-400/45 text-amber-100'
                          : isBreakL2
                          ? 'bg-indigo-950/30 border-indigo-400/35 text-indigo-100'
                          : isBreakL1
                          ? 'bg-slate-900/60 border-white/[0.06] text-slate-300'
                          : 'bg-black/30 hover:bg-white/[0.05] border-white/[0.08] text-slate-100'
                      }`}
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono text-[10px] font-bold text-slate-300">
                            #{step.stepNumber}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                              isWork
                                ? 'bg-cyan-500/20 text-cyan-200'
                                : isBreakL3
                                ? 'bg-amber-500/25 text-amber-200'
                                : isBreakL2
                                ? 'bg-indigo-500/25 text-indigo-200'
                                : isBreakL1
                                ? 'bg-slate-700/60 text-slate-200'
                                : 'bg-amber-400/25 text-amber-200'
                            }`}
                          >
                            {step.categoryBadge}
                          </span>
                          {step.isCurrentNext && (
                            <span className="px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono text-[10px] font-extrabold uppercase">
                              NEXT STEP
                            </span>
                          )}
                          {step.completed && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/25 text-emerald-200 font-mono text-[10px] font-bold">
                              ✓ COMPLETE
                            </span>
                          )}
                          {step.banked && (
                            <span className="px-2 py-0.5 rounded bg-cyan-500/25 text-cyan-200 font-mono text-[10px] font-bold">
                              BANKED (EARLY CLEARANCE)
                            </span>
                          )}
                        </div>

                        <div className="text-xs sm:text-sm font-bold text-white truncate">
                          {step.title}
                        </div>

                        <div className="text-[11px] font-mono text-cyan-200/90">
                          5m Startup: “{step.startupStep}”
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2.5 py-1 rounded-xl border font-mono text-[11px] font-bold tabular-nums ${
                            isShutdown ||
                            step.countdownBadge.includes('End-of-Shift Bridge')
                              ? 'bg-amber-500/20 border-amber-400/50 text-amber-200'
                              : 'bg-black/45 border-white/[0.1] text-cyan-200'
                          }`}
                        >
                          {step.countdownBadge}
                        </span>

                        <span className="px-2.5 py-1 rounded-xl bg-cyan-400/20 border border-cyan-400/40 text-cyan-200 font-mono text-[10px] font-bold flex items-center gap-1">
                          <Play className="w-3 h-3 fill-current" />
                          <span>Launch</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* -------------------------------------------------------------------
              MIDDLE BENTO ROW (2 COLUMNS):
              LEFT = 7-BLOCK DAILY CORE BASELINE (SEGMENTED PROGRESS PILLS)
              RIGHT = LOCKED FOCUS #1 DELIVERABLE (8/4-BLOCK SEGMENTED BAR)
             ------------------------------------------------------------------- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* LEFT MIDDLE BENTO CARD: 7-BLOCK DAILY CORE BASELINE */}
            <section
              id="bento-baseline-card"
              aria-labelledby="baseline-heading"
              className="rounded-3xl bento-surface p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold">
                      DAILY CORE FLOOR • 7 BLOCKS
                    </span>
                    <h3
                      id="baseline-heading"
                      className="text-base font-bold text-white tracking-tight"
                    >
                      Segmented Baseline Pills
                    </h3>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/[0.1] font-mono text-xs font-bold tabular-nums text-cyan-200">
                    {metrics.completedBaselineCount} / 7
                  </span>
                </div>

                {/* Group A: 4 Flashcard Segments (1 Anatomy + 3 Comp, 250-card cap) */}
                <div className="p-3.5 rounded-2xl bg-black/25 border border-white/[0.07] space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono font-bold text-slate-200">
                      4 Flashcard Blocks (1 Anat + 3 Comp)
                    </span>
                    <button
                      id="btn-toggle-early-clearance"
                      type="button"
                      disabled={metrics.isZeroWorkLeft}
                      onClick={() => {
                        triggerHaptic([15]);
                        onToggleEarlyClearance();
                      }}
                      className={`px-2.5 py-0.5 rounded-lg border font-mono text-[10px] font-bold transition cursor-pointer ${
                        state.earlyClearanceEnabled
                          ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                          : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.1] text-slate-300'
                      }`}
                    >
                      {state.earlyClearanceEnabled
                        ? '✓ Early Clearance Banked'
                        : 'Early Clearance'}
                    </button>
                  </div>

                  {/* 4 Tactile Flashcard Progress Pill Segments */}
                  <div className="grid grid-cols-4 gap-1.5">
                    {flashcardBlocks.map((b, idx) => {
                      const blockedAsFinal =
                        isFinalBlockOfNight && !b.completed && !b.bankedViaEarlyClearance;
                      const isSelected = selectedBaseline?.id === b.id;
                      const shortTag = idx === 0 ? 'ANAT 1' : `COMP ${idx}`;
                      return (
                        <button
                          key={b.id}
                          id={`pill-segment-${b.id}`}
                          type="button"
                          disabled={metrics.isZeroWorkLeft || blockedAsFinal}
                          onClick={() => {
                            triggerHaptic([10]);
                            setSelectedBaselineId(b.id);
                            onToggleBaselineBlock(b.id);
                          }}
                          className={`p-2 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[54px] ${
                            b.completed
                              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]'
                              : b.bankedViaEarlyClearance
                              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                              : blockedAsFinal
                              ? 'bg-red-950/30 border-red-800/50 text-red-300/60 cursor-not-allowed'
                              : isSelected
                              ? 'bg-white/[0.08] border-cyan-400/60 text-white'
                              : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] text-slate-300'
                          }`}
                          title={`${b.title} — Click to toggle complete`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono text-[10px] font-bold">
                              {shortTag}
                            </span>
                            {b.completed ? (
                              <Check className="w-3 h-3 text-emerald-300" />
                            ) : b.bankedViaEarlyClearance ? (
                              <span className="text-[9px] font-mono text-cyan-300">
                                BANK
                              </span>
                            ) : blockedAsFinal ? (
                              <Lock className="w-3 h-3 text-red-400" />
                            ) : null}
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden mt-1.5">
                            <div
                              className={`h-full rounded-full ${
                                b.completed
                                  ? 'w-full bg-emerald-400'
                                  : b.bankedViaEarlyClearance
                                  ? 'w-full bg-cyan-400'
                                  : 'w-1/4 bg-slate-600'
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* 250-Card Cap Compact Slider */}
                  <div className="flex items-center justify-between gap-2 pt-1 text-[11px] font-mono text-slate-400">
                    <span>Due Cap: {state.flashcardsReviewedCount}/250 cards</span>
                    <input
                      id="input-flashcard-count"
                      type="range"
                      min={0}
                      max={state.flashcardsDailyCap}
                      step={5}
                      value={state.flashcardsReviewedCount}
                      onChange={(e) => onUpdateFlashcardCount(Number(e.target.value))}
                      className="w-28 accent-cyan-400 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Group B: 3 Half-Chapter Segments (2 Reading/Equations + 1 Synthesis) */}
                <div className="p-3.5 rounded-2xl bg-black/25 border border-white/[0.07] space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-mono font-bold text-slate-200">
                      3 Half-Chapter Blocks (2 Read/Eq + 1 Synth)
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      In + Out
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {halfChapterBlocks.map((b, idx) => {
                      const isSelected = selectedBaseline?.id === b.id;
                      const shortTag =
                        b.category === 'SYNTHESIS' ? 'SYNTH 1' : `READ ${idx + 1}`;
                      return (
                        <button
                          key={b.id}
                          id={`pill-segment-${b.id}`}
                          type="button"
                          disabled={metrics.isZeroWorkLeft}
                          onClick={() => {
                            triggerHaptic([10]);
                            setSelectedBaselineId(b.id);
                            onToggleBaselineBlock(b.id);
                          }}
                          className={`p-2.5 rounded-xl border text-left transition cursor-pointer flex flex-col justify-between min-h-[54px] ${
                            b.completed
                              ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]'
                              : isSelected
                              ? 'bg-white/[0.08] border-cyan-400/60 text-white'
                              : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] text-slate-300'
                          }`}
                          title={`${b.title} — Click to toggle complete`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className="font-mono text-[10px] font-bold">
                              {shortTag}
                            </span>
                            {b.completed && (
                              <Check className="w-3 h-3 text-emerald-300" />
                            )}
                          </div>
                          <div className="w-full h-1.5 rounded-full bg-black/40 overflow-hidden mt-1.5">
                            <div
                              className={`h-full rounded-full ${
                                b.completed
                                  ? 'w-full bg-emerald-400'
                                  : 'w-1/4 bg-indigo-400/60'
                              }`}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Selected Baseline Segment Micro-Launcher */}
              {selectedBaseline && (
                <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">
                      {selectedBaseline.title}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400 truncate">
                      5m: {selectedBaseline.startupStep}
                    </div>
                  </div>
                  <button
                    id={`btn-launch-${selectedBaseline.id}`}
                    type="button"
                    disabled={
                      metrics.isZeroWorkLeft ||
                      isSurgeMidDayResetRequired ||
                      (isFinalBlockOfNight &&
                        isFlashcardBlock(selectedBaseline) &&
                        !selectedBaseline.completed)
                    }
                    onClick={() => {
                      triggerHaptic([15]);
                      onLaunchBlockInTimer(
                        selectedBaseline.id,
                        selectedBaseline.title,
                        isFlashcardBlock(selectedBaseline)
                          ? 'FLASHCARDS'
                          : selectedBaseline.category === 'SYNTHESIS'
                          ? 'SYNTHESIS'
                          : 'READING',
                        selectedBaseline.startupStep
                      );
                    }}
                    className="px-3 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>5m</span>
                  </button>
                </div>
              )}
            </section>

            {/* RIGHT MIDDLE BENTO CARD: LOCKED FOCUS #1 DELIVERABLE + COLLAPSED DRAWER FOR #2 & #3 */}
            <section
              id="bento-project-lock-card"
              aria-labelledby="project-lock-heading"
              className="rounded-3xl bento-surface p-5 flex flex-col justify-between space-y-4"
            >
              {primaryProject ? (
                <div
                  id={`project-card-slot-1`}
                  className="space-y-3.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-bold flex items-center gap-1">
                        <Unlock className="w-3 h-3 text-emerald-400" />
                        <span>LOCKED FOCUS #1 • 100% DISCRETIONARY</span>
                      </span>
                      <h3
                        id="project-lock-heading"
                        className="text-base font-bold text-white tracking-tight mt-0.5"
                      >
                        {primaryProject.title}
                      </h3>
                    </div>
                    <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/40 font-mono text-xs font-bold tabular-nums text-emerald-200 shrink-0">
                      [{primaryProject.completedBlocks}/{primaryProject.totalBlocks}]
                    </span>
                  </div>

                  {/* 8-Block / 4-Block Tactile Segmented Progress Bar */}
                  <div className="p-3.5 rounded-2xl bg-black/25 border border-white/[0.07] space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono text-slate-300">
                      <span>
                        {primaryProject.presetType === 'PAPER_8'
                          ? '8-Block Paper Sprint'
                          : primaryProject.presetType === 'SLIDES_4'
                          ? '4-Block Slide Deck'
                          : `${primaryProject.totalBlocks}-Block Deliverable`}
                      </span>
                      <span className="text-emerald-300 font-bold">
                        {Math.round(
                          (primaryProject.completedBlocks /
                            Math.max(1, primaryProject.totalBlocks)) *
                            100
                        )}
                        % Complete
                      </span>
                    </div>

                    <div
                      className="grid gap-1.5"
                      style={{
                        gridTemplateColumns: `repeat(${Math.min(
                          12,
                          Math.max(1, primaryProject.totalBlocks)
                        )}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: primaryProject.totalBlocks }).map(
                        (_, segIdx) => {
                          const filled = segIdx < primaryProject.completedBlocks;
                          const isNext = segIdx === primaryProject.completedBlocks;
                          return (
                            <button
                              key={segIdx}
                              type="button"
                              disabled={
                                metrics.isZeroWorkLeft || isSurgeMidDayResetRequired
                              }
                              onClick={() => {
                                triggerHaptic([10]);
                                onIncrementProjectBlock(primaryProject.id);
                              }}
                              className={`h-7 rounded-lg border font-mono text-[10px] font-bold flex items-center justify-center transition cursor-pointer ${
                                filled
                                  ? 'bg-emerald-400/30 border-emerald-400 text-emerald-100 shadow-[0_0_12px_rgba(52,211,153,0.25)]'
                                  : isNext
                                  ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-200 animate-pulse'
                                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.08] text-slate-500'
                              }`}
                              title={`Block ${segIdx + 1} of ${primaryProject.totalBlocks} — Click to log +1 block`}
                            >
                              {segIdx + 1}
                            </button>
                          );
                        }
                      )}
                    </div>

                    <p className="text-[11px] font-mono text-slate-300 pt-1">
                      5m Startup: <span className="text-cyan-200">“{primaryProject.startupStep}”</span>
                    </p>
                  </div>

                  {/* Primary Action Row for Focus #1 */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      id="btn-launch-project-1"
                      type="button"
                      disabled={metrics.isZeroWorkLeft || isSurgeMidDayResetRequired}
                      onClick={() => {
                        triggerHaptic([15]);
                        onLaunchBlockInTimer(
                          primaryProject.id,
                          primaryProject.title,
                          'PROJECT',
                          primaryProject.startupStep
                        );
                      }}
                      className="flex-1 py-2 px-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Start 5m Step</span>
                    </button>

                    <button
                      id="btn-log-project-1-block"
                      type="button"
                      disabled={metrics.isZeroWorkLeft || isSurgeMidDayResetRequired}
                      onClick={() => {
                        triggerHaptic([15]);
                        onIncrementProjectBlock(primaryProject.id);
                      }}
                      className="py-2 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-100 font-mono font-semibold text-xs cursor-pointer"
                    >
                      +1 Block
                    </button>

                    <button
                      id="btn-complete-project-1"
                      type="button"
                      onClick={() => {
                        triggerHaptic([20]);
                        onCompleteProjectItem1();
                      }}
                      className="py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer"
                      title="Mark Item #1 Complete and promote Item #2 to Primary Target"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Done</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-xs font-mono text-slate-400">
                  No active project in Slot #1.
                </div>
              )}

              {/* Smart Intake Bar + Inline Option A / Option B Triage Wizard */}
              <div
                id="smart-intake-bar"
                className="pt-2.5 border-t border-white/[0.08] space-y-2.5"
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-slate-400">
                  <span>Smart Deliverable Intake Bar (Closed List Cap: {state.projectQueue.length}/3)</span>
                  <span>Open List Backlog: {state.projectBacklog.length}</span>
                </div>

                <form
                  onSubmit={handleAddProjectSubmit}
                  className="p-2.5 rounded-2xl bg-black/30 border border-white/[0.08] space-y-2"
                >
                  <div className="flex flex-wrap gap-1.5">
                    <input
                      id="input-new-project-title"
                      type="text"
                      value={newProjTitle}
                      onChange={(e) => setNewProjTitle(e.target.value)}
                      placeholder="Add deliverable (e.g., Grant Specific Aims Draft)..."
                      className="flex-1 min-w-[150px] bg-slate-950 border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />
                    <select
                      id="select-new-project-preset"
                      value={newProjPreset}
                      onChange={(e) =>
                        setNewProjPreset(e.target.value as ProjectPresetType)
                      }
                      className="bg-slate-950 border border-white/[0.1] rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200"
                    >
                      <option value="PAPER_8">2-Page Paper (8 blks)</option>
                      <option value="SLIDES_4">Slide Deck (4 blks)</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                    {newProjPreset === 'CUSTOM' && (
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={newProjCustomBlocks}
                        onChange={(e) =>
                          setNewProjCustomBlocks(Number(e.target.value))
                        }
                        className="w-14 bg-slate-950 border border-white/[0.1] rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200"
                      />
                    )}
                    <select
                      id="select-new-project-track"
                      value={newProjTrack}
                      onChange={(e) => setNewProjTrack(e.target.value as TrackId)}
                      className="bg-slate-950 border border-white/[0.1] rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200"
                    >
                      <option value="writing">Writing</option>
                      <option value="science">Science</option>
                      <option value="personal">Personal</option>
                    </select>
                    <button
                      id="btn-submit-smart-intake"
                      type="submit"
                      className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Intake</span>
                    </button>
                  </div>

                  <input
                    id="input-new-project-startup"
                    type="text"
                    value={newProjStartup}
                    onChange={(e) => setNewProjStartup(e.target.value)}
                    placeholder="5m Startup Step script..."
                    className="w-full bg-slate-950/70 border border-white/[0.07] rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300"
                  />
                </form>

                {/* Inline Option A / Option B Prompt when exceeding 3-item Closed List cap or forcing a Surge day */}
                {pendingIntakeTriage && (
                  <div
                    id="smart-intake-triage-prompt"
                    className="p-3.5 rounded-2xl bg-amber-950/45 border border-amber-400/60 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase font-extrabold text-amber-300">
                        Capacity Governor Gate • Option A / Option B Triage
                      </span>
                      <button
                        type="button"
                        onClick={() => setPendingIntakeTriage(null)}
                        className="text-[10px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>

                    <p className="text-xs text-amber-100/90 leading-snug">
                      <strong>“{pendingIntakeTriage.title}” ({pendingIntakeTriage.totalBlocks} blocks):</strong>{' '}
                      {pendingIntakeTriage.reason}
                    </p>

                    <div className="grid grid-cols-1 gap-2">
                      <button
                        id="btn-intake-option-a"
                        type="button"
                        onClick={() => {
                          triggerHaptic([15]);
                          onPromoteDeliverableWithSurge(
                            pendingIntakeTriage.title,
                            pendingIntakeTriage.presetType,
                            pendingIntakeTriage.totalBlocks,
                            pendingIntakeTriage.trackId,
                            pendingIntakeTriage.startupStep
                          );
                          setPendingIntakeTriage(null);
                          setNewProjTitle('');
                        }}
                        className="p-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-xs font-bold text-left cursor-pointer shadow-md"
                      >
                        Option A (Hard Deadline): Promote to Closed List &amp; schedule Surge blocks
                      </button>

                      <button
                        id="btn-intake-option-b"
                        type="button"
                        onClick={() => {
                          triggerHaptic([15]);
                          onDemoteDeliverableToBacklog(
                            pendingIntakeTriage.title,
                            pendingIntakeTriage.presetType,
                            pendingIntakeTriage.totalBlocks,
                            pendingIntakeTriage.trackId,
                            pendingIntakeTriage.startupStep
                          );
                          setPendingIntakeTriage(null);
                          setNewProjTitle('');
                        }}
                        className="p-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-cyan-400/50 text-cyan-100 font-mono text-xs font-bold text-left cursor-pointer"
                      >
                        Option B (Soft / Flexible): Demote to Open List backlog to preserve Cruise Mode
                      </button>
                    </div>
                  </div>
                )}

                {/* Muted Collapsed Drawer for Items #2 & #3 + Open List Backlog */}
                <button
                  id="btn-toggle-locked-projects-drawer"
                  type="button"
                  onClick={() => setLockedDrawerOpen(!lockedDrawerOpen)}
                  className="w-full px-3 py-2 rounded-xl bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.07] text-xs font-mono text-slate-400 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-500" />
                    <span>
                      Locked Queue #2 &amp; #3 ({lockedSecondaryProjects.length} locked) • Backlog ({state.projectBacklog.length})
                    </span>
                  </span>
                  {lockedDrawerOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {lockedDrawerOpen && (
                  <div className="mt-2 space-y-2">
                    {lockedSecondaryProjects.map((proj) => (
                      <div
                        key={proj.id}
                        id={`project-card-slot-${proj.slot}`}
                        className="p-3 rounded-xl bg-black/35 border border-white/[0.06] opacity-75 flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                            <Lock className="w-3 h-3" />
                            <span>SLOT #{proj.slot} • LOCKED TO #1</span>
                          </div>
                          <div className="text-xs font-semibold text-slate-200 truncate">
                            {proj.title}
                          </div>
                        </div>
                        <span className="font-mono text-[11px] text-slate-400 shrink-0">
                          [{proj.completedBlocks}/{proj.totalBlocks}]
                        </span>
                      </div>
                    ))}

                    {state.projectBacklog.length > 0 && (
                      <div className="pt-1.5 border-t border-white/[0.06] space-y-1.5">
                        <div className="text-[10px] font-mono uppercase text-slate-400">
                          Open List Backlog (Preserving Cruise Mode)
                        </div>
                        {state.projectBacklog.map((b, idx) => (
                          <div
                            key={b.id}
                            className="p-2.5 rounded-xl bg-black/25 border border-white/[0.05] text-xs font-mono text-slate-300 flex items-center justify-between gap-2"
                          >
                            <span className="truncate">
                              #{idx + 1} {b.title}
                            </span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              [{b.totalBlocks} blks]
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* -------------------------------------------------------------------
              BOTTOM BENTO ROW: QUICK TRIAGE DOCK
              (3-5m Micro-Reset, 10-15m Task-Switch Buffer, 60-120m Split-Shift Reset, 4-7-8 Stress Reset)
             ------------------------------------------------------------------- */}
          <section
            id="bento-quick-triage-dock"
            aria-label="Quick Break and Stress Triage Dock"
            className="rounded-3xl bento-surface p-5 space-y-3.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <h3 className="text-xs sm:text-sm font-mono uppercase tracking-wider font-bold text-slate-200">
                  Quick Break &amp; Stress Triage Dock
                </h3>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Chained Blocks: {timer.chainedBlocksCount}/2 (40m max before 10–15m Buffer)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {/* Dock Card 1: 3-5m Micro-Reset (Same-Task) */}
              <div
                className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2.5 transition ${
                  timer.mode === 'BREAK_L1'
                    ? 'bg-cyan-500/15 border-cyan-400/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                    : 'bg-black/25 border-white/[0.07]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-cyan-300 font-bold">
                      SAME-TASK
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      3–5m
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    Micro-Reset
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Stand, water, eyes off screen (max 2 chained blocks).
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  {([3, 5] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      disabled={timer.chainedBlocksCount >= 2}
                      onClick={() => {
                        triggerHaptic([10]);
                        onSelectL1Minutes(m);
                      }}
                      className={`flex-1 py-1.5 rounded-xl font-mono text-xs font-bold border cursor-pointer disabled:opacity-40 ${
                        timer.mode === 'BREAK_L1' && timer.l1DurationMinutes === m
                          ? 'bg-cyan-400 text-slate-950 border-cyan-300'
                          : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-slate-200'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Dock Card 2: 10-15m Task-Switch Buffer */}
              <div
                className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2.5 transition ${
                  timer.mode === 'BREAK_L2'
                    ? 'bg-indigo-500/15 border-indigo-400/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                    : 'bg-black/25 border-white/[0.07]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-indigo-300 font-bold">
                      TASK-SWITCH
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      10–15m
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    Buffer Protocol
                  </div>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {(
                      [
                        { id: 'ESPRESSO' as Level2BreakProtocol, label: 'Espresso', icon: Coffee },
                        { id: 'BASS_GUITAR_5M' as Level2BreakProtocol, label: '5m Bass', icon: Music },
                        { id: 'TENS_NORMATEC_15M' as Level2BreakProtocol, label: 'Normatec', icon: Activity },
                      ] as const
                    ).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic([10]);
                          onSelectL2Protocol(p.id);
                        }}
                        className={`px-1.5 py-0.5 rounded-md font-mono text-[10px] border cursor-pointer ${
                          timer.mode === 'BREAK_L2' && timer.l2Protocol === p.id
                            ? 'bg-indigo-400 text-slate-950 border-indigo-300 font-bold'
                            : 'bg-white/[0.04] border-white/[0.08] text-slate-300'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {([10, 15] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        triggerHaptic([10]);
                        onSelectL2Minutes(m);
                      }}
                      className={`flex-1 py-1.5 rounded-xl font-mono text-xs font-bold border cursor-pointer ${
                        timer.mode === 'BREAK_L2' && timer.l2DurationMinutes === m
                          ? 'bg-indigo-400 text-slate-950 border-indigo-300'
                          : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-slate-200'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Dock Card 3: 60-120m Split-Shift Reset */}
              <div
                className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2.5 transition ${
                  timer.mode === 'BREAK_L3'
                    ? 'bg-emerald-500/15 border-emerald-400/60 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                    : 'bg-black/25 border-white/[0.07]'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-emerald-300 font-bold">
                      SPLIT-SHIFT
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      60–120m
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">
                    Mid-Day Reset
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Mandatory after 7 Surge blocks (meal / walk / off-desk).
                  </p>
                </div>

                <div className="flex items-center gap-1">
                  {([60, 90, 120] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        triggerHaptic([10]);
                        onSelectL3Minutes(m);
                      }}
                      className={`flex-1 py-1.5 rounded-xl font-mono text-[11px] font-bold border cursor-pointer ${
                        timer.mode === 'BREAK_L3' && timer.l3DurationMinutes === m
                          ? 'bg-emerald-400 text-slate-950 border-emerald-300'
                          : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-slate-200'
                      }`}
                    >
                      {m}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Dock Card 4: 4-7-8 Stress / Fatigue Reset Button */}
              <div
                className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-2.5 transition ${
                  timer.mode === 'STRESS_RESET'
                    ? 'bg-amber-500/20 border-amber-400/70 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.15)]'
                    : 'bg-amber-500/[0.07] border-amber-500/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase text-amber-300 font-bold flex items-center gap-1">
                      <Wind className="w-3 h-3 text-amber-400" />
                      <span>4-7-8 PACER</span>
                    </span>
                    <span className="text-[10px] font-mono text-amber-200/80">
                      15–20m
                    </span>
                  </div>
                  <div className="text-xs font-bold text-amber-50 mt-0.5">
                    Stress / Fatigue Reset
                  </div>
                  <p className="text-[11px] text-amber-100/75 mt-0.5 leading-snug">
                    Suspends heavy reading/writing + queues 5m Flashcards.
                  </p>
                </div>

                <button
                  id="btn-dock-stress-reset"
                  type="button"
                  onClick={() => {
                    triggerHaptic([20, 40, 20]);
                    onTriggerStressReset('BREATHING_478', 15);
                  }}
                  className="w-full py-1.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>4-7-8 Stress Reset</span>
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
