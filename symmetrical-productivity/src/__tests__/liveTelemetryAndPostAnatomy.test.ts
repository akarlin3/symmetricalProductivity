import { describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SYMMETRY_STATE,
  generateSequentialChecklist,
  getBaselineSlotTargetBlocks,
  isOpenListItemUnlocked,
  parseFromStateInput,
  serializeToStateMarkdown,
  syncArchitectBaselineToPostAnatomy,
} from '../state/defaultState';
import {
  buildStateForPreset,
  getVisibleProfilePresets,
} from '../utils/presets';
import {
  classifyCalendarInputForSevenDays,
  pollLiveCalendarFeed,
} from '../utils/calendarImporter';
import {
  applyGithubActivityCreditToState,
  filterUncreditedGithubEventsToday,
  GithubRawEvent,
  mapGithubRepoToRoadmapTrack,
  pollGithubActivityTelemetry,
} from '../utils/githubTelemetry';
import { compileFullGeminiPayload } from '../utils/geminiExporter';
import { parseGeminiResponseToStatePatch } from '../utils/geminiImporter';

describe('v1.1.0 Live External Telemetry Bridges & Post-Anatomy Baseline Shift', () => {
  describe('1. Live Calendar Polling & 7-Day Auto-Anchor Classification', () => {
    it('classifies >=90m shift as TAPER_LAB, 17:30-21:00 as Early Shutdown (6:00 PM), and tomorrow <10:00 AM as Morning Anchor lock', () => {
      // Logical anchor: Friday Nov 13, 2026 11:00 AM local
      const now = new Date(2026, 10, 13, 11, 0, 0);

      const sampleIcs = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        // Today (Nov 13): 2-hour Clinical Practicum Lab 13:00 - 15:00 (>= 90m)
        'BEGIN:VEVENT',
        'SUMMARY:Medical Physics Practicum Lab',
        'DTSTART:20261113T130000',
        'DTEND:20261113T150000',
        'END:VEVENT',
        // Today (Nov 13): Evening Dinner Outing 18:30 - 20:00 (between 17:30 and 21:00)
        'BEGIN:VEVENT',
        'SUMMARY:Evening Concert Outing',
        'DTSTART:20261113T183000',
        'DTEND:20261113T200000',
        'END:VEVENT',
        // Tomorrow (Nov 14): 09:00 AM Seminar (< 10:00 AM)
        'BEGIN:VEVENT',
        'SUMMARY:Morning Seminar',
        'DTSTART:20261114T090000',
        'DTEND:20261114T100000',
        'END:VEVENT',
        // Day 3 (Nov 15): Standalone Evening Outing 19:00 - 20:30
        'BEGIN:VEVENT',
        'SUMMARY:Evening Theater Outing',
        'DTSTART:20261115T190000',
        'DTEND:20261115T203000',
        'END:VEVENT',
        'END:VCALENDAR',
      ].join('\r\n');

      const res = classifyCalendarInputForSevenDays(
        sampleIcs,
        DEFAULT_SYMMETRY_STATE,
        now
      );

      expect(res.hasMorningAnchorTomorrow).toBe(true);
      expect(res.taperDaysCount).toBe(1);
      expect(res.earlyShutdownDaysCount).toBe(2);

      const todayRow = res.nextState.pipelineDays[0];
      expect(todayRow.loadMode).toBe('TAPER');
      expect(todayRow.baseTargetBlocks).toBe(8);
      expect(todayRow.fixedEvent).toBe('LAB_2H');
      expect(todayRow.fixedEventTimeLabel).toContain('Early Shutdown (6:00 PM)');
      expect(res.nextState.loadMode).toBe('TAPER');

      const tomorrowRow = res.nextState.pipelineDays[1];
      expect(tomorrowRow.earlyMorningAnchor).toBe(true);
      expect(res.nextState.hasMorningAnchorTomorrow).toBe(true);

      const day3Row = res.nextState.pipelineDays[2];
      expect(day3Row.fixedEvent).toBe('EVENING_OUTING_6PM');
      expect(day3Row.fixedEventTimeLabel).toContain('Early Shutdown (6:00 PM)');
    });

    it('throttles background polling within pollIntervalMinutes unless force=true', async () => {
      const now = new Date(2026, 10, 13, 12, 0, 0);
      const fiveMinutesAgo = new Date(now.getTime() - 5 * 60_000).toISOString();

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () =>
          'BEGIN:VCALENDAR\nBEGIN:VEVENT\nSUMMARY:Clinic Lab\nDTSTART:20261113T130000\nDTEND:20261113T150000\nEND:VEVENT\nEND:VCALENDAR',
      }) as unknown as typeof fetch;

      const configuredState = {
        ...DEFAULT_SYMMETRY_STATE,
        liveTelemetryConfig: {
          icsFeedUrl: 'https://calendar.example.com/feed.ics',
          pollIntervalMinutes: 15,
          lastCalendarSyncAt: fiveMinutesAgo,
          githubUsername: 'akarlin3',
          githubAutoCreditEnabled: false,
          creditedGithubEventIds: [],
        },
      };

      const throttled = await pollLiveCalendarFeed(configuredState, {
        now,
        fetchImpl: mockFetch,
      });
      expect(throttled.ok).toBe(true);
      expect(throttled.skippedThrottle).toBe(true);
      expect(mockFetch).not.toHaveBeenCalled();

      const forced = await pollLiveCalendarFeed(configuredState, {
        force: true,
        now,
        fetchImpl: mockFetch,
      });
      expect(forced.ok).toBe(true);
      expect(forced.skippedThrottle).toBeUndefined();
      expect(forced.classification?.nextState.loadMode).toBe('TAPER');
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Live GitHub Activity Auto-Credit Bridge', () => {
    it('maps scientific repos to Major Track 1 (1B_INDEPENDENT) and tooling repos to Minor Track 1 (SANDBOX_1)', () => {
      expect(mapGithubRepoToRoadmapTrack('akarlin3/IVIMBench')).toMatchObject({
        target: '1B_INDEPENDENT',
        trackId: 'science',
        subTrack: '1B_INDEPENDENT',
        targetRung: 4,
      });
      expect(mapGithubRepoToRoadmapTrack('akarlin3/conformalIVIM')).toMatchObject(
        {
          target: '1B_INDEPENDENT',
          trackId: 'science',
          subTrack: '1B_INDEPENDENT',
        }
      );
      expect(
        mapGithubRepoToRoadmapTrack('akarlin3/symmetricalProductivity')
      ).toMatchObject({
        target: 'SANDBOX_1',
        trackId: 'coding',
        targetRung: 3,
      });
    });

    it('filters PushEvent, merged/closed PullRequestEvent, and ReleaseEvent since 4:00 AM rollover and deduplicates credited IDs', async () => {
      // Logical day: Nov 13, 2026 at 14:00 local (boundary = Nov 13 04:00 local)
      const now = new Date(2026, 10, 13, 14, 0, 0);
      const today10AmIso = new Date(2026, 10, 13, 10, 30, 0).toISOString();
      const today02AmPrevLogicalDayIso = new Date(
        2026,
        10,
        13,
        2,
        15,
        0
      ).toISOString();

      const rawEvents: GithubRawEvent[] = [
        {
          id: 'ev_push_1',
          type: 'PushEvent',
          created_at: today10AmIso,
          repo: { name: 'akarlin3/IVIMBench' },
          payload: { distinct_size: 3 },
        },
        {
          id: 'ev_rel_1',
          type: 'ReleaseEvent',
          created_at: today10AmIso,
          repo: { name: 'akarlin3/IVIMBench' },
          payload: { action: 'published' },
        },
        {
          id: 'ev_before_rollover',
          type: 'PushEvent',
          created_at: today02AmPrevLogicalDayIso,
          repo: { name: 'akarlin3/IVIMBench' },
          payload: { size: 2 },
        },
      ];

      const detection = filterUncreditedGithubEventsToday(
        rawEvents,
        [],
        'akarlin3',
        now,
        4
      );
      expect(detection).not.toBeNull();
      expect(detection!.primaryRepo).toBe('IVIMBench');
      expect(detection!.totalActivityUnits).toBe(4);
      expect(detection!.bannerMessage).toBe(
        'Detected GitHub activity on IVIMBench (4 commits/releases today) — Credit 1 Ambition Drip / Output block?'
      );

      const beforeScienceTrack = DEFAULT_SYMMETRY_STATE.roadmapTracks.find(
        (t) => t.id === 'science'
      )!;
      const creditedState = applyGithubActivityCreditToState(
        DEFAULT_SYMMETRY_STATE,
        detection!,
        now
      );

      expect(creditedState.dailySovereignDripDone).toBe(true);
      expect(
        creditedState.dailyAmbitionDrip?.completedToday
      ).toBeGreaterThanOrEqual(1);
      expect(creditedState.liveTelemetryConfig?.creditedGithubEventIds).toEqual([
        'ev_push_1',
        'ev_rel_1',
      ]);

      const afterScienceTrack = creditedState.roadmapTracks.find(
        (t) => t.id === 'science'
      )!;
      expect(afterScienceTrack.outputBlocksCredited).toBe(
        beforeScienceTrack.outputBlocksCredited + 1
      );
      expect(afterScienceTrack.subTrack1BBlocksCredited).toBe(
        (beforeScienceTrack.subTrack1BBlocksCredited ?? 0) + 1
      );

      // Re-running with credited IDs produces zero new detections (no double-counting)
      const secondPass = filterUncreditedGithubEventsToday(
        rawEvents,
        creditedState.liveTelemetryConfig!.creditedGithubEventIds,
        'akarlin3',
        now,
        4
      );
      expect(secondPass).toBeNull();

      // Verify pollGithubActivityTelemetry returns error when public preset has blank username
      const publicPreset = buildStateForPreset('ACADEMIC_GRAD');
      const publicPoll = await pollGithubActivityTelemetry(publicPreset, {
        architectModeUnlocked: false,
        force: true,
      });
      expect(publicPoll.ok).toBe(false);
      expect(publicPoll.detection).toBeNull();
    });
  });

  describe('3. Post-Anatomy Architect Mode Baseline Rebalance & Public Preset Secularity', () => {
    it('configures Architect Mode for 100% Dec 8–9 Comp Exam Sprint + Lab Report #4 Focus #1', () => {
      const arch = DEFAULT_SYMMETRY_STATE;
      expect(arch.appVersion).toBe('1.1.0');

      // Upcoming Milestones Banner
      expect(arch.upcomingMilestones).toEqual([
        'Dec 8–9: Comp Exam (Primary Sprint)',
        'Nov 24: Lab Report #4',
        'Nov 25 – Dec 3: Practicum Phase 1 Coding & Figures',
      ]);

      // 7-Block Daily Core Baseline Floor (4b Comp + 2b Reading + 1b Synthesis)
      expect(arch.baselineBlocks).toHaveLength(3);
      expect(getBaselineSlotTargetBlocks(arch.baselineBlocks[0])).toBe(4);
      expect(arch.baselineBlocks[0].title).toContain(
        '4b Comp Flashcard Sprints (250-card RemNote daily cap)'
      );
      expect(arch.baselineBlocks[0].isMechanicalRecall).toBe(true);
      expect(arch.baselineBlocks[0].supportsEarlyClearance).toBe(true);

      expect(getBaselineSlotTargetBlocks(arch.baselineBlocks[1])).toBe(2);
      expect(arch.baselineBlocks[1].title).toContain(
        '2b Half-Chapter Comp Reading (28 half-chapters remaining)'
      );
      expect(getBaselineSlotTargetBlocks(arch.baselineBlocks[2])).toBe(1);
      expect(arch.baselineBlocks[2].title).toContain(
        '1b Half-Chapter Note Synthesis & Equation Audit'
      );

      // Late-Night Blocker keeps flashcards out of the final 2 work blocks
      const checklist = generateSequentialChecklist(arch);
      const workSteps = checklist.filter((s) => s.kind === 'WORK_BLOCK');
      expect(workSteps.length).toBeGreaterThanOrEqual(7);
      const lastTwoWorkSteps = workSteps.slice(-2);
      for (const step of lastTwoWorkSteps) {
        expect(step.taskType).not.toBe('FLASHCARDS');
      }

      // Closed List (Max 3 — Lab Report #4 Focus #1 [0/8])
      expect(arch.projectQueue).toHaveLength(3);
      expect(arch.projectQueue[0].title).toBe('Lab Report #4 (Due Tue, Nov 24)');
      expect(arch.projectQueue[0].totalBlocks).toBe(8);
      expect(arch.projectQueue[0].completedBlocks).toBe(0);
      expect(arch.projectQueue[0].blockSubSteps).toHaveLength(8);
      expect(arch.projectQueue[1].title).toBe(
        'A Symmetrical Triptych: Edition 4 (Completion & Submissions)'
      );
      expect(arch.projectQueue[1].totalBlocks).toBe(6);
      expect(arch.projectQueue[2].title).toBe(
        'Fixing the Creality K1C 3D Printer'
      );
      expect(arch.projectQueue[2].totalBlocks).toBe(3);

      // Open List Backlog & Prerequisite Gate on Debut Science Fiction Novel
      expect(arch.openListBacklog).toHaveLength(4);
      const novelItem = arch.openListBacklog.find((item) =>
        item.title.includes('Debut Science Fiction Novel')
      )!;
      expect(novelItem.prerequisiteTitle).toBe(
        'A Symmetrical Triptych: Edition 4 (Completion & Submissions)'
      );
      expect(
        isOpenListItemUnlocked(novelItem, arch.completedDeliverablesLog)
      ).toBe(false);
      expect(
        isOpenListItemUnlocked(novelItem, [
          ...arch.completedDeliverablesLog,
          {
            id: 'done_ed4',
            title:
              'A Symmetrical Triptych: Edition 4 (Completion & Submissions)',
            trackId: 'writing',
            presetType: 'CUSTOM',
            totalBlocks: 6,
            blockCount: 6,
            blocksCompleted: 6,
            date: '2026-11-30',
            completedDate: '2026-11-30',
            completedAt: '2026-11-30',
          },
        ])
      ).toBe(true);

      // Completed Deliverables Archive includes the 4 new Nov 10-12 entries
      const completedTitles = (arch.completedDeliverablesLog || []).map(
        (c) => c.title
      );
      expect(completedTitles).toEqual(
        expect.arrayContaining([
          'Nov 12 Anatomy Exam Completed',
          'Practicum Presentation Research Project Proposal (6/6)',
          'IVIMBench v1.4.0 (Unified Ecosystem Bridge, NIfTI I/O, Gnomon & Forge)',
          'conformalIVIM v1.1.0 (3D/4D NIfTI Volume Wrapper)',
        ])
      );
    });

    it('migrates legacy localStorage state via syncArchitectBaselineToPostAnatomy without wiping logs or Sticky [X / 3] counters', () => {
      const legacySession = {
        ...DEFAULT_SYMMETRY_STATE,
        baselineBlocks: [
          {
            id: 'fc_anat_legacy',
            title: '1b Anatomy Flashcards (Legacy)',
            category: 'FLASHCARDS_ANATOMY' as const,
            blocksTarget: 1,
            completedBlocks: 1,
            completed: true,
            supportsEarlyClearance: true,
            bankedViaEarlyClearance: false,
            trackId: 'science' as const,
            startupStep: 'Legacy step',
          },
        ],
        todayBlockLog: [
          {
            id: 'log_keep_1',
            timestamp: '2026-11-12T15:00:00.000Z',
            logicalDate: '2026-11-12',
            category: 'PROJECT_FOCUS_1' as const,
            title: 'Preserved Historical Block',
            durationMinutes: 20,
            blockUnits: 1,
            roadmapTrack: 'science' as const,
            stroke: 'OUTPUT' as const,
            rungNumber: 3 as const,
          },
        ],
        recharge: {
          ...DEFAULT_SYMMETRY_STATE.recharge,
          stickySlots: {
            ...DEFAULT_SYMMETRY_STATE.recharge.stickySlots,
            CAT2_MAKER: {
              ...DEFAULT_SYMMETRY_STATE.recharge.stickySlots.CAT2_MAKER,
              fiveMinStarts: 2,
            },
            CAT5_GAMING: {
              ...DEFAULT_SYMMETRY_STATE.recharge.stickySlots.CAT5_GAMING,
              fiveMinStarts: 3,
            },
          },
        },
      };

      const migrated = syncArchitectBaselineToPostAnatomy(legacySession);
      expect(migrated.appVersion).toBe('1.1.0');
      expect(migrated.baselineBlocks[0].title).toContain(
        '4b Comp Flashcard Sprints'
      );
      expect(migrated.projectQueue[0].title).toBe(
        'Lab Report #4 (Due Tue, Nov 24)'
      );
      expect(migrated.todayBlockLog).toHaveLength(1);
      expect(migrated.todayBlockLog![0].id).toBe('log_keep_1');
      expect(migrated.recharge.stickySlots.CAT2_MAKER.fiveMinStarts).toBe(2);
      expect(migrated.recharge.stickySlots.CAT5_GAMING.fiveMinStarts).toBe(3);
    });

    it('keeps all 4 public presets 100% generic, secular, and free of personal usernames or milestones', () => {
      const publicPresets = getVisibleProfilePresets(false);
      expect(publicPresets.map((p) => p.id)).not.toContain('AVERY_DEFAULT');

      for (const presetMeta of [
        'ACADEMIC_GRAD',
        'SOFTWARE_BUILDER',
        'WRITER_CREATIVE',
        'BALANCED_CORE',
      ] as const) {
        const built = buildStateForPreset(presetMeta);
        expect(built.liveTelemetryConfig?.githubUsername || '').toBe('');
        expect(built.upcomingMilestones.length).toBeGreaterThan(0);
        const serialized = JSON.stringify(built);
        expect(serialized).not.toMatch(
          /akarlin3|IVIMBench|RemNote|Triptych|K1C|Lab Report #4|Comp Exam|Nov 24|Dec 8/i
        );
      }
    });
  });

  describe('4. Bidirectional symmetrical-sync v1.1.0 Schema Round-Trip', () => {
    it('preserves appVersion: "1.1.0", hasMorningAnchorTomorrow, and liveTelemetryConfig across state.md and Gemini exports/imports', () => {
      const customState = {
        ...DEFAULT_SYMMETRY_STATE,
        appVersion: '1.1.0',
        hasMorningAnchorTomorrow: true,
        liveTelemetryConfig: {
          icsFeedUrl: 'https://calendar.google.com/calendar/ical/test/basic.ics',
          pollIntervalMinutes: 20,
          lastCalendarSyncAt: '2026-11-12T18:00:00.000Z',
          githubUsername: 'akarlin3',
          githubAutoCreditEnabled: true,
          lastGithubSyncAt: '2026-11-12T18:05:00.000Z',
          creditedGithubEventIds: ['gh_evt_101', 'gh_evt_102'],
        },
      };

      // Round-trip via Gemini MODE_D_MARKDOWN -> parseGeminiResponseToStatePatch
      const exportedMd = compileFullGeminiPayload(
        customState,
        'MODE_D_MARKDOWN'
      );
      expect(exportedMd).toContain('"appVersion": "1.1.0"');
      expect(exportedMd).toContain('gh_evt_101');

      const importedPatch = parseGeminiResponseToStatePatch(
        exportedMd,
        DEFAULT_SYMMETRY_STATE
      );
      expect(importedPatch.nextState.appVersion).toBe('1.1.0');
      expect(importedPatch.nextState.hasMorningAnchorTomorrow).toBe(true);
      expect(importedPatch.nextState.liveTelemetryConfig).toMatchObject({
        icsFeedUrl: 'https://calendar.google.com/calendar/ical/test/basic.ics',
        pollIntervalMinutes: 20,
        githubUsername: 'akarlin3',
        githubAutoCreditEnabled: true,
        creditedGithubEventIds: ['gh_evt_101', 'gh_evt_102'],
      });

      // Round-trip via 3-Part state.md serializer/parser
      const stateMd = serializeToStateMarkdown(customState);
      const restored = parseFromStateInput(stateMd, DEFAULT_SYMMETRY_STATE);
      expect(restored.appVersion).toBe('1.1.0');
      expect(restored.hasMorningAnchorTomorrow).toBe(true);
      expect(restored.liveTelemetryConfig?.creditedGithubEventIds).toEqual([
        'gh_evt_101',
        'gh_evt_102',
      ]);
    });
  });
});
