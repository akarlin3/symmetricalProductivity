import { SymmetryState } from '../types/symmetry';

export const STORAGE_KEY = 'symmetry_manager_state_v1';

export const DEFAULT_SYMMETRY_STATE: SymmetryState = {
  version: '1.0.0',
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
      startupStep: 'Open Anatomy deck and clear the first 15 visual identification cards.',
      trackId: 'science',
    },
    {
      id: 'fc_comp_1',
      title: 'Comp Flashcards — Block 1/3',
      category: 'FLASHCARDS_COMP',
      completed: true,
      bankedViaEarlyClearance: false,
      startupStep: 'Run 15 high-priority comprehensive review cards at a 10s pace.',
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
      title: 'Pathophysiology Literature Review (2-Page Paper)',
      presetType: 'PAPER_8',
      completedBlocks: 2,
      totalBlocks: 8,
      trackId: 'writing',
      startupStep: 'Open draft document and write the first 3 sentences of Section 2.',
      nextStepNote: 'Integrate hemodynamic table citations into paragraph 3.',
    },
    {
      id: 'proj_2',
      slot: 2,
      title: 'Clinical Case Conference Slide Deck',
      presetType: 'SLIDES_4',
      completedBlocks: 0,
      totalBlocks: 4,
      trackId: 'science',
      startupStep: 'Create 6 blank slide titles matching the case timeline.',
      nextStepNote: 'Locked until Item #1 (2-Page Paper) reaches 8/8 blocks.',
    },
    {
      id: 'proj_3',
      slot: 3,
      title: 'Quarterly Home Equipment & Filter Maintenance',
      presetType: 'CUSTOM',
      completedBlocks: 0,
      totalBlocks: 3,
      trackId: 'personal',
      startupStep: 'List replacement parts and check HVAC/printer filter inventory.',
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
    isRunning: false,
    activeBlockSourceId: 'proj_1',
    activeTaskTitle: 'Pathophysiology Literature Review (2-Page Paper)',
    activeTaskType: 'PROJECT',
    activeStartupPrompt: 'Open draft document and write the first 3 sentences of Section 2.',
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
  },
  recharge: {
    endOfShiftLocked: false,
    manualEveningPreview: false,
    flowExtensionPromptOpen: false,
    flowExtensionActive: false,
    flowExtensionRunning: false,
    flowExtensionElapsedSeconds: 0,
    flowExtensionBlocksLoggedToday: 0,
    weeklyExtensionsUsed: 1, // 1 of 2 used this week
    lastChimeMinute: 0,
    option0Running: false,
    option0SecondsLeft: 1200, // 20m silent timer
    option0ConsecutiveWindows: 0, // Cap at 2 (40m) -> Fork Check
    forkCheckModalOpen: false,
    activeCategory: 'NONE',
    activeMediaTab: '3A_FICTION',
    fictionSpeed: '2.00x',
    pacingStage: 'STARTUP_5M',
    categorySecondsLeft: 300,
    categoryElapsedMinutes: 0,
    categoryRunning: false,
    checkInModalOpen: false,
    checkInMilestone: 20,
    stickySlots: {
      CAT2_MAKER: {
        key: 'CAT2_MAKER',
        label: 'Maker / Hardware [Sticky]',
        activeTitle: 'K1C 3D Printer Diagnostic & Bed Mesh Step',
        backlogQueue: ['Custom Cable Organizer CAD Bracket', 'Multimeter Sensor Enclosure Print'],
        fiveMinStarts: 1,
        unlockedViaCheckIn: false,
      },
      '3A_FICTION': {
        key: '3A_FICTION',
        label: '3A Fiction [Sticky]',
        activeTitle: 'Soul Music',
        backlogQueue: ['Feet of Clay', 'Hogfather'],
        fiveMinStarts: 2,
        unlockedViaCheckIn: false,
      },
      '3B_NONFICTION': {
        key: '3B_NONFICTION',
        label: '3B Nonfiction [Sticky]',
        activeTitle: 'The American Way of Killing',
        backlogQueue: ['The Emperor of All Maladies', 'Thinking in Systems'],
        fiveMinStarts: 1,
        unlockedViaCheckIn: false,
      },
      '3C_VIDEO': {
        key: '3C_VIDEO',
        label: '3C Video [Sticky]',
        activeTitle: "Widow's Bay",
        backlogQueue: ['Severance Season 2', 'Andor Archive Cut'],
        fiveMinStarts: 1,
        unlockedViaCheckIn: false,
      },
      CAT5_GAMING: {
        key: 'CAT5_GAMING',
        label: 'Gaming [Sticky]',
        activeTitle: "Baldur's Gate 3",
        backlogQueue: ['Disco Elysium Final Cut', 'Factorio Space Age'],
        fiveMinStarts: 2,
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
  const lines: string[] = [
    '# SymmetryManager — State Snapshot (`state.md`)',
    '',
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
        `- [${b.completed ? 'x' : b.bankedViaEarlyClearance ? 'B' : ' '}] **${b.title}** (${b.category})`
    ),
    '',
    '## Active Project Lock (Closed List — Max 3)',
    ...state.projectQueue.map(
      (p) =>
        `${p.slot}. **${p.title}** — \`[${p.completedBlocks} / ${p.totalBlocks} blocks]\` ${
          p.slot === 1 ? '(UNLOCKED PRIMARY)' : '(LOCKED TO ITEM #1)'
        }`
    ),
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
  return {
    ...DEFAULT_SYMMETRY_STATE,
    ...parsed,
  };
}
