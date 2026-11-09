import {
  ActiveTaskType,
  AudioEngineSettings,
  BackupTriggerReason,
  BaselineBlock,
  CognitiveDemandTag,
  DailyHistoryEntry,
  ElasticBlockMultiplier,
  LoadMode,
  ProjectItem,
  StartupShrinkLevel,
  StateBackupSnapshot,
  StructureFlexibilityConfig,
  SymmetryState,
  TodayBlockLogEntry,
} from '../types/symmetry';

export const STORAGE_KEY = 'symmetry_manager_state_v1';
export const BACKUP_STORAGE_KEY = 'symmetry_state_backups_v1';
export const MAX_STATE_BACKUPS = 7;

export const DEFAULT_AUDIO_ENGINE_SETTINGS: AudioEngineSettings = {
  muted: false,
  volume: 0.45,
  soundscapeEnabled: true,
  soundscapeMode: 'WARM_BROWN_NOISE',
};


export const DEFAULT_FLEXIBILITY_TUNING: StructureFlexibilityConfig = {
  blockCadencePreset: '20_5_15',
  closedListLockMode: 'STRICT_SERIALIZED',
  activeFocusSlot: 1,
  slot1BlockedOnExternalFeedback: false,
  eveningPulseSensitivity: 'STANDARD_20_40_60',
  boundedCuriositySandboxUsedToday: false,
};

export function getBaselineCognitiveDemand(
  block: Pick<BaselineBlock, 'category' | 'cognitiveDemand'>
): CognitiveDemandTag {
  if (block.cognitiveDemand) return block.cognitiveDemand;
  if (
    block.category === 'FLASHCARDS_ANATOMY' ||
    block.category === 'FLASHCARDS_COMP'
  ) {
    return 'MECHANICAL_RECALL';
  }
  return 'DEEP_SYNTHESIS';
}

export function getProjectCognitiveDemand(
  project: Pick<ProjectItem, 'cognitiveDemand' | 'trackId' | 'presetType'>
): CognitiveDemandTag {
  if (project.cognitiveDemand) return project.cognitiveDemand;
  if (project.trackId === 'personal') return 'LIGHT_ADMIN';
  return 'DEEP_SYNTHESIS';
}

export function cycleCognitiveDemandTag(
  current: CognitiveDemandTag = 'DEEP_SYNTHESIS'
): CognitiveDemandTag {
  if (current === 'DEEP_SYNTHESIS') return 'MECHANICAL_RECALL';
  if (current === 'MECHANICAL_RECALL') return 'LIGHT_ADMIN';
  return 'DEEP_SYNTHESIS';
}

export function getBaselineSlotTargetBlocks(block: BaselineBlock): number {
  const rawTarget =
    typeof block.targetBlocks === 'number' && !Number.isNaN(block.targetBlocks)
      ? block.targetBlocks
      : typeof block.blocksTarget === 'number' && !Number.isNaN(block.blocksTarget)
      ? block.blocksTarget
      : undefined;
  if (typeof rawTarget === 'number') {
    return Math.max(1, Math.min(6, Math.round(rawTarget)));
  }
  return 1;
}

export function getBaselineSlotCompletedBlocks(block: BaselineBlock): number {
  const target = getBaselineSlotTargetBlocks(block);
  if (block.completed || block.bankedViaEarlyClearance) {
    return target;
  }
  if (typeof block.completedBlocks === 'number' && block.completedBlocks > 0) {
    return Math.min(target, Math.max(0, block.completedBlocks));
  }
  if (typeof block.partialCredit === 'number' && block.partialCredit > 0) {
    return Math.min(target, block.partialCredit);
  }
  return 0;
}

export function getTotalBaselineFloorBlocks(blocks: BaselineBlock[] | undefined): number {
  if (!blocks || blocks.length === 0) return 0;
  return blocks.reduce((sum, b) => sum + getBaselineSlotTargetBlocks(b), 0);
}

export function isBaselineSlotEarlyClearanceEligible(block: BaselineBlock): boolean {
  if (typeof block.earlyClearanceEligible === 'boolean') {
    return block.earlyClearanceEligible;
  }
  if (typeof block.supportsEarlyClearance === 'boolean') {
    return block.supportsEarlyClearance;
  }
  return (
    block.category === 'FLASHCARDS_ANATOMY' || block.category === 'FLASHCARDS_COMP'
  );
}

export function isBaselineSlotLateNightBlocked(block: BaselineBlock): boolean {
  if (typeof block.lateNightBlocker === 'boolean') {
    return block.lateNightBlocker;
  }
  return (
    block.category === 'FLASHCARDS_ANATOMY' || block.category === 'FLASHCARDS_COMP'
  );
}

export function isProjectSovereignDrip(
  project: Pick<ProjectItem, 'isSovereignDrip' | 'category'> | undefined | null
): boolean {
  if (!project) return false;
  return Boolean(project.isSovereignDrip || project.category === 'sovereign');
}

export function getEffectiveEveningCategoryCards(
  recharge: SymmetryState['recharge']
): import('../types/symmetry').EveningCategoryCardConfig[] {
  if (Array.isArray(recharge.categoryCards) && recharge.categoryCards.length > 0) {
    return recharge.categoryCards;
  }
  const cat1 =
    recharge.fluidCategories?.CAT1_MUSIC ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT1_MUSIC;
  const cat4 =
    recharge.fluidCategories?.CAT4_COMFORT ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT4_COMFORT;
  const s2 =
    recharge.stickySlots?.CAT2_MAKER ||
    DEFAULT_SYMMETRY_STATE.recharge.stickySlots.CAT2_MAKER;
  const s3a =
    recharge.stickySlots?.['3A_FICTION'] ||
    DEFAULT_SYMMETRY_STATE.recharge.stickySlots['3A_FICTION'];
  const s3b =
    recharge.stickySlots?.['3B_NONFICTION'] ||
    DEFAULT_SYMMETRY_STATE.recharge.stickySlots['3B_NONFICTION'];
  const s3c =
    recharge.stickySlots?.['3C_VIDEO'] ||
    DEFAULT_SYMMETRY_STATE.recharge.stickySlots['3C_VIDEO'];
  const s5 =
    recharge.stickySlots?.CAT5_GAMING ||
    DEFAULT_SYMMETRY_STATE.recharge.stickySlots.CAT5_GAMING;

  return [
    {
      id: 'CAT1_MUSIC',
      slotNumber: 1,
      categoryName: cat1.label.replace(/^1\.\s*/, ''),
      subtitle: cat1.subtitle,
      behavior: 'FLUID',
      trackMode: 'SINGLE',
      activeTitle: cat1.activeTitle,
      startupPrompt: cat1.startupStep,
      backlogQueue: [],
      fiveMinStarts: 0,
      unlockedViaCheckIn: false,
      hidden: false,
      legacyCategoryKey: 'CAT1_MUSIC',
      fluidKey: 'CAT1_MUSIC',
    },
    {
      id: 'CAT2_MAKER',
      slotNumber: 2,
      categoryName: s2.label.replace(/\s*\[Sticky\]$/i, ''),
      subtitle: 'Hands-on diagnostic, build, or tactile progression.',
      behavior: 'STICKY',
      trackMode: 'SINGLE',
      activeTitle: s2.activeTitle,
      startupPrompt: s2.startupStep,
      backlogQueue: [...(s2.backlogQueue || [])],
      fiveMinStarts: s2.fiveMinStarts || 0,
      unlockedViaCheckIn: Boolean(s2.unlockedViaCheckIn),
      hidden: false,
      legacyCategoryKey: 'CAT2_MAKER',
      stickyKey: 'CAT2_MAKER',
    },
    {
      id: 'CAT3_MEDIA',
      slotNumber: 3,
      categoryName: 'Reading & Media',
      subtitle: 'Parallel sticky tracks across Fiction, Nonfiction, and Watch.',
      behavior: 'STICKY',
      trackMode: 'TRIPLE',
      activeTitle: s3a.activeTitle,
      startupPrompt: s3a.startupStep,
      backlogQueue: [...(s3a.backlogQueue || [])],
      fiveMinStarts: s3a.fiveMinStarts || 0,
      unlockedViaCheckIn: Boolean(s3a.unlockedViaCheckIn),
      activeSubTrackId: recharge.activeMediaTab || '3A_FICTION',
      subTracks: [
        {
          id: '3A_FICTION',
          label: s3a.label.replace(/\s*\[Sticky\]$/i, ''),
          activeTitle: s3a.activeTitle,
          startupPrompt: s3a.startupStep,
          backlogQueue: [...(s3a.backlogQueue || [])],
          fiveMinStarts: s3a.fiveMinStarts || 0,
          unlockedViaCheckIn: Boolean(s3a.unlockedViaCheckIn),
          speedControl: true,
        },
        {
          id: '3B_NONFICTION',
          label: s3b.label.replace(/\s*\[Sticky\]$/i, ''),
          activeTitle: s3b.activeTitle,
          startupPrompt: s3b.startupStep,
          backlogQueue: [...(s3b.backlogQueue || [])],
          fiveMinStarts: s3b.fiveMinStarts || 0,
          unlockedViaCheckIn: Boolean(s3b.unlockedViaCheckIn),
        },
        {
          id: '3C_VIDEO',
          label: s3c.label.replace(/\s*\[Sticky\]$/i, ''),
          activeTitle: s3c.activeTitle,
          startupPrompt: s3c.startupStep,
          backlogQueue: [...(s3c.backlogQueue || [])],
          fiveMinStarts: s3c.fiveMinStarts || 0,
          unlockedViaCheckIn: Boolean(s3c.unlockedViaCheckIn),
        },
      ],
      hidden: false,
      legacyCategoryKey: 'CAT3_MEDIA',
    },
    {
      id: 'CAT4_COMFORT',
      slotNumber: 4,
      categoryName: cat4.label.replace(/^4\.\s*/, ''),
      subtitle: cat4.subtitle,
      behavior: 'FLUID',
      trackMode: 'SINGLE',
      activeTitle: cat4.activeTitle,
      startupPrompt: cat4.startupStep,
      backlogQueue: [],
      fiveMinStarts: 0,
      unlockedViaCheckIn: false,
      hidden: false,
      legacyCategoryKey: 'CAT4_COMFORT',
      fluidKey: 'CAT4_COMFORT',
    },
    {
      id: 'CAT5_GAMING',
      slotNumber: 5,
      categoryName: s5.label.replace(/\s*\[Sticky\]$/i, ''),
      subtitle: 'Focused interactive objective with 20m/40m check-in pacing.',
      behavior: 'STICKY',
      trackMode: 'SINGLE',
      activeTitle: s5.activeTitle,
      startupPrompt: s5.startupStep,
      backlogQueue: [...(s5.backlogQueue || [])],
      fiveMinStarts: s5.fiveMinStarts || 0,
      unlockedViaCheckIn: Boolean(s5.unlockedViaCheckIn),
      hidden: false,
      legacyCategoryKey: 'CAT5_GAMING',
      stickyKey: 'CAT5_GAMING',
    },
  ];
}

export function getActiveFocusProject(
  state: SymmetryState
): ProjectItem | undefined {
  const lockMode =
    state.flexibilityTuning?.closedListLockMode || 'STRICT_SERIALIZED';
  const activeSlot =
    state.activeDualSlotNumber ??
    state.flexibilityTuning?.activeDualSlotNumber ??
    state.flexibilityTuning?.activeFocusSlot ??
    1;
  if (lockMode === 'DUAL_SLOT' && activeSlot === 2 && state.projectQueue[1]) {
    return state.projectQueue[1];
  }
  return state.projectQueue[0];
}

export function getActiveSovereignDripProject(
  state: SymmetryState
): ProjectItem | undefined {
  const sovereignItems = (state.projectQueue || []).filter((p) =>
    isProjectSovereignDrip(p)
  );
  if (sovereignItems.length === 0) return undefined;
  // Prefer a 1-block Sovereign Drip item with 0/1 completed (e.g. Monday Sovereign Drip sextant-core)
  const oneBlockReady = sovereignItems.find(
    (p) => p.completedBlocks < p.totalBlocks && p.totalBlocks === 1
  );
  if (oneBlockReady) return oneBlockReady;
  const anyUncompleted = sovereignItems.find(
    (p) => p.completedBlocks < p.totalBlocks
  );
  return anyUncompleted || sovereignItems[0];
}

export function getActiveBlockDurationsSeconds(state: SymmetryState): {
  startupSeconds: number;
  momentumSeconds: number;
  totalMinutes: number;
  startupMinutes: number;
  momentumMinutes: number;
  startupLabel: string;
  momentumLabel: string;
  multiplier: ElasticBlockMultiplier;
  blockCredit: ElasticBlockMultiplier;
} {
  const multiplier: ElasticBlockMultiplier =
    state.timer.elasticMultiplier === 0.5 || state.timer.elasticMultiplier === 2.0
      ? state.timer.elasticMultiplier
      : 1.0;

  if (multiplier === 0.5) {
    return {
      startupSeconds: 180,
      momentumSeconds: 420,
      totalMinutes: 10,
      startupMinutes: 3,
      momentumMinutes: 7,
      startupLabel: '3m Startup',
      momentumLabel: '7m Momentum',
      multiplier: 0.5,
      blockCredit: 0.5,
    };
  }

  if (multiplier === 2.0) {
    return {
      startupSeconds: 300,
      momentumSeconds: 2100,
      totalMinutes: 40,
      startupMinutes: 5,
      momentumMinutes: 35,
      startupLabel: '5m Startup',
      momentumLabel: '35m Momentum',
      multiplier: 2.0,
      blockCredit: 2.0,
    };
  }

  const preset = state.flexibilityTuning?.blockCadencePreset || '20_5_15';
  if (
    preset === '15_3_12' ||
    preset === '15M_3_12' ||
    preset === 'CADENCE_15_3_12'
  ) {
    return {
      startupSeconds: 180,
      momentumSeconds: 720,
      totalMinutes: 15,
      startupMinutes: 3,
      momentumMinutes: 12,
      startupLabel: '3m Startup',
      momentumLabel: '12m Momentum',
      multiplier: 1.0,
      blockCredit: 1.0,
    };
  }
  if (
    preset === '25_5_20' ||
    preset === '25M_5_20' ||
    preset === 'CADENCE_25_5_20'
  ) {
    return {
      startupSeconds: 300,
      momentumSeconds: 1200,
      totalMinutes: 25,
      startupMinutes: 5,
      momentumMinutes: 20,
      startupLabel: '5m Startup',
      momentumLabel: '20m Momentum',
      multiplier: 1.0,
      blockCredit: 1.0,
    };
  }

  return {
    startupSeconds: 300,
    momentumSeconds: 900,
    totalMinutes: 20,
    startupMinutes: 5,
    momentumMinutes: 15,
    startupLabel: '5m Startup',
    momentumLabel: '15m Momentum',
    multiplier: 1.0,
    blockCredit: 1.0,
  };
}

export function getShrunkStartupPrompt(
  basePrompt: string,
  taskTitleOrType: string,
  taskTypeOrLevel?: ActiveTaskType | StartupShrinkLevel,
  maybeLevel?: StartupShrinkLevel
): string {
  const level: StartupShrinkLevel =
    typeof maybeLevel === 'number'
      ? maybeLevel
      : typeof taskTypeOrLevel === 'number'
      ? taskTypeOrLevel
      : 1;
  const taskType: ActiveTaskType =
    typeof taskTypeOrLevel === 'string'
      ? taskTypeOrLevel
      : (taskTitleOrType as ActiveTaskType) || 'PROJECT';

  if (level === 2) {
    if (taskType === 'FLASHCARDS') {
      return 'Just open the deck on screen and read 1 single card without grading speed.';
    }
    if (taskType === 'READING') {
      return 'Just open the chapter/document on screen and write one messy header or read 1 paragraph.';
    }
    return 'Just open the document/deck on screen and write one messy header or read 1 card.';
  }
  if (level === 3) {
    return 'Take 1 deep breath, put hands on keyboard, and look at the current paragraph for 60 seconds.';
  }
  return basePrompt;
}

/**
 * Logical Day-Rollover Boundary (Default 4:00 AM, adjustable 12:00 AM – 6:00 AM):
 * Any local hour < rolloverHour counts as part of the previous logical day.
 */
export function formatRolloverHourLabel(rolloverHour: number = 4): string {
  const clamped = Math.max(0, Math.min(6, Math.round(rolloverHour)));
  if (clamped === 0) return '12:00 AM';
  return `${clamped}:00 AM`;
}

export function getLogicalDayKey(
  date: Date = new Date(),
  rolloverHour: number = 4
): string {
  const clampedHour = Math.max(0, Math.min(6, Math.round(rolloverHour)));
  const shifted = new Date(date.getTime());
  if (shifted.getHours() < clampedHour) {
    shifted.setDate(shifted.getDate() - 1);
  }
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isPre4amRolloverWindow(
  date: Date = new Date(),
  rolloverHour: number = 4
): boolean {
  const clampedHour = Math.max(0, Math.min(6, Math.round(rolloverHour)));
  return date.getHours() < clampedHour;
}

export interface ExamProximityInfo {
  isWithin3Days: boolean;
  daysToNov12: number;
  daysToDec8: number;
  nearestExamLabel: string;
  daysRemaining: number;
  examLabel: string;
  daysUntil: number;
}

export function getPreExamTaperSuggestion(date: Date = new Date()): ExamProximityInfo {
  const todayMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
  const nov12Midnight = new Date(date.getFullYear(), 10, 12).getTime();
  const dec8Midnight = new Date(date.getFullYear(), 11, 8).getTime();

  const daysToNov12 = Math.round((nov12Midnight - todayMidnight) / (1000 * 60 * 60 * 24));
  const daysToDec8 = Math.round((dec8Midnight - todayMidnight) / (1000 * 60 * 60 * 24));

  const withinNov12 = daysToNov12 >= 0 && daysToNov12 <= 3;
  const withinDec8 = daysToDec8 >= 0 && daysToDec8 <= 3;
  const isWithin3Days = withinNov12 || withinDec8;

  const useNov12 = daysToNov12 >= 0 || daysToDec8 < 0;
  const label = useNov12 ? 'Nov 12: Anatomy Exam' : 'Dec 8: Comp Exam';
  const days = useNov12 ? daysToNov12 : daysToDec8;
  return {
    isWithin3Days,
    daysToNov12,
    daysToDec8,
    nearestExamLabel: label,
    daysRemaining: days,
    examLabel: label,
    daysUntil: days,
  };
}

export function createLogTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

const initialLogicalDay = getLogicalDayKey();

const DEFAULT_OPEN_LIST_BACKLOG: SymmetryState['openListBacklog'] = [
  {
    id: 'proj_4',
    title: 'SymmetryProductivity v1.0 Live Build & Public Launch (symmetrical.averykarlin.org) (3b — Promotes Mon after sextant-core)',
    presetType: 'CUSTOM',
    completedBlocks: 0,
    totalBlocks: 3,
    trackId: 'coding',
    startupStep: 'Run production build check, verify DNS/deployment on symmetrical.averykarlin.org, and ship v1.0.',
    nextStepNote: 'Promotes Mon after sextant-core v0.1.0 Public Launch & Zenodo DOI Mint completes.',
    cognitiveDemand: 'DEEP_SYNTHESIS',
    isSovereignDrip: true,
    category: 'sovereign',
  },
  {
    id: 'proj_5',
    title: 'Lab Report #4 (From Tue, Nov 10 Double Lab — Due Tue, Nov 24) (8b)',
    presetType: 'PAPER_8',
    completedBlocks: 0,
    totalBlocks: 8,
    trackId: 'science',
    startupStep: 'Import raw measurement tables from Tue Nov 10 Double Lab and plot calibration curves.',
    nextStepNote: 'Promotes after Practicum Proposal completes on Wed, Nov 11.',
    cognitiveDemand: 'DEEP_SYNTHESIS',
    isSovereignDrip: false,
    category: 'institutional',
  },
  {
    id: 'proj_6',
    title: 'Practicum Project Phase 1: Coding, Data Pipeline & Figures (Nov 25 – Dec 3) (10b)',
    presetType: 'CUSTOM',
    completedBlocks: 0,
    totalBlocks: 10,
    trackId: 'science',
    startupStep: 'Initialize practicum analysis notebook and run baseline dataset ingestion script.',
    nextStepNote: 'Scheduled for Nov 25 – Dec 3 window (10 blocks).',
    cognitiveDemand: 'DEEP_SYNTHESIS',
    isSovereignDrip: false,
    category: 'institutional',
  },
  {
    id: 'proj_7',
    title: 'Debut Science Fiction Novel — Premise & Worldbuilding Sandbox (Sovereign Drip)',
    presetType: 'PAPER_8',
    completedBlocks: 0,
    totalBlocks: 8,
    trackId: 'writing',
    startupStep: 'Open worldbuilding ledger and draft 1 scene beat or character premise paragraph.',
    nextStepNote: 'Sovereign Ambition Drip creative writing sandbox.',
    cognitiveDemand: 'DEEP_SYNTHESIS',
    isSovereignDrip: true,
    category: 'sovereign',
  },
  {
    id: 'proj_8',
    title: 'Late-Nov Job Search Cover Letter Pre-Warm (2b/wknd — Master Resume 2/2 Already 100% DONE!)',
    presetType: 'QUICK_2',
    completedBlocks: 0,
    totalBlocks: 2,
    trackId: 'personal',
    startupStep: 'Open cover letter template and tailor opening clinical physics paragraph.',
    nextStepNote: 'Master Resume 2/2 Already 100% DONE! Weekend 2-block cover letter pre-warm.',
    cognitiveDemand: 'LIGHT_ADMIN',
    isSovereignDrip: false,
    category: 'institutional',
  },
];

const DEFAULT_COMPLETED_DELIVERABLES: SymmetryState['completedDeliverablesLog'] = [
  {
    id: 'arch_0',
    title: 'Master Resume Overhaul & Clinical Physics CV (2/2 — 100% DONE!)',
    trackId: 'personal',
    presetType: 'QUICK_2',
    totalBlocks: 2,
    blockCount: 2,
    blocksCompleted: 2,
    date: '2026-11-08',
    completedDate: '2026-11-08',
    completedAt: '2026-11-08',
  },
  {
    id: 'arch_1',
    title: 'Cardiovascular Pathophysiology Case Deck (4-Block Slide Deck)',
    trackId: 'science',
    presetType: 'SLIDES_4',
    totalBlocks: 4,
    blockCount: 4,
    blocksCompleted: 4,
    date: '2026-11-04',
    completedDate: '2026-11-04',
    completedAt: '2026-11-04',
  },
  {
    id: 'arch_2',
    title: 'Clinical Ethics Response Draft (2-Page Paper)',
    trackId: 'writing',
    presetType: 'PAPER_8',
    totalBlocks: 8,
    blockCount: 8,
    blocksCompleted: 8,
    date: '2026-11-02',
    completedDate: '2026-11-02',
    completedAt: '2026-11-02',
  },
];

export const DEFAULT_TODAY_BLOCK_LOG: TodayBlockLogEntry[] = [];

export function buildDefault90DayHistory(
  anchorLogicalDay: string = initialLogicalDay
): DailyHistoryEntry[] {
  const parts = anchorLogicalDay.split('-').map(Number);
  const baseDate =
    parts.length === 3 && !parts.some(Number.isNaN)
      ? new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
      : new Date();

  const entries: DailyHistoryEntry[] = [];
  for (let offset = 89; offset >= 0; offset--) {
    const d = new Date(baseDate.getTime());
    d.setDate(d.getDate() - offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${day}`;

    if (offset === 0) {
      entries.push({
        logicalDate: dateKey,
        mode: 'TAPER',
        blocksCompleted: 0,
        inputBlocks: 0,
        outputBlocks: 0,
        eveningSessions: 0,
      });
      continue;
    }

    // Deterministic 7-day cycle strictly honoring <= 2 consecutive Surge days
    const cycle = offset % 7;
    if (cycle === 0) {
      entries.push({
        logicalDate: dateKey,
        mode: 'CRUISE',
        blocksCompleted: 12,
        inputBlocks: 6,
        outputBlocks: 6,
        eveningSessions: 2,
      });
    } else if (cycle === 1) {
      entries.push({
        logicalDate: dateKey,
        mode: 'TAPER',
        blocksCompleted: 8,
        inputBlocks: 5,
        outputBlocks: 3,
        eveningSessions: 2,
      });
    } else if (cycle === 2) {
      entries.push({
        logicalDate: dateKey,
        mode: 'SURGE',
        blocksCompleted: 14,
        inputBlocks: 7,
        outputBlocks: 7,
        eveningSessions: 1,
      });
    } else if (cycle === 3) {
      entries.push({
        logicalDate: dateKey,
        mode: 'SURGE',
        blocksCompleted: 15,
        inputBlocks: 7,
        outputBlocks: 8,
        eveningSessions: 2,
      });
    } else if (cycle === 4) {
      entries.push({
        logicalDate: dateKey,
        mode: 'CRUISE',
        blocksCompleted: 11,
        inputBlocks: 6,
        outputBlocks: 5,
        eveningSessions: 2,
      });
    } else if (cycle === 5) {
      entries.push({
        logicalDate: dateKey,
        mode: 'EVENING_RECHARGE',
        blocksCompleted: 9,
        inputBlocks: 5,
        outputBlocks: 4,
        eveningSessions: 3,
      });
    } else {
      entries.push({
        logicalDate: dateKey,
        mode: offset % 14 === 6 ? 'TAPER' : 'CRUISE',
        blocksCompleted: offset % 14 === 6 ? 8 : 12,
        inputBlocks: offset % 14 === 6 ? 4 : 6,
        outputBlocks: offset % 14 === 6 ? 4 : 6,
        eveningSessions: 2,
      });
    }
  }
  return entries;
}

export const DEFAULT_DAILY_HISTORY: DailyHistoryEntry[] =
  buildDefault90DayHistory(initialLogicalDay);

const DEFAULT_BASELINE_SLOTS: BaselineBlock[] = [
  {
    id: 'floor_half_ch',
    title: 'Daily Half-Chapter (29 Remaining to Comp)',
    category: 'READING',
    completed: false,
    targetBlocks: 3,
    blocksTarget: 3,
    completedBlocks: 0,
    bankedViaEarlyClearance: false,
    earlyClearanceEligible: false,
    supportsEarlyClearance: false,
    lateNightBlocker: false,
    startupStep:
      'Open assigned half-chapter, read first 2 pages, write down core equations (2b reading + 1b synthesis).',
    trackId: 'science',
    cognitiveDemand: 'DEEP_SYNTHESIS',
  },
  {
    id: 'floor_fc_anatomy',
    title: 'Flashcard Sprints (Anatomy Queue — Pre-Exam 50/50 Split)',
    category: 'FLASHCARDS_ANATOMY',
    completed: false,
    targetBlocks: 2,
    blocksTarget: 2,
    completedBlocks: 0,
    bankedViaEarlyClearance: false,
    earlyClearanceEligible: true,
    supportsEarlyClearance: true,
    lateNightBlocker: true,
    startupStep:
      'Open Anatomy Decks 1–4 (Pre-Exam 50/50 Split) and clear first 15 cards.',
    trackId: 'science',
    cognitiveDemand: 'MECHANICAL_RECALL',
  },
  {
    id: 'floor_fc_comp',
    title: 'Flashcard Sprints (Comp Queue — 250-Card Cap)',
    category: 'FLASHCARDS_COMP',
    completed: false,
    targetBlocks: 2,
    blocksTarget: 2,
    completedBlocks: 0,
    bankedViaEarlyClearance: false,
    earlyClearanceEligible: true,
    supportsEarlyClearance: true,
    lateNightBlocker: true,
    startupStep:
      'Open Comp flashcard review queue (250-Card Cap) and clear first 20 due cards.',
    trackId: 'science',
    cognitiveDemand: 'MECHANICAL_RECALL',
  },
];

const DEFAULT_SEVEN_DAY_PIPELINE: SymmetryState['pipelineDays'] = [
  {
    dayIndex: 1,
    dayLabel: 'Mon, Nov 9',
    loadMode: 'TAPER',
    mode: 'TAPER_LAB',
    modeAndAnchors: 'TAPER_LAB (~2h Y-90 Lab + D&D Night Early Stop)',
    projectBlocksSummary: '3 proj blocks',
    deliverablesCompleted:
      'Practicum Proposal (3/6 — 50% DONE) + SOVEREIGN DRIP: sextant-core v0.1.0 Public Launch & DOI (1/1 LIVE!) (28 Half-Ch left)',
    primaryDeliverable:
      'Practicum Proposal (3/6 — 50% DONE) + SOVEREIGN DRIP: sextant-core v0.1.0 Public Launch & DOI (1/1 LIVE!) (28 Half-Ch left)',
    cruisePlus: false,
    baseTargetBlocks: 10,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'LAB_2H',
    fixedEventTimeLabel: '~2h Y-90 Lab + D&D Night Early Stop',
    earlyMorningAnchor: true,
    isToday: true,
  },
  {
    dayIndex: 2,
    dayLabel: 'Tue, Nov 10',
    loadMode: 'TAPER',
    mode: 'TAPER_LAB',
    modeAndAnchors: 'TAPER_LAB (Double Lab Incl. Lab #4)',
    projectBlocksSummary: '3 proj blocks',
    deliverablesCompleted:
      'Practicum Proposal (5/6 — 83% DONE) + SOVEREIGN DRIP: Revised Paper #1 Sent (1/3 DONE!) (27 left)',
    primaryDeliverable:
      'Practicum Proposal (5/6 — 83% DONE) + SOVEREIGN DRIP: Revised Paper #1 Sent (1/3 DONE!) (27 left)',
    cruisePlus: false,
    baseTargetBlocks: 10,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'LAB_2H',
    fixedEventTimeLabel: 'Double Lab Incl. Lab #4',
    earlyMorningAnchor: true,
    isToday: false,
  },
  {
    dayIndex: 3,
    dayLabel: 'Wed, Nov 11',
    loadMode: 'TAPER',
    mode: 'TAPER_LAB',
    modeAndAnchors: 'TAPER_LAB (Pre-Exam Taper — Half-Ch Canceled)',
    projectBlocksSummary: '2 proj blocks',
    deliverablesCompleted:
      'Practicum Proposal (6/6 — 100% DONE!) + SOVEREIGN DRIP: Revised Paper #2 Sent (2/3 DONE!) (27 left)',
    primaryDeliverable:
      'Practicum Proposal (6/6 — 100% DONE!) + SOVEREIGN DRIP: Revised Paper #2 Sent (2/3 DONE!) (27 left)',
    cruisePlus: false,
    baseTargetBlocks: 9,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'LAB_2H',
    fixedEventTimeLabel: 'Pre-Exam Taper — Half-Ch Canceled',
    earlyMorningAnchor: true,
    isToday: false,
  },
  {
    dayIndex: 4,
    dayLabel: 'Thu, Nov 12',
    loadMode: 'TAPER',
    mode: 'TAPER_LAB',
    modeAndAnchors: 'TAPER_LAB (EXAM DAY)',
    projectBlocksSummary: '0 proj blocks',
    deliverablesCompleted:
      'ANATOMY EXAM (Decks 1–4 All 16/16 Done!) + Licensing Practicum + Proposal Submitted!',
    primaryDeliverable:
      'ANATOMY EXAM (Decks 1–4 All 16/16 Done!) + Licensing Practicum + Proposal Submitted!',
    cruisePlus: false,
    baseTargetBlocks: 7,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'LAB_2H',
    fixedEventTimeLabel: 'EXAM DAY — Anatomy Exam + Licensing Practicum',
    earlyMorningAnchor: true,
    isToday: false,
  },
  {
    dayIndex: 5,
    dayLabel: 'Fri, Nov 13',
    loadMode: 'CRUISE',
    mode: 'CRUISE',
    modeAndAnchors: 'CRUISE (The Imaginary Invalid — 6:00 PM Early Shutdown)',
    projectBlocksSummary: '4 proj blocks',
    deliverablesCompleted:
      'SOVEREIGN DRIP: Revised Paper #3 Sent (3/3 — 100% DONE!) + SymmetryProductivity v1.0 Public Launch (3 blocks / 60m) (26 left)',
    primaryDeliverable:
      'SOVEREIGN DRIP: Revised Paper #3 Sent (3/3 — 100% DONE!) + SymmetryProductivity v1.0 Public Launch (3 blocks / 60m) (26 left)',
    cruisePlus: false,
    baseTargetBlocks: 11,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'EVENING_OUTING_6PM',
    fixedEventTimeLabel: 'The Imaginary Invalid — 6:00 PM Early Shutdown',
    earlyMorningAnchor: false,
    isToday: false,
  },
  {
    dayIndex: 6,
    dayLabel: 'Sat, Nov 14',
    loadMode: 'CRUISE',
    mode: 'CRUISE',
    modeAndAnchors: 'CRUISE (Weekend Flow)',
    projectBlocksSummary: '4 proj blocks',
    deliverablesCompleted:
      'Lab Report #4 (3/8) + Daily Sovereign Ambition Drip (1b) (25 left)',
    primaryDeliverable:
      'Lab Report #4 (3/8) + Daily Sovereign Ambition Drip (1b) (25 left)',
    cruisePlus: false,
    baseTargetBlocks: 11,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'NONE',
    fixedEventTimeLabel: 'Weekend Flow',
    earlyMorningAnchor: false,
    isToday: false,
  },
  {
    dayIndex: 7,
    dayLabel: 'Sun, Nov 15',
    loadMode: 'CRUISE',
    mode: 'CRUISE',
    modeAndAnchors: 'CRUISE (Weekend Flow)',
    projectBlocksSummary: '4 proj blocks',
    deliverablesCompleted:
      'Lab Report #4 (6/8) + Daily Sovereign Ambition Drip (1b) (24 left)',
    primaryDeliverable:
      'Lab Report #4 (6/8) + Daily Sovereign Ambition Drip (1b) (24 left)',
    cruisePlus: false,
    baseTargetBlocks: 11,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'NONE',
    fixedEventTimeLabel: 'Weekend Flow',
    earlyMorningAnchor: false,
    isToday: false,
  },
];

export const DEFAULT_SYMMETRY_STATE: SymmetryState = {
  version: '1.1.0',
  profilePresetId: 'AVERY_DEFAULT',
  profileName: 'Avery Default (Medical Physics, Writing & Maker)',
  logicalDayRolloverHour: 4,
  earlyEveningShutdownTime: '6:00 PM',
  taskWeights: {
    heavyLabel: '2-Page Paper',
    heavyBlocks: 8,
    mediumLabel: 'Slide Deck',
    mediumBlocks: 4,
  },
  breakOptions: {
    l1Label: 'Window gaze / water / 3 dishes',
    l2EspressoLabel: 'Espresso Ritual',
    l2MusicLabel: '1–2 Song Riff on Bass/Guitar Cold (5m)',
    l2PhysicalLabel: '15m TENS / Normatec Compression Cycle',
    stressBreathingLabel: '4-7-8 Breathing Visual Pace',
    stressEspressoLabel: 'Espresso Ritual',
    stressBootsLabel: 'Compression Boots',
  },
  energyBandwidth: 'STEADY',
  shockAbsorberMode: 'FULL_SHIFT',
  shockAbsorberDeferredBlocks: 0,
  flexibilityTuning: { ...DEFAULT_FLEXIBILITY_TUNING },
  logicalDayKey: initialLogicalDay,
  todayBlockLog: DEFAULT_TODAY_BLOCK_LOG,
  dailyHistory: DEFAULT_DAILY_HISTORY,
  stateBackups: [],
  audioSettings: DEFAULT_AUDIO_ENGINE_SETTINGS,
  upcomingMilestones: ['Thu, Nov 12: Anatomy Exam & Proposal Due', 'Dec 8–9: Comp Exam'],
  bandwidth: 'Sharp',
  loadMode: 'TAPER',
  preExamTaperActive: false,
  cruisePlus: false,
  customModeBlockAdjustment: 10, // Mon, Nov 9 TAPER_LAB: 7 baseline blocks + 3 project blocks (2 Practicum Proposal + 1 Sovereign Drip)

  surgeConsecutiveDays: 0,
  midDayResetCompletedToday: false,
  fixedEvent: 'LAB_2H',
  flashcardsReviewedCount: 0,
  flashcardsDailyCap: 250,
  earlyClearanceEnabled: false,
  baselineBlocks: DEFAULT_BASELINE_SLOTS,
  baselineSlots: DEFAULT_BASELINE_SLOTS,
  projectQueue: [
    {
      id: 'proj_1',
      slot: 1,
      title: '1. Practicum Presentation Research Project Proposal (Due Thu, Nov 12)',
      presetType: 'CUSTOM',
      completedBlocks: 1,
      totalBlocks: 6,
      trackId: 'science',
      startupStep:
        'Open Practicum Proposal draft and write the next scheduled methodology/aims section (5 remaining across Mon–Wed).',
      nextStepNote: '1 / 6 blocks done (5 remaining across Mon–Wed) — Serialized Institutional Focus #1.',
      cognitiveDemand: 'DEEP_SYNTHESIS',
      isSovereignDrip: false,
      category: 'institutional',
      blockSubSteps: [
        'Block 1: Topic & Clinical Physics Problem Statement (DONE)',
        'Block 2: Specific Aims & Quantitative Hypothesis [Mon]',
        'Block 3: Dataset & Pipeline Architecture [Mon]',
        'Block 4: Validation Metrics & Figure Plan [Tue]',
        'Block 5: Timeline & Preliminary Benchmarks [Tue]',
        'Block 6: Final Proofread & Submission Check [Wed]',
      ],
    },
    {
      id: 'proj_2',
      slot: 2,
      title: '2. Send Out 3 Revised Academic Papers (1 Block Per Paper)',
      presetType: 'CUSTOM',
      completedBlocks: 0,
      totalBlocks: 3,
      trackId: 'science',
      startupStep:
        'Open revised manuscript submission folder, verify response-to-reviewers PDF, and submit.',
      nextStepNote:
        '0 / 3 blocks done (Block 1: Paper #1 [Tue Drip], Block 2: Paper #2 [Wed Drip], Block 3: Paper #3 [Fri Drip]).',
      cognitiveDemand: 'DEEP_SYNTHESIS',
      isSovereignDrip: true,
      category: 'sovereign',
      blockSubSteps: [
        'Block 1: Paper #1 [Tue Drip]',
        'Block 2: Paper #2 [Wed Drip]',
        'Block 3: Paper #3 [Fri Drip]',
      ],
    },
    {
      id: 'proj_3',
      slot: 3,
      title: '3. sextant-core v0.1.0 Public GitHub Launch & Zenodo DOI Mint',
      presetType: 'CUSTOM',
      completedBlocks: 0,
      totalBlocks: 1,
      trackId: 'coding',
      startupStep:
        'Push public repo, flip 1-click Zenodo integration, tag v0.1.0, mint citable DOI.',
      nextStepNote:
        '0 / 1 block done (Monday Sovereign Drip: Push public repo, flip 1-click Zenodo integration, tag v0.1.0, mint citable DOI).',
      cognitiveDemand: 'DEEP_SYNTHESIS',
      isSovereignDrip: true,
      category: 'sovereign',
      blockSubSteps: [
        'Monday Sovereign Drip: Push public repo, flip 1-click Zenodo integration, tag v0.1.0, mint citable DOI',
      ],
    },
  ],
  projectBacklog: DEFAULT_OPEN_LIST_BACKLOG,
  openListBacklog: DEFAULT_OPEN_LIST_BACKLOG,
  completedDeliverablesLog: DEFAULT_COMPLETED_DELIVERABLES,
  completedDeliverablesArchive: DEFAULT_COMPLETED_DELIVERABLES,
  pipelineDays: DEFAULT_SEVEN_DAY_PIPELINE,
  sevenDayPipeline: DEFAULT_SEVEN_DAY_PIPELINE,
  discretionaryBlocksCompletedToday: 0,
  dailySovereignDripDone: false,
  dailySovereignDripTarget: 1,
  sovereignGoldenRuleMode: true,
  timer: {
    mode: 'WORK_20M',
    workStage: 'IGNITION_5M',
    secondsLeft: 300, // 5m Startup Step (IGNITION_5M)
    targetEndTimeMs: null,
    isRunning: false,
    activeBlockSourceId: 'proj_1',
    activeTaskTitle: '1. Practicum Presentation Research Project Proposal (Due Thu, Nov 12)',
    activeTaskType: 'PROJECT',
    activeStartupPrompt:
      'Open Practicum Proposal draft and write the next scheduled methodology/aims section (5 remaining across Mon–Wed).',
    elasticMultiplier: 1.0,
    startupShrinkLevel: 1,
    chainedBlocksCount: 0,
    sessionDisplayDurationMinutes: 20,
    l1DurationMinutes: 5,
    l2DurationMinutes: 15,
    l2Protocol: 'ESPRESSO',
    l3DurationMinutes: 60,
    stressDurationMinutes: 15,
    stressProtocol: 'BREATHING_478',
    queuedRecoveryFlashcard5m: false,
    recoveryFlashcardRunning: false,
    recoveryFlashcardSecondsLeft: 300,
    recoveryFlashcardTargetEndTimeMs: null,
  },
  recharge: {
    endOfShiftLocked: false,
    manualEveningPreview: false,
    flowExtensionPromptOpen: false,
    flowExtensionActive: false,
    flowExtensionRunning: false,
    flowExtensionElapsedSeconds: 0,
    flowExtensionStartTimeMs: null,
    flowExtensionBlocksLoggedToday: 0,
    weeklyExtensionsUsed: 1, // 1 of 2 used this week
    lastChimeMinute: 0,
    option0Running: false,
    option0SecondsLeft: 1200, // 20m silent timer
    option0TargetEndTimeMs: null,
    option0ConsecutiveWindows: 0, // Cap at 2 (40m) -> Fork Check
    forkCheckModalOpen: false,
    activeCategory: 'NONE',
    activeMediaTab: '3A_FICTION',
    fictionSpeed: '2.00x',
    pacingStage: 'STARTUP_5M',
    categorySecondsLeft: 300,
    categoryTargetEndTimeMs: null,
    categoryElapsedMinutes: 0,
    categoryRunning: false,
    checkInModalOpen: false,
    checkInMilestone: 20,
    stickySlots: {
      CAT2_MAKER: {
        key: 'CAT2_MAKER',
        label: 'Maker / Hardware [Sticky]',
        activeTitle: 'Creality K1C 3D Printer',
        startupStep: '1 single 5m diagnostic or mechanical step',
        backlogQueue: ['Custom Cable Organizer CAD Bracket', 'Multimeter Sensor Enclosure Print'],
        queuedNextTitle: 'Custom Cable Organizer CAD Bracket',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      '3A_FICTION': {
        key: '3A_FICTION',
        label: '3A Fiction [Sticky]',
        activeTitle: 'Soul Music by Terry Pratchett',
        startupStep: 'Listen 5m at 1.75x–2.25x in boots or eyes closed',
        backlogQueue: ['Exoplanet', 'Feet of Clay', 'Hogfather'],
        queuedNextTitle: 'Exoplanet',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      '3B_NONFICTION': {
        key: '3B_NONFICTION',
        label: '3B Nonfiction [Sticky]',
        activeTitle: 'The American Way of Killing',
        startupStep: 'Listen 5m in recliner or compression boots',
        backlogQueue: ['The Emperor of All Maladies', 'Thinking in Systems'],
        queuedNextTitle: 'The Emperor of All Maladies',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      '3C_VIDEO': {
        key: '3C_VIDEO',
        label: '3C Video [Sticky]',
        activeTitle: "Widow's Bay",
        startupStep: 'Watch first 5m away from work monitor',
        backlogQueue: ['Severance Season 2', 'Andor Archive Cut'],
        queuedNextTitle: 'Severance Season 2',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      CAT5_GAMING: {
        key: 'CAT5_GAMING',
        label: 'Gaming [Sticky]',
        activeTitle: "Baldur's Gate 3",
        startupStep: 'Boot save + 1 single 5m micro-objective',
        backlogQueue: ['Factorio', 'Dwarf Fortress', 'RimWorld', 'Hades II'],
        queuedNextTitle: 'Factorio',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
    },
    fluidCategories: {
      CAT1_MUSIC: {
        label: '1. Music (Bass/Guitar/Piano/Drums cold song)',
        activeTitle: 'Music (Bass/Guitar/Piano/Drums cold song)',
        subtitle: 'Bass / Guitar / Piano / Drums — fluid musical expression.',
        startupStep: 'Play 1 familiar song cold — no DAW or drills',
      },
      CAT4_COMFORT: {
        label: "4. It's Always Sunny in Philadelphia",
        activeTitle: "It's Always Sunny in Philadelphia",
        subtitle: 'Low-friction comfort show recharge away from the desk setup.',
        startupStep: 'First 5m of episode away from work monitor',
      },
    },
    completedLog: [
      'Option 0: 20m Silent Stillness Window (1/2)',
      'Category 3A Fiction: Soul Music (20m Check-In cleared)',
      'Category 1 Music: 5m Cold Song Playthrough (Bass)',
    ],
  },
  roadmapTracks: [
    {
      id: 'science',
      name: 'Scientist & Lab Builder',
      archetypeRole: 'Scientist & Lab Builder',
      categoryLabel: 'CORE TRACK',
      isSandbox: false,
      activeThisWeek: true,
      inputBlocksCredited: 14,
      inputWeeklyTarget: 24,
      outputBlocksCredited: 6,
      outputWeeklyTarget: 12,
      rungs: [
        {
          rungNumber: 1,
          label: 'Rung 1 — Core Intake',
          description: 'Anatomy + Comp Flashcards & Half-Chapter Reading blocks',
          ledgerType: 'INPUT',
          completedBlocks: 10,
          targetBlocks: 16,
        },
        {
          rungNumber: 2,
          label: 'Rung 2 — Equation & Mechanism Synthesis',
          description: 'Half-Chapter problem derivations & concept condensation',
          ledgerType: 'INPUT',
          completedBlocks: 4,
          targetBlocks: 8,
        },
        {
          rungNumber: 3,
          label: 'Rung 3 — Case Slide Deck Assembly',
          description: '4-block clinical slide deck structured builds',
          ledgerType: 'OUTPUT',
          completedBlocks: 4,
          targetBlocks: 8,
        },
        {
          rungNumber: 4,
          label: 'Rung 4 — Final Verification & Delivery',
          description: 'Completed clinical presentations & lab reports',
          ledgerType: 'OUTPUT',
          completedBlocks: 2,
          targetBlocks: 4,
        },
      ],
    },
    {
      id: 'writing',
      name: 'Philosopher & Author',
      archetypeRole: 'Philosopher & Author',
      categoryLabel: 'CORE TRACK',
      isSandbox: false,
      activeThisWeek: true,
      inputBlocksCredited: 8,
      inputWeeklyTarget: 12,
      outputBlocksCredited: 7,
      outputWeeklyTarget: 12,
      rungs: [
        {
          rungNumber: 1,
          label: 'Rung 1 — Source & Media Intake',
          description: '3A Fiction ("Soul Music") & 3B Nonfiction ("The American Way of Killing")',
          ledgerType: 'INPUT',
          completedBlocks: 5,
          targetBlocks: 8,
        },
        {
          rungNumber: 2,
          label: 'Rung 2 — Structural Outlining',
          description: 'Half-chapter synthesis notes & paper section outlines',
          ledgerType: 'INPUT',
          completedBlocks: 3,
          targetBlocks: 4,
        },
        {
          rungNumber: 3,
          label: 'Rung 3 — 2-Page Paper Drafting',
          description: '8-block locked project sprints on active writing item',
          ledgerType: 'OUTPUT',
          completedBlocks: 5,
          targetBlocks: 8,
        },
        {
          rungNumber: 4,
          label: 'Rung 4 — Manuscript Polish & Export',
          description: 'Citation audit and final submission blocks',
          ledgerType: 'OUTPUT',
          completedBlocks: 2,
          targetBlocks: 4,
        },
      ],
    },
    {
      id: 'personal',
      name: 'Partner & Sanctuary',
      archetypeRole: 'Partner & Sanctuary',
      categoryLabel: 'CORE TRACK',
      isSandbox: false,
      activeThisWeek: true,
      inputBlocksCredited: 4,
      inputWeeklyTarget: 6,
      outputBlocksCredited: 3,
      outputWeeklyTarget: 6,
      rungs: [
        {
          rungNumber: 1,
          label: 'Rung 1 — Logistics & Maintenance Audit',
          description: 'Filter, supply, and home checklist review',
          ledgerType: 'INPUT',
          completedBlocks: 3,
          targetBlocks: 4,
        },
        {
          rungNumber: 2,
          label: 'Rung 2 — Resource & Schedule Planning',
          description: '7-day pipeline calibration & fixed event staging',
          ledgerType: 'INPUT',
          completedBlocks: 1,
          targetBlocks: 2,
        },
        {
          rungNumber: 3,
          label: 'Rung 3 — Physical Execution Blocks',
          description: 'Dedicated 20m home maintenance & organization blocks',
          ledgerType: 'OUTPUT',
          completedBlocks: 2,
          targetBlocks: 4,
        },
        {
          rungNumber: 4,
          label: 'Rung 4 — Closed-Loop Preventive Check',
          description: 'Completed monthly/quarterly home systems sign-off',
          ledgerType: 'OUTPUT',
          completedBlocks: 1,
          targetBlocks: 2,
        },
      ],
    },
    {
      id: 'coding',
      name: 'Coder/Maker & AveryCorp',
      archetypeRole: 'Coder/Maker & AveryCorp',
      categoryLabel: 'ZERO-QUOTA SANDBOX',
      isSandbox: true,
      activeThisWeek: false,
      inputBlocksCredited: 2,
      inputWeeklyTarget: 0,
      outputBlocksCredited: 3,
      outputWeeklyTarget: 0,
      rungs: [
        {
          rungNumber: 1,
          label: 'Rung 1 — Docs & Schematic Reference',
          description: 'K1C 3D printer & microcontroller reference reading',
          ledgerType: 'INPUT',
          completedBlocks: 2,
          targetBlocks: 4,
        },
        {
          rungNumber: 2,
          label: 'Rung 2 — Diagnostic Bench Checks',
          description: '5m K1C calibration & bed mesh inspection steps',
          ledgerType: 'OUTPUT',
          completedBlocks: 1,
          targetBlocks: 4,
        },
        {
          rungNumber: 3,
          label: 'Rung 3 — Prototype Print & Script Build',
          description: 'Iterative hardware/software utility builds',
          ledgerType: 'OUTPUT',
          completedBlocks: 2,
          targetBlocks: 4,
        },
        {
          rungNumber: 4,
          label: 'Rung 4 — Deployed Utility / Finished Print',
          description: 'Functional hardware mount or automation tool in use',
          ledgerType: 'OUTPUT',
          completedBlocks: 0,
          targetBlocks: 2,
        },
      ],
    },
    {
      id: 'music',
      name: 'Musician',
      archetypeRole: 'Musician',
      categoryLabel: 'ZERO-QUOTA SANDBOX',
      isSandbox: true,
      activeThisWeek: false,
      inputBlocksCredited: 2,
      inputWeeklyTarget: 0,
      outputBlocksCredited: 2,
      outputWeeklyTarget: 0,
      rungs: [
        {
          rungNumber: 1,
          label: 'Rung 1 — Active Listening & Chart Intake',
          description: ' repertoire listening & bass/guitar arrangement review',
          ledgerType: 'INPUT',
          completedBlocks: 2,
          targetBlocks: 4,
        },
        {
          rungNumber: 2,
          label: 'Rung 2 — 5m Cold Song Playthroughs',
          description: 'Fluid 5m instrument sessions (zero DAW/drills)',
          ledgerType: 'OUTPUT',
          completedBlocks: 2,
          targetBlocks: 4,
        },
        {
          rungNumber: 3,
          label: 'Rung 3 — Full Song Memory Lock',
          description: 'Unassisted full-track play from start to finish',
          ledgerType: 'OUTPUT',
          completedBlocks: 0,
          targetBlocks: 2,
        },
        {
          rungNumber: 4,
          label: 'Rung 4 — Live Acoustic / One-Take Capture',
          description: 'Simple acoustic playthrough archive',
          ledgerType: 'OUTPUT',
          completedBlocks: 0,
          targetBlocks: 2,
        },
      ],
    },
  ],
};

export function formatMinutesAsWorkLeft(minutes: number): string {
  if (minutes <= 0) return '0m work left';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m work left`;
  }
  return `${mins}m work left`;
}

export function computeShiftMetrics(state: SymmetryState) {
  const floorLen = getTotalBaselineFloorBlocks(state.baselineBlocks) || 1;
  const rawTarget = Math.max(1, state.customModeBlockAdjustment || floorLen);
  const totalTargetBlocks = state.preExamTaperActive
    ? Math.min(9, rawTarget)
    : rawTarget;
  const completedBaselineCount =
    Math.round(
      state.baselineBlocks.reduce(
        (acc, b) => acc + getBaselineSlotCompletedBlocks(b),
        0
      ) * 10
    ) / 10;
  const totalCompletedBlocks =
    Math.round((completedBaselineCount + state.discretionaryBlocksCompletedToday) * 10) / 10;
  const remainingBlocks = Math.max(
    0,
    Math.round((totalTargetBlocks - totalCompletedBlocks) * 10) / 10
  );
  const remainingMinutes = Math.round(remainingBlocks * 20);

  const remainingWorkFormatted = formatMinutesAsWorkLeft(remainingMinutes);

  const durationPrefix =
    remainingMinutes === 0
      ? '[0m work left]'
      : `[${state.timer.sessionDisplayDurationMinutes}m | ${remainingWorkFormatted}]`;

  return {
    totalTargetBlocks,
    completedBaselineCount,
    totalCompletedBlocks,
    remainingBlocks,
    remainingMinutes,
    remainingWorkFormatted,
    durationPrefix,
    isZeroWorkLeft: remainingMinutes === 0,
  };
}

/**
 * Generates the exact Sequential 20m Checklist (Interleaved Work Blocks + Auto-Breaks + Running Countdown)
 * from Block 1 down to `[0m work left — Hard Shutdown]`.
 */
export function generateSequentialChecklist(
  state: SymmetryState
): import('../types/symmetry').SequentialChecklistStep[] {
  const baselineCount = getTotalBaselineFloorBlocks(state.baselineBlocks) || 1;
  const totalTargetBlocks = Math.max(1, state.customModeBlockAdjustment || baselineCount);
  const primaryProject = getActiveFocusProject(state);
  const discretionaryCount = Math.max(0, totalTargetBlocks - baselineCount);
  const bandwidth = state.energyBandwidth || 'STEADY';

  interface RawWorkSpec {
    blockNumber: number;
    sourceId: string;
    title: string;
    categoryBadge: string;
    taskType: import('../types/symmetry').ActiveTaskType;
    cognitiveDemand: CognitiveDemandTag;
    startupStep: string;
    completed: boolean;
    banked: boolean;
  }

  const expandSlotToUnits = (
    b: BaselineBlock,
    defaultTaskType: import('../types/symmetry').ActiveTaskType,
    badgePrefix: string
  ): Omit<RawWorkSpec, 'blockNumber'>[] => {
    const target = getBaselineSlotTargetBlocks(b);
    const completedUnits = Math.floor(getBaselineSlotCompletedBlocks(b));
    const units: Omit<RawWorkSpec, 'blockNumber'>[] = [];
    for (let u = 1; u <= target; u++) {
      const unitCompleted = Boolean(b.completed || b.bankedViaEarlyClearance || u <= completedUnits);
      const suffix = target > 1 && !b.title.includes('/') ? ` — Block ${u}/${target}` : '';
      units.push({
        sourceId: b.id,
        title: `${b.title}${suffix}`,
        categoryBadge:
          target > 1 ? `${badgePrefix} (${u}/${target})` : badgePrefix,
        taskType: defaultTaskType,
        cognitiveDemand: getBaselineCognitiveDemand(b),
        startupStep: b.startupStep,
        completed: unitCompleted,
        banked: Boolean(b.bankedViaEarlyClearance),
      });
    }
    return units;
  };

  const fcSlots = state.baselineBlocks.filter((b) =>
    isBaselineSlotLateNightBlocked(b)
  );
  const nonFcSlots = state.baselineBlocks.filter(
    (b) => !isBaselineSlotLateNightBlocked(b)
  );
  const readSlots = nonFcSlots.filter((b) => b.category !== 'SYNTHESIS');
  const synthSlots = nonFcSlots.filter((b) => b.category === 'SYNTHESIS');

  const fcUnits = fcSlots.flatMap((b) =>
    expandSlotToUnits(b, 'FLASHCARDS', 'EARLY/MID SHIFT • RECALL')
  );
  const readUnits = readSlots.flatMap((b) =>
    expandSlotToUnits(b, 'READING', 'BASELINE FLOOR • INTAKE/ADMIN')
  );
  const synthUnits = synthSlots.flatMap((b) =>
    expandSlotToUnits(b, 'SYNTHESIS', 'BASELINE FLOOR • SYNTHESIS')
  );

  const earlyFcCount = Math.ceil(fcUnits.length / 2);
  const earlyFc = fcUnits.slice(0, earlyFcCount).map((u, idx) => ({
    ...u,
    categoryBadge: `EARLY SHIFT • RECALL (${idx + 1}/${fcUnits.length})`,
  }));
  const midFc = fcUnits.slice(earlyFcCount).map((u, idx) => ({
    ...u,
    categoryBadge: `MID-SHIFT • RECALL (${earlyFcCount + idx + 1}/${fcUnits.length})`,
  }));

  const frontReadUnits =
    synthUnits.length === 0 && readUnits.length > 1
      ? readUnits.slice(0, -1)
      : readUnits;
  const tailSynthUnits =
    synthUnits.length === 0 && readUnits.length > 1
      ? readUnits.slice(-1).map((u) => ({
          ...u,
          taskType: 'SYNTHESIS' as const,
          categoryBadge: 'BASELINE FLOOR • SYNTHESIS (3/3)',
        }))
      : synthUnits;

  const orderedBaselineSpecs: Omit<RawWorkSpec, 'blockNumber'>[] = [
    ...earlyFc,
    ...frontReadUnits,
    ...midFc,
    ...tailSynthUnits,
  ];

  // If Shock Absorber compressed totalTargetBlocks below baselineCount, keep completed first + highest-yield remaining baseline specs
  let activeBaselineSpecs = orderedBaselineSpecs;
  if (totalTargetBlocks < orderedBaselineSpecs.length) {
    const doneSpecs = orderedBaselineSpecs.filter((s) => s.completed && !s.banked);
    const pendingSpecs = orderedBaselineSpecs.filter((s) => !s.completed && !s.banked);
    const bankedSpecs = orderedBaselineSpecs.filter((s) => s.banked);
    activeBaselineSpecs = [...doneSpecs, ...pendingSpecs, ...bankedSpecs].slice(
      0,
      totalTargetBlocks
    );
  }

  const sovereignProject = getActiveSovereignDripProject(state);
  const rawDiscretionarySpecs: Omit<RawWorkSpec, 'blockNumber'>[] = [];
  for (let d = 1; d <= discretionaryCount; d++) {
    const isCapstoneSovereignSlot =
      Boolean(sovereignProject) &&
      (state.dailySovereignDripTarget ?? 1) >= 1 &&
      d === discretionaryCount;

    if (isCapstoneSovereignSlot && sovereignProject) {
      const isDripCompleted = Boolean(
        state.dailySovereignDripDone ||
          d <= Math.floor(state.discretionaryBlocksCompletedToday)
      );
      rawDiscretionarySpecs.push({
        sourceId: sovereignProject.id,
        title: `${sovereignProject.title} — Sovereign Drip #${sovereignProject.slot} (1/1 Daily Drip)`,
        categoryBadge: `SOVEREIGN AMBITION DRIP — 1B/DAY • SLOT #${sovereignProject.slot}`,
        taskType: 'PROJECT',
        cognitiveDemand: getProjectCognitiveDemand(sovereignProject),
        startupStep: sovereignProject.startupStep,
        completed: isDripCompleted,
        banked: false,
      });
    } else {
      const isCompleted = d <= Math.floor(state.discretionaryBlocksCompletedToday);
      const projTitle = primaryProject?.title || 'Closed List Focus #1';
      const projSlot = primaryProject?.slot || 1;
      const projStartup =
        primaryProject?.startupStep ||
        'Open primary deliverable and complete 5m ignition step.';
      const projDemand = primaryProject
        ? getProjectCognitiveDemand(primaryProject)
        : 'DEEP_SYNTHESIS';
      rawDiscretionarySpecs.push({
        sourceId: primaryProject?.id || 'proj_1',
        title: `${projTitle} — Serialized Focus #${projSlot} (Block ${d}/${discretionaryCount})`,
        categoryBadge: `SERIALIZED INSTITUTIONAL FOCUS #${projSlot} • (${d}/${discretionaryCount})`,
        taskType: 'PROJECT',
        cognitiveDemand: projDemand,
        startupStep: projStartup,
        completed: isCompleted,
        banked: false,
      });
    }
  }

  const combinedSpecs: Omit<RawWorkSpec, 'blockNumber'>[] = [
    ...activeBaselineSpecs,
    ...rawDiscretionarySpecs,
  ];

  // Reorder uncompleted specs dynamically when Energy-State Bandwidth Router is SHARP or LOW_FOGGY
  let finalOrderedSpecs = combinedSpecs;
  if (bandwidth === 'SHARP') {
    const cleared = combinedSpecs.filter((s) => s.completed || s.banked);
    const pending = combinedSpecs.filter((s) => !s.completed && !s.banked);
    const deepPending = pending.filter((s) => s.cognitiveDemand === 'DEEP_SYNTHESIS');
    const otherPending = pending.filter((s) => s.cognitiveDemand !== 'DEEP_SYNTHESIS');
    // Keep at least 1 non-flashcard synthesis/project block at the very end if possible so flashcards aren't last
    if (deepPending.length > 1 && otherPending.length > 0) {
      const anchorEnd = deepPending[deepPending.length - 1];
      const frontDeep = deepPending.slice(0, -1);
      finalOrderedSpecs = [...cleared, ...frontDeep, ...otherPending, anchorEnd];
    } else {
      finalOrderedSpecs = [...cleared, ...deepPending, ...otherPending];
    }
  } else if (bandwidth === 'LOW_FOGGY') {
    const cleared = combinedSpecs.filter((s) => s.completed || s.banked);
    const pending = combinedSpecs.filter((s) => !s.completed && !s.banked);
    const lowFrictionPending = pending.filter(
      (s) =>
        s.cognitiveDemand === 'MECHANICAL_RECALL' || s.cognitiveDemand === 'LIGHT_ADMIN'
    );
    const deepPending = pending.filter((s) => s.cognitiveDemand === 'DEEP_SYNTHESIS');
    finalOrderedSpecs = [...cleared, ...lowFrictionPending, ...deepPending];
  }

  const workSpecs: RawWorkSpec[] = finalOrderedSpecs.map((spec, idx) => ({
    ...spec,
    blockNumber: idx + 1,
  }));

  const steps: import('../types/symmetry').SequentialChecklistStep[] = [];
  let chainPosition: 1 | 2 = 1;
  let foundFirstUncompleted = false;
  const isSurgeDay = state.loadMode === 'SURGE' || totalTargetBlocks >= 14;

  for (let i = 0; i < workSpecs.length; i++) {
    const w = workSpecs[i];
    const isCleared = w.completed || w.banked;
    const isCurrentNext = !isCleared && !foundFirstUncompleted;
    if (isCurrentNext) {
      foundFirstUncompleted = true;
    }

    const remainingBlocksAfter = Math.max(0, totalTargetBlocks - w.blockNumber);
    const remainingMinutesAfter = remainingBlocksAfter * 20;
    const sessionMins = chainPosition * 20;

    const countdownBadge =
      remainingMinutesAfter === 0
        ? '[0m work left — End-of-Shift Bridge]'
        : `[${sessionMins}m | ${formatMinutesAsWorkLeft(remainingMinutesAfter)}]`;

    steps.push({
      stepNumber: steps.length + 1,
      id: `seq_work_${w.blockNumber}`,
      kind: 'WORK_BLOCK',
      blockNumber: w.blockNumber,
      sourceId: w.sourceId,
      title: `Block ${w.blockNumber}/${totalTargetBlocks}: ${w.title}`,
      categoryBadge: w.categoryBadge,
      taskType: w.taskType,
      cognitiveDemand: w.cognitiveDemand,
      startupStep: w.startupStep,
      durationMinutes: 20,
      chainPosition,
      remainingMinutesAfter,
      countdownBadge,
      completed: w.completed,
      banked: w.banked,
      isCurrentNext,
    });

    // Interleave break rows between work blocks (except after final work block)
    const nextWork = workSpecs[i + 1];
    if (nextWork) {
      const nextCleared = nextWork.completed || nextWork.banked;
      const breakCompleted = isCleared && nextCleared;

      if (isSurgeDay && w.blockNumber === 7) {
        // Mandatory Level 3 Mid-Shift Reset after Block 7 on Surge days (14-15 blocks)
        steps.push({
          stepNumber: steps.length + 1,
          id: `seq_break_l3_after_7`,
          kind: 'BREAK_L3',
          title: 'Level 3 Mid-Shift Reset (60–120m: 30m meal + walk/boots)',
          categoryBadge: 'SURGE CIRCUIT BREAKER • MANDATORY AFTER BLOCK 7',
          startupStep:
            'Step away from desk for 60–120m: 30m real meal + outdoor walk or compression boots.',
          durationMinutes: state.timer.l3DurationMinutes,
          remainingMinutesAfter,
          countdownBadge: `[60–120m Reset | ${formatMinutesAsWorkLeft(remainingMinutesAfter)}]`,
          completed: state.midDayResetCompletedToday || breakCompleted,
          isCurrentNext: false,
        });
        chainPosition = 1;
      } else if (chainPosition >= 2 || nextWork.taskType !== w.taskType) {
        // Max 2 Chained Blocks (40m) reached OR switching task types -> Level 2 Task-Switch Buffer
        const reasonTag =
          chainPosition >= 2 && nextWork.taskType !== w.taskType
            ? '40M CHAIN CAP + TASK SWITCH'
            : chainPosition >= 2
            ? 'MAX 2 CHAINED BLOCKS (40M) CAP'
            : `TASK SWITCH (${w.taskType} → ${nextWork.taskType})`;
        steps.push({
          stepNumber: steps.length + 1,
          id: `seq_break_l2_after_${w.blockNumber}`,
          kind: 'BREAK_L2',
          title: 'Level 2 Task-Switch Buffer (10–15m: Espresso / 1-Song Riff / 15m TENS)',
          categoryBadge: `LEVEL 2 BUFFER • ${reasonTag}`,
          startupStep:
            'Run 10–15m physical buffer: pull espresso shot, play 1 cold song on bass/guitar, or 15m TENS/Normatec.',
          durationMinutes: state.timer.l2DurationMinutes,
          remainingMinutesAfter,
          countdownBadge: `[10–15m Buffer | ${formatMinutesAsWorkLeft(remainingMinutesAfter)}]`,
          completed: breakCompleted,
          isCurrentNext: false,
        });
        chainPosition = 1;
      } else {
        // Same task type and only 1 block in current chain -> Level 1 Micro-Reset (3-5m)
        steps.push({
          stepNumber: steps.length + 1,
          id: `seq_break_l1_after_${w.blockNumber}`,
          kind: 'BREAK_L1',
          title: 'Level 1 Micro-Reset (3–5m: Window gaze / water / 3 dishes)',
          categoryBadge: `SAME-TASK MICRO-RESET • ${w.taskType} CHAIN (1/2)`,
          startupStep:
            'Stand up for 3–5m: window distance gaze, drink water, or clear 3 dishes before chaining Block 2/2.',
          durationMinutes: state.timer.l1DurationMinutes,
          remainingMinutesAfter,
          countdownBadge: `[3–5m Reset | ${formatMinutesAsWorkLeft(remainingMinutesAfter)}]`,
          completed: breakCompleted,
          isCurrentNext: false,
        });
        chainPosition = 2;
      }
    }
  }

  const allWorkCleared = workSpecs.every((w) => w.completed || w.banked);
  steps.push({
    stepNumber: steps.length + 1,
    id: 'seq_hard_shutdown',
    kind: 'SHUTDOWN',
    title: 'End-of-Shift Bridge — Hard Shutdown & Evening Recharge Menu',
    categoryBadge: 'END-OF-SHIFT LOCK • ZERO WORK LEFT',
    startupStep:
      'Close all work windows, engage End-of-Shift Lock, and open Option 0 Stillness or 5-Pillar Recharge Menu.',
    durationMinutes: 0,
    remainingMinutesAfter: 0,
    countdownBadge: '[0m work left — Hard Shutdown]',
    completed: allWorkCleared,
    isCurrentNext: allWorkCleared,
  });

  return steps;
}

export function serializeToStateMarkdown(state: SymmetryState): string {
  const metrics = computeShiftMetrics(state);
  const seqSteps = generateSequentialChecklist(state);
  const workSteps = seqSteps.filter((s) => s.kind === 'WORK_BLOCK');
  const milestones = state.upcomingMilestones?.length
    ? state.upcomingMilestones.join(' • ')
    : state.profilePresetId === 'AVERY_DEFAULT'
      ? 'Thu, Nov 12: Anatomy Exam & Proposal Due • Dec 8–9: Comp Exam'
      : 'None configured';

  const totalInputBlocks = state.roadmapTracks.reduce(
    (sum, t) => sum + t.inputBlocksCredited,
    0
  );
  const totalOutputBlocks = state.roadmapTracks.reduce(
    (sum, t) => sum + t.outputBlocksCredited,
    0
  );
  const combinedIo = Math.max(1, totalInputBlocks + totalOutputBlocks);
  const inputPct = Math.round((totalInputBlocks / combinedIo) * 100);
  const outputPct = 100 - inputPct;

  const archiveList =
    state.completedDeliverablesArchive && state.completedDeliverablesArchive.length > 0
      ? state.completedDeliverablesArchive
      : DEFAULT_SYMMETRY_STATE.completedDeliverablesArchive || [];

  const rechargeLog =
    state.recharge.completedLog && state.recharge.completedLog.length > 0
      ? state.recharge.completedLog
      : DEFAULT_SYMMETRY_STATE.recharge.completedLog || [];

  const rolloverHour = state.logicalDayRolloverHour ?? 4;
  const rolloverLabel = formatRolloverHourLabel(rolloverHour);
  const shutdownTime = state.earlyEveningShutdownTime || '6:00 PM';
  const cat1Fluid =
    state.recharge.fluidCategories?.CAT1_MUSIC ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT1_MUSIC;
  const cat4Fluid =
    state.recharge.fluidCategories?.CAT4_COMFORT ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT4_COMFORT;
  const flex = state.flexibilityTuning || DEFAULT_FLEXIBILITY_TUNING;
  const floorTotalBlocks = getTotalBaselineFloorBlocks(state.baselineBlocks) || 7;
  const dripTarget = state.dailySovereignDripTarget ?? 1;

  const lines: string[] = [
    '# SymmetryManager (`wl-balancer`) — Master `state.md`',
    '',
    '# Part I: On-Duty Capacity Governor State',
    '',
    `- **Profile Archetype**: ${state.profileName || DEFAULT_SYMMETRY_STATE.profileName} (\`${state.profilePresetId || 'AVERY_DEFAULT'}\`)`,
    `- **Logical Shift Date (${rolloverLabel} Boundary)**: ${state.logicalDayKey || getLogicalDayKey(new Date(), rolloverHour)}`,
    `- **Early Evening Shutdown Time (Outing Days)**: ${shutdownTime}`,
    `- **Current Energy Bandwidth**: ${state.energyBandwidth || 'STEADY'}`,
    `- **Shock Absorber Status**: ${state.shockAbsorberMode || 'FULL_SHIFT'} (Deferred Focus Blocks: ${state.shockAbsorberDeferredBlocks || 0})`,
    `- **Structure vs. Flexibility Tuning**: Cadence \`${flex.blockCadencePreset}\` • Lock Mode \`${flex.closedListLockMode}\` • Evening Pulse \`${flex.eveningPulseSensitivity}\``,
    `- **Deliverable Task Weights**: ${state.taskWeights?.heavyLabel || '2-Page Paper'} (${state.taskWeights?.heavyBlocks || 8}b) • ${state.taskWeights?.mediumLabel || 'Slide Deck'} (${state.taskWeights?.mediumBlocks || 4}b)`,
    `- **Upcoming Milestones**: ${milestones}`,
    `- **Active Load Mode**: ${state.loadMode}${state.cruisePlus ? ' (Cruise+)' : ''}${
      state.preExamTaperActive ? ' [Pre-Exam Taper Active]' : ''
    } — Target Ceiling: ${metrics.totalTargetBlocks} blocks`,
    `- **Daily Sovereign Ambition Drip (1b/day)**: ${
      state.dailySovereignDripDone
        ? `[1/${dripTarget} DONE]`
        : `[0/${dripTarget} PENDING]`
    } (Golden Rule Mode: ${state.sovereignGoldenRuleMode !== false ? 'Active' : 'Off'})`,
    `- **Consecutive Surge Days**: ${state.surgeConsecutiveDays} / 2`,
    `- **Surge Mid-Day Reset (60–120m after Block 7)**: ${state.midDayResetCompletedToday ? 'Completed' : 'Pending'}`,
    `- **Fixed Event Anchor**: ${state.fixedEvent}`,
    `- **Today's Sequential Progress**: ${metrics.totalCompletedBlocks} / ${metrics.totalTargetBlocks} blocks complete — \`${metrics.durationPrefix}\``,
    `- **Flashcard Review Queue**: ${state.flashcardsReviewedCount} / ${state.flashcardsDailyCap} cards (${state.earlyClearanceEnabled ? 'Early Clearance Active — Unused Blocks Banked' : 'Standard Pacing'})`,
    `- **Completed Deliverables Logged**: ${state.completedDeliverablesLog?.length || 0}`,
    '',
    `## Today’s ${floorTotalBlocks}-Block Daily Core Baseline`,
    ...state.baselineBlocks.map(
      (b) =>
        `- [${b.completed ? 'x' : b.bankedViaEarlyClearance ? 'B' : ' '}] **${b.title}** (\`${getBaselineSlotCompletedBlocks(b)}/${getBaselineSlotTargetBlocks(b)}b\` • \`${b.category}\` • \`${getBaselineCognitiveDemand(b)}\`) — 5m Startup: *${b.startupStep}*`
    ),
    '',
    '## Today’s Sequential 20m Runway Preview',
    ...workSteps.map(
      (s) =>
        `- [${s.completed ? 'x' : s.banked ? 'B' : ' '}] **${s.title}** \`${s.countdownBadge}\` — 5m Startup: *${s.startupStep}*`
    ),
    '',
    '## Closed List 1–3 (Active Project Lock — Max 3)',
    ...state.projectQueue.map((p) => {
      const isSovereign = isProjectSovereignDrip(p);
      const statusLabel =
        p.slot === 1
          ? 'SERIALIZED INSTITUTIONAL FOCUS #1 (UNLOCKED)'
          : isSovereign
          ? state.dailySovereignDripDone
            ? 'SOVEREIGN AMBITION DRIP — 1B/DAY (1/1 BANKED TODAY)'
            : 'SOVEREIGN AMBITION DRIP — 1B/DAY (UNLOCKED FOR DAILY 20M DRIP)'
          : 'LOCKED UNTIL ITEM #1 COMPLETES';
      return `${p.slot}. **${p.title}** — \`[${p.completedBlocks} / ${p.totalBlocks} blocks]\` | Category: \`${isSovereign ? 'sovereign' : 'institutional'}\` | Track: \`${p.trackId}\` | Demand: \`${getProjectCognitiveDemand(p)}\` | ${statusLabel} — 5m Startup: *${p.startupStep}*`;
    }),
    '',
    '## Open List Backlog (Deferred Deliverables)',
    ...(state.projectBacklog.length > 0
      ? state.projectBacklog.map(
          (b, idx) =>
            `- [Backlog #${idx + 1}] **${b.title}** — \`[0 / ${b.totalBlocks} blocks]\` (\`${b.presetType}\`, Category: \`${isProjectSovereignDrip(b) ? 'sovereign' : 'institutional'}\`, Track: \`${b.trackId}\`) — 5m Startup: *${b.startupStep}*`
        )
      : ['- *(No deferred items in Open List Backlog)*']),
    '',
    '## 7-Day Master Pipeline Markdown Table',
    '| Day | Load Mode | Target Blocks | Extension Deduction | Fixed Event | Early Anchor | Deliverables & Sovereign Drip |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
    ...state.pipelineDays.map((d) => {
      const effective = Math.max(
        floorTotalBlocks,
        d.baseTargetBlocks - d.deductedBlocksFromExtension
      );
      const summary = d.deliverablesCompleted || d.primaryDeliverable || '—';
      return `| ${d.dayLabel} | ${d.mode || d.loadMode}${d.cruisePlus ? '+' : ''} | ${effective} (${d.projectBlocksSummary || `${d.baseTargetBlocks} base`}) | -${d.deductedBlocksFromExtension} blks | ${d.fixedEvent}${d.fixedEventTimeLabel ? ` (${d.fixedEventTimeLabel})` : ''} | ${d.earlyMorningAnchor ? 'Yes' : 'No'} | ${summary} |`;
    }),
    '',
    '---',
    '',
    '# Part II: Off-Duty 5-Pillar Recharge State',
    '',
    `- **End-of-Shift Lock Status**: ${metrics.isZeroWorkLeft ? 'LOCKED ([0m work left] — Evening Menu Active)' : `ON-DUTY (${metrics.remainingWorkFormatted})`}`,
    `- **Weekly Flow Extensions Used**: ${state.recharge.weeklyExtensionsUsed} / 2 (Today Logged: ${state.recharge.flowExtensionBlocksLoggedToday} blocks)`,
    `- **Option 0 (Rest / Stillness — 20m Silent Timer)**: ${state.recharge.option0Running ? 'Running' : 'Idle'} — Consecutive Windows: \`[${state.recharge.option0ConsecutiveWindows} / 2]\` (40m Cap -> Fork Check: "Go to Sleep" vs. "Start One 5m Activity")`,
    '',
    '## Categories 1–5 (Current Titles, `[X / 3]` Sticky Counters & 5m Startup Prompts)',
    `- **Category 1 — Music [Fluid]**: ${cat1Fluid.activeTitle} — Counter: \`[Fluid]\` — 5m Startup: *${cat1Fluid.startupStep}*`,
    `- **Category 2 — Maker / Hardware [Sticky]**: ${state.recharge.stickySlots.CAT2_MAKER.activeTitle} — Counter: \`[${state.recharge.stickySlots.CAT2_MAKER.fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots.CAT2_MAKER.startupStep}* — Backlog: ${state.recharge.stickySlots.CAT2_MAKER.backlogQueue.join(', ') || 'None'}`,
    `- **Category 3A — Media: Fiction [Sticky]**: ${state.recharge.stickySlots['3A_FICTION'].activeTitle} (${state.recharge.fictionSpeed}) — Counter: \`[${state.recharge.stickySlots['3A_FICTION'].fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots['3A_FICTION'].startupStep}* — Backlog: ${state.recharge.stickySlots['3A_FICTION'].backlogQueue.join(', ') || 'None'}`,
    `- **Category 3B — Media: Nonfiction [Sticky]**: ${state.recharge.stickySlots['3B_NONFICTION'].activeTitle} — Counter: \`[${state.recharge.stickySlots['3B_NONFICTION'].fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots['3B_NONFICTION'].startupStep}* — Backlog: ${state.recharge.stickySlots['3B_NONFICTION'].backlogQueue.join(', ') || 'None'}`,
    `- **Category 3C — Media: Video [Sticky]**: ${state.recharge.stickySlots['3C_VIDEO'].activeTitle} — Counter: \`[${state.recharge.stickySlots['3C_VIDEO'].fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots['3C_VIDEO'].startupStep}* — Backlog: ${state.recharge.stickySlots['3C_VIDEO'].backlogQueue.join(', ') || 'None'}`,
    `- **Category 4 — Comfort Show [Fluid]**: ${cat4Fluid.activeTitle} — Counter: \`[Fluid]\` — 5m Startup: *${cat4Fluid.startupStep}*`,
    `- **Category 5 — Gaming [Sticky]**: ${state.recharge.stickySlots.CAT5_GAMING.activeTitle} — Counter: \`[${state.recharge.stickySlots.CAT5_GAMING.fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots.CAT5_GAMING.startupStep}* — Backlog: ${state.recharge.stickySlots.CAT5_GAMING.backlogQueue.join(', ') || 'None'}`,
    '',
    '## Off-Duty Completed Recharge Log',
    ...(rechargeLog.length > 0
      ? rechargeLog.map((entry) => `- [x] ${entry}`)
      : ['- *(No off-duty recharge sessions logged yet)*']),
    '',
    '---',
    '',
    '# Part III: 4-Rung Master Horizon & Input/Output State',
    '',
    `- **Global Symmetrical Ledger Balance**: Input: **${totalInputBlocks} blocks (${inputPct}%)** | Output: **${totalOutputBlocks} blocks (${outputPct}%)** (Target: 50% Input / 50% Output)`,
    '',
    '## 3 Core Tracks & 2 Zero-Quota Sandbox Tracks',
    ...state.roadmapTracks.flatMap((t) => {
      const statusTag = t.isSandbox
        ? t.activeThisWeek
          ? 'Active Sandbox Session'
          : 'Flexible Pace / Coasting in Neutral'
        : 'Active Core Quota';
      const targetStr = t.isSandbox
        ? `Input: ${t.inputBlocksCredited} blks | Output: ${t.outputBlocksCredited} blks (Zero-Quota)`
        : `Input: ${t.inputBlocksCredited}/${t.inputWeeklyTarget} blks | Output: ${t.outputBlocksCredited}/${t.outputWeeklyTarget} blks`;
      return [
        `### ${t.name} (\`${t.categoryLabel}\` — ${statusTag})`,
        `- **Track Ledger**: ${targetStr}`,
        ...t.rungs.map(
          (r) =>
            `  - **${r.label}** (\`${r.ledgerType}\`): \`[${r.completedBlocks} / ${r.targetBlocks} blocks]\` — ${r.description}`
        ),
        '',
      ];
    }),
    '## Completed Deliverables Archive (Across 3 Core Tracks & 2 Sandbox Tracks)',
    ...(archiveList.length > 0
      ? archiveList.map(
          (item) =>
            `- [x] **${item.title}** — Track: \`${item.trackId}\` | Volume: \`${item.totalBlocks} blocks\` | Completed: \`${item.completedAt}\``
        )
      : ['- *(No archived deliverables yet)*']),
    '',
    '---',
    '',
    '## Today\'s Block Log (`todayBlockLog`)',
    ...(state.todayBlockLog?.length
      ? state.todayBlockLog.map(
          (e) =>
            `- \`[${e.logicalDate}]\` **${e.title}** (${e.category} • ${e.durationMinutes}m • ${e.roadmapTrack} / ${e.stroke})`
        )
      : ['- No blocks logged yet today.']),
    '',
    '## Machine-Readable State Payload',
    '```json',
    JSON.stringify(
      (() => {
        const clean = { ...(state as unknown as Record<string, unknown>) };
        delete clean.proModeUnlocked;
        delete clean.proPasswordToken;
        delete clean.geminiApiKey;
        return clean;
      })(),
      null,
      2
    ),
    '```',
    '',
  ];
  return lines.join('\n');
}

export function parseFromStateInput(rawText: string): SymmetryState {
  const trimmed = rawText.trim();
  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
  let baseState: SymmetryState = DEFAULT_SYMMETRY_STATE;
  let parsedJsonSuccessfully = false;

  if (jsonBlockMatch || trimmed.startsWith('{')) {
    const candidate = jsonBlockMatch ? jsonBlockMatch[1].trim() : trimmed;
    const parsed = JSON.parse(candidate);
    parsedJsonSuccessfully = true;
    const defaultSticky = DEFAULT_SYMMETRY_STATE.recharge.stickySlots;
    const parsedSticky = parsed.recharge?.stickySlots || {};

    const normalizeSticky = (
      def: typeof defaultSticky.CAT2_MAKER,
      raw: Partial<typeof defaultSticky.CAT2_MAKER> | undefined
    ) => {
      const merged = { ...def, ...(raw || {}) };
      const starts =
        typeof raw?.startsLogged === 'number'
          ? raw.startsLogged
          : typeof raw?.fiveMinStarts === 'number'
          ? raw.fiveMinStarts
          : def.fiveMinStarts;
      const queue = Array.isArray(merged.backlogQueue)
        ? merged.backlogQueue
        : def.backlogQueue;
      return {
        ...merged,
        backlogQueue: queue,
        queuedNextTitle: merged.queuedNextTitle || queue[0] || '',
        fiveMinStarts: starts,
        startsLogged: starts,
        archivedTitles: Array.isArray(merged.archivedTitles)
          ? merged.archivedTitles
          : [],
      };
    };

    const rawBacklogArray = Array.isArray(parsed.openListBacklog)
      ? parsed.openListBacklog
      : Array.isArray(parsed.projectBacklog)
      ? parsed.projectBacklog
      : Array.isArray(parsed.openList)
      ? parsed.openList
      : DEFAULT_SYMMETRY_STATE.openListBacklog;

    const resolvedBacklog: SymmetryState['openListBacklog'] = rawBacklogArray.map(
      (item: unknown, idx: number) => {
        if (typeof item === 'string') {
          const isSov = /sovereign|sextant|symmetryproductivity|novel|treatise/i.test(
            item
          );
          const blocksMatch = item.match(/\((\d+)b/i);
          const totalBlocks = blocksMatch ? Math.max(1, Number(blocksMatch[1])) : 4;
          return {
            id: `proj_open_${idx + 1}`,
            title: item,
            presetType:
              totalBlocks === 8
                ? 'PAPER_8'
                : totalBlocks === 4
                ? 'SLIDES_4'
                : totalBlocks === 2
                ? 'QUICK_2'
                : 'CUSTOM',
            completedBlocks: 0,
            totalBlocks,
            trackId: isSov ? 'coding' : 'science',
            startupStep: 'Open deliverable and complete 5-minute startup step.',
            nextStepNote: 'Queued in Open List standby domino queue.',
            cognitiveDemand: 'DEEP_SYNTHESIS',
            isSovereignDrip: isSov,
            category: isSov ? 'sovereign' : 'institutional',
          };
        }
        const obj = item as Partial<ProjectItem> & {
          blocksTotal?: number;
          blocksDone?: number;
        };
        const isSov = Boolean(
          obj.isSovereignDrip ||
            obj.category === 'sovereign' ||
            /sovereign\s+drip/i.test(String(obj.title || ''))
        );
        const totalBlocks =
          typeof obj.totalBlocks === 'number'
            ? obj.totalBlocks
            : typeof obj.blocksTotal === 'number'
            ? obj.blocksTotal
            : 4;
        return {
          id: obj.id || `proj_open_${idx + 1}`,
          title: obj.title || `Backlog Deliverable #${idx + 1}`,
          presetType: obj.presetType || 'CUSTOM',
          completedBlocks:
            typeof obj.completedBlocks === 'number'
              ? obj.completedBlocks
              : typeof obj.blocksDone === 'number'
              ? obj.blocksDone
              : 0,
          totalBlocks,
          trackId: obj.trackId || (isSov ? 'coding' : 'science'),
          startupStep:
            obj.startupStep ||
            'Open deliverable and complete 5-minute startup step.',
          nextStepNote:
            obj.nextStepNote || 'Queued in Open List standby domino queue.',
          cognitiveDemand: obj.cognitiveDemand || 'DEEP_SYNTHESIS',
          isSovereignDrip: isSov,
          category: isSov ? 'sovereign' : 'institutional',
        };
      }
    );

    const resolvedCompleted = Array.isArray(parsed.completedDeliverablesLog)
      ? parsed.completedDeliverablesLog
      : Array.isArray(parsed.completedDeliverablesArchive)
      ? parsed.completedDeliverablesArchive
      : Array.isArray(parsed.completedBlocks?.completedDeliverablesLog)
      ? parsed.completedBlocks.completedDeliverablesLog
      : DEFAULT_SYMMETRY_STATE.completedDeliverablesLog;

    const normalizeLoadMode = (rawMode: unknown): LoadMode | undefined => {
      if (rawMode === 'CRUISE' || rawMode === 'SURGE' || rawMode === 'TAPER') {
        return rawMode;
      }
      if (typeof rawMode === 'string' && rawMode.toUpperCase().startsWith('TAPER')) {
        return 'TAPER';
      }
      return undefined;
    };

    const resolvedLoadMode: LoadMode =
      normalizeLoadMode(parsed.loadMode) ||
      normalizeLoadMode(parsed.tier) ||
      DEFAULT_SYMMETRY_STATE.loadMode;

    const rawBaselineArray =
      Array.isArray(parsed.baselineBlocks) && parsed.baselineBlocks.length > 0
        ? parsed.baselineBlocks
        : Array.isArray(parsed.baselineSlots) && parsed.baselineSlots.length > 0
        ? parsed.baselineSlots
        : Array.isArray(parsed.examFloor) && parsed.examFloor.length > 0
        ? parsed.examFloor
        : DEFAULT_SYMMETRY_STATE.baselineBlocks;

    const resolvedBaselineBlocks: BaselineBlock[] = rawBaselineArray.map(
      (b: Partial<BaselineBlock>, idx: number) => {
        const target =
          typeof b.targetBlocks === 'number'
            ? b.targetBlocks
            : typeof b.blocksTarget === 'number'
            ? b.blocksTarget
            : 1;
        const earlyEligible =
          typeof b.earlyClearanceEligible === 'boolean'
            ? b.earlyClearanceEligible
            : typeof b.supportsEarlyClearance === 'boolean'
            ? b.supportsEarlyClearance
            : b.category === 'FLASHCARDS_ANATOMY' ||
              b.category === 'FLASHCARDS_COMP';
        return {
          id: b.id || `floor_slot_${idx + 1}`,
          title: b.title || `Baseline Slot #${idx + 1}`,
          category: b.category || 'READING',
          completed: Boolean(b.completed),
          targetBlocks: target,
          blocksTarget: target,
          completedBlocks:
            typeof b.completedBlocks === 'number'
              ? b.completedBlocks
              : b.completed
              ? target
              : 0,
          bankedViaEarlyClearance: Boolean(b.bankedViaEarlyClearance),
          earlyClearanceEligible: earlyEligible,
          supportsEarlyClearance: earlyEligible,
          lateNightBlocker:
            typeof b.lateNightBlocker === 'boolean'
              ? b.lateNightBlocker
              : earlyEligible,
          startupStep:
            b.startupStep ||
            b.startupPrompt ||
            'Open baseline material and complete 5-minute startup step.',
          trackId: b.trackId || 'science',
          cognitiveDemand: b.cognitiveDemand,
        };
      }
    );

    const rawQueueArray = Array.isArray(parsed.projectQueue)
      ? parsed.projectQueue
      : Array.isArray(parsed.closedList)
      ? parsed.closedList
      : DEFAULT_SYMMETRY_STATE.projectQueue;

    const resolvedProjectQueue: ProjectItem[] = rawQueueArray
      .slice(0, 3)
      .map(
        (
          rawProj: Partial<ProjectItem> & {
            blocksDone?: number;
            blocksTotal?: number;
            subSteps?: string[];
          },
          idx: number
        ) => {
          const slotNum = ((idx + 1) as 1 | 2 | 3);
          const isSov =
            slotNum === 1 &&
            rawProj.isSovereignDrip === undefined &&
            rawProj.category === undefined
              ? false
              : Boolean(
                  rawProj.isSovereignDrip ||
                    rawProj.category === 'sovereign'
                );
          const totalBlocks =
            typeof rawProj.totalBlocks === 'number'
              ? rawProj.totalBlocks
              : typeof rawProj.blocksTotal === 'number'
              ? rawProj.blocksTotal
              : 6;
          const completedBlocks =
            typeof rawProj.completedBlocks === 'number'
              ? rawProj.completedBlocks
              : typeof rawProj.blocksDone === 'number'
              ? rawProj.blocksDone
              : 0;
          return {
            id: rawProj.id || `proj_${slotNum}`,
            slot: slotNum,
            title: rawProj.title || `Closed List Slot #${slotNum}`,
            presetType: rawProj.presetType || 'CUSTOM',
            completedBlocks,
            totalBlocks,
            trackId: rawProj.trackId || (isSov ? 'coding' : 'science'),
            startupStep:
              rawProj.startupStep ||
              'Open deliverable and complete 5-minute startup step.',
            nextStepNote:
              rawProj.nextStepNote ||
              (isSov
                ? 'Sovereign Ambition Drip — 1 block/day unlocked.'
                : slotNum === 1
                ? 'Serialized Institutional Focus #1.'
                : 'Locked until Slot #1 completes.'),
            cognitiveDemand: rawProj.cognitiveDemand || 'DEEP_SYNTHESIS',
            blockedOnExternalFeedback: Boolean(rawProj.blockedOnExternalFeedback),
            blockSubSteps: Array.isArray(rawProj.blockSubSteps)
              ? rawProj.blockSubSteps
              : Array.isArray(rawProj.subSteps)
              ? rawProj.subSteps
              : undefined,
            isSovereignDrip: isSov,
            category: isSov ? 'sovereign' : 'institutional',
          };
        }
      );

    if (
      typeof parsed.hemingwayBridge === 'string' &&
      parsed.hemingwayBridge.trim() &&
      resolvedProjectQueue.length > 0
    ) {
      resolvedProjectQueue[0] = {
        ...resolvedProjectQueue[0],
        nextStepNote:
          resolvedProjectQueue[0].nextStepNote || parsed.hemingwayBridge.trim(),
      };
    }

    const resolvedDiscretionaryBlocks =
      typeof parsed.discretionaryBlocksCompletedToday === 'number'
        ? parsed.discretionaryBlocksCompletedToday
        : typeof parsed.completedBlocks === 'number'
        ? parsed.completedBlocks
        : typeof parsed.completedBlocks?.discretionaryBlocksCompletedToday ===
          'number'
        ? parsed.completedBlocks.discretionaryBlocksCompletedToday
        : DEFAULT_SYMMETRY_STATE.discretionaryBlocksCompletedToday;

    const resolvedDailySovereignDripDone =
      typeof parsed.dailySovereignDripDone === 'boolean'
        ? parsed.dailySovereignDripDone
        : DEFAULT_SYMMETRY_STATE.dailySovereignDripDone;

    const resolvedDailySovereignDripTarget =
      typeof parsed.dailySovereignDripTarget === 'number' &&
      !Number.isNaN(parsed.dailySovereignDripTarget)
        ? Math.max(1, Math.round(parsed.dailySovereignDripTarget))
        : DEFAULT_SYMMETRY_STATE.dailySovereignDripTarget;

    const resolvedSovereignGoldenRuleMode =
      typeof parsed.sovereignGoldenRuleMode === 'boolean'
        ? parsed.sovereignGoldenRuleMode
        : true;

    const resolvedTodayBlockLog = Array.isArray(parsed.todayBlockLog)
      ? parsed.todayBlockLog
      : Array.isArray(parsed.completedBlocks?.todayBlockLog)
      ? parsed.completedBlocks.todayBlockLog
      : DEFAULT_SYMMETRY_STATE.todayBlockLog;

    const resolvedPipelineDays =
      Array.isArray(parsed.pipelineDays) && parsed.pipelineDays.length > 0
        ? parsed.pipelineDays
        : Array.isArray(parsed.sevenDayPipeline) &&
          parsed.sevenDayPipeline.length > 0
        ? parsed.sevenDayPipeline
        : DEFAULT_SYMMETRY_STATE.pipelineDays;

    const parsedRechargeSource =
      parsed.recharge || parsed.sanctuaryPillars || {};
    const parsedStickyFromSource =
      parsedRechargeSource.stickySlots || parsedSticky || {};

    baseState = {
      ...DEFAULT_SYMMETRY_STATE,
      ...parsed,
      loadMode: resolvedLoadMode,
      discretionaryBlocksCompletedToday: resolvedDiscretionaryBlocks,
      dailySovereignDripDone: resolvedDailySovereignDripDone,
      dailySovereignDripTarget: resolvedDailySovereignDripTarget,
      sovereignGoldenRuleMode: resolvedSovereignGoldenRuleMode,
      profilePresetId: parsed.profilePresetId || DEFAULT_SYMMETRY_STATE.profilePresetId,
      profileName: parsed.profileName || DEFAULT_SYMMETRY_STATE.profileName,
      energyBandwidth:
        parsed.energyBandwidth === 'SHARP' ||
        parsed.energyBandwidth === 'STEADY' ||
        parsed.energyBandwidth === 'LOW_FOGGY'
          ? parsed.energyBandwidth
          : DEFAULT_SYMMETRY_STATE.energyBandwidth,
      shockAbsorberMode:
        parsed.shockAbsorberMode === 'FULL_SHIFT' ||
        parsed.shockAbsorberMode === 'HALF_SHIFT' ||
        parsed.shockAbsorberMode === 'MVF_FLOOR'
          ? parsed.shockAbsorberMode
          : DEFAULT_SYMMETRY_STATE.shockAbsorberMode,
      shockAbsorberDeferredBlocks:
        typeof parsed.shockAbsorberDeferredBlocks === 'number'
          ? parsed.shockAbsorberDeferredBlocks
          : 0,
      flexibilityTuning: {
        ...DEFAULT_FLEXIBILITY_TUNING,
        ...(parsed.flexibilityTuning || {}),
      },
      logicalDayRolloverHour:
        typeof parsed.logicalDayRolloverHour === 'number'
          ? Math.max(0, Math.min(6, Math.round(parsed.logicalDayRolloverHour)))
          : DEFAULT_SYMMETRY_STATE.logicalDayRolloverHour,
      earlyEveningShutdownTime:
        typeof parsed.earlyEveningShutdownTime === 'string' &&
        parsed.earlyEveningShutdownTime.trim()
          ? parsed.earlyEveningShutdownTime.trim()
          : DEFAULT_SYMMETRY_STATE.earlyEveningShutdownTime,
      taskWeights: {
        ...DEFAULT_SYMMETRY_STATE.taskWeights!,
        ...(parsed.taskWeights || {}),
      },
      breakOptions: {
        ...DEFAULT_SYMMETRY_STATE.breakOptions!,
        ...(parsed.breakOptions || {}),
      },
      preExamTaperActive: Boolean(parsed.preExamTaperActive),
      todayBlockLog: resolvedTodayBlockLog,
      upcomingMilestones:
        Array.isArray(parsed.upcomingMilestones) &&
        parsed.upcomingMilestones.length > 0
          ? parsed.upcomingMilestones
          : DEFAULT_SYMMETRY_STATE.upcomingMilestones,
      baselineBlocks: resolvedBaselineBlocks,
      baselineSlots: resolvedBaselineBlocks,
      projectQueue: resolvedProjectQueue,
      projectBacklog: resolvedBacklog,
      openListBacklog: resolvedBacklog,
      completedDeliverablesLog: resolvedCompleted,
      completedDeliverablesArchive: resolvedCompleted,
      pipelineDays: resolvedPipelineDays,
      sevenDayPipeline: resolvedPipelineDays,
      roadmapTracks:
        Array.isArray(parsed.roadmapTracks) && parsed.roadmapTracks.length > 0
          ? parsed.roadmapTracks
          : DEFAULT_SYMMETRY_STATE.roadmapTracks,
      timer: {
        ...DEFAULT_SYMMETRY_STATE.timer,
        ...(parsed.timer || {}),
        elasticMultiplier:
          parsed.timer?.elasticMultiplier === 0.5 ||
          parsed.timer?.elasticMultiplier === 1.0 ||
          parsed.timer?.elasticMultiplier === 2.0
            ? parsed.timer.elasticMultiplier
            : 1.0,
        startupShrinkLevel:
          parsed.timer?.startupShrinkLevel === 1 ||
          parsed.timer?.startupShrinkLevel === 2 ||
          parsed.timer?.startupShrinkLevel === 3
            ? parsed.timer.startupShrinkLevel
            : 1,
      },
      dailyHistory:
        Array.isArray(parsed.dailyHistory) && parsed.dailyHistory.length > 0
          ? parsed.dailyHistory
          : DEFAULT_SYMMETRY_STATE.dailyHistory,
      stateBackups: Array.isArray(parsed.stateBackups)
        ? parsed.stateBackups.slice(0, MAX_STATE_BACKUPS)
        : DEFAULT_SYMMETRY_STATE.stateBackups || [],
      audioSettings: {
        ...DEFAULT_AUDIO_ENGINE_SETTINGS,
        ...(parsed.audioSettings || {}),
      },
      recharge: {
        ...DEFAULT_SYMMETRY_STATE.recharge,
        ...parsedRechargeSource,
        manualEveningPreview:
          typeof parsed.watchmansRest === 'boolean' &&
          parsedRechargeSource.manualEveningPreview === undefined
            ? parsed.watchmansRest
            : Boolean(parsedRechargeSource.manualEveningPreview),
        fluidCategories: {
          CAT1_MUSIC: {
            ...DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT1_MUSIC,
            ...(parsedRechargeSource?.fluidCategories?.CAT1_MUSIC || {}),
          },
          CAT4_COMFORT: {
            ...DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT4_COMFORT,
            ...(parsedRechargeSource?.fluidCategories?.CAT4_COMFORT || {}),
          },
        },
        completedLog: Array.isArray(parsedRechargeSource?.completedLog)
          ? parsedRechargeSource.completedLog
          : DEFAULT_SYMMETRY_STATE.recharge.completedLog,
        stickySlots: {
          CAT2_MAKER: normalizeSticky(
            defaultSticky.CAT2_MAKER,
            parsedStickyFromSource.CAT2_MAKER
          ),
          '3A_FICTION': normalizeSticky(
            defaultSticky['3A_FICTION'],
            parsedStickyFromSource['3A_FICTION']
          ),
          '3B_NONFICTION': normalizeSticky(
            defaultSticky['3B_NONFICTION'],
            parsedStickyFromSource['3B_NONFICTION']
          ),
          '3C_VIDEO': normalizeSticky(
            defaultSticky['3C_VIDEO'],
            parsedStickyFromSource['3C_VIDEO']
          ),
          CAT5_GAMING: normalizeSticky(
            defaultSticky.CAT5_GAMING,
            parsedStickyFromSource.CAT5_GAMING
          ),
        },
      },
      lastUpdated:
        typeof parsed.lastUpdated === 'number' ? parsed.lastUpdated : undefined,
    };
  }

  // If the input contains Markdown sections (# Part I, # Part II, # Part III), apply any markdown-level overrides
  const hasMarkdownHeadings =
    trimmed.includes('# Part I') ||
    trimmed.includes('# Part II') ||
    trimmed.includes('# Part III') ||
    trimmed.includes('# SymmetryManager');

  if (!parsedJsonSuccessfully && !hasMarkdownHeadings) {
    throw new Error('Unrecognized state.md or JSON format');
  }

  if (hasMarkdownHeadings) {
    const mdWithoutJson = trimmed.replace(/```json[\s\S]*?```/g, '');

    // Parse Active Load Mode & Target Ceiling
    const modeMatch = mdWithoutJson.match(
      /\*\*Active Load Mode\*\*:\s*(CRUISE|SURGE|TAPER)(\s*\(Cruise\+\))?(?:\s*—\s*Target Ceiling:\s*(\d+)\s*blocks)?/i
    );
    if (modeMatch) {
      const mode = modeMatch[1].toUpperCase() as import('../types/symmetry').LoadMode;
      const cruisePlus = Boolean(modeMatch[2]);
      const ceiling = modeMatch[3]
        ? Number(modeMatch[3])
        : baseState.customModeBlockAdjustment;
      baseState = {
        ...baseState,
        loadMode: mode,
        cruisePlus,
        customModeBlockAdjustment: ceiling,
      };
    }

    // Parse Consecutive Surge Days
    const surgeMatch = mdWithoutJson.match(
      /\*\*Consecutive Surge Days\*\*:\s*(\d+)\s*\/\s*2/i
    );
    if (surgeMatch) {
      baseState = {
        ...baseState,
        surgeConsecutiveDays: Math.min(2, Math.max(0, Number(surgeMatch[1]))),
      };
    }

    // Parse Fixed Event Anchor
    const fixedMatch = mdWithoutJson.match(
      /\*\*Fixed Event Anchor\*\*:\s*(NONE|LAB_2H|VOLUNTEER|EVENING_OUTING_6PM)/i
    );
    if (fixedMatch) {
      baseState = {
        ...baseState,
        fixedEvent: fixedMatch[1].toUpperCase() as import('../types/symmetry').FixedEventType,
      };
    }

    // Parse Sticky [X / 3] counters from Part II
    const stickyCounterMap: { pattern: RegExp; key: import('../types/symmetry').StickyKey }[] = [
      {
        pattern: /Category 2 — Maker[\s\S]*?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?/i,
        key: 'CAT2_MAKER',
      },
      {
        pattern: /Category 3A — Media: Fiction[\s\S]*?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?/i,
        key: '3A_FICTION',
      },
      {
        pattern: /Category 3B — Media: Nonfiction[\s\S]*?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?/i,
        key: '3B_NONFICTION',
      },
      {
        pattern: /Category 3C — Media: Video[\s\S]*?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?/i,
        key: '3C_VIDEO',
      },
      {
        pattern: /Category 5 — Gaming[\s\S]*?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?/i,
        key: 'CAT5_GAMING',
      },
    ];
    const updatedSticky = { ...baseState.recharge.stickySlots };
    for (const item of stickyCounterMap) {
      const m = mdWithoutJson.match(item.pattern);
      if (m) {
        updatedSticky[item.key] = {
          ...updatedSticky[item.key],
          fiveMinStarts: Math.min(3, Math.max(0, Number(m[1]))),
        };
      }
    }
    baseState = {
      ...baseState,
      recharge: {
        ...baseState.recharge,
        stickySlots: updatedSticky,
      },
    };
  }

  return baseState;
}

/**
 * Synchronizes today's live telemetry into the 90-day `dailyHistory` array.
 */
export function syncTodayIntoDailyHistory(
  state: SymmetryState
): import('../types/symmetry').DailyHistoryEntry[] {
  const logicalDate =
    state.logicalDayKey ||
    getLogicalDayKey(new Date(), state.logicalDayRolloverHour ?? 4);
  const existingHistory =
    Array.isArray(state.dailyHistory) && state.dailyHistory.length > 0
      ? [...state.dailyHistory]
      : buildDefault90DayHistory(logicalDate);

  const metrics = computeShiftMetrics(state);
  const completedBaseline = Math.round(
    state.baselineBlocks.reduce(
      (sum, b) => sum + getBaselineSlotCompletedBlocks(b),
      0
    )
  );
  const mediaStartsToday = (state.todayBlockLog || []).filter(
    (e) =>
      e.logicalDate === logicalDate &&
      e.category === 'EVENING_RECHARGE' &&
      e.stroke === 'INPUT'
  ).length;
  const inputBlocks = completedBaseline + mediaStartsToday;
  const outputBlocks =
    state.discretionaryBlocksCompletedToday +
    (state.recharge?.flowExtensionBlocksLoggedToday || 0);
  const eveningSessions = Math.max(
    state.recharge?.completedLog?.length || 0,
    (state.todayBlockLog || []).filter(
      (e) => e.logicalDate === logicalDate && e.category === 'EVENING_RECHARGE'
    ).length
  );

  const todayEntry: import('../types/symmetry').DailyHistoryEntry = {
    logicalDate,
    mode:
      metrics.isZeroWorkLeft && eveningSessions > 0
        ? 'EVENING_RECHARGE'
        : state.preExamTaperActive
        ? 'TAPER'
        : state.loadMode,
    blocksCompleted: metrics.totalCompletedBlocks,
    inputBlocks,
    outputBlocks,
    eveningSessions,
  };

  const idx = existingHistory.findIndex((h) => h.logicalDate === logicalDate);
  if (idx >= 0) {
    existingHistory[idx] = todayEntry;
  } else {
    existingHistory.push(todayEntry);
  }

  return existingHistory.slice(-90);
}

/**
 * Loads persisted backups from localStorage (fallback ring buffer across resets)
 */
export function loadExternalStateBackups(): import('../types/symmetry').StateBackupSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_STATE_BACKUPS);
    }
  } catch {
    // ignore corrupt storage
  }
  return [];
}

/**
 * Creates a validated snapshot of the current state and pushes it to the 7-item ring buffer.
 */
export function pushStateBackup(
  currentState: SymmetryState,
  triggerReason: import('../types/symmetry').BackupTriggerReason,
  label: string
): import('../types/symmetry').StateBackupSnapshot[] {
  const metrics = computeShiftMetrics(currentState);
  const cleanStateToSerialize: SymmetryState = {
    ...currentState,
    stateBackups: undefined,
  };
  const snapshot: import('../types/symmetry').StateBackupSnapshot = {
    id: `bkp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAtIso: new Date().toISOString(),
    logicalDate: currentState.logicalDayKey || getLogicalDayKey(),
    triggerReason,
    label,
    profileName: currentState.profileName || DEFAULT_SYMMETRY_STATE.profileName!,
    loadMode: currentState.loadMode,
    blocksCompleted: metrics.totalCompletedBlocks,
    targetBlocks: metrics.totalTargetBlocks,
    stateJson: JSON.stringify(cleanStateToSerialize),
  };

  const existing =
    currentState.stateBackups && currentState.stateBackups.length > 0
      ? currentState.stateBackups
      : loadExternalStateBackups();

  const updated = [snapshot, ...existing.filter((b) => b.id !== snapshot.id)].slice(
    0,
    MAX_STATE_BACKUPS
  );

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage quota errors
    }
  }

  return updated;
}

/**
 * Validates a snapshot JSON string against full SymmetryState schema requirements
 * before restoring it.
 */
export function validateAndRestoreStateSnapshot(
  snapshotJson: string,
  preserveBackups?: import('../types/symmetry').StateBackupSnapshot[]
): SymmetryState {
  if (!snapshotJson || typeof snapshotJson !== 'string') {
    throw new Error('Snapshot payload is empty or invalid.');
  }
  let rawObj: Record<string, unknown>;
  try {
    rawObj = JSON.parse(snapshotJson);
  } catch {
    throw new Error('Snapshot JSON is malformed and cannot be parsed.');
  }
  if (!rawObj || typeof rawObj !== 'object') {
    throw new Error('Snapshot root must be a JSON object.');
  }
  if (
    !['CRUISE', 'SURGE', 'TAPER'].includes(String(rawObj.loadMode || '')) ||
    !Array.isArray(rawObj.baselineBlocks) ||
    rawObj.baselineBlocks.length === 0 ||
    !Array.isArray(rawObj.projectQueue) ||
    !Array.isArray(rawObj.roadmapTracks) ||
    typeof rawObj.timer !== 'object' ||
    typeof rawObj.recharge !== 'object'
  ) {
    throw new Error(
      'Snapshot failed schema validation (missing loadMode, baselineBlocks, projectQueue, timer, or recharge).'
    );
  }

  const restored = parseFromStateInput(snapshotJson);
  return {
    ...restored,
    timer: {
      ...restored.timer,
      isRunning: false,
      targetEndTimeMs: null,
    },
    stateBackups: preserveBackups ?? restored.stateBackups ?? loadExternalStateBackups(),
  };
}


