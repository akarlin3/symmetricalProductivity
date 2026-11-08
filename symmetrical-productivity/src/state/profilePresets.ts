import {
  BaselineBlock,
  BreakOptionsConfig,
  FluidCategoriesMap,
  ProfilePresetId,
  ProjectItem,
  RoadmapTrack,
  StickyKey,
  StickySlotState,
  SymmetryState,
  TaskWeightsConfig,
  TrackId,
} from '../types/symmetry';
import { DEFAULT_SYMMETRY_STATE, getLogicalDayKey } from './defaultState';

export const ONBOARDING_COMPLETED_KEY = 'symmetry_onboarding_completed_v1';

export interface ProfilePresetMetadata {
  id: ProfilePresetId;
  number: 1 | 2 | 3 | 4 | 5;
  title: string;
  shortTitle: string;
  badge: string;
  floorBlockCount: 6 | 7;
  floorSummary: string;
  weightsSummary: string;
  eveningSummary: string;
  tracksSummary: string;
  description: string;
}

export const PROFILE_PRESET_METADATA: ProfilePresetMetadata[] = [
  {
    id: 'AVERY_DEFAULT',
    number: 1,
    title: 'Avery Default (Medical Physics, Writing & Maker)',
    shortTitle: 'Avery Default',
    badge: '7-BLOCK FLOOR • BASELINE DEFAULT',
    floorBlockCount: 7,
    floorSummary:
      '1b Anatomy + 3b Comp Flashcards (250 cap) + 3b Half-Chapter Floor (2 Read/Eq + 1 Synthesis)',
    weightsSummary: '2-Page Paper (8b) & Slide Deck (4b)',
    eveningSummary:
      "K1C 3D Printer • Soul Music / The American Way of Killing / Widow's Bay • It's Always Sunny • Baldur's Gate 3",
    tracksSummary: 'Scientist / Author / Partner / Coder-Maker / Musician',
    description:
      "Restores the exact baseline configuration: Nov 12 Anatomy & Dec 8–9 Comp Exams, 1b Anatomy + 3b Comp Flashcards (250 cap) + 3b Half-Chapter Floor, K1C 3D Printer, Soul Music / The American Way of Killing / Widow's Bay Triple-Track, It's Always Sunny, Baldur's Gate 3, and the Scientist / Author / Partner / Coder-Maker / Musician 4-Rung Roadmap.",
  },
  {
    id: 'ACADEMIC_RESEARCHER',
    number: 2,
    title: 'Academic & Grad Researcher',
    shortTitle: 'Academic & Grad Researcher',
    badge: '7-BLOCK FLOOR • RESEARCH & LAB',
    floorBlockCount: 7,
    floorSummary:
      '7-Block Floor (Literature Review, Spaced Repetition, Data/Equations Synthesis)',
    weightsSummary: 'Paper (8b) & Presentation (4b)',
    eveningSummary:
      'Acoustic Practice • Lab Bench Automation • Sci-Fi / Monograph / Docu Triple-Track • Classic Sitcom • Strategy Gaming',
    tracksSummary: 'Research / Teaching / Personal / Coding / Music',
    description:
      '7-Block Floor (Literature Review, Spaced Repetition, Data/Equations Synthesis), Paper (8b) & Presentation (4b) weights, and Research / Teaching / Personal / Coding / Music tracks.',
  },
  {
    id: 'SOFTWARE_ENGINEER',
    number: 3,
    title: 'Software Engineer & Indie Builder',
    shortTitle: 'Software Engineer & Indie Builder',
    badge: '6-BLOCK FLOOR • SYSTEMS & BUILD',
    floorBlockCount: 6,
    floorSummary:
      '6-Block Floor (Code Review/Triage, Core Architecture, Docs/Testing)',
    weightsSummary: 'Feature Spec (4b) & System Build (8b)',
    eveningSummary:
      'Synth/Guitar Cold Play • ESP32 / Custom Keyboard Bench • Sci-Fi / Systems / Series • Off-Screen Sitcom • Factorio / BG3',
    tracksSummary: 'Engineering / Writing / Home / Hardware / Creative',
    description:
      '6-Block Floor (Code Review/Triage, Core Architecture, Docs/Testing), Feature Spec (4b) & System Build (8b) weights, and Engineering / Writing / Home / Hardware / Creative tracks.',
  },
  {
    id: 'WRITER_CREATIVE',
    number: 4,
    title: 'Writer & Polymath Creative',
    shortTitle: 'Writer & Polymath Creative',
    badge: '6-BLOCK FLOOR • PROSE & SYNTHESIS',
    floorBlockCount: 6,
    floorSummary:
      '6-Block Floor (Close Reading, Note Synthesis, Draft Sprint)',
    weightsSummary: 'Essay (4b) & Chapter/Book (8b)',
    eveningSummary:
      'Acoustic Songbook • Bookbinding / Print Bench • Fiction / Craft / Essay Film • Off-Monitor Comedy • Narrative RPG',
    tracksSummary: 'Literature / Career / Community / Craft / Music',
    description:
      '6-Block Floor (Close Reading, Note Synthesis, Draft Sprint), Essay (4b) & Chapter/Book (8b) weights, and Literature / Career / Community / Craft / Music tracks.',
  },
  {
    id: 'BLANK_CUSTOM',
    number: 5,
    title: 'Blank Custom Architecture',
    shortTitle: 'Blank Custom Architecture',
    badge: 'CUSTOM STEP-BY-STEP BUILDER',
    floorBlockCount: 6,
    floorSummary:
      'Name your own 6 or 7 Daily Baseline blocks & 5m startup steps',
    weightsSummary: 'Custom 8b & 4b Deliverable Weights (Locked Pacing)',
    eveningSummary:
      'Name your own 5 Evening Recharge categories (Fluid & Sticky [X/3])',
    tracksSummary: 'Name your own 3 Core Tracks + 2 Zero-Quota Sandbox Tracks',
    description:
      'Lets the user name their own Daily Baseline blocks, 5 Evening Recharge categories, and 5 Long-Term Tracks step-by-step while keeping all capacity ceilings, 5m startup timers, and 20m/60m pacing rules locked.',
  },
];

export const DEFAULT_FLUID_CATEGORIES: FluidCategoriesMap = {
  CAT1_MUSIC: {
    label: '1. Acoustic & Instrument Play',
    activeTitle: 'Acoustic & Instrument Play',
    subtitle: 'Bass / Guitar / Piano / Drums — fluid musical expression.',
    startupStep: 'Play 1 familiar song cold — no DAW or drills',
  },
  CAT4_COMFORT: {
    label: "4. It's Always Sunny in Philadelphia",
    activeTitle: "It's Always Sunny in Philadelphia",
    subtitle: 'Low-friction comfort show recharge away from the desk setup.',
    startupStep: 'First 5m of episode away from work monitor',
  },
};

export const DEFAULT_TASK_WEIGHTS: TaskWeightsConfig = {
  heavyLabel: '2-Page Paper',
  heavyBlocks: 8,
  mediumLabel: 'Slide Deck',
  mediumBlocks: 4,
};

export const DEFAULT_BREAK_OPTIONS: BreakOptionsConfig = {
  l1Label: 'Window gaze / water / 3 dishes',
  l2EspressoLabel: 'Espresso',
  l2MusicLabel: '5m Cold Song (Bass/Guitar)',
  l2PhysicalLabel: '15m TENS / Normatec',
  stressBreathingLabel: '4-7-8 Breathing Visual Pace',
  stressEspressoLabel: 'Espresso Shot',
  stressBootsLabel: 'Compression Boots',
};

export interface CustomArchitectureDraft {
  profileName: string;
  floorCount: 6 | 7;
  upcomingMilestones: [string, string];
  taskWeights: TaskWeightsConfig;
  breakOptions: BreakOptionsConfig;
  primaryProjectTitle: string;
  primaryProjectStartup: string;
  secondaryProjectTitle: string;
  tertiaryProjectTitle: string;
  baselineBlocks: {
    title: string;
    category: BaselineBlock['category'];
    startupStep: string;
    trackId: TrackId;
  }[];
  fluidCategories: FluidCategoriesMap;
  stickyCategories: {
    CAT2_MAKER: { activeTitle: string; startupStep: string; queuedNextTitle: string };
    '3A_FICTION': { activeTitle: string; startupStep: string; queuedNextTitle: string };
    '3B_NONFICTION': { activeTitle: string; startupStep: string; queuedNextTitle: string };
    '3C_VIDEO': { activeTitle: string; startupStep: string; queuedNextTitle: string };
    CAT5_GAMING: { activeTitle: string; startupStep: string; queuedNextTitle: string };
  };
  tracks: {
    id: TrackId;
    name: string;
    archetypeRole: string;
    isSandbox: boolean;
    rungs: [string, string, string, string];
  }[];
}

export function getDefaultCustomArchitectureDraft(): CustomArchitectureDraft {
  return {
    profileName: 'Custom Symmetrical Architecture',
    floorCount: 6,
    upcomingMilestones: ['Milestone 1: Primary Target', 'Milestone 2: Secondary Target'],
    taskWeights: {
      heavyLabel: 'Deep Deliverable',
      heavyBlocks: 8,
      mediumLabel: 'Compact Deliverable',
      mediumBlocks: 4,
    },
    breakOptions: { ...DEFAULT_BREAK_OPTIONS },
    primaryProjectTitle: 'Primary Focus Deliverable #1',
    primaryProjectStartup: 'Open primary document and complete 5m startup step.',
    secondaryProjectTitle: 'Queued Deliverable #2',
    tertiaryProjectTitle: 'Queued Deliverable #3',
    baselineBlocks: [
      {
        title: 'Spaced Recall / Triage — Block 1/2',
        category: 'FLASHCARDS_ANATOMY',
        startupStep: 'Open review queue and clear first 15 items.',
        trackId: 'science',
      },
      {
        title: 'Spaced Recall / Triage — Block 2/2',
        category: 'FLASHCARDS_COMP',
        startupStep: 'Clear remaining review items or toggle Early Clearance.',
        trackId: 'science',
      },
      {
        title: 'Deep Reading / Source Intake — Block 1/2',
        category: 'READING',
        startupStep: 'Open primary source material and annotate first 2 pages.',
        trackId: 'science',
      },
      {
        title: 'Deep Reading / Problem Analysis — Block 2/2',
        category: 'READING',
        startupStep: 'Extract core mechanisms or work through 2 examples.',
        trackId: 'science',
      },
      {
        title: 'Synthesis & Note Consolidation — Block 1/2',
        category: 'SYNTHESIS',
        startupStep: 'Summarize key findings into 5 structured bullet points.',
        trackId: 'writing',
      },
      {
        title: 'Synthesis & Output Prep — Block 2/2',
        category: 'SYNTHESIS',
        startupStep: 'Outline next deliverable section from today’s notes.',
        trackId: 'writing',
      },
      {
        title: 'Extended Synthesis / Review — Block 7',
        category: 'SYNTHESIS',
        startupStep: 'Verify equations/notes and stage tomorrow’s first step.',
        trackId: 'writing',
      },
    ],
    fluidCategories: {
      CAT1_MUSIC: {
        label: '1. Acoustic / Instrument Play',
        activeTitle: 'Acoustic / Instrument Play',
        subtitle: 'Fluid 5m cold song session (zero DAW or drills).',
        startupStep: 'Pick up instrument and play 1 familiar song cold',
      },
      CAT4_COMFORT: {
        label: '4. Off-Monitor Comfort Show',
        activeTitle: "It's Always Sunny in Philadelphia",
        subtitle: 'Low-friction episode start away from the work monitor.',
        startupStep: 'Start first 5m of episode away from work desk',
      },
    },
    stickyCategories: {
      CAT2_MAKER: {
        activeTitle: 'K1C 3D Printer / Hardware Bench',
        startupStep: 'Complete 1 single 5m diagnostic or mechanical build step',
        queuedNextTitle: 'Enclosure Bracket Print',
      },
      '3A_FICTION': {
        activeTitle: 'Soul Music (Audiobook / Fiction)',
        startupStep: 'Listen or read 5m with eyes closed',
        queuedNextTitle: 'Next Fiction Queue Item',
      },
      '3B_NONFICTION': {
        activeTitle: 'The American Way of Killing (Nonfiction)',
        startupStep: 'Listen or read 5m away from desk',
        queuedNextTitle: 'Thinking in Systems',
      },
      '3C_VIDEO': {
        activeTitle: "Widow's Bay (Series Queue)",
        startupStep: 'Watch first 5m away from work monitor',
        queuedNextTitle: 'Next Series Item',
      },
      CAT5_GAMING: {
        activeTitle: "Baldur's Gate 3",
        startupStep: 'Boot save + complete 1 single 5m micro-objective',
        queuedNextTitle: 'Factorio',
      },
    },
    tracks: [
      {
        id: 'science',
        name: 'Core Track 1: Domain & Research',
        archetypeRole: 'Domain Specialist',
        isSandbox: false,
        rungs: [
          'Rung 1 — Core Intake & Recall',
          'Rung 2 — Concept & Mechanism Synthesis',
          'Rung 3 — Structured Deliverable Assembly',
          'Rung 4 — Final Verification & Delivery',
        ],
      },
      {
        id: 'writing',
        name: 'Core Track 2: Writing & Synthesis',
        archetypeRole: 'Author / Communicator',
        isSandbox: false,
        rungs: [
          'Rung 1 — Source & Media Intake',
          'Rung 2 — Structural Outlining',
          'Rung 3 — Locked Draft Sprints',
          'Rung 4 — Final Polish & Publication',
        ],
      },
      {
        id: 'personal',
        name: 'Core Track 3: Personal & Home Systems',
        archetypeRole: 'Home / Logistics',
        isSandbox: false,
        rungs: [
          'Rung 1 — Logistics & Maintenance Audit',
          'Rung 2 — Schedule & Resource Staging',
          'Rung 3 — Physical Execution Blocks',
          'Rung 4 — Closed-Loop Preventive Sign-Off',
        ],
      },
      {
        id: 'coding',
        name: 'Sandbox Track 4: Maker & Hardware',
        archetypeRole: 'Coder / Maker',
        isSandbox: true,
        rungs: [
          'Rung 1 — Docs & Schematic Reference',
          'Rung 2 — 5m Bench Diagnostic Checks',
          'Rung 3 — Prototype Build & Iteration',
          'Rung 4 — Deployed Utility / Print',
        ],
      },
      {
        id: 'music',
        name: 'Sandbox Track 5: Music & Expression',
        archetypeRole: 'Musician',
        isSandbox: true,
        rungs: [
          'Rung 1 — Active Listening & Chart Intake',
          'Rung 2 — 5m Cold Song Playthroughs',
          'Rung 3 — Full Song Memory Lock',
          'Rung 4 — One-Take Acoustic Capture',
        ],
      },
    ],
  };
}

function makeStickySlot(
  key: StickyKey,
  label: string,
  activeTitle: string,
  startupStep: string,
  backlogQueue: string[]
): StickySlotState {
  return {
    key,
    label,
    activeTitle,
    startupStep,
    backlogQueue,
    queuedNextTitle: backlogQueue[0] || '',
    fiveMinStarts: 0,
    startsLogged: 0,
    unlockedViaCheckIn: false,
    archivedTitles: [],
  };
}

export function buildStateForPreset(
  presetId: ProfilePresetId,
  options?: {
    logicalDayRolloverHour?: number;
    earlyEveningShutdownTime?: string;
    customDraft?: CustomArchitectureDraft;
  }
): SymmetryState {
  const rolloverHour = options?.logicalDayRolloverHour ?? 4;
  const shutdownTime = options?.earlyEveningShutdownTime ?? '6:00 PM';
  const logicalDay = getLogicalDayKey(new Date(), rolloverHour);

  // PRESET 1: Avery Default (Medical Physics, Writing & Maker)
  if (presetId === 'AVERY_DEFAULT') {
    const base: SymmetryState = JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE));
    return {
      ...base,
      profilePresetId: 'AVERY_DEFAULT',
      profileName: 'Avery Default (Medical Physics, Writing & Maker)',
      logicalDayRolloverHour: rolloverHour,
      earlyEveningShutdownTime: shutdownTime,
      logicalDayKey: logicalDay,
      taskWeights: { ...DEFAULT_TASK_WEIGHTS },
      breakOptions: { ...DEFAULT_BREAK_OPTIONS },
      pipelineDays: base.pipelineDays.map((d) =>
        d.fixedEvent === 'EVENING_OUTING_6PM'
          ? { ...d, fixedEventTimeLabel: `${shutdownTime} Evening Outing` }
          : d
      ),
      recharge: {
        ...base.recharge,
        fluidCategories: { ...DEFAULT_FLUID_CATEGORIES },
      },
      roadmapTracks: base.roadmapTracks.map((t) => ({
        ...t,
        archetypeRole:
          t.id === 'science'
            ? 'Scientist'
            : t.id === 'writing'
            ? 'Author'
            : t.id === 'personal'
            ? 'Partner'
            : t.id === 'coding'
            ? 'Coder-Maker'
            : 'Musician',
      })),
    };
  }

  // PRESET 2: Academic & Grad Researcher (7-Block Floor)
  if (presetId === 'ACADEMIC_RESEARCHER') {
    const base: SymmetryState = JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE));
    const baselineBlocks: BaselineBlock[] = [
      {
        id: 'fc_anat_1',
        title: 'Spaced Repetition: Core Seminar Deck — Block 1/4',
        category: 'FLASHCARDS_ANATOMY',
        completed: false,
        bankedViaEarlyClearance: false,
        startupStep: 'Open core concept deck and clear first 15 due cards.',
        trackId: 'science',
      },
      {
        id: 'fc_comp_1',
        title: 'Spaced Repetition: Methods & Equations — Block 2/4',
        category: 'FLASHCARDS_COMP',
        completed: false,
        bankedViaEarlyClearance: false,
        startupStep: 'Review 20 methodology & equation recall cards.',
        trackId: 'science',
      },
      {
        id: 'fc_comp_2',
        title: 'Spaced Repetition: Field Literature Deck — Block 3/4',
        category: 'FLASHCARDS_COMP',
        completed: false,
        bankedViaEarlyClearance: false,
        startupStep: 'Clear 20 key-citation and mechanism cards without pausing.',
        trackId: 'science',
      },
      {
        id: 'fc_comp_3',
        title: 'Spaced Repetition: Comprehensive Queue — Block 4/4',
        category: 'FLASHCARDS_COMP',
        completed: false,
        bankedViaEarlyClearance: false,
        startupStep: 'Clear remaining due cards or toggle Early Clearance to bank.',
        trackId: 'science',
      },
      {
        id: 'hc_read_1',
        title: 'Literature Review & Primary Source Reading — Block 1/2',
        category: 'READING',
        completed: false,
        startupStep: 'Open assigned journal article, read abstract + Figure 1.',
        trackId: 'science',
      },
      {
        id: 'hc_read_2',
        title: 'Literature Review & Equations Derivation — Block 2/2',
        category: 'READING',
        completed: false,
        startupStep: 'Trace 2 key equations or experimental protocol steps on paper.',
        trackId: 'science',
      },
      {
        id: 'hc_synth_1',
        title: 'Data / Equations Synthesis — Block 1/1',
        category: 'SYNTHESIS',
        completed: false,
        startupStep: 'Condense today’s literature & data into 5 lab-notebook bullets.',
        trackId: 'writing',
      },
    ];

    const projectQueue: ProjectItem[] = [
      {
        id: 'proj_1',
        slot: 1,
        title: 'Primary Journal Manuscript & Figures (8-Block Paper)',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'science',
        startupStep: 'Open manuscript tex/doc + draft 3 lines in Results section.',
        nextStepNote: 'Unlocked Focus #1 — 100% of discretionary blocks routed here.',
      },
      {
        id: 'proj_2',
        slot: 2,
        title: 'Department Seminar & Lab Presentation (4-Block Deck)',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'writing',
        startupStep: 'Insert primary data plots into slides 2 and 3.',
        nextStepNote: 'Locked until Item #1 completes.',
      },
      {
        id: 'proj_3',
        slot: 3,
        title: 'Grant Specific Aims & Fellowship Draft',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'science',
        startupStep: 'Outline Aims 1 and 2 hypothesis statements.',
        nextStepNote: 'Locked until Item #1 and Item #2 complete.',
      },
    ];

    const roadmapTracks: RoadmapTrack[] = [
      {
        id: 'science',
        name: 'Research',
        archetypeRole: 'Research',
        categoryLabel: 'CORE TRACK',
        isSandbox: false,
        activeThisWeek: true,
        inputBlocksCredited: 12,
        inputWeeklyTarget: 24,
        outputBlocksCredited: 6,
        outputWeeklyTarget: 12,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Literature & Spaced Repetition',
            description: 'Primary papers, preprints, and spaced repetition decks',
            ledgerType: 'INPUT',
            completedBlocks: 8,
            targetBlocks: 16,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — Data & Equations Synthesis',
            description: 'Model derivations, statistical checks, and lab notes',
            ledgerType: 'INPUT',
            completedBlocks: 4,
            targetBlocks: 8,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Manuscript & Figure Sprints',
            description: '8-block Paper and 4-block Presentation assembly',
            ledgerType: 'OUTPUT',
            completedBlocks: 4,
            targetBlocks: 8,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Peer Review & Submission',
            description: 'Submitted papers, preprints, and conference talks',
            ledgerType: 'OUTPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
        ],
      },
      {
        id: 'writing',
        name: 'Teaching',
        archetypeRole: 'Teaching',
        categoryLabel: 'CORE TRACK',
        isSandbox: false,
        activeThisWeek: true,
        inputBlocksCredited: 6,
        inputWeeklyTarget: 10,
        outputBlocksCredited: 5,
        outputWeeklyTarget: 10,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Curriculum & Monograph Intake',
            description: 'Course texts, pedagogy references, and nonfiction audio',
            ledgerType: 'INPUT',
            completedBlocks: 4,
            targetBlocks: 6,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — Lecture & Problem Set Design',
            description: 'Worked example derivations and seminar outlines',
            ledgerType: 'INPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Slide Deck & Handout Build',
            description: '4-block presentation decks and grading rubrics',
            ledgerType: 'OUTPUT',
            completedBlocks: 3,
            targetBlocks: 6,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Delivered Seminar & Course Archive',
            description: 'Completed lectures, workshops, and mentoring notes',
            ledgerType: 'OUTPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
        ],
      },
      {
        id: 'personal',
        name: 'Personal',
        archetypeRole: 'Personal',
        categoryLabel: 'CORE TRACK',
        isSandbox: false,
        activeThisWeek: true,
        inputBlocksCredited: 3,
        inputWeeklyTarget: 6,
        outputBlocksCredited: 3,
        outputWeeklyTarget: 6,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Logistics & Home Checklist',
            description: 'Weekly supply, meal, and equipment audit',
            ledgerType: 'INPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — 7-Day Schedule Calibration',
            description: 'Lab shifts and evening shutdown anchor planning',
            ledgerType: 'INPUT',
            completedBlocks: 1,
            targetBlocks: 2,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Home & Admin Execution',
            description: 'Dedicated 20m maintenance & admin blocks',
            ledgerType: 'OUTPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Preventive Systems Sign-Off',
            description: 'Monthly closed-loop home & finance check',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 2,
          },
        ],
      },
      {
        id: 'coding',
        name: 'Coding',
        archetypeRole: 'Coding',
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
            label: 'Rung 1 — Library & Pipeline Docs',
            description: 'Python/R/Julia package & hardware reference reading',
            ledgerType: 'INPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — 5m Script & Bench Diagnostics',
            description: 'Quick data-cleaning or lab instrumentation checks',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 4,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Reproducible Analysis Scripts',
            description: 'Automated plotting and simulation notebooks',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 4,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Published Repo / Lab Utility',
            description: 'Tagged open-source analysis tool or bench rig',
            ledgerType: 'OUTPUT',
            completedBlocks: 0,
            targetBlocks: 2,
          },
        ],
      },
      {
        id: 'music',
        name: 'Music',
        archetypeRole: 'Music',
        categoryLabel: 'ZERO-QUOTA SANDBOX',
        isSandbox: true,
        activeThisWeek: false,
        inputBlocksCredited: 1,
        inputWeeklyTarget: 0,
        outputBlocksCredited: 2,
        outputWeeklyTarget: 0,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Active Listening & Score Intake',
            description: 'Repertoire listening and arrangement review',
            ledgerType: 'INPUT',
            completedBlocks: 1,
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
            label: 'Rung 3 — Full Piece Memory Lock',
            description: 'Unassisted full-track play from start to finish',
            ledgerType: 'OUTPUT',
            completedBlocks: 0,
            targetBlocks: 2,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Acoustic One-Take Capture',
            description: 'Simple acoustic recording archive',
            ledgerType: 'OUTPUT',
            completedBlocks: 0,
            targetBlocks: 2,
          },
        ],
      },
    ];

    return {
      ...base,
      profilePresetId: 'ACADEMIC_RESEARCHER',
      profileName: 'Academic & Grad Researcher',
      logicalDayRolloverHour: rolloverHour,
      earlyEveningShutdownTime: shutdownTime,
      logicalDayKey: logicalDay,
      upcomingMilestones: ['Qualifying Exam / Defense', 'Manuscript Submission Deadline'],
      taskWeights: {
        heavyLabel: 'Paper',
        heavyBlocks: 8,
        mediumLabel: 'Presentation',
        mediumBlocks: 4,
      },
      breakOptions: {
        l1Label: 'Stand, window distance gaze, drink water',
        l2EspressoLabel: 'Espresso / Pour-Over',
        l2MusicLabel: '5m Cold Song (Instrument)',
        l2PhysicalLabel: '15m Mobility / TENS Reset',
        stressBreathingLabel: '4-7-8 Breathing Pace',
        stressEspressoLabel: 'Espresso / Warm Tea',
        stressBootsLabel: 'Compression Boots / Walk',
      },
      todayBlockLog: [],
      discretionaryBlocksCompletedToday: 0,
      flashcardsReviewedCount: 0,
      earlyClearanceEnabled: false,
      baselineBlocks,
      projectQueue,
      pipelineDays: base.pipelineDays.map((d, idx) => ({
        ...d,
        completedBlocks: idx === 0 ? 0 : d.completedBlocks,
        fixedEventTimeLabel:
          d.fixedEvent === 'EVENING_OUTING_6PM'
            ? `${shutdownTime} Evening Outing`
            : d.fixedEventTimeLabel,
      })),
      timer: {
        ...base.timer,
        isRunning: false,
        targetEndTimeMs: null,
        secondsLeft: 300,
        workStage: 'IGNITION_5M',
        activeBlockSourceId: baselineBlocks[0].id,
        activeTaskTitle: baselineBlocks[0].title,
        activeTaskType: 'FLASHCARDS',
        activeStartupPrompt: baselineBlocks[0].startupStep,
        chainedBlocksCount: 0,
      },
      recharge: {
        ...base.recharge,
        fluidCategories: {
          CAT1_MUSIC: {
            label: '1. Acoustic Instrument Play',
            activeTitle: 'Acoustic Instrument Play',
            subtitle: 'Guitar / Piano / Strings — fluid musical expression.',
            startupStep: 'Play 1 familiar song cold — zero DAW or drills',
          },
          CAT4_COMFORT: {
            label: '4. Classic Sitcom / Taskmaster',
            activeTitle: 'Taskmaster / Classic Sitcom',
            subtitle: 'Low-friction comfort episode away from the research desk.',
            startupStep: 'First 5m of episode away from work monitor',
          },
        },
        stickySlots: {
          CAT2_MAKER: makeStickySlot(
            'CAT2_MAKER',
            'Maker / Lab Bench [Sticky]',
            'Raspberry Pi / 3D Printer Lab Rig',
            '1 single 5m diagnostic or mechanical step',
            ['Sensor Calibration Mount', 'Custom Cable Routing Bracket']
          ),
          '3A_FICTION': makeStickySlot(
            '3A_FICTION',
            '3A Fiction [Sticky]',
            'The Three-Body Problem',
            'Listen 5m at 1.75x–2.25x with eyes closed',
            ['Project Hail Mary', 'Soul Music', ' Anathem']
          ),
          '3B_NONFICTION': makeStickySlot(
            '3B_NONFICTION',
            '3B Nonfiction [Sticky]',
            'The Structure of Scientific Revolutions',
            'Listen or read 5m in recliner',
            ['Thinking in Systems', 'The Making of the Atomic Bomb']
          ),
          '3C_VIDEO': makeStickySlot(
            '3C_VIDEO',
            '3C Video [Sticky]',
            'NOVA / Severance',
            'Watch first 5m away from work monitor',
            ['Andor', ' Chernobyl']
          ),
          CAT5_GAMING: makeStickySlot(
            'CAT5_GAMING',
            'Gaming [Sticky]',
            "Baldur's Gate 3 / Civilization VI",
            'Boot save + 1 single 5m tactical objective',
            ['Factorio', 'Outer Wilds', 'Into the Breach']
          ),
        },
      },
      roadmapTracks,
    };
  }

  // PRESET 3: Software Engineer & Indie Builder (6-Block Floor)
  if (presetId === 'SOFTWARE_ENGINEER') {
    const base: SymmetryState = JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE));
    const baselineBlocks: BaselineBlock[] = [
      {
        id: 'se_triage_1',
        title: 'Code Review & PR Triage — Block 1/2',
        category: 'FLASHCARDS_ANATOMY',
        completed: false,
        bankedViaEarlyClearance: false,
        startupStep: 'Open top PR diff and write first constructive inline comment.',
        trackId: 'science',
      },
      {
        id: 'se_triage_2',
        title: 'Issue Triage & Bug Repro — Block 2/2',
        category: 'FLASHCARDS_COMP',
        completed: false,
        bankedViaEarlyClearance: false,
        startupStep: 'Reproduce top issue in local dev or bank via Early Clearance.',
        trackId: 'science',
      },
      {
        id: 'se_arch_1',
        title: 'Core Architecture & Data Model — Block 1/2',
        category: 'READING',
        completed: false,
        startupStep: 'Open core module and trace state machine / type definitions.',
        trackId: 'science',
      },
      {
        id: 'se_arch_2',
        title: 'Core Architecture Implementation — Block 2/2',
        category: 'READING',
        completed: false,
        startupStep: 'Implement primary pure function and verify TypeScript compilation.',
        trackId: 'science',
      },
      {
        id: 'se_docs_1',
        title: 'Docs / Automated Testing — Block 1/2',
        category: 'SYNTHESIS',
        completed: false,
        startupStep: 'Write 1 deterministic unit/integration assertion and run suite.',
        trackId: 'writing',
      },
      {
        id: 'se_docs_2',
        title: 'Docs / Architecture Decision Record — Block 2/2',
        category: 'SYNTHESIS',
        completed: false,
        startupStep: 'Update README / ADR with 5 concise bullet points on edge cases.',
        trackId: 'writing',
      },
    ];

    const projectQueue: ProjectItem[] = [
      {
        id: 'proj_1',
        slot: 1,
        title: 'Core Sync Engine & Production Release (8-Block System Build)',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'science',
        startupStep: 'Open primary module + write first test case or interface.',
        nextStepNote: 'Unlocked Focus #1 — 100% of discretionary blocks locked here.',
      },
      {
        id: 'proj_2',
        slot: 2,
        title: 'v2 API Architecture RFC (4-Block Feature Spec)',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'writing',
        startupStep: 'Draft request/response schema block in RFC doc.',
        nextStepNote: 'Locked until Item #1 completes.',
      },
      {
        id: 'proj_3',
        slot: 3,
        title: 'Offline PWA Performance & Bundle Audit',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'science',
        startupStep: 'Run production build profiler and record top 3 bundle chunks.',
        nextStepNote: 'Locked until Item #1 and Item #2 complete.',
      },
    ];

    const roadmapTracks: RoadmapTrack[] = [
      {
        id: 'science',
        name: 'Engineering',
        archetypeRole: 'Engineering',
        categoryLabel: 'CORE TRACK',
        isSandbox: false,
        activeThisWeek: true,
        inputBlocksCredited: 10,
        inputWeeklyTarget: 20,
        outputBlocksCredited: 8,
        outputWeeklyTarget: 16,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Code Review & Issue Triage',
            description: 'PR reviews, bug reproduction, and dependency audits',
            ledgerType: 'INPUT',
            completedBlocks: 6,
            targetBlocks: 12,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — Core Architecture & Specs',
            description: 'Type systems, state machine design, and benchmarks',
            ledgerType: 'INPUT',
            completedBlocks: 4,
            targetBlocks: 8,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — System Build & Feature Sprints',
            description: '8-block System Builds and 4-block Feature Specs',
            ledgerType: 'OUTPUT',
            completedBlocks: 6,
            targetBlocks: 12,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Shipped Production Releases',
            description: 'Merged PRs, green CI pipelines, and tagged deployments',
            ledgerType: 'OUTPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
        ],
      },
      {
        id: 'writing',
        name: 'Writing',
        archetypeRole: 'Writing',
        categoryLabel: 'CORE TRACK',
        isSandbox: false,
        activeThisWeek: true,
        inputBlocksCredited: 6,
        inputWeeklyTarget: 10,
        outputBlocksCredited: 4,
        outputWeeklyTarget: 8,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Technical Books & RFC Intake',
            description: 'Systems engineering books and architecture papers',
            ledgerType: 'INPUT',
            completedBlocks: 4,
            targetBlocks: 6,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — ADR & Design Notes',
            description: 'Architecture decision records and API documentation',
            ledgerType: 'INPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Feature Specs & Technical Posts',
            description: '4-block Feature Specs and engineering deep-dives',
            ledgerType: 'OUTPUT',
            completedBlocks: 3,
            targetBlocks: 6,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Published Docs & Release Guides',
            description: 'Shipped documentation portals and postmortems',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 2,
          },
        ],
      },
      {
        id: 'personal',
        name: 'Home',
        archetypeRole: 'Home',
        categoryLabel: 'CORE TRACK',
        isSandbox: false,
        activeThisWeek: true,
        inputBlocksCredited: 3,
        inputWeeklyTarget: 6,
        outputBlocksCredited: 3,
        outputWeeklyTarget: 6,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Home & Ergonomics Audit',
            description: 'Workstation, supply, and home maintenance checklist',
            ledgerType: 'INPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — Weekly Sprint & Outing Staging',
            description: '7-day load mode balance and fixed anchor scheduling',
            ledgerType: 'INPUT',
            completedBlocks: 1,
            targetBlocks: 2,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Physical Home Execution',
            description: 'Dedicated 20m organization and maintenance blocks',
            ledgerType: 'OUTPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Preventive Systems Sign-Off',
            description: 'Closed-loop monthly home & backup verification',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 2,
          },
        ],
      },
      {
        id: 'coding',
        name: 'Hardware',
        archetypeRole: 'Hardware',
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
            label: 'Rung 1 — Datasheets & CAD Reference',
            description: 'ESP32, K1C 3D printer, and PCB schematic reading',
            ledgerType: 'INPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — 5m Bench & Firmware Checks',
            description: 'Quick multimeter, soldering, or print bed steps',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 4,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Enclosure & Microcontroller Build',
            description: 'Iterative hardware and homelab builds',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 4,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Finished Hardware Utility',
            description: 'Deployed sensor node or custom hardware build',
            ledgerType: 'OUTPUT',
            completedBlocks: 0,
            targetBlocks: 2,
          },
        ],
      },
      {
        id: 'music',
        name: 'Creative',
        archetypeRole: 'Creative',
        categoryLabel: 'ZERO-QUOTA SANDBOX',
        isSandbox: true,
        activeThisWeek: false,
        inputBlocksCredited: 1,
        inputWeeklyTarget: 0,
        outputBlocksCredited: 2,
        outputWeeklyTarget: 0,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Active Listening & Sound Design',
            description: 'Album listening and arrangement study',
            ledgerType: 'INPUT',
            completedBlocks: 1,
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
            label: 'Rung 3 — Full Arrangement Memory Lock',
            description: 'Unassisted full-song play from start to finish',
            ledgerType: 'OUTPUT',
            completedBlocks: 0,
            targetBlocks: 2,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Live One-Take Recording',
            description: 'Captured acoustic or hardware jam session',
            ledgerType: 'OUTPUT',
            completedBlocks: 0,
            targetBlocks: 2,
          },
        ],
      },
    ];

    return {
      ...base,
      profilePresetId: 'SOFTWARE_ENGINEER',
      profileName: 'Software Engineer & Indie Builder',
      logicalDayRolloverHour: rolloverHour,
      earlyEveningShutdownTime: shutdownTime,
      logicalDayKey: logicalDay,
      upcomingMilestones: ['v1.0 Production Launch', 'System Architecture Freeze'],
      taskWeights: {
        heavyLabel: 'System Build',
        heavyBlocks: 8,
        mediumLabel: 'Feature Spec',
        mediumBlocks: 4,
      },
      breakOptions: {
        l1Label: 'Stand, 20-ft window gaze, hydrate',
        l2EspressoLabel: 'Espresso / Matcha',
        l2MusicLabel: '5m Cold Song (Bass/Guitar)',
        l2PhysicalLabel: '15m Wrist & Thoracic Mobility',
        stressBreathingLabel: '4-7-8 Breathing Pace',
        stressEspressoLabel: 'Espresso / Pour-Over',
        stressBootsLabel: 'Compression Boots / Outdoor Walk',
      },
      todayBlockLog: [],
      discretionaryBlocksCompletedToday: 0,
      flashcardsReviewedCount: 0,
      earlyClearanceEnabled: false,
      baselineBlocks,
      projectQueue,
      pipelineDays: base.pipelineDays.map((d, idx) => ({
        ...d,
        completedBlocks: idx === 0 ? 0 : d.completedBlocks,
        fixedEventTimeLabel:
          d.fixedEvent === 'EVENING_OUTING_6PM'
            ? `${shutdownTime} Evening Outing`
            : d.fixedEventTimeLabel,
      })),
      timer: {
        ...base.timer,
        isRunning: false,
        targetEndTimeMs: null,
        secondsLeft: 300,
        workStage: 'IGNITION_5M',
        activeBlockSourceId: baselineBlocks[0].id,
        activeTaskTitle: baselineBlocks[0].title,
        activeTaskType: 'FLASHCARDS',
        activeStartupPrompt: baselineBlocks[0].startupStep,
        chainedBlocksCount: 0,
      },
      recharge: {
        ...base.recharge,
        fluidCategories: {
          CAT1_MUSIC: {
            label: '1. Guitar / Synth Cold Playthrough',
            activeTitle: 'Guitar / Synth Cold Playthrough',
            subtitle: 'Play 1 familiar song cold — zero DAW menus or drills.',
            startupStep: 'Pick up bass/guitar and play 1 song cold',
          },
          CAT4_COMFORT: {
            label: "4. Silicon Valley / It's Always Sunny",
            activeTitle: "Silicon Valley / It's Always Sunny",
            subtitle: 'Off-monitor comfort episode away from coding setup.',
            startupStep: 'First 5m of episode away from work monitor',
          },
        },
        stickySlots: {
          CAT2_MAKER: makeStickySlot(
            'CAT2_MAKER',
            'Maker / Hardware [Sticky]',
            'ESP32 Sensor Node & K1C Printer',
            '1 single 5m diagnostic, CAD, or print step',
            ['Custom Split Keyboard Case', 'Home Server Rack Mount']
          ),
          '3A_FICTION': makeStickySlot(
            '3A_FICTION',
            '3A Fiction [Sticky]',
            'Project Hail Mary / Neuromancer',
            'Listen 5m at 1.75x–2.25x away from screen',
            ['Snow Crash', 'Exhalation', 'Soul Music']
          ),
          '3B_NONFICTION': makeStickySlot(
            '3B_NONFICTION',
            '3B Nonfiction [Sticky]',
            'Designing Data-Intensive Applications',
            'Read or listen 5m in recliner',
            ['A Philosophy of Software Design', 'Thinking in Systems']
          ),
          '3C_VIDEO': makeStickySlot(
            '3C_VIDEO',
            '3C Video [Sticky]',
            'Halt and Catch Fire / Severance',
            'Watch first 5m away from work monitor',
            ['Mr. Robot', 'Andor']
          ),
          CAT5_GAMING: makeStickySlot(
            'CAT5_GAMING',
            'Gaming [Sticky]',
            "Factorio / Baldur's Gate 3",
            'Boot save + 1 single 5m logistics or quest objective',
            ['Dyson Sphere Program', 'Hades II', 'RimWorld']
          ),
        },
      },
      roadmapTracks,
    };
  }

  // PRESET 4: Writer & Polymath Creative (6-Block Floor)
  if (presetId === 'WRITER_CREATIVE') {
    const base: SymmetryState = JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE));
    const baselineBlocks: BaselineBlock[] = [
      {
        id: 'wr_read_1',
        title: 'Close Reading & Marginalia — Block 1/2',
        category: 'FLASHCARDS_ANATOMY',
        completed: false,
        bankedViaEarlyClearance: false,
        startupStep: 'Open primary text with pen in hand and annotate first 2 pages.',
        trackId: 'science',
      },
      {
        id: 'wr_read_2',
        title: 'Close Reading & Passage Extraction — Block 2/2',
        category: 'FLASHCARDS_COMP',
        completed: false,
        bankedViaEarlyClearance: false,
        startupStep: 'Copy 3 key passages into commonplace log or toggle Early Clearance.',
        trackId: 'science',
      },
      {
        id: 'wr_synth_1',
        title: 'Note Synthesis & Slip-Box — Block 1/2',
        category: 'READING',
        completed: false,
        startupStep: 'Distill 3 raw reading notes into linked index cards.',
        trackId: 'science',
      },
      {
        id: 'wr_synth_2',
        title: 'Note Synthesis & Structural Outline — Block 2/2',
        category: 'READING',
        completed: false,
        startupStep: 'Sequence 5 narrative or argumentative beats for today’s draft.',
        trackId: 'writing',
      },
      {
        id: 'wr_draft_1',
        title: 'Draft Sprint (Zero-Edit Prose) — Block 1/2',
        category: 'SYNTHESIS',
        completed: false,
        startupStep: 'Open clean manuscript window and write first 4 sentences without backspacing.',
        trackId: 'writing',
      },
      {
        id: 'wr_draft_2',
        title: 'Draft Sprint & Cadence Polish — Block 2/2',
        category: 'SYNTHESIS',
        completed: false,
        startupStep: 'Read last paragraph aloud and complete the current scene/section.',
        trackId: 'writing',
      },
    ];

    const projectQueue: ProjectItem[] = [
      {
        id: 'proj_1',
        slot: 1,
        title: 'Book Chapter 4: Full Draft Sprint (8-Block Chapter/Book)',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'writing',
        startupStep: 'Open Chapter 4 draft file and write 3 transition sentences.',
        nextStepNote: 'Unlocked Focus #1 — 100% of discretionary blocks locked here.',
      },
      {
        id: 'proj_2',
        slot: 2,
        title: 'Longform Critical Essay (4-Block Essay)',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'writing',
        startupStep: 'Draft opening hook paragraph and thesis line.',
        nextStepNote: 'Locked until Item #1 completes.',
      },
      {
        id: 'proj_3',
        slot: 3,
        title: 'Archival Source Synthesis & Bibliography',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'science',
        startupStep: 'Annotate primary archive folder and log 5 citations.',
        nextStepNote: 'Locked until Item #1 and Item #2 complete.',
      },
    ];

    const roadmapTracks: RoadmapTrack[] = [
      {
        id: 'science',
        name: 'Literature',
        archetypeRole: 'Literature',
        categoryLabel: 'CORE TRACK',
        isSandbox: false,
        activeThisWeek: true,
        inputBlocksCredited: 12,
        inputWeeklyTarget: 18,
        outputBlocksCredited: 4,
        outputWeeklyTarget: 8,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Close Reading & Primary Texts',
            description: 'Deep reading, marginalia, and audiobook intake',
            ledgerType: 'INPUT',
            completedBlocks: 8,
            targetBlocks: 12,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — Note Synthesis & Commonplace Book',
            description: 'Slip-box index cards and thematic synthesis',
            ledgerType: 'INPUT',
            completedBlocks: 4,
            targetBlocks: 6,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Critical Commentary & Notes',
            description: 'Structured reading essays and literature syntheses',
            ledgerType: 'OUTPUT',
            completedBlocks: 3,
            targetBlocks: 6,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Completed Reading Canon Dossiers',
            description: 'Finished book dossiers and archival indices',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 2,
          },
        ],
      },
      {
        id: 'writing',
        name: 'Career',
        archetypeRole: 'Career',
        categoryLabel: 'CORE TRACK',
        isSandbox: false,
        activeThisWeek: true,
        inputBlocksCredited: 6,
        inputWeeklyTarget: 10,
        outputBlocksCredited: 8,
        outputWeeklyTarget: 14,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Research & Editorial Briefs',
            description: 'Source verification and structural outlining',
            ledgerType: 'INPUT',
            completedBlocks: 6,
            targetBlocks: 10,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — Daily Draft Sprints',
            description: 'Focused 20m prose generation blocks',
            ledgerType: 'OUTPUT',
            completedBlocks: 4,
            targetBlocks: 6,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Chapter (8b) & Essay (4b) Builds',
            description: 'Locked Focus #1 manuscript and essay sprints',
            ledgerType: 'OUTPUT',
            completedBlocks: 3,
            targetBlocks: 6,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Polished Submissions & Editions',
            description: 'Finalized chapters, essays, and published pieces',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 2,
          },
        ],
      },
      {
        id: 'personal',
        name: 'Community',
        archetypeRole: 'Community',
        categoryLabel: 'CORE TRACK',
        isSandbox: false,
        activeThisWeek: true,
        inputBlocksCredited: 3,
        inputWeeklyTarget: 6,
        outputBlocksCredited: 3,
        outputWeeklyTarget: 6,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Correspondence & Logistics Intake',
            description: 'Editorial correspondence, studio, and home checklist',
            ledgerType: 'INPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — Weekly Schedule & Outing Staging',
            description: '7-day pipeline and evening anchor planning',
            ledgerType: 'INPUT',
            completedBlocks: 1,
            targetBlocks: 2,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Studio & Community Execution',
            description: 'Dedicated 20m home, workshop, and admin blocks',
            ledgerType: 'OUTPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Closed-Loop Studio Sign-Off',
            description: 'Completed monthly studio & household review',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 2,
          },
        ],
      },
      {
        id: 'coding',
        name: 'Craft',
        archetypeRole: 'Craft',
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
            label: 'Rung 1 — Typography & Craft Reference',
            description: 'Bookbinding, printmaking, and layout study',
            ledgerType: 'INPUT',
            completedBlocks: 2,
            targetBlocks: 4,
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — 5m Tactile Bench Steps',
            description: '5m paper folding, typesetting, or 3D print checks',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 4,
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Physical Edition / Zine Build',
            description: 'Iterative tactile craft and layout prototypes',
            ledgerType: 'OUTPUT',
            completedBlocks: 1,
            targetBlocks: 4,
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Finished Artifact / Bound Copy',
            description: 'Completed physical print or studio artifact',
            ledgerType: 'OUTPUT',
            completedBlocks: 0,
            targetBlocks: 2,
          },
        ],
      },
      {
        id: 'music',
        name: 'Music',
        archetypeRole: 'Music',
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
            label: 'Rung 1 — Active Listening & Songbook Intake',
            description: 'Repertoire listening and chord chart review',
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
            label: 'Rung 4 — Live Acoustic One-Take',
            description: 'Simple acoustic playthrough archive',
            ledgerType: 'OUTPUT',
            completedBlocks: 0,
            targetBlocks: 2,
          },
        ],
      },
    ];

    return {
      ...base,
      profilePresetId: 'WRITER_CREATIVE',
      profileName: 'Writer & Polymath Creative',
      logicalDayRolloverHour: rolloverHour,
      earlyEveningShutdownTime: shutdownTime,
      logicalDayKey: logicalDay,
      upcomingMilestones: ['Book Manuscript Draft Lock', 'Quarterly Essay Feature'],
      taskWeights: {
        heavyLabel: 'Chapter/Book',
        heavyBlocks: 8,
        mediumLabel: 'Essay',
        mediumBlocks: 4,
      },
      breakOptions: {
        l1Label: 'Stand, window gaze, refill water/tea',
        l2EspressoLabel: 'Espresso / Pour-Over',
        l2MusicLabel: '5m Cold Song (Guitar/Piano)',
        l2PhysicalLabel: '15m Walk / Posture Reset',
        stressBreathingLabel: '4-7-8 Breathing Pace',
        stressEspressoLabel: 'Espresso / Herbal Tea',
        stressBootsLabel: 'Compression Boots / Recliner',
      },
      todayBlockLog: [],
      discretionaryBlocksCompletedToday: 0,
      flashcardsReviewedCount: 0,
      earlyClearanceEnabled: false,
      baselineBlocks,
      projectQueue,
      pipelineDays: base.pipelineDays.map((d, idx) => ({
        ...d,
        completedBlocks: idx === 0 ? 0 : d.completedBlocks,
        fixedEventTimeLabel:
          d.fixedEvent === 'EVENING_OUTING_6PM'
            ? `${shutdownTime} Evening Outing`
            : d.fixedEventTimeLabel,
      })),
      timer: {
        ...base.timer,
        isRunning: false,
        targetEndTimeMs: null,
        secondsLeft: 300,
        workStage: 'IGNITION_5M',
        activeBlockSourceId: baselineBlocks[0].id,
        activeTaskTitle: baselineBlocks[0].title,
        activeTaskType: 'FLASHCARDS',
        activeStartupPrompt: baselineBlocks[0].startupStep,
        chainedBlocksCount: 0,
      },
      recharge: {
        ...base.recharge,
        fluidCategories: {
          CAT1_MUSIC: {
            label: '1. Acoustic Songbook Playthrough',
            activeTitle: 'Acoustic Songbook Playthrough',
            subtitle: 'Piano / Guitar / Bass — fluid 5m song play (no drills).',
            startupStep: 'Play 1 familiar song cold — zero DAW or drills',
          },
          CAT4_COMFORT: {
            label: "4. Detectorists / It's Always Sunny",
            activeTitle: "Detectorists / It's Always Sunny",
            subtitle: 'Warm comfort episode away from the writing desk.',
            startupStep: 'First 5m of episode away from work monitor',
          },
        },
        stickySlots: {
          CAT2_MAKER: makeStickySlot(
            'CAT2_MAKER',
            'Maker / Craft [Sticky]',
            'Bookbinding & Letterpress / K1C Bench',
            '1 single 5m folding, stitching, or print step',
            ['Hand-Stitched Notebook Signature', 'Custom Desk Pen Tray Print']
          ),
          '3A_FICTION': makeStickySlot(
            '3A_FICTION',
            '3A Fiction [Sticky]',
            'Soul Music by Terry Pratchett',
            'Listen 5m at 1.75x–2.25x or read in armchair',
            ['Piranesi', 'Invisible Cities', 'Hogfather']
          ),
          '3B_NONFICTION': makeStickySlot(
            '3B_NONFICTION',
            '3B Nonfiction [Sticky]',
            'Several Short Sentences About Writing',
            'Read or listen 5m away from desk',
            ['The American Way of Killing', 'Draft No. 4']
          ),
          '3C_VIDEO': makeStickySlot(
            '3C_VIDEO',
            '3C Video [Sticky]',
            "Widow's Bay / Criterion Queue",
            'Watch first 5m away from work monitor',
            ['Paterson', 'Wings of Desire']
          ),
          CAT5_GAMING: makeStickySlot(
            'CAT5_GAMING',
            'Gaming [Sticky]',
            "Disco Elysium / Baldur's Gate 3",
            'Boot save + 1 single 5m narrative micro-objective',
            ['Pentiment', 'Outer Wilds', 'Chants of Sennaar']
          ),
        },
      },
      roadmapTracks,
    };
  }

  // PRESET 5: Blank Custom Architecture
  const draft = options?.customDraft ?? getDefaultCustomArchitectureDraft();
  const base: SymmetryState = JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE));
  const activeSlice = draft.baselineBlocks.slice(0, draft.floorCount);
  const customBaselineBlocks: BaselineBlock[] = activeSlice.map((item, idx) => ({
    id: `custom_floor_${idx + 1}`,
    title: item.title.trim() || `Baseline Floor Block ${idx + 1}/${draft.floorCount}`,
    category: item.category,
    completed: false,
    bankedViaEarlyClearance: false,
    startupStep:
      item.startupStep.trim() || 'Open task and complete 5m startup step.',
    trackId: item.trackId,
  }));

  const customProjects: ProjectItem[] = [
    {
      id: 'proj_1',
      slot: 1,
      title: draft.primaryProjectTitle.trim() || 'Primary Locked Deliverable #1',
      presetType: 'PAPER_8',
      completedBlocks: 0,
      totalBlocks: 8,
      trackId: 'science',
      startupStep:
        draft.primaryProjectStartup.trim() ||
        'Open primary deliverable and complete 5m startup step.',
      nextStepNote: 'Unlocked Focus #1 — 100% of discretionary blocks locked here.',
    },
    {
      id: 'proj_2',
      slot: 2,
      title: draft.secondaryProjectTitle.trim() || 'Secondary Queued Deliverable #2',
      presetType: 'SLIDES_4',
      completedBlocks: 0,
      totalBlocks: 4,
      trackId: 'writing',
      startupStep: 'Open draft and outline first 3 bullet points.',
      nextStepNote: 'Locked until Item #1 completes.',
    },
    {
      id: 'proj_3',
      slot: 3,
      title: draft.tertiaryProjectTitle.trim() || 'Tertiary Queued Deliverable #3',
      presetType: 'PAPER_8',
      completedBlocks: 0,
      totalBlocks: 8,
      trackId: 'science',
      startupStep: 'Open project file and complete 5m startup step.',
      nextStepNote: 'Locked until Item #1 and Item #2 complete.',
    },
  ];

  const customTracks: RoadmapTrack[] = draft.tracks.map((t) => ({
    id: t.id,
    name: t.name.trim() || t.id.toUpperCase(),
    archetypeRole: t.archetypeRole.trim() || t.name.trim(),
    categoryLabel: t.isSandbox ? 'ZERO-QUOTA SANDBOX' : 'CORE TRACK',
    isSandbox: t.isSandbox,
    activeThisWeek: !t.isSandbox,
    inputBlocksCredited: 0,
    inputWeeklyTarget: t.isSandbox ? 0 : 12,
    outputBlocksCredited: 0,
    outputWeeklyTarget: t.isSandbox ? 0 : 12,
    rungs: [
      {
        rungNumber: 1,
        label: t.rungs[0] || 'Rung 1 — Core Intake',
        description: 'Baseline Floor & Media Input blocks',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 8,
      },
      {
        rungNumber: 2,
        label: t.rungs[1] || 'Rung 2 — Synthesis & Preparation',
        description: 'Concept condensation & structural outlining',
        ledgerType: t.isSandbox ? 'OUTPUT' : 'INPUT',
        completedBlocks: 0,
        targetBlocks: 4,
      },
      {
        rungNumber: 3,
        label: t.rungs[2] || 'Rung 3 — Active Deliverable Sprints',
        description: 'Locked Focus #1 project blocks',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 8,
      },
      {
        rungNumber: 4,
        label: t.rungs[3] || 'Rung 4 — Completed & Shipped Output',
        description: 'Verified and archived deliverables',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
      },
    ],
  }));

  return {
    ...base,
    profilePresetId: 'BLANK_CUSTOM',
    profileName: draft.profileName.trim() || 'Blank Custom Architecture',
    logicalDayRolloverHour: rolloverHour,
    earlyEveningShutdownTime: shutdownTime,
    logicalDayKey: logicalDay,
    upcomingMilestones: draft.upcomingMilestones.filter((m) => m.trim().length > 0),
    taskWeights: {
      heavyLabel: draft.taskWeights.heavyLabel.trim() || 'Heavy Deliverable',
      heavyBlocks: 8,
      mediumLabel: draft.taskWeights.mediumLabel.trim() || 'Medium Deliverable',
      mediumBlocks: 4,
    },
    breakOptions: { ...draft.breakOptions },
    todayBlockLog: [],
    discretionaryBlocksCompletedToday: 0,
    flashcardsReviewedCount: 0,
    earlyClearanceEnabled: false,
    baselineBlocks: customBaselineBlocks,
    projectQueue: customProjects,
    pipelineDays: base.pipelineDays.map((d, idx) => ({
      ...d,
      completedBlocks: idx === 0 ? 0 : d.completedBlocks,
      fixedEventTimeLabel:
        d.fixedEvent === 'EVENING_OUTING_6PM'
          ? `${shutdownTime} Evening Outing`
          : d.fixedEventTimeLabel,
    })),
    timer: {
      ...base.timer,
      isRunning: false,
      targetEndTimeMs: null,
      secondsLeft: 300,
      workStage: 'IGNITION_5M',
      activeBlockSourceId: customBaselineBlocks[0].id,
      activeTaskTitle: customBaselineBlocks[0].title,
      activeTaskType: 'FLASHCARDS',
      activeStartupPrompt: customBaselineBlocks[0].startupStep,
      chainedBlocksCount: 0,
    },
    recharge: {
      ...base.recharge,
      fluidCategories: {
        CAT1_MUSIC: {
          label: `1. ${draft.fluidCategories.CAT1_MUSIC.activeTitle.trim() || 'Music [Fluid]'}`,
          activeTitle:
            draft.fluidCategories.CAT1_MUSIC.activeTitle.trim() || 'Music [Fluid]',
          subtitle: draft.fluidCategories.CAT1_MUSIC.subtitle,
          startupStep:
            draft.fluidCategories.CAT1_MUSIC.startupStep.trim() ||
            'Play 1 familiar song cold (no DAW or drills)',
        },
        CAT4_COMFORT: {
          label: `4. ${draft.fluidCategories.CAT4_COMFORT.activeTitle.trim() || 'Comfort Show [Fluid]'}`,
          activeTitle:
            draft.fluidCategories.CAT4_COMFORT.activeTitle.trim() ||
            'Comfort Show [Fluid]',
          subtitle: draft.fluidCategories.CAT4_COMFORT.subtitle,
          startupStep:
            draft.fluidCategories.CAT4_COMFORT.startupStep.trim() ||
            'Watch first 5m away from work monitor',
        },
      },
      stickySlots: {
        CAT2_MAKER: makeStickySlot(
          'CAT2_MAKER',
          'Maker / Hardware [Sticky]',
          draft.stickyCategories.CAT2_MAKER.activeTitle.trim() || 'Maker Project',
          draft.stickyCategories.CAT2_MAKER.startupStep.trim() ||
            '1 single 5m diagnostic or build step',
          [draft.stickyCategories.CAT2_MAKER.queuedNextTitle.trim() || 'Next Maker Build']
        ),
        '3A_FICTION': makeStickySlot(
          '3A_FICTION',
          '3A Fiction [Sticky]',
          draft.stickyCategories['3A_FICTION'].activeTitle.trim() || 'Active Fiction Title',
          draft.stickyCategories['3A_FICTION'].startupStep.trim() ||
            'Listen or read 5m at 1.75x–2.25x',
          [draft.stickyCategories['3A_FICTION'].queuedNextTitle.trim() || 'Next Fiction Title']
        ),
        '3B_NONFICTION': makeStickySlot(
          '3B_NONFICTION',
          '3B Nonfiction [Sticky]',
          draft.stickyCategories['3B_NONFICTION'].activeTitle.trim() ||
            'Active Nonfiction Title',
          draft.stickyCategories['3B_NONFICTION'].startupStep.trim() ||
            'Listen or read 5m away from desk',
          [
            draft.stickyCategories['3B_NONFICTION'].queuedNextTitle.trim() ||
              'Next Nonfiction Title',
          ]
        ),
        '3C_VIDEO': makeStickySlot(
          '3C_VIDEO',
          '3C Video [Sticky]',
          draft.stickyCategories['3C_VIDEO'].activeTitle.trim() || 'Active Series / Video',
          draft.stickyCategories['3C_VIDEO'].startupStep.trim() ||
            'Watch first 5m away from work monitor',
          [draft.stickyCategories['3C_VIDEO'].queuedNextTitle.trim() || 'Next Video Series']
        ),
        CAT5_GAMING: makeStickySlot(
          'CAT5_GAMING',
          'Gaming [Sticky]',
          draft.stickyCategories.CAT5_GAMING.activeTitle.trim() || 'Active Game Title',
          draft.stickyCategories.CAT5_GAMING.startupStep.trim() ||
            'Boot save + 1 single 5m micro-objective',
          [draft.stickyCategories.CAT5_GAMING.queuedNextTitle.trim() || 'Next Game Title']
        ),
      },
    },
    roadmapTracks: customTracks,
  };
}
