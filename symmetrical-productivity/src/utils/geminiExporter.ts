import {
  BandwidthLevel,
  BaselineBlock,
  BaselineCategory,
  FixedEventType,
  LoadMode,
  PipelineDay,
  ProjectItem,
  ProjectPresetType,
  StickyKey,
  SymmetryState,
  TrackId,
} from '../types/symmetry';
import {
  computeShiftMetrics,
  DEFAULT_SYMMETRY_STATE,
  formatRolloverHourLabel,
  getLogicalDayKey,
} from '../state/defaultState';
import {
  applySmartIntakePlanToState,
  normalizeSmartIntakePlan,
} from './smartIntakePlanner';
import { stripProSecretsFromStateObject } from './geminiClient';

export type GeminiExportMode =
  | 'MODE_A_SKILL_SYNC'
  | 'MODE_B_RECALIBRATE'
  | 'MODE_C_COPY_OPEN'
  | 'MODE_D_MARKDOWN'
  | 'MODE_D_JSON'
  | 'A'
  | 'B'
  | 'C'
  | 'D'
  | 'SKILL_SYNC'
  | 'RECALIBRATE'
  | 'COPY_OPEN'
  | 'STATE_MD'
  | 'JSON';

export const MODE_A_COMMAND_PREFIX =
  'Sync my wl-balancer state.md with this live export from Symmetrical Productivity and summarize my current runway:';

export interface RecalibratePromptPreset {
  id: string;
  label: string;
  prompt: string;
  description: string;
}

export const MODE_B_PROMPT_PRESETS: RecalibratePromptPreset[] = [
  {
    id: 'audit_7day_pipeline',
    label: 'Audit 7-Day Pipeline & Remaining Blocks',
    prompt: "Audit my 7-day pipeline & today's remaining blocks",
    description:
      'Review today’s remaining 20m block sequence, fixed event anchors, and 7-day load mode balance.',
  },
  {
    id: 'friction_recalibrate_today',
    label: 'Friction Triage & Recalibrate Today',
    prompt: "I'm hitting friction—help me recalibrate the rest of today",
    description:
      'Step down load mode or enable Early Clearance while protecting Closed List Focus #1.',
  },
  {
    id: 'audit_4rung_balance',
    label: 'Audit 4-Rung Input/Output Balance',
    prompt: 'Audit my 4-Rung Input/Output balance',
    description:
      'Inspect the 50% Input / 50% Output ledger across the 3 Core Tracks and 2 Zero-Quota Sandbox Tracks.',
  },
  {
    id: 'recalibrate_closed_list',
    label: 'Recalibrate Closed List & Next 5m Steps',
    prompt:
      'Review my Closed List #1–#3 and Open List Backlog, sharpen the 5m startup scripts, and output an updated state.md:',
    description:
      'Refine 5-minute startup scripts and sub-step breakdowns for active deliverables.',
  },
];

export interface GeminiExportOptions {
  customPrompt?: string;
  bandwidth?: BandwidthLevel;
}

export function resolveCurrentBandwidth(
  state: SymmetryState,
  override?: BandwidthLevel
): BandwidthLevel {
  if (override) return override;
  if (state.bandwidth) return state.bandwidth;
  if (state.energyBandwidth === 'LOW_FOGGY') return 'Low';
  if (state.energyBandwidth === 'STEADY') return 'Steady';
  if (state.energyBandwidth === 'SHARP') return 'Sharp';
  if (state.timer.mode === 'STRESS_RESET' || state.preExamTaperActive) {
    return 'Low';
  }
  if (state.loadMode === 'SURGE') {
    return 'Sharp';
  }
  if (state.loadMode === 'TAPER') {
    return 'Low';
  }
  return 'Sharp';
}

export function formatLoadModeTitle(loadMode: LoadMode, cruisePlus?: boolean): string {
  if (loadMode === 'SURGE') return 'Surge';
  if (loadMode === 'TAPER') return 'Taper';
  return cruisePlus ? 'Cruise+' : 'Cruise';
}

function buildDefaultSubStepsForProject(item: ProjectItem): string[] {
  const total = Math.max(1, item.totalBlocks);
  const done = Math.min(total, Math.max(0, item.completedBlocks));
  if (item.presetType === 'SLIDES_4' || total === 4) {
    return [
      `[${done >= 1 ? 'x' : ' '}] Block 1: 5m Startup (${item.startupStep}) + architecture & slide headers`,
      `[${done >= 2 ? 'x' : ' '}] Block 2: Primary figure panels & data table placement`,
      `[${done >= 3 ? 'x' : ' '}] Block 3: Mechanism bullet condensation & speaker notes`,
      `[${done >= 4 ? 'x' : ' '}] Block 4: Final visual verification & export check`,
    ];
  }
  return [
    `[${done >= 2 ? 'x' : ' '}] Blocks 1–2: 5m Startup (${item.startupStep}) + structural outline & core equations`,
    `[${done >= 4 ? 'x' : ' '}] Blocks 3–4: Primary section drafting & mechanism synthesis`,
    `[${done >= 6 ? 'x' : ' '}] Blocks 5–6: Results/discussion integration & figure cross-checks`,
    `[${done >= 8 ? 'x' : ' '}] Blocks 7–${total}: Citation verification, polish & final submission lock`,
  ];
}

export function buildPipelineRowData(
  day: PipelineDay,
  state: SymmetryState
): {
  dayCol: string;
  modeAndAnchorsCol: string;
  projectBlocksCol: string;
  exactDeliverablesCol: string;
  eveningBridgeCol: string;
} {
  const baselineFloorCount = state.baselineBlocks?.length || 7;
  const effectiveTarget = Math.max(
    baselineFloorCount,
    day.baseTargetBlocks - day.deductedBlocksFromExtension
  );
  const discretionaryBlocks = Math.max(0, effectiveTarget - baselineFloorCount);
  const primaryProject = state.projectQueue[0];
  const secondaryProject = state.projectQueue[1];
  const shutdownTime = state.earlyEveningShutdownTime || '6:00 PM';

  const modeName = formatLoadModeTitle(day.loadMode, day.cruisePlus);
  let anchorText = 'Duration-Only';
  if (day.fixedEvent === 'LAB_2H') {
    anchorText = day.fixedEventTimeLabel || '09:00 AM – 11:00 AM Lab Shift (~2h)';
  } else if (day.fixedEvent === 'VOLUNTEER') {
    anchorText = day.fixedEventTimeLabel || '01:00 PM – 03:00 PM Volunteer Shift';
  } else if (day.fixedEvent === 'EVENING_OUTING_6PM') {
    anchorText = day.fixedEventTimeLabel || `${shutdownTime} Evening Outing`;
  }
  if (day.earlyMorningAnchor && !anchorText.toLowerCase().includes('early')) {
    anchorText += ' [Early Morning Anchor]';
  }

  const deductionNote =
    day.deductedBlocksFromExtension > 0
      ? ` (-${day.deductedBlocksFromExtension}b Flow Ext)`
      : '';

  const modeAndAnchorsCol =
    day.modeAndAnchors ||
    `${modeName} (${effectiveTarget}b${deductionNote}) • ${anchorText}`;

  const projectBlocksCol =
    day.projectBlocksSummary ||
    `${discretionaryBlocks}b Discretionary (${baselineFloorCount}b Floor + ${discretionaryBlocks}b → Focus #1)`;

  const defaultDeliverable = primaryProject
    ? `${primaryProject.title} [Locked #1: ${primaryProject.completedBlocks}/${primaryProject.totalBlocks}b]${
        secondaryProject ? ` → Next #2: ${secondaryProject.title}` : ''
      }`
    : 'Closed List Focus #1 (100% Lock)';

  const exactDeliverablesCol = day.deliverablesCompleted || defaultDeliverable;

  let defaultBridge = 'End-of-Shift Lock → Option 0 Stillness / 5-Pillar Recharge Menu';
  if (day.fixedEvent === 'EVENING_OUTING_6PM') {
    defaultBridge = `${shutdownTime} Hard Lock → Evening Outing / Option 0 Stillness on Return`;
  } else if (day.loadMode === 'SURGE') {
    defaultBridge =
      'Mid-Day Reset (Block 7) • End-of-Shift Lock → Option 0 Stillness (20m) + 3A Fiction';
  } else if (day.loadMode === 'TAPER') {
    defaultBridge = 'Taper Recovery Bridge → Option 0 Stillness + Low-Friction Comfort/Music';
  }

  const eveningBridgeCol = day.eveningBridge || defaultBridge;

  return {
    dayCol: day.dayLabel,
    modeAndAnchorsCol,
    projectBlocksCol,
    exactDeliverablesCol,
    eveningBridgeCol,
  };
}

/**
 * Master Context Compiler (`compileFullGeminiPayload(state, mode, options)`):
 * Serializes 100% of the app's current state into a clean, structured Markdown + JSON document
 * containing Header Telemetry, Part I (On-Duty Capacity Governor), Part II (Off-Duty 5-Pillar Recharge),
 * Part III (4-Rung Master Horizon & Empirical History), and an Embedded Raw State JSON block.
 */
export function compileFullGeminiPayload(
  state: SymmetryState,
  mode: GeminiExportMode | string = 'STATE_MD',
  options?: GeminiExportOptions | string
): string {
  const normalizedMode = String(mode || 'STATE_MD').trim().toUpperCase();

  if (normalizedMode === 'MODE_D_JSON' || normalizedMode === 'JSON') {
    return JSON.stringify(state, null, 2);
  }

  const opts: GeminiExportOptions =
    typeof options === 'string' ? { customPrompt: options } : options || {};

  const metrics = computeShiftMetrics(state);
  const rolloverHour = state.logicalDayRolloverHour ?? 4;
  const rolloverLabel = formatRolloverHourLabel(rolloverHour);
  const logicalDate =
    state.logicalDayKey || getLogicalDayKey(new Date(), rolloverHour);
  const bandwidth = resolveCurrentBandwidth(state, opts.bandwidth);
  const loadModeDisplay = formatLoadModeTitle(state.loadMode, state.cruisePlus);
  const shutdownTime = state.earlyEveningShutdownTime || '6:00 PM';

  const todayLogEntries = (state.todayBlockLog || []).filter(
    (e) => !e.logicalDate || e.logicalDate === logicalDate
  );
  const loggedWorkMinutesFromLog = todayLogEntries.reduce(
    (acc, item) => acc + (Number(item.durationMinutes) || 20),
    0
  );
  const loggedMinutes = Math.max(
    metrics.totalCompletedBlocks * 20,
    loggedWorkMinutesFromLog
  );
  const liveCountdownFormatted = `[${loggedMinutes}m logged | ${metrics.remainingWorkFormatted}]`;

  const milestones = state.upcomingMilestones?.length
    ? state.upcomingMilestones.join(' • ')
    : 'Nov 12: Anatomy Exam • Dec 8–9: Comp Exam';

  // Flow Extension auto-recalibration delta for tomorrow
  const extraBlocksTonight = state.recharge.flowExtensionBlocksLoggedToday || 0;
  const tomorrowDay = state.pipelineDays[1];
  const autoRecalibrationDelta =
    extraBlocksTonight >= 3
      ? -2
      : extraBlocksTonight >= 2
      ? -1
      : tomorrowDay?.deductedBlocksFromExtension
      ? -tomorrowDay.deductedBlocksFromExtension
      : 0;
  const tomorrowHasEarlyAnchor = Boolean(
    tomorrowDay?.earlyMorningAnchor || tomorrowDay?.fixedEvent === 'LAB_2H'
  );
  const flowEligible =
    !tomorrowHasEarlyAnchor &&
    state.timer.activeTaskType !== 'FLASHCARDS' &&
    state.recharge.weeklyExtensionsUsed < 2;

  // Fluid & Sticky Recharge Categories
  const cat1Fluid =
    state.recharge.fluidCategories?.CAT1_MUSIC ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT1_MUSIC;
  const cat4Fluid =
    state.recharge.fluidCategories?.CAT4_COMFORT ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT4_COMFORT;
  const sMaker = state.recharge.stickySlots.CAT2_MAKER;
  const s3A = state.recharge.stickySlots['3A_FICTION'];
  const s3B = state.recharge.stickySlots['3B_NONFICTION'];
  const s3C = state.recharge.stickySlots['3C_VIDEO'];
  const sGaming = state.recharge.stickySlots.CAT5_GAMING;

  const rechargeLog =
    state.recharge.completedLog && state.recharge.completedLog.length > 0
      ? state.recharge.completedLog
      : DEFAULT_SYMMETRY_STATE.recharge.completedLog || [];

  // Part III: 4-Rung Input/Output & 14-day empirical velocity
  const totalInputBlocks = state.roadmapTracks.reduce(
    (sum, t) => sum + t.inputBlocksCredited,
    0
  );
  const totalOutputBlocks = state.roadmapTracks.reduce(
    (sum, t) => sum + t.outputBlocksCredited,
    0
  );
  const combinedLedgerBlocks = Math.max(1, totalInputBlocks + totalOutputBlocks);
  const inputPct = Math.round((totalInputBlocks / combinedLedgerBlocks) * 100);
  const outputPct = 100 - inputPct;

  const archiveList =
    state.completedDeliverablesArchive &&
    state.completedDeliverablesArchive.length > 0
      ? state.completedDeliverablesArchive
      : state.completedDeliverablesLog && state.completedDeliverablesLog.length > 0
      ? state.completedDeliverablesLog
      : DEFAULT_SYMMETRY_STATE.completedDeliverablesLog;

  const archivedBlocksSum = archiveList.reduce(
    (sum, d) => sum + (d.totalBlocks || d.blockCount || 0),
    0
  );
  const velocity14DayTotalBlocks = totalInputBlocks + totalOutputBlocks;
  const velocity14DayAvgPerDay = (velocity14DayTotalBlocks / 14).toFixed(1);
  const velocity14DayHours = ((velocity14DayTotalBlocks * 20) / 60).toFixed(1);

  const backlogList =
    state.openListBacklog && state.openListBacklog.length > 0
      ? state.openListBacklog
      : state.projectBacklog || [];

  const stateWithBandwidth: SymmetryState = {
    ...state,
    bandwidth,
  };

  const mdLines: string[] = [
    '# SymmetryManager (`wl-balancer`) — Master `state.md`',
    '',
    '## Header Telemetry',
    `- **Logical Date (${rolloverLabel} Rollover Boundary)**: \`${logicalDate}\` (Boundary: \`${rolloverLabel}\`, Early Outing Cutoff: \`${shutdownTime}\`)`,
    `- **Active Profile Preset**: ${state.profileName || DEFAULT_SYMMETRY_STATE.profileName} (\`${state.profilePresetId || 'AVERY_DEFAULT'}\`)`,
    `- **Current Bandwidth**: \`${bandwidth}\` (\`Sharp\` / \`Steady\` / \`Low\`)`,
    `- **Active Load Mode**: **${loadModeDisplay}** (\`${state.loadMode}\`${state.cruisePlus ? ' • Cruise+' : ''}${state.preExamTaperActive ? ' • Pre-Exam Taper Active' : ''}) — Target Ceiling: ${metrics.totalTargetBlocks} blocks`,
    `- **Consecutive Surge Days**: \`${state.surgeConsecutiveDays} / 2\``,
    `- **Live Countdown**: \`${liveCountdownFormatted}\` (HUD Readout: \`${metrics.durationPrefix}\`)`,
    `- **Fixed Event Anchor**: \`${state.fixedEvent}\` | **Upcoming Milestones**: ${milestones}`,
    '',
    '---',
    '',
    '# Part I: On-Duty Capacity Governor State',
    '',
    `## 1. Daily Core Baseline Slots (${metrics.completedBaselineCount} / ${state.baselineBlocks.length} Completed)`,
    `- **Baseline Floor Completion**: \`${metrics.completedBaselineCount} / ${state.baselineBlocks.length} blocks\` (Total Shift Progress: \`${metrics.totalCompletedBlocks} / ${metrics.totalTargetBlocks} blocks\`)`,
    `- **Early Clearance Status**: \`${state.earlyClearanceEnabled ? 'ENABLED — Unused Flashcard Blocks Banked as Free Time' : 'STANDARD PACING'}\` (Flashcard Queue: \`${state.flashcardsReviewedCount} / ${state.flashcardsDailyCap} cards\`)`,
    `- **Surge Mid-Day Reset (60–120m after Block 7)**: \`${state.midDayResetCompletedToday ? 'Completed' : 'Pending'}\``,
    ...state.baselineBlocks.map(
      (b) =>
        `- [${b.completed ? 'x' : b.bankedViaEarlyClearance ? 'B' : ' '}] **${b.title}** (\`${b.category}\` • Track: \`${b.trackId}\`) — 5m Startup: *${b.startupStep}*`
    ),
    '',
    `## 2. Today's Timestamped Block Log (Since ${rolloverLabel} Rollover)`,
    ...(todayLogEntries.length > 0
      ? todayLogEntries.map((entry) => {
          const timePart = entry.timestamp.includes('T')
            ? entry.timestamp.split('T')[1]?.slice(0, 5) || entry.timestamp
            : entry.timestamp;
          return `- \`[${entry.logicalDate} ${timePart}]\` **${entry.title}** — Duration: \`${entry.durationMinutes}m\` | Category: \`${entry.category}\` | Track: \`${entry.roadmapTrack}\` | Stroke: \`${entry.stroke}\`${entry.rungNumber ? ` (Rung ${entry.rungNumber})` : ''}`;
        })
      : [`- *(No blocks completed yet since ${rolloverLabel} logical day boundary)*`]),
    '',
    '## 3. Active Closed List (Max 3 Items — 100% Focus #1 Lock) & Open List Backlog',
    '### Active Closed List (Slots 1–3)',
    ...state.projectQueue.flatMap((p) => {
      const lockBadge =
        p.slot === 1
          ? 'UNLOCKED PRIMARY FOCUS #1 (100% Discretionary Project Lock)'
          : `LOCKED UNTIL ITEM #1 COMPLETES (Queue Slot #${p.slot})`;
      const subSteps = buildDefaultSubStepsForProject(p);
      return [
        `${p.slot}. **${p.title}** — \`[${p.completedBlocks} / ${p.totalBlocks} blocks]\` | Track: \`${p.trackId}\` | Preset: \`${p.presetType}\` | **${lockBadge}**`,
        `   - **5m Startup Step**: *${p.startupStep}*`,
        `   - **Next-Step Note**: ${p.nextStepNote || 'Ready for next 20m block.'}`,
        `   - **Sub-Steps Breakdown**: ${subSteps.join(' • ')}`,
      ];
    }),
    '',
    '### Open List Backlog (Deferred Deliverables)',
    ...(backlogList.length > 0
      ? backlogList.map(
          (b, idx) =>
            `- [Backlog #${idx + 1}] **${b.title}** — \`[${b.completedBlocks || 0} / ${b.totalBlocks} blocks]\` (\`${b.presetType}\`, Track: \`${b.trackId}\`) — 5m Startup: *${b.startupStep}*`
        )
      : ['- *(No deferred items in Open List Backlog)*']),
    '',
    '## 4. Full 7-Day Master Pipeline Markdown Table',
    '| Day | Mode & Fixed Anchors | Project Blocks | Exact Deliverables | Evening Bridge |',
    '| :--- | :--- | :--- | :--- | :--- |',
    ...state.pipelineDays.map((d) => {
      const row = buildPipelineRowData(d, state);
      return `| ${row.dayCol} | ${row.modeAndAnchorsCol} | ${row.projectBlocksCol} | ${row.exactDeliverablesCol} | ${row.eveningBridgeCol} |`;
    }),
    '',
    '## 5. Flow Extension Status & Auto-Recalibration Delta',
    `- **usedThisWeek**: \`${state.recharge.weeklyExtensionsUsed} / 2\` (Hard Cap: < 2 per week)`,
    `- **extraBlocksLoggedTonight**: \`${extraBlocksTonight} blocks\` (\`${Math.floor(state.recharge.flowExtensionElapsedSeconds / 60)}m\` open count-up elapsed)`,
    `- **Tomorrow's Auto-Recalibration Delta**: \`${autoRecalibrationDelta} project blocks\` (Deducts 1–2 project blocks from tomorrow's target for every 2–3 extension blocks logged)`,
    `- **Flow Extension Gate Status**: \`${flowEligible ? 'ELIGIBLE' : 'LOCKED'}\` (Tomorrow Early Anchor: \`${tomorrowHasEarlyAnchor ? 'Yes' : 'No'}\`, Active Task: \`${state.timer.activeTaskType}\`, Weekly Used: \`${state.recharge.weeklyExtensionsUsed}/2\`)`,
    '',
    '---',
    '',
    '# Part II: Off-Duty 5-Pillar Recharge State',
    '',
    '## 1. Option 0 (Bounded Stillness) & End-of-Shift Lock',
    `- **End-of-Shift Lock Status**: ${metrics.isZeroWorkLeft ? 'LOCKED (`[0m work left]` — Evening Menu Active)' : `ON-DUTY (\`${metrics.remainingWorkFormatted}\`)`}`,
    `- **Option 0 (Bounded Stillness) Windows Logged Tonight**: \`[${state.recharge.option0ConsecutiveWindows} / 2]\` (20m silent timer with zero startup step; capped at 2 consecutive windows [40m] -> Fork Check: "Go to Sleep" vs. "Start One 5m Activity")`,
    '',
    '## 2. All 5 Recharge Categories (Active Titles, `[X / 3]` Sticky Counters, 5m Startup Prompts & Queued Next Items)',
    `- **Category 1 — Music [Fluid]**: **${cat1Fluid.activeTitle}** — Counter: \`[Fluid]\` — 5m Startup: *${cat1Fluid.startupStep}* — Queued Next: *Instrument Rotation (Bass / Guitar / Piano / Drums)*`,
    `- **Category 2 — Maker / Hardware [Sticky]**: **${sMaker.activeTitle}** — Counter: \`[${sMaker.fiveMinStarts} / 3]\` — 5m Startup: *${sMaker.startupStep}* — Queued Next: **${sMaker.queuedNextTitle || sMaker.backlogQueue[0] || 'None'}** — Backlog: ${sMaker.backlogQueue.join(', ') || 'None'}`,
    `- **Category 3A — Media: Fiction [Sticky]**: **${s3A.activeTitle}** (${state.recharge.fictionSpeed}) — Counter: \`[${s3A.fiveMinStarts} / 3]\` — 5m Startup: *${s3A.startupStep}* — Queued Next: **${s3A.queuedNextTitle || s3A.backlogQueue[0] || 'None'}** — Backlog: ${s3A.backlogQueue.join(', ') || 'None'}`,
    `- **Category 3B — Media: Nonfiction [Sticky]**: **${s3B.activeTitle}** — Counter: \`[${s3B.fiveMinStarts} / 3]\` — 5m Startup: *${s3B.startupStep}* — Queued Next: **${s3B.queuedNextTitle || s3B.backlogQueue[0] || 'None'}** — Backlog: ${s3B.backlogQueue.join(', ') || 'None'}`,
    `- **Category 3C — Media: Visual Media / Video [Sticky]**: **${s3C.activeTitle}** — Counter: \`[${s3C.fiveMinStarts} / 3]\` — 5m Startup: *${s3C.startupStep}* — Queued Next: **${s3C.queuedNextTitle || s3C.backlogQueue[0] || 'None'}** — Backlog: ${s3C.backlogQueue.join(', ') || 'None'}`,
    `- **Category 4 — Comfort Show [Fluid]**: **${cat4Fluid.activeTitle}** — Counter: \`[Fluid]\` — 5m Startup: *${cat4Fluid.startupStep}* — Queued Next: *Episode Rotation (Away from Work Monitor)*`,
    `- **Category 5 — Gaming [Sticky]**: **${sGaming.activeTitle}** — Counter: \`[${sGaming.fiveMinStarts} / 3]\` — 5m Startup: *${sGaming.startupStep}* — Queued Next: **${sGaming.queuedNextTitle || sGaming.backlogQueue[0] || 'None'}** — Backlog: ${sGaming.backlogQueue.join(', ') || 'None'}`,
    '',
    '## 3. Completed Recharge Log',
    ...(rechargeLog.length > 0
      ? rechargeLog.map((entry) => `- [x] ${entry}`)
      : ['- *(No off-duty recharge sessions logged tonight)*']),
    '',
    '---',
    '',
    '# Part III: 4-Rung Master Horizon & Empirical History',
    '',
    '## 1. Global Input/Output Ledger & Recent 14-Day Block Velocity Summary',
    `- **Global Symmetrical Ledger Balance**: Input: **${totalInputBlocks} blocks (${inputPct}%)** | Output: **${totalOutputBlocks} blocks (${outputPct}%)** (Target: 50% Input / 50% Output)`,
    `- **Recent 14-Day Block Velocity Summary**: **${velocity14DayTotalBlocks} blocks (${velocity14DayHours}h)** logged across 14 days — Average Velocity: **${velocity14DayAvgPerDay} blocks/day** (${totalInputBlocks} INPUT / ${totalOutputBlocks} OUTPUT; ${archiveList.length} deliverables archived totaling ${archivedBlocksSum} blocks)`,
    '',
    '## 2. 3 Core Tracks & 2 Zero-Quota Sandbox Tracks Across Rungs 1–4',
    ...state.roadmapTracks.flatMap((t) => {
      const statusTag = t.isSandbox
        ? t.activeThisWeek
          ? 'Active Sandbox Session'
          : 'Flexible Pace / Coasting in Neutral'
        : 'Active Core Quota';
      const targetStr = t.isSandbox
        ? `INPUT: ${t.inputBlocksCredited} blocks (Zero-Quota) | OUTPUT: ${t.outputBlocksCredited} blocks (Zero-Quota)`
        : `INPUT: ${t.inputBlocksCredited} / ${t.inputWeeklyTarget} blocks | OUTPUT: ${t.outputBlocksCredited} / ${t.outputWeeklyTarget} blocks`;
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
    '## 3. Completed Deliverables Archive',
    ...(archiveList.length > 0
      ? archiveList.map(
          (item) =>
            `- [x] **${item.title}** — Track: \`${item.trackId}\` | Volume: \`${item.totalBlocks} blocks\` | Completed: \`${item.completedAt || item.date}\``
        )
      : ['- *(No archived deliverables yet)*']),
    '',
    '---',
    '',
    '## Embedded Raw State Block',
    '<details>',
    '<summary>Click to expand lossless SymmetryState JSON payload</summary>',
    '',
    '```json',
    JSON.stringify(stripProSecretsFromStateObject(stateWithBandwidth), null, 2),
    '```',
    '',
    '</details>',
    '',
  ];

  const coreMarkdownPayload = mdLines.join('\n');

  if (
    normalizedMode === 'MODE_A_SKILL_SYNC' ||
    normalizedMode === 'SKILL_SYNC' ||
    normalizedMode === 'A'
  ) {
    return `${MODE_A_COMMAND_PREFIX}\n\n${coreMarkdownPayload}`;
  }

  if (
    normalizedMode === 'MODE_B_RECALIBRATE' ||
    normalizedMode === 'RECALIBRATE' ||
    normalizedMode === 'B'
  ) {
    const promptInstruction =
      opts.customPrompt?.trim() || MODE_B_PROMPT_PRESETS[0].prompt;
    return `${promptInstruction}\n\n${coreMarkdownPayload}`;
  }

  // If caller passed a custom sentence as `mode` directly
  if (
    ![
      'MODE_C_COPY_OPEN',
      'COPY_OPEN',
      'C',
      'MODE_D_MARKDOWN',
      'STATE_MD',
      'MARKDOWN',
      'D',
    ].includes(normalizedMode) &&
    mode.trim().length > 12
  ) {
    return `${mode.trim()}\n\n${coreMarkdownPayload}`;
  }

  return coreMarkdownPayload;
}

export interface GeminiParseResult {
  nextState: SymmetryState;
  appliedChanges: string[];
}

/**
 * Reverse Bridge Parser (`parseGeminiResponseToState`):
 * Accepts ANY response pasted from Gemini:
 * - Full `state.md` Markdown (with or without embedded JSON block)
 * - Partial Markdown sections (7-Day Pipeline Table, Closed List items, Baseline checkboxes, Evening Recharge titles)
 * - Raw JSON block (`SymmetryState` or `SmartIntakePlanResult` or partial patch)
 * Returns the updated `SymmetryState` and a human-readable list of applied changes.
 */
export function parseGeminiResponseToState(
  rawInput: string,
  currentState: SymmetryState = DEFAULT_SYMMETRY_STATE
): GeminiParseResult {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Empty input: Paste a state.md document or JSON block from Gemini.');
  }

  let workingState: SymmetryState = JSON.parse(JSON.stringify(currentState));
  const appliedChanges: string[] = [];
  let matchedAnyStructure = false;

  // 1. Check for embedded ```json ... ``` block or raw JSON object
  const jsonFenceMatches = [...trimmed.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi)];
  let jsonCandidateStr: string | null = null;

  for (const m of jsonFenceMatches) {
    const inner = m[1].trim();
    if (inner.startsWith('{') && inner.endsWith('}')) {
      jsonCandidateStr = inner;
    }
  }
  if (!jsonCandidateStr && trimmed.startsWith('{') && trimmed.endsWith('}')) {
    jsonCandidateStr = trimmed;
  }

  if (jsonCandidateStr) {
    try {
      const parsedObj = JSON.parse(jsonCandidateStr);
      if (parsedObj && typeof parsedObj === 'object') {
        matchedAnyStructure = true;
        // Check if it is a SmartIntakePlanResult JSON
        if (
          Array.isArray(parsedObj.sevenDayPipeline) ||
          Array.isArray(parsedObj.closedListUpdates) ||
          typeof parsedObj.todayLoadMode === 'string'
        ) {
          const normalizedPlan = normalizeSmartIntakePlan(
            parsedObj,
            workingState,
            'GEMINI_2_5_FLASH'
          );
          workingState = applySmartIntakePlanToState(workingState, normalizedPlan);
          appliedChanges.push(
            `Applied Smart Intake Plan JSON (Today Mode: ${normalizedPlan.todayLoadMode}, ${normalizedPlan.closedListUpdates.length} Closed List items, 7-Day Pipeline)`
          );
        } else {
          // Full or partial SymmetryState JSON
          const defaultSticky = DEFAULT_SYMMETRY_STATE.recharge.stickySlots;
          const currentSticky = workingState.recharge.stickySlots;
          const parsedSticky = parsedObj.recharge?.stickySlots || {};

          const mergeStickySlot = (
            key: StickyKey
          ) => {
            const baseSlot = currentSticky[key] || defaultSticky[key];
            const rawSlot = parsedSticky[key];
            if (!rawSlot) return baseSlot;
            const starts =
              typeof rawSlot.startsLogged === 'number'
                ? rawSlot.startsLogged
                : typeof rawSlot.fiveMinStarts === 'number'
                ? rawSlot.fiveMinStarts
                : baseSlot.fiveMinStarts;
            const queue = Array.isArray(rawSlot.backlogQueue)
              ? rawSlot.backlogQueue
              : baseSlot.backlogQueue;
            return {
              ...baseSlot,
              ...rawSlot,
              backlogQueue: queue,
              queuedNextTitle: rawSlot.queuedNextTitle || queue[0] || '',
              fiveMinStarts: starts,
              startsLogged: starts,
            };
          };

          const resolvedBacklog = Array.isArray(parsedObj.openListBacklog)
            ? parsedObj.openListBacklog
            : Array.isArray(parsedObj.projectBacklog)
            ? parsedObj.projectBacklog
            : workingState.openListBacklog;

          const resolvedCompleted = Array.isArray(parsedObj.completedDeliverablesLog)
            ? parsedObj.completedDeliverablesLog
            : Array.isArray(parsedObj.completedDeliverablesArchive)
            ? parsedObj.completedDeliverablesArchive
            : workingState.completedDeliverablesLog;

          workingState = {
            ...workingState,
            ...parsedObj,
            bandwidth: parsedObj.bandwidth || workingState.bandwidth || 'Sharp',
            taskWeights: {
              ...(workingState.taskWeights || DEFAULT_SYMMETRY_STATE.taskWeights!),
              ...(parsedObj.taskWeights || {}),
            },
            breakOptions: {
              ...(workingState.breakOptions || DEFAULT_SYMMETRY_STATE.breakOptions!),
              ...(parsedObj.breakOptions || {}),
            },
            baselineBlocks:
              Array.isArray(parsedObj.baselineBlocks) &&
              parsedObj.baselineBlocks.length > 0
                ? parsedObj.baselineBlocks
                : workingState.baselineBlocks,
            projectQueue:
              Array.isArray(parsedObj.projectQueue) && parsedObj.projectQueue.length > 0
                ? parsedObj.projectQueue
                : workingState.projectQueue,
            projectBacklog: resolvedBacklog,
            openListBacklog: resolvedBacklog,
            completedDeliverablesLog: resolvedCompleted,
            completedDeliverablesArchive: resolvedCompleted,
            pipelineDays:
              Array.isArray(parsedObj.pipelineDays) && parsedObj.pipelineDays.length > 0
                ? parsedObj.pipelineDays
                : workingState.pipelineDays,
            roadmapTracks:
              Array.isArray(parsedObj.roadmapTracks) && parsedObj.roadmapTracks.length > 0
                ? parsedObj.roadmapTracks
                : workingState.roadmapTracks,
            timer: {
              ...workingState.timer,
              ...(parsedObj.timer || {}),
            },
            recharge: {
              ...workingState.recharge,
              ...(parsedObj.recharge || {}),
              fluidCategories: {
                CAT1_MUSIC: {
                  ...(workingState.recharge.fluidCategories?.CAT1_MUSIC ||
                    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT1_MUSIC),
                  ...(parsedObj.recharge?.fluidCategories?.CAT1_MUSIC || {}),
                },
                CAT4_COMFORT: {
                  ...(workingState.recharge.fluidCategories?.CAT4_COMFORT ||
                    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT4_COMFORT),
                  ...(parsedObj.recharge?.fluidCategories?.CAT4_COMFORT || {}),
                },
              },
              stickySlots: {
                CAT2_MAKER: mergeStickySlot('CAT2_MAKER'),
                '3A_FICTION': mergeStickySlot('3A_FICTION'),
                '3B_NONFICTION': mergeStickySlot('3B_NONFICTION'),
                '3C_VIDEO': mergeStickySlot('3C_VIDEO'),
                CAT5_GAMING: mergeStickySlot('CAT5_GAMING'),
              },
            },
          };
          appliedChanges.push('Synced embedded SymmetryState JSON payload');
        }
      }
    } catch {
      // Continue to Markdown parsing if JSON block was malformed
    }
  }

  // 2. Parse Markdown sections outside of ```json ... ``` blocks
  // Even if JSON was present, Gemini often edits the Markdown tables/lists above the JSON block!
  const mdText = trimmed.replace(/```(?:json)?[\s\S]*?```/gi, '');

  // 2A. Parse Current Bandwidth (`Sharp` / `Steady` / `Low`)
  const bandwidthMatch = mdText.match(
    /\*\*Current Bandwidth\*\*:\s*`?(Sharp|Steady|Low)`?/i
  );
  if (bandwidthMatch) {
    const rawBw = bandwidthMatch[1].toLowerCase();
    const bw: BandwidthLevel =
      rawBw === 'low' ? 'Low' : rawBw === 'steady' ? 'Steady' : 'Sharp';
    if (workingState.bandwidth !== bw) {
      appliedChanges.push(`Updated Bandwidth → ${bw}`);
    }
    workingState.bandwidth = bw;
    matchedAnyStructure = true;
  }

  // 2B. Parse Active Load Mode & Target Ceiling
  const modeMatch = mdText.match(
    /\*\*Active Load Mode\*\*:\s*(?:\*\*)?(Cruise\+|Cruise|Surge|Taper)(?:\*\*)?(?:\s*\(`?(CRUISE|SURGE|TAPER)`?[^)]*\))?(?:\s*\(Cruise\+\))?(?:[\s\S]*?Target Ceiling:\s*(\d+)\s*blocks)?/i
  );
  if (modeMatch) {
    const labelStr = modeMatch[1].toUpperCase();
    const codeStr = (modeMatch[2] || '').toUpperCase();
    const parsedMode: LoadMode =
      codeStr === 'SURGE' || labelStr.startsWith('SURGE')
        ? 'SURGE'
        : codeStr === 'TAPER' || labelStr.startsWith('TAPER')
        ? 'TAPER'
        : 'CRUISE';
    const isCruisePlus =
      labelStr.includes('+') || /\(Cruise\+\)/i.test(modeMatch[0]);
    const ceiling = modeMatch[3]
      ? Number(modeMatch[3])
      : parsedMode === 'SURGE'
      ? 14
      : parsedMode === 'TAPER'
      ? 8
      : isCruisePlus
      ? 13
      : 12;

    if (
      workingState.loadMode !== parsedMode ||
      workingState.customModeBlockAdjustment !== ceiling
    ) {
      appliedChanges.push(
        `Updated Today's Load Mode → ${parsedMode}${isCruisePlus ? '+' : ''} (${ceiling} blocks)`
      );
    }
    workingState.loadMode = parsedMode;
    workingState.cruisePlus = isCruisePlus;
    workingState.customModeBlockAdjustment = ceiling;
    matchedAnyStructure = true;
  }

  // 2C. Parse Consecutive Surge Days
  const surgeDaysMatch = mdText.match(
    /\*\*Consecutive Surge Days\*\*:\s*`?(\d+)\s*\/\s*2`?/i
  );
  if (surgeDaysMatch) {
    workingState.surgeConsecutiveDays = Math.min(
      2,
      Math.max(0, Number(surgeDaysMatch[1]))
    );
    matchedAnyStructure = true;
  }

  // 2D. Parse Fixed Event Anchor
  const fixedMatch = mdText.match(
    /\*\*Fixed Event Anchor\*\*:\s*`?(NONE|LAB_2H|VOLUNTEER|EVENING_OUTING_6PM)`?/i
  );
  if (fixedMatch) {
    workingState.fixedEvent = fixedMatch[1].toUpperCase() as FixedEventType;
    matchedAnyStructure = true;
  }

  // 2E. Parse Early Clearance Status
  const earlyClearanceMatch = mdText.match(
    /\*\*Early Clearance Status\*\*:\s*`?(ENABLED|Active|STANDARD PACING|Disabled)/i
  );
  if (earlyClearanceMatch) {
    const enabled = /enabled|active/i.test(earlyClearanceMatch[1]);
    workingState.earlyClearanceEnabled = enabled;
    matchedAnyStructure = true;
  }

  // 2F. Parse Daily Core Baseline checkboxes (`- [x] **Title** (CATEGORY...) — 5m Startup: *...*`)
  const baselineRegex =
    /^-\s*\[([xXbB\s])\]\s*\*\*([^*]+)\*\*\s*\(`?(FLASHCARDS_ANATOMY|FLASHCARDS_COMP|READING|SYNTHESIS)`?(?:[^)]*)\)(?:\s*—\s*5m Startup(?:\s*Script)?:\s*\*([^*]+)\*)?/gim;
  const baselineMatches = [...mdText.matchAll(baselineRegex)];
  if (baselineMatches.length > 0) {
    const updatedBaseline: BaselineBlock[] = [...workingState.baselineBlocks];
    let changedCount = 0;
    baselineMatches.forEach((m, idx) => {
      const mark = m[1].toUpperCase();
      const title = m[2].trim();
      const category = m[3].toUpperCase() as BaselineCategory;
      const startup = m[4]?.trim();
      const completed = mark === 'X';
      const banked = mark === 'B';

      const targetIdx = updatedBaseline.findIndex(
        (b, i) =>
          b.title.toLowerCase() === title.toLowerCase() ||
          (i === idx && b.category === category)
      );
      if (targetIdx >= 0) {
        const existing = updatedBaseline[targetIdx];
        if (
          existing.completed !== completed ||
          Boolean(existing.bankedViaEarlyClearance) !== banked ||
          existing.title !== title ||
          (startup && existing.startupStep !== startup)
        ) {
          changedCount++;
        }
        updatedBaseline[targetIdx] = {
          ...existing,
          title,
          category,
          completed,
          bankedViaEarlyClearance: banked,
          startupStep: startup || existing.startupStep,
        };
      }
    });
    workingState.baselineBlocks = updatedBaseline;
    matchedAnyStructure = true;
    if (changedCount > 0) {
      appliedChanges.push(
        `Updated Daily Core Baseline (${updatedBaseline.filter((b) => b.completed || b.bankedViaEarlyClearance).length}/${updatedBaseline.length} blocks cleared)`
      );
    }
  }

  // 2G. Parse Closed List Items (#1–#3)
  // Supports both single-line and multi-line formats:
  // `1. **Title** — `[2 / 8 blocks]` | Track: `science` ...`
  const closedListItemRegex =
    /^([123])\.\s*\*\*(?:\[[^\]]+\]\s*)?([^*]+)\*\*\s*—\s*(?:Progress:\s*)?`?\[(\d+)\s*\/\s*(\d+)\s*blocks?\]`?(?:[^\n]*?Track:\s*`?(science|writing|personal|coding|music)`?)?(?:[^\n]*?5m Startup(?:\s*Step)?:\s*\*([^*\n]+)\*)?(?:\n\s*-\s*\*\*5m Startup Step\*\*:\s*\*([^*\n]+)\*)?(?:\n\s*-\s*\*\*Next-Step Note\*\*:\s*([^\n]+))?/gim;
  const closedMatches = [...mdText.matchAll(closedListItemRegex)];
  if (closedMatches.length > 0) {
    const newQueue: ProjectItem[] = [...workingState.projectQueue];
    let updatedClosedCount = 0;

    for (const cm of closedMatches) {
      const slotNum = Number(cm[1]) as 1 | 2 | 3;
      const cleanTitle = cm[2].trim();
      const completedBlocks = Math.max(0, Number(cm[3]) || 0);
      const totalBlocks = Math.max(1, Number(cm[4]) || 8);
      const rawTrack = (cm[5] || '').toLowerCase() as TrackId;
      const startupStep = (cm[6] || cm[7] || '').trim();
      const nextStepNote = (cm[8] || '').trim();

      const existingIdx = newQueue.findIndex((p) => p.slot === slotNum);
      const existing = newQueue[existingIdx];
      const trackId: TrackId = ['science', 'writing', 'personal', 'coding', 'music'].includes(
        rawTrack
      )
        ? rawTrack
        : existing?.trackId || 'science';
      const presetType: ProjectPresetType =
        totalBlocks === 8 ? 'PAPER_8' : totalBlocks === 4 ? 'SLIDES_4' : 'CUSTOM';

      const updatedItem: ProjectItem = {
        id: existing?.id || `proj_${slotNum}`,
        slot: slotNum,
        title: cleanTitle,
        presetType,
        completedBlocks: Math.min(totalBlocks, completedBlocks),
        totalBlocks,
        trackId,
        startupStep:
          startupStep ||
          existing?.startupStep ||
          `Open "${cleanTitle}" and complete first 5m startup action.`,
        nextStepNote:
          nextStepNote ||
          existing?.nextStepNote ||
          (slotNum === 1
            ? 'Primary focus target (100% discretionary lock).'
            : 'Locked until Item #1 completes.'),
      };

      if (existingIdx >= 0) {
        newQueue[existingIdx] = updatedItem;
      } else {
        newQueue.push(updatedItem);
      }
      updatedClosedCount++;
    }

    workingState.projectQueue = newQueue.sort((a, b) => a.slot - b.slot).slice(0, 3);
    if (!workingState.timer.isRunning && workingState.projectQueue[0]) {
      const p1 = workingState.projectQueue[0];
      workingState.timer = {
        ...workingState.timer,
        activeBlockSourceId: p1.id,
        activeTaskTitle: p1.title,
        activeTaskType: 'PROJECT',
        activeStartupPrompt: p1.startupStep,
      };
    }
    matchedAnyStructure = true;
    appliedChanges.push(`Updated Closed List Queue (${updatedClosedCount} active items)`);
  }

  // 2H. Parse Open List Backlog (`- [Backlog #1] **Title** — `[0 / 8 blocks]` ... — 5m Startup: *...*`)
  const backlogRegex =
    /^-\s*\[Backlog\s*#\d+\]\s*\*\*([^*]+)\*\*\s*—\s*(?:Progress:\s*)?`?\[(\d+)\s*\/\s*(\d+)\s*blocks?\]`?(?:[^\n]*?Track:\s*`?(science|writing|personal|coding|music)`?)?(?:[^\n]*?5m Startup(?:\s*Step)?:\s*\*([^*\n]+)\*)?/gim;
  const backlogMatches = [...mdText.matchAll(backlogRegex)];
  if (backlogMatches.length > 0) {
    const parsedBacklog: Omit<ProjectItem, 'slot'>[] = backlogMatches.map((bm, i) => {
      const title = bm[1].trim();
      const completedBlocks = Math.max(0, Number(bm[2]) || 0);
      const totalBlocks = Math.max(1, Number(bm[3]) || 4);
      const rawTrack = (bm[4] || 'science').toLowerCase() as TrackId;
      const trackId: TrackId = ['science', 'writing', 'personal', 'coding', 'music'].includes(
        rawTrack
      )
        ? rawTrack
        : 'science';
      const startupStep =
        bm[5]?.trim() || `Open "${title}" and complete first 5m startup step.`;
      const presetType: ProjectPresetType =
        totalBlocks === 8 ? 'PAPER_8' : totalBlocks === 4 ? 'SLIDES_4' : 'CUSTOM';
      return {
        id: `backlog_sync_${i + 1}`,
        title,
        presetType,
        completedBlocks,
        totalBlocks,
        trackId,
        startupStep,
        nextStepNote: 'Queued in Open List Backlog.',
      };
    });
    workingState.projectBacklog = parsedBacklog;
    workingState.openListBacklog = parsedBacklog;
    matchedAnyStructure = true;
    appliedChanges.push(`Updated Open List Backlog (${parsedBacklog.length} items)`);
  }

  // 2I. Parse 7-Day Master Pipeline Markdown Table
  // Matches markdown table rows under 7-Day Pipeline
  const tableLines = mdText
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('|') && l.endsWith('|'));

  if (tableLines.length >= 3) {
    const headerCells = tableLines[0]
      .split('|')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);
    const is5ColMasterPipeline =
      headerCells.length === 5 &&
      headerCells[0].includes('day') &&
      (headerCells[1].includes('mode') || headerCells[2].includes('project'));
    const is6ColLegacyPipeline =
      headerCells.length === 6 &&
      headerCells[0].includes('day') &&
      headerCells[1].includes('load mode');

    const dataRows = tableLines.slice(2).filter((line) => !/^\|[\s:-]+\|$/.test(line));

    if ((is5ColMasterPipeline || is6ColLegacyPipeline) && dataRows.length > 0) {
      let surgeStreak = 0;
      const updatedDays: PipelineDay[] = workingState.pipelineDays.map(
        (existingDay, idx) => {
          const rawRow = dataRows[idx];
          if (!rawRow) return existingDay;
          const cells = rawRow
            .split('|')
            .slice(1, -1)
            .map((c) => c.trim());

          if (is5ColMasterPipeline && cells.length >= 5) {
            const [
              dayCol,
              modeAndAnchorsCol,
              projectBlocksCol,
              exactDeliverablesCol,
              eveningBridgeCol,
            ] = cells;
            const upperMode = modeAndAnchorsCol.toUpperCase();
            let loadMode: LoadMode = existingDay.loadMode;
            if (upperMode.includes('SURGE')) loadMode = 'SURGE';
            else if (upperMode.includes('TAPER')) loadMode = 'TAPER';
            else if (upperMode.includes('CRUISE')) loadMode = 'CRUISE';

            const cruisePlus = /CRUISE\+/i.test(modeAndAnchorsCol);

            // Enforce 2-consecutive-day Surge circuit breaker
            if (loadMode === 'SURGE') {
              if (surgeStreak >= 2) {
                loadMode = 'CRUISE';
                surgeStreak = 0;
              } else {
                surgeStreak++;
              }
            } else {
              surgeStreak = 0;
            }

            const blocksMatch = modeAndAnchorsCol.match(/\((\d+)\s*b(?:lks|locks)?/i);
            const baseTargetBlocks = blocksMatch
              ? Math.max(7, Math.min(18, Number(blocksMatch[1])))
              : loadMode === 'SURGE'
              ? 14
              : loadMode === 'TAPER'
              ? 8
              : cruisePlus
              ? 13
              : 12;

            let fixedEvent: FixedEventType = 'NONE';
            let fixedEventTimeLabel: string | undefined = undefined;
            if (/\blab\b/i.test(modeAndAnchorsCol)) {
              fixedEvent = 'LAB_2H';
              fixedEventTimeLabel = '09:00 AM – 11:00 AM Lab Shift (~2h)';
            } else if (/volunteer/i.test(modeAndAnchorsCol)) {
              fixedEvent = 'VOLUNTEER';
              fixedEventTimeLabel = '01:00 PM – 03:00 PM Volunteer Shift';
            } else if (
              /outing|6:00\s*pm|6\s*pm|early\s*shutdown|theater|show/i.test(
                modeAndAnchorsCol
              ) ||
              /outing|6:00\s*pm\s*hard\s*lock/i.test(eveningBridgeCol)
            ) {
              fixedEvent = 'EVENING_OUTING_6PM';
              fixedEventTimeLabel = `${
                workingState.earlyEveningShutdownTime || '6:00 PM'
              } Evening Outing`;
            }

            const earlyMorningAnchor =
              fixedEvent === 'LAB_2H' || /early.*anchor/i.test(modeAndAnchorsCol);

            return {
              ...existingDay,
              dayLabel: dayCol || existingDay.dayLabel,
              loadMode,
              cruisePlus,
              baseTargetBlocks,
              fixedEvent,
              fixedEventTimeLabel,
              earlyMorningAnchor,
              modeAndAnchors: modeAndAnchorsCol,
              projectBlocksSummary: projectBlocksCol,
              deliverablesCompleted: exactDeliverablesCol,
              eveningBridge: eveningBridgeCol,
            };
          }

          if (is6ColLegacyPipeline && cells.length >= 6) {
            const [dayCol, modeCol, targetCol, deductCol, fixedCol, earlyCol] =
              cells;
            const upperMode = modeCol.toUpperCase();
            const loadMode: LoadMode = upperMode.includes('SURGE')
              ? 'SURGE'
              : upperMode.includes('TAPER')
              ? 'TAPER'
              : 'CRUISE';
            const cruisePlus = modeCol.includes('+');
            const targetMatch = targetCol.match(/(\d+)/);
            const baseTargetBlocks = targetMatch
              ? Number(targetMatch[1])
              : existingDay.baseTargetBlocks;
            const deductMatch = deductCol.match(/(\d+)/);
            const deductedBlocksFromExtension = deductMatch
              ? Number(deductMatch[1])
              : 0;
            let fixedEvent: FixedEventType = 'NONE';
            if (fixedCol.includes('LAB_2H')) fixedEvent = 'LAB_2H';
            else if (fixedCol.includes('VOLUNTEER')) fixedEvent = 'VOLUNTEER';
            else if (fixedCol.includes('EVENING_OUTING_6PM'))
              fixedEvent = 'EVENING_OUTING_6PM';

            return {
              ...existingDay,
              dayLabel: dayCol || existingDay.dayLabel,
              loadMode,
              cruisePlus,
              baseTargetBlocks,
              deductedBlocksFromExtension,
              fixedEvent,
              earlyMorningAnchor: /yes/i.test(earlyCol),
            };
          }

          return existingDay;
        }
      );

      workingState.pipelineDays = updatedDays;
      const day1 = updatedDays[0];
      if (day1 && !modeMatch) {
        workingState.loadMode = day1.loadMode;
        workingState.cruisePlus = day1.cruisePlus;
        workingState.customModeBlockAdjustment = day1.baseTargetBlocks;
        workingState.fixedEvent = day1.fixedEvent;
      }
      matchedAnyStructure = true;
      appliedChanges.push(
        `Updated 7-Day Master Pipeline Table (${Math.min(7, dataRows.length)} days)`
      );
    }
  }

  // 2J. Parse Part II: Option 0 & Evening Recharge Categories (Titles, [X / 3] counters, 5m Startup Prompts, Queued Next)
  const opt0Match = mdText.match(
    /Option 0[\s\S]*?`?\[(\d+)\s*\/\s*2\]`?/i
  );
  if (opt0Match) {
    workingState.recharge.option0ConsecutiveWindows = Math.min(
      2,
      Math.max(0, Number(opt0Match[1]))
    );
    matchedAnyStructure = true;
  }

  // Fluid Category 1 & Category 4
  const cat1Match = mdText.match(
    /Category 1\s*—\s*Music\s*\[Fluid\]\*\*:\s*(?:\*\*)?([^*\n—]+)(?:\*\*)?(?:[^\n]*?5m Startup(?:\s*Prompt)?:\s*\*([^*\n]+)\*)?/i
  );
  if (cat1Match && workingState.recharge.fluidCategories) {
    workingState.recharge.fluidCategories.CAT1_MUSIC = {
      ...workingState.recharge.fluidCategories.CAT1_MUSIC,
      activeTitle: cat1Match[1].trim(),
      startupStep:
        cat1Match[2]?.trim() ||
        workingState.recharge.fluidCategories.CAT1_MUSIC.startupStep,
    };
    matchedAnyStructure = true;
  }

  const cat4Match = mdText.match(
    /Category 4\s*—\s*Comfort Show\s*\[Fluid\]\*\*:\s*(?:\*\*)?([^*\n—]+)(?:\*\*)?(?:[^\n]*?5m Startup(?:\s*Prompt)?:\s*\*([^*\n]+)\*)?/i
  );
  if (cat4Match && workingState.recharge.fluidCategories) {
    workingState.recharge.fluidCategories.CAT4_COMFORT = {
      ...workingState.recharge.fluidCategories.CAT4_COMFORT,
      activeTitle: cat4Match[1].trim(),
      startupStep:
        cat4Match[2]?.trim() ||
        workingState.recharge.fluidCategories.CAT4_COMFORT.startupStep,
    };
    matchedAnyStructure = true;
  }

  // Sticky Categories: 2, 3A, 3B, 3C, 5
  const stickyLineConfigs: { key: StickyKey; regex: RegExp }[] = [
    {
      key: 'CAT2_MAKER',
      regex:
        /Category 2\s*—\s*Maker[^\n]*?:\s*(?:\*\*)?([^*\n—]+?)(?:\*\*)?\s*—\s*(?:Sticky\s*)?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?(?:[^\n]*?5m Startup(?:\s*Prompt)?:\s*\*([^*\n]+)\*)?(?:[^\n]*?Queued Next:\s*\*\*([^*]+)\*\*)?/i,
    },
    {
      key: '3A_FICTION',
      regex:
        /Category 3A\s*—\s*Media:\s*Fiction[^\n]*?:\s*(?:\*\*)?([^*\n—(]+?)(?:\*\*)?(?:\s*\((1\.75x|2\.00x|2\.25x)\))?\s*—\s*(?:Sticky\s*)?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?(?:[^\n]*?5m Startup(?:\s*Prompt)?:\s*\*([^*\n]+)\*)?(?:[^\n]*?Queued Next:\s*\*\*([^*]+)\*\*)?/i,
    },
    {
      key: '3B_NONFICTION',
      regex:
        /Category 3B\s*—\s*Media:\s*Nonfiction[^\n]*?:\s*(?:\*\*)?([^*\n—]+?)(?:\*\*)?\s*—\s*(?:Sticky\s*)?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?(?:[^\n]*?5m Startup(?:\s*Prompt)?:\s*\*([^*\n]+)\*)?(?:[^\n]*?Queued Next:\s*\*\*([^*]+)\*\*)?/i,
    },
    {
      key: '3C_VIDEO',
      regex:
        /Category 3C\s*—\s*Media:\s*(?:Visual Media\s*\/\s*)?Video[^\n]*?:\s*(?:\*\*)?([^*\n—]+?)(?:\*\*)?\s*—\s*(?:Sticky\s*)?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?(?:[^\n]*?5m Startup(?:\s*Prompt)?:\s*\*([^*\n]+)\*)?(?:[^\n]*?Queued Next:\s*\*\*([^*]+)\*\*)?/i,
    },
    {
      key: 'CAT5_GAMING',
      regex:
        /Category 5\s*—\s*Gaming[^\n]*?:\s*(?:\*\*)?([^*\n—]+?)(?:\*\*)?\s*—\s*(?:Sticky\s*)?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?(?:[^\n]*?5m Startup(?:\s*Prompt)?:\s*\*([^*\n]+)\*)?(?:[^\n]*?Queued Next:\s*\*\*([^*]+)\*\*)?/i,
    },
  ];

  let updatedRechargeCategories = 0;
  for (const cfg of stickyLineConfigs) {
    const m = mdText.match(cfg.regex);
    if (!m) continue;
    const slot = workingState.recharge.stickySlots[cfg.key];
    if (cfg.key === '3A_FICTION') {
      const title = m[1].trim();
      const speed = m[2] as '1.75x' | '2.00x' | '2.25x' | undefined;
      const count = Math.min(3, Math.max(0, Number(m[3])));
      const startup = m[4]?.trim();
      const queuedNext = m[5]?.trim();
      if (speed) {
        workingState.recharge.fictionSpeed = speed;
      }
      workingState.recharge.stickySlots['3A_FICTION'] = {
        ...slot,
        activeTitle: title || slot.activeTitle,
        fiveMinStarts: count,
        startsLogged: count,
        startupStep: startup || slot.startupStep,
        queuedNextTitle:
          queuedNext && queuedNext !== 'None' ? queuedNext : slot.queuedNextTitle,
      };
      updatedRechargeCategories++;
    } else {
      const title = m[1].trim();
      const count = Math.min(3, Math.max(0, Number(m[2])));
      const startup = m[3]?.trim();
      const queuedNext = m[4]?.trim();
      workingState.recharge.stickySlots[cfg.key] = {
        ...slot,
        activeTitle: title || slot.activeTitle,
        fiveMinStarts: count,
        startsLogged: count,
        startupStep: startup || slot.startupStep,
        queuedNextTitle:
          queuedNext && queuedNext !== 'None' ? queuedNext : slot.queuedNextTitle,
      };
      updatedRechargeCategories++;
    }
  }

  if (updatedRechargeCategories > 0) {
    matchedAnyStructure = true;
    appliedChanges.push(
      `Updated Evening Recharge Titles & Sticky [X/3] Counters (${updatedRechargeCategories} categories)`
    );
  }

  if (!matchedAnyStructure) {
    throw new Error(
      'Could not detect valid state.md sections, 7-Day Pipeline table, Closed List items, or JSON block in pasted text.'
    );
  }

  if (appliedChanges.length === 0) {
    appliedChanges.push('Parsed and synchronized state.md payload');
  }

  return {
    nextState: workingState,
    appliedChanges,
  };
}

export {
  parseGeminiResponseToStatePatch,
  encodeGeminiSyncPayloadToBase64Url,
  decodeGeminiSyncBase64Url,
  extractGeminiSyncParamFromLocation,
  buildGeminiSyncDeepLinkUrl,
  type GeminiDetectedFormat,
  type GeminiDetectedHighlights,
  type GeminiStatePatchResult,
} from './geminiImporter';

