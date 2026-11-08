import {
  FixedEventType,
  LoadMode,
  PipelineDay,
  ProjectItem,
  ProjectPresetType,
  SmartIntakeBacklogItem,
  SmartIntakeClosedListItem,
  SmartIntakeFixedEvent,
  SmartIntakeLoadMode,
  SmartIntakePipelineRow,
  SmartIntakePlanResult,
  SmartIntakeRoadmapTrack,
  SymmetryState,
  TrackId,
} from '../types/symmetry';

export const GEMINI_API_KEY_STORAGE_KEY = 'geminiApiKey';

export const GEMINI_ENDPOINT =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export function getStoredGeminiApiKey(): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return (window.localStorage.getItem(GEMINI_API_KEY_STORAGE_KEY) || '').trim();
    }
  } catch {
    // Ignore storage read errors in restricted contexts
  }
  return '';
}

export function setStoredGeminiApiKey(key: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const trimmed = key.trim();
      if (trimmed) {
        window.localStorage.setItem(GEMINI_API_KEY_STORAGE_KEY, trimmed);
      } else {
        window.localStorage.removeItem(GEMINI_API_KEY_STORAGE_KEY);
      }
    }
  } catch {
    // Ignore storage write errors
  }
}

export function getEnvGeminiApiKey(): string {
  try {
    const envObj = (import.meta as unknown as { env?: Record<string, string | undefined> })?.env;
    return (envObj?.VITE_GEMINI_API_KEY || '').trim();
  } catch {
    return '';
  }
}

export function getEffectiveGeminiApiKey(): string {
  return getStoredGeminiApiKey() || getEnvGeminiApiKey();
}

export const SMART_INTAKE_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    todayLoadMode: {
      type: 'STRING',
      enum: ['CRUISE', 'SURGE', 'TAPER_LAB'],
      description:
        'Load mode for Today: CRUISE (11-12 blocks), SURGE (14-15 blocks, max 2 consecutive days), or TAPER_LAB (7-9 blocks when a ~2h Lab is scheduled today).',
    },
    fixedEvents: {
      type: 'ARRAY',
      description:
        'Fixed wall-clock events such as 2h Labs, Volunteer shifts, or 6:00 PM Evening Outings/Shows/Theater/D&D.',
      items: {
        type: 'OBJECT',
        properties: {
          day: {
            type: 'STRING',
            description: 'Day label (e.g., Today, Mon, Tue, Wed, Thu, Fri, Sat, Sun).',
          },
          title: {
            type: 'STRING',
            description: 'Short mechanical title of the fixed event (e.g., Lab Shift, Theater Outing).',
          },
          durationMinutes: {
            type: 'INTEGER',
            description: 'Duration in minutes (e.g., 120 for 2h Lab).',
          },
          earlyShutdown6PM: {
            type: 'BOOLEAN',
            description:
              'True if this event is an evening show, theater, D&D session, or 6:00 PM outing requiring a 6 PM work shutdown.',
          },
        },
        required: ['day', 'title', 'durationMinutes', 'earlyShutdown6PM'],
      },
    },
    closedListUpdates: {
      type: 'ARRAY',
      description:
        'Top active deliverables for the Closed List (hard cap of max 3 items). Calibrate 2-page papers/reports at 8 blocks and slide decks at 4 blocks. Include a concrete 5-minute startup step for each.',
      items: {
        type: 'OBJECT',
        properties: {
          title: {
            type: 'STRING',
            description: 'Deliverable title.',
          },
          blocksTotal: {
            type: 'INTEGER',
            description: 'Total 20-minute blocks (8 for 2-page paper/report, 4 for slide deck).',
          },
          startupStep5m: {
            type: 'STRING',
            description: 'Concrete, mechanical 5-minute startup action (IGNITION_5M).',
          },
          roadmapTrack: {
            type: 'STRING',
            enum: ['SCIENCE', 'WRITING', 'HOME', 'CODING_MAKER', 'MUSIC'],
            description: '4-Rung Roadmap track category.',
          },
        },
        required: ['title', 'blocksTotal', 'startupStep5m', 'roadmapTrack'],
      },
    },
    openListBacklog: {
      type: 'ARRAY',
      description:
        'Flexible or soft-deadline items demoted out of the top 3 Closed List slots.',
      items: {
        type: 'OBJECT',
        properties: {
          title: { type: 'STRING' },
          blocksTotal: { type: 'INTEGER' },
          startupStep5m: { type: 'STRING' },
          roadmapTrack: {
            type: 'STRING',
            enum: ['SCIENCE', 'WRITING', 'HOME', 'CODING_MAKER', 'MUSIC'],
          },
        },
        required: ['title', 'blocksTotal', 'startupStep5m', 'roadmapTrack'],
      },
    },
    sevenDayPipeline: {
      type: 'ARRAY',
      description:
        '7-day schedule table (7 rows) allocating Load Modes, Fixed Event anchors, discretionary project blocks (locked 100% to Item #1 until complete), completed deliverables, and Evening Recharge bridges.',
      items: {
        type: 'OBJECT',
        properties: {
          day: { type: 'STRING' },
          modeAndAnchors: { type: 'STRING' },
          projectBlocks: { type: 'STRING' },
          deliverablesCompleted: { type: 'STRING' },
          eveningBridge: { type: 'STRING' },
        },
        required: [
          'day',
          'modeAndAnchors',
          'projectBlocks',
          'deliverablesCompleted',
          'eveningBridge',
        ],
      },
    },
  },
  required: [
    'todayLoadMode',
    'fixedEvents',
    'closedListUpdates',
    'openListBacklog',
    'sevenDayPipeline',
  ],
};

export function mapRoadmapTrackToInternal(track: SmartIntakeRoadmapTrack): TrackId {
  switch (track) {
    case 'SCIENCE':
      return 'science';
    case 'WRITING':
      return 'writing';
    case 'HOME':
      return 'personal';
    case 'CODING_MAKER':
      return 'coding';
    case 'MUSIC':
      return 'music';
    default:
      return 'writing';
  }
}

export function mapInternalTrackToRoadmapTrack(trackId: TrackId): SmartIntakeRoadmapTrack {
  switch (trackId) {
    case 'science':
      return 'SCIENCE';
    case 'writing':
      return 'WRITING';
    case 'personal':
      return 'HOME';
    case 'coding':
      return 'CODING_MAKER';
    case 'music':
      return 'MUSIC';
    default:
      return 'WRITING';
  }
}

function inferRoadmapTrackFromText(text: string): SmartIntakeRoadmapTrack {
  const lower = text.toLowerCase();
  if (/\b(k1c|printer|3d|cad|hardware|arduino|sensor|code|coding|script|app|repo|firmware)\b/.test(lower)) {
    return 'CODING_MAKER';
  }
  if (/\b(bass|guitar|piano|drum|music|song|chord|acoustic)\b/.test(lower)) {
    return 'MUSIC';
  }
  if (/\b(home|filter|clean|organize|maintenance|laundry|grocery|errand|supply|audit|kitchen)\b/.test(lower)) {
    return 'HOME';
  }
  if (/\b(anat|anatomy|comp|exam|clinical|pharmacology|nmr|mrm|bio|neuro|physio|receptor|medical|lab\s+report)\b/.test(lower)) {
    return 'SCIENCE';
  }
  if (/\b(paper|draft|manuscript|essay|slide|deck|presentation|outline|literature|writing|review|journal)\b/.test(lower)) {
    return 'WRITING';
  }
  return 'WRITING';
}

function generateStartupScript5m(title: string, track: SmartIntakeRoadmapTrack, blocks: number): string {
  const cleanTitle = title.trim();
  const lower = cleanTitle.toLowerCase();
  if (blocks === 4 || /\b(slide|deck|presentation)\b/.test(lower)) {
    return `Open deck file for "${cleanTitle}", create 4 slide headers, and paste primary figure into Slide 1.`;
  }
  if (blocks >= 8 || /\b(paper|draft|manuscript|report|essay)\b/.test(lower)) {
    return `Open document for "${cleanTitle}", outline section headings, and draft the first 3 bullet lines.`;
  }
  if (track === 'CODING_MAKER') {
    return `Open workspace for "${cleanTitle}" and complete 1 single 5m diagnostic or build step.`;
  }
  if (track === 'MUSIC') {
    return `Pick up instrument for "${cleanTitle}" and play 1 cold 5m pass without DAW or drills.`;
  }
  if (track === 'HOME') {
    return `Stage tools/checklist for "${cleanTitle}" and execute the first 5m physical action.`;
  }
  if (track === 'SCIENCE') {
    return `Open reference source for "${cleanTitle}" and write down 3 core mechanisms from memory.`;
  }
  return `Open working file for "${cleanTitle}" and complete the first 5m startup step.`;
}

const DAY_ALIASES: { key: string; index: number; shortLabel: string }[] = [
  { key: 'today', index: 0, shortLabel: 'Day 1 (Today)' },
  { key: 'day 1', index: 0, shortLabel: 'Day 1 (Today)' },
  { key: 'mon', index: 0, shortLabel: 'Mon (Day 1)' },
  { key: 'monday', index: 0, shortLabel: 'Mon (Day 1)' },
  { key: 'tomorrow', index: 1, shortLabel: 'Day 2 (Tomorrow)' },
  { key: 'tmrw', index: 1, shortLabel: 'Day 2 (Tomorrow)' },
  { key: 'day 2', index: 1, shortLabel: 'Day 2 (Tomorrow)' },
  { key: 'tue', index: 1, shortLabel: 'Tue (Day 2)' },
  { key: 'tues', index: 1, shortLabel: 'Tue (Day 2)' },
  { key: 'tuesday', index: 1, shortLabel: 'Tue (Day 2)' },
  { key: 'day 3', index: 2, shortLabel: 'Wed (Day 3)' },
  { key: 'wed', index: 2, shortLabel: 'Wed (Day 3)' },
  { key: 'wednesday', index: 2, shortLabel: 'Wed (Day 3)' },
  { key: 'day 4', index: 3, shortLabel: 'Thu (Day 4)' },
  { key: 'thu', index: 3, shortLabel: 'Thu (Day 4)' },
  { key: 'thur', index: 3, shortLabel: 'Thu (Day 4)' },
  { key: 'thurs', index: 3, shortLabel: 'Thu (Day 4)' },
  { key: 'thursday', index: 3, shortLabel: 'Thu (Day 4)' },
  { key: 'day 5', index: 4, shortLabel: 'Fri (Day 5)' },
  { key: 'fri', index: 4, shortLabel: 'Fri (Day 5)' },
  { key: 'friday', index: 4, shortLabel: 'Fri (Day 5)' },
  { key: 'day 6', index: 5, shortLabel: 'Sat (Day 6)' },
  { key: 'sat', index: 5, shortLabel: 'Sat (Day 6)' },
  { key: 'saturday', index: 5, shortLabel: 'Sat (Day 6)' },
  { key: 'day 7', index: 6, shortLabel: 'Sun (Day 7)' },
  { key: 'sun', index: 6, shortLabel: 'Sun (Day 7)' },
  { key: 'sunday', index: 6, shortLabel: 'Sun (Day 7)' },
];

export function resolveDayIndex(dayString: string): number {
  const lower = dayString.toLowerCase().trim();
  for (const entry of DAY_ALIASES) {
    const regex = new RegExp(`\\b${entry.key}\\b`, 'i');
    if (regex.test(lower)) {
      return entry.index;
    }
  }
  return 0;
}

function detectDayInClause(clause: string): { dayLabel: string; dayIndex: number } {
  const lower = clause.toLowerCase();
  // Check explicit weekday / day tokens (avoid matching "by Fri" as fixed event day if only a deadline, unless it's an event)
  for (const entry of DAY_ALIASES) {
    const regex = new RegExp(`\\b${entry.key}\\b`, 'i');
    if (regex.test(lower)) {
      const canonical = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][entry.index] || 'Today';
      return { dayLabel: entry.index === 0 && /\btoday\b/i.test(lower) ? 'Today' : canonical, dayIndex: entry.index };
    }
  }
  return { dayLabel: 'Today', dayIndex: 0 };
}

/**
 * Fast local regex/keyword fallback parser for offline or no-API-key usage.
 * Supports quick shorthand ("+paper Draft 8b", "+lab Tue 2h", "+slides Deck 4b", "+out Thu 6pm")
 * as well as natural-language multi-item brain dumps ("Lab Tue 2h, theater Thu 6pm shutdown, finish 8-block AI paper by Fri").
 */
export function parseSmartIntakeLocal(
  rawInput: string,
  state: SymmetryState
): SmartIntakePlanResult {
  const input = rawInput.trim();
  // Split into clauses by comma, semicolon, newline, or leading `+command` tokens
  const rawClauses = input
    .split(/(?:[,;\n]+|(?=\s+\+(?:paper|slides|deck|lab|volunteer|out|outing|task|proj|code|music|home)\b))/i)
    .map((s) => s.trim())
    .filter(Boolean);

  const fixedEvents: SmartIntakeFixedEvent[] = [];
  const parsedTasks: (SmartIntakeClosedListItem & { isBacklogHint?: boolean })[] = [];
  let requestedMode: SmartIntakeLoadMode | null = null;

  for (const clause of rawClauses) {
    const lower = clause.toLowerCase();

    // 1. Check explicit mode switches
    if (/^\+?(?:mode\s+)?surge\b/i.test(lower)) {
      requestedMode = 'SURGE';
      continue;
    }
    if (/^\+?(?:mode\s+)?cruise\b/i.test(lower)) {
      requestedMode = 'CRUISE';
      continue;
    }
    if (/^\+?(?:mode\s+)?taper\b/i.test(lower)) {
      requestedMode = 'TAPER_LAB';
      continue;
    }

    // 2. Check quick command `+lab` or natural language Lab shift (not "lab report")
    const isLabCommand = /^\+lab\b/i.test(clause);
    const isLabEvent =
      isLabCommand ||
      (/\blab\b/i.test(lower) && !/\blab\s+(?:report|paper|manuscript|draft|slides|deck)\b/i.test(lower));

    if (isLabEvent) {
      const { dayLabel } = detectDayInClause(clause);
      const hoursMatch = clause.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
      const minsMatch = clause.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/i);
      const durationMinutes = hoursMatch
        ? Math.round(parseFloat(hoursMatch[1]) * 60)
        : minsMatch
        ? parseInt(minsMatch[1], 10)
        : 120;

      const cleanedTitle = clause
        .replace(/^\+lab\s*/i, '')
        .replace(/\b(today|tomorrow|tmrw|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/gi, '')
        .replace(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours|m|min|mins)\b/gi, '')
        .trim();

      fixedEvents.push({
        day: dayLabel,
        title: cleanedTitle && !/^lab$/i.test(cleanedTitle) ? `Lab: ${cleanedTitle}` : 'Lab Shift (~2h)',
        durationMinutes: durationMinutes || 120,
        earlyShutdown6PM: false,
      });
      continue;
    }

    // 3. Check Evening Show / Theater / D&D / 6 PM Outing / Volunteer
    const isEveningOuting =
      /^\+(?:out|outing|theater|show|dnd)\b/i.test(clause) ||
      /\b(theater|theatre|show|d&d|dnd|concert|outing|6\s*pm|6:00\s*pm|shutdown|evening\s+out)\b/i.test(
        lower
      );
    const isVolunteer = /^\+volunteer\b/i.test(clause) || /\bvolunteer\b/i.test(lower);

    if (isEveningOuting || isVolunteer) {
      const { dayLabel } = detectDayInClause(clause);
      const hoursMatch = clause.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/i);
      const durationMinutes = hoursMatch ? Math.round(parseFloat(hoursMatch[1]) * 60) : 120;
      let cleanTitle = clause
        .replace(/^\+\w+\s*/i, '')
        .replace(/\b(today|tomorrow|tmrw|mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\b/gi, '')
        .replace(/\b(6\s*pm|6:00\s*pm|shutdown|early\s+shutdown)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      if (!cleanTitle) {
        cleanTitle = isVolunteer ? 'Volunteer Shift' : '6:00 PM Evening Outing';
      } else if (isEveningOuting && !/6:00\s*pm|6\s*pm|outing|theater|show|d&d|dnd/i.test(cleanTitle)) {
        cleanTitle = `${cleanTitle} (6:00 PM Outing)`;
      } else {
        cleanTitle = cleanTitle.charAt(0).toUpperCase() + cleanTitle.slice(1);
      }

      fixedEvents.push({
        day: dayLabel,
        title: cleanTitle,
        durationMinutes,
        earlyShutdown6PM: isEveningOuting,
      });
      continue;
    }

    // 4. Otherwise parse as Deliverable / Task Command (e.g., "+paper Draft 8b", "finish 8-block AI paper by Fri")
    const isPaperCmd = /^\+paper\b/i.test(clause);
    const isSlidesCmd = /^\+(?:slides|deck)\b/i.test(clause);
    const isCodeCmd = /^\+code\b/i.test(clause);
    const isMusicCmd = /^\+music\b/i.test(clause);
    const isHomeCmd = /^\+home\b/i.test(clause);
    const isBacklogHint = /\b(backlog|flexible|soft|later|optional|someday)\b/i.test(lower);

    const blockMatch =
      clause.match(/(\d+)\s*-\s*block\b/i) ||
      clause.match(/\b(\d+)\s*(?:b|blk|blks|block|blocks)\b/i);

    let blocksTotal = blockMatch ? parseInt(blockMatch[1], 10) : 0;
    if (!blocksTotal) {
      if (isPaperCmd || /\b(paper|manuscript|report|essay|2-page)\b/i.test(lower)) {
        blocksTotal = 8;
      } else if (isSlidesCmd || /\b(slide|slides|deck|presentation)\b/i.test(lower)) {
        blocksTotal = 4;
      } else {
        blocksTotal = 4;
      }
    }
    blocksTotal = Math.max(1, Math.min(24, blocksTotal));

    const hasPlusPrefix = /^\+(?:paper|slides|deck|task|proj|code|music|home)\b/i.test(
      clause
    );
    let cleanTaskTitle = clause
      .replace(/^\+(?:paper|slides|deck|task|proj|code|music|home)\s*/i, '')
      .replace(
        hasPlusPrefix
          ? /^(?:finish|complete)\s+/i
          : /^(?:finish|complete|write|draft|build|prepare|start|do)\s+/i,
        ''
      )
      .replace(/(\d+)\s*-\s*block\s*/gi, '')
      .replace(/\b(\d+)\s*(?:b|blk|blks|block|blocks)\b/gi, '')
      .replace(/\bby\s+(?:mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?|tomorrow|tonight)\b/gi, '')
      .replace(/\b(backlog|flexible|soft\s+deadline)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

    if (!cleanTaskTitle) {
      cleanTaskTitle = isPaperCmd
        ? '2-Page Paper Draft'
        : isSlidesCmd
        ? 'Clinical Slide Deck'
        : 'Focused Deliverable Sprint';
    } else {
      cleanTaskTitle = cleanTaskTitle.charAt(0).toUpperCase() + cleanTaskTitle.slice(1);
      if (isPaperCmd && !/\b(paper|manuscript|report)\b/i.test(cleanTaskTitle)) {
        cleanTaskTitle = `${cleanTaskTitle} Paper`;
      } else if (isSlidesCmd && !/\b(slide|slides|deck)\b/i.test(cleanTaskTitle)) {
        cleanTaskTitle = `${cleanTaskTitle} Slide Deck`;
      }
    }

    const roadmapTrack: SmartIntakeRoadmapTrack = isCodeCmd
      ? 'CODING_MAKER'
      : isMusicCmd
      ? 'MUSIC'
      : isHomeCmd
      ? 'HOME'
      : inferRoadmapTrackFromText(`${clause} ${cleanTaskTitle}`);

    const startupStep5m = generateStartupScript5m(cleanTaskTitle, roadmapTrack, blocksTotal);

    parsedTasks.push({
      title: cleanTaskTitle,
      blocksTotal,
      startupStep5m,
      roadmapTrack,
      isBacklogHint,
    });
  }

  // Separate urgent / primary tasks vs soft-deadline / overflow tasks
  const primaryNewTasks: SmartIntakeClosedListItem[] = parsedTasks
    .filter((t) => !t.isBacklogHint)
    .map(({ title, blocksTotal, startupStep5m, roadmapTrack }) => ({
      title,
      blocksTotal,
      startupStep5m,
      roadmapTrack,
    }));
  const explicitBacklogTasks = parsedTasks.filter((t) => t.isBacklogHint);

  // Merge with existing queue up to 3 active Closed List items
  const existingClosedItems: SmartIntakeClosedListItem[] = state.projectQueue.map((p) => ({
    title: p.title,
    blocksTotal: Math.max(1, p.totalBlocks - p.completedBlocks),
    startupStep5m: p.startupStep,
    roadmapTrack: mapInternalTrackToRoadmapTrack(p.trackId),
  }));

  const combinedCandidates: SmartIntakeClosedListItem[] = [...primaryNewTasks];
  for (const existing of existingClosedItems) {
    const duplicate = combinedCandidates.some(
      (c) => c.title.toLowerCase() === existing.title.toLowerCase()
    );
    if (!duplicate) {
      combinedCandidates.push(existing);
    }
  }

  const closedListUpdates = combinedCandidates.slice(0, 3);
  const demotedOverflow = combinedCandidates.slice(3);

  const openListBacklog: SmartIntakeBacklogItem[] = [
    ...explicitBacklogTasks.map(({ title, blocksTotal, startupStep5m, roadmapTrack }) => ({
      title,
      blocksTotal,
      startupStep5m,
      roadmapTrack,
    })),
    ...demotedOverflow,
    ...state.projectBacklog
      .filter(
        (b) =>
          !combinedCandidates.some((c) => c.title.toLowerCase() === b.title.toLowerCase())
      )
      .map((b) => ({
        title: b.title,
        blocksTotal: b.totalBlocks,
        startupStep5m: b.startupStep,
        roadmapTrack: mapInternalTrackToRoadmapTrack(b.trackId),
      })),
  ];

  // Determine todayLoadMode (Rule 5: max 2 consecutive Surge days; TAPER_LAB if 2h Lab today)
  const hasTodayLab = fixedEvents.some(
    (ev) => resolveDayIndex(ev.day) === 0 && /lab/i.test(ev.title) && ev.durationMinutes >= 90
  );

  let todayLoadMode: SmartIntakeLoadMode = requestedMode || (state.loadMode === 'TAPER' ? 'TAPER_LAB' : state.loadMode);
  if (hasTodayLab) {
    todayLoadMode = 'TAPER_LAB';
  } else if (todayLoadMode === 'SURGE' && state.surgeConsecutiveDays >= 2) {
    todayLoadMode = 'CRUISE';
  }

  // Build 7-Day Pipeline rows respecting max 2 consecutive Surge days and 100% Item #1 lock
  const sevenDayPipeline = buildSevenDayPipelineRows(
    todayLoadMode,
    fixedEvents,
    closedListUpdates,
    state
  );

  return {
    todayLoadMode,
    fixedEvents,
    closedListUpdates,
    openListBacklog,
    sevenDayPipeline,
    source: 'LOCAL_FALLBACK',
  };
}

function buildSevenDayPipelineRows(
  todayLoadMode: SmartIntakeLoadMode,
  fixedEvents: SmartIntakeFixedEvent[],
  closedListUpdates: SmartIntakeClosedListItem[],
  state: SymmetryState
): SmartIntakePipelineRow[] {
  const dayNames = [
    'Day 1 (Today / Mon)',
    'Day 2 (Tue)',
    'Day 3 (Wed)',
    'Day 4 (Thu)',
    'Day 5 (Fri)',
    'Day 6 (Sat)',
    'Day 7 (Sun)',
  ];

  // Clone queue remaining blocks to simulate 100% Active Project Lock across the 7 days
  const simQueue = closedListUpdates.map((item) => ({
    title: item.title,
    remaining: item.blocksTotal,
    total: item.blocksTotal,
  }));

  let consecutiveSurge = state.surgeConsecutiveDays >= 2 ? 2 : 0;
  const rows: SmartIntakePipelineRow[] = [];

  for (let i = 0; i < 7; i++) {
    const dayEvents = fixedEvents.filter((ev) => resolveDayIndex(ev.day) === i);
    const hasLab = dayEvents.some((ev) => /lab/i.test(ev.title));
    const hasEveningShutdown = dayEvents.some((ev) => ev.earlyShutdown6PM);
    const hasVolunteer = dayEvents.some((ev) => /volunteer/i.test(ev.title));

    let mode: SmartIntakeLoadMode = 'CRUISE';
    if (i === 0) {
      mode = todayLoadMode;
    } else if (hasLab) {
      mode = 'TAPER_LAB';
    } else if (
      !hasEveningShutdown &&
      !hasVolunteer &&
      simQueue.some((q) => q.remaining > 0) &&
      consecutiveSurge < 2 &&
      (i === 2 || i === 3)
    ) {
      mode = 'SURGE';
    } else if (hasVolunteer) {
      mode = 'TAPER_LAB';
    } else {
      mode = 'CRUISE';
    }

    if (mode === 'SURGE') {
      if (consecutiveSurge >= 2) {
        mode = 'CRUISE';
        consecutiveSurge = 0;
      } else {
        consecutiveSurge += 1;
      }
    } else {
      consecutiveSurge = 0;
    }

    const totalBlocks = mode === 'SURGE' ? 14 : mode === 'TAPER_LAB' ? 8 : 12;
    const discretionaryAvailable = Math.max(1, totalBlocks - 7);

    // Allocate 100% of discretionary project blocks to the first incomplete item in Closed List
    let blocksLeftToday = discretionaryAvailable;
    const allocations: string[] = [];
    const completedToday: string[] = [];

    for (const item of simQueue) {
      if (item.remaining <= 0 || blocksLeftToday <= 0) continue;
      const used = Math.min(item.remaining, blocksLeftToday);
      item.remaining -= used;
      blocksLeftToday -= used;
      allocations.push(`${used}b → ${item.title}`);
      if (item.remaining === 0) {
        completedToday.push(`✓ ${item.title} (${item.total}b Complete)`);
      }
      // Strict Active Project Lock: only spill over to next item if current item finished
    }

    const anchorLabels = dayEvents.map((ev) =>
      ev.earlyShutdown6PM
        ? `${ev.title} [6:00 PM Shutdown]`
        : `${ev.title} (${ev.durationMinutes}m)`
    );

    const modeLabel =
      mode === 'TAPER_LAB'
        ? `TAPER_LAB (${totalBlocks}b)`
        : mode === 'SURGE'
        ? `SURGE (${totalBlocks}b • Mid-Day Reset)`
        : `CRUISE (${totalBlocks}b)`;

    const modeAndAnchors =
      anchorLabels.length > 0
        ? `${modeLabel} • ${anchorLabels.join(', ')}`
        : `${modeLabel} • Duration-Only`;

    const projectBlocks =
      allocations.length > 0
        ? `${discretionaryAvailable}b (${allocations.join(' + ')})`
        : `${discretionaryAvailable}b Discretionary Buffer`;

    const deliverablesCompleted =
      completedToday.length > 0 ? completedToday.join(' • ') : 'In Progress (Locked to #1)';

    const eveningBridge = hasEveningShutdown
      ? '6:00 PM Hard Lock → Evening Outing / Option 0 Rest on Return'
      : mode === 'SURGE'
      ? 'End-of-Shift Lock → Option 0 Stillness (20m) + 3A Fiction'
      : 'End-of-Shift Lock → 5m Recharge Menu (Music / Maker / BG3)';

    rows.push({
      day: dayNames[i],
      modeAndAnchors,
      projectBlocks,
      deliverablesCompleted,
      eveningBridge,
    });
  }

  return rows;
}

/**
 * Normalizes and validates any candidate plan (from Gemini or local fallback)
 * against SymmetryManager's hard state-machine rules.
 */
export function normalizeSmartIntakePlan(
  raw: Partial<SmartIntakePlanResult>,
  state: SymmetryState,
  source: 'GEMINI_2_5_FLASH' | 'LOCAL_FALLBACK'
): SmartIntakePlanResult {
  const fixedEvents: SmartIntakeFixedEvent[] = Array.isArray(raw.fixedEvents)
    ? raw.fixedEvents.map((ev) => {
        const title = String(ev?.title || 'Fixed Event').trim();
        const isEveningKeyword =
          /\b(theater|theatre|show|d&d|dnd|concert|outing|6\s*pm|6:00\s*pm|shutdown)\b/i.test(
            title
          );
        return {
          day: String(ev?.day || 'Today').trim(),
          title,
          durationMinutes: Number(ev?.durationMinutes) > 0 ? Number(ev.durationMinutes) : 120,
          earlyShutdown6PM: Boolean(ev?.earlyShutdown6PM || isEveningKeyword),
        };
      })
    : [];

  const validTracks: SmartIntakeRoadmapTrack[] = [
    'SCIENCE',
    'WRITING',
    'HOME',
    'CODING_MAKER',
    'MUSIC',
  ];

  const allClosedCandidates: SmartIntakeClosedListItem[] = Array.isArray(raw.closedListUpdates)
    ? raw.closedListUpdates
        .filter((item) => item && typeof item.title === 'string' && item.title.trim())
        .map((item) => {
          const title = item.title.trim();
          const lower = title.toLowerCase();
          let blocksTotal = Number(item.blocksTotal) || 4;
          if (!item.blocksTotal) {
            if (/\b(paper|manuscript|report|2-page)\b/.test(lower)) blocksTotal = 8;
            else if (/\b(slide|deck|presentation)\b/.test(lower)) blocksTotal = 4;
          }
          const roadmapTrack: SmartIntakeRoadmapTrack = validTracks.includes(
            item.roadmapTrack as SmartIntakeRoadmapTrack
          )
            ? (item.roadmapTrack as SmartIntakeRoadmapTrack)
            : inferRoadmapTrackFromText(title);
          const startupStep5m =
            typeof item.startupStep5m === 'string' && item.startupStep5m.trim()
              ? item.startupStep5m.trim()
              : generateStartupScript5m(title, roadmapTrack, blocksTotal);

          return {
            title,
            blocksTotal: Math.max(1, Math.min(24, blocksTotal)),
            startupStep5m,
            roadmapTrack,
          };
        })
    : [];

  // Hard cap Closed List at 3 active items; demote overflow to openListBacklog
  const closedListUpdates = allClosedCandidates.slice(0, 3);
  const overflowClosed = allClosedCandidates.slice(3);

  const rawBacklog = Array.isArray(raw.openListBacklog) ? raw.openListBacklog : [];
  const normalizedBacklog: (SmartIntakeBacklogItem | string)[] = [
    ...overflowClosed,
    ...rawBacklog.map((item) => {
      if (typeof item === 'string') return item;
      const title = String(item?.title || 'Backlog Item').trim();
      const blocksTotal = Number(item?.blocksTotal) || 4;
      const roadmapTrack: SmartIntakeRoadmapTrack = validTracks.includes(
        item?.roadmapTrack as SmartIntakeRoadmapTrack
      )
        ? (item.roadmapTrack as SmartIntakeRoadmapTrack)
        : inferRoadmapTrackFromText(title);
      return {
        title,
        blocksTotal,
        startupStep5m:
          item?.startupStep5m?.trim() ||
          generateStartupScript5m(title, roadmapTrack, blocksTotal),
        roadmapTrack,
      };
    }),
  ];

  // Enforce todayLoadMode rules (max 2 consecutive Surge days & TAPER_LAB when 2h Lab is today)
  const hasToday2hLab = fixedEvents.some(
    (ev) => resolveDayIndex(ev.day) === 0 && /lab/i.test(ev.title) && ev.durationMinutes >= 90
  );

  let todayLoadMode: SmartIntakeLoadMode =
    raw.todayLoadMode === 'SURGE' ||
    raw.todayLoadMode === 'TAPER_LAB' ||
    raw.todayLoadMode === 'CRUISE'
      ? raw.todayLoadMode
      : 'CRUISE';

  if (hasToday2hLab) {
    todayLoadMode = 'TAPER_LAB';
  } else if (todayLoadMode === 'SURGE' && state.surgeConsecutiveDays >= 2) {
    todayLoadMode = 'CRUISE';
  }

  let sevenDayPipeline: SmartIntakePipelineRow[] = [];
  if (Array.isArray(raw.sevenDayPipeline) && raw.sevenDayPipeline.length === 7) {
    sevenDayPipeline = raw.sevenDayPipeline.map((row, idx) => ({
      day: String(row?.day || `Day ${idx + 1}`),
      modeAndAnchors: String(row?.modeAndAnchors || 'CRUISE (12b) • Duration-Only'),
      projectBlocks: String(row?.projectBlocks || '5b → Item #1'),
      deliverablesCompleted: String(row?.deliverablesCompleted || 'In Progress'),
      eveningBridge: String(row?.eveningBridge || 'End-of-Shift Lock → Evening Recharge Menu'),
    }));
  } else {
    sevenDayPipeline = buildSevenDayPipelineRows(
      todayLoadMode,
      fixedEvents,
      closedListUpdates.length > 0
        ? closedListUpdates
        : state.projectQueue.map((p) => ({
            title: p.title,
            blocksTotal: p.totalBlocks,
            startupStep5m: p.startupStep,
            roadmapTrack: mapInternalTrackToRoadmapTrack(p.trackId),
          })),
      state
    );
  }

  return {
    todayLoadMode,
    fixedEvents,
    closedListUpdates,
    openListBacklog: normalizedBacklog,
    sevenDayPipeline,
    source,
  };
}

/**
 * Calls Gemini 2.5 Flash structured output endpoint if an API key is configured;
 * otherwise (or on network/API failure) uses the fast local regex/keyword fallback parser.
 */
export async function generateSmartIntakePlan(
  userPrompt: string,
  state: SymmetryState
): Promise<SmartIntakePlanResult> {
  const trimmed = userPrompt.trim();
  const apiKey = getEffectiveGeminiApiKey();

  // If no API key is configured or user typed a quick `+command` offline shorthand without key, use local parser
  if (!apiKey) {
    return parseSmartIntakeLocal(trimmed, state);
  }

  const systemPrompt = [
    'You are the mechanical scheduling engine for SymmetryManager (Symmetrical Productivity).',
    'STRICT TONE RULES: Keep all labels strictly functional, concise, and mechanical. Zero philosophical, religious, or preachy text.',
    'HARD STATE-MACHINE RULES:',
    `1. Current consecutive Surge days already logged: ${state.surgeConsecutiveDays}/2. Max 2 consecutive Surge days allowed. If surgeConsecutiveDays >= 2, todayLoadMode MUST NOT be SURGE.`,
    '2. If a ~2h Lab is scheduled today, set todayLoadMode to TAPER_LAB (7-9 desk blocks).',
    '3. Fixed Events: Auto-set earlyShutdown6PM = true for any evening show, theater, D&D session, or 6:00 PM outing.',
    '4. Closed List Updates: Hard cap at max 3 active items. Calibrate 2-page papers/reports at 8 blocks and slide decks at 4 blocks unless explicitly specified. Provide a concrete 5-minute startup action (startupStep5m) for each item.',
    '5. Demote any items beyond the top 3 or soft-deadline/flexible items into openListBacklog.',
    '6. sevenDayPipeline: Return exactly 7 rows (Day 1 through Day 7), locking 100% of discretionary project blocks to Closed List Item #1 until complete before starting Item #2.',
    `Current Active Closed List Queue: ${JSON.stringify(
      state.projectQueue.map((p) => ({
        slot: p.slot,
        title: p.title,
        remainingBlocks: Math.max(0, p.totalBlocks - p.completedBlocks),
        track: p.trackId,
      }))
    )}`,
  ].join('\n');

  try {
    const response = await fetch(
      `${GEMINI_ENDPOINT}?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: systemPrompt }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: trimmed }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: SMART_INTAKE_RESPONSE_SCHEMA,
            temperature: 0.2,
          },
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Gemini HTTP ${response.status}`);
    }

    const data = await response.json();
    const rawJsonText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!rawJsonText) {
      throw new Error('Empty structured response from Gemini');
    }

    const parsed = JSON.parse(rawJsonText) as Partial<SmartIntakePlanResult>;
    return normalizeSmartIntakePlan(parsed, state, 'GEMINI_2_5_FLASH');
  } catch {
    // Graceful fallback to local deterministic regex/keyword parser
    return parseSmartIntakeLocal(trimmed, state);
  }
}

/**
 * Applies a verified SmartIntakePlanResult to SymmetryState in 1 click.
 */
export function applySmartIntakePlanToState(
  prev: SymmetryState,
  plan: SmartIntakePlanResult
): SymmetryState {
  const mappedTodayMode: LoadMode =
    plan.todayLoadMode === 'TAPER_LAB'
      ? 'TAPER'
      : plan.todayLoadMode === 'SURGE' && prev.surgeConsecutiveDays < 2
      ? 'SURGE'
      : 'CRUISE';

  const todayTargetBlocks =
    mappedTodayMode === 'SURGE' ? 14 : mappedTodayMode === 'TAPER' ? 8 : 12;

  // Map Closed List Updates (max 3) to ProjectItem[]
  const updatedProjectQueue: ProjectItem[] =
    plan.closedListUpdates.length > 0
      ? plan.closedListUpdates.slice(0, 3).map((item, idx) => {
          const slot = (idx + 1) as 1 | 2 | 3;
          const presetType: ProjectPresetType =
            item.blocksTotal === 8
              ? 'PAPER_8'
              : item.blocksTotal === 4
              ? 'SLIDES_4'
              : 'CUSTOM';
          return {
            id: `proj_intake_${Date.now()}_${idx + 1}`,
            slot,
            title: item.title,
            presetType,
            completedBlocks: 0,
            totalBlocks: item.blocksTotal,
            trackId: mapRoadmapTrackToInternal(item.roadmapTrack),
            startupStep: item.startupStep5m,
            nextStepNote:
              slot === 1
                ? 'Active primary target (100% discretionary lock).'
                : 'Locked until Item #1 completes.',
          };
        })
      : prev.projectQueue;

  // Map Open List Backlog items
  const updatedBacklog: Omit<ProjectItem, 'slot'>[] =
    plan.openListBacklog.length > 0
      ? plan.openListBacklog.map((entry, idx) => {
          if (typeof entry === 'string') {
            const track = inferRoadmapTrackFromText(entry);
            const blocks = /\b(paper|manuscript|report)\b/i.test(entry) ? 8 : 4;
            return {
              id: `backlog_intake_${Date.now()}_${idx + 1}`,
              title: entry,
              presetType: blocks === 8 ? 'PAPER_8' : 'SLIDES_4',
              completedBlocks: 0,
              totalBlocks: blocks,
              trackId: mapRoadmapTrackToInternal(track),
              startupStep: generateStartupScript5m(entry, track, blocks),
              nextStepNote: 'Demoted to Open List Backlog.',
            };
          }
          const presetType: ProjectPresetType =
            entry.blocksTotal === 8
              ? 'PAPER_8'
              : entry.blocksTotal === 4
              ? 'SLIDES_4'
              : 'CUSTOM';
          return {
            id: `backlog_intake_${Date.now()}_${idx + 1}`,
            title: entry.title,
            presetType,
            completedBlocks: 0,
            totalBlocks: entry.blocksTotal,
            trackId: mapRoadmapTrackToInternal(entry.roadmapTrack),
            startupStep: entry.startupStep5m,
            nextStepNote: 'Demoted to Open List Backlog.',
          };
        })
      : prev.projectBacklog;

  // Map 7-Day Pipeline rows and Fixed Events onto pipelineDays
  let surgeStreak = 0;
  const updatedPipelineDays: PipelineDay[] = prev.pipelineDays.map((existingDay, idx) => {
    const row = plan.sevenDayPipeline[idx];
    const dayFixedEvents = plan.fixedEvents.filter((ev) => resolveDayIndex(ev.day) === idx);
    const matchingLab = dayFixedEvents.find((ev) => /lab/i.test(ev.title));
    const matchingEvening = dayFixedEvents.find((ev) => ev.earlyShutdown6PM);
    const matchingVolunteer = dayFixedEvents.find((ev) => /volunteer/i.test(ev.title));

    let dayMode: LoadMode = existingDay.loadMode;
    if (idx === 0) {
      dayMode = mappedTodayMode;
    } else if (row) {
      const upper = row.modeAndAnchors.toUpperCase();
      if (upper.includes('TAPER')) dayMode = 'TAPER';
      else if (upper.includes('SURGE')) dayMode = 'SURGE';
      else if (upper.includes('CRUISE')) dayMode = 'CRUISE';
    }
    if (matchingLab) {
      dayMode = 'TAPER';
    }

    // Enforce max 2 consecutive Surge days across the 7-day array
    if (dayMode === 'SURGE') {
      if (surgeStreak >= 2) {
        dayMode = 'CRUISE';
        surgeStreak = 0;
      } else {
        surgeStreak += 1;
      }
    } else {
      surgeStreak = 0;
    }

    let fixedEvent: FixedEventType = existingDay.fixedEvent;
    let fixedEventTimeLabel = existingDay.fixedEventTimeLabel;
    let earlyMorningAnchor = existingDay.earlyMorningAnchor;

    if (matchingLab) {
      fixedEvent = 'LAB_2H';
      fixedEventTimeLabel = `${matchingLab.title} (${matchingLab.durationMinutes}m)`;
      earlyMorningAnchor = true;
    } else if (matchingEvening) {
      fixedEvent = 'EVENING_OUTING_6PM';
      fixedEventTimeLabel = `${matchingEvening.title} (6:00 PM Shutdown)`;
    } else if (matchingVolunteer) {
      fixedEvent = 'VOLUNTEER';
      fixedEventTimeLabel = `${matchingVolunteer.title} (${matchingVolunteer.durationMinutes}m)`;
    } else if (row && /6:00\s*pm|6\s*pm|shutdown/i.test(row.modeAndAnchors)) {
      fixedEvent = 'EVENING_OUTING_6PM';
      fixedEventTimeLabel = '6:00 PM Evening Outing';
    } else if (row && /\blab\b/i.test(row.modeAndAnchors)) {
      fixedEvent = 'LAB_2H';
      fixedEventTimeLabel = 'Lab Shift (~2h)';
      earlyMorningAnchor = true;
    }

    const baseTargetBlocks =
      dayMode === 'SURGE' ? 14 : dayMode === 'TAPER' ? 8 : 12;

    return {
      ...existingDay,
      dayLabel: row?.day || existingDay.dayLabel,
      loadMode: dayMode,
      cruisePlus: false,
      baseTargetBlocks,
      fixedEvent,
      fixedEventTimeLabel,
      earlyMorningAnchor,
      modeAndAnchors: row?.modeAndAnchors,
      projectBlocksSummary: row?.projectBlocks,
      deliverablesCompleted: row?.deliverablesCompleted,
      eveningBridge: row?.eveningBridge,
    };
  });

  const todayDay = updatedPipelineDays[0];
  const primaryProject = updatedProjectQueue[0];

  return {
    ...prev,
    loadMode: mappedTodayMode,
    cruisePlus: false,
    customModeBlockAdjustment: todayTargetBlocks,
    fixedEvent: todayDay?.fixedEvent ?? prev.fixedEvent,
    projectQueue: updatedProjectQueue,
    projectBacklog: updatedBacklog,
    pipelineDays: updatedPipelineDays,
    timer:
      !prev.timer.isRunning && primaryProject
        ? {
            ...prev.timer,
            activeBlockSourceId: primaryProject.id,
            activeTaskTitle: primaryProject.title,
            activeTaskType: 'PROJECT',
            activeStartupPrompt: primaryProject.startupStep,
          }
        : prev.timer,
  };
}
