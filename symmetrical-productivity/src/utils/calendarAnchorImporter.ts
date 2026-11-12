import { FixedEventType, LoadMode, PipelineDay } from '../types/symmetry';

export interface ParsedCalendarEvent {
  id: string;
  summary: string;
  dayOffset: number; // 0 = Day 1 (Today) .. 6 = Day 7
  dayIndex: number; // 1..7
  dateIso: string; // YYYY-MM-DD
  startHourDecimal: number; // e.g., 17.5 for 5:30 PM
  durationMinutes: number;
  timeRangeLabel: string;
  isFixedAnchor90mPlus: boolean;
  suggestedAnchorType: FixedEventType;
  isEveningShutdownTrigger: boolean; // Starts between 17:30 (5:30 PM) and 21:00 (9:00 PM)
  isEarlyMorning: boolean; // Starts before 10:00 AM
}

export interface CalendarAnchorDayPreview {
  dayIndex: number;
  dayLabel: string;
  dateIso: string;
  matchedEvents: ParsedCalendarEvent[];
  suggestTaperLab: boolean;
  suggestedLoadMode?: LoadMode;
  suggestedTargetBlocks?: number;
  suggestedFixedEvent?: FixedEventType;
  suggestedFixedEventTimeLabel?: string;
  earlyShutdownBadge: boolean;
  earlyMorningAnchor: boolean;
  anchorSummaryText: string;
}

export interface CalendarAnchorImportPreview {
  eventsFound: number;
  daysAffected: number;
  dayPreviews: CalendarAnchorDayPreview[];
  warnings: string[];
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function toLocalDateIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function format12hTime(hour24: number, minute: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h12}:${pad2(minute)} ${period}`;
}

function unfoldIcsLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const unfolded = normalized.replace(/\n[ \t]/g, '');
  return unfolded.split('\n');
}

function parseIcsDateTimeValue(
  rawPropName: string,
  rawValue: string
): { date: Date; allDay: boolean } | null {
  const cleanVal = rawValue.trim();
  // All-day YYYYMMDD
  if (/^\d{8}$/.test(cleanVal) || /VALUE=DATE\b/i.test(rawPropName)) {
    const y = Number(cleanVal.slice(0, 4));
    const m = Number(cleanVal.slice(4, 6)) - 1;
    const d = Number(cleanVal.slice(6, 8));
    const dt = new Date(y, m, d, 9, 0, 0);
    if (Number.isNaN(dt.getTime())) return null;
    return { date: dt, allDay: true };
  }

  // YYYYMMDDTHHMMSS(Z) or YYYYMMDDTHHMM(Z)
  const match = cleanVal.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})?(Z)?$/i
  );
  if (!match) return null;
  const y = Number(match[1]);
  const mo = Number(match[2]) - 1;
  const da = Number(match[3]);
  const hh = Number(match[4]);
  const mm = Number(match[5]);
  const ss = Number(match[6] || '0');
  const isUtc = Boolean(match[7]);

  const dt = isUtc
    ? new Date(Date.UTC(y, mo, da, hh, mm, ss))
    : new Date(y, mo, da, hh, mm, ss);
  if (Number.isNaN(dt.getTime())) return null;
  return { date: dt, allDay: false };
}

function parseIcsDurationMinutes(rawDuration: string): number | null {
  // RFC 5545 e.g. PT2H, PT90M, PT1H30M, P1D
  const m = rawDuration
    .trim()
    .match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/i);
  if (!m) return null;
  const days = Number(m[1] || 0);
  const hours = Number(m[2] || 0);
  const mins = Number(m[3] || 0);
  const total = days * 1440 + hours * 60 + mins;
  return total > 0 ? total : null;
}

function classifyAnchorType(summary: string): FixedEventType {
  if (/volunteer|service|community|clinic\s*volunteer/i.test(summary)) {
    return 'VOLUNTEER';
  }
  return 'LAB_2H';
}

function isEveningWindow(startHourDecimal: number): boolean {
  // Between 5:30 PM (17.5) and 9:00 PM (21.0) inclusive
  return startHourDecimal >= 17.5 && startHourDecimal <= 21.0;
}

function buildWindowDates(anchorDateIso?: string): Date[] {
  let base: Date;
  if (anchorDateIso && /^\d{4}-\d{2}-\d{2}$/.test(anchorDateIso)) {
    const [y, m, d] = anchorDateIso.split('-').map(Number);
    base = new Date(y, m - 1, d, 0, 0, 0, 0);
  } else {
    const now = new Date();
    base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  }
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    return d;
  });
}

function parseIcsContent(
  icsText: string,
  windowDates: Date[]
): ParsedCalendarEvent[] {
  const lines = unfoldIcsLines(icsText);
  const dateMap = new Map<string, number>();
  windowDates.forEach((d, idx) => {
    dateMap.set(toLocalDateIso(d), idx);
  });

  const results: ParsedCalendarEvent[] = [];
  let inEvent = false;
  let dtStartProp = '';
  let dtStartVal = '';
  let dtEndProp = '';
  let dtEndVal = '';
  let durationVal = '';
  let summaryVal = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^BEGIN:VEVENT$/i.test(trimmed)) {
      inEvent = true;
      dtStartProp = '';
      dtStartVal = '';
      dtEndProp = '';
      dtEndVal = '';
      durationVal = '';
      summaryVal = '';
      continue;
    }
    if (/^END:VEVENT$/i.test(trimmed)) {
      if (inEvent && dtStartVal) {
        const parsedStart = parseIcsDateTimeValue(dtStartProp, dtStartVal);
        if (parsedStart && !parsedStart.allDay) {
          const startDate = parsedStart.date;
          const dateKey = toLocalDateIso(startDate);
          const dayOffset = dateMap.get(dateKey);
          if (dayOffset !== undefined) {
            let durationMinutes = 60;
            if (dtEndVal) {
              const parsedEnd = parseIcsDateTimeValue(dtEndProp, dtEndVal);
              if (parsedEnd) {
                const diffMin = Math.round(
                  (parsedEnd.date.getTime() - startDate.getTime()) / 60000
                );
                if (diffMin > 0 && diffMin <= 12 * 60) {
                  durationMinutes = diffMin;
                }
              }
            } else if (durationVal) {
              const dur = parseIcsDurationMinutes(durationVal);
              if (dur) durationMinutes = dur;
            }

            const startH = startDate.getHours();
            const startM = startDate.getMinutes();
            const startDec = startH + startM / 60;
            const endDate = new Date(
              startDate.getTime() + durationMinutes * 60000
            );
            const cleanSummary =
              summaryVal
                .replace(/\\,/g, ',')
                .replace(/\\;/g, ';')
                .replace(/\\n/gi, ' ')
                .trim() || 'Scheduled Event';

            const eveningTrigger = isEveningWindow(startDec);
            const is90mPlus = durationMinutes >= 90 && !eveningTrigger;

            results.push({
              id: `ics_ev_${dayOffset}_${results.length}`,
              summary: cleanSummary,
              dayOffset,
              dayIndex: dayOffset + 1,
              dateIso: dateKey,
              startHourDecimal: startDec,
              durationMinutes,
              timeRangeLabel: `${format12hTime(startH, startM)} – ${format12hTime(
                endDate.getHours(),
                endDate.getMinutes()
              )}`,
              isFixedAnchor90mPlus: is90mPlus,
              suggestedAnchorType: classifyAnchorType(cleanSummary),
              isEveningShutdownTrigger: eveningTrigger,
              isEarlyMorning: startDec < 10.0,
            });
          }
        }
      }
      inEvent = false;
      continue;
    }

    if (!inEvent) continue;
    const colonIdx = trimmed.indexOf(':');
    if (colonIdx <= 0) continue;
    const propPart = trimmed.slice(0, colonIdx);
    const valPart = trimmed.slice(colonIdx + 1);
    const baseName = propPart.split(';')[0].toUpperCase();

    if (baseName === 'DTSTART') {
      dtStartProp = propPart;
      dtStartVal = valPart;
    } else if (baseName === 'DTEND') {
      dtEndProp = propPart;
      dtEndVal = valPart;
    } else if (baseName === 'DURATION') {
      durationVal = valPart;
    } else if (baseName === 'SUMMARY') {
      summaryVal = valPart;
    }
  }

  return results;
}

const WEEKDAY_TOKENS: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

function parseTimeToken(
  hourStr: string,
  minStr: string | undefined,
  ampmStr: string | undefined,
  fallbackMeridiem?: 'am' | 'pm'
): { hour24: number; minute: number } | null {
  let h = Number(hourStr);
  const m = minStr ? Number(minStr) : 0;
  if (Number.isNaN(h) || Number.isNaN(m) || m < 0 || m > 59) return null;
  const mer = (ampmStr || fallbackMeridiem || '').toLowerCase();
  if (mer === 'pm' && h < 12) h += 12;
  else if (mer === 'am' && h === 12) h = 0;
  else if (!mer && h >= 1 && h <= 7) {
    // Ambiguous 1..7 without am/pm in schedule text usually afternoon/evening
    h += 12;
  }
  if (h < 0 || h > 23) return null;
  return { hour24: h, minute: m };
}

function parsePlainScheduleText(
  rawText: string,
  windowDates: Date[],
  pipelineDays: PipelineDay[]
): ParsedCalendarEvent[] {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 4);

  const weekdayToOffset = new Map<number, number>();
  windowDates.forEach((d, idx) => {
    if (!weekdayToOffset.has(d.getDay())) {
      weekdayToOffset.set(d.getDay(), idx);
    }
  });

  // Also index pipelineDays labels by weekday token if pipeline has explicit labels (e.g. "Tue Nov 10")
  pipelineDays.forEach((pd, idx) => {
    const m = pd.dayLabel
      .toLowerCase()
      .match(/\b(sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/);
    if (m && WEEKDAY_TOKENS[m[1]] !== undefined) {
      weekdayToOffset.set(WEEKDAY_TOKENS[m[1]], idx);
    }
  });

  const events: ParsedCalendarEvent[] = [];
  let activeDayOffset = 0;

  for (const line of lines) {
    // Detect day reference on the line: "Today", "Tomorrow", "Day 3", "Wed", "Thu Nov 12", "2026-11-12"
    let matchedOffset: number | null = null;
    if (/\btoday\b/i.test(line)) {
      matchedOffset = 0;
    } else if (/\btomorrow\b/i.test(line)) {
      matchedOffset = 1;
    } else {
      const dayNumM = line.match(/\bday\s*([1-7])\b/i);
      if (dayNumM) {
        matchedOffset = Number(dayNumM[1]) - 1;
      }
    }

    if (matchedOffset === null) {
      const isoM = line.match(/\b(\d{4}-\d{2}-\d{2})\b/);
      if (isoM) {
        const foundIdx = windowDates.findIndex(
          (d) => toLocalDateIso(d) === isoM[1]
        );
        if (foundIdx >= 0) matchedOffset = foundIdx;
      }
    }

    if (matchedOffset === null) {
      const wdMatch = line
        .toLowerCase()
        .match(
          /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat)\b/
        );
      if (wdMatch) {
        const wd = WEEKDAY_TOKENS[wdMatch[1]];
        if (wd !== undefined && weekdayToOffset.has(wd)) {
          matchedOffset = weekdayToOffset.get(wd)!;
        }
      }
    }

    if (matchedOffset !== null) {
      activeDayOffset = matchedOffset;
    }

    // Parse time range e.g. "9:00 AM - 11:00 AM", "13:30-15:30", "6:00pm", "5:45 PM – 8:00 PM"
    const rangeMatch = line.match(
      /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b/i
    );
    const singleTimeMatch = !rangeMatch
      ? line.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i)
      : null;

    const explicitDurationMatch = line.match(
      /\b(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hours)\b|\b(\d{2,3})\s*(?:m|min|mins|minutes)\b/i
    );

    if (!rangeMatch && !singleTimeMatch && !explicitDurationMatch) {
      continue;
    }

    let startH = 9;
    let startM = 0;
    let durationMinutes = 60;

    if (rangeMatch) {
      const endMer = rangeMatch[6]?.toLowerCase() as 'am' | 'pm' | undefined;
      const startParsed = parseTimeToken(
        rangeMatch[1],
        rangeMatch[2],
        rangeMatch[3],
        endMer
      );
      const endParsed = parseTimeToken(
        rangeMatch[4],
        rangeMatch[5],
        rangeMatch[6],
        rangeMatch[3]?.toLowerCase() as 'am' | 'pm' | undefined
      );
      if (!startParsed || !endParsed) continue;
      startH = startParsed.hour24;
      startM = startParsed.minute;
      let diff =
        endParsed.hour24 * 60 +
        endParsed.minute -
        (startH * 60 + startM);
      if (diff <= 0) diff += 12 * 60;
      durationMinutes = Math.max(15, Math.min(720, diff));
    } else if (singleTimeMatch) {
      const startParsed = parseTimeToken(
        singleTimeMatch[1],
        singleTimeMatch[2],
        singleTimeMatch[3]
      );
      if (!startParsed) continue;
      startH = startParsed.hour24;
      startM = startParsed.minute;
      if (explicitDurationMatch) {
        durationMinutes = explicitDurationMatch[1]
          ? Math.round(Number(explicitDurationMatch[1]) * 60)
          : Number(explicitDurationMatch[2]);
      } else if (/lab|shift|practicum|seminar|workshop|exam/i.test(line)) {
        durationMinutes = 120;
      } else {
        durationMinutes = 90;
      }
    } else if (explicitDurationMatch) {
      durationMinutes = explicitDurationMatch[1]
        ? Math.round(Number(explicitDurationMatch[1]) * 60)
        : Number(explicitDurationMatch[2]);
      if (/evening|dinner|outing|concert|show|6\s*pm/i.test(line)) {
        startH = 18;
        startM = 0;
      }
    }

    const startDec = startH + startM / 60;
    const endTotalMins = startH * 60 + startM + durationMinutes;
    const endH = Math.floor(endTotalMins / 60) % 24;
    const endM = endTotalMins % 60;

    const summaryClean = line
      .replace(
        /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat|today|tomorrow|day\s*[1-7])\b[:, -]*/gi,
        ''
      )
      .replace(
        /\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(?:-|–|—|to)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\b[:, -]*/gi,
        ''
      )
      .replace(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b[:, -]*/gi, '')
      .replace(/^[-*•:|,\s]+|[-*•:|,\s]+$/g, '')
      .trim();

    const eveningTrigger = isEveningWindow(startDec);
    const is90mPlus = durationMinutes >= 90 && !eveningTrigger;
    const dateObj = windowDates[activeDayOffset] || windowDates[0];

    events.push({
      id: `txt_ev_${activeDayOffset}_${events.length}`,
      summary: summaryClean || 'Calendar Anchor',
      dayOffset: activeDayOffset,
      dayIndex: activeDayOffset + 1,
      dateIso: toLocalDateIso(dateObj),
      startHourDecimal: startDec,
      durationMinutes,
      timeRangeLabel: `${format12hTime(startH, startM)} – ${format12hTime(
        endH,
        endM
      )}`,
      isFixedAnchor90mPlus: is90mPlus,
      suggestedAnchorType: classifyAnchorType(summaryClean || line),
      isEveningShutdownTrigger: eveningTrigger,
      isEarlyMorning: startDec < 10.0,
    });
  }

  return events;
}

export function parseCalendarScheduleToAnchors(
  rawInput: string,
  pipelineDays: PipelineDay[],
  logicalDayKey?: string,
  earlyShutdownLabel = '6:00 PM'
): CalendarAnchorImportPreview {
  const trimmed = rawInput.trim();
  const warnings: string[] = [];
  const windowDates = buildWindowDates(logicalDayKey);

  if (!trimmed) {
    return {
      eventsFound: 0,
      daysAffected: 0,
      dayPreviews: [],
      warnings: ['Paste schedule text or upload a .ics file to preview 7-day anchors.'],
    };
  }

  const isIcs = /BEGIN:VCALENDAR|BEGIN:VEVENT/i.test(trimmed);
  const parsedEvents = isIcs
    ? parseIcsContent(trimmed, windowDates)
    : parsePlainScheduleText(trimmed, windowDates, pipelineDays);

  if (isIcs && parsedEvents.length === 0) {
    warnings.push(
      'No timed events fell within the upcoming 7-day window in this .ics file.'
    );
  } else if (!isIcs && parsedEvents.length === 0) {
    warnings.push(
      'No timed events detected. Example format: "Wed 9:00 AM - 11:00 AM Lab Shift" or "Fri 6:30 PM Dinner Outing".'
    );
  }

  const dayPreviews: CalendarAnchorDayPreview[] = pipelineDays
    .slice(0, 7)
    .map((day, idx) => {
      const matched = parsedEvents
        .filter((ev) => ev.dayOffset === idx)
        .sort((a, b) => a.startHourDecimal - b.startHourDecimal);

      const anchorEvents = matched.filter((ev) => ev.isFixedAnchor90mPlus);
      const eveningEvents = matched.filter((ev) => ev.isEveningShutdownTrigger);
      const earlyMorning = matched.some((ev) => ev.isEarlyMorning);

      const primaryAnchor = anchorEvents[0];
      const primaryEvening = eveningEvents[0];

      let suggestedFixedEvent: FixedEventType | undefined;
      let suggestedFixedEventTimeLabel: string | undefined;
      let suggestTaperLab = false;
      let suggestedLoadMode: LoadMode | undefined;
      let suggestedTargetBlocks: number | undefined;

      if (primaryAnchor) {
        suggestTaperLab = true;
        suggestedLoadMode = 'TAPER';
        suggestedTargetBlocks = 8;
        suggestedFixedEvent = primaryAnchor.suggestedAnchorType;
        suggestedFixedEventTimeLabel = `${primaryAnchor.timeRangeLabel} ${primaryAnchor.summary} (${primaryAnchor.durationMinutes}m)`;
      } else if (primaryEvening) {
        suggestedFixedEvent = 'EVENING_OUTING_6PM';
        suggestedFixedEventTimeLabel = `Early Shutdown (${earlyShutdownLabel}) • ${primaryEvening.timeRangeLabel} ${primaryEvening.summary}`;
      }

      const summaryParts: string[] = [];
      if (primaryAnchor) {
        summaryParts.push(
          `Fixed Anchor >=90m: ${primaryAnchor.summary} (${primaryAnchor.timeRangeLabel}) -> Suggest TAPER_LAB (8b)`
        );
      }
      if (primaryEvening) {
        summaryParts.push(
          `Early Shutdown (${earlyShutdownLabel}) Badge: ${primaryEvening.summary} (${primaryEvening.timeRangeLabel})`
        );
      }

      return {
        dayIndex: day.dayIndex,
        dayLabel: day.dayLabel,
        dateIso: toLocalDateIso(windowDates[idx]),
        matchedEvents: matched,
        suggestTaperLab,
        suggestedLoadMode,
        suggestedTargetBlocks,
        suggestedFixedEvent,
        suggestedFixedEventTimeLabel,
        earlyShutdownBadge: eveningEvents.length > 0,
        earlyMorningAnchor: earlyMorning,
        anchorSummaryText: summaryParts.join(' • '),
      };
    });

  const daysAffected = dayPreviews.filter(
    (dp) => dp.suggestTaperLab || dp.earlyShutdownBadge || dp.matchedEvents.length > 0
  ).length;

  return {
    eventsFound: parsedEvents.length,
    daysAffected,
    dayPreviews,
    warnings,
  };
}

export async function fetchIcsFeedText(feedUrl: string): Promise<string> {
  const normalizedUrl = feedUrl.trim().replace(/^webcal:\/\//i, 'https://');
  if (!/^https?:\/\//i.test(normalizedUrl)) {
    throw new Error('Calendar feed URL must start with https://, http://, or webcal://');
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 6000);
  try {
    const res = await fetch(normalizedUrl, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!res.ok) {
      throw new Error(`Calendar feed returned HTTP ${res.status}`);
    }
    return await res.text();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(
      `Unable to fetch .ics feed directly (${msg}). Download the .ics file and upload it, or paste schedule text directly.`
    );
  } finally {
    clearTimeout(timeout);
  }
}
