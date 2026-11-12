import {
  MajorSubTrackId,
  SymmetryState,
  TodayBlockLogEntry,
  TrackId,
} from '../types/symmetry';
import {
  getEffectiveDailyAmbitionDrip,
  getLogicalDayKey,
  syncTodayIntoDailyHistory,
} from '../state/defaultState';
import {
  isTelemetryPollDue,
  normalizeLiveTelemetryConfig,
} from './calendarImporter';

/**
 * Scientific & Open-Source repositories mapped to Major Track 1 (`1B_INDEPENDENT`) OUTPUT blocks.
 */
export const SCIENTIFIC_INDEPENDENT_REPOS = new Set<string>([
  'ivimbench',
  'conformalivim',
  'sextantivim',
  'weaksindy',
  'pancdata3',
  'averyloop',
  'researchproj',
]);

/**
 * Application & Tooling repositories mapped to Minor Track 1 (`SANDBOX_1` / `'coding'`) OUTPUT blocks.
 */
export const APPLICATION_SANDBOX_REPOS = new Set<string>([
  'symmetricalproductivity',
  'gmassistant',
  'personalsite',
]);

export type GithubMappedTrackTarget = '1B_INDEPENDENT' | 'SANDBOX_1';

export interface GithubRepoTrackMapping {
  target: GithubMappedTrackTarget;
  trackId: TrackId;
  subTrack?: MajorSubTrackId;
  targetRung: 1 | 2 | 3 | 4;
  displayLabel: string;
}

export function mapGithubRepoToRoadmapTrack(
  repoFullNameOrBase: string
): GithubRepoTrackMapping {
  const baseName =
    repoFullNameOrBase.split('/').pop()?.trim().toLowerCase() || '';

  if (SCIENTIFIC_INDEPENDENT_REPOS.has(baseName)) {
    return {
      target: '1B_INDEPENDENT',
      trackId: 'science',
      subTrack: '1B_INDEPENDENT',
      targetRung: 4,
      displayLabel: 'Major Track 1 (1B_INDEPENDENT)',
    };
  }

  // Application/tooling repos (`symmetricalProductivity`, `gmAssistant`, `personalSite`, and general software repos)
  return {
    target: 'SANDBOX_1',
    trackId: 'coding',
    targetRung: 3,
    displayLabel: 'Minor Track 1 (SANDBOX_1)',
  };
}

export interface GithubRawEvent {
  id: string;
  type: string;
  created_at: string;
  repo?: {
    name?: string;
  };
  payload?: {
    action?: string;
    size?: number;
    distinct_size?: number;
    commits?: unknown[];
    pull_request?: {
      merged?: boolean;
      state?: string;
    };
  };
}

export interface GithubDetectedEventSummary {
  eventId: string;
  eventType: 'PushEvent' | 'PullRequestEvent' | 'ReleaseEvent';
  repoFullName: string;
  repoShortName: string;
  unitCount: number;
  createdAt: string;
  mapping: GithubRepoTrackMapping;
}

export interface GithubActivityDetection {
  username: string;
  logicalDayKey: string;
  primaryRepo: string;
  totalActivityUnits: number;
  events: GithubDetectedEventSummary[];
  eventIds: string[];
  mapping: GithubRepoTrackMapping;
  bannerMessage: string;
}

/**
 * Returns the exact local wall-clock timestamp where the current logical day began
 * (default `4:00 AM` local rollover: hours `< rolloverHour` belong to yesterday's 4:00 AM window).
 */
export function getLogicalDayStartDate(
  now: Date = new Date(),
  rolloverHour = 4
): Date {
  const safeHour = Math.max(0, Math.min(23, Math.floor(rolloverHour)));
  const start = new Date(now);
  if (start.getHours() < safeHour) {
    start.setDate(start.getDate() - 1);
  }
  start.setHours(safeHour, 0, 0, 0);
  return start;
}

export function resolveEffectiveGithubUsername(
  state: SymmetryState,
  architectModeUnlocked = false
): string {
  const configured = state.liveTelemetryConfig?.githubUsername?.trim();
  if (configured !== undefined && configured.length > 0) {
    return configured;
  }
  if (
    configured === undefined &&
    (architectModeUnlocked || state.profilePresetId === 'AVERY_DEFAULT')
  ) {
    return 'akarlin3';
  }
  return '';
}

/**
 * Filters raw GitHub `/users/:username/events` items for `PushEvent`, `PullRequestEvent` (merged/closed),
 * and `ReleaseEvent` occurring within the current logical day (since `4:00 AM` local rollover)
 * that have not yet been recorded in `creditedGithubEventIds`.
 */
export function filterUncreditedGithubEventsToday(
  rawEvents: GithubRawEvent[],
  creditedEventIds: string[],
  username: string,
  now: Date = new Date(),
  rolloverHour = 4
): GithubActivityDetection | null {
  const creditedSet = new Set(creditedEventIds);
  const logicalStartMs = getLogicalDayStartDate(now, rolloverHour).getTime();
  const logicalDayKey = getLogicalDayKey(now, rolloverHour);

  const matched: GithubDetectedEventSummary[] = [];

  for (const ev of rawEvents) {
    if (!ev || typeof ev.id !== 'string' || !ev.id) continue;
    if (creditedSet.has(ev.id)) continue;

    const createdMs = Date.parse(ev.created_at || '');
    if (Number.isNaN(createdMs) || createdMs < logicalStartMs) continue;

    const repoFullName = ev.repo?.name || `${username}/repository`;
    const repoShortName = repoFullName.split('/').pop() || repoFullName;

    if (ev.type === 'PushEvent') {
      const commitCount = Math.max(
        1,
        Number(ev.payload?.distinct_size) ||
          Number(ev.payload?.size) ||
          (Array.isArray(ev.payload?.commits) ? ev.payload!.commits!.length : 1)
      );
      matched.push({
        eventId: ev.id,
        eventType: 'PushEvent',
        repoFullName,
        repoShortName,
        unitCount: commitCount,
        createdAt: ev.created_at,
        mapping: mapGithubRepoToRoadmapTrack(repoShortName),
      });
    } else if (ev.type === 'PullRequestEvent') {
      const action = ev.payload?.action?.toLowerCase();
      const isMergedOrClosed =
        action === 'closed' ||
        Boolean(ev.payload?.pull_request?.merged) ||
        ev.payload?.pull_request?.state === 'closed';
      if (!isMergedOrClosed) continue;

      matched.push({
        eventId: ev.id,
        eventType: 'PullRequestEvent',
        repoFullName,
        repoShortName,
        unitCount: 1,
        createdAt: ev.created_at,
        mapping: mapGithubRepoToRoadmapTrack(repoShortName),
      });
    } else if (ev.type === 'ReleaseEvent') {
      const action = ev.payload?.action?.toLowerCase();
      if (
        action &&
        action !== 'published' &&
        action !== 'created' &&
        action !== 'released'
      ) {
        continue;
      }
      matched.push({
        eventId: ev.id,
        eventType: 'ReleaseEvent',
        repoFullName,
        repoShortName,
        unitCount: 1,
        createdAt: ev.created_at,
        mapping: mapGithubRepoToRoadmapTrack(repoShortName),
      });
    }
  }

  if (matched.length === 0) {
    return null;
  }

  // Group by repoShortName to select the primary active repo today
  const unitsByRepo = new Map<
    string,
    { count: number; latestMs: number; mapping: GithubRepoTrackMapping }
  >();
  let totalActivityUnits = 0;

  for (const item of matched) {
    totalActivityUnits += item.unitCount;
    const prev = unitsByRepo.get(item.repoShortName);
    const ts = Date.parse(item.createdAt) || 0;
    if (!prev) {
      unitsByRepo.set(item.repoShortName, {
        count: item.unitCount,
        latestMs: ts,
        mapping: item.mapping,
      });
    } else {
      unitsByRepo.set(item.repoShortName, {
        count: prev.count + item.unitCount,
        latestMs: Math.max(prev.latestMs, ts),
        mapping: item.mapping,
      });
    }
  }

  let primaryRepo = matched[0].repoShortName;
  let primaryMapping = matched[0].mapping;
  let bestScore = -1;
  let bestTs = -1;

  for (const [repoName, stats] of unitsByRepo.entries()) {
    // Prefer scientific 1B_INDEPENDENT repos on ties, otherwise highest unit count, then most recent
    if (
      stats.count > bestScore ||
      (stats.count === bestScore && stats.latestMs > bestTs)
    ) {
      bestScore = stats.count;
      bestTs = stats.latestMs;
      primaryRepo = repoName;
      primaryMapping = stats.mapping;
    }
  }

  const eventIds = matched.map((m) => m.eventId);
  const bannerMessage = `Detected GitHub activity on ${primaryRepo} (${totalActivityUnits} commits/releases today) — Credit 1 Ambition Drip / Output block?`;

  return {
    username,
    logicalDayKey,
    primaryRepo,
    totalActivityUnits,
    events: matched,
    eventIds,
    mapping: primaryMapping,
    bannerMessage,
  };
}

/**
 * Pure state transition that credits 1 Ambition Drip / Output block from detected GitHub activity,
 * increments the mapped Roadmap Track OUTPUT bar (`1B_INDEPENDENT` or `SANDBOX_1`),
 * and records all event IDs in `creditedGithubEventIds` so they are never double-counted.
 */
export function applyGithubActivityCreditToState(
  state: SymmetryState,
  detection: GithubActivityDetection,
  now: Date = new Date()
): SymmetryState {
  const existingConfig = normalizeLiveTelemetryConfig(state.liveTelemetryConfig);
  const alreadyCredited = new Set(existingConfig.creditedGithubEventIds);
  const freshIds = detection.eventIds.filter((id) => !alreadyCredited.has(id));
  if (freshIds.length === 0) {
    return state;
  }

  const rolloverHour = state.logicalDayRolloverHour ?? 4;
  const logicalDay = getLogicalDayKey(now, rolloverHour);
  const nowIso = now.toISOString();

  const drip = getEffectiveDailyAmbitionDrip(state);
  const nextDripCompleted = Math.max(1, drip.completedToday + 1);

  const updatedRoadmapTracks = state.roadmapTracks.map((track) => {
    if (track.id !== detection.mapping.trackId) return track;

    const isScience1B =
      track.id === 'science' && detection.mapping.target === '1B_INDEPENDENT';

    return {
      ...track,
      outputBlocksCredited: Number(
        ((track.outputBlocksCredited || 0) + 1).toFixed(2)
      ),
      subTrack1BBlocksCredited: isScience1B
        ? Number(((track.subTrack1BBlocksCredited ?? 0) + 1).toFixed(2))
        : track.subTrack1BBlocksCredited,
      activeThisWeek: true,
      rungs: track.rungs.map((r) =>
        r.rungNumber === detection.mapping.targetRung
          ? {
              ...r,
              completedBlocks: Number(((r.completedBlocks || 0) + 1).toFixed(2)),
            }
          : r
      ),
    };
  });

  const logEntry: TodayBlockLogEntry = {
    id: `gh_credit_${now.getTime()}`,
    timestamp: nowIso,
    logicalDate: logicalDay,
    category: 'PROJECT_FOCUS_1',
    title: `GitHub Auto-Credit: ${detection.primaryRepo} (${detection.totalActivityUnits} commits/releases)`,
    durationMinutes: 20,
    blockUnits: 1.0,
    blockCredit: 1.0,
    roadmapTrack: detection.mapping.trackId,
    subTrack: detection.mapping.subTrack,
    stroke: 'OUTPUT',
    rungNumber: detection.mapping.targetRung,
  };

  const mergedCreditedIds = Array.from(
    new Set([...existingConfig.creditedGithubEventIds, ...freshIds])
  ).slice(-500);

  const updatedTodayLog = [...(state.todayBlockLog || []), logEntry];

  const candidateState: SymmetryState = {
    ...state,
    logicalDayKey: logicalDay,
    discretionaryBlocksCompletedToday:
      (state.discretionaryBlocksCompletedToday || 0) + 1,
    dailySovereignDripDone: true,
    dailyAmbitionDrip: {
      ...drip,
      completedToday: nextDripCompleted,
    },
    roadmapTracks: updatedRoadmapTracks,
    todayBlockLog: updatedTodayLog,
    liveTelemetryConfig: {
      ...existingConfig,
      lastGithubSyncAt: nowIso,
      creditedGithubEventIds: mergedCreditedIds,
    },
  };

  return {
    ...candidateState,
    dailyHistory: syncTodayIntoDailyHistory(candidateState),
  };
}

export function dismissGithubActivityEvents(
  state: SymmetryState,
  eventIds: string[],
  now: Date = new Date()
): SymmetryState {
  const existingConfig = normalizeLiveTelemetryConfig(state.liveTelemetryConfig);
  const merged = Array.from(
    new Set([...existingConfig.creditedGithubEventIds, ...eventIds])
  ).slice(-500);
  return {
    ...state,
    liveTelemetryConfig: {
      ...existingConfig,
      lastGithubSyncAt: now.toISOString(),
      creditedGithubEventIds: merged,
    },
  };
}

export interface PollGithubTelemetryOptions {
  force?: boolean;
  architectModeUnlocked?: boolean;
  now?: Date;
  fetchImpl?: typeof fetch;
}

export interface PollGithubTelemetryResult {
  ok: boolean;
  skippedThrottle?: boolean;
  detection: GithubActivityDetection | null;
  syncedAtIso?: string;
  error?: string;
}

/**
 * Queries `https://api.github.com/users/${githubUsername}/events` and returns uncredited
 * PushEvent, PullRequestEvent (merged/closed), and ReleaseEvent activity since 4:00 AM local rollover.
 */
export async function pollGithubActivityTelemetry(
  state: SymmetryState,
  options: PollGithubTelemetryOptions = {}
): Promise<PollGithubTelemetryResult> {
  const architectUnlocked = Boolean(options.architectModeUnlocked);
  const config = normalizeLiveTelemetryConfig(
    state.liveTelemetryConfig,
    architectUnlocked
  );
  const username = resolveEffectiveGithubUsername(state, architectUnlocked);

  if (!username) {
    return {
      ok: false,
      detection: null,
      error: 'No GitHub username configured.',
    };
  }

  const now = options.now ?? new Date();
  if (
    !options.force &&
    !isTelemetryPollDue(
      config.lastGithubSyncAt,
      config.pollIntervalMinutes,
      now.getTime()
    )
  ) {
    return {
      ok: true,
      skippedThrottle: true,
      detection: null,
    };
  }

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
  };
  if (config.githubToken && config.githubToken.trim().length > 0) {
    headers.Authorization = `Bearer ${config.githubToken.trim()}`;
  }

  const fetcher = options.fetchImpl ?? fetch;
  const endpoint = `https://api.github.com/users/${encodeURIComponent(
    username
  )}/events?per_page=50`;

  try {
    const response = await fetcher(endpoint, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      return {
        ok: false,
        detection: null,
        error: `GitHub API returned HTTP ${response.status}.`,
      };
    }

    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
      return {
        ok: false,
        detection: null,
        error: 'Unexpected GitHub events payload.',
      };
    }

    const rolloverHour = state.logicalDayRolloverHour ?? 4;
    const detection = filterUncreditedGithubEventsToday(
      data as GithubRawEvent[],
      config.creditedGithubEventIds,
      username,
      now,
      rolloverHour
    );

    return {
      ok: true,
      detection,
      syncedAtIso: now.toISOString(),
    };
  } catch (err) {
    return {
      ok: false,
      detection: null,
      error:
        err instanceof Error
          ? err.message
          : 'Network error polling GitHub activity.',
    };
  }
}
