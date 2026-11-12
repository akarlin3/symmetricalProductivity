import {
  FixedEventType,
  LiveTelemetryConfig,
  LoadMode,
  PipelineDay,
  SymmetryState,
} from '../types/symmetry';
import { getLogicalDayKey } from '../state/defaultState';
import {
  CalendarAnchorDayPreview,
  CalendarAnchorImportPreview,
  ParsedCalendarEvent,
  fetchIcsFeedText,
  parseCalendarScheduleToAnchors,
} from './calendarAnchorImporter';

export type {
  CalendarAnchorDayPreview,
  CalendarAnchorImportPreview,
  ParsedCalendarEvent,
};

export { fetchIcsFeedText, parseCalendarScheduleToAnchors };

export const DEFAULT_POLL_INTERVAL_MINUTES = 15;

export function createDefaultLiveTelemetryConfig(
  architectModeUnlocked = false
): LiveTelemetryConfig {
  return {
    icsFeedUrl: '',
    pollIntervalMinutes: DEFAULT_POLL_INTERVAL_MINUTES,
    lastCalendarSyncAt: undefined,
    githubUsername: architectModeUnlocked ? 'akarlin3' : '',
    githubToken: '',
    githubAutoCreditEnabled: false,
    lastGithubSyncAt: undefined,
    creditedGithubEventIds: [],
  };
}

export function normalizeLiveTelemetryConfig(
  raw: Partial<LiveTelemetryConfig> | undefined,
  architectModeUnlocked = false
): LiveTelemetryConfig {
  const defaults = createDefaultLiveTelemetryConfig(architectModeUnlocked);
  if (!raw || typeof raw !== 'object') {
    return defaults;
  }
  const pollMins = Number(raw.pollIntervalMinutes);
  const clampedPoll =
    Number.isFinite(pollMins) && pollMins >= 1
      ? Math.min(240, Math.round(pollMins))
      : DEFAULT_POLL_INTERVAL_MINUTES;

  const resolvedGithubUsername =
    typeof raw.githubUsername === 'string'
      ? raw.githubUsername.trim()
      : defaults.githubUsername;

  return {
    icsFeedUrl:
      typeof raw.icsFeedUrl === 'string' ? raw.icsFeedUrl.trim() : undefined,
    pollIntervalMinutes: clampedPoll,
    lastCalendarSyncAt:
      typeof raw.lastCalendarSyncAt === 'string' && raw.lastCalendarSyncAt
        ? raw.lastCalendarSyncAt
        : undefined,
    githubUsername: resolvedGithubUsername,
    githubToken:
      typeof raw.githubToken === 'string' ? raw.githubToken.trim() : undefined,
    githubAutoCreditEnabled: Boolean(raw.githubAutoCreditEnabled),
    lastGithubSyncAt:
      typeof raw.lastGithubSyncAt === 'string' && raw.lastGithubSyncAt
        ? raw.lastGithubSyncAt
        : undefined,
    creditedGithubEventIds: Array.isArray(raw.creditedGithubEventIds)
      ? Array.from(
          new Set(
            raw.creditedGithubEventIds.filter(
              (id): id is string => typeof id === 'string' && id.trim().length > 0
            )
          )
        )
      : [],
  };
}

/**
 * Returns true if enough time has elapsed since `lastSyncIso` to run another background poll.
 */
export function isTelemetryPollDue(
  lastSyncIso: string | undefined,
  pollIntervalMinutes = DEFAULT_POLL_INTERVAL_MINUTES,
  nowMs = Date.now()
): boolean {
  if (!lastSyncIso) return true;
  const parsed = Date.parse(lastSyncIso);
  if (Number.isNaN(parsed)) return true;
  const intervalMs = Math.max(1, pollIntervalMinutes) * 60_000;
  return nowMs - parsed >= intervalMs;
}

export function normalizeCalendarFeedUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/^webcal:\/\//i, 'https://');
}

function unfoldIcsLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const rawLines = normalized.split('\n');
  const unfolded: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && unfolded.length > 0) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }
  return unfolded;
}

function parseIcsTimestamp(val: string): { date: Date; isAllDay: boolean } | null {
  const clean = val.trim();
  if (/^\d{8}$/.test(clean)) {
    const y = Number(clean.slice(0, 4));
    const m = Number(clean.slice(4, 6)) - 1;
    const d = Number(clean.slice(6, 8));
    return { date: new Date(y, m, d, 9, 0, 0), isAllDay: true };
  }
  const dtMatch = clean.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/
  );
  if (!dtMatch) return null;
  const [, yStr, mStr, dStr, hhStr, mmStr, ssStr, zFlag] = dtMatch;
  if (zFlag === 'Z') {
    return {
      date: new Date(
        Date.UTC(
          Number(yStr),
          Number(mStr) - 1,
          Number(dStr),
          Number(hhStr),
          Number(mmStr),
          Number(ssStr || '0')
        )
      ),
      isAllDay: false,
    };
  }
  return {
    date: new Date(
      Number(yStr),
      Number(mStr) - 1,
      Number(dStr),
      Number(hhStr),
      Number(mmStr),
      Number(ssStr || '0')
    ),
    isAllDay: false,
  };
}

function formatHHMM(date: Date): string {
  const h = date.getHours();
  const m = date.getMinutes();
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

const RRULE_WEEKDAY_MAP: Record<string, number> = {
  SU: 0,
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
};

interface RawVEventInstance {
  summary: string;
  startDate: Date;
  endDate: Date;
  durationMinutes: number;
  isAllDay: boolean;
}

/**
 * Parses `.ics` text including weekly/daily RRULE expansion across the target 7-logical-day window.
 */
function extractVEventInstancesForWindow(
  icsText: string,
  windowStart: Date,
  windowEnd: Date
): RawVEventInstance[] {
  const lines = unfoldIcsLines(icsText);
  const instances: RawVEventInstance[] = [];

  let inEvent = false;
  let summary = '';
  let dtStartRaw = '';
  let dtEndRaw = '';
  let rruleRaw = '';
  let statusRaw = '';

  const flushEvent = () => {
    if (statusRaw.toUpperCase() === 'CANCELLED') return;
    const startParsed = parseIcsTimestamp(dtStartRaw);
    if (!startParsed) return;
    const endParsed = dtEndRaw ? parseIcsTimestamp(dtEndRaw) : null;
    const baseStart = startParsed.date;
    const baseEnd =
      endParsed && endParsed.date.getTime() > baseStart.getTime()
        ? endParsed.date
        : new Date(
            baseStart.getTime() + (startParsed.isAllDay ? 120 : 60) * 60_000
          );
    const durationMinutes = Math.max(
      15,
      Math.round((baseEnd.getTime() - baseStart.getTime()) / 60_000)
    );
    const cleanTitle = (summary || 'Calendar Event')
      .replace(/\\,/g, ',')
      .replace(/\\;/g, ';')
      .replace(/\\n/gi, ' ')
      .trim();

    if (!rruleRaw) {
      if (
        baseEnd.getTime() >= windowStart.getTime() &&
        baseStart.getTime() <= windowEnd.getTime()
      ) {
        instances.push({
          summary: cleanTitle,
          startDate: baseStart,
          endDate: baseEnd,
          durationMinutes,
          isAllDay: startParsed.isAllDay,
        });
      }
      return;
    }

    const rruleUpper = rruleRaw.toUpperCase();
    const untilMatch = rruleUpper.match(/UNTIL=([0-9TZ]+)/);
    if (untilMatch) {
      const untilParsed = parseIcsTimestamp(untilMatch[1]);
      if (untilParsed && untilParsed.date.getTime() < windowStart.getTime()) {
        return;
      }
    }

    const isDaily = rruleUpper.includes('FREQ=DAILY');
    const isWeekly = rruleUpper.includes('FREQ=WEEKLY');
    if (!isDaily && !isWeekly) {
      if (
        baseEnd.getTime() >= windowStart.getTime() &&
        baseStart.getTime() <= windowEnd.getTime()
      ) {
        instances.push({
          summary: cleanTitle,
          startDate: baseStart,
          endDate: baseEnd,
          durationMinutes,
          isAllDay: startParsed.isAllDay,
        });
      }
      return;
    }

    const byDayMatch = rruleUpper.match(/BYDAY=([A-Z,]+)/);
    const allowedWeekdays = byDayMatch
      ? byDayMatch[1]
          .split(',')
          .map((tok) => RRULE_WEEKDAY_MAP[tok.slice(-2)])
          .filter((n): n is number => typeof n === 'number')
      : [baseStart.getDay()];

    const cursor = new Date(
      windowStart.getFullYear(),
      windowStart.getMonth(),
      windowStart.getDate(),
      baseStart.getHours(),
      baseStart.getMinutes(),
      baseStart.getSeconds()
    );

    for (let offset = 0; offset <= 8; offset++) {
      const candidateStart = new Date(cursor);
      candidateStart.setDate(cursor.getDate() + offset);
      if (candidateStart.getTime() < baseStart.getTime() - 1000) continue;
      if (candidateStart.getTime() > windowEnd.getTime()) break;

      if (isDaily || allowedWeekdays.includes(candidateStart.getDay())) {
        const candidateEnd = new Date(
          candidateStart.getTime() + durationMinutes * 60_000
        );
        instances.push({
          summary: cleanTitle,
          startDate: candidateStart,
          endDate: candidateEnd,
          durationMinutes,
          isAllDay: startParsed.isAllDay,
        });
      }
    }
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === 'BEGIN:VEVENT') {
      inEvent = true;
      summary = '';
      dtStartRaw = '';
      dtEndRaw = '';
      rruleRaw = '';
      statusRaw = '';
      continue;
    }
    if (trimmed === 'END:VEVENT') {
      if (inEvent && dtStartRaw) {
        flushEvent();
      }
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx < 0) continue;
    const rawKey = trimmed.slice(0, colonIdx).toUpperCase();
    const val = trimmed.slice(colonIdx + 1).trim();
    const baseKey = rawKey.split(';')[0];

    if (baseKey === 'SUMMARY') summary = val;
    else if (baseKey === 'DTSTART') dtStartRaw = val;
    else if (baseKey === 'DTEND') dtEndRaw = val;
    else if (baseKey === 'RRULE') rruleRaw = val;
    else if (baseKey === 'STATUS') statusRaw = val;
  }

  return instances;
}

export interface LiveCalendarTelemetryClassification {
  preview: CalendarAnchorImportPreview;
  nextState: SymmetryState;
  hasMorningAnchorTomorrow: boolean;
  taperDaysCount: number;
  earlyShutdownDaysCount: number;
  syncedAtIso: string;
  usedCorsFallback?: boolean;
}

const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function getLogicalAnchorBaseDate(now: Date, rolloverHour: number): Date {
  const shifted = new Date(now);
  if (shifted.getHours() < rolloverHour) {
    shifted.setDate(shifted.getDate() - 1);
  }
  return new Date(
    shifted.getFullYear(),
    shifted.getMonth(),
    shifted.getDate(),
    rolloverHour,
    0,
    0,
    0
  );
}

function isShiftLabClassClinicTitle(title: string): boolean {
  return /\b(lab|class|clinic|clinical|shift|lecture|seminar|practicum|rotation|hospital|volunteer|workshop|recitation|ward|exam)\b/i.test(
    title
  );
}

/**
 * Deterministically classifies `.ics` or schedule text over the next 7 logical days
 * (respecting the 4:00 AM logical day rollover):
 *  - Any >= 90m lab/class/clinic shift sets a Fixed Anchor and recommends TAPER_LAB (7–9 desk blocks).
 *  - Any evening event starting between 17:30 and 21:00 attaches an `Early Shutdown (6:00 PM)` badge.
 *  - Any next-morning event before 10:00 AM sets `hasMorningAnchorTomorrow = true`, locking tonight's Flow Extension gate.
 */
export function classifyCalendarInputForSevenDays(
  rawInput: string,
  state: SymmetryState,
  now: Date = new Date()
): LiveCalendarTelemetryClassification {
  const rolloverHour = state.logicalDayRolloverHour ?? 4;
  const baseLogicalDate = getLogicalAnchorBaseDate(now, rolloverHour);
  const baseLogicalKey = getLogicalDayKey(now, rolloverHour);

  const logicalWindow: {
    dayOffset: number;
    dayIndex: number;
    logicalKey: string;
    dayLabel: string;
    dateObj: Date;
  }[] = [];

  for (let offset = 0; offset < 7; offset++) {
    const d = new Date(baseLogicalDate);
    d.setDate(baseLogicalDate.getDate() + offset);
    const logicalKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      '0'
    )}-${String(d.getDate()).padStart(2, '0')}`;
    const existingLabel = state.pipelineDays[offset]?.dayLabel;
    const computedLabel = `${DAY_NAMES_SHORT[d.getDay()]}, ${
      MONTH_NAMES_SHORT[d.getMonth()]
    } ${d.getDate()}`;
    logicalWindow.push({
      dayOffset: offset,
      dayIndex: state.pipelineDays[offset]?.dayIndex ?? offset + 1,
      logicalKey,
      dayLabel: existingLabel || computedLabel,
      dateObj: d,
    });
  }

  const windowStart = new Date(baseLogicalDate);
  const windowEnd = new Date(baseLogicalDate);
  windowEnd.setDate(windowEnd.getDate() + 7);

  const trimmed = rawInput.trim();
  const isIcs =
    trimmed.includes('BEGIN:VCALENDAR') || trimmed.includes('BEGIN:VEVENT');

  const parsedEventsByOffset = new Map<number, ParsedCalendarEvent[]>();
  const allParsedEvents: ParsedCalendarEvent[] = [];

  if (isIcs) {
    const vInstances = extractVEventInstancesForWindow(
      trimmed,
      windowStart,
      windowEnd
    );
    for (const inst of vInstances) {
      const eventLogicalKey = getLogicalDayKey(inst.startDate, rolloverHour);
      const matchedDay = logicalWindow.find(
        (w) => w.logicalKey === eventLogicalKey
      );
      if (!matchedDay) continue;

      const startHourDecimal =
        inst.startDate.getHours() + inst.startDate.getMinutes() / 60;
      const isEveningWindow =
        !inst.isAllDay && startHourDecimal >= 17.5 && startHourDecimal <= 21.0;
      const isBefore10Am =
        !inst.isAllDay &&
        startHourDecimal >= rolloverHour &&
        startHourDecimal < 10.0;
      const isLongShiftAnchor =
        !inst.isAllDay &&
        inst.durationMinutes >= 90 &&
        !isEveningWindow &&
        (isShiftLabClassClinicTitle(inst.summary) || startHourDecimal < 17.5);
      const isVolunteer = /\b(volunteer|community|clinic\s+service)\b/i.test(
        inst.summary
      );

      const ev: ParsedCalendarEvent = {
        id: `ics_${matchedDay.dayOffset}_${inst.startDate.getTime()}_${allParsedEvents.length}`,
        summary: inst.summary,
        dayOffset: matchedDay.dayOffset,
        dayIndex: matchedDay.dayIndex,
        dateIso: matchedDay.logicalKey,
        startHourDecimal,
        durationMinutes: inst.durationMinutes,
        timeRangeLabel: inst.isAllDay
          ? 'All Day'
          : `${formatHHMM(inst.startDate)} – ${formatHHMM(inst.endDate)}`,
        isFixedAnchor90mPlus: isLongShiftAnchor,
        suggestedAnchorType: isVolunteer
          ? 'VOLUNTEER'
          : isEveningWindow
          ? 'EVENING_OUTING_6PM'
          : 'LAB_2H',
        isEveningShutdownTrigger: isEveningWindow,
        isEarlyMorning: isBefore10Am,
      };

      allParsedEvents.push(ev);
      const list = parsedEventsByOffset.get(matchedDay.dayOffset) ?? [];
      list.push(ev);
      parsedEventsByOffset.set(matchedDay.dayOffset, list);
    }
  } else {
    const fallbackPreview = parseCalendarScheduleToAnchors(
      trimmed,
      state.pipelineDays,
      baseLogicalKey,
      '6:00 PM'
    );
    for (const dp of fallbackPreview.dayPreviews) {
      const offset = Math.max(
        0,
        logicalWindow.findIndex((w) => w.dayIndex === dp.dayIndex)
      );
      for (const rawEv of dp.matchedEvents) {
        const isEveningWindow =
          rawEv.startHourDecimal >= 17.5 && rawEv.startHourDecimal <= 21.0;
        const isBefore10Am =
          rawEv.startHourDecimal >= rolloverHour && rawEv.startHourDecimal < 10.0;
        const isLongShiftAnchor =
          rawEv.durationMinutes >= 90 && !isEveningWindow;

        const normalizedEv: ParsedCalendarEvent = {
          ...rawEv,
          dayOffset: offset,
          isEveningShutdownTrigger:
            isEveningWindow || rawEv.isEveningShutdownTrigger,
          isFixedAnchor90mPlus: isLongShiftAnchor,
          isEarlyMorning: isBefore10Am,
        };
        allParsedEvents.push(normalizedEv);
        const list = parsedEventsByOffset.get(offset) ?? [];
        list.push(normalizedEv);
        parsedEventsByOffset.set(offset, list);
      }
    }
  }

  let taperDaysCount = 0;
  let earlyShutdownDaysCount = 0;

  const dayPreviews: CalendarAnchorDayPreview[] = logicalWindow.map((win) => {
    const existingDay = state.pipelineDays[win.dayOffset];
    const dayEvents = (parsedEventsByOffset.get(win.dayOffset) ?? []).sort(
      (a, b) => a.startHourDecimal - b.startHourDecimal
    );

    const longShiftEvents = dayEvents.filter((e) => e.isFixedAnchor90mPlus);
    const eveningEvents = dayEvents.filter((e) => e.isEveningShutdownTrigger);
    const hasEarlyMorningBefore10Am = dayEvents.some((e) => e.isEarlyMorning);

    let suggestTaperLab = false;
    let suggestedLoadMode: LoadMode | undefined;
    let suggestedTargetBlocks: number | undefined;
    let suggestedFixedEvent: FixedEventType | undefined;
    let suggestedFixedEventTimeLabel: string | undefined;
    const summaryParts: string[] = [];

    if (longShiftEvents.length > 0) {
      const primaryShift = longShiftEvents[0];
      suggestTaperLab = true;
      suggestedLoadMode = 'TAPER';
      suggestedTargetBlocks = 8; // TAPER_LAB (7–9 desk blocks)
      suggestedFixedEvent =
        primaryShift.suggestedAnchorType === 'VOLUNTEER'
          ? 'VOLUNTEER'
          : 'LAB_2H';
      suggestedFixedEventTimeLabel = `${primaryShift.timeRangeLabel} ${primaryShift.summary} (${primaryShift.durationMinutes}m)`;
      taperDaysCount += 1;
      summaryParts.push(
        `Fixed Anchor >=90m: ${primaryShift.summary} (${primaryShift.timeRangeLabel}) -> TAPER_LAB (8b)`
      );
    }

    if (eveningEvents.length > 0) {
      const evOuting = eveningEvents[0];
      earlyShutdownDaysCount += 1;
      if (!suggestedFixedEvent) {
        suggestedFixedEvent = 'EVENING_OUTING_6PM';
        suggestedFixedEventTimeLabel = `Early Shutdown (6:00 PM) • ${evOuting.timeRangeLabel} ${evOuting.summary}`;
      } else {
        suggestedFixedEventTimeLabel = `${suggestedFixedEventTimeLabel} • Early Shutdown (6:00 PM)`;
      }
      summaryParts.push(`Early Shutdown (6:00 PM): ${evOuting.summary}`);
    }

    if (hasEarlyMorningBefore10Am && summaryParts.length === 0) {
      const morningEv = dayEvents.find((e) => e.isEarlyMorning)!;
      summaryParts.push(
        `Morning Anchor (<10:00 AM): ${morningEv.timeRangeLabel} ${morningEv.summary}`
      );
    }

    return {
      dayIndex: existingDay?.dayIndex ?? win.dayIndex,
      dayLabel: existingDay?.dayLabel || win.dayLabel,
      dateIso: win.logicalKey,
      matchedEvents: dayEvents,
      suggestTaperLab,
      suggestedLoadMode,
      suggestedTargetBlocks,
      suggestedFixedEvent,
      suggestedFixedEventTimeLabel,
      earlyShutdownBadge: eveningEvents.length > 0,
      earlyMorningAnchor: hasEarlyMorningBefore10Am,
      anchorSummaryText: summaryParts.join(' • '),
    };
  });

  const hasMorningAnchorTomorrow = Boolean(dayPreviews[1]?.earlyMorningAnchor);
  const daysAffected = dayPreviews.filter(
    (dp) =>
      dp.suggestTaperLab ||
      dp.earlyShutdownBadge ||
      dp.earlyMorningAnchor ||
      dp.matchedEvents.length > 0
  ).length;

  const preview: CalendarAnchorImportPreview = {
    eventsFound: allParsedEvents.length,
    daysAffected,
    dayPreviews,
    warnings:
      allParsedEvents.length === 0
        ? ['No timed events fell within the upcoming 7 logical days.']
        : [],
  };

  const syncedAtIso = now.toISOString();

  const updatedPipelineDays: PipelineDay[] = state.pipelineDays.map(
    (day, idx) => {
      const dp = dayPreviews[idx];
      if (!dp) return day;

      if (dp.matchedEvents.length === 0) {
        if (idx === 1 && isIcs) {
          return {
            ...day,
            earlyMorningAnchor: false,
          };
        }
        return day;
      }

      const nextLoadMode: LoadMode = dp.suggestTaperLab
        ? 'TAPER'
        : day.loadMode;
      const nextTargetBlocks = dp.suggestTaperLab
        ? Math.min(
            9,
            Math.max(7, day.loadMode === 'TAPER' ? day.baseTargetBlocks : 8)
          )
        : day.baseTargetBlocks;

      const modeBadgeLabel =
        nextLoadMode === 'TAPER'
          ? `Taper / Lab (${nextTargetBlocks}b)`
          : nextLoadMode === 'SURGE'
          ? `Surge (${nextTargetBlocks}b)`
          : `Cruise${day.cruisePlus ? '+' : ''} (${nextTargetBlocks}b)`;

      const modeParts = [modeBadgeLabel];
      if (dp.suggestedFixedEventTimeLabel) {
        modeParts.push(dp.suggestedFixedEventTimeLabel);
      }

      return {
        ...day,
        loadMode: nextLoadMode,
        cruisePlus: nextLoadMode === 'TAPER' ? false : day.cruisePlus,
        baseTargetBlocks: nextTargetBlocks,
        fixedEvent: dp.suggestedFixedEvent || day.fixedEvent,
        fixedEventTimeLabel:
          dp.suggestedFixedEventTimeLabel || day.fixedEventTimeLabel,
        earlyMorningAnchor: dp.earlyMorningAnchor,
        earlyShutdownFlag: dp.earlyShutdownBadge || day.earlyShutdownFlag,
        earlyEveningShutdownBadge: dp.earlyShutdownBadge
          ? 'Early Shutdown (6:00 PM)'
          : day.earlyEveningShutdownBadge,
        importedAnchorSummary: dp.anchorSummaryText || day.importedAnchorSummary,
        modeAndAnchors: modeParts.join(' • '),
        eveningBridge: dp.earlyShutdownBadge
          ? 'Early Shutdown (6:00 PM) Lock'
          : day.eveningBridge,
      };
    }
  );

  const todayPreview = dayPreviews[0];
  const todayHasShiftAnchor = Boolean(todayPreview?.suggestTaperLab);
  const nextLoadModeToday: LoadMode = todayHasShiftAnchor
    ? 'TAPER'
    : state.loadMode;
  const nextTargetToday = todayHasShiftAnchor
    ? Math.min(
        9,
        Math.max(
          7,
          state.loadMode === 'TAPER' ? state.customModeBlockAdjustment : 8
        )
      )
    : state.customModeBlockAdjustment;

  const nextState: SymmetryState = {
    ...state,
    loadMode: nextLoadModeToday,
    cruisePlus: todayHasShiftAnchor ? false : state.cruisePlus,
    customModeBlockAdjustment: nextTargetToday,
    fixedEvent: todayPreview?.suggestedFixedEvent || state.fixedEvent,
    earlyEveningShutdownTime: todayPreview?.earlyShutdownBadge
      ? '6:00 PM'
      : state.earlyEveningShutdownTime,
    hasMorningAnchorTomorrow,
    pipelineDays: updatedPipelineDays,
    sevenDayPipeline: updatedPipelineDays,
    liveTelemetryConfig: {
      ...normalizeLiveTelemetryConfig(state.liveTelemetryConfig),
      lastCalendarSyncAt: syncedAtIso,
    },
  };

  return {
    preview,
    nextState,
    hasMorningAnchorTomorrow,
    taperDaysCount,
    earlyShutdownDaysCount,
    syncedAtIso,
  };
}

export interface PollLiveCalendarOptions {
  force?: boolean;
  architectModeUnlocked?: boolean;
  allowCorsProxyFallback?: boolean;
  now?: Date;
  fetchImpl?: typeof fetch;
}

export interface PollLiveCalendarResult {
  ok: boolean;
  skippedThrottle?: boolean;
  usedCorsFallback?: boolean;
  classification?: LiveCalendarTelemetryClassification;
  error?: string;
}

/**
 * Live background & 1-click `.ics` Calendar poller.
 * Supports direct CORS `.ics` URLs (`https://` or `webcal://`) with a clean fallback proxy/paste option.
 */
export async function pollLiveCalendarFeed(
  state: SymmetryState,
  options: PollLiveCalendarOptions = {}
): Promise<PollLiveCalendarResult> {
  const config = normalizeLiveTelemetryConfig(
    state.liveTelemetryConfig,
    Boolean(options.architectModeUnlocked)
  );
  const rawUrl = config.icsFeedUrl?.trim() || '';
  if (!rawUrl) {
    return {
      ok: false,
      error: 'No Calendar .ics URL configured.',
    };
  }

  const now = options.now ?? new Date();
  if (
    !options.force &&
    !isTelemetryPollDue(
      config.lastCalendarSyncAt,
      config.pollIntervalMinutes,
      now.getTime()
    )
  ) {
    return {
      ok: true,
      skippedThrottle: true,
    };
  }

  const normalizedUrl = normalizeCalendarFeedUrl(rawUrl);
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    return {
      ok: false,
      error: 'Calendar feed URL must start with https://, http://, or webcal://.',
    };
  }

  const fetcher = options.fetchImpl ?? fetch;
  let icsText = '';
  let usedCorsFallback = false;

  try {
    const response = await fetcher(normalizedUrl, {
      method: 'GET',
      headers: {
        Accept: 'text/calendar, text/plain, */*',
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    icsText = await response.text();
  } catch (directErr) {
    if (options.allowCorsProxyFallback !== false) {
      try {
        const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(
          normalizedUrl
        )}`;
        const proxyRes = await fetcher(proxyUrl, {
          method: 'GET',
          headers: {
            Accept: 'text/calendar, text/plain, */*',
          },
        });
        if (!proxyRes.ok) {
          throw new Error(`Proxy HTTP ${proxyRes.status}`);
        }
        icsText = await proxyRes.text();
        usedCorsFallback = true;
      } catch {
        const msg =
          directErr instanceof Error ? directErr.message : 'CORS / network block';
        return {
          ok: false,
          error: `Could not fetch .ics URL directly (${msg}). Paste .ics text or upload a .ics file in Calendar Sync Modal.`,
        };
      }
    } else {
      const msg =
        directErr instanceof Error ? directErr.message : 'CORS / network block';
      return {
        ok: false,
        error: `Direct .ics fetch blocked (${msg}). Enable proxy fallback or paste .ics text directly.`,
      };
    }
  }

  if (
    !icsText.includes('BEGIN:VCALENDAR') &&
    !icsText.includes('BEGIN:VEVENT')
  ) {
    return {
      ok: false,
      error: 'Fetched feed did not contain valid VCALENDAR / VEVENT entries.',
    };
  }

  const classification = classifyCalendarInputForSevenDays(icsText, state, now);
  classification.usedCorsFallback = usedCorsFallback;

  return {
    ok: true,
    usedCorsFallback,
    classification,
  };
}
