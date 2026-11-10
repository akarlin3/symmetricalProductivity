import {
  BaselineBlock,
  BreakOptionsConfig,
  CompletedDeliverableEntry,
  EveningCategoryCardConfig,
  FluidCategoriesMap,
  OpenListItem,
  PipelineDayEntry,
  ProfilePresetId,
  ProjectItem,
  RoadmapHouseStrip,
  RoadmapTrack,
  RoadmapTrackId,
  StickyItemState,
  StickyKey,
  SymmetryState,
  TaskWeightsConfig,
} from '../types/symmetry';
import {
  DEFAULT_HOUSE_FOUNDATION,
  DEFAULT_HOUSE_SHELTER,
  DEFAULT_SYMMETRY_STATE,
  getEffectiveEveningCategoryCards,
  getProjectActiveStartupStep,
  getTotalBaselineFloorBlocks,
  migrateRoadmapTracksToHouseTopology,
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
  openListBacklog: OpenListItem[];
  completedDeliverablesLog?: CompletedDeliverableEntry[];
  stickySlots: Record<StickyKey, StickyItemState>;
  fluidCategories: FluidCategoriesMap;
  categoryCards?: EveningCategoryCardConfig[];
  roadmapShelter?: RoadmapHouseStrip;
  roadmapFoundation?: RoadmapHouseStrip;
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
  const cat6 = fluidCategories.CAT6_CULTURE || {
    label: '6. Culture & Language [Fluid]',
    activeTitle: 'Spoken Audio, Foreign Cinema & Culinary Prep',
    subtitle: 'Low-pressure spoken audio, foreign music/cinema, or culinary prep — zero SRS flashcards.',
    startupStep: '5m spoken audio lesson, foreign music/cinema, or culinary prep — zero SRS flashcards',
  };
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
      launchUrl: cat1.launchUrl,
      autoLaunchUrl: cat1.autoLaunchUrl,
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
      launchUrl: s2.launchUrl,
      autoLaunchUrl: s2.autoLaunchUrl,
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
          launchUrl: s3a.launchUrl,
          autoLaunchUrl: s3a.autoLaunchUrl,
        },
        {
          id: '3B_NONFICTION',
          label: s3b.label.replace(/\s*\[Sticky\]$/i, ''),
          activeTitle: s3b.activeTitle,
          startupPrompt: s3b.startupStep,
          backlogQueue: [...(s3b.backlogQueue || [])],
          fiveMinStarts: s3b.fiveMinStarts || 0,
          unlockedViaCheckIn: Boolean(s3b.unlockedViaCheckIn),
          launchUrl: s3b.launchUrl,
          autoLaunchUrl: s3b.autoLaunchUrl,
        },
        {
          id: '3C_VIDEO',
          label: s3c.label.replace(/\s*\[Sticky\]$/i, ''),
          activeTitle: s3c.activeTitle,
          startupPrompt: s3c.startupStep,
          backlogQueue: [...(s3c.backlogQueue || [])],
          fiveMinStarts: s3c.fiveMinStarts || 0,
          unlockedViaCheckIn: Boolean(s3c.unlockedViaCheckIn),
          launchUrl: s3c.launchUrl,
          autoLaunchUrl: s3c.autoLaunchUrl,
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
      launchUrl: cat4.launchUrl,
      autoLaunchUrl: cat4.autoLaunchUrl,
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
      launchUrl: s5.launchUrl,
      autoLaunchUrl: s5.autoLaunchUrl,
    },
    {
      id: 'CAT6_CULTURE',
      slotNumber: 6,
      categoryName: cat6.label.replace(/^6\.\s*/, '').replace(/\s*\[Fluid\]$/i, ''),
      subtitle: cat6.subtitle,
      behavior: 'FLUID',
      trackMode: 'SINGLE',
      activeTitle: cat6.activeTitle,
      startupPrompt: cat6.startupStep,
      backlogQueue: [],
      fiveMinStarts: 0,
      unlockedViaCheckIn: false,
      hidden: false,
      legacyCategoryKey: 'CAT6_CULTURE',
      fluidKey: 'CAT6_CULTURE',
      launchUrl: cat6.launchUrl,
      autoLaunchUrl: cat6.autoLaunchUrl,
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
    label: '1. Music & Acoustic Play [Fluid]',
    activeTitle: '5m Familiar Song / Unstructured Creative Play',
    subtitle: 'Unstructured musical or creative expression — zero performance drills.',
    startupStep: 'Pick up instrument or creative tool and play 1 familiar piece cold for 5m.',
  },
  CAT4_COMFORT: {
    label: '4. Comfort Show / Listen [Fluid]',
    activeTitle: 'Favorite Comfort Show, Podcast, or Album',
    subtitle: 'Low-friction familiar watch or listen away from the primary work setup.',
    startupStep: 'Start first 5m of a familiar episode or album away from your work screen.',
  },
  CAT6_CULTURE: {
    label: '6. Culture & Language [Fluid]',
    activeTitle: 'Spoken Audio, Foreign Cinema & Culinary Prep',
    subtitle: 'Low-pressure cultural & spoken language immersion — zero SRS flashcards.',
    startupStep: '5m spoken audio lesson, foreign music/cinema, or culinary prep — zero SRS flashcards',
  },
};

const UNIVERSAL_STICKY_SLOTS: Record<StickyKey, StickyItemState> = {
  CAT2_MAKER: {
    key: 'CAT2_MAKER',
    label: '2. Maker / Tactile Project [Sticky]',
    activeTitle: 'Current Hands-On / Hardware / Craft Project',
    startupStep: 'Complete 1 single 5m diagnostic, setup, or build step.',
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
    label: '5. Interactive / Gaming [Sticky]',
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
    name: 'Major Track 1: Primary Vocation & Research',
    archetypeRole: '1A Institutional + 1B Independent Vocation',
    categoryLabel: 'MAJOR CORE TRACK',
    isSandbox: false,
    activeThisWeek: true,
    inputBlocksCredited: 0,
    inputWeeklyTarget: 16,
    outputBlocksCredited: 0,
    outputWeeklyTarget: 14,
    subTrack1ABlocksCredited: 0,
    subTrack1BBlocksCredited: 0,
    rungs: [
      {
        rungNumber: 1,
        label: 'Horizon 1 — Daily Core Intake',
        description: 'Daily baseline recall, reading, and reference blocks',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 10,
        milestones: ['Complete daily baseline blocks', 'Capture key reference notes'],
      },
      {
        rungNumber: 2,
        label: 'Horizon 2 — Concept & Mechanism Synthesis',
        description: 'Problem solving, models, and condensed framework notes',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 6,
        milestones: ['Synthesize core notes into working outlines'],
      },
      {
        rungNumber: 3,
        label: 'Horizon 3 — 1A Institutional Deliverables',
        description: 'Serialized Focus #1 project sprints toward major milestones',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 10,
        milestones: ['Complete Primary Focus #1 deliverable'],
      },
      {
        rungNumber: 4,
        label: 'Horizon 4 — 1B Independent Output & Releases',
        description: 'Independent studies, open releases, and long-horizon builds',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Ship and archive verified independent output'],
      },
    ],
  },
  {
    id: 'writing',
    name: 'Major Track 2: Writing & Authorship',
    archetypeRole: 'Serialized Essays, Books & Creative Works',
    categoryLabel: 'MAJOR CORE TRACK',
    isSandbox: false,
    activeThisWeek: true,
    inputBlocksCredited: 0,
    inputWeeklyTarget: 10,
    outputBlocksCredited: 0,
    outputWeeklyTarget: 12,
    rungs: [
      {
        rungNumber: 1,
        label: 'Horizon 1 — Literary & Media Intake',
        description: 'Evening Category 3A/3B/3C reading and viewing intake',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 6,
        milestones: ['Review source material and long-form works'],
      },
      {
        rungNumber: 2,
        label: 'Horizon 2 — Architecture & Outlining',
        description: 'Scoping deliverables and drafting structural outlines',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Finalize project structure and 5m startup steps'],
      },
      {
        rungNumber: 3,
        label: 'Horizon 3 — Daily Ambition Drip & Drafting',
        description: 'Dedicated 20m drafting blocks on active writing project',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 8,
        milestones: ['Execute core drafting blocks'],
      },
      {
        rungNumber: 4,
        label: 'Horizon 4 — Polish & Publication',
        description: 'Refinement, submissions, and completed editions',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Publish or submit finished work'],
      },
    ],
  },
  {
    id: 'coding',
    name: 'Sandbox Track 1: Engineering, Software & Tactile Craft',
    archetypeRole: 'Software Tools, Hardware & Tactile Builds',
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
        label: 'Horizon 1 — Docs & Reference Intake',
        description: 'Zero-pressure schematics, docs, and technical exploration',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Explore 1 technical pattern or schematic'],
      },
      {
        rungNumber: 2,
        label: 'Horizon 2 — 5m Diagnostic & Bench Steps',
        description: 'Evening Category 2 & 5 hands-on micro-sessions',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Run 3 five-minute starter sessions'],
      },
      {
        rungNumber: 3,
        label: 'Horizon 3 — Prototype & Utility Build',
        description: 'Iterative software or hardware build at flexible pace',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Assemble working prototype'],
      },
      {
        rungNumber: 4,
        label: 'Horizon 4 — Shipped Tool / Finished Craft',
        description: 'Deployed utility or completed hardware build',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 2,
        milestones: ['Archive finished sandbox build'],
      },
    ],
  },
  {
    id: 'music',
    name: 'Sandbox Track 2: Music & Acoustic Practice',
    archetypeRole: 'Fluid Instrument & Acoustic Play',
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
        label: 'Horizon 1 — Active Listening & Repertoire',
        description: 'Active listening, harmonic ear study, and arrangements',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Log 2 active listening sessions'],
      },
      {
        rungNumber: 2,
        label: 'Horizon 2 — 5m Cold Song Playthroughs',
        description: 'Evening Category 1 unpressured 5m play (zero drills)',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Complete 5m fluid sessions without grading'],
      },
      {
        rungNumber: 3,
        label: 'Horizon 3 — Full Piece Continuity',
        description: 'End-to-end unassisted song playthroughs',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 2,
        milestones: ['Complete 1 full unassisted piece'],
      },
      {
        rungNumber: 4,
        label: 'Horizon 4 — Acoustic Capture & Shared Play',
        description: 'Simple one-take acoustic recording or live jam',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 2,
        milestones: ['Save acoustic snapshot'],
      },
    ],
  },
  {
    id: 'culture',
    name: 'Sandbox Track 3: Foreign Culture & Language',
    archetypeRole: 'Spoken Audio, Cinema & Culinary Immersion',
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
        label: 'Horizon 1 — Spoken Audio Lessons',
        description: '5m spoken audio lessons on walks — zero SRS flashcards',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Complete 3 spoken audio walks'],
      },
      {
        rungNumber: 2,
        label: 'Horizon 2 — Foreign Cinema & Music',
        description: 'Evening Category 6 cultural film, music, and idiom intake',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Explore foreign cinema or music session'],
      },
      {
        rungNumber: 3,
        label: 'Horizon 3 — Culinary & Spoken Practice',
        description: 'Regional culinary prep and conversational recall',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 4,
        milestones: ['Prepare 1 regional dish or spoken dialogue'],
      },
      {
        rungNumber: 4,
        label: 'Horizon 4 — Real-World Cultural Immersion',
        description: 'Unscripted conversation & travel readiness',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 2,
        milestones: ['Hold unscripted conversation'],
      },
    ],
  },
];

export function buildGenericSevenDayPipeline(
  cruiseCeilingBlocks: number,
  floorBlocksCount: number
): PipelineDayEntry[] {
  const projCount = Math.max(0, cruiseCeilingBlocks - floorBlocksCount);
  const labels = ['Day 1 (Today)', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7'];
  return labels.map((label, idx) => ({
    dayIndex: idx + 1,
    dayLabel: label,
    loadMode: 'CRUISE',
    mode: 'CRUISE',
    modeAndAnchors: 'CRUISE (Standard Shift)',
    projectBlocksSummary: `${projCount} proj blocks`,
    deliverablesCompleted:
      projCount > 1
        ? `Primary Focus #1 (${projCount - 1}b) + Daily Ambition Drip (1b)`
        : 'Primary Focus #1',
    primaryDeliverable:
      projCount > 1
        ? `Primary Focus #1 (${projCount - 1}b) + Daily Ambition Drip (1b)`
        : 'Primary Focus #1',
    cruisePlus: false,
    baseTargetBlocks: cruiseCeilingBlocks,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'NONE',
    fixedEventTimeLabel: 'Standard Shift',
    earlyMorningAnchor: false,
    isToday: idx === 0,
  }));
}

export const PROFILE_PRESETS: Record<string, ProfilePresetDefinition> = {
  BALANCED_CORE: {
    id: 'BALANCED_CORE',
    title: 'Balanced Core + Projects (Default)',
    shortBadge: 'Balanced Core (4b Floor + 8b Projects)',
    subtitle: '4 Daily Maintenance Blocks (2 Recall/Admin + 2 Core Study) + Focus #1 & 1b Ambition Drip',
    description:
      'Universal daily cadence balancing 4 structured baseline blocks (80m) with serialized Focus #1 sprints plus a 1-block Daily Ambition Drip so zero days are 100% institutional.',
    floorCountLabel: '4-Block Daily Core (2b Recall/Admin + 2b Skill/Synthesis)',
    cruiseCeilingBlocks: 12,
    surgeCeilingBlocks: 14,
    taperCeilingBlocks: 8,
    taskWeights: { ...UNIVERSAL_TASK_WEIGHTS },
    breakOptions: { ...UNIVERSAL_BREAK_OPTIONS },
    upcomingMilestones: ['Primary Deliverable Target', 'Monthly Milestone Review'],
    baselineBlocks: [
      {
        id: 'bal_admin_1',
        title: 'Active Recall / Triage',
        category: 'FLASHCARDS_COMP',
        completed: false,
        completedBlocks: 0,
        targetBlocks: 2,
        earlyClearanceEligible: true,
        supportsEarlyClearance: true,
        lateNightBlocker: true,
        startupStep: 'Open review queue or daily triage list and clear the first 15 items.',
        trackId: 'science',
        cognitiveDemand: 'MECHANICAL_RECALL',
      },
      {
        id: 'bal_skill_1',
        title: 'Core Reading & Synthesis',
        category: 'SYNTHESIS',
        completed: false,
        completedBlocks: 0,
        targetBlocks: 2,
        earlyClearanceEligible: false,
        supportsEarlyClearance: false,
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
        title: 'Primary Institutional Deliverable (Focus #1)',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'science',
        subTrack: '1A_INSTITUTIONAL',
        startupStep: 'Open primary workspace and complete the first 5m concrete sub-step.',
        nextStepNote: 'Serialized Focus #1 — receives primary discretionary blocks.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
        isAmbitionDrip: false,
      },
      {
        id: 'proj_bal_2',
        slot: 2,
        title: 'Independent Writing / Long-Horizon Project',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 6,
        trackId: 'writing',
        startupStep: 'Open draft and revise 1 paragraph or structural section.',
        nextStepNote: 'Daily Ambition Drip Slot #2 (1 block / 20m reserved per non-exam day).',
        cognitiveDemand: 'DEEP_SYNTHESIS',
        isAmbitionDrip: true,
      },
      {
        id: 'proj_bal_3',
        slot: 3,
        title: 'Tactile / Engineering Sandbox Build',
        presetType: 'QUICK_2',
        completedBlocks: 0,
        totalBlocks: 3,
        trackId: 'coding',
        startupStep: 'Isolate 1 single 5m diagnostic or prototype step.',
        nextStepNote: 'Alternate Ambition Drip Slot #3.',
        cognitiveDemand: 'MECHANICAL_RECALL',
        isAmbitionDrip: true,
      },
    ],
    openListBacklog: [
      {
        id: 'proj_bal_b1',
        title: 'Upcoming Deliverable A',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        blocksTotal: 8,
        trackId: 'science',
        subTrack: '1A_INSTITUTIONAL',
        startupStep: 'Define scope and initial 3 milestones.',
        nextStepNote: 'Promotes automatically when Focus #1 completes.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
      {
        id: 'proj_bal_b2',
        title: 'Sequel / Phase 2 Independent Project',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        blocksTotal: 4,
        trackId: 'writing',
        blockedByTitle: 'Independent Writing / Long-Horizon Project',
        startupStep: 'Draft initial 4-point outline.',
        nextStepNote: 'Locked until "Independent Writing / Long-Horizon Project" is 100%.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
        isAmbitionDrip: true,
      },
    ],
    completedDeliverablesLog: [],
    stickySlots: JSON.parse(JSON.stringify(UNIVERSAL_STICKY_SLOTS)),
    fluidCategories: JSON.parse(JSON.stringify(UNIVERSAL_FLUID_CATEGORIES)),
    categoryCards: buildCategoryCardsFromLegacyMaps(
      UNIVERSAL_FLUID_CATEGORIES,
      UNIVERSAL_STICKY_SLOTS
    ),
    roadmapShelter: JSON.parse(JSON.stringify(DEFAULT_HOUSE_SHELTER)),
    roadmapFoundation: JSON.parse(JSON.stringify(DEFAULT_HOUSE_FOUNDATION)),
    roadmapTracks: JSON.parse(JSON.stringify(UNIVERSAL_ROADMAP_TRACKS)),
  },

  DEEP_PROJECT_BUILDER: {
    id: 'DEEP_PROJECT_BUILDER',
    title: 'Deep Project Builder (Low Daily Overhead)',
    shortBadge: 'Deep Builder (2b Floor + 10b Projects)',
    subtitle: 'Minimal 2-Block Daily Baseline (1b Triage + 1b Review) • High Focus #1 + 1b Ambition Drip',
    description:
      'Designed for makers, engineers, and deep project sprints. Keeps daily maintenance to a minimal 2-block floor (40m) so 80%+ of your shift goes into Focus #1 plus a 1-block Daily Ambition Drip.',
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
        supportsEarlyClearance: true,
        lateNightBlocker: false,
        startupStep: 'Clear critical blockers and define today’s #1 deliverable objective.',
        trackId: 'science',
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
        supportsEarlyClearance: true,
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
        title: 'Flagship Build / Major Deliverable',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'science',
        subTrack: '1A_INSTITUTIONAL',
        startupStep: 'Open primary project file and execute first 5m build step.',
        nextStepNote: 'Serialized Focus #1 — receives primary discretionary capacity.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
        isAmbitionDrip: false,
      },
      {
        id: 'proj_dpb_2',
        slot: 2,
        title: 'Independent Writing / Spec Milestone',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'writing',
        startupStep: 'Spec out interface or draft next section.',
        nextStepNote: 'Daily Ambition Drip Slot #2 (1b/day).',
        cognitiveDemand: 'DEEP_SYNTHESIS',
        isAmbitionDrip: true,
      },
      {
        id: 'proj_dpb_3',
        slot: 3,
        title: 'Hardware / Utility Sandbox Sprint',
        presetType: 'QUICK_2',
        completedBlocks: 0,
        totalBlocks: 2,
        trackId: 'coding',
        startupStep: 'Run 1 single 5m prototype or verification step.',
        nextStepNote: 'Alternate Ambition Drip Slot #3.',
        cognitiveDemand: 'LIGHT_ADMIN',
        isAmbitionDrip: true,
      },
    ],
    openListBacklog: [
      {
        id: 'proj_dpb_b1',
        title: 'Next Architecture / Project Build',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        blocksTotal: 8,
        trackId: 'science',
        subTrack: '1A_INSTITUTIONAL',
        startupStep: 'Write technical/project spec and first milestone.',
        nextStepNote: 'Queued in Open List backlog.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ],
    completedDeliverablesLog: [],
    stickySlots: JSON.parse(JSON.stringify(UNIVERSAL_STICKY_SLOTS)),
    fluidCategories: JSON.parse(JSON.stringify(UNIVERSAL_FLUID_CATEGORIES)),
    categoryCards: buildCategoryCardsFromLegacyMaps(
      UNIVERSAL_FLUID_CATEGORIES,
      UNIVERSAL_STICKY_SLOTS
    ),
    roadmapShelter: JSON.parse(JSON.stringify(DEFAULT_HOUSE_SHELTER)),
    roadmapFoundation: JSON.parse(JSON.stringify(DEFAULT_HOUSE_FOUNDATION)),
    roadmapTracks: JSON.parse(JSON.stringify(UNIVERSAL_ROADMAP_TRACKS)),
  },

  STUDY_HIGH_RETENTION: {
    id: 'STUDY_HIGH_RETENTION',
    title: 'Study & High-Retention (Habit-Heavy)',
    shortBadge: 'Study & Retention (6b Floor + 6b Projects)',
    subtitle: '6-Block Daily Baseline (3b Active Recall + 2b New Material + 1b Synthesis) + Focus #1 & Drip',
    description:
      'Built for intensive exams, certifications, or technical study. Enforces 2-way Early Clearance and Late-Night Blocker on 3 Active Recall blocks, paired with 2 New Material blocks and 1 Synthesis block.',
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
        title: 'Active Recall / Flashcard Queue',
        category: 'FLASHCARDS_COMP',
        completed: false,
        completedBlocks: 0,
        targetBlocks: 3,
        earlyClearanceEligible: true,
        supportsEarlyClearance: true,
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
        supportsEarlyClearance: false,
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
        supportsEarlyClearance: false,
        lateNightBlocker: false,
        startupStep: 'Condense today’s new material into 5 bulleted takeaways from memory.',
        trackId: 'science',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ],
    projectQueue: [
      {
        id: 'proj_shr_1',
        slot: 1,
        title: 'Primary Study / Assignment Deliverable',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        trackId: 'science',
        subTrack: '1A_INSTITUTIONAL',
        startupStep: 'Open problem set or paper draft and complete first 5m prompt.',
        nextStepNote: 'Serialized Focus #1.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
        isAmbitionDrip: false,
      },
      {
        id: 'proj_shr_2',
        slot: 2,
        title: 'Independent Writing / Personal Portfolio Piece',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'writing',
        startupStep: 'Draft 1 paragraph or section of independent work.',
        nextStepNote: 'Daily Ambition Drip Slot #2 (1b/day, auto-paused on Exam Days).',
        cognitiveDemand: 'DEEP_SYNTHESIS',
        isAmbitionDrip: true,
      },
      {
        id: 'proj_shr_3',
        slot: 3,
        title: 'Hands-On / Technical Sandbox Build',
        presetType: 'QUICK_2',
        completedBlocks: 0,
        totalBlocks: 2,
        trackId: 'coding',
        startupStep: 'Complete 1 five-minute setup or diagnostic step.',
        nextStepNote: 'Alternate Ambition Drip Slot #3.',
        cognitiveDemand: 'LIGHT_ADMIN',
        isAmbitionDrip: true,
      },
    ],
    openListBacklog: [
      {
        id: 'proj_shr_b1',
        title: 'Upcoming Module Synthesis Paper',
        presetType: 'PAPER_8',
        completedBlocks: 0,
        totalBlocks: 8,
        blocksTotal: 8,
        trackId: 'writing',
        startupStep: 'Outline core sections and references.',
        nextStepNote: 'Queued in Open List backlog.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ],
    completedDeliverablesLog: [],
    stickySlots: JSON.parse(JSON.stringify(UNIVERSAL_STICKY_SLOTS)),
    fluidCategories: JSON.parse(JSON.stringify(UNIVERSAL_FLUID_CATEGORIES)),
    categoryCards: buildCategoryCardsFromLegacyMaps(
      UNIVERSAL_FLUID_CATEGORIES,
      UNIVERSAL_STICKY_SLOTS
    ),
    roadmapShelter: JSON.parse(JSON.stringify(DEFAULT_HOUSE_SHELTER)),
    roadmapFoundation: JSON.parse(JSON.stringify(DEFAULT_HOUSE_FOUNDATION)),
    roadmapTracks: JSON.parse(JSON.stringify(UNIVERSAL_ROADMAP_TRACKS)),
  },

  MODULAR_BLANK_CANVAS: {
    id: 'MODULAR_BLANK_CANVAS',
    title: 'Modular Blank Canvas (Build From Scratch)',
    shortBadge: 'Blank Canvas (Inline Edit Ready)',
    subtitle: '1 Editable Baseline Slot ("Daily Habit 1", 2b) + 1 Focus #1 ("First Priority Project", 4b)',
    description:
      'Starts ultra-clean with 1 editable Baseline slot, 1 Focus #1 placeholder, generic Evening slots ("Activity 1–6"), and Structural House Tracks, immediately opening inline-edit mode.',
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
        supportsEarlyClearance: false,
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
        title: 'First Priority Project',
        presetType: 'SLIDES_4',
        completedBlocks: 0,
        totalBlocks: 4,
        trackId: 'science',
        subTrack: '1A_INSTITUTIONAL',
        startupStep: 'Open project and do 5m of work.',
        nextStepNote: 'Click any title or badge to customize inline.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ],
    openListBacklog: [],
    completedDeliverablesLog: [],
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
      CAT6_CULTURE: {
        label: '6. Culture & Language [Fluid]',
        activeTitle: 'Culture & Language',
        subtitle: 'Spoken audio lesson, foreign music/cinema, or culinary prep — zero SRS flashcards.',
        startupStep: '5m spoken audio lesson, foreign music/cinema, or culinary prep — zero SRS flashcards',
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
      {
        id: 'CAT6_CULTURE',
        slotNumber: 6,
        categoryName: 'Culture & Language',
        subtitle: 'Spoken audio lesson, foreign music/cinema, or culinary prep — zero SRS flashcards.',
        behavior: 'FLUID',
        trackMode: 'SINGLE',
        activeTitle: 'Culture & Language',
        startupPrompt: '5m spoken audio lesson, foreign music/cinema, or culinary prep — zero SRS flashcards',
        backlogQueue: [],
        fiveMinStarts: 0,
        unlockedViaCheckIn: false,
        hidden: false,
        legacyCategoryKey: 'CAT6_CULTURE',
        fluidKey: 'CAT6_CULTURE',
      },
    ],
    roadmapShelter: JSON.parse(JSON.stringify(DEFAULT_HOUSE_SHELTER)),
    roadmapFoundation: JSON.parse(JSON.stringify(DEFAULT_HOUSE_FOUNDATION)),
    roadmapTracks: (
      ['science', 'writing', 'coding', 'music', 'culture'] as RoadmapTrackId[]
    ).map((id, idx) => ({
      id,
      name:
        idx === 0
          ? 'Major Track 1: Primary Vocation & Research'
          : idx === 1
          ? 'Major Track 2: Writing & Authorship'
          : idx === 2
          ? 'Sandbox Track 1: Engineering, Software & Tactile Craft'
          : idx === 3
          ? 'Sandbox Track 2: Music & Acoustic Practice'
          : 'Sandbox Track 3: Foreign Culture & Language',
      archetypeRole: idx < 2 ? `Major Track ${idx + 1}` : `Sandbox Track ${idx - 1}`,
      categoryLabel: idx < 2 ? 'MAJOR CORE TRACK' : 'ZERO-QUOTA SANDBOX',
      isSandbox: idx >= 2,
      activeThisWeek: idx < 2,
      inputBlocksCredited: 0,
      inputWeeklyTarget: idx < 2 ? 10 : 0,
      outputBlocksCredited: 0,
      outputWeeklyTarget: idx < 2 ? 10 : 0,
      subTrack1ABlocksCredited: idx === 0 ? 0 : undefined,
      subTrack1BBlocksCredited: idx === 0 ? 0 : undefined,
      rungs: [
        {
          rungNumber: 1,
          label: 'Horizon 1 — Immediate Intake',
          description: 'Click to edit Horizon 1 description',
          ledgerType: 'INPUT',
          completedBlocks: 0,
          targetBlocks: 6,
          milestones: ['Milestone 1'],
        },
        {
          rungNumber: 2,
          label: 'Horizon 2 — Seasonal Synthesis',
          description: 'Click to edit Horizon 2 description',
          ledgerType: 'INPUT',
          completedBlocks: 0,
          targetBlocks: 4,
          milestones: ['Milestone 1'],
        },
        {
          rungNumber: 3,
          label: 'Horizon 3 — Annual Execution',
          description: 'Click to edit Horizon 3 description',
          ledgerType: 'OUTPUT',
          completedBlocks: 0,
          targetBlocks: 6,
          milestones: ['Milestone 1'],
        },
        {
          rungNumber: 4,
          label: 'Horizon 4 — Multi-Decade Horizon',
          description: 'Click to edit Horizon 4 description',
          ledgerType: 'OUTPUT',
          completedBlocks: 0,
          targetBlocks: 4,
          milestones: ['Milestone 1'],
        },
      ],
    })),
  },

  AVERY_DEFAULT: {
    id: 'AVERY_DEFAULT',
    title: 'Architect Live Preset (Medical Physics, Authorship & Hardware)',
    shortBadge: 'Architect Live',
    subtitle: 'Pre-Exam 50/50 Floor (2+2+2+1) + Practicum Proposal + Symmetrical Triptych Ed. 4 + K1C',
    description:
      'Synced live state: 2b Anatomy + 2b Comp (250 RemNote cap) + 2b Half-Chapter + 1b Synthesis, Practicum Proposal (1/6), Symmetrical Triptych Ed. 4 Drip, K1C 3D Printer (0/3), 6-Channel Evening Menu incl. Italian Culture & Language, and Structural House Roadmap.',
    isDefaultPersonal: true,
    floorCountLabel: '7-Block Pre-Exam 50/50 Floor (2b Anatomy + 2b Comp + 2b Read + 1b Synth)',
    cruiseCeilingBlocks: 12,
    surgeCeilingBlocks: 14,
    taperCeilingBlocks: 10,
    taskWeights: {
      ...DEFAULT_SYMMETRY_STATE.taskWeights!,
      quickLabel: 'Quick Task',
      quickBlocks: 2,
    },
    breakOptions: { ...DEFAULT_SYMMETRY_STATE.breakOptions! },
    upcomingMilestones: [...(DEFAULT_SYMMETRY_STATE.upcomingMilestones || [])],
    baselineBlocks: DEFAULT_SYMMETRY_STATE.baselineBlocks.map((b) => ({
      ...b,
      completed: false,
      bankedViaEarlyClearance: false,
      reallocatedViaEarlyClearance: false,
      reallocatedBlocksCount: 0,
    })),
    projectQueue: DEFAULT_SYMMETRY_STATE.projectQueue.map((p) => ({
      ...p,
    })),
    openListBacklog: JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE.openListBacklog)),
    completedDeliverablesLog: JSON.parse(
      JSON.stringify(DEFAULT_SYMMETRY_STATE.completedDeliverablesLog)
    ),
    stickySlots: JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE.recharge.stickySlots)),
    fluidCategories: JSON.parse(
      JSON.stringify(DEFAULT_SYMMETRY_STATE.recharge.fluidCategories)
    ),
    categoryCards: getEffectiveEveningCategoryCards(DEFAULT_SYMMETRY_STATE.recharge),
    roadmapShelter: JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE.roadmapShelter)),
    roadmapFoundation: JSON.parse(
      JSON.stringify(DEFAULT_SYMMETRY_STATE.roadmapFoundation)
    ),
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
      ...(UNIVERSAL_BREAK_OPTIONS),
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
          reallocatedViaEarlyClearance: false,
          reallocatedBlocksCount: 0,
        }))
      )
    ),
    projectQueue: JSON.parse(JSON.stringify(state.projectQueue)),
    openListBacklog: JSON.parse(JSON.stringify(state.openListBacklog || [])),
    completedDeliverablesLog: JSON.parse(
      JSON.stringify(state.completedDeliverablesLog || [])
    ),
    stickySlots: JSON.parse(JSON.stringify(state.recharge.stickySlots)),
    fluidCategories: JSON.parse(
      JSON.stringify(
        state.recharge.fluidCategories || UNIVERSAL_FLUID_CATEGORIES
      )
    ),
    categoryCards: JSON.parse(
      JSON.stringify(getEffectiveEveningCategoryCards(state.recharge))
    ),
    roadmapShelter: JSON.parse(
      JSON.stringify(state.roadmapShelter || DEFAULT_HOUSE_SHELTER)
    ),
    roadmapFoundation: JSON.parse(
      JSON.stringify(state.roadmapFoundation || DEFAULT_HOUSE_FOUNDATION)
    ),
    roadmapTracks: JSON.parse(
      JSON.stringify(migrateRoadmapTracksToHouseTopology(state.roadmapTracks))
    ),
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

export function isArchitectUrlPath(pathname?: string): boolean {
  const p = (
    pathname ??
    (typeof window !== 'undefined' ? window.location.pathname : '')
  ).toLowerCase();
  return /^\/(avery|architect)\/?$/.test(p);
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
    if (
      modeParam === 'avery' ||
      modeParam === 'architect' ||
      isArchitectUrlPath(window.location.pathname)
    ) {
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
    if (
      modeParam === 'avery' ||
      modeParam === 'architect' ||
      isArchitectUrlPath(window.location.pathname)
    ) {
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
  const fallbackFluid: FluidCategoriesMap =
    existingFluid || { ...UNIVERSAL_FLUID_CATEGORIES };
  const nextSticky: Record<StickyKey, StickyItemState> = JSON.parse(
    JSON.stringify(existingSticky)
  );
  const nextFluid: FluidCategoriesMap = JSON.parse(JSON.stringify(fallbackFluid));
  if (!nextFluid.CAT6_CULTURE) {
    nextFluid.CAT6_CULTURE = { ...UNIVERSAL_FLUID_CATEGORIES.CAT6_CULTURE! };
  }

  for (const card of cards) {
    if (card.fluidKey && nextFluid[card.fluidKey]) {
      nextFluid[card.fluidKey] = {
        ...nextFluid[card.fluidKey]!,
        label: `${card.slotNumber ?? 1}. ${card.categoryName}`,
        activeTitle: card.activeTitle,
        subtitle: card.subtitle || nextFluid[card.fluidKey]!.subtitle,
        startupStep: card.startupPrompt || card.startupStep || '',
        launchUrl: card.launchUrl,
        autoLaunchUrl: card.autoLaunchUrl,
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
        launchUrl: card.launchUrl,
        autoLaunchUrl: card.autoLaunchUrl,
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
            launchUrl: sub.launchUrl,
            autoLaunchUrl: sub.autoLaunchUrl,
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
  const isArchitectPreset = preset.id === 'AVERY_DEFAULT';

  const floorBlocks: BaselineBlock[] =
    options?.customFloorItems && options.customFloorItems.length > 0
      ? JSON.parse(JSON.stringify(options.customFloorItems))
      : JSON.parse(JSON.stringify(preset.baselineBlocks));

  const projectQueue: ProjectItem[] = keepWork
    ? JSON.parse(JSON.stringify(currentState.projectQueue))
    : JSON.parse(JSON.stringify(preset.projectQueue));

  if (!keepWork && options?.customPrimaryProjectTitle?.trim() && projectQueue.length > 0) {
    const cleanTitle = options.customPrimaryProjectTitle.trim();
    projectQueue[0] = {
      ...projectQueue[0],
      title: cleanTitle,
      totalBlocks: options.customPrimaryProjectBlocks || projectQueue[0].totalBlocks,
      startupStep: options.customPrimaryProjectStartup?.trim() || projectQueue[0].startupStep,
    };
  }

  let roadmapTracks: RoadmapTrack[] = migrateRoadmapTracksToHouseTopology(
    JSON.parse(JSON.stringify(preset.roadmapTracks))
  );
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

  const floorTotal = getTotalBaselineFloorBlocks(floorBlocks);
  const resolvedPipelineDays = keepWork
    ? currentState.pipelineDays.map((d, idx) =>
        idx === 0
          ? {
              ...d,
              baseTargetBlocks: cruiseCeiling,
              deductedBlocksFromExtension: 0,
            }
          : d
      )
    : isArchitectPreset
    ? JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE.pipelineDays))
    : buildGenericSevenDayPipeline(cruiseCeiling, floorTotal);

  const resolvedCompletedLog = keepWork
    ? currentState.completedDeliverablesLog
    : JSON.parse(JSON.stringify(preset.completedDeliverablesLog || []));

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
    loadMode: keepWork
      ? currentState.loadMode
      : isArchitectPreset
      ? DEFAULT_SYMMETRY_STATE.loadMode
      : 'CRUISE',
    preExamTaperActive: false,
    cruisePlus: keepWork ? currentState.cruisePlus : false,
    customModeBlockAdjustment:
      isArchitectPreset && !options?.customCruiseCeiling
        ? DEFAULT_SYMMETRY_STATE.customModeBlockAdjustment
        : cruiseCeiling,
    fixedEvent: keepWork
      ? currentState.fixedEvent
      : isArchitectPreset
      ? DEFAULT_SYMMETRY_STATE.fixedEvent
      : 'NONE',
    earlyClearanceEnabled: keepWork ? currentState.earlyClearanceEnabled : false,
    flashcardsReviewedCount: isArchitectPreset
      ? DEFAULT_SYMMETRY_STATE.flashcardsReviewedCount
      : keepWork
      ? currentState.flashcardsReviewedCount
      : 0,
    discretionaryBlocksCompletedToday: keepWork
      ? currentState.discretionaryBlocksCompletedToday
      : 0,
    dailyAmbitionDrip: keepWork && currentState.dailyAmbitionDrip
      ? { ...currentState.dailyAmbitionDrip }
      : {
          enabled: true,
          targetBlocksPerDay: 1,
          completedToday: 0,
          preferredSlotIndex: 1,
        },
    dailySovereignDripDone: keepWork
      ? Boolean(currentState.dailySovereignDripDone)
      : false,
    dailySovereignDripTarget: currentState.dailySovereignDripTarget ?? 1,
    sovereignGoldenRuleMode: currentState.sovereignGoldenRuleMode ?? true,
    todayBlockLog:
      isArchitectPreset && !keepWork
        ? DEFAULT_SYMMETRY_STATE.todayBlockLog
        : keepWork
        ? currentState.todayBlockLog
        : [],
    baselineBlocks: floorBlocks,
    baselineSlots: floorBlocks,
    projectQueue,
    projectBacklog: keepWork
      ? currentState.projectBacklog
      : JSON.parse(JSON.stringify(preset.openListBacklog)),
    openListBacklog: keepWork
      ? currentState.openListBacklog
      : JSON.parse(JSON.stringify(preset.openListBacklog)),
    completedDeliverablesLog: resolvedCompletedLog,
    completedDeliverablesArchive: resolvedCompletedLog,
    pipelineDays: resolvedPipelineDays,
    sevenDayPipeline: resolvedPipelineDays,
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
      activeStartupPrompt: primary
        ? getProjectActiveStartupStep(primary)
        : floorBlocks[0]?.startupStep || 'Complete 5m startup step.',
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
      completedLog: isArchitectPreset
        ? [...(DEFAULT_SYMMETRY_STATE.recharge.completedLog || [])]
        : keepWork
        ? currentState.recharge.completedLog
        : [],
    },
    roadmapShelter: preset.roadmapShelter
      ? JSON.parse(JSON.stringify(preset.roadmapShelter))
      : JSON.parse(JSON.stringify(DEFAULT_HOUSE_SHELTER)),
    roadmapFoundation: preset.roadmapFoundation
      ? JSON.parse(JSON.stringify(preset.roadmapFoundation))
      : JSON.parse(JSON.stringify(DEFAULT_HOUSE_FOUNDATION)),
    roadmapTracks,
  };
}

export function buildStateForPreset(
  presetOrId: ProfilePresetId | ProfilePresetDefinition,
  options?: ApplyPresetOptions
): SymmetryState {
  return applyPresetToState(DEFAULT_SYMMETRY_STATE, presetOrId, options);
}
