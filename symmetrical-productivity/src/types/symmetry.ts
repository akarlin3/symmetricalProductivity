export type TabId = 'PIPELINE' | 'TIMER' | 'RECHARGE' | 'ROADMAP';

export type LayoutMode = 'WIDGET' | 'SPLIT';

export type LoadMode = 'CRUISE' | 'SURGE' | 'TAPER';

export type BandwidthLevel = 'Sharp' | 'Steady' | 'Low';


export type FixedEventType = 'NONE' | 'LAB_2H' | 'VOLUNTEER' | 'EVENING_OUTING_6PM';

export type BaselineCategory = 'FLASHCARDS_ANATOMY' | 'FLASHCARDS_COMP' | 'READING' | 'SYNTHESIS';

export type ActiveTaskType = 'FLASHCARDS' | 'READING' | 'SYNTHESIS' | 'PROJECT';

export type TrackId = 'science' | 'writing' | 'personal' | 'coding' | 'music';
export type RoadmapTrackId = TrackId;

export type EnergyBandwidthState = 'SHARP' | 'STEADY' | 'LOW_FOGGY';

export type CognitiveDemandTag =
  | 'DEEP_SYNTHESIS'
  | 'MECHANICAL_RECALL'
  | 'LIGHT_ADMIN';

export type ElasticBlockMultiplier = 0.5 | 1.0 | 2.0;

export type StartupShrinkLevel = 1 | 2 | 3;

export type ShockAbsorberMode = 'FULL_SHIFT' | 'HALF_SHIFT' | 'MVF_FLOOR';

export type BlockCadencePreset =
  | '15_3_12'
  | '20_5_15'
  | '25_5_20'
  | '15M_3_12'
  | '20M_5_15'
  | '25M_5_20'
  | 'CADENCE_15_3_12'
  | 'CADENCE_20_5_15'
  | 'CADENCE_25_5_20';

export type ClosedListLockMode = 'STRICT_SERIALIZED' | 'DUAL_SLOT';

export type EveningPulseSensitivity = 'STANDARD_20_40_60' | 'GENTLE_40_60';

export interface StructureFlexibilityConfig {
  blockCadencePreset: BlockCadencePreset;
  closedListLockMode: ClosedListLockMode;
  activeFocusSlot?: 1 | 2;
  activeDualSlotNumber?: 1 | 2;
  slot1BlockedOnExternalFeedback?: boolean;
  eveningPulseSensitivity: EveningPulseSensitivity;
  boundedCuriositySandboxUsedToday?: boolean;
}

export interface BaselineBlock {
  id: string;
  title: string;
  category: BaselineCategory;
  completed: boolean;
  durationMinutes?: number;
  targetBlocks?: number; // 1..6 (defaults to 1)
  completedBlocks?: number; // 0..targetBlocks
  partialCredit?: number; // 0.5 when a 0.5x Micro-Block is logged
  bankedViaEarlyClearance?: boolean;
  earlyClearanceEligible?: boolean; // Toggleable per slot
  lateNightBlocker?: boolean; // Toggleable per slot (prevents scheduling as final block of night)
  startupStep: string;
  startupPrompt?: string;
  trackId: TrackId;
  cognitiveDemand?: CognitiveDemandTag;
}

export type ProjectPresetType = 'PAPER_8' | 'SLIDES_4' | 'QUICK_2' | 'CUSTOM';

export interface ProjectItem {
  id: string;
  slot: 1 | 2 | 3;
  title: string;
  presetType: ProjectPresetType;
  completedBlocks: number;
  totalBlocks: number;
  trackId: TrackId;
  startupStep: string;
  nextStepNote: string;
  cognitiveDemand?: CognitiveDemandTag;
  blockedOnExternalFeedback?: boolean;
}

export interface PipelineDay {
  dayIndex: number;
  dayLabel: string;
  loadMode: LoadMode;
  cruisePlus: boolean;
  baseTargetBlocks: number;
  deductedBlocksFromExtension: number;
  completedBlocks: number;
  fixedEvent: FixedEventType;
  fixedEventTimeLabel?: string;
  earlyMorningAnchor: boolean;
  isToday: boolean;
  primaryDeliverable?: string;
  modeAndAnchors?: string;
  projectBlocksSummary?: string;
  deliverablesCompleted?: string;
  eveningBridge?: string;
}

export type SmartIntakeLoadMode = 'CRUISE' | 'SURGE' | 'TAPER_LAB';

export type SmartIntakeRoadmapTrack =
  | 'SCIENCE'
  | 'WRITING'
  | 'HOME'
  | 'CODING_MAKER'
  | 'MUSIC';

export interface SmartIntakeFixedEvent {
  day: string;
  title: string;
  durationMinutes: number;
  earlyShutdown6PM: boolean;
}

export interface SmartIntakeClosedListItem {
  title: string;
  blocksTotal: number;
  startupStep5m: string;
  roadmapTrack: SmartIntakeRoadmapTrack;
}

export interface SmartIntakeBacklogItem {
  title: string;
  blocksTotal: number;
  startupStep5m: string;
  roadmapTrack: SmartIntakeRoadmapTrack;
}

export interface SmartIntakePipelineRow {
  day: string;
  modeAndAnchors: string;
  projectBlocks: string;
  deliverablesCompleted: string;
  eveningBridge: string;
}

export interface SmartIntakePlanResult {
  todayLoadMode: SmartIntakeLoadMode;
  fixedEvents: SmartIntakeFixedEvent[];
  closedListUpdates: SmartIntakeClosedListItem[];
  openListBacklog: (SmartIntakeBacklogItem | string)[];
  sevenDayPipeline: SmartIntakePipelineRow[];
  source?: 'GEMINI_2_5_FLASH' | 'LOCAL_FALLBACK';
}

export type TimerRunMode = 'WORK_20M' | 'BREAK_L1' | 'BREAK_L2' | 'BREAK_L3' | 'STRESS_RESET';

export type WorkStage = 'IGNITION_5M' | 'MOMENTUM_15M';

export type Level2BreakProtocol = 'ESPRESSO' | 'BASS_GUITAR_5M' | 'TENS_NORMATEC_15M';

export type StressResetProtocol = 'BREATHING_478' | 'ESPRESSO' | 'COMPRESSION_BOOTS';

export interface TimerConsoleState {
  mode: TimerRunMode;
  workStage: WorkStage;
  secondsLeft: number;
  targetEndTimeMs: number | null;
  isRunning: boolean;
  activeBlockSourceId: string;
  activeTaskTitle: string;
  activeTaskType: ActiveTaskType;
  activeStartupPrompt: string;
  elasticMultiplier?: ElasticBlockMultiplier; // 0.5x (10m), 1.0x (20m default), 2.0x (40m)
  startupShrinkLevel?: StartupShrinkLevel; // 1 (Default 5m), 2 (Micro-Setup), 3 (Zero-Pressure Entry)
  chainedBlocksCount: number; // 0, 1, or 2 (2 = 40m chained -> forces Level 2 10-15m break)
  sessionDisplayDurationMinutes: 20 | 40;
  l1DurationMinutes: 3 | 5;
  l2DurationMinutes: 10 | 15;
  l2Protocol: Level2BreakProtocol;
  l3DurationMinutes: 60 | 90 | 120;
  stressDurationMinutes: 15 | 20;
  stressProtocol: StressResetProtocol;
  queuedRecoveryFlashcard5m: boolean;
  recoveryFlashcardRunning: boolean;
  recoveryFlashcardSecondsLeft: number;
  recoveryFlashcardTargetEndTimeMs: number | null;
}

export type RechargeCategoryId =
  | 'NONE'
  | 'CAT1_MUSIC'
  | 'CAT2_MAKER'
  | 'CAT3_MEDIA'
  | 'CAT4_COMFORT'
  | 'CAT5_GAMING';

export type MediaSubTrackId = '3A_FICTION' | '3B_NONFICTION' | '3C_VIDEO';

export type StickyKey = 'CAT2_MAKER' | '3A_FICTION' | '3B_NONFICTION' | '3C_VIDEO' | 'CAT5_GAMING';

export interface StickySlotState {
  key: StickyKey;
  label: string;
  activeTitle: string;
  startupStep: string;
  backlogQueue: string[];
  queuedNextTitle: string; // Top item in backlogQueue ready for one-tap promotion
  fiveMinStarts: number; // [X / 3] counter
  startsLogged: number; // Alias synchronized with fiveMinStarts ([X / 3] starts)
  unlockedViaCheckIn: boolean;
  archivedTitles?: string[];
}

export type StickyItemState = StickySlotState;

export interface CompletedDeliverableEntry {
  id: string;
  title: string;
  date: string;
  completedDate: string;
  completedAt: string;
  blockCount: number;
  blocksCompleted: number;
  totalBlocks: number;
  trackId: TrackId;
  presetType?: ProjectPresetType;
}

export type RechargePacingStage =
  | 'STARTUP_5M'
  | 'WINDOW_20M'
  | 'WINDOW_40M'
  | 'MANDATORY_BREAK_60M';

export interface FluidCategoryConfig {
  label: string;
  activeTitle: string;
  subtitle: string;
  startupStep: string;
}

export interface FluidCategoriesMap {
  CAT1_MUSIC: FluidCategoryConfig;
  CAT4_COMFORT: FluidCategoryConfig;
}

export interface EveningSubTrackConfig {
  id: string; // e.g., '3A_FICTION' | '3B_NONFICTION' | '3C_VIDEO' | string
  label: string; // e.g., '3A Fiction', '3B Nonfiction', '3C Watch'
  activeTitle: string;
  startupStep?: string;
  startupPrompt?: string;
  speedControl?: boolean;
  backlogQueue: string[];
  fiveMinStarts: number;
  unlockedViaCheckIn: boolean;
}

export interface EveningCategoryCardConfig {
  id: string; // 'CAT1_MUSIC' | 'CAT2_MAKER' | 'CAT3_MEDIA' | 'CAT4_COMFORT' | 'CAT5_GAMING' | custom ID
  slotNumber?: number;
  categoryName: string; // e.g., '1. Creative / Hands-On' or '1. Music'
  subtitle?: string;
  behavior: 'FLUID' | 'STICKY';
  trackMode: 'SINGLE' | 'TRIPLE';
  hidden?: boolean;
  legacyCategoryKey?: RechargeCategoryId;
  stickyKey?: StickyKey;
  fluidKey?: 'CAT1_MUSIC' | 'CAT4_COMFORT';
  // Single-track properties
  activeTitle: string;
  startupStep?: string;
  startupPrompt?: string;
  backlogQueue: string[];
  fiveMinStarts: number;
  unlockedViaCheckIn: boolean;
  // Triple-track properties
  subTracks?: EveningSubTrackConfig[];
  activeSubTrackId?: string;
}

export type BuiltInProfilePresetId =
  | 'AVERY_DEFAULT'
  | 'BALANCED_CORE'
  | 'DEEP_PROJECT_BUILDER'
  | 'STUDY_HIGH_RETENTION'
  | 'MODULAR_BLANK_CANVAS'
  | 'ACADEMIC_RESEARCHER'
  | 'SOFTWARE_ENGINEER'
  | 'WRITER_CREATIVE'
  | 'BLANK_CUSTOM';

export type ProfilePresetId = BuiltInProfilePresetId | (string & {});

export interface TaskWeightsConfig {
  heavyLabel: string; // e.g. "Major Deliverable", "2-Page Paper"
  heavyBlocks: number; // Default 8 blocks
  mediumLabel: string; // e.g. "Medium Deliverable", "Slide Deck"
  mediumBlocks: number; // Default 4 blocks
  quickLabel?: string; // e.g. "Quick Sprint"
  quickBlocks?: number; // Default 2 blocks
}

export interface BreakOptionsConfig {
  l1Label: string; // 3-5m Same-Task Micro-Reset description
  l2EspressoLabel: string;
  l2MusicLabel: string;
  l2PhysicalLabel: string;
  stressBreathingLabel: string;
  stressEspressoLabel: string;
  stressBootsLabel: string;
  l1MicroResetLabel?: string;
  l2Option1Label?: string;
  l2Option2Label?: string;
  l2Option3Label?: string;
  stressResetLabel?: string;
}

export interface RechargeState {
  endOfShiftLocked: boolean;
  manualEveningPreview: boolean;
  // Flow Extension
  flowExtensionPromptOpen: boolean;
  flowExtensionActive: boolean;
  flowExtensionRunning: boolean;
  flowExtensionElapsedSeconds: number;
  flowExtensionStartTimeMs: number | null;
  flowExtensionBlocksLoggedToday: number;
  weeklyExtensionsUsed: number; // Hard cap: < 2
  lastChimeMinute: number;
  // Option 0: Rest / Stillness (20m, 2-window cap -> Fork Check)
  option0Running: boolean;
  option0SecondsLeft: number;
  option0TargetEndTimeMs: number | null;
  option0ConsecutiveWindows: number; // Cap at 2 (40m)
  forkCheckModalOpen: boolean;
  // 5+ Recharge Categories
  activeCategory: RechargeCategoryId;
  activeMediaTab: MediaSubTrackId;
  fictionSpeed: '1.75x' | '2.00x' | '2.25x';
  pacingStage: RechargePacingStage;
  categorySecondsLeft: number;
  categoryTargetEndTimeMs: number | null;
  categoryElapsedMinutes: number;
  categoryRunning: boolean;
  checkInModalOpen: boolean;
  checkInMilestone: 20 | 40;
  stickySlots: Record<StickyKey, StickySlotState>;
  fluidCategories?: FluidCategoriesMap;
  categoryCards?: EveningCategoryCardConfig[];
  completedLog?: string[];
}

export interface SequentialChecklistStep {
  stepNumber: number;
  id: string;
  kind: 'WORK_BLOCK' | 'BREAK_L1' | 'BREAK_L2' | 'BREAK_L3' | 'SHUTDOWN';
  blockNumber?: number; // 1..N for WORK_BLOCK
  sourceId?: string;
  title: string;
  categoryBadge: string;
  taskType?: ActiveTaskType;
  cognitiveDemand?: CognitiveDemandTag;
  startupStep: string;
  durationMinutes: number;
  chainPosition?: 1 | 2; // 1 = 20m, 2 = 40m
  remainingMinutesAfter: number;
  countdownBadge: string; // e.g. "[20m | 3h 40m work left]" -> "[0m work left — End-of-Shift Bridge]"
  completed: boolean;
  banked?: boolean;
  isCurrentNext: boolean;
}

export interface RoadmapRung {
  rungNumber: 1 | 2 | 3 | 4;
  label: string;
  description: string;
  ledgerType: 'INPUT' | 'OUTPUT';
  completedBlocks: number;
  targetBlocks: number;
  milestones?: string[];
}

export interface RoadmapTrack {
  id: TrackId;
  name: string;
  archetypeRole?: string;
  categoryLabel: 'CORE TRACK' | 'ZERO-QUOTA SANDBOX';
  isSandbox: boolean;
  activeThisWeek: boolean;
  inputBlocksCredited: number;
  inputWeeklyTarget: number;
  outputBlocksCredited: number;
  outputWeeklyTarget: number;
  rungs: RoadmapRung[];
}

export type TodayBlockLogCategory =
  | 'FLOOR_ANATOMY'
  | 'FLOOR_COMP'
  | 'FLOOR_READING'
  | 'FLOOR_SYNTHESIS'
  | 'PROJECT_FOCUS_1'
  | 'FLOW_EXTENSION'
  | 'EVENING_RECHARGE'
  | 'SANDBOX_CURIOSITY';

export interface TodayBlockLogEntry {
  id: string;
  timestamp: string;
  logicalDate: string;
  category: TodayBlockLogCategory;
  title: string;
  durationMinutes: number;
  blockUnits?: number; // 0.5, 1.0, or 2.0
  blockCredit?: number; // 0.5, 1.0, or 2.0
  roadmapTrack: string;
  stroke: 'INPUT' | 'OUTPUT';
  sourceBlockId?: string;
  stickyKey?: StickyKey;
  rungNumber?: 1 | 2 | 3 | 4;
}

export type SoundscapeMode = 'WARM_BROWN_NOISE' | 'SOFT_RAIN' | 'BINAURAL_40HZ';

export interface AudioEngineSettings {
  muted: boolean;
  volume: number; // 0..1
  soundscapeEnabled: boolean;
  soundscapeMode: SoundscapeMode;
  tactileClicksEnabled?: boolean;
}

export type DailyHistoryMode = LoadMode | 'EVENING_RECHARGE';

export interface DailyHistoryEntry {
  logicalDate: string;
  mode: DailyHistoryMode;
  blocksCompleted: number;
  inputBlocks: number;
  outputBlocks: number;
  eveningSessions: number;
}

export type BackupTriggerReason =
  | 'STATE_RESET'
  | 'RESET_DEFAULT'
  | 'NEW_DAY_RESET'
  | 'PRESET_SWITCH'
  | 'JSON_IMPORT'
  | 'MANUAL_SNAPSHOT';

export interface StateBackupSnapshot {
  id: string;
  createdAtIso: string;
  logicalDate: string;
  triggerReason: BackupTriggerReason;
  label: string;
  profileName: string;
  loadMode: LoadMode;
  blocksCompleted: number;
  targetBlocks: number;
  stateJson: string;
}

export interface SymmetryState {
  version: string;
  profilePresetId?: ProfilePresetId;
  profileName?: string;
  inlineEditModeActive?: boolean;
  logicalDayRolloverHour?: number; // Default: 4 (4:00 AM), adjustable 0..6 (12:00 AM to 6:00 AM)
  earlyEveningShutdownTime?: string; // Default: '6:00 PM'
  taskWeights?: TaskWeightsConfig;
  breakOptions?: BreakOptionsConfig;
  energyBandwidth?: EnergyBandwidthState; // 'SHARP' | 'STEADY' | 'LOW_FOGGY'
  shockAbsorberMode?: ShockAbsorberMode; // 'FULL_SHIFT' | 'HALF_SHIFT' | 'MVF_FLOOR'
  shockAbsorberDeferredBlocks?: number; // Number of project blocks shifted to tomorrow via Shock Absorber
  activeDualSlotNumber?: 1 | 2;
  flexibilityTuning?: StructureFlexibilityConfig;
  logicalDayKey?: string; // Logical day boundary key (hours < logicalDayRolloverHour counts as previous day)
  todayBlockLog: TodayBlockLogEntry[];
  dailyHistory?: DailyHistoryEntry[];
  stateBackups?: StateBackupSnapshot[];
  audioSettings?: AudioEngineSettings;
  upcomingMilestones: string[];
  bandwidth?: BandwidthLevel;
  loadMode: LoadMode;
  preExamTaperActive: boolean; // Cancels heavy prose/synthesis, caps at 7-9 blocks, routes strictly to Exam Review & Active Recall
  cruisePlus: boolean;
  customModeBlockAdjustment: number; // e.g. 11 vs 12 for Cruise, 14 vs 15 for Surge, 7-9 for Taper (or 3-6 under Shock Absorber)
  surgeConsecutiveDays: number; // Hard cap max 2 consecutive Surge days
  midDayResetCompletedToday: boolean; // Mandatory 60-120m Mid-Day Reset after 7 blocks in Surge Mode
  fixedEvent: FixedEventType;
  flashcardsReviewedCount: number; // 250-card daily cap
  flashcardsDailyCap: number;
  earlyClearanceEnabled: boolean;
  baselineBlocks: BaselineBlock[];
  projectQueue: ProjectItem[];
  projectBacklog: Omit<ProjectItem, 'slot'>[];
  openListBacklog: Omit<ProjectItem, 'slot'>[];
  completedDeliverablesLog: CompletedDeliverableEntry[];
  completedDeliverablesArchive?: CompletedDeliverableEntry[];
  pipelineDays: PipelineDay[];
  discretionaryBlocksCompletedToday: number;
  timer: TimerConsoleState;
  recharge: RechargeState;
  roadmapTracks: RoadmapTrack[];
}




