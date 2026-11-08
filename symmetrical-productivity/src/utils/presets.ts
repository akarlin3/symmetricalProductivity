import {
  BaselineBlock,
  BreakOptionsConfig,
  EveningCategoryCardConfig,
  FluidCategoriesMap,
  ProfilePresetId,
  ProjectItem,
  RoadmapTrack,
  RoadmapTrackId,
  StickyItemState,
  StickyKey,
  SymmetryState,
  TaskWeightsConfig,
} from '../types/symmetry';
import {
  DEFAULT_SYMMETRY_STATE,
  getEffectiveEveningCategoryCards,
  getTotalBaselineFloorBlocks,
} from '../state/defaultState';

export const ARCHITECT_UNLOCK_STORAGE_KEY = 'symmetry_architect_mode_unlocked_v1';
export const ONBOARDING_COMPLETED_STORAGE_KEY = 'symmetry_onboarding_completed_v1';
export const ONBOARDING_COMPLETED_KEY = ONBOARDING_COMPLETED_STORAGE_KEY;
export const CUSTOM_PRESETS_STORAGE_KEY = 'customPresets';

export interface ProfilePresetDefinition {
  id: ProfilePresetId;
  number?: number;
  title: string;
  shortTitle?: string;
  shortBadge: string;
  subtitle: string;
  description: string;
  isDefaultPersonal?: boolean;
  isCustomUserPreset?: boolean;
  createdAtIso?: string;
  floorCountLabel: string;
  cruiseCeilingBlocks: number;
  surgeCeilingBlocks?: number;
  taperCeilingBlocks?: number;
  taskWeights: TaskWeightsConfig;
  breakOptions: BreakOptionsConfig;
  upcomingMilestones: string[];
  baselineBlocks: BaselineBlock[];
  projectQueue: ProjectItem[];
  openListBacklog: Omit<ProjectItem, 'slot'>[];
  stickySlots: Record<StickyKey, StickyItemState>;
  fluidCategories: FluidCategoriesMap;
  categoryCards?: EveningCategoryCardConfig[];
  roadmapTracks: RoadmapTrack[];
  opensInlineEditOnLoad?: boolean;
}

export type UniversalPresetDefinition = ProfilePresetDefinition;

export function buildCategoryCardsFromLegacyMaps(
  fluidCategories: FluidCategoriesMap,
  stickySlots: Record<StickyKey, StickyItemState>,
  cat3Name: string = '3. Reading & Media [Triple-Track: Fiction / Nonfiction / Watch]',
  cat3Subtitle: string = 'Parallel sticky tracks across Fiction, Nonfiction, and Watch.'
): EveningCategoryCardConfig[] {
  const cat1 = fluidCategories.CAT1_MUSIC;
  const cat4 = fluidCategories.CAT4_COMFORT;
  const s2 = stickySlots.CAT2_MAKER;
  const s3a = stickySlots['3A_FICTION'];
  const s3b = stickySlots['3B_NONFICTION'];
  const s3c = stickySlots['3C_VIDEO'];
  const s5 = stickySlots.CAT5_GAMING;

  return [
    {
      id: 'CAT1_MUSIC',
      slotNumber: 1,
      categoryName: cat1.label.replace(/^1\.\s*/, '').replace(/\s*\[Fluid\]$/i, ''),
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
      categoryName: s2.label.replace(/^2\.\s*/, '').replace(/\s*\[Sticky\]$/i, ''),
      subtitle: 'Hands-on build, repair, or tactile project progression.',
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
      categoryName: cat3Name
        .replace(/^3\.\s*/, '')
        .replace(/\s*\[Triple-Track:.*?\]$/i, '')
        .replace(/\s*\[Sticky\]$/i, ''),
      subtitle: cat3Subtitle,
      behavior: 'STICKY',
      trackMode: 'TRIPLE',
      activeTitle: s3a.activeTitle,
      startupPrompt: s3a.startupStep,
      backlogQueue: [...(s3a.backlogQueue || [])],
      fiveMinStarts: s3a.fiveMinStarts || 0,
      unlockedViaCheckIn: Boolean(s3a.unlockedViaCheckIn),
      activeSubTrackId: '3A_FICTION',
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
      categoryName: cat4.label.replace(/^4\.\s*/, '').replace(/\s*\[Fluid\]$/i, ''),
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
      categoryName: s5.label.replace(/^5\.\s*/, '').replace(/\s*\[Sticky\]$/i, ''),
      subtitle: 'Focused interactive session with 20m/40m check-in pacing.',
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

const UNIVERSAL_TASK_WEIGHTS: TaskWeightsConfig = {
  heavyLabel: 'Major Deliverable',
  heavyBlocks: 8,
  mediumLabel: 'Medium Deliverable',
  mediumBlocks: 4,
  quickLabel: 'Quick Sprint',
  quickBlocks: 2,
};

const UNIVERSAL_BREAK_OPTIONS: BreakOptionsConfig = {
  l1Label: 'Step away / hydration / distance gaze (5m)',
  l2EspressoLabel: 'Beverage / Stretch Reset (10–15m)',
  l2MusicLabel: '5m Hands-On / Analog Reset',
  l2PhysicalLabel: '15m Walk or Physical Mobility Reset',
  stressBreathingLabel: '4-7-8 Breathing Visual Pace',
  stressEspressoLabel: 'Hydration & Posture Reset',
  stressBootsLabel: 'Physical Decompression / Quiet Rest',
};

const UNIVERSAL_FLUID_CATEGORIES: FluidCategoriesMap = {
  CAT1_MUSIC: {
    label: '1. Creative / Hands-On [Fluid]',
    activeTitle: 'Open Creative / Hands-On Session',
    subtitle: 'Unstructured creative expression or analog craft with zero performance grading.',
    startupStep: 'Set up tools/materials and spend 5m on one low-friction creative action.',
  },
  CAT4_COMFORT: {
    label: '4. Comfort Watch / Listen [Fluid]',
    activeTitle: 'Favorite Comfort Show, Podcast, or Album',
    subtitle: 'Low-friction familiar watch or listen away from the primary work setup.',
    startupStep: 'Start first 5m of a familiar episode or album away from your work screen.',
  },
};

const UNIVERSAL_STICKY_SLOTS: Record<StickyKey, StickyItemState> = {
  CAT2_MAKER: {
    key: 'CAT2_MAKER',
    label: '2. Practical / Tactile Project [Sticky]',
    activeTitle: 'Current Hands-On / Home / Craft Project',
    startupStep: 'Complete 1 single 5m setup, organizing, or build step.',
    backlogQueue: ['Next Tactile Build #1', 'Next Tactile Build #2'],
    queuedNextTitle: 'Next Tactile Build #1',
    fiveMinStarts: 0,
    startsLogged: 0,
    unlockedViaCheckIn: false,
    archivedTitles: [],
  },
  '3A_FICTION': {
    key: '3A_FICTION',
    label: '3A Fiction [Sticky]',
    activeTitle: 'Current Fiction Book / Audiobook',
    startupStep: 'Read or listen for 5m away from the desk.',
    backlogQueue: ['Queued Novel #1', 'Queued Novel #2'],
    queuedNextTitle: 'Queued Novel #1',
    fiveMinStarts: 0,
    startsLogged: 0,
    unlockedViaCheckIn: false,
    archivedTitles: [],
  },
  '3B_NONFICTION': {
    key: '3B_NONFICTION',
    label: '3B Nonfiction [Sticky]',
    activeTitle: 'Current Nonfiction Book / Long-Form Essay',
    startupStep: 'Read or listen to 5m of current chapter.',
    backlogQueue: ['Queued Nonfiction #1', 'Queued Nonfiction #2'],
    queuedNextTitle: 'Queued Nonfiction #1',
    fiveMinStarts: 0,
    startsLogged: 0,
    unlockedViaCheckIn: false,
    archivedTitles: [],
  },
  '3C_VIDEO': {
    key: '3C_VIDEO',
    label: '3C Watch [Sticky]',
    activeTitle: 'Current Series or Documentary',
    startupStep: 'Watch first 5m away from the work monitor.',
    backlogQueue: ['Queued Series #1', 'Queued Film / Doc #2'],
    queuedNextTitle: 'Queued Series #1',
    fiveMinStarts: 0,
    startsLogged: 0,
    unlockedViaCheckIn: false,
    archivedTitles: [],
  },
  CAT5_GAMING: {
    key: 'CAT5_GAMING',
    label: '5. Interactive / Games [Sticky]',
    activeTitle: 'Current Game / Puzzle / Interactive Title',
    startupStep: 'Launch session and clear 1 single 5m micro-objective.',
    backlogQueue: ['Queued Game #1', 'Queued Game #2'],
    queuedNextTitle: 'Queued Game #1',
    fiveMinStarts: 0,
    startsLogged: 0,
    unlockedViaCheckIn: false,
    archivedTitles: [],
  },
};

const UNIVERSAL_ROADMAP_TRACKS: RoadmapTrack[] = [
  {
    id: 'science',
    name: 'Core Track 1: Primary Career / Study',
    archetypeRole: 'Primary Career / Study',
    categoryLabel: 'CORE TRACK',
    isSandbox: false,
    activeThisWeek: true,
    inputBlocksCredited: 0,
    inputWeeklyTarget: 16,
    outputBlocksCredited: 0,
    outputWeeklyTarget: 14,
    rungs: [
      {
        rungNumber: 1,
        label: 'Rung 1 — Weekly Core Intake',
        description: 'Daily baseline learning, review, and reference blocks',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 10,
        milestones: ['Complete daily baseline skill blocks', 'Capture key reference notes'],
      },
      {
        rungNumber: 2,
        label: 'Rung 2 — Monthly Concept Synthesis',
        description: 'Problem solving, planning notes, and framework condensation',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 6,
        milestones: ['Synthesize core notes into working outlines'],
      },
      {
        rungNumber: 3,
        label: 'Rung 3 — Quarterly Primary Deliverable Execution',
        description: 'Locked Focus #1 project sprints toward major milestones',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 10,
        milestones: ['Complete Primary Focus #1 deliverable'],
      },
      {
        rungNumber: 4,
        label: 'Rung 4 — Long-Term Milestone Verification & Shipping',
        description: 'Final review, quality check, and completed delivery',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Ship and archive verified output'],
      },
    ],
  },
  {
    id: 'writing',
    name: 'Core Track 2: Personal Projects & Output',
    archetypeRole: 'Personal Projects & Output',
    categoryLabel: 'CORE TRACK',
    isSandbox: false,
    activeThisWeek: true,
    inputBlocksCredited: 0,
    inputWeeklyTarget: 10,
    outputBlocksCredited: 0,
    outputWeeklyTarget: 12,
    rungs: [
      {
        rungNumber: 1,
        label: 'Rung 1 — Source & Research Intake',
        description: 'Reading, source gathering, and domain exploration',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 6,
        milestones: ['Review source material and examples'],
      },
      {
        rungNumber: 2,
        label: 'Rung 2 — Architecture & Outlining',
        description: 'Scoping deliverables and drafting structural outlines',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Finalize project structure and 5m startup steps'],
      },
      {
        rungNumber: 3,
        label: 'Rung 3 — Focused Creation Sprints',
        description: 'Dedicated 20m build/draft blocks on active project',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 8,
        milestones: ['Execute core creation blocks'],
      },
      {
        rungNumber: 4,
        label: 'Rung 4 — Polish & Release',
        description: 'Refinement, packaging, and publishing',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Publish or finalize project milestone'],
      },
    ],
  },
  {
    id: 'personal',
    name: 'Core Track 3: Health, Home & Relationships',
    archetypeRole: 'Health, Home & Relationships',
    categoryLabel: 'CORE TRACK',
    isSandbox: false,
    activeThisWeek: true,
    inputBlocksCredited: 0,
    inputWeeklyTarget: 6,
    outputBlocksCredited: 0,
    outputWeeklyTarget: 6,
    rungs: [
      {
        rungNumber: 1,
        label: 'Rung 1 — Life Admin & Triage',
        description: 'Inbox, bills, scheduling, and household coordination',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Zero weekly administrative backlog'],
      },
      {
        rungNumber: 2,
        label: 'Rung 2 — Weekly Logistics & Planning',
        description: '7-day pipeline calibration and energy pacing',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 2,
        milestones: ['Calibrate 7-day load modes and anchors'],
      },
      {
        rungNumber: 3,
        label: 'Rung 3 — Environment & Health Maintenance',
        description: 'Dedicated 20m home reset, organization, and health blocks',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Complete weekly environment reset'],
      },
      {
        rungNumber: 4,
        label: 'Rung 4 — Preventative Systems Check',
        description: 'Monthly/quarterly personal systems sign-off',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 2,
        milestones: ['Close monthly personal maintenance loop'],
      },
    ],
  },
  {
    id: 'coding',
    name: 'Sandbox 1: Side Craft / Skill A',
    archetypeRole: 'Side Craft / Skill A',
    categoryLabel: 'ZERO-QUOTA SANDBOX',
    isSandbox: true,
    activeThisWeek: false,
    inputBlocksCredited: 0,
    inputWeeklyTarget: 0,
    outputBlocksCredited: 0,
    outputWeeklyTarget: 0,
    rungs: [
      {
        rungNumber: 1,
        label: 'Rung 1 — Curiosity & Reference Intake',
        description: 'Zero-pressure tutorials, reference reading, and inspiration',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Explore 1 new technique or concept'],
      },
      {
        rungNumber: 2,
        label: 'Rung 2 — 5m Micro-Experiments',
        description: 'Small evening or weekend hands-on experiments',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Run 3 five-minute starter sessions'],
      },
      {
        rungNumber: 3,
        label: 'Rung 3 — Prototype / Practice Piece',
        description: 'Iterative sandbox build at flexible pace',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Assemble working prototype or study piece'],
      },
      {
        rungNumber: 4,
        label: 'Rung 4 — Completed Sandbox Artifact',
        description: 'Finished side project or personal tool',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 2,
        milestones: ['Archive finished sandbox piece'],
      },
    ],
  },
  {
    id: 'music',
    name: 'Sandbox 2: Side Craft / Skill B',
    archetypeRole: 'Side Craft / Skill B',
    categoryLabel: 'ZERO-QUOTA SANDBOX',
    isSandbox: true,
    activeThisWeek: false,
    inputBlocksCredited: 0,
    inputWeeklyTarget: 0,
    outputBlocksCredited: 0,
    outputWeeklyTarget: 0,
    rungs: [
      {
        rungNumber: 1,
        label: 'Rung 1 — Appreciation & Study',
        description: 'Active listening, observation, or style study',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Log 2 appreciation or study sessions'],
      },
      {
        rungNumber: 2,
        label: 'Rung 2 — 5m Fluid Expression',
        description: 'Unpressured 5m evening practice or expression',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Complete 5m fluid sessions without grading'],
      },
      {
        rungNumber: 3,
        label: 'Rung 3 — Full Piece / Skill Consolidation',
        description: 'End-to-end playthrough or complete study',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 2,
        milestones: ['Complete 1 full unassisted session'],
      },
      {
        rungNumber: 4,
        label: 'Rung 4 — Personal Archive Capture',
        description: 'Recorded or saved personal milestone',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 2,
        milestones: ['Save snapshot to personal archive'],
      },
    ],
  },
];

export const PROFILE_PRESETS: Record<string, ProfilePresetDefinition> = {
  BALANCED_CORE: {
    id: 'BALANCED_CORE',
    title: 'Balanced Core + Projects (Default)',
    shortBadge: 'Balanced Core (4b Floor + 8b Projects)',
    subtitle: '4 Daily Maintenance Blocks (2 Admin/Review + 2 Core Skill) + 7–8 Project Blocks',
    description:
      'Universal daily cadence balancing 4 structured maintenance/skill blocks (80m) with 7–8 deep project blocks on your #1 priority deliverable.',
    floorCountLabel: '4-Block Daily Core (2b Review/Admin + 2b Skill/Learning)',
    cruiseCeilingBlocks: 12,
    surgeCeilingBlocks: 14,
    taperCeilingBlocks: 8,
    taskWeights: { ...UNIVERSAL_TASK_WEIGHTS },
    breakOptions: { ...UNIVERSAL_BREAK_OPTIONS },
    upcomingMilestones: ['Primary Q4 Deliverable Target', 'Monthly Milestone Review'],
    baselineBlocks: [
      {
        id: 'bal_admin_1',
        title: 'Morning Review / Admin',
        category: 'READING',
        completed: false,
        completedBlocks: 0,
        targetBlocks: 2,
        earlyClearanceEligible: true,
        lateNightBlocker: false,
        startupStep: 'Open today’s calendar/inbox, clear top 3 quick items, and confirm Focus #1.',
        trackId: 'personal',
        cognitiveDemand: 'LIGHT_ADMIN',
      },
      {
        id: 'bal_skill_1',
        title: 'Core Skill / Learning',
        category: 'SYNTHESIS',
        completed: false,
        completedBlocks: 0,
        targetBlocks: 2,
        earlyClearanceEligible: false,
        lateNightBlocker: false,
        startupStep: 'Open current study/reference material and summarize 3 key takeaways.',
        trackId: 'science',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ],
    projectQueue: [
      {
        id: 'proj_bal_1',
        slot: 1,
        title: '1. Primary Major Deliverable (Focus #1)',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'science',
        startupStep: 'Open primary workspace and complete the first 5m concrete sub-step.',
        nextStepNote: 'Unlocked Primary Focus #1 — receives 100% of discretionary project blocks.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
      {
        id: 'proj_bal_2',
        slot: 2,
        title: '2. Secondary Medium Deliverable',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'writing',
        startupStep: 'Outline core sections and draft section 1.',
        nextStepNote: 'Locked until Item #1 completes.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
      {
        id: 'proj_bal_3',
        slot: 3,
        title: '3. Quick Sprint Deliverable',
        presetType: 'QUICK_2',
        completedBlocks: 0,
        totalBlocks: 2,
        trackId: 'personal',
        startupStep: 'Open checklist and execute first 5m action.',
        nextStepNote: 'Locked until Item #1 and Item #2 complete.',
        cognitiveDemand: 'LIGHT_ADMIN',
      },
    ],
    openListBacklog: [
      {
        id: 'proj_bal_b1',
        title: 'Upcoming Project Deliverable A (8b)',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'science',
        startupStep: 'Define scope and initial 3 milestones.',
        nextStepNote: 'Ready to promote when an active queue slot opens.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
      {
        id: 'proj_bal_b2',
        title: 'Upcoming Medium Deliverable B (4b)',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'writing',
        startupStep: 'Draft initial 4-point outline.',
        nextStepNote: 'Queued in project backlog.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ],
    stickySlots: JSON.parse(JSON.stringify(UNIVERSAL_STICKY_SLOTS)),
    fluidCategories: JSON.parse(JSON.stringify(UNIVERSAL_FLUID_CATEGORIES)),
    categoryCards: buildCategoryCardsFromLegacyMaps(
      UNIVERSAL_FLUID_CATEGORIES,
      UNIVERSAL_STICKY_SLOTS
    ),
    roadmapTracks: JSON.parse(JSON.stringify(UNIVERSAL_ROADMAP_TRACKS)),
  },

  DEEP_PROJECT_BUILDER: {
    id: 'DEEP_PROJECT_BUILDER',
    title: 'Deep Project Builder (Low Daily Overhead)',
    shortBadge: 'Deep Builder (2b Floor + 10b Projects)',
    subtitle: 'Minimal 2-Block Daily Baseline (1b Triage/Planning + 1b Review) • 80%+ Capacity to Focus #1',
    description:
      'Designed for makers, builders, and deep project sprints. Keeps daily maintenance to a minimal 2-block floor (40m) so 80%+ of your shift goes straight into Locked Focus #1 Deliverables.',
    floorCountLabel: '2-Block Minimal Baseline (1b Triage/Planning + 1b Review)',
    cruiseCeilingBlocks: 12,
    surgeCeilingBlocks: 15,
    taperCeilingBlocks: 8,
    taskWeights: { ...UNIVERSAL_TASK_WEIGHTS },
    breakOptions: { ...UNIVERSAL_BREAK_OPTIONS },
    upcomingMilestones: ['Milestone Release v1.0', 'End-of-Sprint Delivery'],
    baselineBlocks: [
      {
        id: 'dpb_triage_1',
        title: 'Triage & Daily Planning',
        category: 'READING',
        completed: false,
        completedBlocks: 0,
        targetBlocks: 1,
        earlyClearanceEligible: true,
        lateNightBlocker: false,
        startupStep: 'Clear critical blockers and define today’s #1 deliverable objective.',
        trackId: 'personal',
        cognitiveDemand: 'LIGHT_ADMIN',
      },
      {
        id: 'dpb_review_1',
        title: 'Daily Review & Verification',
        category: 'SYNTHESIS',
        completed: false,
        completedBlocks: 0,
        targetBlocks: 1,
        earlyClearanceEligible: true,
        lateNightBlocker: false,
        startupStep: 'Review recent output, log notes, and verify quality criteria.',
        trackId: 'science',
        cognitiveDemand: 'MECHANICAL_RECALL',
      },
    ],
    projectQueue: [
      {
        id: 'proj_dpb_1',
        slot: 1,
        title: '1. Flagship Build / Major Deliverable (8b)',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'science',
        startupStep: 'Open primary project file and execute first 5m build step.',
        nextStepNote: 'Receives 80%+ of daily capacity until marked complete.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
      {
        id: 'proj_dpb_2',
        slot: 2,
        title: '2. Feature / Module Milestone (4b)',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'writing',
        startupStep: 'Spec out interface and build core component.',
        nextStepNote: 'Locked until Item #1 completes.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
      {
        id: 'proj_dpb_3',
        slot: 3,
        title: '3. Verification & Polish Sprint (2b)',
        presetType: 'QUICK_2',
        completedBlocks: 0,
        totalBlocks: 2,
        trackId: 'science',
        startupStep: 'Run end-to-end verification checklist.',
        nextStepNote: 'Locked until Item #1 and Item #2 complete.',
        cognitiveDemand: 'LIGHT_ADMIN',
      },
    ],
    openListBacklog: [
      {
        id: 'proj_dpb_b1',
        title: 'Next Architecture / Project Build (8b)',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'science',
        startupStep: 'Write technical/project spec and first milestone.',
        nextStepNote: 'Queued in project backlog.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ],
    stickySlots: JSON.parse(JSON.stringify(UNIVERSAL_STICKY_SLOTS)),
    fluidCategories: JSON.parse(JSON.stringify(UNIVERSAL_FLUID_CATEGORIES)),
    categoryCards: buildCategoryCardsFromLegacyMaps(
      UNIVERSAL_FLUID_CATEGORIES,
      UNIVERSAL_STICKY_SLOTS
    ),
    roadmapTracks: JSON.parse(JSON.stringify(UNIVERSAL_ROADMAP_TRACKS)),
  },

  STUDY_HIGH_RETENTION: {
    id: 'STUDY_HIGH_RETENTION',
    title: 'Study & High-Retention (Habit-Heavy)',
    shortBadge: 'Study & Retention (6b Floor + 6b Projects)',
    subtitle: '6-Block Daily Baseline (3b Active Recall + 2b New Material + 1b Synthesis) + 5–6 Project Blocks',
    description:
      'Built for intensive exams, certifications, or language/skill acquisition. Enforces Early Clearance and Late-Night Blocker on 3 Active Recall blocks, paired with 2 New Material blocks and 1 Synthesis block.',
    floorCountLabel: '6-Block Study Baseline (3b Recall + 2b New Material + 1b Synthesis)',
    cruiseCeilingBlocks: 12,
    surgeCeilingBlocks: 14,
    taperCeilingBlocks: 8,
    taskWeights: { ...UNIVERSAL_TASK_WEIGHTS },
    breakOptions: { ...UNIVERSAL_BREAK_OPTIONS },
    upcomingMilestones: ['Upcoming Assessment / Milestone 1', 'Comprehensive Review Target'],
    baselineBlocks: [
      {
        id: 'shr_recall_1',
        title: 'Active Recall / Practice',
        category: 'FLASHCARDS_COMP',
        completed: false,
        completedBlocks: 0,
        targetBlocks: 3,
        earlyClearanceEligible: true,
        lateNightBlocker: true,
        startupStep: 'Open practice deck/problem set and complete first 15 recall items.',
        trackId: 'science',
        cognitiveDemand: 'MECHANICAL_RECALL',
      },
      {
        id: 'shr_new_1',
        title: 'New Material Intake',
        category: 'READING',
        completed: false,
        completedBlocks: 0,
        targetBlocks: 2,
        earlyClearanceEligible: false,
        lateNightBlocker: false,
        startupStep: 'Open assigned section, read first 2 pages, and mark core concepts.',
        trackId: 'science',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
      {
        id: 'shr_synth_1',
        title: 'Concept Synthesis',
        category: 'SYNTHESIS',
        completed: false,
        completedBlocks: 0,
        targetBlocks: 1,
        earlyClearanceEligible: false,
        lateNightBlocker: false,
        startupStep: 'Condense today’s new material into 5 bulleted takeaways from memory.',
        trackId: 'writing',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ],
    projectQueue: [
      {
        id: 'proj_shr_1',
        slot: 1,
        title: '1. Primary Study / Assignment Deliverable (8b)',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'science',
        startupStep: 'Open problem set or paper draft and complete first 5m prompt.',
        nextStepNote: 'Primary Focus #1 — receives all post-baseline blocks.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
      {
        id: 'proj_shr_2',
        slot: 2,
        title: '2. Summary Deck / Practice Exam Review (4b)',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'writing',
        startupStep: 'List top 5 weak areas and build summary sheet.',
        nextStepNote: 'Locked until Item #1 completes.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
      {
        id: 'proj_shr_3',
        slot: 3,
        title: '3. Quick Admin / Schedule Check (2b)',
        presetType: 'QUICK_2',
        completedBlocks: 0,
        totalBlocks: 2,
        trackId: 'personal',
        startupStep: 'Organize study materials and calendar anchors.',
        nextStepNote: 'Locked until Item #1 and Item #2 complete.',
        cognitiveDemand: 'LIGHT_ADMIN',
      },
    ],
    openListBacklog: [
      {
        id: 'proj_shr_b1',
        title: 'Upcoming Module Synthesis Paper (8b)',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'writing',
        startupStep: 'Outline core sections and references.',
        nextStepNote: 'Queued in project backlog.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ],
    stickySlots: JSON.parse(JSON.stringify(UNIVERSAL_STICKY_SLOTS)),
    fluidCategories: JSON.parse(JSON.stringify(UNIVERSAL_FLUID_CATEGORIES)),
    categoryCards: buildCategoryCardsFromLegacyMaps(
      UNIVERSAL_FLUID_CATEGORIES,
      UNIVERSAL_STICKY_SLOTS
    ),
    roadmapTracks: JSON.parse(JSON.stringify(UNIVERSAL_ROADMAP_TRACKS)),
  },

  MODULAR_BLANK_CANVAS: {
    id: 'MODULAR_BLANK_CANVAS',
    title: 'Modular Blank Canvas (Build From Scratch)',
    shortBadge: 'Blank Canvas (Inline Edit Ready)',
    subtitle: '1 Editable Baseline Slot ("Daily Habit 1", 2b) + 1 Focus #1 ("First Priority Project", 4b)',
    description:
      'Starts ultra-clean with 1 editable Baseline slot, 1 Focus #1 placeholder, generic Evening slots ("Activity 1–5"), and generic Tracks ("Track 1–5"), immediately opening inline-edit mode so you can type your own labels in 15 seconds.',
    floorCountLabel: '1-Slot Starter Floor (2b — Expandable Inline)',
    cruiseCeilingBlocks: 10,
    surgeCeilingBlocks: 14,
    taperCeilingBlocks: 7,
    opensInlineEditOnLoad: true,
    taskWeights: { ...UNIVERSAL_TASK_WEIGHTS },
    breakOptions: { ...UNIVERSAL_BREAK_OPTIONS },
    upcomingMilestones: ['Milestone 1'],
    baselineBlocks: [
      {
        id: 'blank_habit_1',
        title: 'Daily Habit 1',
        category: 'READING',
        completed: false,
        completedBlocks: 0,
        targetBlocks: 2,
        earlyClearanceEligible: false,
        lateNightBlocker: false,
        startupStep: 'Write your 5m starter action here.',
        trackId: 'science',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ],
    projectQueue: [
      {
        id: 'proj_blank_1',
        slot: 1,
        title: '1. First Priority Project',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'science',
        startupStep: 'Open project and do 5m of work.',
        nextStepNote: 'Click any title or badge to customize inline.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ],
    openListBacklog: [],
    stickySlots: {
      CAT2_MAKER: {
        key: 'CAT2_MAKER',
        label: '2. Activity 2 [Sticky]',
        activeTitle: 'Activity 2 Item',
        startupStep: '5m starter step for Activity 2',
        backlogQueue: ['Next Item 1'],
        queuedNextTitle: 'Next Item 1',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      '3A_FICTION': {
        key: '3A_FICTION',
        label: '3A Track A [Sticky]',
        activeTitle: 'Activity 3A Item',
        startupStep: '5m starter step for Track 3A',
        backlogQueue: ['Next 3A Item'],
        queuedNextTitle: 'Next 3A Item',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      '3B_NONFICTION': {
        key: '3B_NONFICTION',
        label: '3B Track B [Sticky]',
        activeTitle: 'Activity 3B Item',
        startupStep: '5m starter step for Track 3B',
        backlogQueue: ['Next 3B Item'],
        queuedNextTitle: 'Next 3B Item',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      '3C_VIDEO': {
        key: '3C_VIDEO',
        label: '3C Track C [Sticky]',
        activeTitle: 'Activity 3C Item',
        startupStep: '5m starter step for Track 3C',
        backlogQueue: ['Next 3C Item'],
        queuedNextTitle: 'Next 3C Item',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      CAT5_GAMING: {
        key: 'CAT5_GAMING',
        label: '5. Activity 5 [Sticky]',
        activeTitle: 'Activity 5 Item',
        startupStep: '5m starter step for Activity 5',
        backlogQueue: ['Next Activity 5 Item'],
        queuedNextTitle: 'Next Activity 5 Item',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
    },
    fluidCategories: {
      CAT1_MUSIC: {
        label: '1. Activity 1 [Fluid]',
        activeTitle: 'Activity 1',
        subtitle: 'Click "Edit Card" to customize this recharge slot.',
        startupStep: '5m starter step for Activity 1',
      },
      CAT4_COMFORT: {
        label: '4. Activity 4 [Fluid]',
        activeTitle: 'Activity 4',
        subtitle: 'Click "Edit Card" to customize this recharge slot.',
        startupStep: '5m starter step for Activity 4',
      },
    },
    categoryCards: [
      {
        id: 'CAT1_MUSIC',
        slotNumber: 1,
        categoryName: 'Activity 1',
        subtitle: 'Click "Edit Card" to customize this recharge slot.',
        behavior: 'FLUID',
        trackMode: 'SINGLE',
        activeTitle: 'Activity 1',
        startupPrompt: '5m starter step for Activity 1',
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
        categoryName: 'Activity 2',
        subtitle: 'Click "Edit Card" to customize this recharge slot.',
        behavior: 'STICKY',
        trackMode: 'SINGLE',
        activeTitle: 'Activity 2 Item',
        startupPrompt: '5m starter step for Activity 2',
        backlogQueue: ['Next Item 1'],
        fiveMinStarts: 0,
        unlockedViaCheckIn: false,
        hidden: false,
        legacyCategoryKey: 'CAT2_MAKER',
        stickyKey: 'CAT2_MAKER',
      },
      {
        id: 'CAT3_MEDIA',
        slotNumber: 3,
        categoryName: 'Activity 3',
        subtitle: 'Click "Edit Card" to switch between Single-Track and Triple-Track.',
        behavior: 'STICKY',
        trackMode: 'TRIPLE',
        activeTitle: 'Activity 3A Item',
        startupPrompt: '5m starter step for Track 3A',
        backlogQueue: ['Next 3A Item'],
        fiveMinStarts: 0,
        unlockedViaCheckIn: false,
        activeSubTrackId: '3A_FICTION',
        subTracks: [
          {
            id: '3A_FICTION',
            label: '3A Track A',
            activeTitle: 'Activity 3A Item',
            startupPrompt: '5m starter step for Track 3A',
            backlogQueue: ['Next 3A Item'],
            fiveMinStarts: 0,
            unlockedViaCheckIn: false,
            speedControl: true,
          },
          {
            id: '3B_NONFICTION',
            label: '3B Track B',
            activeTitle: 'Activity 3B Item',
            startupPrompt: '5m starter step for Track 3B',
            backlogQueue: ['Next 3B Item'],
            fiveMinStarts: 0,
            unlockedViaCheckIn: false,
          },
          {
            id: '3C_VIDEO',
            label: '3C Track C',
            activeTitle: 'Activity 3C Item',
            startupPrompt: '5m starter step for Track 3C',
            backlogQueue: ['Next 3C Item'],
            fiveMinStarts: 0,
            unlockedViaCheckIn: false,
          },
        ],
        hidden: false,
        legacyCategoryKey: 'CAT3_MEDIA',
      },
      {
        id: 'CAT4_COMFORT',
        slotNumber: 4,
        categoryName: 'Activity 4',
        subtitle: 'Click "Edit Card" to customize this recharge slot.',
        behavior: 'FLUID',
        trackMode: 'SINGLE',
        activeTitle: 'Activity 4',
        startupPrompt: '5m starter step for Activity 4',
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
        categoryName: 'Activity 5',
        subtitle: 'Click "Edit Card" to customize this recharge slot.',
        behavior: 'STICKY',
        trackMode: 'SINGLE',
        activeTitle: 'Activity 5 Item',
        startupPrompt: '5m starter step for Activity 5',
        backlogQueue: ['Next Activity 5 Item'],
        fiveMinStarts: 0,
        unlockedViaCheckIn: false,
        hidden: false,
        legacyCategoryKey: 'CAT5_GAMING',
        stickyKey: 'CAT5_GAMING',
      },
    ],
    roadmapTracks: (['science', 'writing', 'personal', 'coding', 'music'] as RoadmapTrackId[]).map(
      (id, idx) => ({
        id,
        name: `Track ${idx + 1}`,
        archetypeRole: `Track ${idx + 1}`,
        categoryLabel: idx < 3 ? 'CORE TRACK' : 'ZERO-QUOTA SANDBOX',
        isSandbox: idx >= 3,
        activeThisWeek: idx < 3,
        inputBlocksCredited: 0,
        inputWeeklyTarget: idx < 3 ? 10 : 0,
        outputBlocksCredited: 0,
        outputWeeklyTarget: idx < 3 ? 10 : 0,
        rungs: [
          {
            rungNumber: 1,
            label: 'Rung 1 — Weekly Intake',
            description: 'Click to edit Rung 1 description',
            ledgerType: 'INPUT',
            completedBlocks: 0,
            targetBlocks: 6,
            milestones: ['Milestone 1'],
          },
          {
            rungNumber: 2,
            label: 'Rung 2 — Monthly Synthesis',
            description: 'Click to edit Rung 2 description',
            ledgerType: 'INPUT',
            completedBlocks: 0,
            targetBlocks: 4,
            milestones: ['Milestone 1'],
          },
          {
            rungNumber: 3,
            label: 'Rung 3 — Quarterly Execution',
            description: 'Click to edit Rung 3 description',
            ledgerType: 'OUTPUT',
            completedBlocks: 0,
            targetBlocks: 6,
            milestones: ['Milestone 1'],
          },
          {
            rungNumber: 4,
            label: 'Rung 4 — Long-Term Shipping',
            description: 'Click to edit Rung 4 description',
            ledgerType: 'OUTPUT',
            completedBlocks: 0,
            targetBlocks: 4,
            milestones: ['Milestone 1'],
          },
        ],
      })
    ),
  },

  AVERY_DEFAULT: {
    id: 'AVERY_DEFAULT',
    title: 'Avery Default (Medical Physics, Writing & Maker)',
    shortBadge: 'Avery Default',
    subtitle: 'Rung 1 Medical Physics / Clinical, Writing & K1C Maker Default',
    description:
      'Pre-loaded with 1 Anatomy + 3 Comp Flashcards (250 cap), 2 Half-Chapter Reading + 1 Synthesis, K1C 3D Printer, Soul Music / American Way of Killing / Widow’s Bay, Always Sunny, and Baldur’s Gate 3.',
    isDefaultPersonal: true,
    floorCountLabel: '7-Block Floor (4 Flashcards + 2 Reading + 1 Synthesis)',
    cruiseCeilingBlocks: 12,
    surgeCeilingBlocks: 14,
    taperCeilingBlocks: 8,
    taskWeights: { ...DEFAULT_SYMMETRY_STATE.taskWeights!, quickLabel: 'Quick Task', quickBlocks: 2 },
    breakOptions: { ...DEFAULT_SYMMETRY_STATE.breakOptions! },
    upcomingMilestones: [...(DEFAULT_SYMMETRY_STATE.upcomingMilestones || [])],
    baselineBlocks: DEFAULT_SYMMETRY_STATE.baselineBlocks.map((b) => ({
      ...b,
      completed: false,
      bankedViaEarlyClearance: false,
    })),
    projectQueue: DEFAULT_SYMMETRY_STATE.projectQueue.map((p) => ({
      ...p,
      completedBlocks: p.slot === 1 ? 2 : 0,
    })),
    openListBacklog: [...DEFAULT_SYMMETRY_STATE.openListBacklog],
    stickySlots: JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE.recharge.stickySlots)),
    fluidCategories: JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE.recharge.fluidCategories)),
    categoryCards: getEffectiveEveningCategoryCards(DEFAULT_SYMMETRY_STATE.recharge),
    roadmapTracks: JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE.roadmapTracks)),
  },
};

// Map legacy preset IDs so existing tests/states never break
PROFILE_PRESETS.ACADEMIC_RESEARCHER = PROFILE_PRESETS.BALANCED_CORE;
PROFILE_PRESETS.SOFTWARE_ENGINEER = PROFILE_PRESETS.DEEP_PROJECT_BUILDER;
PROFILE_PRESETS.WRITER_CREATIVE = PROFILE_PRESETS.STUDY_HIGH_RETENTION;
PROFILE_PRESETS.BLANK_CUSTOM = PROFILE_PRESETS.MODULAR_BLANK_CANVAS;

export const PUBLIC_PROFILE_PRESET_ORDER: ProfilePresetId[] = [
  'BALANCED_CORE',
  'DEEP_PROJECT_BUILDER',
  'STUDY_HIGH_RETENTION',
  'MODULAR_BLANK_CANVAS',
];

export const PROFILE_PRESET_ORDER: ProfilePresetId[] = [
  'AVERY_DEFAULT',
  ...PUBLIC_PROFILE_PRESET_ORDER,
];

export function loadCustomUserPresets(): ProfilePresetDefinition[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_PRESETS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (p): p is ProfilePresetDefinition =>
          Boolean(p && typeof p === 'object' && typeof p.id === 'string' && typeof p.title === 'string')
      );
    }
  } catch {
    // ignore storage errors
  }
  return [];
}

export function persistCustomUserPresets(presets: ProfilePresetDefinition[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CUSTOM_PRESETS_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore storage errors
  }
}

export function saveCurrentSetupAsPreset(
  state: SymmetryState,
  customTitle?: string,
  customSubtitle?: string
): ProfilePresetDefinition {
  const existing = loadCustomUserPresets();
  const title =
    customTitle?.trim() ||
    `${state.profileName || 'Custom Setup'} (${new Date().toLocaleDateString()})`;
  const totalFloor = getTotalBaselineFloorBlocks(state.baselineBlocks);
  const cruiseBlocks = state.customModeBlockAdjustment || Math.max(totalFloor + 4, 12);
  const newId = `CUSTOM_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  const preset: ProfilePresetDefinition = {
    id: newId,
    title,
    shortBadge: title.slice(0, 28),
    subtitle:
      customSubtitle?.trim() ||
      `${totalFloor}b Daily Baseline (${state.baselineBlocks.length} slots) • ${cruiseBlocks}b Cruise Ceiling`,
    description: `Saved user preset with ${state.baselineBlocks.length} baseline slots (${totalFloor}b total), ${state.projectQueue.length} active focus slots, and customized Evening Recharge & Roadmap tracks.`,
    isCustomUserPreset: true,
    createdAtIso: new Date().toISOString(),
    floorCountLabel: `${totalFloor}-Block Custom Baseline (${state.baselineBlocks.length} Slots)`,
    cruiseCeilingBlocks: cruiseBlocks,
    surgeCeilingBlocks: 14,
    taperCeilingBlocks: 8,
    taskWeights: {
      heavyLabel: state.taskWeights?.heavyLabel || 'Major Deliverable',
      heavyBlocks: state.taskWeights?.heavyBlocks || 8,
      mediumLabel: state.taskWeights?.mediumLabel || 'Medium Deliverable',
      mediumBlocks: state.taskWeights?.mediumBlocks || 4,
      quickLabel: state.taskWeights?.quickLabel || 'Quick Sprint',
      quickBlocks: state.taskWeights?.quickBlocks || 2,
    },
    breakOptions: {
      ...(DEFAULT_SYMMETRY_STATE.breakOptions!),
      ...(state.breakOptions || {}),
    },
    upcomingMilestones: [...(state.upcomingMilestones || [])],
    baselineBlocks: JSON.parse(
      JSON.stringify(
        state.baselineBlocks.map((b) => ({
          ...b,
          completed: false,
          completedBlocks: 0,
          bankedViaEarlyClearance: false,
        }))
      )
    ),
    projectQueue: JSON.parse(JSON.stringify(state.projectQueue)),
    openListBacklog: JSON.parse(JSON.stringify(state.openListBacklog || [])),
    stickySlots: JSON.parse(JSON.stringify(state.recharge.stickySlots)),
    fluidCategories: JSON.parse(
      JSON.stringify(
        state.recharge.fluidCategories || DEFAULT_SYMMETRY_STATE.recharge.fluidCategories
      )
    ),
    categoryCards: JSON.parse(
      JSON.stringify(getEffectiveEveningCategoryCards(state.recharge))
    ),
    roadmapTracks: JSON.parse(JSON.stringify(state.roadmapTracks)),
  };

  const updated = [preset, ...existing];
  persistCustomUserPresets(updated);
  return preset;
}

export function saveOrUpdateCustomPreset(
  preset: ProfilePresetDefinition
): ProfilePresetDefinition[] {
  const existing = loadCustomUserPresets();
  const normalized: ProfilePresetDefinition = {
    ...preset,
    isCustomUserPreset: true,
    id: preset.id.startsWith('CUSTOM_')
      ? preset.id
      : `CUSTOM_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAtIso: preset.createdAtIso || new Date().toISOString(),
  };
  const idx = existing.findIndex((p) => p.id === normalized.id);
  const updated =
    idx >= 0
      ? existing.map((item, i) => (i === idx ? normalized : item))
      : [normalized, ...existing];
  persistCustomUserPresets(updated);
  return updated;
}

export function renameCustomUserPreset(
  presetId: string,
  newTitle: string,
  newSubtitle?: string
): ProfilePresetDefinition[] {
  const existing = loadCustomUserPresets();
  const trimmed = newTitle.trim();
  if (!trimmed) return existing;
  const updated = existing.map((p) =>
    p.id === presetId
      ? {
          ...p,
          title: trimmed,
          shortBadge: trimmed.slice(0, 28),
          subtitle: newSubtitle !== undefined ? newSubtitle.trim() : p.subtitle,
        }
      : p
  );
  persistCustomUserPresets(updated);
  return updated;
}

export function duplicatePresetAsCustom(
  sourcePreset: ProfilePresetDefinition,
  customTitle?: string
): ProfilePresetDefinition {
  const existing = loadCustomUserPresets();
  const title = customTitle?.trim() || `${sourcePreset.title} (Copy)`;
  const cloned: ProfilePresetDefinition = {
    ...JSON.parse(JSON.stringify(sourcePreset)),
    id: `CUSTOM_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    title,
    shortBadge: title.slice(0, 28),
    isDefaultPersonal: false,
    isCustomUserPreset: true,
    createdAtIso: new Date().toISOString(),
  };
  const updated = [cloned, ...existing];
  persistCustomUserPresets(updated);
  return cloned;
}

export function deleteCustomUserPreset(presetId: string): ProfilePresetDefinition[] {
  const existing = loadCustomUserPresets();
  const updated = existing.filter((p) => p.id !== presetId);
  persistCustomUserPresets(updated);
  return updated;
}

export function exportPresetAsJson(preset: ProfilePresetDefinition): string {
  return JSON.stringify(preset, null, 2);
}

export function getPresetById(presetId: ProfilePresetId | string): ProfilePresetDefinition {
  if (PROFILE_PRESETS[presetId]) {
    return PROFILE_PRESETS[presetId];
  }
  const custom = loadCustomUserPresets().find((p) => p.id === presetId);
  if (custom) return custom;
  return PROFILE_PRESETS.BALANCED_CORE;
}

export function isArchitectDomain(hostname?: string): boolean {
  const host = (
    hostname ??
    (typeof window !== 'undefined' ? window.location.hostname : '')
  ).toLowerCase();
  return host.includes('avery') || host.includes('akarlin');
}

export function isArchitectPassphrase(raw: string): boolean {
  const trimmed = (raw || '').trim().toLowerCase();
  return (
    trimmed === '/avery' ||
    trimmed === '/architect' ||
    trimmed === 'unlock:avery'
  );
}

export function isArchitectModeUnlocked(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const modeParam = (params.get('mode') || params.get('profile') || '').toLowerCase();
    if (modeParam === 'avery' || modeParam === 'architect') {
      window.localStorage.setItem(ARCHITECT_UNLOCK_STORAGE_KEY, 'true');
      return true;
    }
    if (isArchitectDomain(window.location.hostname)) {
      return true;
    }
    return window.localStorage.getItem(ARCHITECT_UNLOCK_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export const getStoredArchitectModeUnlocked = isArchitectModeUnlocked;

export function setArchitectModeUnlocked(unlocked: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (unlocked) {
      window.localStorage.setItem(ARCHITECT_UNLOCK_STORAGE_KEY, 'true');
    } else {
      window.localStorage.removeItem(ARCHITECT_UNLOCK_STORAGE_KEY);
    }
  } catch {
    // ignore storage errors
  }
}

export const setStoredArchitectModeUnlocked = setArchitectModeUnlocked;

export function checkAndPersistUrlArchitectTrigger(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const modeParam = (params.get('mode') || params.get('profile') || '').toLowerCase();
    if (modeParam === 'avery' || modeParam === 'architect') {
      window.localStorage.setItem(ARCHITECT_UNLOCK_STORAGE_KEY, 'true');
      return true;
    }
  } catch {
    // ignore
  }
  return false;
}

export function getVisibleProfilePresets(
  architectUnlocked: boolean = isArchitectModeUnlocked()
): ProfilePresetDefinition[] {
  const builtInIds = architectUnlocked
    ? PROFILE_PRESET_ORDER
    : PUBLIC_PROFILE_PRESET_ORDER;
  const builtIns: ProfilePresetDefinition[] = builtInIds
    .filter((id) => Boolean(PROFILE_PRESETS[id]))
    .map((id, idx) => {
      const p = PROFILE_PRESETS[id];
      return {
        ...p,
        number: p.number ?? idx + 1,
        shortTitle: p.shortTitle ?? p.shortBadge ?? p.title,
      };
    });
  const customPresets: ProfilePresetDefinition[] = loadCustomUserPresets().map(
    (p, idx) => ({
      ...p,
      number: p.number ?? builtIns.length + idx + 1,
      shortTitle: p.shortTitle ?? p.shortBadge ?? p.title,
    })
  );
  return [...builtIns, ...customPresets];
}

export const PROFILE_PRESET_METADATA: ProfilePresetDefinition[] = Object.values(
  PROFILE_PRESETS
).map((p, idx) => ({
  ...p,
  number: p.number ?? idx + 1,
  shortTitle: p.shortTitle ?? p.shortBadge ?? p.title,
}));

export function syncCategoryCardsToLegacyRecharge(
  cards: EveningCategoryCardConfig[],
  existingSticky: Record<StickyKey, StickyItemState>,
  existingFluid?: FluidCategoriesMap
): {
  stickySlots: Record<StickyKey, StickyItemState>;
  fluidCategories: FluidCategoriesMap;
  categoryCards: EveningCategoryCardConfig[];
} {
  const fallbackFluid =
    existingFluid ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories || {
      CAT1_MUSIC: {
        label: '1. Creative / Hands-On',
        activeTitle: '5m Creative Session',
        subtitle: 'Fluid hands-on activity',
        startupStep: 'Set out instrument or creative tool and play for 5m',
      },
      CAT4_COMFORT: {
        label: '4. Comfort Watch / Listen',
        activeTitle: 'Comfort Episode / Audio',
        subtitle: 'Low-friction relaxation away from work desk',
        startupStep: 'Step away from work desk and start episode',
      },
    };
  const nextSticky: Record<StickyKey, StickyItemState> = JSON.parse(
    JSON.stringify(existingSticky)
  );
  const nextFluid: FluidCategoriesMap = JSON.parse(JSON.stringify(fallbackFluid));

  for (const card of cards) {
    if (card.fluidKey && nextFluid[card.fluidKey]) {
      nextFluid[card.fluidKey] = {
        ...nextFluid[card.fluidKey],
        label: `${card.slotNumber ?? 1}. ${card.categoryName}`,
        activeTitle: card.activeTitle,
        subtitle: card.subtitle || nextFluid[card.fluidKey].subtitle,
        startupStep: card.startupPrompt || card.startupStep || '',
      };
    }
    if (card.stickyKey && nextSticky[card.stickyKey]) {
      nextSticky[card.stickyKey] = {
        ...nextSticky[card.stickyKey],
        label: `${card.categoryName} [${card.behavior === 'STICKY' ? 'Sticky' : 'Fluid'}]`,
        activeTitle: card.activeTitle,
        startupStep: card.startupPrompt || card.startupStep || '',
        backlogQueue: [...(card.backlogQueue || [])],
        queuedNextTitle: card.backlogQueue?.[0] || '',
        fiveMinStarts: card.fiveMinStarts ?? nextSticky[card.stickyKey].fiveMinStarts,
        startsLogged: card.fiveMinStarts ?? nextSticky[card.stickyKey].startsLogged,
        unlockedViaCheckIn: Boolean(card.unlockedViaCheckIn),
      };
    }
    if (card.trackMode === 'TRIPLE' && Array.isArray(card.subTracks)) {
      for (const sub of card.subTracks) {
        if (
          (sub.id === '3A_FICTION' ||
            sub.id === '3B_NONFICTION' ||
            sub.id === '3C_VIDEO') &&
          nextSticky[sub.id]
        ) {
          nextSticky[sub.id] = {
            ...nextSticky[sub.id],
            label: `${sub.label} [Sticky]`,
            activeTitle: sub.activeTitle,
            startupStep: sub.startupPrompt || sub.startupStep || '',
            backlogQueue: [...(sub.backlogQueue || [])],
            queuedNextTitle: sub.backlogQueue?.[0] || '',
            fiveMinStarts: sub.fiveMinStarts ?? nextSticky[sub.id].fiveMinStarts,
            startsLogged: sub.fiveMinStarts ?? nextSticky[sub.id].startsLogged,
            unlockedViaCheckIn: Boolean(sub.unlockedViaCheckIn),
          };
        }
      }
    }
  }

  return {
    stickySlots: nextSticky,
    fluidCategories: nextFluid,
    categoryCards: cards,
  };
}

export interface CustomArchitectureDraft {
  profileName?: string;
}

export interface ApplyPresetOptions {
  keepActiveTasksAndLogs?: boolean;
  customFloorItems?: BaselineBlock[];
  customPrimaryProjectTitle?: string;
  customPrimaryProjectBlocks?: number;
  customPrimaryProjectStartup?: string;
  customTrackNames?: Partial<Record<RoadmapTrackId, string>>;
  customEveningCardNames?: Record<string, { categoryName?: string; activeTitle?: string; startupPrompt?: string }>;
  customShutdownTime?: string;
  customRolloverHour?: number;
  logicalDayRolloverHour?: number;
  earlyEveningShutdownTime?: string;
  customCruiseCeiling?: number;
  customDraft?: CustomArchitectureDraft;
}

export function applyPresetToState(
  currentState: SymmetryState,
  presetOrId: ProfilePresetId | ProfilePresetDefinition,
  options?: ApplyPresetOptions
): SymmetryState {
  const preset =
    typeof presetOrId === 'string' ? getPresetById(presetOrId) : presetOrId;
  const keepWork = Boolean(options?.keepActiveTasksAndLogs);

  const floorBlocks: BaselineBlock[] =
    options?.customFloorItems && options.customFloorItems.length > 0
      ? JSON.parse(JSON.stringify(options.customFloorItems))
      : JSON.parse(JSON.stringify(preset.baselineBlocks));

  let projectQueue: ProjectItem[] = keepWork
    ? JSON.parse(JSON.stringify(currentState.projectQueue))
    : JSON.parse(JSON.stringify(preset.projectQueue));

  if (!keepWork && options?.customPrimaryProjectTitle?.trim() && projectQueue.length > 0) {
    const cleanTitle = options.customPrimaryProjectTitle.trim();
    projectQueue[0] = {
      ...projectQueue[0],
      title: cleanTitle.startsWith('1.') ? cleanTitle : `1. ${cleanTitle}`,
      totalBlocks: options.customPrimaryProjectBlocks || projectQueue[0].totalBlocks,
      startupStep: options.customPrimaryProjectStartup?.trim() || projectQueue[0].startupStep,
    };
  }

  let roadmapTracks: RoadmapTrack[] = JSON.parse(JSON.stringify(preset.roadmapTracks));
  if (options?.customTrackNames) {
    roadmapTracks = roadmapTracks.map((t) => {
      const override = options.customTrackNames?.[t.id]?.trim();
      if (!override) return t;
      return {
        ...t,
        name: override,
        archetypeRole: override,
      };
    });
  }

  const baseCards: EveningCategoryCardConfig[] = preset.categoryCards
    ? JSON.parse(JSON.stringify(preset.categoryCards))
    : buildCategoryCardsFromLegacyMaps(preset.fluidCategories, preset.stickySlots);

  const customizedCards = options?.customEveningCardNames
    ? baseCards.map((c) => {
        const ov = options.customEveningCardNames?.[c.id];
        if (!ov) return c;
        return {
          ...c,
          categoryName: ov.categoryName?.trim() || c.categoryName,
          activeTitle: ov.activeTitle?.trim() || c.activeTitle,
          startupPrompt: ov.startupPrompt?.trim() || c.startupPrompt,
        };
      })
    : baseCards;

  const syncedRecharge = syncCategoryCardsToLegacyRecharge(
    customizedCards,
    preset.stickySlots,
    preset.fluidCategories
  );

  const primary = projectQueue[0];
  const cruiseCeiling =
    options?.customCruiseCeiling || preset.cruiseCeilingBlocks || 12;
  const resolvedRollover =
    typeof options?.customRolloverHour === 'number'
      ? options.customRolloverHour
      : typeof options?.logicalDayRolloverHour === 'number'
      ? options.logicalDayRolloverHour
      : currentState.logicalDayRolloverHour ?? 4;
  const resolvedShutdown =
    options?.customShutdownTime?.trim() ||
    options?.earlyEveningShutdownTime?.trim() ||
    currentState.earlyEveningShutdownTime ||
    '6:00 PM';

  return {
    ...currentState,
    profilePresetId: preset.id,
    profileName: options?.customDraft?.profileName || preset.title,
    inlineEditModeActive: Boolean(preset.opensInlineEditOnLoad),
    logicalDayRolloverHour: Math.max(0, Math.min(6, Math.round(resolvedRollover))),
    earlyEveningShutdownTime: resolvedShutdown,
    taskWeights: { ...preset.taskWeights },
    breakOptions: { ...preset.breakOptions },
    upcomingMilestones: [...preset.upcomingMilestones],
    loadMode: keepWork ? currentState.loadMode : 'CRUISE',
    preExamTaperActive: false,
    cruisePlus: keepWork ? currentState.cruisePlus : false,
    customModeBlockAdjustment: cruiseCeiling,
    earlyClearanceEnabled: keepWork ? currentState.earlyClearanceEnabled : false,
    flashcardsReviewedCount:
      preset.id === 'AVERY_DEFAULT'
        ? 95
        : keepWork
        ? currentState.flashcardsReviewedCount
        : 0,
    discretionaryBlocksCompletedToday: keepWork
      ? currentState.discretionaryBlocksCompletedToday
      : 0,
    todayBlockLog:
      preset.id === 'AVERY_DEFAULT' && !keepWork
        ? DEFAULT_SYMMETRY_STATE.todayBlockLog
        : keepWork
        ? currentState.todayBlockLog
        : [],
    baselineBlocks: floorBlocks,
    projectQueue,
    projectBacklog: keepWork
      ? currentState.projectBacklog
      : JSON.parse(JSON.stringify(preset.openListBacklog)),
    openListBacklog: keepWork
      ? currentState.openListBacklog
      : JSON.parse(JSON.stringify(preset.openListBacklog)),
    pipelineDays: currentState.pipelineDays.map((d, idx) =>
      idx === 0
        ? {
            ...d,
            loadMode: keepWork ? d.loadMode : 'CRUISE',
            cruisePlus: false,
            baseTargetBlocks: cruiseCeiling,
            completedBlocks:
              preset.id === 'AVERY_DEFAULT' && !keepWork
                ? 3
                : keepWork
                ? d.completedBlocks
                : 0,
            deductedBlocksFromExtension: 0,
          }
        : d
    ),
    timer: {
      ...currentState.timer,
      isRunning: false,
      targetEndTimeMs: null,
      mode: 'WORK_20M',
      workStage: 'IGNITION_5M',
      secondsLeft: 300,
      activeBlockSourceId: primary?.id || floorBlocks[0]?.id || 'slot_1',
      activeTaskTitle:
        primary?.title || floorBlocks[0]?.title || 'Primary Focus Block',
      activeTaskType: primary ? 'PROJECT' : 'READING',
      activeStartupPrompt:
        primary?.startupStep ||
        floorBlocks[0]?.startupStep ||
        'Complete 5m startup step.',
    },
    recharge: {
      ...currentState.recharge,
      endOfShiftLocked: false,
      manualEveningPreview: false,
      activeCategory: 'NONE',
      categoryRunning: false,
      option0Running: false,
      stickySlots: syncedRecharge.stickySlots,
      fluidCategories: syncedRecharge.fluidCategories,
      categoryCards: syncedRecharge.categoryCards,
      completedLog:
        preset.id === 'AVERY_DEFAULT'
          ? [...(DEFAULT_SYMMETRY_STATE.recharge.completedLog || [])]
          : keepWork
          ? currentState.recharge.completedLog
          : [],
    },
    roadmapTracks,
  };
}

export function buildStateForPreset(
  presetOrId: ProfilePresetId | ProfilePresetDefinition,
  options?: ApplyPresetOptions
): SymmetryState {
  return applyPresetToState(DEFAULT_SYMMETRY_STATE, presetOrId, options);
}
