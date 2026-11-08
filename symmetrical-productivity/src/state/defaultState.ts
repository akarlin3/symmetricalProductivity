import { SymmetryState, TodayBlockLogEntry } from '../types/symmetry';

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

export function createLogTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

const initialLogicalDay = getLogicalDayKey();

export const DEFAULT_TODAY_BLOCK_LOG: TodayBlockLogEntry[] = [
  {
    id: 'log_init_fc_anat_1',
    timestamp: '2026-11-07T09:15:00.000Z',
    logicalDate: initialLogicalDay,
    category: 'FLOOR_ANATOMY',
    title: 'Anatomy Flashcards — Block 1/1',
    durationMinutes: 20,
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
    roadmapTrack: 'science',
    stroke: 'INPUT',
    sourceBlockId: 'hc_read_1',
    rungNumber: 1,
  },
];

export const DEFAULT_SYMMETRY_STATE: SymmetryState = {
  version: '1.0.0',
  logicalDayKey: initialLogicalDay,
  todayBlockLog: DEFAULT_TODAY_BLOCK_LOG,
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

export function computeShiftMetrics(state: SymmetryState) {
  const totalTargetBlocks = state.customModeBlockAdjustment;
  const completedBaselineCount = state.baselineBlocks.filter(
    (b) => b.completed || b.bankedViaEarlyClearance
  ).length;
  const totalCompletedBlocks =
    completedBaselineCount + state.discretionaryBlocksCompletedToday;
  const remainingBlocks = Math.max(0, totalTargetBlocks - totalCompletedBlocks);
  const remainingMinutes = remainingBlocks * 20;

  const hours = Math.floor(remainingMinutes / 60);
  const mins = remainingMinutes % 60;

  let remainingWorkFormatted = '0m work left';
  if (remainingMinutes > 0) {
    if (hours > 0) {
      remainingWorkFormatted = `${hours}h ${String(mins).padStart(2, '0')}m work left`;
    } else {
      remainingWorkFormatted = `${mins}m work left`;
    }
  }

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

export function serializeToStateMarkdown(state: SymmetryState): string {
  const metrics = computeShiftMetrics(state);
  const milestones = state.upcomingMilestones?.length
    ? state.upcomingMilestones.join(' • ')
    : 'Nov 12: Anatomy Exam • Dec 8–9: Comp Exam';
  const lines: string[] = [
    '# SymmetryManager — State Snapshot (`state.md`)',
    '',
    `- **Upcoming Milestones**: ${milestones}`,
    `- **Load Mode**: ${state.loadMode}${state.cruisePlus ? ' (Cruise+)' : ''} (${metrics.totalCompletedBlocks} / ${metrics.totalTargetBlocks} blocks complete)`,
    `- **Focus Pipeline Header**: \`${metrics.durationPrefix}\``,
    `- **Fixed Event**: ${state.fixedEvent}`,
    `- **Flashcard Early Clearance**: ${state.earlyClearanceEnabled ? 'Active (Unused blocks banked)' : 'Inactive'}`,
    `- **Surge Consecutive Days**: ${state.surgeConsecutiveDays} / 2`,
    `- **Weekly Flow Extensions Used**: ${state.recharge.weeklyExtensionsUsed} / 2`,
    '',
    '## 7-Block Daily Core Baseline',
    ...state.baselineBlocks.map(
      (b) =>
        `- [${b.completed ? 'x' : b.bankedViaEarlyClearance ? 'B' : ' '}] **${b.title}** (${b.category}) — 5m Startup: *${b.startupStep}*`
    ),
    '',
    '## Active Project Lock (Closed List — Max 3)',
    ...state.projectQueue.map(
      (p) =>
        `${p.slot}. **${p.title}** — \`[${p.completedBlocks} / ${p.totalBlocks} blocks]\` ${
          p.slot === 1 ? '(UNLOCKED PRIMARY)' : '(LOCKED TO ITEM #1)'
        } — 5m Startup: *${p.startupStep}*`
    ),
    '',
    '## Evening Recharge Menu (Sticky Swap Counters)',
    `- **Category 1 (Music - Fluid)**: Bass / Guitar / Piano / Drums — 5m Startup: *Play 1 familiar song cold — no DAW or drills*`,
    `- **Category 2 (Maker - Sticky)**: ${state.recharge.stickySlots.CAT2_MAKER.activeTitle} \`[${state.recharge.stickySlots.CAT2_MAKER.fiveMinStarts}/3 starts]\` — 5m Startup: *${state.recharge.stickySlots.CAT2_MAKER.startupStep}*`,
    `- **Category 3A (Fiction - Sticky)**: ${state.recharge.stickySlots['3A_FICTION'].activeTitle} \`[${state.recharge.stickySlots['3A_FICTION'].fiveMinStarts}/3 starts]\` — 5m Startup: *${state.recharge.stickySlots['3A_FICTION'].startupStep}* (Queued Next: ${state.recharge.stickySlots['3A_FICTION'].backlogQueue[0] || 'None'})`,
    `- **Category 3B (Nonfiction - Sticky)**: ${state.recharge.stickySlots['3B_NONFICTION'].activeTitle} \`[${state.recharge.stickySlots['3B_NONFICTION'].fiveMinStarts}/3 starts]\` — 5m Startup: *${state.recharge.stickySlots['3B_NONFICTION'].startupStep}*`,
    `- **Category 3C (Video - Sticky)**: ${state.recharge.stickySlots['3C_VIDEO'].activeTitle} \`[${state.recharge.stickySlots['3C_VIDEO'].fiveMinStarts}/3 starts]\` — 5m Startup: *${state.recharge.stickySlots['3C_VIDEO'].startupStep}*`,
    `- **Category 4 (Comfort Show - Fluid)**: It's Always Sunny in Philadelphia — 5m Startup: *First 5m of episode away from work monitor*`,
    `- **Category 5 (Gaming - Sticky)**: ${state.recharge.stickySlots.CAT5_GAMING.activeTitle} \`[${state.recharge.stickySlots.CAT5_GAMING.fiveMinStarts}/3 starts]\` — 5m Startup: *${state.recharge.stickySlots.CAT5_GAMING.startupStep}* (Backlog: ${state.recharge.stickySlots.CAT5_GAMING.backlogQueue.join(', ')})`,
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
  const candidate = jsonBlockMatch ? jsonBlockMatch[1].trim() : trimmed;
  const parsed = JSON.parse(candidate);
  const defaultSticky = DEFAULT_SYMMETRY_STATE.recharge.stickySlots;
  const parsedSticky = parsed.recharge?.stickySlots || {};
  return {
    ...DEFAULT_SYMMETRY_STATE,
    ...parsed,
    todayBlockLog: Array.isArray(parsed.todayBlockLog)
      ? parsed.todayBlockLog
      : DEFAULT_SYMMETRY_STATE.todayBlockLog,
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

