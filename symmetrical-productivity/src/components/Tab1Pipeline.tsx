import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Archive,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coffee,
  FastForward,
  Flame,
  GraduationCap,
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
} from 'lucide-react';
import {
  BaselineBlock,
  CognitiveDemandTag,
  ElasticBlockMultiplier,
  EnergyBandwidthState,
  FixedEventType,
  LayoutMode,
  Level2BreakProtocol,
  LoadMode,
  PipelineDay,
  ProjectPresetType,
  SequentialChecklistStep,
  ShockAbsorberMode,
  SmartIntakePlanResult,
  StartupShrinkLevel,
  StressResetProtocol,
  SymmetryState,
  TimerRunMode,
  TrackId,
} from '../types/symmetry';
import {
  computeShiftMetrics,
  generateSequentialChecklist,
  getActiveBlockDurationsSeconds,
  getActiveFocusProject,
  getBaselineCognitiveDemand,
  getBaselineSlotCompletedBlocks,
  getBaselineSlotTargetBlocks,
  getPreExamTaperSuggestion,
  getProjectCognitiveDemand,
  getShrunkStartupPrompt,
  getTotalBaselineFloorBlocks,
  isBaselineSlotEarlyClearanceEligible,
  isBaselineSlotLateNightBlocked,
} from '../state/defaultState';
import { DualRingTimerSvg } from './DualRingTimerSvg';
import { BreathingVisualizer478 } from './BreathingVisualizer478';
import { InteractivePipelineTable } from './PipelineDrawer';
import { SmartIntakeBar } from './SmartIntakeBar';
import { InlineEditableText } from './InlineEditableText';
import { InlineBreakOptionsEditor, InlineSlotEditor } from './InlineSlotEditor';
import { triggerHaptic } from '../utils/haptics';
import { soundEngine } from '../utils/soundEngine';
import { Pencil, X } from 'lucide-react';

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
  layoutMode?: LayoutMode;
  smartIntakeText: string;
  onChangeSmartIntakeText: (val: string) => void;
  smartIntakePreview: SmartIntakePlanResult | null;
  onSetSmartIntakePreview: (plan: SmartIntakePlanResult | null) => void;
  onApplySmartIntakePlan: (plan: SmartIntakePlanResult) => void;
  onOpenStateModal: () => void;
  onOpenCommandDock?: () => void;
  cinemaFocusMode?: boolean;
  onToggleCinemaFocusMode?: () => void;
  architectModeUnlocked?: boolean;
  onUnlockArchitectMode?: (source: string) => void;
  apiKeyVersion: number;
  onSelectLoadMode: (mode: LoadMode, targetBlocks: number, cruisePlus?: boolean) => void;
  onTogglePreExamTaper: (forceValue?: boolean) => void;
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
  onUpdatePipelineDay: (dayIndex: number, patch: Partial<PipelineDay>) => void;
  onSmartIntakeSubmit?: (rawText: string) => void;
  onOpenMiniHudPip?: () => void;
  isMiniHudOpen?: boolean;
  autoFloatOnTabSwitch?: boolean;
  onToggleAutoFloatOnTabSwitch?: () => void;
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
  // 5 Structured Elasticity Systems handlers
  onSetEnergyBandwidth: (bandwidth: EnergyBandwidthState) => void;
  onCycleCognitiveDemand: (targetKind: 'BASELINE' | 'PROJECT', targetId: string) => void;
  onSelectElasticMultiplier: (multiplier: ElasticBlockMultiplier) => void;
  onShrinkStartupStep: (targetLevel?: StartupShrinkLevel) => void;
  onApplyShockAbsorber: (mode: ShockAbsorberMode, targetCeiling?: number) => void;
  onSetActiveDualSlotNumber: (slot: 1 | 2) => void;
  onLaunchBoundedCuriosityBlock: () => void;
  // Direct Inline Editing Handlers
  onUpdateBaselineBlock?: (blockId: string, patch: Partial<BaselineBlock>) => void;
  onAddBaselineBlock?: () => void;
  onDeleteBaselineBlock?: (blockId: string) => void;
  onUpdateProjectItem?: (
    projectId: string,
    patch: Partial<import('../types/symmetry').ProjectItem>
  ) => void;
  onUpdateActiveTimerTask?: (patch: { title?: string; startupPrompt?: string }) => void;
  onUpdateBreakOptions?: (
    patch: Partial<import('../types/symmetry').BreakOptionsConfig>
  ) => void;
}

export const Tab1Pipeline: React.FC<Tab1PipelineProps> = ({
  state,
  smartIntakeText,
  onChangeSmartIntakeText,
  smartIntakePreview,
  onSetSmartIntakePreview,
  onApplySmartIntakePlan,
  onOpenStateModal,
  onOpenCommandDock,
  cinemaFocusMode = false,
  onToggleCinemaFocusMode,
  architectModeUnlocked = false,
  onUnlockArchitectMode,
  apiKeyVersion,
  onSelectLoadMode,
  onTogglePreExamTaper,
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
  onUpdatePipelineDay,
  onOpenMiniHudPip,
  isMiniHudOpen,
  autoFloatOnTabSwitch,
  onToggleAutoFloatOnTabSwitch,
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
  onSetEnergyBandwidth,
  onCycleCognitiveDemand,
  onSelectElasticMultiplier,
  onShrinkStartupStep,
  onApplyShockAbsorber,
  onSetActiveDualSlotNumber,
  onLaunchBoundedCuriosityBlock,
  onUpdateBaselineBlock,
  onAddBaselineBlock,
  onDeleteBaselineBlock,
  onUpdateProjectItem,
  onUpdateActiveTimerTask,
  onUpdateBreakOptions,
}) => {
  const metrics = computeShiftMetrics(state);
  const { timer } = state;
  const isCinemaReceding = Boolean(cinemaFocusMode);
  const activeDurations = getActiveBlockDurationsSeconds(state);
  const energyBandwidth: EnergyBandwidthState = state.energyBandwidth || 'STEADY';
  const elasticMult: ElasticBlockMultiplier = timer.elasticMultiplier ?? 1.0;
  const shrinkLevel: StartupShrinkLevel = timer.startupShrinkLevel ?? 1;
  const totalBaselineFloorBlocks = getTotalBaselineFloorBlocks(state.baselineBlocks);

  // Progressive Disclosure States (Opens automatically if Modular Blank Canvas inlineEditModeActive is true)
  const [stageOptionsOpen, setStageOptionsOpen] = useState(false);
  const [progressChecklistOpen, setProgressChecklistOpen] = useState(
    Boolean(state.inlineEditModeActive)
  );
  const [triageDetailsOpen, setTriageDetailsOpen] = useState(false);
  const [sequentialViewOpen, setSequentialViewOpen] = useState(false);
  const [recalibrateWizardOpen, setRecalibrateWizardOpen] = useState(false);
  const [intakeDrawerOpen, setIntakeDrawerOpen] = useState(false);
  const [sevenDayAccordionOpen, setSevenDayAccordionOpen] = useState(false);
  const [lockedDrawerOpen, setLockedDrawerOpen] = useState(false);
  const [editingBaselineSlotId, setEditingBaselineSlotId] = useState<string | null>(
    state.inlineEditModeActive ? state.baselineBlocks[0]?.id || null : null
  );
  const [editingBreakPill, setEditingBreakPill] = useState<
    'L1' | 'L2' | 'STRESS' | null
  >(null);

  const [shockAbsorberSelection, setShockAbsorberSelection] = useState<ShockAbsorberMode>(
    state.shockAbsorberMode || 'HALF_SHIFT'
  );
  const [shockAbsorberSliderBlocks, setShockAbsorberSliderBlocks] = useState<number>(
    state.shockAbsorberMode === 'MVF_FLOOR' ? 4 : 6
  );

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
  const [simulateExamProximityDate, setSimulateExamProximityDate] = useState<boolean>(false);

  const examCheckDate = simulateExamProximityDate
    ? new Date(new Date().getFullYear(), 10, 10, 12, 0, 0)
    : new Date();
  const examSuggestion = getPreExamTaperSuggestion(examCheckDate);
  const isAveryPresetActive = Boolean(
    architectModeUnlocked && state.profilePresetId === 'AVERY_DEFAULT'
  );

  // Rule 3: Block flashcards from being scheduled/executed as the final block of the night
  const isFinalBlockOfNight = metrics.remainingBlocks <= 1 && metrics.remainingBlocks > 0;

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

  const formatCognitiveDemandBadge = (tag: CognitiveDemandTag) => {
    if (tag === 'DEEP_SYNTHESIS') return 'DEEP SYNTHESIS';
    if (tag === 'MECHANICAL_RECALL') return 'MECHANICAL RECALL';
    return 'LIGHT ADMIN';
  };

  const getCognitiveDemandColorClass = (tag: CognitiveDemandTag) => {
    if (tag === 'DEEP_SYNTHESIS') {
      return 'bg-indigo-500/15 border-indigo-400/30 text-indigo-200';
    }
    if (tag === 'MECHANICAL_RECALL') {
      return 'bg-cyan-500/15 border-cyan-400/30 text-cyan-200';
    }
    return 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200';
  };

  // Active Focus Project respects Dual-Slot mode when enabled in Settings
  const primaryProject = getActiveFocusProject(state);
  const isDualSlotEnabled =
    state.flexibilityTuning?.closedListLockMode === 'DUAL_SLOT' &&
    state.projectQueue.length >= 2;
  const activeDualSlotNum =
    isDualSlotEnabled && state.flexibilityTuning?.activeDualSlotNumber === 2 ? 2 : 1;

  // Auto-Router: compute the exact "Up Next" recommended block based on Energy-State Bandwidth
  const eligibleBaselines = state.baselineBlocks.filter((b) => {
    if (b.completed || b.bankedViaEarlyClearance) return false;
    if (state.preExamTaperActive && (b.category === 'SYNTHESIS' || b.category === 'READING')) {
      return false;
    }
    if (isFinalBlockOfNight && isFlashcardBlock(b)) return false;
    return true;
  });

  const nextSteadyBaseline = eligibleBaselines[0];
  const nextDeepBaseline = eligibleBaselines.find(
    (b) => getBaselineCognitiveDemand(b) === 'DEEP_SYNTHESIS'
  );
  const nextLowFrictionBaseline = eligibleBaselines.find((b) => {
    const d = getBaselineCognitiveDemand(b);
    return d === 'MECHANICAL_RECALL' || d === 'LIGHT_ADMIN';
  });

  const baselineHelperToSpec = (
    b: BaselineBlock,
    prefixTag?: string
  ): {
    sourceId: string;
    title: string;
    badge: string;
    taskType: 'FLASHCARDS' | 'READING' | 'SYNTHESIS' | 'PROJECT';
    cognitiveDemand: CognitiveDemandTag;
    startupStep: string;
  } => {
    const demand = getBaselineCognitiveDemand(b);
    const coreLabel = isFlashcardBlock(b)
      ? 'FLASHCARDS'
      : b.category === 'SYNTHESIS'
      ? 'SYNTHESIS'
      : 'HALF-CHAPTER';
    return {
      sourceId: b.id,
      title: b.title,
      badge: prefixTag ? `${prefixTag} • ${coreLabel}` : coreLabel,
      taskType: isFlashcardBlock(b)
        ? 'FLASHCARDS'
        : b.category === 'SYNTHESIS'
        ? 'SYNTHESIS'
        : 'READING',
      cognitiveDemand: demand,
      startupStep: b.startupStep,
    };
  };

  const projectRemainingBlocks = primaryProject
    ? Math.max(0, primaryProject.totalBlocks - primaryProject.completedBlocks)
    : 0;
  const discretionaryQuotaAvailable =
    metrics.totalTargetBlocks > state.baselineBlocks.length &&
    state.discretionaryBlocksCompletedToday <
      metrics.totalTargetBlocks - state.baselineBlocks.length;

  const upNextBlock = (() => {
    if (state.preExamTaperActive) {
      if (nextSteadyBaseline) {
        return {
          sourceId: nextSteadyBaseline.id,
          title: `${nextSteadyBaseline.title} (Active Recall)`,
          badge: 'PRE-EXAM TAPER',
          taskType: 'FLASHCARDS' as const,
          cognitiveDemand: 'MECHANICAL_RECALL' as const,
          startupStep: nextSteadyBaseline.startupStep,
        };
      }
      return {
        sourceId: primaryProject?.id || 'exam_recall_sprint',
        title: 'Exam Review & Active Recall — Practice Questions',
        badge: 'PRE-EXAM TAPER',
        taskType: 'FLASHCARDS' as const,
        cognitiveDemand: 'MECHANICAL_RECALL' as const,
        startupStep:
          'Open high-yield missed card tags + complete 15 active recall questions without notes.',
      };
    }

    if (energyBandwidth === 'SHARP') {
      if (
        primaryProject &&
        projectRemainingBlocks > 0 &&
        discretionaryQuotaAvailable &&
        getProjectCognitiveDemand(primaryProject) === 'DEEP_SYNTHESIS' &&
        metrics.totalCompletedBlocks === 0
      ) {
        return {
          sourceId: primaryProject.id,
          title: primaryProject.title,
          badge: `FOCUS #${primaryProject.slot}`,
          taskType: 'PROJECT' as const,
          cognitiveDemand: getProjectCognitiveDemand(primaryProject),
          startupStep: primaryProject.startupStep,
        };
      }
      if (nextDeepBaseline) {
        return baselineHelperToSpec(nextDeepBaseline, 'DEEP SYNTHESIS');
      }
      if (primaryProject && projectRemainingBlocks > 0) {
        return {
          sourceId: primaryProject.id,
          title: primaryProject.title,
          badge: `FOCUS #${primaryProject.slot}`,
          taskType: 'PROJECT' as const,
          cognitiveDemand: getProjectCognitiveDemand(primaryProject),
          startupStep: primaryProject.startupStep,
        };
      }
      if (nextSteadyBaseline) {
        return baselineHelperToSpec(nextSteadyBaseline);
      }
    }

    if (energyBandwidth === 'LOW_FOGGY') {
      if (nextLowFrictionBaseline) {
        return baselineHelperToSpec(nextLowFrictionBaseline, 'LOW-FRICTION');
      }
      if (primaryProject) {
        return {
          sourceId: primaryProject.id,
          title: `${primaryProject.title} (Light Admin Sub-Step)`,
          badge: `FOCUS #${primaryProject.slot}`,
          taskType: 'PROJECT' as const,
          cognitiveDemand: 'LIGHT_ADMIN' as const,
          startupStep: `Low-fog admin pass: open "${primaryProject.title}", format citations/headings, or outline 2 bullet stubs without forcing cold prose.`,
        };
      }
    }

    if (nextSteadyBaseline) {
      return baselineHelperToSpec(nextSteadyBaseline);
    }
    return {
      sourceId: primaryProject?.id || 'proj_1',
      title: primaryProject?.title || 'Anatomy & Comp Exam Prep Sprint',
      badge: `FOCUS #${primaryProject?.slot || 1}`,
      taskType: 'PROJECT' as const,
      cognitiveDemand: primaryProject
        ? getProjectCognitiveDemand(primaryProject)
        : ('DEEP_SYNTHESIS' as const),
      startupStep:
        primaryProject?.startupStep || 'Open deck + clear first 15 cards',
    };
  })();

  const flashcardBlocks = state.baselineBlocks.filter(isFlashcardBlock);
  const halfChapterBlocks = state.baselineBlocks.filter((b) => !isFlashcardBlock(b));
  const selectedBaseline =
    state.baselineBlocks.find((b) => b.id === selectedBaselineId) ||
    state.baselineBlocks[0];

  const lockedSecondaryProjects = state.projectQueue.filter(
    (p) => p.id !== primaryProject?.id
  );
  const openBacklogList = state.openListBacklog ?? state.projectBacklog ?? [];

  const stageBadgeText =
    timer.mode === 'WORK_20M'
      ? timer.workStage === 'IGNITION_5M'
        ? `${activeDurations.startupMinutes}m Startup Step (${elasticMult}x)`
        : `${activeDurations.momentumMinutes}m Momentum (${elasticMult}x)`
      : timer.mode === 'BREAK_L1'
      ? `Same-Task Micro-Reset (${timer.l1DurationMinutes}m)`
      : timer.mode === 'BREAK_L2'
      ? `Task-Switch Buffer (${timer.l2DurationMinutes}m)`
      : timer.mode === 'BREAK_L3'
      ? `Mid-Day Reset (${timer.l3DurationMinutes}m)`
      : `Stress / Fatigue Reset (${timer.stressDurationMinutes}m)`;

  const activeDisplayedStartupPrompt = getShrunkStartupPrompt(
    timer.activeStartupPrompt,
    timer.activeTaskTitle,
    timer.activeTaskType,
    shrinkLevel
  );

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

    const floorLen = state.baselineBlocks.length || 7;
    const exceedsClosedListCap = state.projectQueue.length >= 3;
    const forcesSurgeDay =
      state.loadMode !== 'SURGE' &&
      floorLen + blocks > state.customModeBlockAdjustment;

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
            : `Adding a ${blocks}-block deliverable alongside the ${floorLen}-block Baseline Floor would force a Surge day.`,
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

  const totalProgressPct =
    metrics.totalTargetBlocks > 0
      ? Math.min(
          100,
          Math.round((metrics.totalCompletedBlocks / metrics.totalTargetBlocks) * 100)
        )
      : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8 animate-tab-enter pb-10">
      {/* Contextual State-Machine Alerts (Only when active) */}
      {metrics.isZeroWorkLeft && (
        <div
          id="end-of-shift-lock-banner"
          className="p-5 rounded-3xl bento-hero-border-evening text-amber-100 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-full bg-amber-500/15 border border-amber-400/35 flex items-center justify-center">
              <Lock className="w-4 h-4 text-amber-300 shrink-0" />
            </div>
            <div>
              <h2 className="font-serif text-xl sm:text-2xl text-amber-50 font-medium tracking-tight">
                End-of-Shift Lock Engaged • [0m work left]
              </h2>
              <p className="text-xs text-amber-100/75">
                Daily work quota complete. Transition to the Evening Recharge Menu or open Flow Extension.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              triggerHaptic([20]);
              onGoToRecharge();
            }}
            className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs cursor-pointer"
          >
            Enter Evening Recharge →
          </button>
        </div>
      )}

      {isSurgeMidDayResetRequired && !metrics.isZeroWorkLeft && (
        <div
          id="surge-midday-reset-alert"
          className="p-5 rounded-3xl bento-surface border-amber-400/35 text-amber-100 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h2 className="font-serif text-xl text-amber-50 font-medium">
                Mandatory 60–120m Mid-Day Reset Required
              </h2>
              <p className="text-xs text-amber-100/75">
                7 blocks completed in Surge Mode. Complete a physical reset before unlocking blocks 8–{state.customModeBlockAdjustment}.
              </p>
            </div>
          </div>
          <button
            id="btn-start-surge-midday-reset"
            type="button"
            onClick={onTriggerMidDayReset}
            className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-medium text-xs font-mono cursor-pointer"
          >
            Start {timer.l3DurationMinutes}m Mid-Day Reset
          </button>
        </div>
      )}

      {/* =====================================================================
          VISUAL GROUP 1: CENTERPIECE CHRONOGRAPH & ACTIVE "UP NEXT" ACTION
          Unified, spacious focal stage (p-8 to p-10, max-w-4xl mx-auto)
         ===================================================================== */}
      <section
        id="focal-chronograph-stage"
        aria-label="Centerpiece Chronograph and Active Up Next Stage"
        className={`rounded-3xl bento-surface p-8 sm:p-10 transition-all duration-500 space-y-8 ${
          isCinemaReceding
            ? 'border-sky-400/30 shadow-[0_0_60px_-15px_rgba(56,189,248,0.22)]'
            : ''
        }`}
      >
        {/* Top Row of Focal Stage: Single Status Pill + Subtle "Options" Pill */}
        <div className="flex items-center justify-between gap-3">
          <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05] font-mono text-[11px] text-slate-300 tracking-tight tabular-nums">
            {metrics.durationPrefix}
          </span>

          <div className="flex items-center gap-2">
            <button
              id="btn-focal-stage-options"
              type="button"
              onClick={() => {
                triggerHaptic([8]);
                setStageOptionsOpen((prev) => !prev);
              }}
              className={`px-3 py-1 rounded-full border text-xs font-mono flex items-center gap-1.5 cursor-pointer transition ${
                stageOptionsOpen
                  ? 'bg-white/[0.09] border-white/[0.15] text-white'
                  : 'bg-white/[0.025] hover:bg-white/[0.06] border-white/[0.05] text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sliders className="w-3 h-3" />
              <span>Options</span>
              {stageOptionsOpen ? (
                <ChevronUp className="w-3 h-3" />
              ) : (
                <ChevronDown className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>

        {/* Unified Centerpiece Grid: Left = Chronograph Dial, Right = Active & Up Next Action */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          {/* Left 5 Cols: Chronograph Dial + Primary Transport */}
          <div className="lg:col-span-5 flex flex-col items-center space-y-5">
            <DualRingTimerSvg
              timer={timer}
              isEveningTheme={metrics.isZeroWorkLeft}
              formattedTime={formatMMSS(timer.secondsLeft)}
              stageBadgeText={stageBadgeText}
              durationPrefix={metrics.durationPrefix}
              onToggleRun={() => {
                triggerHaptic([15]);
                onToggleTimerRun();
              }}
              onOpenMiniHudPip={onOpenMiniHudPip}
              isMiniHudOpen={isMiniHudOpen}
              autoFloatOnTabSwitch={autoFloatOnTabSwitch}
              onToggleAutoFloatOnTabSwitch={onToggleAutoFloatOnTabSwitch}
              cinemaFocusMode={cinemaFocusMode}
              onToggleCinemaFocusMode={onToggleCinemaFocusMode}
              startupSeconds={activeDurations.startupSeconds}
              momentumSeconds={activeDurations.momentumSeconds}
            />

            {/* Sleek Transport Bar */}
            <div className="flex items-center justify-center gap-2.5 w-full max-w-[280px]">
              <button
                id="btn-hud-timer-start-pause"
                type="button"
                onClick={() => {
                  triggerHaptic([15]);
                  onToggleTimerRun();
                }}
                className={`flex-1 py-2.5 px-5 rounded-full font-mono font-medium text-xs flex items-center justify-center gap-2 cursor-pointer transition ${
                  timer.isRunning
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                }`}
              >
                {timer.isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>
                      {timer.mode === 'WORK_20M' && timer.workStage === 'IGNITION_5M'
                        ? `Start ${activeDurations.startupMinutes}m`
                        : 'Start'}
                    </span>
                  </>
                )}
              </button>

              <button
                id="btn-hud-timer-skip-stage"
                type="button"
                onClick={() => {
                  triggerHaptic([15]);
                  onFastForwardCurrentStage();
                }}
                className="p-2.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-slate-300 hover:text-white cursor-pointer"
                title="Skip stage [S]"
                aria-label="Skip current stage"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>

              <button
                id="btn-hud-timer-reset"
                type="button"
                onClick={() => {
                  triggerHaptic([10]);
                  onResetCurrentStage();
                }}
                className="p-2.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Reset current stage [R]"
                aria-label="Reset current stage"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Right 7 Cols: Active Task + 5m Startup Script + "Up Next" Action */}
          <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
            {/* Active Task Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/25 font-mono text-[10px] uppercase tracking-widest text-cyan-200">
                  {timer.activeTaskType}
                </span>
              </div>

              <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-white leading-tight">
                <InlineEditableText
                  value={timer.activeTaskTitle}
                  onSave={(newTitle) => {
                    onUpdateActiveTimerTask?.({ title: newTitle });
                    if (
                      primaryProject &&
                      timer.activeBlockSourceId === primaryProject.id
                    ) {
                      onUpdateProjectItem?.(primaryProject.id, { title: newTitle });
                    } else {
                      const matchBase = state.baselineBlocks.find(
                        (b) => b.id === timer.activeBlockSourceId
                      );
                      if (matchBase) {
                        onUpdateBaselineBlock?.(matchBase.id, { title: newTitle });
                      }
                    }
                  }}
                />
              </h2>

              {/* 5m Startup Step Prompt */}
              <div
                id="hud-active-startup-script"
                className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-widest text-amber-300/90">
                  <span className="flex items-center gap-1.5">
                    <Flame className="w-3 h-3 text-amber-400" />
                    <span>
                      {shrinkLevel === 1
                        ? `${activeDurations.startupMinutes}m Startup Step`
                        : shrinkLevel === 2
                        ? 'Level 2 • Micro-Setup'
                        : 'Level 3 • Zero-Pressure Entry'}
                    </span>
                  </span>
                </div>
                <div
                  id="hud-startup-script-text"
                  className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal"
                >
                  <InlineEditableText
                    value={activeDisplayedStartupPrompt}
                    onSave={(newStartup) => {
                      onUpdateActiveTimerTask?.({ startupPrompt: newStartup });
                      if (
                        primaryProject &&
                        timer.activeBlockSourceId === primaryProject.id
                      ) {
                        onUpdateProjectItem?.(primaryProject.id, {
                          startupStep: newStartup,
                        });
                      } else {
                        const matchBase = state.baselineBlocks.find(
                          (b) => b.id === timer.activeBlockSourceId
                        );
                        if (matchBase) {
                          onUpdateBaselineBlock?.(matchBase.id, {
                            startupStep: newStartup,
                          });
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Unified "Up Next" Queue Action Bar */}
            <motion.div
              id="bento-up-next-hero"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={(_, info) => {
                if (metrics.isZeroWorkLeft || isSurgeMidDayResetRequired) return;
                if (info.offset.x > 65 || info.velocity.x > 340) {
                  triggerHaptic([15]);
                  soundEngine.playTactileClick('MODE_TOGGLE');
                  onLaunchBlockInTimer(
                    upNextBlock.sourceId,
                    upNextBlock.title,
                    upNextBlock.taskType,
                    upNextBlock.startupStep
                  );
                } else if (
                  (info.offset.x < -65 || info.velocity.x < -340) &&
                  upNextBlock.taskType === 'FLASHCARDS'
                ) {
                  triggerHaptic([15]);
                  soundEngine.playTactileClick('MODE_TOGGLE');
                  onToggleEarlyClearance();
                }
              }}
              className="p-4 sm:p-5 rounded-2xl bg-white/[0.025] border border-white/[0.05] flex flex-wrap items-center justify-between gap-4 cursor-grab active:cursor-grabbing"
              title="Swipe Right to launch 5m Startup Step"
            >
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                    Up Next • {upNextBlock.badge}
                  </span>
                </div>
                <div className="font-serif text-xl sm:text-2xl font-medium text-slate-100 truncate">
                  <InlineEditableText
                    value={upNextBlock.title}
                    onSave={(newVal) => {
                      const base = state.baselineBlocks.find(
                        (b) => b.id === upNextBlock.sourceId
                      );
                      if (base) {
                        onUpdateBaselineBlock?.(base.id, { title: newVal });
                      } else if (primaryProject) {
                        onUpdateProjectItem?.(primaryProject.id, { title: newVal });
                      }
                    }}
                  />
                </div>
                <div className="text-xs text-slate-400 truncate">
                  <InlineEditableText
                    value={upNextBlock.startupStep}
                    onSave={(newVal) => {
                      const base = state.baselineBlocks.find(
                        (b) => b.id === upNextBlock.sourceId
                      );
                      if (base) {
                        onUpdateBaselineBlock?.(base.id, { startupStep: newVal });
                      } else if (primaryProject) {
                        onUpdateProjectItem?.(primaryProject.id, {
                          startupStep: newVal,
                        });
                      }
                    }}
                  />
                </div>
              </div>

              <button
                id="btn-up-next-launch"
                type="button"
                disabled={metrics.isZeroWorkLeft || isSurgeMidDayResetRequired}
                onClick={() => {
                  triggerHaptic([15]);
                  soundEngine.playTactileClick('MODE_TOGGLE');
                  onLaunchBlockInTimer(
                    upNextBlock.sourceId,
                    upNextBlock.title,
                    upNextBlock.taskType,
                    upNextBlock.startupStep
                  );
                }}
                className="px-4 py-2.5 rounded-full bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.08] disabled:opacity-40 text-white font-mono text-xs font-medium flex items-center gap-2 cursor-pointer shrink-0 transition"
              >
                <Play className="w-3 h-3 fill-current text-cyan-300" />
                <span>Queue {activeDurations.startupMinutes}m</span>
              </button>
            </motion.div>

            {/* Active Stress Reset 4-7-8 Visualizer or Post-Reset 5m Flashcard Ramp */}
            {timer.mode === 'STRESS_RESET' && (
              <div className="space-y-3 pt-2 border-t border-white/[0.05]">
                <BreathingVisualizer478
                  id="hud-breathing-478"
                  isActiveContext={true}
                  defaultExpanded={true}
                  variant="slate"
                  compact={true}
                />
                <button
                  type="button"
                  onClick={onCompleteStressResetInto5mFlashcards}
                  className="w-full py-2.5 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-medium text-xs cursor-pointer"
                >
                  Finish Reset → Queue 5m Flashcard Ramp
                </button>
              </div>
            )}

            {timer.queuedRecoveryFlashcard5m && (
              <div
                id="hud-queued-5m-flashcard"
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-400/30 text-emerald-100 flex flex-wrap items-center justify-between gap-3"
              >
                <div className="space-y-0.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300">
                    Post-Reset 5m Flashcard Ramp
                  </span>
                  <div className="font-mono text-lg font-light tabular-nums text-emerald-100">
                    {formatMMSS(timer.recoveryFlashcardSecondsLeft)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={onToggleRecoveryFlashcardTimer}
                    className="py-1.5 px-3.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-medium text-xs cursor-pointer"
                  >
                    {timer.recoveryFlashcardRunning ? 'Pause 5m' : 'Start 5m'}
                  </button>
                  <button
                    type="button"
                    onClick={onCompleteRecoveryFlashcard5m}
                    className="py-1.5 px-3.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-emerald-100 font-mono text-xs cursor-pointer"
                  >
                    Complete
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Collapsible "Options" Tray (Shrink Step, Elastic 0.5x/1x/2x, Bandwidth, Load Mode, Recalibrate) */}
        <AnimatePresence>
          {stageOptionsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden pt-6 border-t border-white/[0.05] space-y-5"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Shrink Startup Step (3-Tier De-Escalator) */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2.5">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Startup Step Friction</span>
                    <span className="text-amber-300">Tier {shrinkLevel}/3</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {([1, 2, 3] as StartupShrinkLevel[]).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => {
                          triggerHaptic([10]);
                          onShrinkStartupStep(lvl);
                        }}
                        className={`py-1.5 rounded-xl font-mono text-xs border cursor-pointer ${
                          shrinkLevel === lvl
                            ? 'bg-amber-400/20 border-amber-400/50 text-amber-100 font-medium'
                            : 'bg-white/[0.02] border-white/[0.05] text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        L{lvl}
                      </button>
                    ))}
                  </div>
                  <button
                    id="btn-shrink-startup-step"
                    type="button"
                    onClick={() => {
                      triggerHaptic([12]);
                      onShrinkStartupStep();
                    }}
                    className="w-full py-1.5 px-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/25 text-[11px] font-mono text-amber-200 cursor-pointer"
                  >
                    {shrinkLevel < 3
                      ? 'Shrink Startup Step →'
                      : 'Reset to Level 1 →'}
                  </button>
                </div>

                {/* 2. Elastic Block Multiplier (0.5x / 1.0x / 2.0x) */}
                <div
                  id="hud-elastic-block-accordion"
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Elastic Block Size</span>
                    <span className="text-cyan-300">{elasticMult.toFixed(1)}x</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { mult: 0.5 as ElasticBlockMultiplier, label: '0.5x (10m)' },
                        { mult: 1.0 as ElasticBlockMultiplier, label: '1x (20m)' },
                        { mult: 2.0 as ElasticBlockMultiplier, label: '2x (40m)' },
                      ] as const
                    ).map((opt) => {
                      const isSelected = elasticMult === opt.mult;
                      return (
                        <button
                          key={opt.mult}
                          id={`btn-elastic-${String(opt.mult).replace('.', '_')}`}
                          type="button"
                          onClick={() => {
                            triggerHaptic([12]);
                            onSelectElasticMultiplier(opt.mult);
                          }}
                          className={`py-1.5 px-2 rounded-xl border font-mono text-[11px] transition cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100 font-medium'
                              : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-slate-400'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] font-mono text-slate-500">
                    {activeDurations.startupMinutes}m startup + {activeDurations.momentumMinutes}m momentum
                  </p>
                </div>

                {/* 3. Energy Bandwidth Router (Sharp | Steady | Low/Foggy) */}
                <div
                  id="energy-bandwidth-switcher"
                  className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.05] space-y-2.5"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span>Bandwidth Router</span>
                    <span className="text-slate-300">{energyBandwidth}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: 'SHARP' as EnergyBandwidthState, label: 'Sharp' },
                        { id: 'STEADY' as EnergyBandwidthState, label: 'Steady' },
                        { id: 'LOW_FOGGY' as EnergyBandwidthState, label: 'Low/Fog' },
                      ] as const
                    ).map((bw) => (
                      <button
                        key={bw.id}
                        id={`btn-bandwidth-${bw.id.toLowerCase()}`}
                        type="button"
                        onClick={() => {
                          triggerHaptic([12]);
                          onSetEnergyBandwidth(bw.id);
                        }}
                        className={`py-1.5 px-2 rounded-xl font-mono text-[11px] border transition cursor-pointer ${
                          energyBandwidth === bw.id
                            ? 'bg-white/[0.1] border-white/[0.2] text-white font-medium'
                            : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-slate-400'
                        }`}
                      >
                        {bw.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] font-mono text-slate-500">
                    Auto-routes Up Next to match cognitive energy
                  </p>
                </div>
              </div>

              {/* Load Mode & Recalibrate Bar inside Options */}
              <div className="pt-3 border-t border-white/[0.05] flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { mode: 'CRUISE' as LoadMode, label: 'Cruise (11–12)', defaultBlocks: 12 },
                      {
                        mode: 'SURGE' as LoadMode,
                        label: `Surge (14–15 • ${state.surgeConsecutiveDays}/2d)`,
                        defaultBlocks: 14,
                      },
                      { mode: 'TAPER' as LoadMode, label: 'Taper / Lab (7–9)', defaultBlocks: 8 },
                    ] as const
                  ).map((item) => {
                    const active = state.loadMode === item.mode && !state.preExamTaperActive;
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
                        onClick={() => onSelectLoadMode(item.mode, item.defaultBlocks, false)}
                        className={`px-3 py-1 rounded-full font-mono text-[11px] border transition cursor-pointer ${
                          active
                            ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-100 font-medium'
                            : surgeLocked
                            ? 'bg-red-950/20 border-red-800/30 text-red-300/50 cursor-not-allowed'
                            : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-slate-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    );
                  })}

                  <button
                    id="btn-toggle-pre-exam-taper"
                    type="button"
                    onClick={() => {
                      triggerHaptic([15]);
                      onTogglePreExamTaper();
                    }}
                    className={`px-3 py-1 rounded-full font-mono text-[11px] border transition cursor-pointer flex items-center gap-1.5 ${
                      state.preExamTaperActive
                        ? 'bg-indigo-500/20 border-indigo-400/50 text-indigo-100 font-medium'
                        : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-slate-400'
                    }`}
                  >
                    <GraduationCap className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Pre-Exam Taper{state.preExamTaperActive ? ' (ON)' : ''}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    id="select-fixed-event"
                    value={state.fixedEvent}
                    onChange={(e) => onSetFixedEvent(e.target.value as FixedEventType)}
                    className="bg-black/40 border border-white/[0.07] rounded-full px-3 py-1 text-[11px] font-mono text-slate-300"
                  >
                    <option value="NONE">Fixed Event: None</option>
                    <option value="LAB_2H">09:00–11:00 AM Lab (~2h)</option>
                    <option value="VOLUNTEER">01:00–03:00 PM Volunteer</option>
                    <option value="EVENING_OUTING_6PM">
                      {state.earlyEveningShutdownTime || '6:00 PM'} Evening Outing
                    </option>
                  </select>

                  <button
                    id="btn-recalibrate-day"
                    type="button"
                    onClick={() => {
                      triggerHaptic([12]);
                      setRecalibrateWizardOpen(!recalibrateWizardOpen);
                    }}
                    className="px-3 py-1 rounded-full bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/30 text-amber-200 font-mono text-[11px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Shock Absorber / Recalibrate</span>
                  </button>
                </div>
              </div>

              {/* Shock Absorber Panel inside Options when toggled */}
              {recalibrateWizardOpen && (
                <div
                  id="recalibrate-day-wizard"
                  className="p-4 rounded-2xl bg-black/40 border border-amber-400/30 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-amber-200 font-medium">
                      Mid-Shift Shock Absorber &amp; Recalibration
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      {metrics.totalCompletedBlocks}/{metrics.totalTargetBlocks} blks
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {(
                      [
                        {
                          mode: 'FULL_SHIFT' as ShockAbsorberMode,
                          title: 'Full Shift (12b)',
                          defaultCap: 12,
                        },
                        {
                          mode: 'HALF_SHIFT' as ShockAbsorberMode,
                          title: 'Half Shift (6b)',
                          defaultCap: 6,
                        },
                        {
                          mode: 'MVF_FLOOR' as ShockAbsorberMode,
                          title: 'Minimum Floor (4b)',
                          defaultCap: 4,
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.mode}
                        id={`btn-shock-mode-${opt.mode.toLowerCase()}`}
                        type="button"
                        onClick={() => {
                          setShockAbsorberSelection(opt.mode);
                          setShockAbsorberSliderBlocks(opt.defaultCap);
                        }}
                        className={`p-2.5 rounded-xl border text-left font-mono text-xs cursor-pointer ${
                          shockAbsorberSelection === opt.mode
                            ? 'bg-amber-400/15 border-amber-400/50 text-amber-100'
                            : 'bg-white/[0.02] border-white/[0.05] text-slate-300'
                        }`}
                      >
                        {opt.title}
                      </button>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2">
                      <button
                        id="btn-recalibrate-option-a"
                        type="button"
                        onClick={() => {
                          onRecalibrateStepDownTier();
                          setRecalibrateWizardOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] font-mono text-[11px] text-slate-200 cursor-pointer"
                      >
                        Step Down 1 Tier
                      </button>
                      <button
                        id="btn-recalibrate-option-b"
                        type="button"
                        onClick={() => {
                          onRecalibrateReSequenceNow();
                          setProgressChecklistOpen(true);
                          setSequentialViewOpen(true);
                          setRecalibrateWizardOpen(false);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] font-mono text-[11px] text-cyan-200 cursor-pointer"
                      >
                        Re-Sequence Now
                      </button>
                    </div>

                    <button
                      id="btn-apply-shock-absorber"
                      type="button"
                      onClick={() => {
                        onApplyShockAbsorber(
                          shockAbsorberSelection,
                          shockAbsorberSelection === 'FULL_SHIFT'
                            ? 12
                            : shockAbsorberSliderBlocks
                        );
                        setRecalibrateWizardOpen(false);
                      }}
                      className="px-4 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-medium text-xs cursor-pointer"
                    >
                      Apply Ceiling ({shockAbsorberSelection === 'FULL_SHIFT' ? 12 : shockAbsorberSliderBlocks}b)
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* =====================================================================
          VISUAL GROUP 2: MINIMALIST PROGRESS STRIP
          Single ultra-clean horizontal progress strip (`Baseline 4/7 • Focus #1: Paper 2/8`)
          with inline slot editing directly on the strip and inside the checklist.
         ===================================================================== */}
      <section
        id="minimalist-progress-strip-section"
        aria-label="Daily Baseline and Focus #1 Progress"
        className={`rounded-3xl bento-surface transition-all duration-500 overflow-hidden ${
          isCinemaReceding
            ? 'opacity-15 blur-[2px] hover:opacity-100 hover:blur-0'
            : ''
        }`}
      >
        <div
          id="btn-toggle-minimalist-progress-strip"
          onClick={() => {
            triggerHaptic([10]);
            setProgressChecklistOpen((prev) => !prev);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setProgressChecklistOpen((prev) => !prev);
            }
          }}
          aria-expanded={progressChecklistOpen}
          className="w-full px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left cursor-pointer hover:bg-white/[0.015] transition"
        >
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
            <span className="font-mono text-xs sm:text-sm text-slate-200 tracking-tight tabular-nums">
              Baseline{' '}
              <span className="text-cyan-300 font-medium">
                {metrics.completedBaselineCount}/{totalBaselineFloorBlocks}
              </span>
            </span>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onAddBaselineBlock?.();
                setProgressChecklistOpen(true);
              }}
              title="Add Daily Baseline Habit Slot"
              className="px-2 py-0.5 rounded-full bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 text-[10px] font-mono text-teal-200 inline-flex items-center gap-1 transition"
            >
              <Plus className="w-3 h-3" />
              <span>+ Add Baseline Habit</span>
            </button>

            <span className="text-slate-600">•</span>

            <span className="font-mono text-xs sm:text-sm text-slate-200 tracking-tight tabular-nums truncate flex items-center gap-1.5">
              <span>Focus #{primaryProject?.slot || 1}:</span>
              {primaryProject ? (
                <>
                  <InlineEditableText
                    value={primaryProject.title}
                    onSave={(val) =>
                      onUpdateProjectItem?.(primaryProject.id, { title: val })
                    }
                    textClassName="font-serif text-base sm:text-lg text-white font-medium"
                  />
                  <span className="text-emerald-300 font-medium">
                    {primaryProject.completedBlocks}/{primaryProject.totalBlocks}
                  </span>
                </>
              ) : (
                <span className="font-serif text-base sm:text-lg text-white font-medium">
                  None
                </span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <div className="w-28 sm:w-36 h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                style={{ width: `${totalProgressPct}%` }}
              />
            </div>

            <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
              <span>{progressChecklistOpen ? 'Collapse' : 'Checklist'}</span>
              {progressChecklistOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </span>
          </div>
        </div>

        {/* Expanded Checklist Drawer (Only rendered when clicked) */}
        <AnimatePresence>
          {progressChecklistOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-6 sm:px-8 pb-8 pt-4 border-t border-white/[0.05] space-y-6"
            >
              {/* Two-Column Expanded Baseline & Focus #1 Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left Column: Daily Core Baseline (Inline Editable + Legacy Avery Segments) */}
                <div
                  id="bento-baseline-card"
                  className="p-5 rounded-2xl bg-white/[0.015] border border-white/[0.05] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                        Daily Core Baseline
                      </span>
                      <h3 className="font-serif text-2xl font-medium text-white">
                        {totalBaselineFloorBlocks}-Block Floor ({state.baselineBlocks.length} Slots)
                      </h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => onAddBaselineBlock?.()}
                        className="px-2.5 py-1 rounded-full bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/40 font-mono text-[10px] text-teal-200 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>+ Add Baseline Habit</span>
                      </button>
                      <button
                        id="btn-toggle-early-clearance"
                        type="button"
                        disabled={metrics.isZeroWorkLeft}
                        onClick={() => {
                          triggerHaptic([15]);
                          onToggleEarlyClearance();
                        }}
                        className={`px-2.5 py-1 rounded-full border font-mono text-[10px] transition cursor-pointer ${
                          state.earlyClearanceEnabled
                            ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.05] text-slate-300'
                        }`}
                      >
                        {state.earlyClearanceEnabled
                          ? '✓ Early Clearance Banked'
                          : 'Early Clearance'}
                      </button>
                    </div>
                  </div>

                  {/* Direct Inline Baseline Slots List (Rename, 1b-6b target, 5m startup script, Early Clearance, Late-Night Blocker, Delete x) */}
                  <div className="space-y-2">
                    {state.baselineBlocks.map((b) => {
                      const slotTarget = getBaselineSlotTargetBlocks(b);
                      const slotDone = getBaselineSlotCompletedBlocks(b);
                      const isEarlyElig = isBaselineSlotEarlyClearanceEligible(b);
                      const isLateBlocked = isBaselineSlotLateNightBlocked(b);
                      const blockedAsFinal =
                        isFinalBlockOfNight &&
                        isLateBlocked &&
                        !b.completed &&
                        !b.bankedViaEarlyClearance;
                      const isCanceledByTaper =
                        state.preExamTaperActive && b.category === 'SYNTHESIS';
                      const isEditingThisSlot = editingBaselineSlotId === b.id;

                      return (
                        <div
                          key={b.id}
                          id={`pill-segment-${b.id}`}
                          className={`p-3 rounded-xl border transition ${
                            isCanceledByTaper
                              ? 'bg-indigo-950/25 border-indigo-500/30 text-indigo-300/60'
                              : b.completed
                              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100'
                              : b.bankedViaEarlyClearance
                              ? 'bg-cyan-500/15 border-cyan-400/35 text-cyan-100'
                              : blockedAsFinal
                              ? 'bg-red-950/25 border-red-800/40 text-red-300/60'
                              : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.06] text-slate-200'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <button
                                type="button"
                                disabled={
                                  metrics.isZeroWorkLeft ||
                                  blockedAsFinal ||
                                  isCanceledByTaper
                                }
                                onClick={() => {
                                  triggerHaptic([10]);
                                  setSelectedBaselineId(b.id);
                                  onToggleBaselineBlock(b.id);
                                }}
                                title="Click to log/toggle block completion"
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 cursor-pointer ${
                                  b.completed
                                    ? 'bg-emerald-400 border-emerald-300 text-slate-950'
                                    : b.bankedViaEarlyClearance
                                    ? 'bg-cyan-400 border-cyan-300 text-slate-950'
                                    : 'bg-slate-900 border-slate-700 text-transparent hover:border-teal-400'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>

                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-white flex flex-wrap items-center gap-1.5">
                                  <InlineEditableText
                                    value={b.title}
                                    onSave={(newTitle) =>
                                      onUpdateBaselineBlock?.(b.id, {
                                        title: newTitle,
                                      })
                                    }
                                  />
                                  {isEarlyElig && (
                                    <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[9px] font-mono text-emerald-300">
                                      Early Clearance
                                    </span>
                                  )}
                                  {isLateBlocked && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-mono text-amber-300">
                                      Late-Night Blocker
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-400 mt-0.5">
                                  <InlineEditableText
                                    value={b.startupStep}
                                    onSave={(newStartup) =>
                                      onUpdateBaselineBlock?.(b.id, {
                                        startupStep: newStartup,
                                      })
                                    }
                                    placeholder="5m startup script..."
                                  />
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <select
                                value={slotTarget}
                                onChange={(e) =>
                                  onUpdateBaselineBlock?.(b.id, {
                                    targetBlocks: Number(e.target.value) || 1,
                                  })
                                }
                                title="Block Target (1b–6b)"
                                className="px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 font-mono text-[10px] text-teal-300 cursor-pointer"
                              >
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                  <option key={n} value={n}>
                                    {slotDone}/{n}b
                                  </option>
                                ))}
                              </select>

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingBaselineSlotId((prev) =>
                                    prev === b.id ? null : b.id
                                  )
                                }
                                title="Configure Slot (Early Clearance, Late-Night Blocker, Track)"
                                className={`p-1 rounded border text-slate-400 hover:text-teal-300 transition ${
                                  isEditingThisSlot
                                    ? 'bg-teal-500/20 border-teal-400 text-teal-200'
                                    : 'bg-slate-900/70 border-slate-800'
                                }`}
                              >
                                <Pencil className="w-3 h-3" />
                              </button>

                              {state.baselineBlocks.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteBaselineBlock?.(b.id)}
                                  title="Delete Baseline Slot (x)"
                                  className="p-1 rounded bg-slate-900/70 border border-slate-800 text-slate-500 hover:text-rose-400 transition"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {isEditingThisSlot && (
                            <InlineSlotEditor
                              block={b}
                              canDelete={state.baselineBlocks.length > 1}
                              onUpdate={(patch) =>
                                onUpdateBaselineBlock?.(b.id, patch)
                              }
                              onDelete={() => {
                                onDeleteBaselineBlock?.(b.id);
                                setEditingBaselineSlotId(null);
                              }}
                              onClose={() => setEditingBaselineSlotId(null)}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Card counter slider when Flashcard / Recall slots exist */}
                  {flashcardBlocks.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-white/[0.05]">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Active Recall / Flashcard Queue</span>
                        <span>
                          {state.flashcardsReviewedCount}/{state.flashcardsDailyCap} cards
                        </span>
                      </div>
                      <input
                        id="input-flashcard-count"
                        type="range"
                        min={0}
                        max={state.flashcardsDailyCap}
                        step={5}
                        value={state.flashcardsReviewedCount}
                        onChange={(e) => onUpdateFlashcardCount(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />
                    </div>
                  )}

                  {selectedBaseline && (
                    <div className="pt-2 border-t border-white/[0.05] flex items-center justify-between gap-2">
                      <span className="text-xs text-slate-300 truncate">
                        {selectedBaseline.title}
                      </span>
                      <button
                        id={`btn-launch-${selectedBaseline.id}`}
                        type="button"
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
                        className="px-3 py-1 rounded-full bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/40 text-cyan-200 font-mono text-[11px] cursor-pointer shrink-0"
                      >
                        Queue {activeDurations.startupMinutes}m
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Column: Locked Focus #1 Deliverable (Inline Editable Title, Block Count 1b-12b, 5m Startup Script) */}
                <div
                  id="bento-project-lock-card"
                  className="p-5 rounded-2xl bg-white/[0.015] border border-white/[0.05] flex flex-col justify-between space-y-4"
                >
                  {primaryProject ? (
                    <div id="project-card-slot-1" className="space-y-4">
                      {isDualSlotEnabled && (
                        <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/[0.05]">
                          <span className="text-[10px] font-mono uppercase text-indigo-300">
                            Dual-Slot Mode
                          </span>
                          <div className="flex items-center gap-1">
                            {([1, 2] as const).map((slotNum) => {
                              const pSlot = state.projectQueue.find(
                                (p) => p.slot === slotNum
                              );
                              if (!pSlot) return null;
                              return (
                                <button
                                  key={slotNum}
                                  id={`btn-dual-slot-${slotNum}`}
                                  type="button"
                                  onClick={() => onSetActiveDualSlotNumber(slotNum)}
                                  className={`px-2 py-0.5 rounded-full font-mono text-[10px] border cursor-pointer ${
                                    activeDualSlotNum === slotNum
                                      ? 'bg-indigo-400/20 border-indigo-400/50 text-indigo-100'
                                      : 'bg-white/[0.02] border-white/[0.05] text-slate-400'
                                  }`}
                                >
                                  #{slotNum}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300/90 flex items-center gap-1">
                            <Unlock className="w-3 h-3" />
                            <span>Locked Focus #{primaryProject.slot}</span>
                          </span>
                          <h3 className="font-serif text-2xl font-medium text-white mt-0.5">
                            <InlineEditableText
                              value={primaryProject.title}
                              onSave={(newTitle) =>
                                onUpdateProjectItem?.(primaryProject.id, {
                                  title: newTitle,
                                })
                              }
                            />
                          </h3>
                          <div className="text-xs text-slate-400 mt-1">
                            <span className="text-[10px] font-mono uppercase text-amber-300/80 mr-1.5">
                              5m Startup:
                            </span>
                            <InlineEditableText
                              value={primaryProject.startupStep}
                              onSave={(newStep) =>
                                onUpdateProjectItem?.(primaryProject.id, {
                                  startupStep: newStep,
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <select
                            aria-label="Focus #1 Block Count (1b-12b)"
                            value={primaryProject.totalBlocks}
                            onChange={(e) =>
                              onUpdateProjectItem?.(primaryProject.id, {
                                totalBlocks: Number(e.target.value) || 4,
                              })
                            }
                            title="Edit Deliverable Block Count (1b–12b)"
                            className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-400/30 font-mono text-xs tabular-nums text-emerald-200 cursor-pointer"
                          >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                              <option
                                key={n}
                                value={n}
                                className="bg-slate-950 text-slate-100"
                              >
                                {primaryProject.completedBlocks}/{n}b
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Segmented Blocks */}
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
                                className={`h-7 rounded-lg border font-mono text-[10px] flex items-center justify-center transition cursor-pointer ${
                                  filled
                                    ? 'bg-emerald-400/25 border-emerald-400/50 text-emerald-100'
                                    : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.05] text-slate-500'
                                }`}
                              >
                                {segIdx + 1}
                              </button>
                            );
                          }
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
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
                          className="flex-1 py-2 px-3 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-medium text-xs cursor-pointer"
                        >
                          Start {activeDurations.startupMinutes}m
                        </button>
                        <button
                          id="btn-log-project-1-block"
                          type="button"
                          onClick={() => onIncrementProjectBlock(primaryProject.id)}
                          className="py-2 px-3 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] text-slate-200 font-mono text-xs cursor-pointer"
                        >
                          +1 Block
                        </button>
                        <button
                          id="btn-complete-project-1"
                          type="button"
                          onClick={onCompleteProjectItem1}
                          className="py-2 px-3 rounded-full bg-emerald-400/20 hover:bg-emerald-400/30 border border-emerald-400/40 text-emerald-100 font-mono text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Complete</span>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-mono text-slate-400">
                      No active deliverable in Slot #1.
                    </div>
                  )}

                  {/* Secondary Accordions inside Checklist Drawer: Locked Queue #2/#3, Smart Intake, Sequential Checklist, 7-Day Table */}
                  <div className="pt-3 border-t border-white/[0.05] flex flex-wrap items-center gap-2">
                    <button
                      id="btn-toggle-locked-projects-drawer"
                      type="button"
                      onClick={() => setLockedDrawerOpen(!lockedDrawerOpen)}
                      className="px-2.5 py-1 rounded-full bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.05] text-[11px] font-mono text-slate-400 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3 h-3" />
                      <span>
                        Queue #2–#3 ({lockedSecondaryProjects.length}) • Backlog ({openBacklogList.length})
                      </span>
                    </button>

                    <button
                      id="btn-bounded-curiosity-sandbox"
                      type="button"
                      onClick={onLaunchBoundedCuriosityBlock}
                      className="px-2.5 py-1 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/25 text-[11px] font-mono text-indigo-200 cursor-pointer"
                    >
                      Curiosity Sandbox Block
                    </button>
                  </div>

                  {lockedDrawerOpen && (
                    <div className="space-y-2 pt-2">
                      {lockedSecondaryProjects.map((proj) => (
                        <div
                          key={proj.id}
                          id={`project-card-slot-${proj.slot}`}
                          className="p-2.5 rounded-xl bg-black/30 border border-white/[0.05] space-y-1.5 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-slate-200 font-medium truncate">
                              #{proj.slot}{' '}
                              <InlineEditableText
                                value={proj.title}
                                onSave={(val) =>
                                  onUpdateProjectItem?.(proj.id, { title: val })
                                }
                              />
                            </span>
                            <select
                              value={proj.totalBlocks}
                              onChange={(e) =>
                                onUpdateProjectItem?.(proj.id, {
                                  totalBlocks: Number(e.target.value) || 4,
                                })
                              }
                              className="bg-slate-950 border border-slate-700 rounded px-1.5 py-0.5 font-mono text-slate-300 text-[10px]"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                                <option key={n} value={n}>
                                  {proj.completedBlocks}/{n}b
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="text-[11px] text-slate-400">
                            <span className="font-mono text-[10px] text-slate-500 mr-1">
                              5m Startup:
                            </span>
                            <InlineEditableText
                              value={proj.startupStep}
                              onSave={(val) =>
                                onUpdateProjectItem?.(proj.id, { startupStep: val })
                              }
                            />
                          </div>
                        </div>
                      ))}

                      {/* Add Deliverable Form */}
                      <form
                        onSubmit={handleAddProjectSubmit}
                        className="p-2.5 rounded-xl bg-black/25 border border-white/[0.05] space-y-2"
                      >
                        <div className="flex flex-wrap gap-1.5">
                          <input
                            id="input-new-project-title"
                            type="text"
                            value={newProjTitle}
                            onChange={(e) => setNewProjTitle(e.target.value)}
                            placeholder="Add deliverable..."
                            className="flex-1 min-w-[130px] bg-slate-950 border border-white/[0.07] rounded-lg px-2.5 py-1 text-xs text-slate-100"
                          />
                          <select
                            id="select-new-project-preset"
                            value={newProjPreset}
                            onChange={(e) =>
                              setNewProjPreset(e.target.value as ProjectPresetType)
                            }
                            className="bg-slate-950 border border-white/[0.07] rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200"
                          >
                            <option value="PAPER_8">
                              {state.taskWeights?.heavyLabel || 'Major'} (
                              {state.taskWeights?.heavyBlocks || 8}b)
                            </option>
                            <option value="SLIDES_4">
                              {state.taskWeights?.mediumLabel || 'Medium'} (
                              {state.taskWeights?.mediumBlocks || 4}b)
                            </option>
                            <option value="QUICK_2">
                              {state.taskWeights?.quickLabel || 'Quick Sprint'} (
                              {state.taskWeights?.quickBlocks || 2}b)
                            </option>
                            <option value="CUSTOM">Custom</option>
                          </select>
                          <button
                            id="btn-submit-smart-intake"
                            type="submit"
                            className="px-2.5 py-1 rounded-lg bg-cyan-400 text-slate-950 font-mono text-xs font-medium cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                      </form>

                      {pendingIntakeTriage && (
                        <div
                          id="smart-intake-triage-prompt"
                          className="p-3 rounded-xl bg-amber-950/40 border border-amber-400/40 space-y-2"
                        >
                          <p className="text-xs text-amber-100">
                            {pendingIntakeTriage.reason}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <button
                              id="btn-intake-option-a"
                              type="button"
                              onClick={() => {
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
                              className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-mono text-xs cursor-pointer"
                            >
                              Option A: Promote + Surge
                            </button>
                            <button
                              id="btn-intake-option-b"
                              type="button"
                              onClick={() => {
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
                              className="px-3 py-1 rounded-lg bg-white/[0.06] text-cyan-100 font-mono text-xs cursor-pointer"
                            >
                              Option B: Open Backlog
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* On-Demand Collapsible Accordions for Sequential Checklist, Smart Intake, and 7-Day Table */}
              <div className="pt-3 border-t border-white/[0.05] flex flex-wrap items-center gap-2">
                <button
                  id="btn-toggle-sequential-checklist"
                  type="button"
                  onClick={() => setSequentialViewOpen(!sequentialViewOpen)}
                  className={`px-3 py-1.5 rounded-full border font-mono text-xs flex items-center gap-1.5 cursor-pointer ${
                    sequentialViewOpen
                      ? 'bg-cyan-400/20 border-cyan-400/50 text-cyan-100'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-slate-400'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" />
                  <span>Sequential 20m Checklist</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIntakeDrawerOpen(!intakeDrawerOpen)}
                  className={`px-3 py-1.5 rounded-full border font-mono text-xs flex items-center gap-1.5 cursor-pointer ${
                    intakeDrawerOpen
                      ? 'bg-cyan-400/20 border-cyan-400/50 text-cyan-100'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-slate-400'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Smart Intake Planner</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSevenDayAccordionOpen(!sevenDayAccordionOpen)}
                  className={`px-3 py-1.5 rounded-full border font-mono text-xs flex items-center gap-1.5 cursor-pointer ${
                    sevenDayAccordionOpen
                      ? 'bg-cyan-400/20 border-cyan-400/50 text-cyan-100'
                      : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-slate-400'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>7-Day Pipeline Table</span>
                </button>
              </div>

              {intakeDrawerOpen && (
                <div className="pt-2">
                  <SmartIntakeBar
                    state={state}
                    contextVariant="FOCUS_PIPELINE"
                    inputText={smartIntakeText}
                    onChangeInputText={onChangeSmartIntakeText}
                    previewPlan={smartIntakePreview}
                    onSetPreviewPlan={onSetSmartIntakePreview}
                    onApplyPlan={onApplySmartIntakePlan}
                    onOpenSettingsModal={onOpenStateModal}
                    onOpenCommandDock={onOpenCommandDock}
                    onUnlockArchitectMode={onUnlockArchitectMode}
                    apiKeyVersion={apiKeyVersion}
                  />
                </div>
              )}

              {sequentialViewOpen && (
                <div
                  id="sequential-checklist-view"
                  className="p-4 rounded-2xl bg-black/25 border border-white/[0.05] space-y-2 max-h-96 overflow-y-auto"
                >
                  {sequentialSteps.map((step) => (
                    <div
                      key={step.id}
                      id={`seq-row-${step.id}`}
                      onClick={() => handleClickSequentialStep(step)}
                      className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                        step.isCurrentNext
                          ? 'bg-cyan-500/10 border-cyan-400/40'
                          : step.completed || step.banked
                          ? 'bg-emerald-950/15 border-emerald-500/20 opacity-65'
                          : 'bg-white/[0.015] hover:bg-white/[0.04] border-white/[0.05]'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-xs font-medium text-white truncate">
                          #{step.stepNumber} • {step.title}
                        </div>
                        <div className="text-[11px] font-mono text-slate-400 truncate">
                          {step.startupStep}
                        </div>
                      </div>
                      <span className="font-mono text-[11px] text-cyan-200 tabular-nums shrink-0">
                        {step.countdownBadge}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {sevenDayAccordionOpen && (
                <div
                  id="bento-interactive-7day-pipeline"
                  className="p-4 rounded-2xl bg-black/25 border border-white/[0.05] space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-slate-300">
                      7-Day Master Pipeline
                    </span>
                    <button
                      type="button"
                      onClick={onOpenPipelineDrawer}
                      className="text-[11px] font-mono text-cyan-300 underline cursor-pointer"
                    >
                      Open Full Drawer →
                    </button>
                  </div>
                  <InteractivePipelineTable
                    state={state}
                    onUpdateDay={onUpdatePipelineDay}
                    compact={true}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      {/* =====================================================================
          VISUAL GROUP 3: QUIET SINGLE-LINE TRIAGE BAR
          Collapses break/reset cards into a single subtle bottom pill bar:
          `Micro-Reset 5m` • `Switch Buffer 15m` • `Stress Reset`
          Click the pencil on any Break pill to edit its custom recovery options on the spot.
         ===================================================================== */}
      <section
        id="bento-quick-triage-dock"
        aria-label="Quiet Single-Line Triage Bar"
        className={`rounded-3xl bento-surface px-5 py-3 space-y-2 transition-all duration-500 ${
          isCinemaReceding
            ? 'opacity-15 blur-[2px] hover:opacity-100 hover:blur-0'
            : ''
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                disabled={timer.chainedBlocksCount >= 2}
                onClick={() => {
                  triggerHaptic([10]);
                  onSelectL1Minutes(5);
                }}
                className={`px-3.5 py-1.5 rounded-full font-mono text-xs border transition cursor-pointer disabled:opacity-40 ${
                  timer.mode === 'BREAK_L1'
                    ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-100'
                    : 'bg-white/[0.025] hover:bg-white/[0.06] border-white/[0.05] text-slate-300'
                }`}
              >
                Micro-Reset {timer.l1DurationMinutes || 5}m
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditingBreakPill((prev) => (prev === 'L1' ? null : 'L1'))
                }
                title="Edit Micro-Reset 5m recovery options inline"
                className="p-1 rounded-full text-slate-500 hover:text-teal-300 hover:bg-slate-800/70 transition"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>

            <span className="text-slate-600 hidden sm:inline">•</span>

            <div className="inline-flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic([10]);
                  onSelectL2Minutes(15);
                }}
                className={`px-3.5 py-1.5 rounded-full font-mono text-xs border transition cursor-pointer ${
                  timer.mode === 'BREAK_L2'
                    ? 'bg-indigo-500/15 border-indigo-400/40 text-indigo-100'
                    : 'bg-white/[0.025] hover:bg-white/[0.06] border-white/[0.05] text-slate-300'
                }`}
              >
                Switch Buffer {timer.l2DurationMinutes || 15}m
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditingBreakPill((prev) => (prev === 'L2' ? null : 'L2'))
                }
                title="Edit Switch Buffer 15m recovery options inline"
                className="p-1 rounded-full text-slate-500 hover:text-teal-300 hover:bg-slate-800/70 transition"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>

            <span className="text-slate-600 hidden sm:inline">•</span>

            <div className="inline-flex items-center gap-1">
              <button
                id="btn-dock-stress-reset"
                type="button"
                onClick={() => {
                  triggerHaptic([20, 40, 20]);
                  onTriggerStressReset('BREATHING_478', 15);
                }}
                className={`px-3.5 py-1.5 rounded-full font-mono text-xs border flex items-center gap-1.5 transition cursor-pointer ${
                  timer.mode === 'STRESS_RESET'
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-100'
                    : 'bg-amber-500/[0.06] hover:bg-amber-500/15 border-amber-400/20 text-amber-200/90'
                }`}
              >
                <Wind className="w-3.5 h-3.5 text-amber-400" />
                <span>Stress Reset</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  setEditingBreakPill((prev) =>
                    prev === 'STRESS' ? null : 'STRESS'
                  )
                }
                title="Edit Stress Reset recovery options inline"
                className="p-1 rounded-full text-slate-500 hover:text-teal-300 hover:bg-slate-800/70 transition"
              >
                <Pencil className="w-3 h-3" />
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setTriageDetailsOpen((prev) => !prev)}
            className="px-3 py-1 rounded-full text-[11px] font-mono text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            <span>Protocols</span>
            {triageDetailsOpen ? (
              <ChevronUp className="w-3 h-3" />
            ) : (
              <ChevronDown className="w-3 h-3" />
            )}
          </button>
        </div>

        {editingBreakPill && state.breakOptions && (
          <InlineBreakOptionsEditor
            pillType={editingBreakPill}
            breakOptions={state.breakOptions}
            onUpdateBreakOptions={(patch) => onUpdateBreakOptions?.(patch)}
            onClose={() => setEditingBreakPill(null)}
          />
        )}
      </section>

      {/* Optional Triage Protocol Picker (Only when "Protocols" clicked) */}
      <AnimatePresence>
        {triageDetailsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-3xl bento-surface p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 overflow-hidden"
          >
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Same-Task Micro-Reset (Max 2 Chained)
              </span>
              <div className="flex gap-2">
                {([3, 5] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    disabled={timer.chainedBlocksCount >= 2}
                    onClick={() => onSelectL1Minutes(m)}
                    className={`flex-1 py-1.5 rounded-xl font-mono text-xs border cursor-pointer disabled:opacity-40 ${
                      timer.mode === 'BREAK_L1' && timer.l1DurationMinutes === m
                        ? 'bg-cyan-400/20 border-cyan-400/50 text-cyan-100'
                        : 'bg-white/[0.02] border-white/[0.05] text-slate-300'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Task-Switch Buffer (10–15m)
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    {
                      id: 'ESPRESSO' as Level2BreakProtocol,
                      label: state.breakOptions?.l2EspressoLabel || 'Espresso',
                      icon: Coffee,
                    },
                    {
                      id: 'BASS_GUITAR_5M' as Level2BreakProtocol,
                      label: state.breakOptions?.l2MusicLabel || '5m Cold Song',
                      icon: Music,
                    },
                    {
                      id: 'TENS_NORMATEC_15M' as Level2BreakProtocol,
                      label: state.breakOptions?.l2PhysicalLabel || '15m Normatec',
                      icon: Activity,
                    },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => onSelectL2Protocol(p.id)}
                    className={`px-2.5 py-1 rounded-xl font-mono text-[11px] border cursor-pointer ${
                      timer.l2Protocol === p.id
                        ? 'bg-indigo-400/20 border-indigo-400/50 text-indigo-100'
                        : 'bg-white/[0.02] border-white/[0.05] text-slate-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                Split-Shift Mid-Day Reset (60–120m)
              </span>
              <div className="flex gap-1.5">
                {([60, 90, 120] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => onSelectL3Minutes(m)}
                    className={`flex-1 py-1.5 rounded-xl font-mono text-xs border cursor-pointer ${
                      timer.mode === 'BREAK_L3' && timer.l3DurationMinutes === m
                        ? 'bg-emerald-400/20 border-emerald-400/50 text-emerald-100'
                        : 'bg-white/[0.02] border-white/[0.05] text-slate-300'
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
