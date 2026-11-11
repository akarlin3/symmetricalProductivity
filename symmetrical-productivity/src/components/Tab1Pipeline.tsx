import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Coffee,
  ExternalLink,
  FastForward,
  Flame,
  GraduationCap,
  Link2,
  ListOrdered,
  Lock,
  Music,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sliders,
  Sparkles,
  Unlock,
  Wind,
  X,
} from 'lucide-react';
import {
  BaselineBlock,
  CognitiveDemandTag,
  DailyAmbitionDripConfig,
  EarlyClearanceActionMode,
  ElasticBlockMultiplier,
  EnergyBandwidthState,
  FixedEventType,
  LayoutMode,
  Level2BreakProtocol,
  LoadMode,
  MajorSubTrackId,
  OpenListItem,
  PipelineDay,
  ProjectItem,
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
  getActiveAmbitionDripProject,
  getActiveBlockDurationsSeconds,
  getActiveFocusProject,
  getBaselineCognitiveDemand,
  getBaselineSlotCompletedBlocks,
  getBaselineSlotEffectiveTargetBlocks,
  getBaselineSlotTargetBlocks,
  getEffectiveDailyAmbitionDrip,
  getEffectiveScheduledBaselineFloorBlocks,
  getProjectActiveStartupStep,
  getProjectCognitiveDemand,
  getShrunkStartupPrompt,
  getTotalBaselineFloorBlocks,
  isBaselineSlotClearedForToday,
  isBaselineSlotEarlyClearanceEligible,
  isBaselineSlotLateNightBlocked,
  isOpenListItemUnlocked,
  isProjectAmbitionDripEligible,
  isTodayExamDay,
} from '../state/defaultState';
import { DualRingTimerSvg } from './DualRingTimerSvg';
import { BreathingVisualizer478 } from './BreathingVisualizer478';
import { InteractivePipelineTable } from './PipelineDrawer';
import { SmartIntakeBar } from './SmartIntakeBar';
import { InlineEditableText } from './InlineEditableText';
import { InlineBreakOptionsEditor, InlineSlotEditor } from './InlineSlotEditor';
import { triggerHaptic } from '../utils/haptics';
import { splitDeliverableWithGemini } from '../utils/geminiClient';
import {
  fetchAnkiConnectReviewedToday,
  isValidResourceLaunchUrl,
  openResourceLaunchUrl,
} from '../utils/ankiConnectClient';
import { soundEngine } from '../utils/soundEngine';

interface PendingIntakeDeliverable {
  title: string;
  presetType: ProjectPresetType;
  totalBlocks: number;
  trackId: TrackId;
  startupStep: string;
  blockSubSteps?: string[];
  blockedByTitle?: string;
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
  onApplySlotEarlyClearance?: (slotId: string | 'ALL_ELIGIBLE', mode: EarlyClearanceActionMode) => void;
  onRestoreSlotEarlyClearance?: (slotId: string) => void;
  onUpdateFlashcardCount: (count: number) => void;
  onToggleAnkiConnect?: (enabled: boolean) => void;
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
    startupStep: string,
    extra?: { blockSubSteps?: string[]; blockedByTitle?: string }
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
    startupStep: string,
    blockedByTitle?: string
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
    patch: Partial<ProjectItem>
  ) => void;
  onUpdateOpenListItem?: (
    itemId: string,
    patch: Partial<OpenListItem>
  ) => void;
  onUpdateActiveTimerTask?: (patch: { title?: string; startupPrompt?: string }) => void;
  onUpdateBreakOptions?: (
    patch: Partial<import('../types/symmetry').BreakOptionsConfig>
  ) => void;
  // Daily Ambition Drip ("Zero 100%-Institutional Days") handlers
  onUpdateDailyAmbitionDrip?: (patch: Partial<DailyAmbitionDripConfig>) => void;
  onToggleSovereignDripDone?: () => void;
  onToggleGoldenRuleMode?: () => void;
  onCompleteProjectById?: (projectId: string) => void;
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
  onUnlockArchitectMode,
  apiKeyVersion,
  onSelectLoadMode,
  onTogglePreExamTaper,
  onSetFixedEvent,
  onToggleBaselineBlock,
  onToggleEarlyClearance,
  onApplySlotEarlyClearance,
  onRestoreSlotEarlyClearance,
  onUpdateFlashcardCount,
  onToggleAnkiConnect,
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
  onSelectElasticMultiplier,
  onShrinkStartupStep,
  onApplyShockAbsorber,
  onSetActiveDualSlotNumber,
  onLaunchBoundedCuriosityBlock,
  onUpdateBaselineBlock,
  onAddBaselineBlock,
  onDeleteBaselineBlock,
  onUpdateProjectItem,
  onUpdateOpenListItem,
  onUpdateActiveTimerTask,
  onUpdateBreakOptions,
  onUpdateDailyAmbitionDrip,
  onToggleSovereignDripDone,
  onToggleGoldenRuleMode,
  onCompleteProjectById,
}) => {
  const metrics = computeShiftMetrics(state);
  const { timer } = state;
  const isCinemaReceding = Boolean(cinemaFocusMode);
  const activeDurations = getActiveBlockDurationsSeconds(state);
  const energyBandwidth: EnergyBandwidthState = state.energyBandwidth || 'STEADY';
  const elasticMult: ElasticBlockMultiplier = timer.elasticMultiplier ?? 1.0;
  const shrinkLevel: StartupShrinkLevel = timer.startupShrinkLevel ?? 1;
  const totalBaselineFloorBlocks = getTotalBaselineFloorBlocks(state.baselineBlocks);
  const effectiveScheduledFloorBlocks = getEffectiveScheduledBaselineFloorBlocks(
    state.baselineBlocks
  );

  // Daily Ambition Drip state
  const dripConfig = getEffectiveDailyAmbitionDrip(state);
  const examDayAutoPaused = isTodayExamDay(state);
  const activeAmbitionDripProj = getActiveAmbitionDripProject(state);
  const dripCompletedToday = dripConfig.completedToday >= dripConfig.targetBlocksPerDay;
  const isDripCapEnforced =
    dripCompletedToday && !state.recharge.flowExtensionActive;

  // Progressive Disclosure States
  const [stageOptionsOpen, setStageOptionsOpen] = useState(false);
  const [progressChecklistOpen, setProgressChecklistOpen] = useState(true);
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

  // 2-Way Early Clearance inline prompt state (slot id or 'ALL_ELIGIBLE')
  const [earlyClearanceChoiceSlotId, setEarlyClearanceChoiceSlotId] = useState<
    string | null
  >(null);
  const [zeroDueForcedPrompt, setZeroDueForcedPrompt] = useState(false);

  // Project Link / Sub-Steps / Open List Prereq inline editor states
  const [editingProjectLinkId, setEditingProjectLinkId] = useState<string | null>(null);
  const [splittingProjectId, setSplittingProjectId] = useState<string | null>(null);
  const [editingPrereqItemId, setEditingPrereqItemId] = useState<string | null>(null);
  const [prereqDraftText, setPrereqDraftText] = useState<string>('');

  // Flashcard manual tap-entry & AnkiConnect polling states
  const [editingCardCountInline, setEditingCardCountInline] = useState(false);
  const [cardCountDraft, setCardCountDraft] = useState<string>(
    String(state.flashcardsReviewedCount || 0)
  );
  const [ankiSyncLoading, setAnkiSyncLoading] = useState(false);
  const [ankiSyncStatus, setAnkiSyncStatus] = useState<string | null>(null);

  const [shockAbsorberSelection, setShockAbsorberSelection] = useState<ShockAbsorberMode>(
    state.shockAbsorberMode || 'HALF_SHIFT'
  );
  const [shockAbsorberSliderBlocks, setShockAbsorberSliderBlocks] = useState<number>(
    state.shockAbsorberMode === 'MVF_FLOOR' ? 4 : 6
  );

  const [selectedBaselineId, setSelectedBaselineId] = useState<string>(
    state.baselineBlocks.find((b) => !isBaselineSlotClearedForToday(b))?.id ||
      state.baselineBlocks[0]?.id ||
      'fc_anat_1'
  );
  const [newProjTitle, setNewProjTitle] = useState('');
  const [newProjPreset, setNewProjPreset] = useState<ProjectPresetType>('PAPER_8');
  const [newProjCustomBlocks] = useState(4);
  const [newProjTrack, setNewProjTrack] = useState<TrackId>('writing');
  const [newProjBlockedBy, setNewProjBlockedBy] = useState<string>('');
  const [newProjStartup] = useState(
    'Open document, create section headings, and draft first 3 lines.'
  );
  const [pendingIntakeTriage, setPendingIntakeTriage] =
    useState<PendingIntakeDeliverable | null>(null);

  const sequentialSteps = generateSequentialChecklist(state);

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

  // Active Focus Project respects Dual-Slot mode when enabled in Settings
  const primaryProject = getActiveFocusProject(state);
  const isDualSlotEnabled =
    state.flexibilityTuning?.closedListLockMode === 'DUAL_SLOT' &&
    state.projectQueue.length >= 2;
  const activeDualSlotNum =
    isDualSlotEnabled && state.flexibilityTuning?.activeDualSlotNumber === 2 ? 2 : 1;

  // Launch helper that honors optional auto-open launchUrl on "Start 5m Startup"
  const launchWithOptionalResource = (
    sourceId: string,
    title: string,
    taskType: 'FLASHCARDS' | 'READING' | 'SYNTHESIS' | 'PROJECT',
    startupPrompt: string,
    launchUrl?: string,
    autoLaunchUrl?: boolean
  ) => {
    if (autoLaunchUrl && isValidResourceLaunchUrl(launchUrl)) {
      openResourceLaunchUrl(launchUrl);
    }
    onLaunchBlockInTimer(sourceId, title, taskType, startupPrompt);
  };

  // Active item launchUrl lookup for Timer HUD
  const activeSourceResource = (() => {
    const baseMatch = state.baselineBlocks.find(
      (b) => b.id === timer.activeBlockSourceId
    );
    if (baseMatch) {
      return {
        launchUrl: baseMatch.launchUrl,
        autoLaunchUrl: baseMatch.autoLaunchUrl,
      };
    }
    const projMatch = state.projectQueue.find(
      (p) => p.id === timer.activeBlockSourceId
    );
    if (projMatch) {
      return {
        launchUrl: projMatch.launchUrl,
        autoLaunchUrl: projMatch.autoLaunchUrl,
      };
    }
    return { launchUrl: undefined, autoLaunchUrl: false };
  })();

  // Auto-Router: compute the exact "Up Next" recommended block based on Energy-State Bandwidth + Daily Ambition Drip capstone
  const eligibleBaselines = state.baselineBlocks.filter((b) => {
    if (isBaselineSlotClearedForToday(b)) return false;
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
    launchUrl?: string;
    autoLaunchUrl?: boolean;
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
      launchUrl: b.launchUrl,
      autoLaunchUrl: b.autoLaunchUrl,
    };
  };

  const projectRemainingBlocks = primaryProject
    ? Math.max(0, primaryProject.totalBlocks - primaryProject.completedBlocks)
    : 0;
  const totalDiscretionaryBudgetToday = Math.max(
    0,
    metrics.totalTargetBlocks - effectiveScheduledFloorBlocks
  );
  const remainingDiscretionaryToday = Math.max(
    0,
    totalDiscretionaryBudgetToday - state.discretionaryBlocksCompletedToday
  );
  const discretionaryQuotaAvailable = remainingDiscretionaryToday > 0;

  // Reserve 1 block/day on non-exam days for the active Ambition Drip slot as the capstone project block
  const shouldReserveDripCapstoneNow = Boolean(
    !examDayAutoPaused &&
      dripConfig.enabled &&
      !dripCompletedToday &&
      activeAmbitionDripProj &&
      activeAmbitionDripProj.completedBlocks < activeAmbitionDripProj.totalBlocks &&
      (remainingDiscretionaryToday === 1 || projectRemainingBlocks === 0)
  );

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
          launchUrl: nextSteadyBaseline.launchUrl,
          autoLaunchUrl: nextSteadyBaseline.autoLaunchUrl,
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
        launchUrl: undefined,
        autoLaunchUrl: false,
      };
    }

    if (energyBandwidth === 'SHARP') {
      if (
        primaryProject &&
        projectRemainingBlocks > 0 &&
        discretionaryQuotaAvailable &&
        !shouldReserveDripCapstoneNow &&
        getProjectCognitiveDemand(primaryProject) === 'DEEP_SYNTHESIS' &&
        metrics.totalCompletedBlocks === 0
      ) {
        return {
          sourceId: primaryProject.id,
          title: primaryProject.title,
          badge: `FOCUS #${primaryProject.slot}`,
          taskType: 'PROJECT' as const,
          cognitiveDemand: getProjectCognitiveDemand(primaryProject),
          startupStep: getProjectActiveStartupStep(primaryProject),
          launchUrl: primaryProject.launchUrl,
          autoLaunchUrl: primaryProject.autoLaunchUrl,
        };
      }
      if (nextDeepBaseline) {
        return baselineHelperToSpec(nextDeepBaseline, 'DEEP SYNTHESIS');
      }
      if (
        shouldReserveDripCapstoneNow &&
        activeAmbitionDripProj &&
        !nextSteadyBaseline
      ) {
        return {
          sourceId: activeAmbitionDripProj.id,
          title: activeAmbitionDripProj.title,
          badge: `AMBITION DRIP • SLOT #${activeAmbitionDripProj.slot} (1B CAPSTONE)`,
          taskType: 'PROJECT' as const,
          cognitiveDemand: getProjectCognitiveDemand(activeAmbitionDripProj),
          startupStep: getProjectActiveStartupStep(activeAmbitionDripProj),
          launchUrl: activeAmbitionDripProj.launchUrl,
          autoLaunchUrl: activeAmbitionDripProj.autoLaunchUrl,
        };
      }
      if (primaryProject && projectRemainingBlocks > 0 && !shouldReserveDripCapstoneNow) {
        return {
          sourceId: primaryProject.id,
          title: primaryProject.title,
          badge: `FOCUS #${primaryProject.slot}`,
          taskType: 'PROJECT' as const,
          cognitiveDemand: getProjectCognitiveDemand(primaryProject),
          startupStep: getProjectActiveStartupStep(primaryProject),
          launchUrl: primaryProject.launchUrl,
          autoLaunchUrl: primaryProject.autoLaunchUrl,
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
          launchUrl: primaryProject.launchUrl,
          autoLaunchUrl: primaryProject.autoLaunchUrl,
        };
      }
    }

    if (nextSteadyBaseline) {
      return baselineHelperToSpec(nextSteadyBaseline);
    }

    if (shouldReserveDripCapstoneNow && activeAmbitionDripProj) {
      return {
        sourceId: activeAmbitionDripProj.id,
        title: activeAmbitionDripProj.title,
        badge: `AMBITION DRIP • SLOT #${activeAmbitionDripProj.slot} (1B CAPSTONE)`,
        taskType: 'PROJECT' as const,
        cognitiveDemand: getProjectCognitiveDemand(activeAmbitionDripProj),
        startupStep: getProjectActiveStartupStep(activeAmbitionDripProj),
        launchUrl: activeAmbitionDripProj.launchUrl,
        autoLaunchUrl: activeAmbitionDripProj.autoLaunchUrl,
      };
    }

    return {
      sourceId: primaryProject?.id || 'proj_1',
      title: primaryProject?.title || 'Primary Focus Deliverable',
      badge: `FOCUS #${primaryProject?.slot || 1}`,
      taskType: 'PROJECT' as const,
      cognitiveDemand: primaryProject
        ? getProjectCognitiveDemand(primaryProject)
        : ('DEEP_SYNTHESIS' as const),
      startupStep: primaryProject
        ? getProjectActiveStartupStep(primaryProject)
        : 'Open workspace + complete first 5m startup step',
      launchUrl: primaryProject?.launchUrl,
      autoLaunchUrl: primaryProject?.autoLaunchUrl,
    };
  })();

  const flashcardBlocks = state.baselineBlocks.filter(isFlashcardBlock);
  const unclearedEligibleBaselineSlots = state.baselineBlocks.filter(
    (b) => isBaselineSlotEarlyClearanceEligible(b) && !isBaselineSlotClearedForToday(b)
  );
  const isCardCapOrZeroDueReached =
    (state.flashcardsDailyCap > 0 &&
      state.flashcardsReviewedCount >= state.flashcardsDailyCap) ||
    zeroDueForcedPrompt;
  const shouldShowFlashcardEarlyClearanceToast =
    isCardCapOrZeroDueReached && unclearedEligibleBaselineSlots.length > 0;

  const selectedBaseline =
    state.baselineBlocks.find((b) => b.id === selectedBaselineId) ||
    state.baselineBlocks[0];

  const lockedSecondaryProjects = state.projectQueue.filter(
    (p) => p.id !== primaryProject?.id
  );
  const openBacklogList: OpenListItem[] =
    state.openList ?? state.openListBacklog ?? state.projectBacklog ?? [];

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

  const handleAutoSplitProject = async (proj: ProjectItem) => {
    if (splittingProjectId) return;
    triggerHaptic([12]);
    setSplittingProjectId(proj.id);
    try {
      const splitResult = await splitDeliverableWithGemini(
        proj.title,
        proj.totalBlocks,
        proj.trackId
      );
      const activeIdx = Math.min(
        splitResult.blockSubSteps.length - 1,
        Math.max(0, Math.floor(proj.completedBlocks || 0))
      );
      const currentBlockStartup =
        splitResult.blockSubSteps[activeIdx] || splitResult.startupStep5m;
      onUpdateProjectItem?.(proj.id, {
        blockSubSteps: splitResult.blockSubSteps,
        startupStep: currentBlockStartup,
        nextStepNote: splitResult.subStepsSummary,
      });
    } finally {
      setSplittingProjectId(null);
    }
  };

  const handleSyncAnkiConnect = async () => {
    if (ankiSyncLoading) return;
    setAnkiSyncLoading(true);
    setAnkiSyncStatus(null);
    const res = await fetchAnkiConnectReviewedToday(
      state.ankiConnectUrl || 'http://127.0.0.1:8765'
    );
    setAnkiSyncLoading(false);
    if (res.ok && typeof res.reviewedToday === 'number') {
      const clamped = Math.min(Math.max(0, res.reviewedToday), 999);
      onUpdateFlashcardCount(clamped);
      setCardCountDraft(String(clamped));
      if (res.reviewedToday === 0) {
        setAnkiSyncStatus('Synced 0 reviewed today from AnkiConnect.');
      } else {
        setAnkiSyncStatus(`Synced ${res.reviewedToday} cards from AnkiConnect.`);
      }
    } else {
      setAnkiSyncStatus(res.error || 'AnkiConnect offline — tap count for manual entry.');
    }
  };

  const handleTrigger2WayEarlyClearance = (
    slotId: string | 'ALL_ELIGIBLE',
    mode: EarlyClearanceActionMode
  ) => {
    triggerHaptic([15]);
    soundEngine.playTactileClick('MODE_TOGGLE');
    if (onApplySlotEarlyClearance) {
      onApplySlotEarlyClearance(slotId, mode);
    } else {
      onToggleEarlyClearance();
    }
    setEarlyClearanceChoiceSlotId(null);
    setZeroDueForcedPrompt(false);
  };

  const handleAddProjectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = newProjTitle.trim();
    if (!cleanTitle) return;
    const blocks =
      newProjPreset === 'PAPER_8'
        ? state.taskWeights?.heavyBlocks || 8
        : newProjPreset === 'SLIDES_4'
        ? state.taskWeights?.mediumBlocks || 4
        : newProjPreset === 'QUICK_2'
        ? state.taskWeights?.quickBlocks || 2
        : newProjCustomBlocks;

    const splitResult = await splitDeliverableWithGemini(
      cleanTitle,
      blocks,
      newProjTrack
    );
    const cleanStartup =
      splitResult.blockSubSteps?.[0] ||
      splitResult.startupStep5m ||
      newProjStartup.trim() ||
      'Open file and complete initial 5m startup step.';
    const cleanBlockedBy = newProjBlockedBy.trim() || undefined;

    // If a prerequisite lock is set, queue directly to Open List backlog
    if (cleanBlockedBy) {
      onDemoteDeliverableToBacklog(
        cleanTitle,
        newProjPreset,
        blocks,
        newProjTrack,
        cleanStartup,
        cleanBlockedBy
      );
      setNewProjTitle('');
      setNewProjBlockedBy('');
      return;
    }

    const floorLen = effectiveScheduledFloorBlocks || 7;
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
        blockSubSteps: splitResult.blockSubSteps,
        blockedByTitle: cleanBlockedBy,
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
      cleanStartup,
      { blockSubSteps: splitResult.blockSubSteps }
    );
    setNewProjTitle('');
    setNewProjBlockedBy('');
  };

  const handleClickSequentialStep = (step: SequentialChecklistStep) => {
    triggerHaptic([15]);
    if (step.kind === 'WORK_BLOCK') {
      const matchedBase = state.baselineBlocks.find((b) => b.id === step.sourceId);
      const matchedProj = state.projectQueue.find((p) => p.id === step.sourceId);
      launchWithOptionalResource(
        step.sourceId || 'proj_1',
        step.title,
        step.taskType || 'PROJECT',
        step.startupStep,
        matchedBase?.launchUrl || matchedProj?.launchUrl,
        matchedBase?.autoLaunchUrl || matchedProj?.autoLaunchUrl
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
    <div className="w-full max-w-none space-y-4 animate-tab-enter pb-10">
      {/* Contextual State-Machine Alerts (Only when active) */}
      {metrics.isZeroWorkLeft && (
        <div
          id="end-of-shift-lock-banner"
          className="w-full p-5 rounded-3xl bento-hero-border-evening text-amber-100 flex flex-wrap items-center justify-between gap-4"
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
          className="w-full p-5 rounded-3xl bento-surface border-amber-400/35 text-amber-100 flex flex-wrap items-center justify-between gap-4"
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
          FULL-WIDTH 12-COLUMN FOCUS VIEW GRID
          Left (lg:col-span-7 xl:col-span-8): Chronograph Timer + Active "Up Next" Hero Stage
          Right (lg:col-span-5 xl:col-span-4): Daily Core Baseline, Closed List #1, Quick Reset / Triage
         ===================================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 w-full items-start">
        <div className="lg:col-span-7 xl:col-span-8 w-full space-y-4">
          <section
            id="focal-chronograph-stage"
            aria-label="Centerpiece Chronograph and Active Up Next Stage"
            className={`w-full rounded-3xl bento-surface p-5 sm:p-7 transition-all duration-500 space-y-6 ${
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

            {/* Sleek Horizontal Split: Left 180px = Chronograph Dial, Right 1fr = Active & Up Next Action */}
            <div className="grid grid-cols-1 md:grid-cols-[180px_1fr] gap-5 items-center w-full">
              {/* Left Column: Chronograph Dial + Primary Transport */}
              <div className="flex flex-col items-center space-y-3.5 w-full">
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
                <div className="flex items-center justify-center gap-1.5 w-full">
                  <button
                    id="btn-hud-timer-start-pause"
                    type="button"
                    onClick={() => {
                      triggerHaptic([15]);
                      if (
                        !timer.isRunning &&
                        timer.mode === 'WORK_20M' &&
                        timer.workStage === 'IGNITION_5M' &&
                        activeSourceResource.autoLaunchUrl &&
                        isValidResourceLaunchUrl(activeSourceResource.launchUrl)
                      ) {
                        openResourceLaunchUrl(activeSourceResource.launchUrl);
                      }
                      onToggleTimerRun();
                    }}
                    className={`flex-1 py-2 px-3 rounded-full font-mono font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer transition ${
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
                            ? `Start ${activeDurations.startupMinutes}m Startup`
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
                    className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-slate-300 hover:text-white cursor-pointer"
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
                    className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-slate-400 hover:text-slate-200 cursor-pointer"
                    title="Reset current stage [R]"
                    aria-label="Reset current stage"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Right Column: Active Task + 5m Startup Script + "Up Next" Action */}
              <div className="flex flex-col justify-between space-y-5 min-w-0 w-full">
            {/* Active Task Section */}
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/25 font-mono text-[10px] uppercase tracking-widest text-cyan-200">
                  {timer.activeTaskType}
                </span>

                {isValidResourceLaunchUrl(activeSourceResource.launchUrl) && (
                  <button
                    id="btn-hud-open-launch-url"
                    type="button"
                    onClick={() => openResourceLaunchUrl(activeSourceResource.launchUrl)}
                    className="px-2.5 py-0.5 rounded-full bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/35 font-mono text-[10px] text-teal-200 inline-flex items-center gap-1 cursor-pointer transition"
                    title={`Open resource: ${activeSourceResource.launchUrl}`}
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Open Resource</span>
                  </button>
                )}

                {timer.activeTaskType === 'FLASHCARDS' && (
                  <div
                    id="hud-flashcard-progress-pill"
                    className="inline-flex flex-wrap items-center gap-1.5"
                  >
                    {editingCardCountInline ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const parsed = Math.max(0, Math.min(999, Number(cardCountDraft) || 0));
                          onUpdateFlashcardCount(parsed);
                          setEditingCardCountInline(false);
                        }}
                        className="inline-flex items-center gap-1"
                      >
                        <input
                          type="number"
                          min={0}
                          max={999}
                          value={cardCountDraft}
                          onChange={(e) => setCardCountDraft(e.target.value)}
                          onBlur={() => {
                            const parsed = Math.max(0, Math.min(999, Number(cardCountDraft) || 0));
                            onUpdateFlashcardCount(parsed);
                            setEditingCardCountInline(false);
                          }}
                          autoFocus
                          className="w-16 px-2 py-0.5 rounded bg-slate-950 border border-cyan-400/50 font-mono text-[10px] text-cyan-100"
                        />
                        <span className="font-mono text-[10px] text-slate-400">
                          / {state.flashcardsDailyCap} cards
                        </span>
                      </form>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setCardCountDraft(String(state.flashcardsReviewedCount || 0));
                          setEditingCardCountInline(true);
                        }}
                        title="Tap to enter exact RemNote/SRS card count"
                        className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 font-mono text-[10px] text-emerald-200 tabular-nums cursor-pointer"
                      >
                        {state.flashcardsReviewedCount} / {state.flashcardsDailyCap} cards
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        const next = Math.min(
                          999,
                          (state.flashcardsReviewedCount || 0) + 25
                        );
                        onUpdateFlashcardCount(next);
                        setCardCountDraft(String(next));
                      }}
                      className="px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] font-mono text-[10px] text-slate-300 cursor-pointer"
                      title="Quick +25 reviewed cards"
                    >
                      +25
                    </button>

                    <button
                      type="button"
                      onClick={() => setZeroDueForcedPrompt(true)}
                      className="px-2 py-0.5 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/30 font-mono text-[10px] text-cyan-200 cursor-pointer"
                      title="Mark 0 cards due to trigger 2-way Early Clearance"
                    >
                      0 Due
                    </button>

                    <button
                      type="button"
                      onClick={() => void handleSyncAnkiConnect()}
                      disabled={ankiSyncLoading}
                      className="px-2 py-0.5 rounded-full bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/35 font-mono text-[10px] text-indigo-200 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Poll desktop AnkiConnect (http://127.0.0.1:8765)"
                    >
                      <RefreshCw className={`w-2.5 h-2.5 ${ankiSyncLoading ? 'animate-spin' : ''}`} />
                      <span>Anki</span>
                    </button>
                  </div>
                )}
              </div>

              {shouldShowFlashcardEarlyClearanceToast && (
                <div
                  id="hud-early-clearance-2way-toast"
                  className="p-3 rounded-2xl bg-emerald-950/45 border border-emerald-400/40 flex flex-wrap items-center justify-between gap-2"
                >
                  <div className="text-xs text-emerald-100">
                    <span className="font-mono font-semibold text-emerald-300 mr-1.5">
                      Early Clearance Ready:
                    </span>
                    Daily card cap / zero-due reached ({unclearedEligibleBaselineSlots.length} recall slot{unclearedEligibleBaselineSlots.length === 1 ? '' : 's'} remaining).
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      id="btn-hud-early-clearance-bank"
                      type="button"
                      onClick={() =>
                        handleTrigger2WayEarlyClearance('ALL_ELIGIBLE', 'BANK_FREE_TIME')
                      }
                      className="px-2.5 py-1 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono text-[10px] font-semibold cursor-pointer"
                    >
                      Bank Free Time
                    </button>
                    <button
                      id="btn-hud-early-clearance-reallocate"
                      type="button"
                      onClick={() =>
                        handleTrigger2WayEarlyClearance('ALL_ELIGIBLE', 'REALLOCATE_TO_QUEUE')
                      }
                      className="px-2.5 py-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-100 font-mono text-[10px] cursor-pointer"
                    >
                      Reallocate to Queue
                    </button>
                  </div>
                </div>
              )}

              <h2 className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-white leading-tight">
                <InlineEditableText
                  value={timer.activeTaskTitle}
                  onSave={(newTitle) => {
                    onUpdateActiveTimerTask?.({ title: newTitle });
                    const matchedProj = state.projectQueue.find(
                      (p) => p.id === timer.activeBlockSourceId
                    );
                    if (matchedProj) {
                      onUpdateProjectItem?.(matchedProj.id, { title: newTitle });
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
                      const matchedProj = state.projectQueue.find(
                        (p) => p.id === timer.activeBlockSourceId
                      );
                      if (matchedProj) {
                        onUpdateProjectItem?.(matchedProj.id, {
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
                  launchWithOptionalResource(
                    upNextBlock.sourceId,
                    upNextBlock.title,
                    upNextBlock.taskType,
                    upNextBlock.startupStep,
                    upNextBlock.launchUrl,
                    upNextBlock.autoLaunchUrl
                  );
                } else if (
                  (info.offset.x < -65 || info.velocity.x < -340) &&
                  upNextBlock.taskType === 'FLASHCARDS'
                ) {
                  triggerHaptic([15]);
                  soundEngine.playTactileClick('MODE_TOGGLE');
                  setEarlyClearanceChoiceSlotId('ALL_ELIGIBLE');
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
                  {isValidResourceLaunchUrl(upNextBlock.launchUrl) && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openResourceLaunchUrl(upNextBlock.launchUrl);
                      }}
                      className="text-[10px] font-mono text-teal-300 hover:text-teal-200 inline-flex items-center gap-0.5 cursor-pointer"
                      title={`Open resource: ${upNextBlock.launchUrl}`}
                    >
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>Link</span>
                    </button>
                  )}
                </div>
                <div className="font-serif text-xl sm:text-2xl font-medium text-slate-100 truncate">
                  <InlineEditableText
                    value={upNextBlock.title}
                    onSave={(newVal) => {
                      const base = state.baselineBlocks.find(
                        (b) => b.id === upNextBlock.sourceId
                      );
                      const proj = state.projectQueue.find(
                        (p) => p.id === upNextBlock.sourceId
                      );
                      if (base) {
                        onUpdateBaselineBlock?.(base.id, { title: newVal });
                      } else if (proj) {
                        onUpdateProjectItem?.(proj.id, { title: newVal });
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
                      const proj = state.projectQueue.find(
                        (p) => p.id === upNextBlock.sourceId
                      );
                      if (base) {
                        onUpdateBaselineBlock?.(base.id, { startupStep: newVal });
                      } else if (proj) {
                        onUpdateProjectItem?.(proj.id, {
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
                  launchWithOptionalResource(
                    upNextBlock.sourceId,
                    upNextBlock.title,
                    upNextBlock.taskType,
                    upNextBlock.startupStep,
                    upNextBlock.launchUrl,
                    upNextBlock.autoLaunchUrl
                  );
                }}
                className="px-4 py-2.5 rounded-full bg-white/[0.07] hover:bg-white/[0.13] border border-white/[0.08] disabled:opacity-40 text-white font-mono text-xs font-medium flex items-center gap-2 cursor-pointer shrink-0 transition"
              >
                <Play className="w-3 h-3 fill-current text-cyan-300" />
                <span>Start {activeDurations.startupMinutes}m Startup</span>
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

            <span className="text-slate-600">•</span>

            <button
              id="pipeline-sovereign-drip-pill"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                triggerHaptic([10]);
                onToggleSovereignDripDone?.();
              }}
              title={
                examDayAutoPaused
                  ? 'Daily Ambition Drip paused automatically on Exam / Pre-Exam Taper Day.'
                  : !dripConfig.enabled
                  ? 'Daily Ambition Drip disabled. Click to toggle completion or re-enable in Closed List.'
                  : dripCompletedToday
                  ? `Daily Ambition Drip [${dripConfig.completedToday}/${dripConfig.targetBlocksPerDay} DONE] — Zero 100%-institutional day secured. Click to toggle.`
                  : `Daily Ambition Drip [0/${dripConfig.targetBlocksPerDay}] — Reserves 1 capstone 20m block today. Click to toggle.`
              }
              className={`px-2.5 py-0.5 rounded-full border font-mono text-[11px] inline-flex items-center gap-1.5 transition cursor-pointer ${
                examDayAutoPaused || !dripConfig.enabled
                  ? 'bg-slate-800/60 border-white/[0.08] text-slate-400'
                  : dripCompletedToday
                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.18)]'
                  : 'bg-violet-500/15 border-violet-400/35 text-violet-200 hover:bg-violet-500/25'
              }`}
            >
              {examDayAutoPaused ? (
                <GraduationCap className="w-3 h-3 shrink-0 text-indigo-300" />
              ) : (
                <Sparkles
                  className={`w-3 h-3 shrink-0 ${
                    dripCompletedToday ? 'text-amber-300' : 'text-violet-300'
                  }`}
                />
              )}
              <span>
                {state.uiTerminology?.ambitionDripLabel || 'Ambition Drip'}:{' '}
                {examDayAutoPaused
                  ? '[Exam Pause]'
                  : !dripConfig.enabled
                  ? '[OFF]'
                  : dripCompletedToday
                  ? `[${dripConfig.completedToday}/${dripConfig.targetBlocksPerDay} DONE]`
                  : `[${dripConfig.completedToday}/${dripConfig.targetBlocksPerDay}]`}
              </span>
            </button>
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
                {/* Left Column: Daily Core Baseline (Inline Editable + 2-Way Early Clearance + Live Card Progress) */}
                <div
                  id="bento-baseline-card"
                  className="p-5 rounded-2xl bg-white/[0.015] border border-white/[0.05] space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                        {state.uiTerminology?.baselineFloorLabel || 'Daily Core Baseline'}
                      </span>
                      <h3 className="font-serif text-2xl font-medium text-white">
                        {totalBaselineFloorBlocks}-Block Floor ({state.baselineBlocks.length} Slots)
                      </h3>
                      {effectiveScheduledFloorBlocks < totalBaselineFloorBlocks && (
                        <p className="text-[10px] font-mono text-cyan-300/90 mt-0.5">
                          Active floor today: {effectiveScheduledFloorBlocks}b ({totalBaselineFloorBlocks - effectiveScheduledFloorBlocks}b reallocated to Project / Drip queue)
                        </p>
                      )}
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
                          if (state.earlyClearanceEnabled) {
                            onToggleEarlyClearance();
                            setEarlyClearanceChoiceSlotId(null);
                          } else if (onApplySlotEarlyClearance) {
                            setEarlyClearanceChoiceSlotId((prev) =>
                              prev === 'ALL_ELIGIBLE' ? null : 'ALL_ELIGIBLE'
                            );
                          } else {
                            onToggleEarlyClearance();
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full border font-mono text-[10px] transition cursor-pointer ${
                          state.earlyClearanceEnabled
                            ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                            : earlyClearanceChoiceSlotId === 'ALL_ELIGIBLE'
                            ? 'bg-cyan-500/20 border-cyan-400/45 text-cyan-100'
                            : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.05] text-slate-300'
                        }`}
                      >
                        {state.earlyClearanceEnabled
                          ? '✓ Early Clearance Active (Undo)'
                          : 'Early Clearance ▾'}
                      </button>
                    </div>
                  </div>

                  {/* 1-Click 2-Way Early Clearance Choice Banner (Triggered manually or when card cap / 0 due hit) */}
                  {(earlyClearanceChoiceSlotId === 'ALL_ELIGIBLE' ||
                    shouldShowFlashcardEarlyClearanceToast) && (
                    <div
                      id="baseline-early-clearance-2way-choice"
                      className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-400/40 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-mono font-semibold text-emerald-200">
                          Early Clearance Reallocation ({unclearedEligibleBaselineSlots.length} eligible slot{unclearedEligibleBaselineSlots.length === 1 ? '' : 's'})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setEarlyClearanceChoiceSlotId(null);
                            setZeroDueForcedPrompt(false);
                          }}
                          className="text-[10px] font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                        >
                          Dismiss
                        </button>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <button
                          id="btn-early-clearance-option-a-bank"
                          type="button"
                          onClick={() =>
                            handleTrigger2WayEarlyClearance('ALL_ELIGIBLE', 'BANK_FREE_TIME')
                          }
                          className="p-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/45 text-left transition cursor-pointer"
                        >
                          <div className="font-mono text-[10px] font-semibold text-emerald-200">
                            Option A — Bank as Free Recovery
                          </div>
                          <div className="text-[10px] text-emerald-100/80 mt-0.5">
                            Deducts remaining recall blocks from work left so End-of-Shift arrives earlier.
                          </div>
                        </button>
                        <button
                          id="btn-early-clearance-option-b-reallocate"
                          type="button"
                          onClick={() =>
                            handleTrigger2WayEarlyClearance(
                              'ALL_ELIGIBLE',
                              'REALLOCATE_TO_QUEUE'
                            )
                          }
                          className="p-2 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/45 text-left transition cursor-pointer"
                        >
                          <div className="font-mono text-[10px] font-semibold text-cyan-200">
                            Option B — Reallocate to Queue
                          </div>
                          <div className="text-[10px] text-cyan-100/80 mt-0.5">
                            Keeps shift length constant; converts freed blocks 1-for-1 into Project / Ambition Drip blocks.
                          </div>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Direct Inline Baseline Slots List */}
                  <div className="space-y-2">
                    {state.baselineBlocks.map((b) => {
                      const slotTarget = getBaselineSlotTargetBlocks(b);
                      const effectiveSlotTarget = getBaselineSlotEffectiveTargetBlocks(b);
                      const slotDone = getBaselineSlotCompletedBlocks(b);
                      const isEarlyElig = isBaselineSlotEarlyClearanceEligible(b);
                      const isLateBlocked = isBaselineSlotLateNightBlocked(b);
                      const isClearedToday = isBaselineSlotClearedForToday(b);
                      const blockedAsFinal =
                        isFinalBlockOfNight &&
                        isLateBlocked &&
                        !isClearedToday;
                      const isCanceledByTaper =
                        state.preExamTaperActive && b.category === 'SYNTHESIS';
                      const isEditingThisSlot = editingBaselineSlotId === b.id;
                      const isSlot2WayOpen = earlyClearanceChoiceSlotId === b.id;

                      return (
                        <div
                          key={b.id}
                          id={`pill-segment-${b.id}`}
                          className={`p-3 rounded-xl border transition space-y-2 ${
                            isCanceledByTaper
                              ? 'bg-indigo-950/25 border-indigo-500/30 text-indigo-300/60'
                              : b.completed
                              ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-100'
                              : b.reallocatedViaEarlyClearance
                              ? 'bg-violet-500/15 border-violet-400/35 text-violet-100'
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
                                    : b.reallocatedViaEarlyClearance
                                    ? 'bg-violet-400 border-violet-300 text-slate-950'
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
                                  {b.reallocatedViaEarlyClearance && (
                                    <span className="px-1.5 py-0.5 rounded bg-violet-500/20 border border-violet-400/40 text-[9px] font-mono text-violet-200">
                                      Reallocated +{b.reallocatedBlocksCount || Math.max(1, slotTarget - effectiveSlotTarget)}b → Queue
                                    </span>
                                  )}
                                  {b.bankedViaEarlyClearance && (
                                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-400/40 text-[9px] font-mono text-cyan-200">
                                      Banked Free Time
                                    </span>
                                  )}
                                  {isEarlyElig && !isClearedToday && (
                                    <button
                                      id={`btn-slot-early-clearance-${b.id}`}
                                      type="button"
                                      onClick={() =>
                                        setEarlyClearanceChoiceSlotId((prev) =>
                                          prev === b.id ? null : b.id
                                        )
                                      }
                                      className="px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-[9px] font-mono text-emerald-200 cursor-pointer"
                                      title="Clear remaining blocks in this slot early (Bank Free Time vs. Reallocate to Queue)"
                                    >
                                      Early Clearance ▾
                                    </button>
                                  )}
                                  {(b.bankedViaEarlyClearance || b.reallocatedViaEarlyClearance) &&
                                    onRestoreSlotEarlyClearance && (
                                      <button
                                        type="button"
                                        onClick={() => onRestoreSlotEarlyClearance(b.id)}
                                        className="px-1.5 py-0.5 rounded bg-white/[0.05] hover:bg-white/[0.12] border border-white/[0.1] text-[9px] font-mono text-slate-300 cursor-pointer"
                                      >
                                        Restore
                                      </button>
                                    )}
                                  {isLateBlocked && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-[9px] font-mono text-amber-300">
                                      Late-Night Blocker
                                    </span>
                                  )}
                                  {isValidResourceLaunchUrl(b.launchUrl) && (
                                    <button
                                      type="button"
                                      onClick={() => openResourceLaunchUrl(b.launchUrl)}
                                      className="px-1.5 py-0.5 rounded bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/35 text-[9px] font-mono text-teal-200 inline-flex items-center gap-0.5 cursor-pointer"
                                      title={`Open resource: ${b.launchUrl}`}
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                      <span>Link</span>
                                    </button>
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
                                title="Configure Slot (Early Clearance, Late-Night Blocker, Resource Link, Track)"
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

                          {isSlot2WayOpen && (
                            <div
                              id={`slot-early-clearance-choice-${b.id}`}
                              className="p-2 rounded-lg bg-slate-950/90 border border-emerald-400/35 flex flex-wrap items-center justify-between gap-1.5"
                            >
                              <span className="text-[10px] font-mono text-emerald-200">
                                Clear {Math.max(1, slotTarget - slotDone)} remaining block{slotTarget - slotDone === 1 ? '' : 's'}:
                              </span>
                              <div className="flex flex-wrap items-center gap-1.5">
                                <button
                                  id={`btn-slot-bank-${b.id}`}
                                  type="button"
                                  onClick={() =>
                                    handleTrigger2WayEarlyClearance(b.id, 'BANK_FREE_TIME')
                                  }
                                  className="px-2 py-0.5 rounded bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono text-[10px] font-semibold cursor-pointer"
                                >
                                  Bank Free Time
                                </button>
                                <button
                                  id={`btn-slot-reallocate-${b.id}`}
                                  type="button"
                                  onClick={() =>
                                    handleTrigger2WayEarlyClearance(b.id, 'REALLOCATE_TO_QUEUE')
                                  }
                                  className="px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/45 text-cyan-100 font-mono text-[10px] cursor-pointer"
                                >
                                  Reallocate to Queue
                                </button>
                              </div>
                            </div>
                          )}

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

                  {/* Live Flashcard Progress Pill (RemNote Manual Tap-Entry + Optional Desktop AnkiConnect) */}
                  {flashcardBlocks.length > 0 && (
                    <div
                      id="flashcard-live-progress-pill"
                      className="space-y-2 pt-2 border-t border-white/[0.05]"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
                        <span className="text-slate-400">Active Recall / SRS Card Cap</span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {editingCardCountInline ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                const parsed = Math.max(
                                  0,
                                  Math.min(999, Number(cardCountDraft) || 0)
                                );
                                onUpdateFlashcardCount(parsed);
                                setEditingCardCountInline(false);
                              }}
                              className="inline-flex items-center gap-1"
                            >
                              <input
                                id="input-flashcard-manual-tap"
                                type="number"
                                min={0}
                                max={999}
                                value={cardCountDraft}
                                onChange={(e) => setCardCountDraft(e.target.value)}
                                onBlur={() => {
                                  const parsed = Math.max(
                                    0,
                                    Math.min(999, Number(cardCountDraft) || 0)
                                  );
                                  onUpdateFlashcardCount(parsed);
                                  setEditingCardCountInline(false);
                                }}
                                autoFocus
                                className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-cyan-400/50 text-[11px] font-mono text-cyan-100"
                              />
                              <span className="text-slate-400">
                                / {state.flashcardsDailyCap} cards
                              </span>
                            </form>
                          ) : (
                            <button
                              id="btn-flashcard-tap-entry"
                              type="button"
                              onClick={() => {
                                setCardCountDraft(
                                  String(state.flashcardsReviewedCount || 0)
                                );
                                setEditingCardCountInline(true);
                              }}
                              title="Tap to type RemNote / SRS reviewed count"
                              className="px-2 py-0.5 rounded-full bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 text-cyan-200 tabular-nums cursor-pointer"
                            >
                              {state.flashcardsReviewedCount} / {state.flashcardsDailyCap} cards
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              const next = Math.min(
                                999,
                                (state.flashcardsReviewedCount || 0) + 25
                              );
                              onUpdateFlashcardCount(next);
                              setCardCountDraft(String(next));
                            }}
                            className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] text-[10px] text-slate-300 cursor-pointer"
                          >
                            +25
                          </button>

                          <button
                            id="btn-flashcard-zero-due"
                            type="button"
                            onClick={() => setZeroDueForcedPrompt(true)}
                            className="px-1.5 py-0.5 rounded bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-[10px] text-emerald-200 cursor-pointer"
                            title="Zero cards due — open 2-way Early Clearance"
                          >
                            0 Due
                          </button>
                        </div>
                      </div>

                      <input
                        id="input-flashcard-count"
                        type="range"
                        min={0}
                        max={state.flashcardsDailyCap}
                        step={5}
                        value={Math.min(state.flashcardsDailyCap, state.flashcardsReviewedCount)}
                        onChange={(e) => onUpdateFlashcardCount(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                        <label className="inline-flex items-center gap-1.5 text-slate-400 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={Boolean(state.ankiConnectEnabled)}
                            onChange={(e) => onToggleAnkiConnect?.(e.target.checked)}
                            className="rounded border-slate-700 bg-slate-950 text-indigo-400"
                          />
                          <span>AnkiConnect Poll (127.0.0.1:8765)</span>
                        </label>
                        <button
                          id="btn-sync-ankiconnect"
                          type="button"
                          disabled={ankiSyncLoading}
                          onClick={() => void handleSyncAnkiConnect()}
                          className="px-2 py-0.5 rounded bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-400/35 text-indigo-200 inline-flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <RefreshCw className={`w-2.5 h-2.5 ${ankiSyncLoading ? 'animate-spin' : ''}`} />
                          <span>{ankiSyncLoading ? 'Polling...' : 'Sync Anki'}</span>
                        </button>
                      </div>
                      {ankiSyncStatus && (
                        <p className="text-[10px] font-mono text-slate-400">{ankiSyncStatus}</p>
                      )}
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
                          launchWithOptionalResource(
                            selectedBaseline.id,
                            selectedBaseline.title,
                            isFlashcardBlock(selectedBaseline)
                              ? 'FLASHCARDS'
                              : selectedBaseline.category === 'SYNTHESIS'
                              ? 'SYNTHESIS'
                              : 'READING',
                            selectedBaseline.startupStep,
                            selectedBaseline.launchUrl,
                            selectedBaseline.autoLaunchUrl
                          );
                        }}
                        className="px-3 py-1 rounded-full bg-cyan-400/20 hover:bg-cyan-400/30 border border-cyan-400/40 text-cyan-200 font-mono text-[11px] cursor-pointer shrink-0"
                      >
                        Start {activeDurations.startupMinutes}m Startup
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Column: Closed List (Max 3 Active Slots) — Serialized Focus #1 + Daily Ambition Drip */}
                <div
                  id="bento-project-lock-card"
                  className="p-5 rounded-2xl bg-white/[0.015] border border-white/[0.05] flex flex-col justify-between space-y-4"
                >
                  {primaryProject ? (
                    <div id="project-card-slot-1" className="space-y-3.5">
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
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              id="slot-1-institutional-badge"
                              className="px-2 py-0.5 rounded-md bg-emerald-500/15 border border-emerald-400/40 text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-200 flex items-center gap-1"
                            >
                              <Unlock className="w-3 h-3 text-emerald-300" />
                              <span>[SERIALIZED FOCUS #{primaryProject.slot}]</span>
                            </span>

                            {primaryProject.trackId === 'science' && (
                              <button
                                type="button"
                                onClick={() => {
                                  const nextSub: MajorSubTrackId =
                                    primaryProject.subTrack === '1B_INDEPENDENT'
                                      ? '1A_INSTITUTIONAL'
                                      : '1B_INDEPENDENT';
                                  onUpdateProjectItem?.(primaryProject.id, {
                                    subTrack: nextSub,
                                  });
                                }}
                                className="px-1.5 py-0.5 rounded bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/35 font-mono text-[9px] text-cyan-200 cursor-pointer"
                                title="Toggle Major Track 1 Sub-Track (1A Institutional vs. 1B Independent)"
                              >
                                {primaryProject.subTrack === '1B_INDEPENDENT'
                                  ? '1B Independent'
                                  : '1A Institutional'}
                              </button>
                            )}

                            {isValidResourceLaunchUrl(primaryProject.launchUrl) && (
                              <button
                                type="button"
                                onClick={() => openResourceLaunchUrl(primaryProject.launchUrl)}
                                className="px-1.5 py-0.5 rounded bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/35 font-mono text-[9px] text-teal-200 inline-flex items-center gap-0.5 cursor-pointer"
                                title={`Open resource: ${primaryProject.launchUrl}`}
                              >
                                <ExternalLink className="w-2.5 h-2.5" />
                                <span>Open Link</span>
                              </button>
                            )}

                            <button
                              id={`btn-project-link-${primaryProject.id}`}
                              type="button"
                              onClick={() =>
                                setEditingProjectLinkId((prev) =>
                                  prev === primaryProject.id ? null : primaryProject.id
                                )
                              }
                              className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-teal-200 cursor-pointer"
                              title="Attach web URL or anki:// / remnote:// deep link"
                            >
                              <Link2 className="w-3 h-3" />
                            </button>
                          </div>

                          <h3 className="font-serif text-xl sm:text-2xl font-medium text-white mt-1.5">
                            <InlineEditableText
                              value={primaryProject.title}
                              onSave={(newTitle) =>
                                onUpdateProjectItem?.(primaryProject.id, {
                                  title: newTitle,
                                })
                              }
                            />
                          </h3>
                          {primaryProject.nextStepNote && (
                            <p className="text-[11px] font-mono text-emerald-300/80 mt-0.5">
                              {primaryProject.nextStepNote}
                            </p>
                          )}
                          <div className="text-xs text-slate-400 mt-1">
                            <span className="text-[10px] font-mono uppercase text-amber-300/80 mr-1.5">
                              5m Startup (Block {Math.min(primaryProject.totalBlocks, primaryProject.completedBlocks + 1)}):
                            </span>
                            <InlineEditableText
                              value={getProjectActiveStartupStep(primaryProject)}
                              onSave={(newStep) =>
                                onUpdateProjectItem?.(primaryProject.id, {
                                  startupStep: newStep,
                                })
                              }
                            />
                          </div>

                          {editingProjectLinkId === primaryProject.id && (
                            <div className="mt-2 p-2.5 rounded-xl bg-slate-950/90 border border-teal-500/35 space-y-1.5">
                              <input
                                type="text"
                                value={primaryProject.launchUrl ?? ''}
                                onChange={(e) =>
                                  onUpdateProjectItem?.(primaryProject.id, {
                                    launchUrl: e.target.value,
                                  })
                                }
                                placeholder="https://docs.google.com/... or remnote://..."
                                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[11px] font-mono text-slate-100"
                              />
                              <label className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(primaryProject.autoLaunchUrl)}
                                  onChange={(e) =>
                                    onUpdateProjectItem?.(primaryProject.id, {
                                      autoLaunchUrl: e.target.checked,
                                    })
                                  }
                                  className="rounded border-slate-700 bg-slate-900 text-teal-400"
                                />
                                <span>Auto-open link on &ldquo;Start 5m Startup&rdquo;</span>
                              </label>
                            </div>
                          )}

                          {primaryProject.blockSubSteps && primaryProject.blockSubSteps.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {primaryProject.blockSubSteps.map((stepLabel, idx) => {
                                const isCurrentBlock = idx === primaryProject.completedBlocks;
                                const isDoneBlock = idx < primaryProject.completedBlocks;
                                return (
                                  <span
                                    key={idx}
                                    className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${
                                      isCurrentBlock
                                        ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-100'
                                        : isDoneBlock
                                        ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300/70 line-through'
                                        : 'bg-white/[0.03] border-white/[0.06] text-slate-300'
                                    }`}
                                  >
                                    {stepLabel}
                                  </span>
                                );
                              })}
                            </div>
                          )}
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
                            launchWithOptionalResource(
                              primaryProject.id,
                              primaryProject.title,
                              'PROJECT',
                              getProjectActiveStartupStep(primaryProject),
                              primaryProject.launchUrl,
                              primaryProject.autoLaunchUrl
                            );
                          }}
                          className="flex-1 py-2 px-3 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-medium text-xs cursor-pointer"
                        >
                          Start {activeDurations.startupMinutes}m Startup
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
                          id="btn-split-deliverable-1"
                          type="button"
                          disabled={splittingProjectId === primaryProject.id}
                          onClick={() => void handleAutoSplitProject(primaryProject)}
                          title="Auto-Split Blocks into distinct 5m startup micro-scripts"
                          className="py-2 px-3 rounded-full bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-200 font-mono text-xs flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                          <span>
                            {splittingProjectId === primaryProject.id
                              ? 'Splitting...'
                              : 'Auto-Split Blocks'}
                          </span>
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

                  {/* Daily Ambition Drip ("Zero 100%-Institutional Days" Engine): Slots #2 & #3 */}
                  <div
                    id="closed-list-secondary-slots"
                    className="pt-3 border-t border-white/[0.06] space-y-2.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-200/90 flex items-center gap-1.5">
                        <Sparkles className="w-3 h-3 text-amber-300" />
                        <span>
                          Daily Ambition Drip • Slots #2–#3
                        </span>
                      </span>

                      <div className="flex flex-wrap items-center gap-1">
                        <button
                          id="btn-toggle-ambition-drip-enabled"
                          type="button"
                          onClick={() =>
                            onUpdateDailyAmbitionDrip?.({
                              enabled: !dripConfig.enabled,
                            })
                          }
                          className={`px-2 py-0.5 rounded-full border font-mono text-[10px] transition cursor-pointer ${
                            dripConfig.enabled && !examDayAutoPaused
                              ? 'bg-violet-500/15 border-violet-400/40 text-violet-200'
                              : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                          }`}
                          title="Reserve 1 capstone block/day (20m) for your active Ambition Drip slot on every non-exam day"
                        >
                          {examDayAutoPaused
                            ? 'Exam Pause'
                            : dripConfig.enabled
                            ? '1b/Day ON'
                            : '1b/Day OFF'}
                        </button>

                        {dripConfig.enabled && (
                          <button
                            id="btn-cycle-preferred-drip-slot"
                            type="button"
                            onClick={() =>
                              onUpdateDailyAmbitionDrip?.({
                                preferredSlotIndex:
                                  dripConfig.preferredSlotIndex === 1 ? 2 : 1,
                              })
                            }
                            className="px-2 py-0.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.07] font-mono text-[10px] text-slate-300 cursor-pointer"
                            title="Switch preferred Ambition Drip target between Slot #2 and Slot #3"
                          >
                            Target: #{dripConfig.preferredSlotIndex === 2 ? 3 : 2}
                          </button>
                        )}

                        <button
                          id="btn-closed-list-golden-rule"
                          type="button"
                          onClick={() => onToggleGoldenRuleMode?.()}
                          className={`px-2 py-0.5 rounded-full border font-mono text-[10px] transition cursor-pointer ${
                            state.sovereignGoldenRuleMode !== false
                              ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                              : 'bg-white/[0.02] border-white/[0.06] text-slate-400'
                          }`}
                          title="Toggle Capstone Pacing Rule banner"
                        >
                          Capstone Rule: {state.sovereignGoldenRuleMode !== false ? 'ON' : 'OFF'}
                        </button>
                      </div>
                    </div>

                    {examDayAutoPaused ? (
                      <div className="px-3 py-2 rounded-xl bg-indigo-950/35 border border-indigo-400/30 text-[11px] text-indigo-200 leading-relaxed">
                        <span className="font-mono font-semibold uppercase text-indigo-300 mr-1.5">
                          [Exam Day Auto-Pause]:
                        </span>
                        Pre-Exam Taper / Exam Day active — Daily Ambition Drip is temporarily paused so 100% of blocks stay on recall and recovery.
                      </div>
                    ) : (
                      state.sovereignGoldenRuleMode !== false && (
                        <div
                          id="closed-list-golden-rule-banner"
                          className="px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/10 via-violet-500/10 to-amber-500/10 border border-amber-400/25 text-[11px] text-amber-100/90 leading-relaxed"
                        >
                          <span className="font-mono font-semibold uppercase text-amber-300 mr-1.5">
                            [Zero 100%-Institutional Days]:
                          </span>
                          Complete scheduled Focus #1 blocks and recall sprints first, slotting your 1-block Ambition Drip as the shift capstone — strictly stopwatch-capped at 1 block (20m) unless Flow Extension is unlocked.
                        </div>
                      )
                    )}

                    {lockedSecondaryProjects.map((proj) => {
                      const isDrip = isProjectAmbitionDripEligible(proj);
                      const isPreferredTarget =
                        activeAmbitionDripProj?.id === proj.id;
                      const isIgnitionUnlocked =
                        isDrip &&
                        dripConfig.enabled &&
                        !examDayAutoPaused &&
                        !isDripCapEnforced &&
                        !metrics.isZeroWorkLeft &&
                        !isSurgeMidDayResetRequired;

                      return (
                        <div
                          key={proj.id}
                          id={`project-card-slot-${proj.slot}`}
                          className={`p-3 rounded-xl border space-y-2 text-xs transition ${
                            isDrip
                              ? 'bg-gradient-to-br from-amber-500/[0.07] via-violet-500/[0.07] to-slate-950/80 border-amber-400/35'
                              : 'bg-black/30 border-white/[0.05]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {isDrip ? (
                                <span
                                  id={`sovereign-drip-badge-slot-${proj.slot}`}
                                  className="px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-500/20 to-violet-500/25 border border-amber-400/45 text-[10px] font-mono font-semibold uppercase tracking-wider text-amber-200 flex items-center gap-1"
                                >
                                  <Sparkles className="w-3 h-3 text-amber-300" />
                                  <span>
                                    {isPreferredTarget
                                      ? '[ACTIVE AMBITION DRIP — 1B/DAY]'
                                      : '[AMBITION DRIP SLOT]'}
                                  </span>
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono uppercase text-slate-400 flex items-center gap-1">
                                  <Lock className="w-3 h-3" />
                                  <span>[QUEUED DELIVERABLE #{proj.slot}]</span>
                                </span>
                              )}

                              <button
                                id={`btn-toggle-sovereign-flag-${proj.slot}`}
                                type="button"
                                onClick={() =>
                                  onUpdateProjectItem?.(proj.id, {
                                    isAmbitionDrip: !isDrip,
                                    isSovereignDrip: !isDrip,
                                    category: !isDrip ? 'sovereign' : 'institutional',
                                    subTrack:
                                      !isDrip && proj.trackId === 'science'
                                        ? '1B_INDEPENDENT'
                                        : proj.subTrack,
                                  })
                                }
                                className="px-1.5 py-0.5 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] font-mono text-[9px] text-slate-400 cursor-pointer"
                                title="Toggle Daily Ambition Drip eligibility on this Closed List slot"
                              >
                                {isDrip ? 'Ambition Drip' : 'Set Drip'}
                              </button>

                              {isValidResourceLaunchUrl(proj.launchUrl) && (
                                <button
                                  type="button"
                                  onClick={() => openResourceLaunchUrl(proj.launchUrl)}
                                  className="px-1.5 py-0.5 rounded bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/35 font-mono text-[9px] text-teal-200 inline-flex items-center gap-0.5 cursor-pointer"
                                >
                                  <ExternalLink className="w-2.5 h-2.5" />
                                  <span>Link</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() =>
                                  setEditingProjectLinkId((prev) =>
                                    prev === proj.id ? null : proj.id
                                  )
                                }
                                className="p-1 rounded bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.06] text-slate-400 hover:text-teal-200 cursor-pointer"
                                title="Attach web URL or deep link"
                              >
                                <Link2 className="w-2.5 h-2.5" />
                              </button>
                            </div>

                            <select
                              aria-label={`Slot #${proj.slot} Block Count`}
                              value={proj.totalBlocks}
                              onChange={(e) =>
                                onUpdateProjectItem?.(proj.id, {
                                  totalBlocks: Number(e.target.value) || 1,
                                })
                              }
                              className="bg-slate-950 border border-amber-400/30 rounded-full px-2 py-0.5 font-mono text-amber-200 text-[10px] cursor-pointer"
                            >
                              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                                <option key={n} value={n}>
                                  {proj.completedBlocks}/{n}b
                                </option>
                              ))}
                            </select>
                          </div>

                          <div className="font-serif text-base font-medium text-slate-100">
                            <InlineEditableText
                              value={proj.title}
                              onSave={(val) =>
                                onUpdateProjectItem?.(proj.id, { title: val })
                              }
                            />
                          </div>

                          {proj.nextStepNote && (
                            <p className="text-[11px] font-mono text-amber-200/80">
                              {proj.nextStepNote}
                            </p>
                          )}

                          {editingProjectLinkId === proj.id && (
                            <div className="p-2 rounded-lg bg-slate-950/90 border border-teal-500/35 space-y-1">
                              <input
                                type="text"
                                value={proj.launchUrl ?? ''}
                                onChange={(e) =>
                                  onUpdateProjectItem?.(proj.id, {
                                    launchUrl: e.target.value,
                                  })
                                }
                                placeholder="https://... or remnote://..."
                                className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-100"
                              />
                              <label className="flex items-center gap-1.5 text-[10px] font-mono text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={Boolean(proj.autoLaunchUrl)}
                                  onChange={(e) =>
                                    onUpdateProjectItem?.(proj.id, {
                                      autoLaunchUrl: e.target.checked,
                                    })
                                  }
                                  className="rounded border-slate-700 bg-slate-900 text-teal-400"
                                />
                                <span>Auto-open on &ldquo;Start 5m Startup&rdquo;</span>
                              </label>
                            </div>
                          )}

                          {proj.blockSubSteps && proj.blockSubSteps.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {proj.blockSubSteps.map((stepText, sIdx) => {
                                const isCurrent = sIdx === proj.completedBlocks;
                                return (
                                  <span
                                    key={sIdx}
                                    className={`px-1.5 py-0.5 rounded border font-mono text-[10px] ${
                                      isCurrent
                                        ? 'bg-amber-500/20 border-amber-400/45 text-amber-100'
                                        : 'bg-violet-500/15 border-violet-400/30 text-violet-200'
                                    }`}
                                  >
                                    {stepText}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          <div className="text-[11px] text-slate-300">
                            <span className="font-mono text-[10px] uppercase text-amber-300/80 mr-1.5">
                              5m Startup:
                            </span>
                            <InlineEditableText
                              value={getProjectActiveStartupStep(proj)}
                              onSave={(val) =>
                                onUpdateProjectItem?.(proj.id, { startupStep: val })
                              }
                            />
                          </div>

                          {/* Unlocked Ambition Drip Controls (Stopwatch-capped at 1 block / 20m unless Flow Extension is active) */}
                          {isDrip ? (
                            <div className="flex flex-wrap items-center gap-1.5 pt-1">
                              <button
                                id={`btn-launch-sovereign-slot-${proj.slot}`}
                                type="button"
                                disabled={!isIgnitionUnlocked}
                                onClick={() => {
                                  triggerHaptic([15]);
                                  launchWithOptionalResource(
                                    proj.id,
                                    proj.title,
                                    'PROJECT',
                                    getProjectActiveStartupStep(proj),
                                    proj.launchUrl,
                                    proj.autoLaunchUrl
                                  );
                                }}
                                className={`flex-1 py-1.5 px-3 rounded-full font-mono font-medium text-[11px] transition flex items-center justify-center gap-1.5 ${
                                  isIgnitionUnlocked
                                    ? 'bg-gradient-to-r from-amber-400 to-violet-400 hover:from-amber-300 hover:to-violet-300 text-slate-950 cursor-pointer shadow-sm'
                                    : 'bg-emerald-500/15 border border-emerald-400/35 text-emerald-200 cursor-not-allowed opacity-80'
                                }`}
                              >
                                {isDripCapEnforced ? (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                                    <span>1/1 Drip Capped (20m)</span>
                                  </>
                                ) : examDayAutoPaused ? (
                                  <span>Paused for Exam Day</span>
                                ) : (
                                  <>
                                    <Unlock className="w-3 h-3" />
                                    <span>
                                      Start {activeDurations.startupMinutes}m Startup (20m Drip)
                                    </span>
                                  </>
                                )}
                              </button>
                              <button
                                id={`btn-log-sovereign-slot-${proj.slot}`}
                                type="button"
                                disabled={
                                  metrics.isZeroWorkLeft ||
                                  isSurgeMidDayResetRequired ||
                                  examDayAutoPaused ||
                                  isDripCapEnforced
                                }
                                onClick={() => {
                                  triggerHaptic([10]);
                                  onIncrementProjectBlock(proj.id);
                                }}
                                className="py-1.5 px-2.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-amber-200 font-mono text-[11px] cursor-pointer disabled:opacity-45"
                              >
                                +1 Drip Block
                              </button>
                              <button
                                id={`btn-split-deliverable-${proj.slot}`}
                                type="button"
                                disabled={splittingProjectId === proj.id}
                                onClick={() => void handleAutoSplitProject(proj)}
                                className="py-1.5 px-2.5 rounded-full bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/35 text-sky-200 font-mono text-[11px] cursor-pointer disabled:opacity-50"
                                title="Auto-Split Blocks into 5m micro-scripts"
                              >
                                {splittingProjectId === proj.id ? 'Splitting...' : 'Auto-Split'}
                              </button>
                              {onCompleteProjectById && (
                                <button
                                  id={`btn-complete-sovereign-slot-${proj.slot}`}
                                  type="button"
                                  onClick={() => onCompleteProjectById(proj.id)}
                                  className="py-1.5 px-2.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/35 text-emerald-200 font-mono text-[11px] cursor-pointer"
                                  title="Mark Deliverable Complete & Promote Next Unlocked Open List Item"
                                >
                                  Complete
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                <span>Serialized behind Slot #1</span>
                              </span>
                              <button
                                id={`btn-split-deliverable-${proj.slot}`}
                                type="button"
                                disabled={splittingProjectId === proj.id}
                                onClick={() => void handleAutoSplitProject(proj)}
                                className="px-2 py-0.5 rounded-full bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/30 text-sky-200 font-mono text-[10px] cursor-pointer"
                              >
                                {splittingProjectId === proj.id ? 'Splitting...' : 'Auto-Split Blocks'}
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Secondary Accordions inside Checklist Drawer: Open List Domino Queue (with Prerequisite Locks) + Add Deliverable */}
                  <div className="pt-3 border-t border-white/[0.05] flex flex-wrap items-center gap-2">
                    <button
                      id="btn-toggle-locked-projects-drawer"
                      type="button"
                      onClick={() => setLockedDrawerOpen(!lockedDrawerOpen)}
                      className="px-2.5 py-1 rounded-full bg-white/[0.025] hover:bg-white/[0.06] border border-white/[0.05] text-[11px] font-mono text-slate-300 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Lock className="w-3 h-3 text-cyan-300" />
                      <span>
                        Open List Queue ({openBacklogList.length}) • Prereq Locks &amp; Add
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
                      {openBacklogList.length > 0 && (
                        <div
                          id="open-list-domino-queue"
                          className="p-2.5 rounded-xl bg-black/30 border border-white/[0.06] space-y-1.5"
                        >
                          <div className="text-[10px] font-mono uppercase tracking-wider text-cyan-300/90">
                            Open List Backlog (Promotes First Unlocked Item into Slot #3)
                          </div>
                          {openBacklogList.map((item, idx) => {
                            const itemDrip = isProjectAmbitionDripEligible(item);
                            const isUnlocked = isOpenListItemUnlocked(
                              item,
                              state.completedDeliverablesLog
                            );
                            const isEditingPrereq = editingPrereqItemId === item.id;
                            const totalB = item.blocksTotal ?? item.totalBlocks ?? 4;

                            return (
                              <div
                                key={item.id}
                                id={`open-list-row-${item.id}`}
                                className={`p-2 rounded-lg border space-y-1.5 text-xs ${
                                  !isUnlocked
                                    ? 'bg-amber-950/15 border-amber-500/25'
                                    : 'bg-white/[0.02] border-white/[0.05]'
                                }`}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-1.5">
                                      <span className="font-mono text-[10px] text-slate-400">
                                        #{idx + 1}
                                      </span>
                                      {itemDrip && (
                                        <span className="px-1.5 py-0.2 rounded bg-violet-500/15 border border-violet-400/35 font-mono text-[9px] uppercase text-violet-200">
                                          Ambition Drip
                                        </span>
                                      )}
                                      <span className="text-slate-200 font-medium">
                                        {item.title}
                                      </span>
                                    </div>

                                    {/* Intra-Track Prerequisite Lock Pill */}
                                    {item.blockedByTitle && !isUnlocked && (
                                      <div className="flex flex-wrap items-center gap-1 mt-1">
                                        <span
                                          id={`prereq-lock-pill-${item.id}`}
                                          className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-400/40 font-mono text-[10px] text-amber-200 inline-flex items-center gap-1"
                                        >
                                          <Lock className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                                          <span>
                                            Locked until &ldquo;{item.blockedByTitle}&rdquo; is 100%
                                          </span>
                                        </span>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            onUpdateOpenListItem?.(item.id, {
                                              blockedByTitle: undefined,
                                            })
                                          }
                                          className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] font-mono text-[9px] text-slate-400 hover:text-slate-200 cursor-pointer"
                                          title="Clear prerequisite lock"
                                        >
                                          Clear Lock
                                        </button>
                                      </div>
                                    )}

                                    {item.blockedByTitle && isUnlocked && (
                                      <div className="mt-1">
                                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-400/35 font-mono text-[10px] text-emerald-200 inline-flex items-center gap-1">
                                          <Unlock className="w-2.5 h-2.5 text-emerald-300 shrink-0" />
                                          <span>
                                            Prerequisite &ldquo;{item.blockedByTitle}&rdquo; 100% — Ready to promote
                                          </span>
                                        </span>
                                      </div>
                                    )}

                                    {(item.notes || item.nextStepNote) && (
                                      <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                                        {item.notes || item.nextStepNote}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      id={`btn-edit-prereq-${item.id}`}
                                      type="button"
                                      onClick={() => {
                                        if (isEditingPrereq) {
                                          setEditingPrereqItemId(null);
                                        } else {
                                          setPrereqDraftText(item.blockedByTitle || '');
                                          setEditingPrereqItemId(item.id);
                                        }
                                      }}
                                      className="px-1.5 py-0.5 rounded bg-white/[0.04] hover:bg-white/[0.1] border border-white/[0.07] font-mono text-[9px] text-slate-300 cursor-pointer"
                                      title="Set or edit prerequisite deliverable lock"
                                    >
                                      {item.blockedByTitle ? 'Edit Lock' : '+ Lock'}
                                    </button>
                                    <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.07] font-mono text-[10px] text-slate-300">
                                      {item.completedBlocks || 0}/{totalB}b
                                    </span>
                                  </div>
                                </div>

                                {isEditingPrereq && (
                                  <form
                                    onSubmit={(e) => {
                                      e.preventDefault();
                                      onUpdateOpenListItem?.(item.id, {
                                        blockedByTitle: prereqDraftText.trim() || undefined,
                                      });
                                      setEditingPrereqItemId(null);
                                    }}
                                    className="flex flex-wrap items-center gap-1.5 pt-1"
                                  >
                                    <input
                                      type="text"
                                      value={prereqDraftText}
                                      onChange={(e) => setPrereqDraftText(e.target.value)}
                                      placeholder="Blocked until deliverable title is 100%..."
                                      className="flex-1 min-w-[140px] px-2 py-1 rounded bg-slate-950 border border-amber-400/40 font-mono text-[10px] text-slate-100"
                                    />
                                    <button
                                      type="submit"
                                      className="px-2 py-1 rounded bg-amber-400 text-slate-950 font-mono text-[10px] font-semibold cursor-pointer"
                                    >
                                      Save
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        onUpdateOpenListItem?.(item.id, {
                                          blockedByTitle: undefined,
                                        });
                                        setEditingPrereqItemId(null);
                                      }}
                                      className="px-2 py-1 rounded bg-white/[0.06] text-slate-300 font-mono text-[10px] cursor-pointer"
                                    >
                                      Clear
                                    </button>
                                  </form>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Add Deliverable Form (with optional Prerequisite Lock) */}
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
                          <select
                            id="select-new-project-track"
                            value={newProjTrack}
                            onChange={(e) => setNewProjTrack(e.target.value as TrackId)}
                            className="bg-slate-950 border border-white/[0.07] rounded-lg px-2 py-1 text-[11px] font-mono text-slate-200"
                          >
                            <option value="science">Major 1: Vocation</option>
                            <option value="writing">Major 2: Writing</option>
                            <option value="coding">Sandbox 1: Eng/Craft</option>
                            <option value="music">Sandbox 2: Music</option>
                            <option value="culture">Sandbox 3: Culture</option>
                          </select>
                          <button
                            id="btn-submit-smart-intake"
                            type="submit"
                            className="px-2.5 py-1 rounded-lg bg-cyan-400 text-slate-950 font-mono text-xs font-medium cursor-pointer"
                          >
                            Add
                          </button>
                        </div>
                        <input
                          id="input-new-project-prereq"
                          type="text"
                          value={newProjBlockedBy}
                          onChange={(e) => setNewProjBlockedBy(e.target.value)}
                          placeholder="Optional prerequisite: Locked until deliverable title is 100%..."
                          className="w-full bg-slate-950/80 border border-white/[0.06] rounded-lg px-2.5 py-1 text-[11px] font-mono text-slate-300"
                        />
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
                                setNewProjBlockedBy('');
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
                                  pendingIntakeTriage.startupStep,
                                  pendingIntakeTriage.blockedByTitle
                                );
                                setPendingIntakeTriage(null);
                                setNewProjTitle('');
                                setNewProjBlockedBy('');
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

                  {/* On-Demand Collapsible Accordions for Sequential Checklist, Smart Intake, 7-Day Table, and Calendar Importer */}
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

                    <button
                      id="btn-pipeline-import-calendar-quick"
                      type="button"
                      onClick={onOpenPipelineDrawer}
                      className="px-3 py-1.5 rounded-full bg-teal-500/10 hover:bg-teal-500/20 border border-teal-400/30 font-mono text-xs text-teal-200 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Calendar className="w-3.5 h-3.5 text-teal-300" />
                      <span>Import Calendar / Anchors</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* =====================================================================
              QUICK RESET / TRIAGE CONTROLS (Right-Hand Column)
             ===================================================================== */}
          <section
            id="bento-quick-triage-dock"
            aria-label="Quiet Single-Line Triage Bar"
            className={`w-full rounded-3xl bento-surface px-5 py-3.5 space-y-2 transition-all duration-500 ${
              isCinemaReceding
                ? 'opacity-15 blur-[2px] hover:opacity-100 hover:blur-0'
                : ''
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    disabled={timer.chainedBlocksCount >= 2}
                    onClick={() => {
                      triggerHaptic([10]);
                      onSelectL1Minutes(5);
                    }}
                    className={`px-3 py-1.5 rounded-full font-mono text-xs border transition cursor-pointer disabled:opacity-40 ${
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

                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic([10]);
                      onSelectL2Minutes(15);
                    }}
                    className={`px-3 py-1.5 rounded-full font-mono text-xs border transition cursor-pointer ${
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

                <div className="inline-flex items-center gap-1">
                  <button
                    id="btn-dock-stress-reset"
                    type="button"
                    onClick={() => {
                      triggerHaptic([20, 40, 20]);
                      onTriggerStressReset('BREATHING_478', 15);
                    }}
                    className={`px-3 py-1.5 rounded-full font-mono text-xs border flex items-center gap-1.5 transition cursor-pointer ${
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
                className="w-full rounded-3xl bento-surface p-5 grid grid-cols-1 gap-4 overflow-hidden"
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
      </div>

      {/* =====================================================================
          FULL-WIDTH EXPANDED PANELS BELOW MAIN STAGE:
          Smart Intake Planner, Sequential 20m Checklist, and 7-Day Master Pipeline
         ===================================================================== */}
      {intakeDrawerOpen && (
        <div className="w-full rounded-3xl bento-surface p-5">
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
          className="w-full p-5 rounded-3xl bento-surface space-y-2.5 max-h-96 overflow-y-auto"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 w-full">
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
        </div>
      )}

      {sevenDayAccordionOpen && (
        <div
          id="bento-interactive-7day-pipeline"
          className="w-full p-5 rounded-3xl bento-surface space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-mono text-slate-300">
              7-Day Master Pipeline
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onOpenPipelineDrawer}
                className="px-2.5 py-1 rounded-full bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/35 text-[11px] font-mono text-teal-200 cursor-pointer"
              >
                Import Calendar / Anchors
              </button>
              <button
                type="button"
                onClick={onOpenPipelineDrawer}
                className="text-[11px] font-mono text-cyan-300 underline cursor-pointer"
              >
                Open Full Drawer →
              </button>
            </div>
          </div>
          <InteractivePipelineTable
            state={state}
            onUpdateDay={onUpdatePipelineDay}
            compact={false}
          />
        </div>
      )}
    </div>
  );
};
