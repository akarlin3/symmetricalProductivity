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
    title: 'Pharmacology Mechanism Summary Sheet (2-Page Paper)',
    presetType: 'PAPER_8',
    completedBlocks: 0,
    totalBlocks: 8,
    trackId: 'science',
    startupStep: 'Set up 2-column receptor table and fill first 3 rows.',
    nextStepNote: 'Ready to promote when an active queue slot opens.',
    cognitiveDemand: 'DEEP_SYNTHESIS',
  },
  {
    id: 'proj_5',
    title: 'Journal Club Presentation (Slide Deck)',
    presetType: 'SLIDES_4',
    completedBlocks: 0,
    totalBlocks: 4,
    trackId: 'writing',
    startupStep: 'Paste primary figure panels into slides 2 and 3.',
    nextStepNote: 'Queued in project backlog.',
    cognitiveDemand: 'DEEP_SYNTHESIS',
  },
  {
    id: 'proj_6',
    title: 'Clinical Case Review Protocol Deck',
    presetType: 'SLIDES_4',
    completedBlocks: 0,
    totalBlocks: 4,
    trackId: 'science',
    startupStep: 'Draft 4-slide diagnostic differential outline.',
    nextStepNote: 'Queued in project backlog.',
    cognitiveDemand: 'LIGHT_ADMIN',
  },
];

const DEFAULT_COMPLETED_DELIVERABLES: SymmetryState['completedDeliverablesLog'] = [
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
  {
    id: 'arch_3',
    title: 'Q4 Home Filter & Preventive Maintenance Audit',
    trackId: 'personal',
    presetType: 'CUSTOM',
    totalBlocks: 2,
    blockCount: 2,
    blocksCompleted: 2,
    date: '2026-10-29',
    completedDate: '2026-10-29',
    completedAt: '2026-10-29',
  },
];

export const DEFAULT_TODAY_BLOCK_LOG: TodayBlockLogEntry[] = [
  {
    id: 'log_init_fc_anat_1',
    timestamp: '2026-11-07T09:15:00.000Z',
    logicalDate: initialLogicalDay,
    category: 'FLOOR_ANATOMY',
    title: 'Anatomy Flashcards — Block 1/1',
    durationMinutes: 20,
    blockUnits: 1.0,
    roadmapTrack: 'science',
    stroke: 'INPUT',
    sourceBlockId: 'fc_anat_1',
    rungNumber: 1,
  },
  {
    id: 'log_init_fc_comp_1',
    timestamp: '2026-11-07T09:40:00.000Z',
    logicalDate: initialLogicalDay,
    category: 'FLOOR_COMP',
    title: 'Comp Flashcards — Block 1/3',
    durationMinutes: 20,
    blockUnits: 1.0,
    roadmapTrack: 'science',
    stroke: 'INPUT',
    sourceBlockId: 'fc_comp_1',
    rungNumber: 1,
  },
  {
    id: 'log_init_hc_read_1',
    timestamp: '2026-11-07T10:15:00.000Z',
    logicalDate: initialLogicalDay,
    category: 'FLOOR_READING',
    title: 'Half-Chapter Reading / Equations — Block 1/2',
    durationMinutes: 20,
    blockUnits: 1.0,
    roadmapTrack: 'science',
    stroke: 'INPUT',
    sourceBlockId: 'hc_read_1',
    rungNumber: 1,
  },
];

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
        mode: 'CRUISE',
        blocksCompleted: 5,
        inputBlocks: 3,
        outputBlocks: 2,
        eveningSessions: 3,
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

export const DEFAULT_SYMMETRY_STATE: SymmetryState = {
  version: '1.0.0',
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
  upcomingMilestones: ['Nov 12: Anatomy Exam', 'Dec 8–9: Comp Exam'],
  loadMode: 'CRUISE',
  preExamTaperActive: false,
  cruisePlus: false,
  customModeBlockAdjustment: 12, // 12 total blocks in Cruise; 3 completed = 9 left = 180m (3h 00m work left)

  surgeConsecutiveDays: 1,
  midDayResetCompletedToday: false,
  fixedEvent: 'NONE',
  flashcardsReviewedCount: 95,
  flashcardsDailyCap: 250,
  earlyClearanceEnabled: false,
  baselineBlocks: [
    {
      id: 'fc_anat_1',
      title: '1b Anatomy Cards — Block 1/1',
      category: 'FLASHCARDS_ANATOMY',
      completed: true,
      bankedViaEarlyClearance: false,
      startupStep: 'Open deck + clear first 15 cards',
      trackId: 'science',
      cognitiveDemand: 'MECHANICAL_RECALL',
    },
    {
      id: 'fc_comp_1',
      title: '3b Comp Cards (250 cap) — Block 1/3',
      category: 'FLASHCARDS_COMP',
      completed: true,
      bankedViaEarlyClearance: false,
      startupStep: 'Open deck + clear first 15 cards',
      trackId: 'science',
      cognitiveDemand: 'MECHANICAL_RECALL',
    },
    {
      id: 'fc_comp_2',
      title: '3b Comp Cards (250 cap) — Block 2/3',
      category: 'FLASHCARDS_COMP',
      completed: false,
      bankedViaEarlyClearance: false,
      startupStep: 'Clear 20 due cards in the Comp deck without pausing on flags.',
      trackId: 'science',
      cognitiveDemand: 'MECHANICAL_RECALL',
    },
    {
      id: 'fc_comp_3',
      title: '3b Comp Cards (250 cap) — Block 3/3',
      category: 'FLASHCARDS_COMP',
      completed: false,
      bankedViaEarlyClearance: false,
      startupStep: 'Finish remaining Comp review queue or toggle Early Clearance if zeroed.',
      trackId: 'science',
      cognitiveDemand: 'MECHANICAL_RECALL',
    },
    {
      id: 'hc_read_1',
      title: '2b Half-Chapter Reading — Block 1/2',
      category: 'READING',
      completed: true,
      startupStep: 'Open assigned section, read first 2 pages, and write down core equations.',
      trackId: 'science',
      cognitiveDemand: 'DEEP_SYNTHESIS',
    },
    {
      id: 'hc_read_2',
      title: '2b Half-Chapter Reading — Block 2/2',
      category: 'READING',
      completed: false,
      startupStep: 'Work through 2 worked problem derivations from the current half-chapter.',
      trackId: 'science',
      cognitiveDemand: 'DEEP_SYNTHESIS',
    },
    {
      id: 'hc_synth_1',
      title: '1b Synthesis — Block 1/1',
      category: 'SYNTHESIS',
      completed: false,
      startupStep: 'Condense today’s half-chapter into 5 bulleted mechanisms from memory.',
      trackId: 'writing',
      cognitiveDemand: 'DEEP_SYNTHESIS',
    },
  ],
  projectQueue: [
    {
      id: 'proj_1',
      slot: 1,
      title: '1. Anatomy & Comp Exam Prep Sprint',
      presetType: 'PAPER_8',
      completedBlocks: 2,
      totalBlocks: 8,
      trackId: 'science',
      startupStep: 'Open deck + clear first 15 cards',
      nextStepNote: 'Primary focus target for Nov 12 Anatomy Exam & Dec 8–9 Comp Exam.',
      cognitiveDemand: 'DEEP_SYNTHESIS',
    },
    {
      id: 'proj_2',
      slot: 2,
      title: '2. 12-Page AI/Coding Practicum Paper (8b)',
      presetType: 'PAPER_8',
      completedBlocks: 0,
      totalBlocks: 8,
      trackId: 'science',
      startupStep: 'Open draft + write 2 bullet lines',
      nextStepNote: 'Locked until Item #1 completes.',
      cognitiveDemand: 'DEEP_SYNTHESIS',
    },
    {
      id: 'proj_3',
      slot: 3,
      title: '3. NMR / MRM / Green Journal Manuscript Revisions (8b)',
      presetType: 'PAPER_8',
      completedBlocks: 0,
      totalBlocks: 8,
      trackId: 'science',
      startupStep: 'Open manuscript + review 1 figure/paragraph',
      nextStepNote: 'Locked until Item #1 and Item #2 complete.',
      cognitiveDemand: 'LIGHT_ADMIN',
    },
  ],
  projectBacklog: DEFAULT_OPEN_LIST_BACKLOG,
  openListBacklog: DEFAULT_OPEN_LIST_BACKLOG,
  completedDeliverablesLog: DEFAULT_COMPLETED_DELIVERABLES,
  completedDeliverablesArchive: DEFAULT_COMPLETED_DELIVERABLES,
  pipelineDays: [
    {
      dayIndex: 1,
      dayLabel: 'Day 1 (Today)',
      loadMode: 'CRUISE',
      cruisePlus: false,
      baseTargetBlocks: 12,
      deductedBlocksFromExtension: 0,
      completedBlocks: 3,
      fixedEvent: 'NONE',
      earlyMorningAnchor: false,
      isToday: true,
    },
    {
      dayIndex: 2,
      dayLabel: 'Day 2 (Tomorrow)',
      loadMode: 'CRUISE',
      cruisePlus: false,
      baseTargetBlocks: 12,
      deductedBlocksFromExtension: 0,
      completedBlocks: 0,
      fixedEvent: 'NONE',
      earlyMorningAnchor: false,
      isToday: false,
    },
    {
      dayIndex: 3,
      dayLabel: 'Day 3',
      loadMode: 'SURGE',
      cruisePlus: false,
      baseTargetBlocks: 14,
      deductedBlocksFromExtension: 0,
      completedBlocks: 0,
      fixedEvent: 'NONE',
      earlyMorningAnchor: false,
      isToday: false,
    },
    {
      dayIndex: 4,
      dayLabel: 'Day 4',
      loadMode: 'SURGE',
      cruisePlus: false,
      baseTargetBlocks: 15,
      deductedBlocksFromExtension: 0,
      completedBlocks: 0,
      fixedEvent: 'NONE',
      earlyMorningAnchor: false,
      isToday: false,
    },
    {
      dayIndex: 5,
      dayLabel: 'Day 5',
      loadMode: 'TAPER',
      cruisePlus: false,
      baseTargetBlocks: 8,
      deductedBlocksFromExtension: 0,
      completedBlocks: 0,
      fixedEvent: 'LAB_2H',
      fixedEventTimeLabel: '09:00 AM – 11:00 AM Lab Shift (~2h)',
      earlyMorningAnchor: true,
      isToday: false,
    },
    {
      dayIndex: 6,
      dayLabel: 'Day 6',
      loadMode: 'CRUISE',
      cruisePlus: true,
      baseTargetBlocks: 13,
      deductedBlocksFromExtension: 0,
      completedBlocks: 0,
      fixedEvent: 'EVENING_OUTING_6PM',
      fixedEventTimeLabel: '6:00 PM Evening Outing',
      earlyMorningAnchor: false,
      isToday: false,
    },
    {
      dayIndex: 7,
      dayLabel: 'Day 7',
      loadMode: 'TAPER',
      cruisePlus: false,
      baseTargetBlocks: 7,
      deductedBlocksFromExtension: 0,
      completedBlocks: 0,
      fixedEvent: 'VOLUNTEER',
      fixedEventTimeLabel: '01:00 PM – 03:00 PM Volunteer Shift',
      earlyMorningAnchor: false,
      isToday: false,
    },
  ],
  discretionaryBlocksCompletedToday: 0,
  timer: {
    mode: 'WORK_20M',
    workStage: 'IGNITION_5M',
    secondsLeft: 300, // 5m Startup Step (IGNITION_5M)
    targetEndTimeMs: null,
    isRunning: false,
    activeBlockSourceId: 'proj_1',
    activeTaskTitle: '1. Anatomy & Comp Exam Prep Sprint',
    activeTaskType: 'PROJECT',
    activeStartupPrompt: 'Open deck + clear first 15 cards',
    elasticMultiplier: 1.0,
    startupShrinkLevel: 1,
    chainedBlocksCount: 1,
    sessionDisplayDurationMinutes: 40,
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
  const floorLen = state.baselineBlocks?.length || 7;
  const rawTarget = Math.max(1, state.customModeBlockAdjustment || floorLen);
  const totalTargetBlocks = state.preExamTaperActive
    ? Math.min(9, rawTarget)
    : rawTarget;
  const completedBaselineCount =
    Math.round(
      state.baselineBlocks.reduce((acc, b) => {
        if (b.completed || b.bankedViaEarlyClearance) return acc + 1;
        if (typeof b.partialCredit === 'number' && b.partialCredit > 0) {
          return acc + Math.min(1, b.partialCredit);
        }
        return acc;
      }, 0) * 10
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
 *
 * Rules enforced:
 * 1. Spaces Flashcard blocks across early and mid-shift so flashcards are NEVER scheduled as the final blocks of the night.
 * 2. Groups Reading and Synthesis blocks in the baseline floor, and locks remaining discretionary blocks to the active Closed List project.
 * 3. Adapts uncompleted block order when Energy-State Bandwidth Router is `SHARP` or `LOW_FOGGY`, and respects Shock Absorber ceiling compression.
 * 4. Interleaves Break rows automatically:
 *    - `Level 1 Micro-Reset (3–5m: Window gaze / water / 3 dishes)` between two blocks of the same task.
 *    - `Level 2 Task-Switch Buffer (10–15m: Espresso / 1-Song Riff / 15m TENS)` after any 2 chained blocks (40m)
 *      or whenever switching task types.
 *    - Mandatory `Level 3 Mid-Shift Reset (60–120m: 30m meal + walk/boots)` after Block 7 on Surge days (14-15 blocks).
 * 5. Running countdown badge on every work row (`[20m | 3h 40m work left]` -> `[40m | 3h 20m work left]` -> ... -> `[0m work left — End-of-Shift Bridge]`).
 */
export function generateSequentialChecklist(
  state: SymmetryState
): import('../types/symmetry').SequentialChecklistStep[] {
  const baselineCount = state.baselineBlocks?.length || 7;
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

  const fcBlocks = state.baselineBlocks.filter(
    (b) => b.category === 'FLASHCARDS_ANATOMY' || b.category === 'FLASHCARDS_COMP'
  );
  const readBlocks = state.baselineBlocks.filter((b) => b.category === 'READING');
  const synthBlocks = state.baselineBlocks.filter((b) => b.category === 'SYNTHESIS');

  const earlyFcCount = Math.ceil(fcBlocks.length / 2);
  const earlyFc = fcBlocks.slice(0, earlyFcCount);
  const midFc = fcBlocks.slice(earlyFcCount);

  const orderedBaselineSpecs: Omit<RawWorkSpec, 'blockNumber'>[] = [
    ...earlyFc.map((b, idx) => ({
      sourceId: b.id,
      title: b.title,
      categoryBadge: `EARLY SHIFT • FLASHCARDS (${idx + 1}/${fcBlocks.length})`,
      taskType: 'FLASHCARDS' as const,
      cognitiveDemand: getBaselineCognitiveDemand(b),
      startupStep: b.startupStep,
      completed: b.completed,
      banked: Boolean(b.bankedViaEarlyClearance),
    })),
    ...readBlocks.map((b, idx) => ({
      sourceId: b.id,
      title: b.title,
      categoryBadge: `BASELINE FLOOR • HALF-CHAPTER READ (${idx + 1}/${readBlocks.length})`,
      taskType: 'READING' as const,
      cognitiveDemand: getBaselineCognitiveDemand(b),
      startupStep: b.startupStep,
      completed: b.completed,
      banked: Boolean(b.bankedViaEarlyClearance),
    })),
    ...midFc.map((b, idx) => ({
      sourceId: b.id,
      title: b.title,
      categoryBadge: `MID-SHIFT • FLASHCARDS (${earlyFcCount + idx + 1}/${fcBlocks.length})`,
      taskType: 'FLASHCARDS' as const,
      cognitiveDemand: getBaselineCognitiveDemand(b),
      startupStep: b.startupStep,
      completed: b.completed,
      banked: Boolean(b.bankedViaEarlyClearance),
    })),
    ...synthBlocks.map((b) => ({
      sourceId: b.id,
      title: b.title,
      categoryBadge: 'BASELINE FLOOR • HALF-CHAPTER SYNTHESIS',
      taskType: 'SYNTHESIS' as const,
      cognitiveDemand: getBaselineCognitiveDemand(b),
      startupStep: b.startupStep,
      completed: b.completed,
      banked: Boolean(b.bankedViaEarlyClearance),
    })),
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

  const rawDiscretionarySpecs: Omit<RawWorkSpec, 'blockNumber'>[] = [];
  for (let d = 1; d <= discretionaryCount; d++) {
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
      title: `${projTitle} — Locked Focus #${projSlot} (Block ${d}/${discretionaryCount})`,
      categoryBadge: `CLOSED LIST #${projSlot} • DISCRETIONARY (${d}/${discretionaryCount})`,
      taskType: 'PROJECT',
      cognitiveDemand: projDemand,
      startupStep: projStartup,
      completed: isCompleted,
      banked: false,
    });
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
      ? 'Nov 12: Anatomy Exam • Dec 8–9: Comp Exam'
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
    `- **Consecutive Surge Days**: ${state.surgeConsecutiveDays} / 2`,
    `- **Surge Mid-Day Reset (60–120m after Block 7)**: ${state.midDayResetCompletedToday ? 'Completed' : 'Pending'}`,
    `- **Fixed Event Anchor**: ${state.fixedEvent}`,
    `- **Today's Sequential Progress**: ${metrics.totalCompletedBlocks} / ${metrics.totalTargetBlocks} blocks complete — \`${metrics.durationPrefix}\``,
    `- **Flashcard Review Queue**: ${state.flashcardsReviewedCount} / ${state.flashcardsDailyCap} cards (${state.earlyClearanceEnabled ? 'Early Clearance Active — Unused Blocks Banked' : 'Standard Pacing'})`,
    `- **Completed Deliverables Logged**: ${state.completedDeliverablesLog?.length || 0}`,
    '',
    `## Today’s ${state.baselineBlocks.length}-Block Daily Core Baseline`,
    ...state.baselineBlocks.map(
      (b) =>
        `- [${b.completed ? 'x' : b.bankedViaEarlyClearance ? 'B' : ' '}] **${b.title}** (\`${b.category}\` • \`${getBaselineCognitiveDemand(b)}\`) — 5m Startup: *${b.startupStep}*`
    ),
    '',
    '## Today’s Sequential 20m Runway Preview',
    ...workSteps.map(
      (s) =>
        `- [${s.completed ? 'x' : s.banked ? 'B' : ' '}] **${s.title}** \`${s.countdownBadge}\` — 5m Startup: *${s.startupStep}*`
    ),
    '',
    '## Closed List 1–3 (Active Project Lock — Max 3)',
    ...state.projectQueue.map(
      (p) =>
        `${p.slot}. **${p.title}** — \`[${p.completedBlocks} / ${p.totalBlocks} blocks]\` | Track: \`${p.trackId}\` | Demand: \`${getProjectCognitiveDemand(p)}\` | ${
          p.slot === 1 ? 'UNLOCKED PRIMARY FOCUS #1' : 'LOCKED UNTIL ITEM #1 COMPLETES'
        } — 5m Startup: *${p.startupStep}*`
    ),
    '',
    '## Open List Backlog (Deferred Deliverables)',
    ...(state.projectBacklog.length > 0
      ? state.projectBacklog.map(
          (b, idx) =>
            `- [Backlog #${idx + 1}] **${b.title}** — \`[0 / ${b.totalBlocks} blocks]\` (\`${b.presetType}\`, Track: \`${b.trackId}\`) — 5m Startup: *${b.startupStep}*`
        )
      : ['- *(No deferred items in Open List Backlog)*']),
    '',
    '## 7-Day Master Pipeline Markdown Table',
    '| Day | Load Mode | Target Blocks | Extension Deduction | Fixed Event | Early Anchor |',
    '| :--- | :--- | :--- | :--- | :--- | :--- |',
    ...state.pipelineDays.map((d) => {
      const effective = Math.max(state.baselineBlocks.length || 7, d.baseTargetBlocks - d.deductedBlocksFromExtension);
      return `| ${d.dayLabel} | ${d.loadMode}${d.cruisePlus ? '+' : ''} | ${effective} (${d.baseTargetBlocks} base) | -${d.deductedBlocksFromExtension} blks | ${d.fixedEvent}${d.fixedEventTimeLabel ? ` (${d.fixedEventTimeLabel})` : ''} | ${d.earlyMorningAnchor ? 'Yes' : 'No'} |`;
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
    JSON.stringify(state, null, 2),
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

    const resolvedBacklog = Array.isArray(parsed.openListBacklog)
      ? parsed.openListBacklog
      : Array.isArray(parsed.projectBacklog)
      ? parsed.projectBacklog
      : DEFAULT_SYMMETRY_STATE.openListBacklog;

    const resolvedCompleted = Array.isArray(parsed.completedDeliverablesLog)
      ? parsed.completedDeliverablesLog
      : Array.isArray(parsed.completedDeliverablesArchive)
      ? parsed.completedDeliverablesArchive
      : DEFAULT_SYMMETRY_STATE.completedDeliverablesLog;

    baseState = {
      ...DEFAULT_SYMMETRY_STATE,
      ...parsed,
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
      todayBlockLog: Array.isArray(parsed.todayBlockLog)
        ? parsed.todayBlockLog
        : DEFAULT_SYMMETRY_STATE.todayBlockLog,
      upcomingMilestones:
        Array.isArray(parsed.upcomingMilestones) &&
        parsed.upcomingMilestones.length > 0
          ? parsed.upcomingMilestones
          : DEFAULT_SYMMETRY_STATE.upcomingMilestones,
      baselineBlocks:
        Array.isArray(parsed.baselineBlocks) && parsed.baselineBlocks.length > 0
          ? parsed.baselineBlocks
          : DEFAULT_SYMMETRY_STATE.baselineBlocks,
      projectQueue: Array.isArray(parsed.projectQueue)
        ? parsed.projectQueue
        : DEFAULT_SYMMETRY_STATE.projectQueue,
      projectBacklog: resolvedBacklog,
      openListBacklog: resolvedBacklog,
      completedDeliverablesLog: resolvedCompleted,
      completedDeliverablesArchive: resolvedCompleted,
      pipelineDays:
        Array.isArray(parsed.pipelineDays) && parsed.pipelineDays.length > 0
          ? parsed.pipelineDays
          : DEFAULT_SYMMETRY_STATE.pipelineDays,
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
        ...(parsed.recharge || {}),
        fluidCategories: {
          CAT1_MUSIC: {
            ...DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT1_MUSIC,
            ...(parsed.recharge?.fluidCategories?.CAT1_MUSIC || {}),
          },
          CAT4_COMFORT: {
            ...DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT4_COMFORT,
            ...(parsed.recharge?.fluidCategories?.CAT4_COMFORT || {}),
          },
        },
        completedLog: Array.isArray(parsed.recharge?.completedLog)
          ? parsed.recharge.completedLog
          : DEFAULT_SYMMETRY_STATE.recharge.completedLog,
        stickySlots: {
          CAT2_MAKER: normalizeSticky(
            defaultSticky.CAT2_MAKER,
            parsedSticky.CAT2_MAKER
          ),
          '3A_FICTION': normalizeSticky(
            defaultSticky['3A_FICTION'],
            parsedSticky['3A_FICTION']
          ),
          '3B_NONFICTION': normalizeSticky(
            defaultSticky['3B_NONFICTION'],
            parsedSticky['3B_NONFICTION']
          ),
          '3C_VIDEO': normalizeSticky(
            defaultSticky['3C_VIDEO'],
            parsedSticky['3C_VIDEO']
          ),
          CAT5_GAMING: normalizeSticky(
            defaultSticky.CAT5_GAMING,
            parsedSticky.CAT5_GAMING
          ),
        },
      },
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
  const completedBaseline = state.baselineBlocks.filter(
    (b) => b.completed || b.bankedViaEarlyClearance
  ).length;
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


