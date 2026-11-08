import { SymmetryState } from '../types/symmetry';

export const STORAGE_KEY = 'symmetry_manager_state_v1';

/**
 * 4:00 AM Day-Rollover Boundary:
 * Any local hour < 4 (00:00 – 03:59 AM) counts as part of the previous logical day.
 */
export function getLogicalDayKey(date: Date = new Date()): string {
  const shifted = new Date(date.getTime());
  if (shifted.getHours() < 4) {
    shifted.setDate(shifted.getDate() - 1);
  }
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isPre4amRolloverWindow(date: Date = new Date()): boolean {
  return date.getHours() < 4;
}

export const DEFAULT_SYMMETRY_STATE: SymmetryState = {
  version: '1.0.0',
  logicalDayKey: getLogicalDayKey(),
  upcomingMilestones: ['Nov 12: Anatomy Exam', 'Dec 8–9: Comp Exam'],
  loadMode: 'CRUISE',
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
      title: 'Anatomy Flashcards — Block 1/1',
      category: 'FLASHCARDS_ANATOMY',
      completed: true,
      bankedViaEarlyClearance: false,
      startupStep: 'Open deck + clear first 15 cards',
      trackId: 'science',
    },
    {
      id: 'fc_comp_1',
      title: 'Comp Flashcards — Block 1/3',
      category: 'FLASHCARDS_COMP',
      completed: true,
      bankedViaEarlyClearance: false,
      startupStep: 'Open deck + clear first 15 cards',
      trackId: 'science',
    },
    {
      id: 'fc_comp_2',
      title: 'Comp Flashcards — Block 2/3',
      category: 'FLASHCARDS_COMP',
      completed: false,
      bankedViaEarlyClearance: false,
      startupStep: 'Clear 20 due cards in the Comp deck without pausing on flags.',
      trackId: 'science',
    },
    {
      id: 'fc_comp_3',
      title: 'Comp Flashcards — Block 3/3',
      category: 'FLASHCARDS_COMP',
      completed: false,
      bankedViaEarlyClearance: false,
      startupStep: 'Finish remaining Comp review queue or toggle Early Clearance if zeroed.',
      trackId: 'science',
    },
    {
      id: 'hc_read_1',
      title: 'Half-Chapter Reading / Equations — Block 1/2',
      category: 'READING',
      completed: true,
      startupStep: 'Open assigned section, read first 2 pages, and write down core equations.',
      trackId: 'science',
    },
    {
      id: 'hc_read_2',
      title: 'Half-Chapter Reading / Equations — Block 2/2',
      category: 'READING',
      completed: false,
      startupStep: 'Work through 2 worked problem derivations from the current half-chapter.',
      trackId: 'science',
    },
    {
      id: 'hc_synth_1',
      title: 'Half-Chapter Synthesis — Block 1/1',
      category: 'SYNTHESIS',
      completed: false,
      startupStep: 'Condense today’s half-chapter into 5 bulleted mechanisms from memory.',
      trackId: 'writing',
    },
  ],
  projectQueue: [
    {
      id: 'proj_1',
      slot: 1,
      title: 'Anatomy & Comp Exam Prep Sprint',
      presetType: 'PAPER_8',
      completedBlocks: 2,
      totalBlocks: 8,
      trackId: 'science',
      startupStep: 'Open deck + clear first 15 cards',
      nextStepNote: 'Primary focus target for Nov 12 Anatomy Exam & Dec 8–9 Comp Exam.',
    },
    {
      id: 'proj_2',
      slot: 2,
      title: '12-Page AI/Coding Practicum Paper',
      presetType: 'PAPER_8',
      completedBlocks: 0,
      totalBlocks: 8,
      trackId: 'science',
      startupStep: 'Open draft + write 2 bullet lines',
      nextStepNote: 'Locked until Item #1 completes.',
    },
    {
      id: 'proj_3',
      slot: 3,
      title: 'NMR / MRM / Green Journal Manuscript Revisions',
      presetType: 'PAPER_8',
      completedBlocks: 0,
      totalBlocks: 8,
      trackId: 'science',
      startupStep: 'Open manuscript + review 1 figure/paragraph',
      nextStepNote: 'Locked until Item #1 and Item #2 complete.',
    },
  ],
  projectBacklog: [
    {
      id: 'proj_4',
      title: 'Pharmacology Mechanism Summary Sheet (2-Page Paper)',
      presetType: 'PAPER_8',
      completedBlocks: 0,
      totalBlocks: 8,
      trackId: 'science',
      startupStep: 'Set up 2-column receptor table and fill first 3 rows.',
      nextStepNote: 'Ready to promote when an active queue slot opens.',
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
    },
  ],
  completedDeliverablesArchive: [
    {
      id: 'arch_1',
      title: 'Cardiovascular Pathophysiology Case Deck (4-Block Slide Deck)',
      trackId: 'science',
      totalBlocks: 4,
      completedAt: '2026-11-04',
    },
    {
      id: 'arch_2',
      title: 'Clinical Ethics Response Draft (2-Page Paper)',
      trackId: 'writing',
      totalBlocks: 8,
      completedAt: '2026-11-02',
    },
    {
      id: 'arch_3',
      title: 'Q4 Home Filter & Preventive Maintenance Audit',
      trackId: 'personal',
      totalBlocks: 2,
      completedAt: '2026-10-29',
    },
  ],
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
    activeTaskTitle: 'Anatomy & Comp Exam Prep Sprint',
    activeTaskType: 'PROJECT',
    activeStartupPrompt: 'Open deck + clear first 15 cards',
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
        fiveMinStarts: 0,
        unlockedViaCheckIn: false,
      },
      '3A_FICTION': {
        key: '3A_FICTION',
        label: '3A Fiction [Sticky]',
        activeTitle: 'Soul Music by Terry Pratchett',
        startupStep: 'Listen 5m at 1.75x–2.25x in boots or eyes closed',
        backlogQueue: ['Exoplanet', 'Feet of Clay', 'Hogfather'],
        fiveMinStarts: 0,
        unlockedViaCheckIn: false,
      },
      '3B_NONFICTION': {
        key: '3B_NONFICTION',
        label: '3B Nonfiction [Sticky]',
        activeTitle: 'The American Way of Killing',
        startupStep: 'Listen 5m in recliner or compression boots',
        backlogQueue: ['The Emperor of All Maladies', 'Thinking in Systems'],
        fiveMinStarts: 0,
        unlockedViaCheckIn: false,
      },
      '3C_VIDEO': {
        key: '3C_VIDEO',
        label: '3C Video [Sticky]',
        activeTitle: "Widow's Bay",
        startupStep: 'Watch first 5m away from work monitor',
        backlogQueue: ['Severance Season 2', 'Andor Archive Cut'],
        fiveMinStarts: 0,
        unlockedViaCheckIn: false,
      },
      CAT5_GAMING: {
        key: 'CAT5_GAMING',
        label: 'Gaming [Sticky]',
        activeTitle: "Baldur's Gate 3",
        startupStep: 'Boot save + 1 single 5m micro-objective',
        backlogQueue: ['Factorio', 'Dwarf Fortress', 'RimWorld', 'Hades II'],
        fiveMinStarts: 0,
        unlockedViaCheckIn: false,
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
      name: 'Science / Clinical',
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
      name: 'Writing / Literature',
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
      name: 'Personal / Home',
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
      name: 'Coding / Hardware',
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
      name: 'Music',
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
  const totalTargetBlocks = state.customModeBlockAdjustment;
  const completedBaselineCount = state.baselineBlocks.filter(
    (b) => b.completed || b.bankedViaEarlyClearance
  ).length;
  const totalCompletedBlocks =
    completedBaselineCount + state.discretionaryBlocksCompletedToday;
  const remainingBlocks = Math.max(0, totalTargetBlocks - totalCompletedBlocks);
  const remainingMinutes = remainingBlocks * 20;

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
 * 1. Spaces the 4 Flashcard blocks (1 Anatomy + 3 Comp) across early (Blocks 1-2) and mid-shift (Blocks 5-6)
 *    so flashcards are NEVER scheduled as the final blocks of the night.
 * 2. Groups Half-Chapter Reading (Blocks 3-4) and Half-Chapter Synthesis (Block 7), and locks 100% of
 *    remaining discretionary blocks (Blocks 8..N) to Closed List Focus #1.
 * 3. Interleaves Break rows automatically:
 *    - `Level 1 Micro-Reset (3–5m: Window gaze / water / 3 dishes)` between two blocks of the same task.
 *    - `Level 2 Task-Switch Buffer (10–15m: Espresso / 1-Song Riff / 15m TENS)` after any 2 chained blocks (40m)
 *      or whenever switching task types.
 *    - Mandatory `Level 3 Mid-Shift Reset (60–120m: 30m meal + walk/boots)` after Block 7 on Surge days (14-15 blocks).
 * 4. Running countdown badge on every work row (`[20m | 3h 40m work left]` -> `[40m | 3h 20m work left]` -> ... -> `[0m work left — End-of-Shift Bridge]`).
 */
export function generateSequentialChecklist(
  state: SymmetryState
): import('../types/symmetry').SequentialChecklistStep[] {
  const totalTargetBlocks = Math.max(7, state.customModeBlockAdjustment);
  const byId = new Map(state.baselineBlocks.map((b) => [b.id, b]));

  const fcAnat1 = byId.get('fc_anat_1') || state.baselineBlocks[0];
  const fcComp1 = byId.get('fc_comp_1') || state.baselineBlocks[1];
  const fcComp2 = byId.get('fc_comp_2') || state.baselineBlocks[2];
  const fcComp3 = byId.get('fc_comp_3') || state.baselineBlocks[3];
  const hcRead1 = byId.get('hc_read_1') || state.baselineBlocks[4];
  const hcRead2 = byId.get('hc_read_2') || state.baselineBlocks[5];
  const hcSynth1 = byId.get('hc_synth_1') || state.baselineBlocks[6];

  const primaryProject = state.projectQueue[0];
  const discretionaryCount = Math.max(0, totalTargetBlocks - 7);

  interface RawWorkSpec {
    blockNumber: number;
    sourceId: string;
    title: string;
    categoryBadge: string;
    taskType: import('../types/symmetry').ActiveTaskType;
    startupStep: string;
    completed: boolean;
    banked: boolean;
  }

  // Sequenced baseline blocks:
  // Early-Shift Flashcards (1-2) -> Half-Chapter Reading (3-4) -> Mid-Shift Flashcards (5-6) -> Half-Chapter Synthesis (7)
  // Followed by 100% Locked Focus #1 Discretionary Blocks (8..totalTargetBlocks)
  const orderedBaselineSpecs: Omit<RawWorkSpec, 'blockNumber'>[] = [
    {
      sourceId: fcAnat1.id,
      title: fcAnat1.title,
      categoryBadge: 'EARLY SHIFT • FLASHCARDS (1/4)',
      taskType: 'FLASHCARDS',
      startupStep: fcAnat1.startupStep,
      completed: fcAnat1.completed,
      banked: Boolean(fcAnat1.bankedViaEarlyClearance),
    },
    {
      sourceId: fcComp1.id,
      title: fcComp1.title,
      categoryBadge: 'EARLY SHIFT • FLASHCARDS (2/4)',
      taskType: 'FLASHCARDS',
      startupStep: fcComp1.startupStep,
      completed: fcComp1.completed,
      banked: Boolean(fcComp1.bankedViaEarlyClearance),
    },
    {
      sourceId: hcRead1.id,
      title: hcRead1.title,
      categoryBadge: 'BASELINE FLOOR • HALF-CHAPTER READ (1/2)',
      taskType: 'READING',
      startupStep: hcRead1.startupStep,
      completed: hcRead1.completed,
      banked: false,
    },
    {
      sourceId: hcRead2.id,
      title: hcRead2.title,
      categoryBadge: 'BASELINE FLOOR • HALF-CHAPTER READ (2/2)',
      taskType: 'READING',
      startupStep: hcRead2.startupStep,
      completed: hcRead2.completed,
      banked: false,
    },
    {
      sourceId: fcComp2.id,
      title: fcComp2.title,
      categoryBadge: 'MID-SHIFT • FLASHCARDS (3/4)',
      taskType: 'FLASHCARDS',
      startupStep: fcComp2.startupStep,
      completed: fcComp2.completed,
      banked: Boolean(fcComp2.bankedViaEarlyClearance),
    },
    {
      sourceId: fcComp3.id,
      title: fcComp3.title,
      categoryBadge: 'MID-SHIFT • FLASHCARDS (4/4)',
      taskType: 'FLASHCARDS',
      startupStep: fcComp3.startupStep,
      completed: fcComp3.completed,
      banked: Boolean(fcComp3.bankedViaEarlyClearance),
    },
    {
      sourceId: hcSynth1.id,
      title: hcSynth1.title,
      categoryBadge: 'BASELINE FLOOR • HALF-CHAPTER SYNTHESIS',
      taskType: 'SYNTHESIS',
      startupStep: hcSynth1.startupStep,
      completed: hcSynth1.completed,
      banked: false,
    },
  ];

  const workSpecs: RawWorkSpec[] = orderedBaselineSpecs.map((spec, idx) => ({
    ...spec,
    blockNumber: idx + 1,
  }));

  for (let d = 1; d <= discretionaryCount; d++) {
    const blockNumber = 7 + d;
    const isCompleted = d <= state.discretionaryBlocksCompletedToday;
    const projTitle = primaryProject?.title || 'Closed List Focus #1';
    const projStartup =
      primaryProject?.startupStep ||
      'Open primary deliverable and complete 5m ignition step.';
    workSpecs.push({
      blockNumber,
      sourceId: primaryProject?.id || 'proj_1',
      title: `${projTitle} — Locked Focus #1 (Block ${d}/${discretionaryCount})`,
      categoryBadge: `CLOSED LIST #1 • DISCRETIONARY (${d}/${discretionaryCount})`,
      taskType: 'PROJECT',
      startupStep: projStartup,
      completed: isCompleted,
      banked: false,
    });
  }

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
    : 'Nov 12: Anatomy Exam • Dec 8–9: Comp Exam';

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

  const lines: string[] = [
    '# SymmetryManager (`wl-balancer`) — Master `state.md`',
    '',
    '# Part I: On-Duty Capacity Governor State',
    '',
    `- **Logical Shift Date (4:00 AM Boundary)**: ${state.logicalDayKey || getLogicalDayKey()}`,
    `- **Upcoming Milestones**: ${milestones}`,
    `- **Active Load Mode**: ${state.loadMode}${state.cruisePlus ? ' (Cruise+)' : ''} — Target Ceiling: ${metrics.totalTargetBlocks} blocks`,
    `- **Consecutive Surge Days**: ${state.surgeConsecutiveDays} / 2`,
    `- **Surge Mid-Day Reset (60–120m after Block 7)**: ${state.midDayResetCompletedToday ? 'Completed' : 'Pending'}`,
    `- **Fixed Event Anchor**: ${state.fixedEvent}`,
    `- **Today's Sequential Progress**: ${metrics.totalCompletedBlocks} / ${metrics.totalTargetBlocks} blocks complete — \`${metrics.durationPrefix}\``,
    `- **Flashcard Review Queue**: ${state.flashcardsReviewedCount} / ${state.flashcardsDailyCap} cards (${state.earlyClearanceEnabled ? 'Early Clearance Active — Unused Blocks Banked' : 'Standard Pacing'})`,
    '',
    '## Today’s 7-Block Daily Core Baseline',
    ...state.baselineBlocks.map(
      (b) =>
        `- [${b.completed ? 'x' : b.bankedViaEarlyClearance ? 'B' : ' '}] **${b.title}** (\`${b.category}\`) — 5m Startup: *${b.startupStep}*`
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
        `${p.slot}. **${p.title}** — \`[${p.completedBlocks} / ${p.totalBlocks} blocks]\` | Track: \`${p.trackId}\` | ${
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
      const effective = Math.max(7, d.baseTargetBlocks - d.deductedBlocksFromExtension);
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
    `- **Category 1 — Music [Fluid]**: Bass / Guitar / Piano / Drums — Counter: \`[Fluid]\` — 5m Startup: *Play 1 familiar song cold (zero DAW or drills)*`,
    `- **Category 2 — Maker / Hardware [Sticky]**: ${state.recharge.stickySlots.CAT2_MAKER.activeTitle} — Counter: \`[${state.recharge.stickySlots.CAT2_MAKER.fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots.CAT2_MAKER.startupStep}* — Backlog: ${state.recharge.stickySlots.CAT2_MAKER.backlogQueue.join(', ') || 'None'}`,
    `- **Category 3A — Media: Fiction [Sticky]**: ${state.recharge.stickySlots['3A_FICTION'].activeTitle} (${state.recharge.fictionSpeed}) — Counter: \`[${state.recharge.stickySlots['3A_FICTION'].fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots['3A_FICTION'].startupStep}* — Backlog: ${state.recharge.stickySlots['3A_FICTION'].backlogQueue.join(', ') || 'None'}`,
    `- **Category 3B — Media: Nonfiction [Sticky]**: ${state.recharge.stickySlots['3B_NONFICTION'].activeTitle} — Counter: \`[${state.recharge.stickySlots['3B_NONFICTION'].fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots['3B_NONFICTION'].startupStep}* — Backlog: ${state.recharge.stickySlots['3B_NONFICTION'].backlogQueue.join(', ') || 'None'}`,
    `- **Category 3C — Media: Video [Sticky]**: ${state.recharge.stickySlots['3C_VIDEO'].activeTitle} — Counter: \`[${state.recharge.stickySlots['3C_VIDEO'].fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots['3C_VIDEO'].startupStep}* — Backlog: ${state.recharge.stickySlots['3C_VIDEO'].backlogQueue.join(', ') || 'None'}`,
    `- **Category 4 — Comfort Show [Fluid]**: It's Always Sunny in Philadelphia — Counter: \`[Fluid]\` — 5m Startup: *Watch first 5m of episode away from work monitor*`,
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
    baseState = {
      ...DEFAULT_SYMMETRY_STATE,
      ...parsed,
      upcomingMilestones:
        Array.isArray(parsed.upcomingMilestones) && parsed.upcomingMilestones.length > 0
          ? parsed.upcomingMilestones
          : DEFAULT_SYMMETRY_STATE.upcomingMilestones,
      baselineBlocks:
        Array.isArray(parsed.baselineBlocks) && parsed.baselineBlocks.length > 0
          ? parsed.baselineBlocks
          : DEFAULT_SYMMETRY_STATE.baselineBlocks,
      projectQueue: Array.isArray(parsed.projectQueue)
        ? parsed.projectQueue
        : DEFAULT_SYMMETRY_STATE.projectQueue,
      projectBacklog: Array.isArray(parsed.projectBacklog)
        ? parsed.projectBacklog
        : DEFAULT_SYMMETRY_STATE.projectBacklog,
      completedDeliverablesArchive: Array.isArray(parsed.completedDeliverablesArchive)
        ? parsed.completedDeliverablesArchive
        : DEFAULT_SYMMETRY_STATE.completedDeliverablesArchive,
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
      },
      recharge: {
        ...DEFAULT_SYMMETRY_STATE.recharge,
        ...(parsed.recharge || {}),
        completedLog: Array.isArray(parsed.recharge?.completedLog)
          ? parsed.recharge.completedLog
          : DEFAULT_SYMMETRY_STATE.recharge.completedLog,
        stickySlots: {
          CAT2_MAKER: { ...defaultSticky.CAT2_MAKER, ...(parsedSticky.CAT2_MAKER || {}) },
          '3A_FICTION': {
            ...defaultSticky['3A_FICTION'],
            ...(parsedSticky['3A_FICTION'] || {}),
          },
          '3B_NONFICTION': {
            ...defaultSticky['3B_NONFICTION'],
            ...(parsedSticky['3B_NONFICTION'] || {}),
          },
          '3C_VIDEO': { ...defaultSticky['3C_VIDEO'], ...(parsedSticky['3C_VIDEO'] || {}) },
          CAT5_GAMING: {
            ...defaultSticky.CAT5_GAMING,
            ...(parsedSticky.CAT5_GAMING || {}),
          },
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

