import { describe, expect, it } from 'vitest';
import * as fc from 'fast-check';
import {
  DEFAULT_SYMMETRY_STATE,
  getTotalBaselineFloorBlocks,
} from '../state/defaultState';
import { LoadMode, ProjectItem, SymmetryState } from '../types/symmetry';
import {
  applyConfigPatchToState,
  compileNaturalLanguageToConfigPatch,
  getStartupStepDurationMinutes,
  isSocialOrLiveEveningEntry,
  validateAndClampConfigPatch,
  WorkspaceConfigPatch,
} from '../utils/configCompiler';

function cloneDefaultState(): SymmetryState {
  return JSON.parse(JSON.stringify(DEFAULT_SYMMETRY_STATE)) as SymmetryState;
}

describe('configCompiler — Smoke, Adversarial Guardrails & Property Invariants', () => {
  it('preserves valid fields while clamping adversarial violations and routing "Family Dinner" out of Evening hobby cards', () => {
    const initialState = cloneDefaultState();
    // Seed state with oversized queue & surge streak to verify state-level clamping too
    const extraProject = (idx: number): ProjectItem => ({
      ...initialState.projectQueue[0],
      id: `extra_proj_${idx}`,
      slot: 3,
      title: `Extra Deliverable #${idx}`,
    });
    initialState.projectQueue = [
      ...initialState.projectQueue,
      extraProject(4),
      extraProject(5),
    ];
    initialState.surgeConsecutiveDays = 5;

    const mixedAdversarialPatch: Record<string, unknown> = {
      schedulePrefs: {
        logicalDayRolloverHour: 3,
        layoutMode: 'widget',
      },
      startupStepMinutes: 0, // INVALID: tries to disable startup step
      closedListMax: 10, // INVALID: tries to expand Closed List to 10 active items
      maxConsecutiveSurgeDays: 5, // INVALID: tries to allow 5 consecutive Surge days
      disableEvening60mBreak: true, // INVALID: tries to remove 60m mandatory evening break
      option0MaxMinutes: 90, // INVALID: tries to bypass 40m Option 0 fork check
      eveningCategories: [
        {
          slotNumber: 1,
          name: 'Oil Painting',
          mode: 'fluid',
          activeTitle: 'Oil Painting Studio',
          startupStep5m: 'Set easel, squeeze 2 pigments, and brush 5m study.',
        },
        {
          slotNumber: 2,
          name: 'Sci-Fi',
          mode: 'sticky',
          activeTitle: 'Classic Sci-Fi Novel',
          startupStep5m: 'Open chapter away from work monitor for 5m.',
        },
        {
          slotNumber: 3,
          name: 'Family Dinner', // INVALID in Evening Recharge hobby menu (social/family)
          mode: 'fluid',
          activeTitle: 'Family Dinner',
          startupStep5m: 'Sit down for family dinner.',
        },
      ],
    };

    const { validatedPatch, guardrailNotes } = validateAndClampConfigPatch(
      mixedAdversarialPatch,
      initialState
    );

    // 1. Valid preferences preserved
    expect(validatedPatch.schedulePrefs?.logicalDayRolloverHour).toBe(3);
    expect(validatedPatch.schedulePrefs?.layoutMode).toBe('widget');

    // 2. Valid Evening Recharge channels ("Oil Painting", "Sci-Fi") preserved
    const validatedChannelNames = (validatedPatch.eveningCategories || []).map(
      (c) => c.name
    );
    expect(validatedChannelNames).toEqual(['Oil Painting', 'Sci-Fi']);
    expect(validatedChannelNames).not.toContain('Family Dinner');

    // 3. Invalid raw root keys stripped from validatedPatch
    expect(
      (validatedPatch as Record<string, unknown>).startupStepMinutes
    ).toBeUndefined();
    expect(
      (validatedPatch as Record<string, unknown>).closedListMax
    ).toBeUndefined();
    expect(
      (validatedPatch as Record<string, unknown>).maxConsecutiveSurgeDays
    ).toBeUndefined();

    // 4. "Family Dinner" routed to Fixed Evening Anchor & Top Shelter Banner
    expect(validatedPatch.schedulePrefs?.fixedEveningAnchorToday).toBe(true);
    expect(validatedPatch.schedulePrefs?.earlyShutdownTime).toBe('6:00 PM');
    expect(validatedPatch.houseTracks?.shelter?.subtitle).toContain(
      'Family Dinner'
    );

    // 5. Guardrail pushback notes populated for every violation
    expect(guardrailNotes.length).toBeGreaterThanOrEqual(4);
    const joinedNotes = guardrailNotes.join(' | ');
    expect(joinedNotes).toMatch(/Startup Step Guardrail/i);
    expect(joinedNotes).toMatch(/Closed List Guardrail/i);
    expect(joinedNotes).toMatch(/Surge Circuit Breaker Guardrail/i);
    expect(joinedNotes).toMatch(/Evening Pacing Guardrail/i);
    expect(joinedNotes).toMatch(/Family Dinner/i);

    // 6. Apply to state and verify all invariants hold on resulting SymmetryState
    const { nextState } = applyConfigPatchToState(initialState, validatedPatch);

    expect(nextState.logicalDayRolloverHour).toBe(3);
    expect(nextState.uiLayoutMode).toBe('widget');

    // Startup step clamped to >= 3m (3m on 15m cadence or 5m on 20m/25m cadence)
    const startupMins = getStartupStepDurationMinutes(nextState);
    expect(startupMins).toBeGreaterThanOrEqual(3);
    expect(startupMins).toBeLessThanOrEqual(5);

    // Closed List locked at <= 3 active items, overflow moved to backlog
    expect(nextState.projectQueue.length).toBe(3);
    expect(['STRICT_SERIALIZED', 'DUAL_SLOT']).toContain(
      nextState.flexibilityTuning?.closedListLockMode
    );

    // Consecutive Surge days locked at <= 2
    expect(nextState.surgeConsecutiveDays).toBeLessThanOrEqual(2);

    // 60m mandatory evening break & 40m Option 0 check preserved
    expect(['STANDARD_20_40_60', 'GENTLE_40_60']).toContain(
      nextState.flexibilityTuning?.eveningPulseSensitivity
    );
    expect(nextState.recharge.option0ConsecutiveWindows).toBeLessThanOrEqual(2);
    expect(nextState.recharge.option0SecondsLeft).toBeLessThanOrEqual(1200);

    // Evening hobby cards contain Oil Painting & Sci-Fi, never Family Dinner
    const cardNames = (nextState.recharge.categoryCards || []).map(
      (c) => c.categoryName
    );
    expect(cardNames).toContain('Oil Painting');
    expect(cardNames).toContain('Sci-Fi');
    expect(cardNames).not.toContain('Family Dinner');
    expect(nextState.fixedEvent).toBe('EVENING_OUTING_6PM');
  });

  it('clamps Daily Core Baseline floor above 8 blocks down to <= 8 and enforces lateNightBlocker on recall slots', () => {
    const initialState = cloneDefaultState();
    const { validatedPatch, guardrailNotes } = validateAndClampConfigPatch(
      {
        replaceAllBaselineSlots: true,
        baselineSlots: [
          {
            label: 'Anatomy Deck',
            blocksTarget: 5,
            isMechanicalRecall: true,
            supportsEarlyClearance: true,
            startupStep5m: '',
            cognitiveDemand: 'MECHANICAL_RECALL',
          },
          {
            label: 'Literature Synthesis',
            blocksTarget: 6,
            isMechanicalRecall: false,
            supportsEarlyClearance: false,
            startupStep5m: 'Read 2 pages and draft summary.',
            cognitiveDemand: 'DEEP_SYNTHESIS',
          },
        ],
      },
      initialState
    );

    const validatedSum = (validatedPatch.baselineSlots || []).reduce(
      (acc, s) => acc + s.blocksTarget,
      0
    );
    expect(validatedSum).toBe(8);
    expect(guardrailNotes.join(' ')).toMatch(/Baseline Floor Guardrail/i);

    const { nextState } = applyConfigPatchToState(initialState, validatedPatch);
    expect(getTotalBaselineFloorBlocks(nextState.baselineBlocks)).toBeLessThanOrEqual(8);
    const recallSlot = nextState.baselineBlocks.find(
      (b) => b.title === 'Anatomy Deck'
    );
    expect(recallSlot?.lateNightBlocker).toBe(true);
    expect(recallSlot?.startupStep.length).toBeGreaterThanOrEqual(4);
  });

  it('compiles natural-language multi-turn customization locally when offline', () => {
    const initialState = cloneDefaultState();
    const res = compileNaturalLanguageToConfigPatch(
      "I'm a freelance designer with ADHD—keep daily admin to 1 block, give me shorter 15m blocks, rename Evening slots around sketching, cozy games, and anime, and hide clutter.",
      initialState
    );

    expect(res.executionTier).toBe('LOCAL_COMPILER');
    expect(res.configPatch.schedulePrefs?.blockCadence).toBe('15m');
    expect(res.configPatch.schedulePrefs?.layoutMode).toBe('widget');
    expect(res.configPatch.baselineSlots?.[0]?.blocksTarget).toBe(1);
    expect(res.configPatch.eveningCategories?.length).toBeGreaterThanOrEqual(3);
  });

  it('fast-check property: across 200 arbitrary WorkspaceConfigPatch objects, state never violates Startup, 3-Tier, Closed List, or Evening invariants', () => {
    const arbNumber = fc.oneof(
      fc.integer({ min: -100, max: 200 }),
      fc.double({ noNaN: false }),
      fc.constantFrom(0, 1, 2, 3, 4, 8, 10, 15, 24, -5, Number.NaN, Number.POSITIVE_INFINITY)
    );

    const arbString = fc.oneof(
      fc.string({ maxLength: 50 }),
      fc.constantFrom(
        '',
        '   ',
        'Oil Painting',
        'Sci-Fi',
        'Family Dinner',
        'Date Night with Spouse',
        'Live Concert Outing',
        'Friends Party',
        '3D Printing K1C',
        'Sketching'
      )
    );

    const arbBaselineSlot = fc.record(
      {
        id: fc.option(arbString, { nil: undefined }),
        label: arbString,
        blocksTarget: arbNumber,
        isMechanicalRecall: fc.boolean(),
        supportsEarlyClearance: fc.boolean(),
        startupStep5m: arbString,
        cognitiveDemand: fc.constantFrom(
          'DEEP_SYNTHESIS',
          'MECHANICAL_RECALL',
          'LIGHT_ADMIN',
          'INVALID_COG'
        ),
      },
      { requiredKeys: [] }
    );

    const arbSubTrack = fc.record(
      {
        id: fc.option(arbString, { nil: undefined }),
        label: arbString,
        activeTitle: arbString,
        startupStep5m: arbString,
      },
      { requiredKeys: [] }
    );

    const arbEveningCategory = fc.record(
      {
        id: fc.option(arbString, { nil: undefined }),
        slotNumber: fc.option(arbNumber, { nil: undefined }),
        name: arbString,
        icon: fc.option(arbString, { nil: undefined }),
        mode: fc.constantFrom('sticky', 'fluid', 'gamified_invalid'),
        tripleTrack: fc.option(fc.boolean(), { nil: undefined }),
        activeTitle: arbString,
        startupStep5m: arbString,
        hidden: fc.option(fc.boolean(), { nil: undefined }),
        subTracks: fc.option(fc.array(arbSubTrack, { maxLength: 5 }), {
          nil: undefined,
        }),
      },
      { requiredKeys: [] }
    );

    const arbWorkspacePatch = fc.record(
      {
        presetMeta: fc.option(
          fc.record(
            {
              name: fc.option(arbString, { nil: undefined }),
              description: fc.option(arbString, { nil: undefined }),
              saveAsNewCustomPreset: fc.option(fc.boolean(), { nil: undefined }),
            },
            { requiredKeys: [] }
          ),
          { nil: undefined }
        ),
        schedulePrefs: fc.option(
          fc.record(
            {
              logicalDayRolloverHour: fc.option(arbNumber, { nil: undefined }),
              earlyShutdownTime: fc.option(arbString, { nil: undefined }),
              blockCadence: fc.option(
                fc.constantFrom('15m', '20m', '25m', '0m', '60m', 'invalid'),
                { nil: undefined }
              ),
              closedListLockMode: fc.option(
                fc.constantFrom(
                  'strict_focus_1',
                  'dual_slot_ambition',
                  'unlocked_all_10'
                ),
                { nil: undefined }
              ),
              eveningPulseSensitivity: fc.option(
                fc.constantFrom('standard', 'gentle', 'disabled'),
                { nil: undefined }
              ),
              layoutMode: fc.option(
                fc.constantFrom('split', 'widget', 'full', 'chaos'),
                { nil: undefined }
              ),
              fixedEveningAnchorToday: fc.option(fc.boolean(), { nil: undefined }),
              startupStepMinutes: fc.option(arbNumber, { nil: undefined }),
              closedListMax: fc.option(arbNumber, { nil: undefined }),
              maxConsecutiveSurgeDays: fc.option(arbNumber, { nil: undefined }),
            },
            { requiredKeys: [] }
          ),
          { nil: undefined }
        ),
        replaceAllBaselineSlots: fc.option(fc.boolean(), { nil: undefined }),
        baselineSlots: fc.option(fc.array(arbBaselineSlot, { maxLength: 12 }), {
          nil: undefined,
        }),
        eveningCategories: fc.option(
          fc.array(arbEveningCategory, { maxLength: 9 }),
          { nil: undefined }
        ),
        // Adversarial top-level LLM hallucination fields
        startupStepMinutes: fc.option(arbNumber, { nil: undefined }),
        disableStartupStep: fc.option(fc.boolean(), { nil: undefined }),
        closedListMax: fc.option(arbNumber, { nil: undefined }),
        maxClosedListItems: fc.option(arbNumber, { nil: undefined }),
        maxConsecutiveSurgeDays: fc.option(arbNumber, { nil: undefined }),
        cruiseBlocks: fc.option(arbNumber, { nil: undefined }),
        surgeBlocks: fc.option(arbNumber, { nil: undefined }),
        taperBlocks: fc.option(arbNumber, { nil: undefined }),
        disableEvening60mBreak: fc.option(fc.boolean(), { nil: undefined }),
        disableOption0ForkCheck: fc.option(fc.boolean(), { nil: undefined }),
        eveningBreakMinutes: fc.option(arbNumber, { nil: undefined }),
        option0MaxMinutes: fc.option(arbNumber, { nil: undefined }),
      },
      { requiredKeys: [] }
    );

    const arbInitialMode = fc.constantFrom<LoadMode>('CRUISE', 'SURGE', 'TAPER');
    const arbExtraQueueCount = fc.integer({ min: 0, max: 6 });
    const arbInitialSurgeDays = fc.integer({ min: -2, max: 10 });
    const arbRawAdjustment = fc.integer({ min: -5, max: 40 });

    const baseTemplate = cloneDefaultState();

    fc.assert(
      fc.property(
        arbWorkspacePatch,
        arbInitialMode,
        arbExtraQueueCount,
        arbInitialSurgeDays,
        arbRawAdjustment,
        (rawPatch, loadMode, extraQueueCount, surgeDays, rawAdj) => {
          const seedState: SymmetryState = JSON.parse(
            JSON.stringify(baseTemplate)
          );
          seedState.loadMode = loadMode;
          seedState.surgeConsecutiveDays = surgeDays;
          seedState.customModeBlockAdjustment = rawAdj;
          seedState.recharge.option0ConsecutiveWindows = 5;
          seedState.recharge.option0SecondsLeft = 9999;

          for (let i = 0; i < extraQueueCount; i++) {
            seedState.projectQueue.push({
              ...baseTemplate.projectQueue[0],
              id: `fuzz_proj_${i}`,
              slot: 3,
              title: `Fuzz Project ${i}`,
            });
          }

          const { validatedPatch } = validateAndClampConfigPatch(
            rawPatch as Record<string, unknown>,
            seedState
          );
          const { nextState } = applyConfigPatchToState(
            seedState,
            validatedPatch as WorkspaceConfigPatch
          );

          // Invariant 1: Startup Step minimums (>= 3m timer stage + non-empty startup prompts)
          const startupMinutes = getStartupStepDurationMinutes(nextState);
          expect(startupMinutes).toBeGreaterThanOrEqual(3);
          expect([3, 5]).toContain(startupMinutes);
          for (const block of nextState.baselineBlocks) {
            expect(block.startupStep.trim().length).toBeGreaterThanOrEqual(4);
          }

          // Invariant 2: 3-Tier block ceilings & Surge circuit breaker
          expect(nextState.surgeConsecutiveDays).toBeGreaterThanOrEqual(0);
          expect(nextState.surgeConsecutiveDays).toBeLessThanOrEqual(2);
          if (nextState.loadMode === 'CRUISE') {
            expect(nextState.customModeBlockAdjustment).toBeGreaterThanOrEqual(11);
            expect(nextState.customModeBlockAdjustment).toBeLessThanOrEqual(13);
          } else if (nextState.loadMode === 'SURGE') {
            expect(nextState.customModeBlockAdjustment).toBeGreaterThanOrEqual(14);
            expect(nextState.customModeBlockAdjustment).toBeLessThanOrEqual(15);
          } else if (nextState.loadMode === 'TAPER') {
            expect(nextState.customModeBlockAdjustment).toBeGreaterThanOrEqual(7);
            expect(nextState.customModeBlockAdjustment).toBeLessThanOrEqual(9);
          }

          // Daily Core Baseline ceiling (0..8 blocks) & recall lateNightBlocker
          const floorTotal = getTotalBaselineFloorBlocks(nextState.baselineBlocks);
          expect(floorTotal).toBeGreaterThanOrEqual(0);
          expect(floorTotal).toBeLessThanOrEqual(8);
          for (const b of nextState.baselineBlocks) {
            if (
              b.category === 'FLASHCARDS_ANATOMY' ||
              b.category === 'FLASHCARDS_COMP'
            ) {
              expect(b.lateNightBlocker).toBe(true);
            }
          }

          // Invariant 3: Closed List serialization & hard cap of 3 items
          expect(nextState.projectQueue.length).toBeLessThanOrEqual(3);
          expect(['STRICT_SERIALIZED', 'DUAL_SLOT']).toContain(
            nextState.flexibilityTuning?.closedListLockMode
          );

          // Invariant 4: Evening 60m mandatory break, 40m Option 0 Fork Check & zero social/family hobby cards
          expect(['STANDARD_20_40_60', 'GENTLE_40_60']).toContain(
            nextState.flexibilityTuning?.eveningPulseSensitivity
          );
          expect(nextState.recharge.option0ConsecutiveWindows).toBeGreaterThanOrEqual(
            0
          );
          expect(nextState.recharge.option0ConsecutiveWindows).toBeLessThanOrEqual(2);
          expect(nextState.recharge.option0SecondsLeft).toBeGreaterThanOrEqual(0);
          expect(nextState.recharge.option0SecondsLeft).toBeLessThanOrEqual(1200);

          const cards = nextState.recharge.categoryCards || [];
          expect(cards.length).toBeLessThanOrEqual(6);
          for (const card of cards) {
            expect(
              isSocialOrLiveEveningEntry(
                `${card.categoryName} ${card.activeTitle}`
              )
            ).toBe(false);
            expect(
              (card.startupStep || card.startupPrompt || '').trim().length
            ).toBeGreaterThanOrEqual(4);
            for (const sub of card.subTracks || []) {
              expect(
                isSocialOrLiveEveningEntry(`${sub.label} ${sub.activeTitle}`)
              ).toBe(false);
            }
          }

          // Valid rollover hour if set
          if (typeof nextState.logicalDayRolloverHour === 'number') {
            expect(nextState.logicalDayRolloverHour).toBeGreaterThanOrEqual(0);
            expect(nextState.logicalDayRolloverHour).toBeLessThanOrEqual(23);
          }
        }
      ),
      { numRuns: 200 }
    );
  });
});
