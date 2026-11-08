export type TabId = 'PIPELINE' | 'TIMER' | 'RECHARGE' | 'ROADMAP';

export type LoadMode = 'CRUISE' | 'SURGE' | 'TAPER';

export type FixedEventType = 'NONE' | 'LAB_2H' | 'VOLUNTEER' | 'EVENING_OUTING_6PM';

export type BaselineCategory = 'FLASHCARDS_ANATOMY' | 'FLASHCARDS_COMP' | 'READING' | 'SYNTHESIS';

export type ActiveTaskType = 'FLASHCARDS' | 'READING' | 'SYNTHESIS' | 'PROJECT';

export type TrackId = 'science' | 'writing' | 'personal' | 'coding' | 'music';

export interface BaselineBlock {
  id: string;
  title: string;
  category: BaselineCategory;
  completed: boolean;
  bankedViaEarlyClearance?: boolean;
  startupStep: string;
  trackId: TrackId;
}

export type ProjectPresetType = 'PAPER_8' | 'SLIDES_4' | 'CUSTOM';

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
  fiveMinStarts: number; // [X / 3] counter
  unlockedViaCheckIn: boolean;
}

export type RechargePacingStage =
  | 'STARTUP_5M'
  | 'WINDOW_20M'
  | 'WINDOW_40M'
  | 'MANDATORY_BREAK_60M';

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
  // 5 Recharge Categories
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
  completedLog?: string[];
}

export interface CompletedDeliverableEntry {
  id: string;
  title: string;
  trackId: TrackId;
  totalBlocks: number;
  completedAt: string;
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
}

export interface RoadmapTrack {
  id: TrackId;
  name: string;
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
  | 'EVENING_RECHARGE';

export interface TodayBlockLogEntry {
  id: string;
  timestamp: string;
  logicalDate: string;
  category: TodayBlockLogCategory;
  title: string;
  durationMinutes: number;
  roadmapTrack: string;
  stroke: 'INPUT' | 'OUTPUT';
  sourceBlockId?: string;
  stickyKey?: StickyKey;
  rungNumber?: 1 | 2 | 3 | 4;
}

export interface SymmetryState {
  version: string;
  logicalDayKey?: string; // 4:00 AM boundary day key (hours < 4 counts as previous day)
  todayBlockLog: TodayBlockLogEntry[];
  upcomingMilestones: string[];
  loadMode: LoadMode;
  cruisePlus: boolean;
  customModeBlockAdjustment: number; // e.g. 11 vs 12 for Cruise, 14 vs 15 for Surge, 7-9 for Taper
  surgeConsecutiveDays: number; // Hard cap max 2 consecutive Surge days
  midDayResetCompletedToday: boolean; // Mandatory 60-120m Mid-Day Reset after 7 blocks in Surge Mode
  fixedEvent: FixedEventType;
  flashcardsReviewedCount: number; // 250-card daily cap
  flashcardsDailyCap: number;
  earlyClearanceEnabled: boolean;
  baselineBlocks: BaselineBlock[];
  projectQueue: ProjectItem[];
  projectBacklog: Omit<ProjectItem, 'slot'>[];
  completedDeliverablesArchive?: CompletedDeliverableEntry[];
  pipelineDays: PipelineDay[];
  discretionaryBlocksCompletedToday: number;
  timer: TimerConsoleState;
  recharge: RechargeState;
  roadmapTracks: RoadmapTrack[];
}

