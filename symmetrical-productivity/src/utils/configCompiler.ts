import {
  BaselineBlock,
  BaselineCategory,
  CognitiveDemandTag,
  EveningCategoryCardConfig,
  EveningSubTrackConfig,
  RechargeCategoryId,
  RoadmapHorizonNote,
  RoadmapRung,
  RoadmapTrack,
  StickyKey,
  StructureFlexibilityConfig,
  SymmetryState,
  TaskWeightsConfig,
  TrackId,
  UiTerminologyOverrides,
} from '../types/symmetry';
import {
  DEFAULT_FLEXIBILITY_TUNING,
  DEFAULT_HOUSE_FOUNDATION,
  DEFAULT_HOUSE_SHELTER,
  DEFAULT_SYMMETRY_STATE,
  formatRolloverHourLabel,
  getBaselineSlotTargetBlocks,
  getEffectiveEveningCategoryCards,
  getLogicalDayKey,
  migrateRoadmapTracksToHouseTopology,
  syncTodayIntoDailyHistory,
} from '../state/defaultState';
import {
  ProfilePresetDefinition,
  saveCurrentSetupAsPreset,
  syncCategoryCardsToLegacyRecharge,
} from './presets';
import { callGemini, hasActiveGeminiAccess } from './geminiClient';

// ============================================================================
// 1. UNIFIED MUTABLE CONFIGURATION SCHEMA (`WorkspaceConfigPatch`)
// ============================================================================

export type BlockCadenceOption = '15m' | '20m' | '25m';
export type ClosedListLockOption = 'strict_focus_1' | 'dual_slot_ambition';
export type EveningPulseOption = 'standard' | 'gentle';
export type WorkspaceLayoutOption = 'split' | 'widget' | 'full';

export interface PresetMetaPatch {
  name?: string;
  description?: string;
  saveAsNewCustomPreset?: boolean;
}

export interface SchedulePrefsPatch {
  logicalDayRolloverHour?: number; // 0..23
  earlyShutdownTime?: string; // e.g. '6:00 PM'
  blockCadence?: BlockCadenceOption;
  closedListLockMode?: ClosedListLockOption;
  eveningPulseSensitivity?: EveningPulseOption;
  layoutMode?: WorkspaceLayoutOption;
  fixedEveningAnchorToday?: boolean;
}

export interface BaselineSlotPatch {
  id?: string;
  label: string;
  blocksTarget: number; // Clamped so total across slots is 0..8
  isMechanicalRecall: boolean;
  supportsEarlyClearance: boolean;
  startupStep5m: string;
  cognitiveDemand: CognitiveDemandTag;
}

export interface TaskWeightTemplatesPatch {
  heavyLabel?: string;
  heavyBlocks?: number;
  mediumLabel?: string;
  mediumBlocks?: number;
  quickLabel?: string;
  quickBlocks?: number;
}

export interface BreakMenuLabelsPatch {
  level1MicroReset?: string;
  level2Espresso?: string;
  level2Music?: string;
  level2Physical?: string;
  level3MidDayReset?: string;
  stressBreathing?: string;
  stressEspresso?: string;
  stressPhysical?: string;
}

export interface EveningSubTrackPatch {
  id?: string;
  label: string;
  activeTitle: string;
  startupStep5m: string;
}

export interface EveningCategoryPatch {
  id?: string;
  slotNumber?: number; // 1..6
  name: string;
  icon?: string; // 'music' | 'palette' | 'wrench' | 'book' | 'tv' | 'gamepad' | 'sparkles' | 'code' | 'globe' | 'film' | 'coffee' | 'headphones'
  mode: 'sticky' | 'fluid';
  tripleTrack?: boolean;
  activeTitle: string;
  startupStep5m: string;
  hidden?: boolean;
  subTracks?: EveningSubTrackPatch[];
}

export interface HouseRungPatch {
  rungNumber: 1 | 2 | 3 | 4;
  label?: string;
  description?: string;
  ledgerType?: 'INPUT' | 'OUTPUT';
  targetBlocks?: number;
}

export interface HouseTrackPatch {
  trackId: 'science' | 'writing' | 'coding' | 'music' | 'culture';
  title?: string;
  isSandbox?: boolean;
  inputWeeklyTarget?: number;
  outputWeeklyTarget?: number;
  rungs?: HouseRungPatch[];
}

export interface HouseBannerPatch {
  title?: string;
  subtitle?: string;
  statusSummary?: string;
  horizonNotes?: {
    horizon: 1 | 2 | 3 | 4;
    label?: string;
    note: string;
  }[];
}

export interface HouseTracksPatch {
  shelter?: HouseBannerPatch;
  foundation?: HouseBannerPatch;
  tracks?: HouseTrackPatch[];
}

export interface WorkspaceConfigPatch {
  presetMeta?: PresetMetaPatch;
  schedulePrefs?: SchedulePrefsPatch;
  baselineSlots?: BaselineSlotPatch[];
  /** When true, replaces entire baseline array (even if empty = 0 blocks). Otherwise merges/replaces provided slots. */
  replaceAllBaselineSlots?: boolean;
  taskWeightTemplates?: TaskWeightTemplatesPatch;
  breakMenuLabels?: BreakMenuLabelsPatch;
  eveningCategories?: EveningCategoryPatch[];
  houseTracks?: HouseTracksPatch;
  uiTerminologyOverrides?: UiTerminologyOverrides;
}

export interface ArchitectClarifyingOption {
  id: string;
  label: string;
  prompt: string;
}

export type ArchitectExecutionTier =
  | 'GEMINI_FLASH'
  | 'CHROME_BUILTIN_AI'
  | 'LOCAL_COMPILER';

export interface ArchitectTurnResponse {
  reply: string;
  clarifyingOptions: ArchitectClarifyingOption[];
  configPatch: WorkspaceConfigPatch;
  guardrailNotes: string[];
  executionTier: ArchitectExecutionTier;
}

export interface ArchitectChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestampIso: string;
  turnResponse?: ArchitectTurnResponse;
  appliedDiffCount?: number;
}

export interface ConfigDiffItem {
  id: string;
  section:
    | 'presetMeta'
    | 'schedulePrefs'
    | 'baselineSlots'
    | 'taskWeightTemplates'
    | 'breakMenuLabels'
    | 'eveningCategories'
    | 'houseTracks'
    | 'uiTerminologyOverrides';
  sectionLabel: string;
  changeKind: 'MODIFIED' | 'ADDED' | 'RENAMED';
  label: string;
  beforeSummary: string;
  afterSummary: string;
}

// ============================================================================
// 2. STRICT JSON SCHEMAS (Standard JSON Schema + Gemini REST Schema)
// ============================================================================

/**
 * Standard JSON Schema (Draft 2020-12 compatible) for Chrome Built-In `LanguageModel`
 * `responseConstraint` and external schema validation.
 */
export const WORKSPACE_CONFIG_PATCH_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  properties: {
    presetMeta: {
      type: 'object',
      additionalProperties: false,
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        saveAsNewCustomPreset: { type: 'boolean' },
      },
    },
    schedulePrefs: {
      type: 'object',
      additionalProperties: false,
      properties: {
        logicalDayRolloverHour: { type: 'integer', minimum: 0, maximum: 23 },
        earlyShutdownTime: { type: 'string' },
        blockCadence: { type: 'string', enum: ['15m', '20m', '25m'] },
        closedListLockMode: {
          type: 'string',
          enum: ['strict_focus_1', 'dual_slot_ambition'],
        },
        eveningPulseSensitivity: { type: 'string', enum: ['standard', 'gentle'] },
        layoutMode: { type: 'string', enum: ['split', 'widget', 'full'] },
        fixedEveningAnchorToday: { type: 'boolean' },
      },
    },
    replaceAllBaselineSlots: { type: 'boolean' },
    baselineSlots: {
      type: 'array',
      maxItems: 8,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'label',
          'blocksTarget',
          'isMechanicalRecall',
          'supportsEarlyClearance',
          'startupStep5m',
          'cognitiveDemand',
        ],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          blocksTarget: { type: 'integer', minimum: 0, maximum: 8 },
          isMechanicalRecall: { type: 'boolean' },
          supportsEarlyClearance: { type: 'boolean' },
          startupStep5m: { type: 'string' },
          cognitiveDemand: {
            type: 'string',
            enum: ['DEEP_SYNTHESIS', 'MECHANICAL_RECALL', 'LIGHT_ADMIN'],
          },
        },
      },
    },
    taskWeightTemplates: {
      type: 'object',
      additionalProperties: false,
      properties: {
        heavyLabel: { type: 'string' },
        heavyBlocks: { type: 'integer', minimum: 1, maximum: 16 },
        mediumLabel: { type: 'string' },
        mediumBlocks: { type: 'integer', minimum: 1, maximum: 12 },
        quickLabel: { type: 'string' },
        quickBlocks: { type: 'integer', minimum: 1, maximum: 6 },
      },
    },
    breakMenuLabels: {
      type: 'object',
      additionalProperties: false,
      properties: {
        level1MicroReset: { type: 'string' },
        level2Espresso: { type: 'string' },
        level2Music: { type: 'string' },
        level2Physical: { type: 'string' },
        level3MidDayReset: { type: 'string' },
        stressBreathing: { type: 'string' },
        stressEspresso: { type: 'string' },
        stressPhysical: { type: 'string' },
      },
    },
    eveningCategories: {
      type: 'array',
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'mode', 'activeTitle', 'startupStep5m'],
        properties: {
          id: { type: 'string' },
          slotNumber: { type: 'integer', minimum: 1, maximum: 6 },
          name: { type: 'string' },
          icon: { type: 'string' },
          mode: { type: 'string', enum: ['sticky', 'fluid'] },
          tripleTrack: { type: 'boolean' },
          activeTitle: { type: 'string' },
          startupStep5m: { type: 'string' },
          hidden: { type: 'boolean' },
          subTracks: {
            type: 'array',
            maxItems: 3,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['label', 'activeTitle', 'startupStep5m'],
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                activeTitle: { type: 'string' },
                startupStep5m: { type: 'string' },
              },
            },
          },
        },
      },
    },
    houseTracks: {
      type: 'object',
      additionalProperties: false,
      properties: {
        shelter: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            subtitle: { type: 'string' },
          },
        },
        foundation: {
          type: 'object',
          additionalProperties: false,
          properties: {
            title: { type: 'string' },
            subtitle: { type: 'string' },
            statusSummary: { type: 'string' },
          },
        },
        tracks: {
          type: 'array',
          maxItems: 5,
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['trackId'],
            properties: {
              trackId: {
                type: 'string',
                enum: ['science', 'writing', 'coding', 'music', 'culture'],
              },
              title: { type: 'string' },
              isSandbox: { type: 'boolean' },
              inputWeeklyTarget: { type: 'integer', minimum: 0, maximum: 25 },
              outputWeeklyTarget: { type: 'integer', minimum: 0, maximum: 25 },
              rungs: {
                type: 'array',
                maxItems: 4,
                items: {
                  type: 'object',
                  additionalProperties: false,
                  required: ['rungNumber'],
                  properties: {
                    rungNumber: { type: 'integer', minimum: 1, maximum: 4 },
                    label: { type: 'string' },
                    description: { type: 'string' },
                    ledgerType: { type: 'string', enum: ['INPUT', 'OUTPUT'] },
                    targetBlocks: { type: 'integer', minimum: 1, maximum: 50 },
                  },
                },
              },
            },
          },
        },
      },
    },
    uiTerminologyOverrides: {
      type: 'object',
      additionalProperties: false,
      properties: {
        cruiseLabel: { type: 'string' },
        surgeLabel: { type: 'string' },
        taperLabel: { type: 'string' },
        baselineFloorLabel: { type: 'string' },
        closedListLabel: { type: 'string' },
        ambitionDripLabel: { type: 'string' },
        focusTabLabel: { type: 'string' },
        eveningTabLabel: { type: 'string' },
        roadmapTabLabel: { type: 'string' },
      },
    },
  },
};

export const ARCHITECT_TURN_RESPONSE_JSON_SCHEMA: Record<string, unknown> = {
  type: 'object',
  additionalProperties: false,
  required: ['reply', 'clarifyingOptions', 'configPatch'],
  properties: {
    reply: { type: 'string' },
    clarifyingOptions: {
      type: 'array',
      maxItems: 3,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['label', 'prompt'],
        properties: {
          id: { type: 'string' },
          label: { type: 'string' },
          prompt: { type: 'string' },
        },
      },
    },
    guardrailNotes: {
      type: 'array',
      items: { type: 'string' },
    },
    configPatch: WORKSPACE_CONFIG_PATCH_JSON_SCHEMA,
  },
};

/**
 * Gemini REST `responseSchema` (OpenAPI subset supported by `gemini-2.5-flash`).
 */
export const GEMINI_ARCHITECT_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  required: ['reply', 'clarifyingOptions', 'configPatch'],
  properties: {
    reply: {
      type: 'STRING',
      description:
        'Concise 1-2 sentence functional confirmation of proposed workspace changes, plus neutral explanation if any request hit a mechanical guardrail.',
    },
    guardrailNotes: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description:
        'Optional neutral notes explaining any mechanical invariants preserved.',
    },
    clarifyingOptions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        required: ['label', 'prompt'],
        properties: {
          id: { type: 'STRING' },
          label: {
            type: 'STRING',
            description: 'Short button label, e.g. "Option A: 15m Blocks (3m Startup)"',
          },
          prompt: {
            type: 'STRING',
            description: 'Follow-up user message sent when clicked.',
          },
        },
      },
    },
    configPatch: {
      type: 'OBJECT',
      properties: {
        presetMeta: {
          type: 'OBJECT',
          properties: {
            name: { type: 'STRING' },
            description: { type: 'STRING' },
            saveAsNewCustomPreset: { type: 'BOOLEAN' },
          },
        },
        schedulePrefs: {
          type: 'OBJECT',
          properties: {
            logicalDayRolloverHour: { type: 'INTEGER' },
            earlyShutdownTime: { type: 'STRING' },
            blockCadence: { type: 'STRING', enum: ['15m', '20m', '25m'] },
            closedListLockMode: {
              type: 'STRING',
              enum: ['strict_focus_1', 'dual_slot_ambition'],
            },
            eveningPulseSensitivity: {
              type: 'STRING',
              enum: ['standard', 'gentle'],
            },
            layoutMode: { type: 'STRING', enum: ['split', 'widget', 'full'] },
            fixedEveningAnchorToday: { type: 'BOOLEAN' },
          },
        },
        replaceAllBaselineSlots: { type: 'BOOLEAN' },
        baselineSlots: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            required: [
              'label',
              'blocksTarget',
              'isMechanicalRecall',
              'supportsEarlyClearance',
              'startupStep5m',
              'cognitiveDemand',
            ],
            properties: {
              id: { type: 'STRING' },
              label: { type: 'STRING' },
              blocksTarget: { type: 'INTEGER' },
              isMechanicalRecall: { type: 'BOOLEAN' },
              supportsEarlyClearance: { type: 'BOOLEAN' },
              startupStep5m: { type: 'STRING' },
              cognitiveDemand: {
                type: 'STRING',
                enum: ['DEEP_SYNTHESIS', 'MECHANICAL_RECALL', 'LIGHT_ADMIN'],
              },
            },
          },
        },
        taskWeightTemplates: {
          type: 'OBJECT',
          properties: {
            heavyLabel: { type: 'STRING' },
            heavyBlocks: { type: 'INTEGER' },
            mediumLabel: { type: 'STRING' },
            mediumBlocks: { type: 'INTEGER' },
            quickLabel: { type: 'STRING' },
            quickBlocks: { type: 'INTEGER' },
          },
        },
        breakMenuLabels: {
          type: 'OBJECT',
          properties: {
            level1MicroReset: { type: 'STRING' },
            level2Espresso: { type: 'STRING' },
            level2Music: { type: 'STRING' },
            level2Physical: { type: 'STRING' },
            level3MidDayReset: { type: 'STRING' },
            stressBreathing: { type: 'STRING' },
            stressEspresso: { type: 'STRING' },
            stressPhysical: { type: 'STRING' },
          },
        },
        eveningCategories: {
          type: 'ARRAY',
          items: {
            type: 'OBJECT',
            required: ['name', 'mode', 'activeTitle', 'startupStep5m'],
            properties: {
              id: { type: 'STRING' },
              slotNumber: { type: 'INTEGER' },
              name: { type: 'STRING' },
              icon: { type: 'STRING' },
              mode: { type: 'STRING', enum: ['sticky', 'fluid'] },
              tripleTrack: { type: 'BOOLEAN' },
              activeTitle: { type: 'STRING' },
              startupStep5m: { type: 'STRING' },
              hidden: { type: 'BOOLEAN' },
              subTracks: {
                type: 'ARRAY',
                items: {
                  type: 'OBJECT',
                  required: ['label', 'activeTitle', 'startupStep5m'],
                  properties: {
                    id: { type: 'STRING' },
                    label: { type: 'STRING' },
                    activeTitle: { type: 'STRING' },
                    startupStep5m: { type: 'STRING' },
                  },
                },
              },
            },
          },
        },
        houseTracks: {
          type: 'OBJECT',
          properties: {
            shelter: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                subtitle: { type: 'STRING' },
              },
            },
            foundation: {
              type: 'OBJECT',
              properties: {
                title: { type: 'STRING' },
                subtitle: { type: 'STRING' },
                statusSummary: { type: 'STRING' },
              },
            },
            tracks: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                required: ['trackId'],
                properties: {
                  trackId: {
                    type: 'STRING',
                    enum: ['science', 'writing', 'coding', 'music', 'culture'],
                  },
                  title: { type: 'STRING' },
                  isSandbox: { type: 'BOOLEAN' },
                  inputWeeklyTarget: { type: 'INTEGER' },
                  outputWeeklyTarget: { type: 'INTEGER' },
                  rungs: {
                    type: 'ARRAY',
                    items: {
                      type: 'OBJECT',
                      required: ['rungNumber'],
                      properties: {
                        rungNumber: { type: 'INTEGER' },
                        label: { type: 'STRING' },
                        description: { type: 'STRING' },
                        ledgerType: { type: 'STRING', enum: ['INPUT', 'OUTPUT'] },
                        targetBlocks: { type: 'INTEGER' },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        uiTerminologyOverrides: {
          type: 'OBJECT',
          properties: {
            cruiseLabel: { type: 'STRING' },
            surgeLabel: { type: 'STRING' },
            taperLabel: { type: 'STRING' },
            baselineFloorLabel: { type: 'STRING' },
            closedListLabel: { type: 'STRING' },
            ambitionDripLabel: { type: 'STRING' },
            focusTabLabel: { type: 'STRING' },
            eveningTabLabel: { type: 'STRING' },
            roadmapTabLabel: { type: 'STRING' },
          },
        },
      },
    },
  },
};

// ============================================================================
// 3. DETERMINISTIC POST-LLM GUARDRAIL VALIDATOR (`validateAndClampConfigPatch`)
// ============================================================================

const SOCIAL_OR_LIVE_EVENT_REGEX =
  /\b(family|date\s*night|dinner\s+with|drinks\s+with|hang\s*out|hanging\s+out|friends|party|social\s+outing|social\s+time|live\s+concert|live\s+event|live\s+show|spouse|partner\s+time|kids\s+time|parenting|community\s+meetup|group\s+outing)\b/i;

export function isSocialOrLiveEveningEntry(text: string): boolean {
  return SOCIAL_OR_LIVE_EVENT_REGEX.test(text);
}

export function getStartupStepDurationMinutes(
  state: Pick<SymmetryState, 'flexibilityTuning'>
): 3 | 5 {
  const preset = state.flexibilityTuning?.blockCadencePreset || '20_5_15';
  return preset.includes('15') ? 3 : 5;
}

function safeTrimString(val: unknown): string {
  return typeof val === 'string' ? val.trim() : '';
}

function normalizeIconName(rawIcon?: string, fallbackText = ''): string {
  const token = `${safeTrimString(rawIcon)} ${fallbackText}`.toLowerCase();
  if (/sketch|draw|paint|design|art|illustrat|palette|figma/.test(token)) {
    return 'palette';
  }
  if (/game|gaming|cozy|rpg|steam|switch|play|bg3|stardew/.test(token)) {
    return 'gamepad';
  }
  if (/anime|show|tv|series|sitcom|episode|comfort/.test(token)) {
    return 'tv';
  }
  if (/film|movie|cinema|video|watch/.test(token)) {
    return 'film';
  }
  if (/book|read|fiction|novel|manga|audiobook|audio|sci-fi|scifi/.test(token)) {
    return 'book';
  }
  if (/music|guitar|bass|piano|synth|ukulele|song|acoustic/.test(token)) {
    return 'music';
  }
  if (/3d|maker|printer|hardware|wood|craft|knit|lego|build|wrench/.test(token)) {
    return 'wrench';
  }
  if (/code|coding|side\s*project|dev|script/.test(token)) {
    return 'code';
  }
  if (/tea|coffee|cook|bake|culinary/.test(token)) {
    return 'coffee';
  }
  if (/lang|italian|japanese|spanish|french|culture|travel/.test(token)) {
    return 'globe';
  }
  return safeTrimString(rawIcon) || 'sparkles';
}

export interface ValidatedConfigPatchResult {
  validatedPatch: WorkspaceConfigPatch;
  guardrailNotes: string[];
}

/**
 * Deterministic Post-LLM Guardrail Validator (`validateAndClampConfigPatch`):
 * Enforces non-negotiable state-machine rules regardless of LLM output or user prompt:
 * 1. Startup Step cannot be disabled (`3m` on `15m` cadence, `5m` on `20m`/`25m`).
 * 2. Closed List active queue capped at 3 items (`strict_focus_1` or `dual_slot_ambition` only).
 * 3. Consecutive Surge days capped at max 2, with mandatory 60–120m Mid-Day Reset preserved.
 * 4. 60m mandatory evening physical break and 40m Option 0 Fork Check preserved.
 * 5. Social/family outings & live events stripped from Evening Recharge hobby cards and routed
 *    to Fixed Evening Anchors (`earlyShutdownTime`) + Top Shelter Banner (`houseTracks.shelter`).
 * 6. Daily Baseline Floor clamped to `0–8` total blocks, preserving mechanical recall late-night block protection.
 */
export function validateAndClampConfigPatch(
  rawPatch: WorkspaceConfigPatch | Record<string, unknown> | null | undefined,
  currentState: SymmetryState = DEFAULT_SYMMETRY_STATE,
  rawUserMessage: string = '',
  existingGuardrailNotes: string[] = []
): ValidatedConfigPatchResult {
  const notes: string[] = [
    ...existingGuardrailNotes
      .filter((n): n is string => typeof n === 'string')
      .map((n) => n.trim())
      .filter(Boolean),
  ];
  const addNote = (msg: string) => {
    const clean = msg.trim();
    if (clean && !notes.some((n) => n.toLowerCase() === clean.toLowerCase())) {
      notes.push(clean);
    }
  };

  const source = (
    rawPatch && typeof rawPatch === 'object' && !Array.isArray(rawPatch)
      ? rawPatch
      : {}
  ) as Record<string, unknown>;

  const rawSchedObj = (
    source.schedulePrefs &&
    typeof source.schedulePrefs === 'object' &&
    !Array.isArray(source.schedulePrefs)
      ? source.schedulePrefs
      : {}
  ) as Record<string, unknown>;

  const patch: WorkspaceConfigPatch = {};
  const lowerPrompt = safeTrimString(rawUserMessage).toLowerCase();

  // --- Merge top-level or nested `schedulePrefs` candidates cleanly ---
  const nextPrefs: SchedulePrefsPatch = {};
  const candidateRollover =
    rawSchedObj.logicalDayRolloverHour ?? source.logicalDayRolloverHour;
  if (typeof candidateRollover === 'number' && Number.isFinite(candidateRollover)) {
    nextPrefs.logicalDayRolloverHour = Math.max(
      0,
      Math.min(23, Math.round(candidateRollover))
    );
  }

  const candidateShutdown = safeTrimString(
    rawSchedObj.earlyShutdownTime ?? source.earlyShutdownTime
  );
  if (candidateShutdown) {
    nextPrefs.earlyShutdownTime = candidateShutdown.slice(0, 24);
  }

  const candidateCadence = rawSchedObj.blockCadence ?? source.blockCadence;
  if (
    candidateCadence === '15m' ||
    candidateCadence === '20m' ||
    candidateCadence === '25m'
  ) {
    nextPrefs.blockCadence = candidateCadence;
  }

  const candidateLock = rawSchedObj.closedListLockMode ?? source.closedListLockMode;
  if (
    candidateLock === 'strict_focus_1' ||
    candidateLock === 'dual_slot_ambition'
  ) {
    nextPrefs.closedListLockMode = candidateLock;
  }

  const candidatePulse =
    rawSchedObj.eveningPulseSensitivity ?? source.eveningPulseSensitivity;
  if (candidatePulse === 'standard' || candidatePulse === 'gentle') {
    nextPrefs.eveningPulseSensitivity = candidatePulse;
  }

  const candidateLayout = rawSchedObj.layoutMode ?? source.layoutMode;
  if (
    candidateLayout === 'split' ||
    candidateLayout === 'widget' ||
    candidateLayout === 'full'
  ) {
    nextPrefs.layoutMode = candidateLayout;
  }

  const candidateFixedAnchor =
    rawSchedObj.fixedEveningAnchorToday ?? source.fixedEveningAnchorToday;
  if (typeof candidateFixedAnchor === 'boolean') {
    nextPrefs.fixedEveningAnchorToday = candidateFixedAnchor;
  }

  // --- Guardrail 1: Never disable Startup Step (3m or 5m minimum) ---
  const rawStartupMinutes =
    rawSchedObj.startupStepMinutes ?? source.startupStepMinutes;
  const hasInvalidStartupMinutes =
    rawStartupMinutes !== undefined &&
    rawStartupMinutes !== null &&
    (typeof rawStartupMinutes !== 'number' ||
      !Number.isFinite(rawStartupMinutes) ||
      rawStartupMinutes < 3);

  const triedToDisableStartup =
    Boolean(source.disableStartupStep) ||
    Boolean(rawSchedObj.disableStartupStep) ||
    hasInvalidStartupMinutes ||
    /\b(no\s+startup|remove\s+(the\s+)?(5m\s+|3m\s+)?startup|disable\s+(the\s+)?(5m\s+|3m\s+)?startup|skip\s+(the\s+)?startup|0\s*m(in)?\s+startup|zero\s+startup)\b/i.test(
      lowerPrompt
    );

  if (triedToDisableStartup) {
    nextPrefs.blockCadence = nextPrefs.blockCadence || '15m';
    addNote(
      'Startup Step Guardrail: The 2-stage Startup -> Momentum timer cannot be disabled or set below 3m. Clamped to 3m Startup + 12m Momentum (15m cadence) to keep entry friction low.'
    );
  }

  // --- Guardrail 2: Closed List max 3 items & strict serialization ---
  const rawClosedMaxCandidate =
    rawSchedObj.closedListMax ??
    source.closedListMax ??
    rawSchedObj.maxClosedListItems ??
    source.maxClosedListItems;
  const hasInvalidClosedMax =
    rawClosedMaxCandidate !== undefined &&
    rawClosedMaxCandidate !== null &&
    (typeof rawClosedMaxCandidate !== 'number' ||
      !Number.isFinite(rawClosedMaxCandidate) ||
      rawClosedMaxCandidate > 3 ||
      rawClosedMaxCandidate < 1);
  const hasInvalidLockMode =
    candidateLock !== undefined &&
    candidateLock !== null &&
    candidateLock !== 'strict_focus_1' &&
    candidateLock !== 'dual_slot_ambition';

  const askedMoreThan3Active =
    hasInvalidClosedMax ||
    hasInvalidLockMode ||
    /\b([4-9]|\d{2,})\s+(active\s+)?(closed\s*list|active\s+projects|active\s+queue|concurrent\s+projects)\b/i.test(
      lowerPrompt
    ) ||
    /\b(unlimited|no\s+limit|remove\s+cap)\b.*\b(closed\s*list|active\s+queue|active\s+projects)\b/i.test(
      lowerPrompt
    );

  if (askedMoreThan3Active) {
    if (!nextPrefs.closedListLockMode) {
      nextPrefs.closedListLockMode = 'strict_focus_1';
    }
    addNote(
      'Closed List Guardrail: Active Project Queue remains locked at 3 items max with Focus #1 serialization (overflow stays in the Open List Backlog).'
    );
  }

  // --- Guardrail 3: Max 2 consecutive Surge days & 3-Tier Ceilings ---
  const rawSurgeCandidate =
    rawSchedObj.maxConsecutiveSurgeDays ?? source.maxConsecutiveSurgeDays;
  const rawCruiseBlocks = rawSchedObj.cruiseBlocks ?? source.cruiseBlocks;
  const rawSurgeBlocks = rawSchedObj.surgeBlocks ?? source.surgeBlocks;
  const rawTaperBlocks = rawSchedObj.taperBlocks ?? source.taperBlocks;

  const hasInvalidSurgeCap =
    rawSurgeCandidate !== undefined &&
    rawSurgeCandidate !== null &&
    (typeof rawSurgeCandidate !== 'number' ||
      !Number.isFinite(rawSurgeCandidate) ||
      rawSurgeCandidate > 2 ||
      rawSurgeCandidate < 0);
  const hasInvalidTierCeiling =
    (typeof rawCruiseBlocks === 'number' && rawCruiseBlocks > 13) ||
    (typeof rawSurgeBlocks === 'number' && rawSurgeBlocks > 15) ||
    (typeof rawTaperBlocks === 'number' && rawTaperBlocks > 9) ||
    Boolean(source.disableMidDayReset) ||
    Boolean(rawSchedObj.disableMidDayReset);

  const askedExcessSurge =
    hasInvalidSurgeCap ||
    hasInvalidTierCeiling ||
    /\b([3-9]|\d{2,})\s+(consecutive\s+)?surge\s+days\b/i.test(lowerPrompt) ||
    /\b(unlimited\s+surge|every\s+day\s+surge|surge\s+all\s+week|disable\s+mid[-\s]?day\s+reset)\b/i.test(
      lowerPrompt
    );

  if (askedExcessSurge) {
    addNote(
      'Surge Circuit Breaker Guardrail: Surge Mode remains hard-capped at 2 consecutive days (14–15 blocks max) with a mandatory 60–120m Mid-Day Reset after 7 blocks.'
    );
  }

  // --- Guardrail 4: 60m Mandatory Evening Break & 40m Option 0 Fork Check ---
  const rawEveningBreakMins =
    rawSchedObj.eveningBreakMinutes ?? source.eveningBreakMinutes;
  const rawOption0MaxMins =
    rawSchedObj.option0MaxMinutes ??
    source.option0MaxMinutes ??
    rawSchedObj.option0ForkCheckMinutes ??
    source.option0ForkCheckMinutes;
  const hasInvalidEveningBreak =
    rawEveningBreakMins !== undefined &&
    rawEveningBreakMins !== null &&
    (typeof rawEveningBreakMins !== 'number' ||
      !Number.isFinite(rawEveningBreakMins) ||
      rawEveningBreakMins > 60 ||
      rawEveningBreakMins <= 0);
  const hasInvalidOption0Cap =
    rawOption0MaxMins !== undefined &&
    rawOption0MaxMins !== null &&
    (typeof rawOption0MaxMins !== 'number' ||
      !Number.isFinite(rawOption0MaxMins) ||
      rawOption0MaxMins > 40 ||
      rawOption0MaxMins <= 0);

  const askedDisableEveningCaps =
    Boolean(source.disableEvening60mBreak) ||
    Boolean(rawSchedObj.disableEvening60mBreak) ||
    Boolean(source.disableOption0ForkCheck) ||
    Boolean(rawSchedObj.disableOption0ForkCheck) ||
    hasInvalidEveningBreak ||
    hasInvalidOption0Cap ||
    /\b(disable|remove|turn\s+off|no)\b.*\b(60\s*m(in)?\s*(evening\s+)?break|40\s*m(in)?\s*fork|fork\s+check|option\s*0\s+cap)\b/i.test(
      lowerPrompt
    );

  if (askedDisableEveningCaps) {
    nextPrefs.eveningPulseSensitivity = 'gentle';
    addNote(
      'Evening Pacing Guardrail: The 60m mandatory physical micro-break and 40m Option 0 Fork Check remain enforced; switched Evening Pulse Sensitivity to Gentle (40m check-in + 60m break) to reduce interruptions.'
    );
  }

  if (Object.keys(nextPrefs).length > 0) {
    patch.schedulePrefs = nextPrefs;
  }

  // --- Validate & Clamp `presetMeta` ---
  if (
    source.presetMeta &&
    typeof source.presetMeta === 'object' &&
    !Array.isArray(source.presetMeta)
  ) {
    const pm = source.presetMeta as Record<string, unknown>;
    const name = safeTrimString(pm.name).slice(0, 64) || undefined;
    const description = safeTrimString(pm.description).slice(0, 160) || undefined;
    const saveAsNewCustomPreset = Boolean(pm.saveAsNewCustomPreset);
    if (name || description || saveAsNewCustomPreset) {
      patch.presetMeta = {
        name,
        description,
        saveAsNewCustomPreset,
      };
    }
  }

  if (typeof source.replaceAllBaselineSlots === 'boolean') {
    patch.replaceAllBaselineSlots = source.replaceAllBaselineSlots;
  }

  // --- Validate & Clamp `baselineSlots` (0–8 total blocks, non-empty startupStep5m) ---
  if (Array.isArray(source.baselineSlots)) {
    const cleanedSlots: BaselineSlotPatch[] = source.baselineSlots
      .filter(
        (slot): slot is Record<string, unknown> =>
          Boolean(slot && typeof slot === 'object' && !Array.isArray(slot))
      )
      .slice(0, 8)
      .map((slot, idx) => {
        const label = safeTrimString(slot.label) || `Baseline Slot ${idx + 1}`;
        const rawTarget =
          typeof slot.blocksTarget === 'number' && Number.isFinite(slot.blocksTarget)
            ? Math.max(0, Math.min(8, Math.round(slot.blocksTarget)))
            : 1;
        const isRecall = Boolean(slot.isMechanicalRecall);
        const cog: CognitiveDemandTag =
          slot.cognitiveDemand === 'DEEP_SYNTHESIS' ||
          slot.cognitiveDemand === 'MECHANICAL_RECALL' ||
          slot.cognitiveDemand === 'LIGHT_ADMIN'
            ? slot.cognitiveDemand
            : isRecall
            ? 'MECHANICAL_RECALL'
            : 'LIGHT_ADMIN';
        const rawStartup = safeTrimString(slot.startupStep5m);
        const startup =
          rawStartup.length >= 4
            ? rawStartup
            : `Open ${label} workspace and complete first 5m starter action.`;
        return {
          id: safeTrimString(slot.id) || undefined,
          label,
          blocksTarget: rawTarget,
          isMechanicalRecall: isRecall,
          supportsEarlyClearance:
            typeof slot.supportsEarlyClearance === 'boolean'
              ? slot.supportsEarlyClearance
              : isRecall,
          startupStep5m: startup,
          cognitiveDemand: cog,
        };
      })
      .filter((s) => s.blocksTarget > 0);

    let sumBlocks = cleanedSlots.reduce((acc, s) => acc + s.blocksTarget, 0);
    if (sumBlocks > 8) {
      addNote(
        `Baseline Floor Guardrail: Clamped Daily Core Baseline from ${sumBlocks} blocks down to the 8-block maximum so discretionary project capacity stays protected.`
      );
      while (sumBlocks > 8 && cleanedSlots.length > 0) {
        let maxIdx = 0;
        for (let i = 1; i < cleanedSlots.length; i++) {
          if (cleanedSlots[i].blocksTarget >= cleanedSlots[maxIdx].blocksTarget) {
            maxIdx = i;
          }
        }
        if (cleanedSlots[maxIdx].blocksTarget > 1) {
          cleanedSlots[maxIdx].blocksTarget -= 1;
        } else {
          cleanedSlots.splice(maxIdx, 1);
        }
        sumBlocks = cleanedSlots.reduce((acc, s) => acc + s.blocksTarget, 0);
      }
    }
    patch.baselineSlots = cleanedSlots;
  }

  // --- Validate & Clamp `taskWeightTemplates` ---
  if (
    source.taskWeightTemplates &&
    typeof source.taskWeightTemplates === 'object' &&
    !Array.isArray(source.taskWeightTemplates)
  ) {
    const tw = source.taskWeightTemplates as Record<string, unknown>;
    const cleanedTw: TaskWeightTemplatesPatch = {
      heavyLabel: safeTrimString(tw.heavyLabel) || undefined,
      heavyBlocks:
        typeof tw.heavyBlocks === 'number' && Number.isFinite(tw.heavyBlocks)
          ? Math.max(2, Math.min(16, Math.round(tw.heavyBlocks)))
          : undefined,
      mediumLabel: safeTrimString(tw.mediumLabel) || undefined,
      mediumBlocks:
        typeof tw.mediumBlocks === 'number' && Number.isFinite(tw.mediumBlocks)
          ? Math.max(1, Math.min(12, Math.round(tw.mediumBlocks)))
          : undefined,
      quickLabel: safeTrimString(tw.quickLabel) || undefined,
      quickBlocks:
        typeof tw.quickBlocks === 'number' && Number.isFinite(tw.quickBlocks)
          ? Math.max(1, Math.min(6, Math.round(tw.quickBlocks)))
          : undefined,
    };
    if (Object.values(cleanedTw).some((v) => v !== undefined)) {
      patch.taskWeightTemplates = cleanedTw;
    }
  }

  // --- Validate & Clamp `breakMenuLabels` ---
  if (
    source.breakMenuLabels &&
    typeof source.breakMenuLabels === 'object' &&
    !Array.isArray(source.breakMenuLabels)
  ) {
    const bm = source.breakMenuLabels as Record<string, unknown>;
    const cleanedBm: BreakMenuLabelsPatch = {
      level1MicroReset: safeTrimString(bm.level1MicroReset) || undefined,
      level2Espresso: safeTrimString(bm.level2Espresso) || undefined,
      level2Music: safeTrimString(bm.level2Music) || undefined,
      level2Physical: safeTrimString(bm.level2Physical) || undefined,
      level3MidDayReset: safeTrimString(bm.level3MidDayReset) || undefined,
      stressBreathing: safeTrimString(bm.stressBreathing) || undefined,
      stressEspresso: safeTrimString(bm.stressEspresso) || undefined,
      stressPhysical: safeTrimString(bm.stressPhysical) || undefined,
    };
    if (Object.values(cleanedBm).some((v) => v !== undefined)) {
      patch.breakMenuLabels = cleanedBm;
    }
  }

  // --- Validate & Clamp `houseTracks` ---
  if (
    source.houseTracks &&
    typeof source.houseTracks === 'object' &&
    !Array.isArray(source.houseTracks)
  ) {
    const ht = source.houseTracks as Record<string, unknown>;
    const nextHt: HouseTracksPatch = {};

    const sanitizeBanner = (raw: unknown): HouseBannerPatch | undefined => {
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
      const b = raw as Record<string, unknown>;
      const title = safeTrimString(b.title) || undefined;
      const subtitle = safeTrimString(b.subtitle) || undefined;
      const statusSummary = safeTrimString(b.statusSummary) || undefined;
      const horizonNotes = Array.isArray(b.horizonNotes)
        ? b.horizonNotes
            .filter(
              (n): n is Record<string, unknown> =>
                Boolean(n && typeof n === 'object' && !Array.isArray(n))
            )
            .filter(
              (n) =>
                (n.horizon === 1 ||
                  n.horizon === 2 ||
                  n.horizon === 3 ||
                  n.horizon === 4) &&
                safeTrimString(n.note).length > 0
            )
            .map((n) => ({
              horizon: n.horizon as 1 | 2 | 3 | 4,
              label: safeTrimString(n.label) || undefined,
              note: safeTrimString(n.note),
            }))
        : undefined;
      if (!title && !subtitle && !statusSummary && !horizonNotes?.length) {
        return undefined;
      }
      return { title, subtitle, statusSummary, horizonNotes };
    };

    const shelter = sanitizeBanner(ht.shelter);
    if (shelter) nextHt.shelter = shelter;

    const foundation = sanitizeBanner(ht.foundation);
    if (foundation) nextHt.foundation = foundation;

    if (Array.isArray(ht.tracks)) {
      const validTrackIds = new Set([
        'science',
        'writing',
        'coding',
        'music',
        'culture',
      ]);
      const cleanedTracks: HouseTrackPatch[] = ht.tracks
        .filter(
          (t): t is Record<string, unknown> =>
            Boolean(
              t &&
                typeof t === 'object' &&
                !Array.isArray(t) &&
                typeof t.trackId === 'string' &&
                validTrackIds.has(t.trackId)
            )
        )
        .slice(0, 5)
        .map((t) => {
          const rungs = Array.isArray(t.rungs)
            ? t.rungs
                .filter(
                  (r): r is Record<string, unknown> =>
                    Boolean(
                      r &&
                        typeof r === 'object' &&
                        !Array.isArray(r) &&
                        (r.rungNumber === 1 ||
                          r.rungNumber === 2 ||
                          r.rungNumber === 3 ||
                          r.rungNumber === 4)
                    )
                )
                .map((r) => ({
                  rungNumber: r.rungNumber as 1 | 2 | 3 | 4,
                  label: safeTrimString(r.label) || undefined,
                  description: safeTrimString(r.description) || undefined,
                  ledgerType:
                    r.ledgerType === 'INPUT' || r.ledgerType === 'OUTPUT'
                      ? (r.ledgerType as 'INPUT' | 'OUTPUT')
                      : undefined,
                  targetBlocks:
                    typeof r.targetBlocks === 'number' &&
                    Number.isFinite(r.targetBlocks)
                      ? Math.max(1, Math.min(50, Math.round(r.targetBlocks)))
                      : undefined,
                }))
            : undefined;

          return {
            trackId: t.trackId as HouseTrackPatch['trackId'],
            title: safeTrimString(t.title) || undefined,
            isSandbox:
              typeof t.isSandbox === 'boolean' ? t.isSandbox : undefined,
            inputWeeklyTarget:
              typeof t.inputWeeklyTarget === 'number' &&
              Number.isFinite(t.inputWeeklyTarget)
                ? Math.max(0, Math.min(40, Math.round(t.inputWeeklyTarget)))
                : undefined,
            outputWeeklyTarget:
              typeof t.outputWeeklyTarget === 'number' &&
              Number.isFinite(t.outputWeeklyTarget)
                ? Math.max(0, Math.min(40, Math.round(t.outputWeeklyTarget)))
                : undefined,
            rungs,
          };
        });
      if (cleanedTracks.length > 0) {
        nextHt.tracks = cleanedTracks;
      }
    }

    if (Object.keys(nextHt).length > 0) {
      patch.houseTracks = nextHt;
    }
  }

  // --- Validate & Clamp `uiTerminologyOverrides` ---
  if (
    source.uiTerminologyOverrides &&
    typeof source.uiTerminologyOverrides === 'object' &&
    !Array.isArray(source.uiTerminologyOverrides)
  ) {
    const ut = source.uiTerminologyOverrides as Record<string, unknown>;
    const allowedTermKeys: (keyof UiTerminologyOverrides)[] = [
      'cruiseLabel',
      'surgeLabel',
      'taperLabel',
      'baselineFloorLabel',
      'closedListLabel',
      'ambitionDripLabel',
      'focusTabLabel',
      'eveningTabLabel',
      'roadmapTabLabel',
    ];
    const nextUt: UiTerminologyOverrides = {};
    for (const k of allowedTermKeys) {
      const val = safeTrimString(ut[k]).slice(0, 48);
      if (val) {
        nextUt[k] = val;
      }
    }
    if (Object.keys(nextUt).length > 0) {
      patch.uiTerminologyOverrides = nextUt;
    }
  }

  // --- Guardrail 5 & Validation: `eveningCategories` (No social/family/live events!) ---
  const strippedSocialLabels: string[] = [];

  if (Array.isArray(source.eveningCategories)) {
    const safeEvening: EveningCategoryPatch[] = [];
    for (const rawItem of source.eveningCategories.slice(0, 8)) {
      if (!rawItem || typeof rawItem !== 'object' || Array.isArray(rawItem)) {
        continue;
      }
      const rawCat = rawItem as Record<string, unknown>;
      const rawName = safeTrimString(rawCat.name);
      const rawActive = safeTrimString(rawCat.activeTitle);
      const combinedText = `${rawName} ${rawActive}`;
      if (isSocialOrLiveEveningEntry(combinedText)) {
        strippedSocialLabels.push(rawName || rawActive || 'Social Outing');
        continue;
      }
      if (safeEvening.length >= 6) {
        continue;
      }

      const cleanName = rawName || 'Evening Slot';
      const cleanActive = rawActive || cleanName;
      const rawStartup = safeTrimString(rawCat.startupStep5m);
      const cleanStartup =
        rawStartup.length >= 4 && !isSocialOrLiveEveningEntry(rawStartup)
          ? rawStartup
          : `5m low-friction start: open ${cleanActive} away from work monitor.`;

      const cleanSubs = Array.isArray(rawCat.subTracks)
        ? rawCat.subTracks
            .filter(
              (st): st is Record<string, unknown> =>
                Boolean(st && typeof st === 'object' && !Array.isArray(st))
            )
            .filter((st) => {
              const subText = `${safeTrimString(st.label)} ${safeTrimString(
                st.activeTitle
              )}`;
              if (isSocialOrLiveEveningEntry(subText)) {
                strippedSocialLabels.push(
                  safeTrimString(st.activeTitle) ||
                    safeTrimString(st.label) ||
                    'Social Outing'
                );
                return false;
              }
              return true;
            })
            .slice(0, 3)
            .map((st, sIdx) => {
              const subStartup = safeTrimString(st.startupStep5m);
              return {
                id: safeTrimString(st.id) || `3${String.fromCharCode(65 + sIdx)}_SUB`,
                label:
                  safeTrimString(st.label) ||
                  `Track ${String.fromCharCode(65 + sIdx)}`,
                activeTitle: safeTrimString(st.activeTitle) || cleanActive,
                startupStep5m:
                  subStartup.length >= 4 && !isSocialOrLiveEveningEntry(subStartup)
                    ? subStartup
                    : cleanStartup,
              };
            })
        : undefined;

      safeEvening.push({
        id: safeTrimString(rawCat.id) || undefined,
        slotNumber:
          typeof rawCat.slotNumber === 'number' &&
          Number.isFinite(rawCat.slotNumber)
            ? Math.max(1, Math.min(6, Math.round(rawCat.slotNumber)))
            : undefined,
        name: cleanName,
        icon: normalizeIconName(
          typeof rawCat.icon === 'string' ? rawCat.icon : undefined,
          `${cleanName} ${cleanActive}`
        ),
        mode: rawCat.mode === 'sticky' ? 'sticky' : 'fluid',
        tripleTrack: Boolean(
          rawCat.tripleTrack || (cleanSubs && cleanSubs.length > 1)
        ),
        activeTitle: cleanActive,
        startupStep5m: cleanStartup,
        hidden: Boolean(rawCat.hidden),
        subTracks: cleanSubs,
      });
    }
    if (safeEvening.length > 0) {
      patch.eveningCategories = safeEvening;
    }
  }

  // Also check if user prompt asked to add social/family/outing to evening menu directly
  const promptAskedSocialEvening =
    /\b(evening|recharge|hobby|slot|menu|card)\b/i.test(lowerPrompt) &&
    isSocialOrLiveEveningEntry(lowerPrompt);

  if (strippedSocialLabels.length > 0 || promptAskedSocialEvening) {
    const labelDesc =
      strippedSocialLabels.length > 0
        ? strippedSocialLabels.join(', ')
        : 'Social / Family Time';
    patch.schedulePrefs = {
      ...(patch.schedulePrefs || {}),
      earlyShutdownTime:
        patch.schedulePrefs?.earlyShutdownTime ||
        currentState.earlyEveningShutdownTime ||
        '6:00 PM',
      fixedEveningAnchorToday: true,
    };
    patch.houseTracks = {
      ...(patch.houseTracks || {}),
      shelter: {
        title:
          patch.houseTracks?.shelter?.title ||
          currentState.roadmapShelter?.title ||
          'Relationships, Community & Live Outings (Non-Quota Shelter)',
        subtitle:
          patch.houseTracks?.shelter?.subtitle ||
          `Protected outside solo block checklists — includes ${labelDesc} and fixed evening anchors.`,
      },
    };
    addNote(
      `Evening Menu Guardrail: "${labelDesc}" was not added as a timed/gamified Evening Recharge hobby card. Social, family, and live outings are routed to your Fixed Evening Anchor (${patch.schedulePrefs.earlyShutdownTime} Shutdown) and Top Shelter Banner instead.`
    );
  }

  return {
    validatedPatch: patch,
    guardrailNotes: notes,
  };
}

// ============================================================================
// 4. DIFF ENGINE & SELECTIVE PATCH MERGER
// ============================================================================

function mapStateCadenceToShort(
  preset?: StructureFlexibilityConfig['blockCadencePreset']
): BlockCadenceOption {
  if (!preset) return '20m';
  if (preset.includes('15')) return '15m';
  if (preset.includes('25')) return '25m';
  return '20m';
}

function mapShortCadenceToState(
  cadence: BlockCadenceOption
): StructureFlexibilityConfig['blockCadencePreset'] {
  if (cadence === '15m') return 'CADENCE_15_3_12';
  if (cadence === '25m') return 'CADENCE_25_5_20';
  return 'CADENCE_20_5_15';
}

function formatCadenceLabel(cadence: BlockCadenceOption): string {
  if (cadence === '15m') return '15m Blocks (3m Startup + 12m Momentum)';
  if (cadence === '25m') return '25m Blocks (5m Startup + 20m Momentum)';
  return '20m Blocks (5m Startup + 15m Momentum)';
}

/**
 * Generates granular, human-readable `ConfigDiffItem[]` entries for the Diff Preview Card,
 * allowing users to accept or skip any individual change before applying.
 */
export function computeConfigDiffItems(
  currentState: SymmetryState,
  patch: WorkspaceConfigPatch
): ConfigDiffItem[] {
  const items: ConfigDiffItem[] = [];

  // 1. Preset Meta
  if (patch.presetMeta?.name && patch.presetMeta.name !== currentState.profileName) {
    items.push({
      id: 'presetMeta.name',
      section: 'presetMeta',
      sectionLabel: 'Workspace Profile',
      changeKind: 'RENAMED',
      label: 'Profile Title',
      beforeSummary: currentState.profileName || 'Balanced Core',
      afterSummary: patch.presetMeta.name,
    });
  }

  // 2. Schedule & Layout Prefs
  const sp = patch.schedulePrefs;
  if (sp) {
    const currentFlex = currentState.flexibilityTuning || DEFAULT_FLEXIBILITY_TUNING;
    const currentCadence = mapStateCadenceToShort(currentFlex.blockCadencePreset);
    if (sp.blockCadence && sp.blockCadence !== currentCadence) {
      items.push({
        id: 'schedulePrefs.blockCadence',
        section: 'schedulePrefs',
        sectionLabel: 'Schedule & Cadence',
        changeKind: 'MODIFIED',
        label: 'Work Block Cadence',
        beforeSummary: formatCadenceLabel(currentCadence),
        afterSummary: formatCadenceLabel(sp.blockCadence),
      });
    }

    const currentLock: ClosedListLockOption =
      currentFlex.closedListLockMode === 'DUAL_SLOT'
        ? 'dual_slot_ambition'
        : 'strict_focus_1';
    if (sp.closedListLockMode && sp.closedListLockMode !== currentLock) {
      items.push({
        id: 'schedulePrefs.closedListLockMode',
        section: 'schedulePrefs',
        sectionLabel: 'Schedule & Cadence',
        changeKind: 'MODIFIED',
        label: 'Closed List Lock Mode',
        beforeSummary:
          currentLock === 'strict_focus_1'
            ? 'Strict Focus #1 Lock'
            : 'Dual-Slot (#1 Primary + #2 Ambition)',
        afterSummary:
          sp.closedListLockMode === 'strict_focus_1'
            ? 'Strict Focus #1 Lock'
            : 'Dual-Slot (#1 Primary + #2 Ambition)',
      });
    }

    const currentPulse: EveningPulseOption =
      currentFlex.eveningPulseSensitivity === 'GENTLE_40_60'
        ? 'gentle'
        : 'standard';
    if (sp.eveningPulseSensitivity && sp.eveningPulseSensitivity !== currentPulse) {
      items.push({
        id: 'schedulePrefs.eveningPulseSensitivity',
        section: 'schedulePrefs',
        sectionLabel: 'Schedule & Cadence',
        changeKind: 'MODIFIED',
        label: 'Evening Check-In Pacing',
        beforeSummary:
          currentPulse === 'standard'
            ? 'Standard (20m & 40m Check-In + 60m Break)'
            : 'Gentle (40m Check-In + 60m Break)',
        afterSummary:
          sp.eveningPulseSensitivity === 'standard'
            ? 'Standard (20m & 40m Check-In + 60m Break)'
            : 'Gentle (40m Check-In + 60m Break)',
      });
    }

    const currentLayout: WorkspaceLayoutOption = currentState.uiLayoutMode || 'full';
    if (sp.layoutMode && sp.layoutMode !== currentLayout) {
      const fmtLayout = (l: WorkspaceLayoutOption) =>
        l === 'widget'
          ? 'Compact Minimal Widget (460px Clutter-Free)'
          : l === 'split'
          ? 'Balanced Split Columns (1440px)'
          : 'Full Widescreen Bento';
      items.push({
        id: 'schedulePrefs.layoutMode',
        section: 'schedulePrefs',
        sectionLabel: 'UI Density & Layout',
        changeKind: 'MODIFIED',
        label: 'Workspace Layout Density',
        beforeSummary: fmtLayout(currentLayout),
        afterSummary: fmtLayout(sp.layoutMode),
      });
    }

    const curRollover = currentState.logicalDayRolloverHour ?? 4;
    if (
      typeof sp.logicalDayRolloverHour === 'number' &&
      sp.logicalDayRolloverHour !== curRollover
    ) {
      items.push({
        id: 'schedulePrefs.logicalDayRolloverHour',
        section: 'schedulePrefs',
        sectionLabel: 'Schedule & Cadence',
        changeKind: 'MODIFIED',
        label: 'Logical Day Rollover Boundary',
        beforeSummary: formatRolloverHourLabel(curRollover),
        afterSummary: formatRolloverHourLabel(sp.logicalDayRolloverHour),
      });
    }

    const curShutdown = currentState.earlyEveningShutdownTime || '6:00 PM';
    if (sp.earlyShutdownTime && sp.earlyShutdownTime !== curShutdown) {
      items.push({
        id: 'schedulePrefs.earlyShutdownTime',
        section: 'schedulePrefs',
        sectionLabel: 'Schedule & Cadence',
        changeKind: 'MODIFIED',
        label: 'Evening Anchor Shutdown Time',
        beforeSummary: curShutdown,
        afterSummary: sp.earlyShutdownTime,
      });
    }

    if (sp.fixedEveningAnchorToday && currentState.fixedEvent !== 'EVENING_OUTING_6PM') {
      const anchorTime = sp.earlyShutdownTime || curShutdown;
      items.push({
        id: 'schedulePrefs.fixedEveningAnchorToday',
        section: 'schedulePrefs',
        sectionLabel: 'Fixed Evening Anchor',
        changeKind: 'ADDED',
        label: 'Fixed Evening Outing / Family Anchor',
        beforeSummary: currentState.fixedEvent === 'NONE' ? 'None' : currentState.fixedEvent,
        afterSummary: `${anchorTime} Evening Outing Anchor`,
      });
    }
  }

  // 3. Baseline Slots
  if (Array.isArray(patch.baselineSlots)) {
    if (patch.baselineSlots.length === 0 && patch.replaceAllBaselineSlots) {
      const prevTotal = currentState.baselineBlocks.reduce(
        (s, b) => s + getBaselineSlotTargetBlocks(b),
        0
      );
      items.push({
        id: 'baselineSlots.clearAll',
        section: 'baselineSlots',
        sectionLabel: 'Daily Core Baseline',
        changeKind: 'MODIFIED',
        label: 'Zero-Overhead Daily Floor',
        beforeSummary: `${prevTotal} blocks across ${currentState.baselineBlocks.length} slots`,
        afterSummary: '0 baseline blocks (100% discretionary project focus)',
      });
    } else {
      patch.baselineSlots.forEach((slot, idx) => {
        const existing =
          (slot.id && currentState.baselineBlocks.find((b) => b.id === slot.id)) ||
          currentState.baselineBlocks[idx];
        items.push({
          id: `baselineSlots.${idx}`,
          section: 'baselineSlots',
          sectionLabel: 'Daily Core Baseline',
          changeKind: existing ? 'MODIFIED' : 'ADDED',
          label: `Baseline Slot #${idx + 1}: ${slot.label}`,
          beforeSummary: existing
            ? `${existing.title} (${getBaselineSlotTargetBlocks(existing)}b)`
            : 'New Baseline Slot',
          afterSummary: `${slot.label} (${slot.blocksTarget}b • ${
            slot.isMechanicalRecall ? 'Recall / Early Clearance' : slot.cognitiveDemand.replace('_', ' ')
          } • 5m: "${slot.startupStep5m}")`,
        });
      });
    }
  }

  // 4. Task Weight Templates
  if (patch.taskWeightTemplates) {
    const tw = patch.taskWeightTemplates;
    const curTw = currentState.taskWeights || DEFAULT_SYMMETRY_STATE.taskWeights!;
    if (tw.heavyLabel || tw.heavyBlocks) {
      items.push({
        id: 'taskWeightTemplates.heavy',
        section: 'taskWeightTemplates',
        sectionLabel: 'Deliverable Presets',
        changeKind: 'MODIFIED',
        label: 'Heavy Deliverable Template',
        beforeSummary: `${curTw.heavyLabel} (${curTw.heavyBlocks}b)`,
        afterSummary: `${tw.heavyLabel || curTw.heavyLabel} (${
          tw.heavyBlocks ?? curTw.heavyBlocks
        }b)`,
      });
    }
    if (tw.mediumLabel || tw.mediumBlocks) {
      items.push({
        id: 'taskWeightTemplates.medium',
        section: 'taskWeightTemplates',
        sectionLabel: 'Deliverable Presets',
        changeKind: 'MODIFIED',
        label: 'Medium Deliverable Template',
        beforeSummary: `${curTw.mediumLabel} (${curTw.mediumBlocks}b)`,
        afterSummary: `${tw.mediumLabel || curTw.mediumLabel} (${
          tw.mediumBlocks ?? curTw.mediumBlocks
        }b)`,
      });
    }
    if (tw.quickLabel || tw.quickBlocks) {
      items.push({
        id: 'taskWeightTemplates.quick',
        section: 'taskWeightTemplates',
        sectionLabel: 'Deliverable Presets',
        changeKind: 'MODIFIED',
        label: 'Quick Sprint Template',
        beforeSummary: `${curTw.quickLabel || 'Quick Sprint'} (${curTw.quickBlocks ?? 2}b)`,
        afterSummary: `${tw.quickLabel || curTw.quickLabel || 'Quick Sprint'} (${
          tw.quickBlocks ?? curTw.quickBlocks ?? 2
        }b)`,
      });
    }
  }

  // 5. Break Menu Labels
  if (patch.breakMenuLabels) {
    const bm = patch.breakMenuLabels;
    const curBm = currentState.breakOptions || DEFAULT_SYMMETRY_STATE.breakOptions!;
    const entries: {
      key: keyof BreakMenuLabelsPatch;
      title: string;
      before: string;
      after?: string;
    }[] = [
      {
        key: 'level1MicroReset',
        title: 'Level 1 Micro-Reset (3–5m)',
        before: curBm.l1Label,
        after: bm.level1MicroReset,
      },
      {
        key: 'level2Espresso',
        title: 'Level 2 Buffer Option 1',
        before: curBm.l2EspressoLabel,
        after: bm.level2Espresso,
      },
      {
        key: 'level2Music',
        title: 'Level 2 Buffer Option 2',
        before: curBm.l2MusicLabel,
        after: bm.level2Music,
      },
      {
        key: 'level2Physical',
        title: 'Level 2 Buffer Option 3',
        before: curBm.l2PhysicalLabel,
        after: bm.level2Physical,
      },
      {
        key: 'level3MidDayReset',
        title: 'Level 3 Mid-Day Reset (60–120m)',
        before: curBm.l3MidDayLabel || '60–120m Off-Desk Mid-Day Reset',
        after: bm.level3MidDayReset,
      },
      {
        key: 'stressBreathing',
        title: 'Stress Reset: Breathing',
        before: curBm.stressBreathingLabel,
        after: bm.stressBreathing,
      },
      {
        key: 'stressEspresso',
        title: 'Stress Reset: Beverage / Step Away',
        before: curBm.stressEspressoLabel,
        after: bm.stressEspresso,
      },
      {
        key: 'stressPhysical',
        title: 'Stress Reset: Physical Recovery',
        before: curBm.stressBootsLabel,
        after: bm.stressPhysical,
      },
    ];
    for (const entry of entries) {
      if (entry.after && entry.after !== entry.before) {
        items.push({
          id: `breakMenuLabels.${entry.key}`,
          section: 'breakMenuLabels',
          sectionLabel: 'Break & Stress Menu',
          changeKind: 'RENAMED',
          label: entry.title,
          beforeSummary: entry.before,
          afterSummary: entry.after,
        });
      }
    }
  }

  // 6. Evening Categories
  if (Array.isArray(patch.eveningCategories)) {
    const existingCards = getEffectiveEveningCategoryCards(currentState.recharge);
    patch.eveningCategories.forEach((cat, idx) => {
      const slotNum = cat.slotNumber ?? idx + 1;
      const existing =
        (cat.id && existingCards.find((c) => c.id === cat.id)) ||
        existingCards.find((c) => c.slotNumber === slotNum) ||
        existingCards[idx];

      items.push({
        id: `eveningCategories.${idx}`,
        section: 'eveningCategories',
        sectionLabel: 'Evening Recharge Menu',
        changeKind: existing ? 'RENAMED' : 'ADDED',
        label: `Channel ${slotNum}: ${cat.name} [${
          cat.mode === 'sticky' ? 'Sticky' : 'Fluid'
        }${cat.tripleTrack ? ' • Triple-Track' : ''}]`,
        beforeSummary: existing
          ? `${existing.categoryName} — "${existing.activeTitle}"`
          : 'Empty Channel',
        afterSummary: cat.hidden
          ? `Hidden (Decluttered)`
          : `${cat.name} — "${cat.activeTitle}" (5m: "${cat.startupStep5m}")`,
      });
    });
  }

  // 7. House Tracks & Banners
  if (patch.houseTracks) {
    if (patch.houseTracks.shelter?.title || patch.houseTracks.shelter?.subtitle) {
      const curShelter = currentState.roadmapShelter || DEFAULT_HOUSE_SHELTER;
      items.push({
        id: 'houseTracks.shelter',
        section: 'houseTracks',
        sectionLabel: 'Long-Term Roadmap',
        changeKind: 'MODIFIED',
        label: 'Top Shelter Banner (Non-Quota)',
        beforeSummary: curShelter.title,
        afterSummary: `${patch.houseTracks.shelter.title || curShelter.title}${
          patch.houseTracks.shelter.subtitle
            ? ` — ${patch.houseTracks.shelter.subtitle}`
            : ''
        }`,
      });
    }
    if (
      patch.houseTracks.foundation?.title ||
      patch.houseTracks.foundation?.subtitle ||
      patch.houseTracks.foundation?.statusSummary
    ) {
      const curFound = currentState.roadmapFoundation || DEFAULT_HOUSE_FOUNDATION;
      items.push({
        id: 'houseTracks.foundation',
        section: 'houseTracks',
        sectionLabel: 'Long-Term Roadmap',
        changeKind: 'MODIFIED',
        label: 'Bottom Foundation Banner (Non-Quota)',
        beforeSummary: curFound.title,
        afterSummary: `${patch.houseTracks.foundation.title || curFound.title}`,
      });
    }
    if (Array.isArray(patch.houseTracks.tracks)) {
      patch.houseTracks.tracks.forEach((tr, idx) => {
        const curTrack = currentState.roadmapTracks.find((t) => t.id === tr.trackId);
        items.push({
          id: `houseTracks.tracks.${idx}`,
          section: 'houseTracks',
          sectionLabel: 'Long-Term Roadmap',
          changeKind: 'MODIFIED',
          label: `Track (${tr.trackId}): ${tr.title || curTrack?.name || tr.trackId}`,
          beforeSummary: curTrack ? curTrack.name : tr.trackId,
          afterSummary: `${tr.title || curTrack?.name || tr.trackId}${
            tr.rungs?.length ? ` (${tr.rungs.length} rung updates)` : ''
          }`,
        });
      });
    }
  }

  // 8. UI Terminology Overrides
  if (patch.uiTerminologyOverrides) {
    const curTerms = currentState.uiTerminology || {};
    const labelMap: Record<keyof UiTerminologyOverrides, { name: string; fallback: string }> = {
      cruiseLabel: { name: 'Cruise Mode Label', fallback: 'Cruise Mode' },
      surgeLabel: { name: 'Surge Mode Label', fallback: 'Surge Mode' },
      taperLabel: { name: 'Taper Mode Label', fallback: 'Taper / Lab Mode' },
      baselineFloorLabel: { name: 'Baseline Floor Heading', fallback: 'Daily Core Baseline' },
      closedListLabel: { name: 'Closed List Heading', fallback: 'Active Project Queue' },
      ambitionDripLabel: { name: 'Ambition Drip Pill Label', fallback: 'Ambition Drip' },
      focusTabLabel: { name: 'Focus Pipeline Tab Label', fallback: 'Focus' },
      eveningTabLabel: { name: 'Evening Menu Tab Label', fallback: 'Evening' },
      roadmapTabLabel: { name: 'Roadmap Tab Label', fallback: 'Roadmap' },
    };

    for (const key of Object.keys(labelMap) as (keyof UiTerminologyOverrides)[]) {
      const nextVal = patch.uiTerminologyOverrides[key]?.trim();
      if (nextVal && nextVal !== (curTerms[key] || labelMap[key].fallback)) {
        items.push({
          id: `uiTerminologyOverrides.${key}`,
          section: 'uiTerminologyOverrides',
          sectionLabel: 'UI Terminology',
          changeKind: 'RENAMED',
          label: labelMap[key].name,
          beforeSummary: curTerms[key] || labelMap[key].fallback,
          afterSummary: nextVal,
        });
      }
    }
  }

  return items;
}

/**
 * Filters a `WorkspaceConfigPatch` down to ONLY the diff item IDs checked by the user.
 */
export function filterConfigPatchBySelectedIds(
  patch: WorkspaceConfigPatch,
  selectedIds: Set<string>
): WorkspaceConfigPatch {
  const out: WorkspaceConfigPatch = {};

  if (patch.presetMeta) {
    const keepName = selectedIds.has('presetMeta.name');
    if (keepName || patch.presetMeta.saveAsNewCustomPreset || patch.presetMeta.description) {
      out.presetMeta = {
        name: keepName ? patch.presetMeta.name : undefined,
        description: patch.presetMeta.description,
        saveAsNewCustomPreset: patch.presetMeta.saveAsNewCustomPreset,
      };
    }
  }

  if (patch.schedulePrefs) {
    const sp: SchedulePrefsPatch = {};
    if (selectedIds.has('schedulePrefs.blockCadence')) {
      sp.blockCadence = patch.schedulePrefs.blockCadence;
    }
    if (selectedIds.has('schedulePrefs.closedListLockMode')) {
      sp.closedListLockMode = patch.schedulePrefs.closedListLockMode;
    }
    if (selectedIds.has('schedulePrefs.eveningPulseSensitivity')) {
      sp.eveningPulseSensitivity = patch.schedulePrefs.eveningPulseSensitivity;
    }
    if (selectedIds.has('schedulePrefs.layoutMode')) {
      sp.layoutMode = patch.schedulePrefs.layoutMode;
    }
    if (selectedIds.has('schedulePrefs.logicalDayRolloverHour')) {
      sp.logicalDayRolloverHour = patch.schedulePrefs.logicalDayRolloverHour;
    }
    if (selectedIds.has('schedulePrefs.earlyShutdownTime')) {
      sp.earlyShutdownTime = patch.schedulePrefs.earlyShutdownTime;
    }
    if (selectedIds.has('schedulePrefs.fixedEveningAnchorToday')) {
      sp.fixedEveningAnchorToday = patch.schedulePrefs.fixedEveningAnchorToday;
    }
    if (Object.keys(sp).length > 0) {
      out.schedulePrefs = sp;
    }
  }

  if (Array.isArray(patch.baselineSlots)) {
    if (
      patch.baselineSlots.length === 0 &&
      patch.replaceAllBaselineSlots &&
      selectedIds.has('baselineSlots.clearAll')
    ) {
      out.baselineSlots = [];
      out.replaceAllBaselineSlots = true;
    } else {
      const picked = patch.baselineSlots.filter((_, idx) =>
        selectedIds.has(`baselineSlots.${idx}`)
      );
      if (picked.length > 0) {
        out.baselineSlots = picked;
        out.replaceAllBaselineSlots =
          patch.replaceAllBaselineSlots &&
          picked.length === patch.baselineSlots.length;
      }
    }
  }

  if (patch.taskWeightTemplates) {
    const tw: TaskWeightTemplatesPatch = {};
    if (selectedIds.has('taskWeightTemplates.heavy')) {
      tw.heavyLabel = patch.taskWeightTemplates.heavyLabel;
      tw.heavyBlocks = patch.taskWeightTemplates.heavyBlocks;
    }
    if (selectedIds.has('taskWeightTemplates.medium')) {
      tw.mediumLabel = patch.taskWeightTemplates.mediumLabel;
      tw.mediumBlocks = patch.taskWeightTemplates.mediumBlocks;
    }
    if (selectedIds.has('taskWeightTemplates.quick')) {
      tw.quickLabel = patch.taskWeightTemplates.quickLabel;
      tw.quickBlocks = patch.taskWeightTemplates.quickBlocks;
    }
    if (Object.keys(tw).length > 0) {
      out.taskWeightTemplates = tw;
    }
  }

  if (patch.breakMenuLabels) {
    const bm: BreakMenuLabelsPatch = {};
    for (const key of Object.keys(patch.breakMenuLabels) as (keyof BreakMenuLabelsPatch)[]) {
      if (selectedIds.has(`breakMenuLabels.${key}`)) {
        bm[key] = patch.breakMenuLabels[key];
      }
    }
    if (Object.keys(bm).length > 0) {
      out.breakMenuLabels = bm;
    }
  }

  if (Array.isArray(patch.eveningCategories)) {
    const pickedCats = patch.eveningCategories.filter((_, idx) =>
      selectedIds.has(`eveningCategories.${idx}`)
    );
    if (pickedCats.length > 0) {
      out.eveningCategories = pickedCats;
    }
  }

  if (patch.houseTracks) {
    const ht: HouseTracksPatch = {};
    if (selectedIds.has('houseTracks.shelter') && patch.houseTracks.shelter) {
      ht.shelter = patch.houseTracks.shelter;
    }
    if (selectedIds.has('houseTracks.foundation') && patch.houseTracks.foundation) {
      ht.foundation = patch.houseTracks.foundation;
    }
    if (Array.isArray(patch.houseTracks.tracks)) {
      const pickedTracks = patch.houseTracks.tracks.filter((_, idx) =>
        selectedIds.has(`houseTracks.tracks.${idx}`)
      );
      if (pickedTracks.length > 0) {
        ht.tracks = pickedTracks;
      }
    }
    if (Object.keys(ht).length > 0) {
      out.houseTracks = ht;
    }
  }

  if (patch.uiTerminologyOverrides) {
    const ut: UiTerminologyOverrides = {};
    for (const key of Object.keys(
      patch.uiTerminologyOverrides
    ) as (keyof UiTerminologyOverrides)[]) {
      if (selectedIds.has(`uiTerminologyOverrides.${key}`)) {
        ut[key] = patch.uiTerminologyOverrides[key];
      }
    }
    if (Object.keys(ut).length > 0) {
      out.uiTerminologyOverrides = ut;
    }
  }

  return out;
}

export interface ApplyWorkspacePatchOptions {
  saveAsCustomPreset?: boolean;
  customPresetNameOverride?: string;
  customPresetDescriptionOverride?: string;
}

export interface ApplyWorkspacePatchResult {
  nextState: SymmetryState;
  savedPreset?: ProfilePresetDefinition;
  appliedSummaryLines: string[];
}

/**
 * Losslessly applies a validated `WorkspaceConfigPatch` onto `SymmetryState`.
 */
export function applyConfigPatchToState(
  currentState: SymmetryState,
  rawPatch: WorkspaceConfigPatch,
  options?: ApplyWorkspacePatchOptions
): ApplyWorkspacePatchResult {
  const { validatedPatch: patch } = validateAndClampConfigPatch(
    rawPatch,
    currentState
  );
  let nextState: SymmetryState = JSON.parse(JSON.stringify(currentState));
  const appliedSummaryLines: string[] = [];

  // 1. Preset Meta
  if (patch.presetMeta?.name) {
    nextState.profileName = patch.presetMeta.name;
    appliedSummaryLines.push(`Profile → "${patch.presetMeta.name}"`);
  }

  // 2. Schedule & Flexibility Prefs
  if (patch.schedulePrefs) {
    const sp = patch.schedulePrefs;
    const prevFlex = nextState.flexibilityTuning || { ...DEFAULT_FLEXIBILITY_TUNING };
    const nextFlex: StructureFlexibilityConfig = { ...prevFlex };

    if (sp.blockCadence) {
      nextFlex.blockCadencePreset = mapShortCadenceToState(sp.blockCadence);
      if (!nextState.timer.isRunning && nextState.timer.mode === 'WORK_20M') {
        const startupSecs = sp.blockCadence === '15m' ? 180 : 300;
        const momentumSecs =
          sp.blockCadence === '15m' ? 720 : sp.blockCadence === '25m' ? 1200 : 900;
        nextState.timer = {
          ...nextState.timer,
          secondsLeft:
            nextState.timer.workStage === 'IGNITION_5M' ? startupSecs : momentumSecs,
        };
      }
      appliedSummaryLines.push(`Block Cadence → ${sp.blockCadence}`);
    }

    if (sp.closedListLockMode) {
      nextFlex.closedListLockMode =
        sp.closedListLockMode === 'dual_slot_ambition'
          ? 'DUAL_SLOT'
          : 'STRICT_SERIALIZED';
      appliedSummaryLines.push(
        `Closed List Lock → ${
          sp.closedListLockMode === 'dual_slot_ambition' ? 'Dual-Slot' : 'Strict #1'
        }`
      );
    }

    if (sp.eveningPulseSensitivity) {
      nextFlex.eveningPulseSensitivity =
        sp.eveningPulseSensitivity === 'gentle'
          ? 'GENTLE_40_60'
          : 'STANDARD_20_40_60';
      appliedSummaryLines.push(`Evening Pulse → ${sp.eveningPulseSensitivity}`);
    }

    nextState.flexibilityTuning = nextFlex;

    if (sp.layoutMode) {
      nextState.uiLayoutMode = sp.layoutMode;
      appliedSummaryLines.push(`Layout Density → ${sp.layoutMode}`);
    }

    if (typeof sp.logicalDayRolloverHour === 'number') {
      nextState.logicalDayRolloverHour = sp.logicalDayRolloverHour;
      nextState.logicalDayKey = getLogicalDayKey(
        new Date(),
        sp.logicalDayRolloverHour
      );
      appliedSummaryLines.push(
        `Day Rollover → ${formatRolloverHourLabel(sp.logicalDayRolloverHour)}`
      );
    }

    if (sp.earlyShutdownTime) {
      nextState.earlyEveningShutdownTime = sp.earlyShutdownTime;
      nextState.pipelineDays = nextState.pipelineDays.map((d) =>
        d.fixedEvent === 'EVENING_OUTING_6PM'
          ? { ...d, fixedEventTimeLabel: `${sp.earlyShutdownTime} Early Shutdown` }
          : d
      );
      appliedSummaryLines.push(`Evening Shutdown → ${sp.earlyShutdownTime}`);
    }

    if (sp.fixedEveningAnchorToday) {
      const anchorTime =
        sp.earlyShutdownTime || nextState.earlyEveningShutdownTime || '6:00 PM';
      nextState.fixedEvent = 'EVENING_OUTING_6PM';
      nextState.pipelineDays = nextState.pipelineDays.map((d, idx) =>
        d.isToday || idx === 0
          ? {
              ...d,
              fixedEvent: 'EVENING_OUTING_6PM',
              fixedEventTimeLabel: `${anchorTime} Early Shutdown`,
            }
          : d
      );
      appliedSummaryLines.push(`Logged Fixed Evening Anchor (${anchorTime})`);
    }
  }

  // 3. Baseline Slots ( enforce max 8 total & lateNightBlocker on recall )
  if (Array.isArray(patch.baselineSlots)) {
    if (patch.baselineSlots.length === 0 && patch.replaceAllBaselineSlots) {
      nextState.baselineBlocks = [];
      nextState.baselineSlots = [];
      appliedSummaryLines.push('Daily Core Baseline → 0 blocks');
    } else if (patch.baselineSlots.length > 0) {
      const buildSlotBlock = (
        slot: BaselineSlotPatch,
        idx: number,
        existing?: BaselineBlock
      ): BaselineBlock => {
        const category: BaselineCategory = slot.isMechanicalRecall
          ? idx === 0
            ? 'FLASHCARDS_ANATOMY'
            : 'FLASHCARDS_COMP'
          : slot.cognitiveDemand === 'DEEP_SYNTHESIS'
          ? 'SYNTHESIS'
          : 'READING';
        const prevCompleted = existing?.completedBlocks ?? 0;
        const clampedCompleted = Math.min(prevCompleted, slot.blocksTarget);
        return {
          id: slot.id || existing?.id || `custom_floor_${idx + 1}_${Date.now() % 10000}`,
          category,
          title: slot.label,
          durationMinutes: 20 * slot.blocksTarget,
          startupStep: slot.startupStep5m,
          completed: clampedCompleted >= slot.blocksTarget,
          targetBlocks: slot.blocksTarget,
          blocksTarget: slot.blocksTarget,
          completedBlocks: clampedCompleted,
          cognitiveDemand: slot.cognitiveDemand,
          earlyClearanceEligible: slot.supportsEarlyClearance,
          supportsEarlyClearance: slot.supportsEarlyClearance,
          bankedViaEarlyClearance: false,
          reallocatedViaEarlyClearance: false,
          reallocatedBlocksCount: 0,
          lateNightBlocker: slot.isMechanicalRecall,
          trackId: existing?.trackId || 'science',
        };
      };

      let nextBaseline: BaselineBlock[];
      if (patch.replaceAllBaselineSlots) {
        nextBaseline = patch.baselineSlots.map((slot, idx) =>
          buildSlotBlock(slot, idx, nextState.baselineBlocks[idx])
        );
      } else {
        // Merge by id or slot index, appending new slots
        nextBaseline = [...nextState.baselineBlocks];
        patch.baselineSlots.forEach((slot, idx) => {
          const matchIdx = slot.id
            ? nextBaseline.findIndex((b) => b.id === slot.id)
            : idx < nextBaseline.length
            ? idx
            : -1;
          if (matchIdx >= 0) {
            nextBaseline[matchIdx] = buildSlotBlock(
              slot,
              matchIdx,
              nextBaseline[matchIdx]
            );
          } else {
            nextBaseline.push(buildSlotBlock(slot, nextBaseline.length));
          }
        });
      }

      // Enforce 8-block total ceiling across merged baseline
      let totalFloor = nextBaseline.reduce(
        (s, b) => s + getBaselineSlotTargetBlocks(b),
        0
      );
      while (totalFloor > 8 && nextBaseline.length > 0) {
        const lastIdx = nextBaseline.length - 1;
        const curT = getBaselineSlotTargetBlocks(nextBaseline[lastIdx]);
        if (curT > 1) {
          nextBaseline[lastIdx] = {
            ...nextBaseline[lastIdx],
            targetBlocks: curT - 1,
            durationMinutes: (curT - 1) * 20,
          };
        } else {
          nextBaseline.pop();
        }
        totalFloor = nextBaseline.reduce(
          (s, b) => s + getBaselineSlotTargetBlocks(b),
          0
        );
      }

      nextState.baselineBlocks = nextBaseline;
      nextState.baselineSlots = nextBaseline;
      appliedSummaryLines.push(
        `Daily Baseline → ${totalFloor}b across ${nextBaseline.length} slot${
          nextBaseline.length === 1 ? '' : 's'
        }`
      );
    }
  }

  // 4. Task Weight Templates
  if (patch.taskWeightTemplates) {
    const curTw: TaskWeightsConfig = {
      ...(nextState.taskWeights || DEFAULT_SYMMETRY_STATE.taskWeights!),
    };
    const tw = patch.taskWeightTemplates;
    if (tw.heavyLabel) curTw.heavyLabel = tw.heavyLabel;
    if (typeof tw.heavyBlocks === 'number') curTw.heavyBlocks = tw.heavyBlocks;
    if (tw.mediumLabel) curTw.mediumLabel = tw.mediumLabel;
    if (typeof tw.mediumBlocks === 'number') curTw.mediumBlocks = tw.mediumBlocks;
    if (tw.quickLabel) curTw.quickLabel = tw.quickLabel;
    if (typeof tw.quickBlocks === 'number') curTw.quickBlocks = tw.quickBlocks;
    nextState.taskWeights = curTw;
    appliedSummaryLines.push('Updated Deliverable Block Templates');
  }

  // 5. Break Menu Labels
  if (patch.breakMenuLabels) {
    const curBm = {
      ...(nextState.breakOptions || DEFAULT_SYMMETRY_STATE.breakOptions!),
    };
    const bm = patch.breakMenuLabels;
    if (bm.level1MicroReset) {
      curBm.l1Label = bm.level1MicroReset;
      curBm.l1MicroResetLabel = bm.level1MicroReset;
    }
    if (bm.level2Espresso) {
      curBm.l2EspressoLabel = bm.level2Espresso;
      curBm.l2Option1Label = bm.level2Espresso;
    }
    if (bm.level2Music) {
      curBm.l2MusicLabel = bm.level2Music;
      curBm.l2Option2Label = bm.level2Music;
    }
    if (bm.level2Physical) {
      curBm.l2PhysicalLabel = bm.level2Physical;
      curBm.l2Option3Label = bm.level2Physical;
    }
    if (bm.level3MidDayReset) {
      curBm.l3MidDayLabel = bm.level3MidDayReset;
    }
    if (bm.stressBreathing) curBm.stressBreathingLabel = bm.stressBreathing;
    if (bm.stressEspresso) curBm.stressEspressoLabel = bm.stressEspresso;
    if (bm.stressPhysical) curBm.stressBootsLabel = bm.stressPhysical;
    nextState.breakOptions = curBm;
    appliedSummaryLines.push('Updated Break & Stress Reset Labels');
  }

  // 6. Evening Categories (up to 6 channels, synced with legacy maps)
  if (Array.isArray(patch.eveningCategories) && patch.eveningCategories.length > 0) {
    const existingCards: EveningCategoryCardConfig[] = JSON.parse(
      JSON.stringify(getEffectiveEveningCategoryCards(nextState.recharge))
    );

    const slotDefaults: {
      id: string;
      legacyKey: RechargeCategoryId;
      stickyKey?: StickyKey;
      fluidKey?: 'CAT1_MUSIC' | 'CAT4_COMFORT' | 'CAT6_CULTURE';
    }[] = [
      { id: 'CAT1_MUSIC', legacyKey: 'CAT1_MUSIC', fluidKey: 'CAT1_MUSIC' },
      { id: 'CAT2_MAKER', legacyKey: 'CAT2_MAKER', stickyKey: 'CAT2_MAKER' },
      { id: 'CAT3_MEDIA', legacyKey: 'CAT3_MEDIA', stickyKey: '3A_FICTION' },
      { id: 'CAT4_COMFORT', legacyKey: 'CAT4_COMFORT', fluidKey: 'CAT4_COMFORT' },
      { id: 'CAT5_GAMING', legacyKey: 'CAT5_GAMING', stickyKey: 'CAT5_GAMING' },
      { id: 'CAT6_CULTURE', legacyKey: 'CAT6_CULTURE', fluidKey: 'CAT6_CULTURE' },
    ];

    patch.eveningCategories.slice(0, 6).forEach((catPatch, idx) => {
      const slotNumber = catPatch.slotNumber ?? idx + 1;
      const slotMeta = slotDefaults[Math.min(5, Math.max(0, slotNumber - 1))];
      const existingIdx = existingCards.findIndex(
        (c) =>
          (catPatch.id && c.id === catPatch.id) ||
          c.slotNumber === slotNumber ||
          c.id === slotMeta.id
      );

      const prevCard = existingIdx >= 0 ? existingCards[existingIdx] : undefined;
      const isTriple = Boolean(catPatch.tripleTrack);

      const builtSubTracks: EveningSubTrackConfig[] | undefined = isTriple
        ? (catPatch.subTracks && catPatch.subTracks.length > 0
            ? catPatch.subTracks
            : [
                {
                  id: '3A_FICTION',
                  label: '3A Primary',
                  activeTitle: catPatch.activeTitle,
                  startupStep5m: catPatch.startupStep5m,
                },
                {
                  id: '3B_NONFICTION',
                  label: '3B Secondary',
                  activeTitle: `${catPatch.name} Track B`,
                  startupStep5m: catPatch.startupStep5m,
                },
                {
                  id: '3C_VIDEO',
                  label: '3C Watch',
                  activeTitle: `${catPatch.name} Track C`,
                  startupStep5m: catPatch.startupStep5m,
                },
              ]
          ).map((st, sIdx) => ({
            id:
              st.id ||
              (['3A_FICTION', '3B_NONFICTION', '3C_VIDEO'][sIdx] ?? `SUB_${sIdx + 1}`),
            label: st.label,
            activeTitle: st.activeTitle,
            startupStep: st.startupStep5m,
            startupPrompt: st.startupStep5m,
            speedControl: sIdx === 0,
            backlogQueue: prevCard?.subTracks?.[sIdx]?.backlogQueue || [],
            fiveMinStarts: prevCard?.subTracks?.[sIdx]?.fiveMinStarts || 0,
            unlockedViaCheckIn: false,
          }))
        : undefined;

      const updatedCard: EveningCategoryCardConfig = {
        ...(prevCard || {
          id: catPatch.id || slotMeta.id,
          slotNumber,
          backlogQueue: [],
          fiveMinStarts: 0,
          unlockedViaCheckIn: false,
          legacyCategoryKey: slotMeta.legacyKey,
          stickyKey: slotMeta.stickyKey,
          fluidKey: slotMeta.fluidKey,
        }),
        slotNumber,
        categoryName: catPatch.name,
        icon: catPatch.icon || prevCard?.icon,
        behavior: catPatch.mode === 'sticky' ? 'STICKY' : 'FLUID',
        trackMode: isTriple ? 'TRIPLE' : 'SINGLE',
        hidden: typeof catPatch.hidden === 'boolean' ? catPatch.hidden : false,
        activeTitle: catPatch.activeTitle,
        startupStep: catPatch.startupStep5m,
        startupPrompt: catPatch.startupStep5m,
        subTracks: builtSubTracks,
        activeSubTrackId: isTriple
          ? builtSubTracks?.[0]?.id || '3A_FICTION'
          : undefined,
      };

      if (existingIdx >= 0) {
        existingCards[existingIdx] = updatedCard;
      } else if (existingCards.length < 6) {
        existingCards.push(updatedCard);
      }
    });

    const synced = syncCategoryCardsToLegacyRecharge(
      existingCards,
      nextState.recharge.stickySlots,
      nextState.recharge.fluidCategories || DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!
    );

    nextState.recharge = {
      ...nextState.recharge,
      categoryCards: synced.categoryCards,
      stickySlots: synced.stickySlots,
      fluidCategories: synced.fluidCategories,
    };
    appliedSummaryLines.push(
      `Updated ${patch.eveningCategories.length} Evening Recharge channel${
        patch.eveningCategories.length === 1 ? '' : 's'
      }`
    );
  }

  // 7. House Tracks & Banners
  if (patch.houseTracks) {
    if (patch.houseTracks.shelter) {
      const curS = nextState.roadmapShelter || DEFAULT_HOUSE_SHELTER;
      const nextNotes: RoadmapHorizonNote[] = patch.houseTracks.shelter.horizonNotes
        ? curS.horizonNotes.map((hn) => {
            const ov = patch.houseTracks?.shelter?.horizonNotes?.find(
              (n) => n.horizon === hn.horizon
            );
            return ov
              ? {
                  ...hn,
                  horizonLabel: ov.label || hn.horizonLabel,
                  label: ov.label || hn.label,
                  note: ov.note,
                }
              : hn;
          })
        : curS.horizonNotes;
      nextState.roadmapShelter = {
        ...curS,
        title: patch.houseTracks.shelter.title || curS.title,
        subtitle: patch.houseTracks.shelter.subtitle || curS.subtitle,
        horizonNotes: nextNotes,
      };
      appliedSummaryLines.push('Updated Top Shelter Banner');
    }

    if (patch.houseTracks.foundation) {
      const curF = nextState.roadmapFoundation || DEFAULT_HOUSE_FOUNDATION;
      const nextNotes: RoadmapHorizonNote[] = patch.houseTracks.foundation.horizonNotes
        ? curF.horizonNotes.map((hn) => {
            const ov = patch.houseTracks?.foundation?.horizonNotes?.find(
              (n) => n.horizon === hn.horizon
            );
            return ov
              ? {
                  ...hn,
                  horizonLabel: ov.label || hn.horizonLabel,
                  label: ov.label || hn.label,
                  note: ov.note,
                }
              : hn;
          })
        : curF.horizonNotes;
      nextState.roadmapFoundation = {
        ...curF,
        title: patch.houseTracks.foundation.title || curF.title,
        subtitle: patch.houseTracks.foundation.subtitle || curF.subtitle,
        statusSummary:
          patch.houseTracks.foundation.statusSummary || curF.statusSummary,
        horizonNotes: nextNotes,
      };
      appliedSummaryLines.push('Updated Bottom Foundation Banner');
    }

    if (Array.isArray(patch.houseTracks.tracks) && patch.houseTracks.tracks.length > 0) {
      const migratedTracks = migrateRoadmapTracksToHouseTopology(
        nextState.roadmapTracks
      );
      nextState.roadmapTracks = migratedTracks.map((track: RoadmapTrack) => {
        const trPatch = patch.houseTracks?.tracks?.find(
          (p) => p.trackId === (track.id as TrackId)
        );
        if (!trPatch) return track;

        const isSandbox =
          typeof trPatch.isSandbox === 'boolean' ? trPatch.isSandbox : track.isSandbox;

        const nextRungs: RoadmapRung[] = track.rungs.map((r) => {
          const rPatch = trPatch.rungs?.find((rp) => rp.rungNumber === r.rungNumber);
          if (!rPatch) return r;
          return {
            ...r,
            label: rPatch.label?.trim() || r.label,
            description: rPatch.description?.trim() || r.description,
            ledgerType: rPatch.ledgerType || r.ledgerType,
            targetBlocks:
              typeof rPatch.targetBlocks === 'number'
                ? Math.max(1, Math.min(50, Math.round(rPatch.targetBlocks)))
                : r.targetBlocks,
          };
        });

        return {
          ...track,
          name: trPatch.title?.trim() || track.name,
          archetypeRole: trPatch.title?.trim() || track.archetypeRole,
          isSandbox,
          categoryLabel: isSandbox ? 'ZERO-QUOTA SANDBOX' : 'MAJOR CORE TRACK',
          inputWeeklyTarget:
            typeof trPatch.inputWeeklyTarget === 'number'
              ? Math.max(0, Math.round(trPatch.inputWeeklyTarget))
              : isSandbox
              ? 0
              : track.inputWeeklyTarget,
          outputWeeklyTarget:
            typeof trPatch.outputWeeklyTarget === 'number'
              ? Math.max(0, Math.round(trPatch.outputWeeklyTarget))
              : isSandbox
              ? 0
              : track.outputWeeklyTarget,
          rungs: nextRungs,
        };
      });
      appliedSummaryLines.push(
        `Updated ${patch.houseTracks.tracks.length} Roadmap House track${
          patch.houseTracks.tracks.length === 1 ? '' : 's'
        }`
      );
    }
  }

  // 8. UI Terminology Overrides
  if (patch.uiTerminologyOverrides) {
    nextState.uiTerminology = {
      ...(nextState.uiTerminology || {}),
      ...patch.uiTerminologyOverrides,
    };
    appliedSummaryLines.push('Applied Custom UI Terminology');
  }

  // Enforce all core state-machine invariants on `nextState`:
  // 1. Closed List max 3 items & valid lock mode
  if (nextState.projectQueue.length > 3) {
    const overflow = nextState.projectQueue
      .slice(3)
      .map(({ slot: _slot, ...rest }) => rest);
    nextState.projectQueue = nextState.projectQueue
      .slice(0, 3)
      .map((item, idx) => ({
        ...item,
        slot: (idx + 1) as 1 | 2 | 3,
      }));
    nextState.openListBacklog = [...overflow, ...(nextState.openListBacklog || [])];
  }
  // 2. Consecutive Surge days <= 2 & 3-Tier block ceilings
  nextState.surgeConsecutiveDays = Math.max(
    0,
    Math.min(2, Math.round(nextState.surgeConsecutiveDays || 0))
  );
  if (!nextState.shockAbsorberMode || nextState.shockAbsorberMode === 'FULL_SHIFT') {
    if (nextState.loadMode === 'SURGE') {
      nextState.customModeBlockAdjustment = Math.max(
        14,
        Math.min(15, Math.round(nextState.customModeBlockAdjustment || 14))
      );
    } else if (nextState.loadMode === 'TAPER') {
      nextState.customModeBlockAdjustment = Math.max(
        7,
        Math.min(9, Math.round(nextState.customModeBlockAdjustment || 8))
      );
    } else {
      nextState.loadMode = 'CRUISE';
      nextState.customModeBlockAdjustment = Math.max(
        11,
        Math.min(13, Math.round(nextState.customModeBlockAdjustment || 12))
      );
    }
  }
  // 3. Flexibility tuning invariants (Startup >= 3m, valid Closed List lock, 60m evening break preserved)
  const safeFlex: StructureFlexibilityConfig = {
    ...(nextState.flexibilityTuning || DEFAULT_FLEXIBILITY_TUNING),
  };
  if (
    safeFlex.blockCadencePreset !== '15_3_12' &&
    safeFlex.blockCadencePreset !== '20_5_15' &&
    safeFlex.blockCadencePreset !== '25_5_20' &&
    safeFlex.blockCadencePreset !== '15M_3_12' &&
    safeFlex.blockCadencePreset !== '20M_5_15' &&
    safeFlex.blockCadencePreset !== '25M_5_20' &&
    safeFlex.blockCadencePreset !== 'CADENCE_15_3_12' &&
    safeFlex.blockCadencePreset !== 'CADENCE_20_5_15' &&
    safeFlex.blockCadencePreset !== 'CADENCE_25_5_20'
  ) {
    safeFlex.blockCadencePreset = 'CADENCE_20_5_15';
  }
  if (
    safeFlex.closedListLockMode !== 'STRICT_SERIALIZED' &&
    safeFlex.closedListLockMode !== 'DUAL_SLOT'
  ) {
    safeFlex.closedListLockMode = 'STRICT_SERIALIZED';
  }
  if (
    safeFlex.eveningPulseSensitivity !== 'STANDARD_20_40_60' &&
    safeFlex.eveningPulseSensitivity !== 'GENTLE_40_60'
  ) {
    safeFlex.eveningPulseSensitivity = 'STANDARD_20_40_60';
  }
  nextState.flexibilityTuning = safeFlex;

  // 4. Evening Option 0 (max 2 windows = 40m Fork Check) & 60m Mandatory Break invariants
  nextState.recharge = {
    ...nextState.recharge,
    option0ConsecutiveWindows: Math.max(
      0,
      Math.min(2, Math.round(nextState.recharge.option0ConsecutiveWindows || 0))
    ),
    option0SecondsLeft: Math.max(
      0,
      Math.min(1200, Math.round(nextState.recharge.option0SecondsLeft || 1200))
    ),
    categoryCards: getEffectiveEveningCategoryCards(nextState.recharge)
      .filter(
        (c) =>
          !isSocialOrLiveEveningEntry(
            `${c.categoryName || ''} ${c.activeTitle || ''}`
          )
      )
      .slice(0, 6),
  };

  nextState.dailyHistory = syncTodayIntoDailyHistory(nextState);

  // Optional: Save as Custom Preset
  let savedPreset: ProfilePresetDefinition | undefined;
  const shouldSavePreset = Boolean(
    options?.saveAsCustomPreset || patch.presetMeta?.saveAsNewCustomPreset
  );
  if (shouldSavePreset) {
    const presetName =
      options?.customPresetNameOverride?.trim() ||
      patch.presetMeta?.name?.trim() ||
      `${nextState.profileName || 'Custom Setup'} (AI Architect)`;
    const presetDesc =
      options?.customPresetDescriptionOverride?.trim() ||
      patch.presetMeta?.description?.trim() ||
      undefined;
    savedPreset = saveCurrentSetupAsPreset(nextState, presetName, presetDesc);
    nextState.profilePresetId = savedPreset.id;
    nextState.profileName = savedPreset.title;
    appliedSummaryLines.push(`Saved Custom Preset "${savedPreset.title}"`);
  }

  return {
    nextState,
    savedPreset,
    appliedSummaryLines,
  };
}

// ============================================================================
// 5. CHROME BUILT-IN `LanguageModel` API DETECTION & EXECUTION (TIER 2)
// ============================================================================

interface ChromeLanguageModelSession {
  prompt: (
    input: string,
    options?: { responseConstraint?: Record<string, unknown> }
  ) => Promise<string>;
  destroy?: () => void;
}

interface ChromeLanguageModelStatic {
  availability?: () => Promise<string>;
  capabilities?: () => Promise<{ available?: string }>;
  create: (options?: {
    initialPrompts?: { role: 'system' | 'user' | 'assistant'; content: string }[];
    expectedOutputs?: { type: 'text'; languages?: string[] }[];
  }) => Promise<ChromeLanguageModelSession>;
}

function getChromeLanguageModelNamespace(): ChromeLanguageModelStatic | null {
  if (typeof globalThis === 'undefined') return null;
  const g = globalThis as Record<string, unknown>;
  if (g.LanguageModel && typeof (g.LanguageModel as ChromeLanguageModelStatic).create === 'function') {
    return g.LanguageModel as ChromeLanguageModelStatic;
  }
  const winAi = g.ai as { languageModel?: ChromeLanguageModelStatic } | undefined;
  if (winAi?.languageModel && typeof winAi.languageModel.create === 'function') {
    return winAi.languageModel;
  }
  return null;
}

export async function probeChromeBuiltInAiAvailability(): Promise<boolean> {
  const lm = getChromeLanguageModelNamespace();
  if (!lm) return false;
  try {
    if (typeof lm.availability === 'function') {
      const status = await lm.availability();
      return status === 'available' || status === 'readily';
    }
    if (typeof lm.capabilities === 'function') {
      const caps = await lm.capabilities();
      return caps?.available === 'readily' || caps?.available === 'available';
    }
    return true;
  } catch {
    return false;
  }
}

export function getImmediateArchitectAiTier(
  chromeBuiltInReady: boolean = false
): ArchitectExecutionTier {
  if (hasActiveGeminiAccess()) return 'GEMINI_FLASH';
  if (chromeBuiltInReady) return 'CHROME_BUILTIN_AI';
  return 'LOCAL_COMPILER';
}

// ============================================================================
// 6. SYSTEM PROMPT & 1-CLICK GEMINI CHAT BRIDGE GENERATOR
// ============================================================================

export function buildWorkspaceSummaryContext(state: SymmetryState): string {
  const floorSummary = state.baselineBlocks
    .map((b) => `${b.title} (${getBaselineSlotTargetBlocks(b)}b)`)
    .join(', ');
  const cards = getEffectiveEveningCategoryCards(state.recharge);
  const eveningSummary = cards
    .map(
      (c) =>
        `${c.slotNumber || 1}. ${c.categoryName} [${c.behavior}${
          c.trackMode === 'TRIPLE' ? '/TRIPLE' : ''
        }${c.hidden ? '/HIDDEN' : ''}]: "${c.activeTitle}"`
    )
    .join('; ');
  const tracksSummary = state.roadmapTracks
    .map((t) => `${t.id}: "${t.name}" (${t.isSandbox ? 'Sandbox' : 'Core'})`)
    .join('; ');
  const cadence = mapStateCadenceToShort(
    state.flexibilityTuning?.blockCadencePreset
  );

  return [
    `Active Profile: ${state.profileName || 'Balanced Core'}`,
    `Cadence: ${cadence} | Rollover: ${formatRolloverHourLabel(
      state.logicalDayRolloverHour ?? 4
    )} | Shutdown: ${state.earlyEveningShutdownTime || '6:00 PM'} | Layout: ${
      state.uiLayoutMode || 'full'
    }`,
    `Baseline Slots (${state.baselineBlocks.length}): ${floorSummary || 'None (0b)'}`,
    `Evening Channels: ${eveningSummary}`,
    `House Tracks: ${tracksSummary}`,
  ].join('\n');
}

const ARCHITECT_SYSTEM_INSTRUCTION = `You are the Workspace Architect for SymmetryManager, a deterministic duration-only productivity & evening recovery instrument.
Translate the user's natural-language description of their work, energy, attention style, and hobbies into a structured JSON object matching ArchitectTurnResponse:
{ "reply": string, "clarifyingOptions": [{ "id": string, "label": string, "prompt": string }], "guardrailNotes": string[], "configPatch": WorkspaceConfigPatch }.

STRICT MECHANICAL & TONE RULES:
1. Keep "reply" concise (1-2 sentences), strictly functional, mechanical, and neutral. Zero preachy, philosophical, or religious language.
2. Never disable the 2-stage Startup -> Momentum timer: minimum cadence is "15m" (3m Startup + 12m Momentum), standard is "20m" (5m Startup + 15m Momentum), deep is "25m" (5m Startup + 20m Momentum). Every baselineSlot and eveningCategory MUST include a concrete, physical "startupStep5m".
3. Baseline Floor total across baselineSlots must be between 0 and 8 blocks.
4. Never gamify or place social/family time, dates, parties, or live outings on eveningCategories. Route social/family/live events to schedulePrefs.earlyShutdownTime / fixedEveningAnchorToday and houseTracks.shelter, and explain neutrally in guardrailNotes.
5. Provide 2-3 helpful clickable clarifyingOptions ("Option A: ...", "Option B: ...") when trade-offs exist (e.g., Strict Focus #1 vs Dual-Slot, 15m vs 20m blocks, Sticky vs Fluid evening slots).`;

/**
 * Generates a 1-click copyable prompt for external Gemini Chat (`Cmd/Ctrl + Shift + V` compatible).
 */
export function generateConversationalSetupPromptForGemini(
  state: SymmetryState,
  history: ArchitectChatMessage[],
  latestUserDraft: string
): string {
  const recentTurns = history
    .slice(-6)
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join('\n');
  const userRequest =
    latestUserDraft.trim() ||
    history.filter((m) => m.role === 'user').slice(-1)[0]?.content ||
    'Customize my workspace for focused deep work, low admin overhead, and restorative evening hobbies.';

  return [
    '# SymmetryManager — Conversational Workspace Architect Prompt',
    '',
    ARCHITECT_SYSTEM_INSTRUCTION,
    '',
    '## Current Workspace Snapshot',
    buildWorkspaceSummaryContext(state),
    '',
    recentTurns ? `## Recent Conversation\n${recentTurns}\n` : '',
    `## My Customization Request\n"${userRequest}"`,
    '',
    '## Required Output Format',
    'Respond ONLY with a single ```json ... ``` code block matching this exact TypeScript/JSON structure (so I can press Cmd/Ctrl + Shift + V inside SymmetryManager to preview & apply it in 1 click):',
    '```json',
    JSON.stringify(
      {
        reply: 'Configured 15m blocks, 1-block daily admin floor, decluttered widget layout, and custom Evening Recharge channels.',
        guardrailNotes: [],
        clarifyingOptions: [
          {
            id: 'opt_a',
            label: 'Option A: Strict Focus #1 Lock',
            prompt: 'Keep Strict Focus #1 Lock on my active project queue.',
          },
          {
            id: 'opt_b',
            label: 'Option B: Dual-Slot (#1 + #2)',
            prompt: 'Enable Dual-Slot mode so I can alternate between Slot #1 and Slot #2.',
          },
        ],
        configPatch: {
          presetMeta: {
            name: 'Custom Studio Setup',
            description: 'Tailored cadence, baseline floor, and evening channels',
            saveAsNewCustomPreset: false,
          },
          schedulePrefs: {
            blockCadence: '15m',
            layoutMode: 'widget',
            closedListLockMode: 'strict_focus_1',
            eveningPulseSensitivity: 'standard',
          },
          replaceAllBaselineSlots: true,
          baselineSlots: [
            {
              label: 'Daily Admin & Triage',
              blocksTarget: 1,
              isMechanicalRecall: false,
              supportsEarlyClearance: true,
              startupStep5m: 'Open inbox, reply to top 2 urgent threads, and close tab.',
              cognitiveDemand: 'LIGHT_ADMIN',
            },
          ],
          eveningCategories: [
            {
              slotNumber: 1,
              name: 'Sketching',
              icon: 'palette',
              mode: 'fluid',
              activeTitle: 'iPad / Sketchbook Freehand Study',
              startupStep5m: 'Open sketchbook or Procreate canvas and draw 5 loose contour lines.',
            },
          ],
        },
      },
      null,
      2
    ),
    '```',
  ]
    .filter(Boolean)
    .join('\n');
}

// ============================================================================
// 7. TIER 3: RICH LOCAL NATURAL-LANGUAGE INTENT & KEYWORD COMPILER
// ============================================================================

interface ExtractedEveningChannelSeed {
  name: string;
  icon: string;
  mode: 'sticky' | 'fluid';
  tripleTrack?: boolean;
  activeTitle: string;
  startupStep5m: string;
  subTracks?: EveningSubTrackPatch[];
}

function buildEveningSeedForTopic(rawTopic: string): ExtractedEveningChannelSeed | null {
  const t = rawTopic.trim();
  if (!t || isSocialOrLiveEveningEntry(t)) return null;
  const lower = t.toLowerCase();

  if (/sketch|draw|illustrat|paint|procreate|watercolou?r|art/.test(lower)) {
    return {
      name: 'Sketching & Visual Art',
      icon: 'palette',
      mode: 'fluid',
      activeTitle: 'Freehand Sketchbook / Procreate Session',
      startupStep5m: 'Open sketchbook or tablet away from work apps and draw 5 loose warm-up lines.',
    };
  }
  if (/cozy\s*game|stardew|animal\s*crossing|baldur|rpg|gaming|games|steam\s*deck|switch/.test(lower)) {
    const isCozy = /cozy/.test(lower);
    return {
      name: isCozy ? 'Cozy Games' : 'Evening Gaming',
      icon: 'gamepad',
      mode: 'sticky',
      activeTitle: isCozy
        ? 'Cozy Handheld / Indie Session'
        : 'Current Story Campaign Micro-Objective',
      startupStep5m:
        'Launch current save file and complete 1 self-contained 5m in-game micro-objective.',
    };
  }
  if (/anime|manga/.test(lower)) {
    return {
      name: 'Anime & Manga',
      icon: 'tv',
      mode: 'sticky',
      tripleTrack: /manga/.test(lower),
      activeTitle: 'Seasonal Watchlist Episode',
      startupStep5m: 'Queue current episode away from work browser tabs and watch the first 5m.',
    };
  }
  if (/music|guitar|bass|piano|synth|ukulele|instrument|drum/.test(lower)) {
    return {
      name: 'Acoustic / Instrument Play',
      icon: 'music',
      mode: 'fluid',
      activeTitle: '5m Cold Song Playthrough (No Drills)',
      startupStep5m: 'Pick up instrument and play 1 favorite song cold — zero DAW or metronome drills.',
    };
  }
  if (/read|fiction|novel|sci-fi|fantasy|book|audiobook/.test(lower)) {
    return {
      name: 'Reading & Audio Media',
      icon: 'book',
      mode: 'sticky',
      tripleTrack: true,
      activeTitle: 'Active Fiction Chapter',
      startupStep5m: 'Open current chapter away from desk monitor and read or listen for 5m.',
      subTracks: [
        {
          id: '3A_FICTION',
          label: '3A Fiction',
          activeTitle: 'Current Fiction Novel',
          startupStep5m: 'Open current fiction chapter and read or listen for 5m.',
        },
        {
          id: '3B_NONFICTION',
          label: '3B Narrative Nonfiction',
          activeTitle: 'Current Nonfiction Book',
          startupStep5m: 'Read 3 pages of narrative nonfiction.',
        },
        {
          id: '3C_VIDEO',
          label: '3C Watchlist Series',
          activeTitle: 'Current Evening Series',
          startupStep5m: 'Start first 5m of queued episode on TV/tablet.',
        },
      ],
    };
  }
  if (/cook|bake|baking|tea|culinary|recipe/.test(lower)) {
    return {
      name: 'Culinary & Tea Craft',
      icon: 'coffee',
      mode: 'fluid',
      activeTitle: 'Hands-On Kitchen / Tea Ritual',
      startupStep5m: 'Clear counter space, set kettle or prep 1 ingredient with phone out of reach.',
    };
  }
  if (/3d\s*print|hardware|maker|electronics|wood|craft|knit|crochet|lego/.test(lower)) {
    return {
      name: 'Tactile Maker & Craft',
      icon: 'wrench',
      mode: 'sticky',
      activeTitle: 'Hands-On Bench / Craft Build',
      startupStep5m: 'Set out tools on bench and complete 1 physical 5m assembly or prep step.',
    };
  }
  if (/film|movie|cinema|comfort\s*show|sitcom|series/.test(lower)) {
    return {
      name: 'Comfort Show & Cinema',
      icon: 'film',
      mode: 'fluid',
      activeTitle: 'Off-Monitor Comfort Episode / Film',
      startupStep5m: 'Step away from work monitor and start first 5m of episode.',
    };
  }
  if (/lang|japanese|italian|spanish|french|korean|german/.test(lower)) {
    const capLang = t.charAt(0).toUpperCase() + t.slice(1);
    return {
      name: `${capLang} Immersion`,
      icon: 'globe',
      mode: 'fluid',
      activeTitle: 'Spoken Audio / Native Media Immersion',
      startupStep5m: 'Play 5m of native audio or dialogue — zero flashcard grading.',
    };
  }

  const titleCase = t
    .replace(/\b\w/g, (ch) => ch.toUpperCase())
    .slice(0, 36);
  return {
    name: titleCase,
    icon: normalizeIconName(undefined, titleCase),
    mode: /project|series|campaign|build|book/.test(lower) ? 'sticky' : 'fluid',
    activeTitle: `${titleCase} Session`,
    startupStep5m: `Set up ${titleCase.toLowerCase()} space away from work tabs and begin first 5m step.`,
  };
}

/**
 * Tier 3 Local Natural-Language Intent & Keyword Compiler:
 * Compiles natural multi-intent descriptions into a rich `ArchitectTurnResponse`
 * with zero external API keys required.
 */
export function compileNaturalLanguageToConfigPatch(
  userPrompt: string,
  currentState: SymmetryState = DEFAULT_SYMMETRY_STATE
): ArchitectTurnResponse {
  const text = userPrompt.trim();
  const lower = text.toLowerCase();
  const rawPatch: WorkspaceConfigPatch = {};
  const summaryParts: string[] = [];
  const clarifyingOptions: ArchitectClarifyingOption[] = [];

  // 1. Detect Persona / Role
  const isDesigner = /\b(designer|ux|ui|illustrator|creative\s+director|figma|brand)\b/.test(lower);
  const isEngineer = /\b(engineer|developer|programmer|software|frontend|backend|fullstack|coder|devops)\b/.test(lower);
  const isWriter = /\b(writer|author|novelist|journalist|copywriter|essayist|editor)\b/.test(lower);
  const isStudentOrMed = /\b(student|med\s*school|medical|phd|grad|exam|anki|flashcard|researcher|academic)\b/.test(lower);
  const isFreelance = /\b(freelance|freelancer|consultant|indie|solo|client)\b/.test(lower);
  const isAdhdOrLowFriction = /\b(adhd|neurodivergent|overwhelm|short\s+attention|shorter\s+blocks|low\s+friction|distract)\b/.test(lower);

  if (isDesigner || isEngineer || isWriter || isStudentOrMed || isFreelance) {
    const personaName = isDesigner
      ? isFreelance
        ? 'Freelance Design Studio'
        : 'Product & Visual Design'
      : isEngineer
      ? 'Software Builder Flow'
      : isWriter
      ? 'Authorship & Editorial Desk'
      : isStudentOrMed
      ? 'Academic & Recall Pipeline'
      : 'Independent Client Studio';
    rawPatch.presetMeta = {
      name: isAdhdOrLowFriction ? `${personaName} (Low-Friction)` : personaName,
      description: `Customized via Workspace Architect from: "${text.slice(0, 90)}"`,
      saveAsNewCustomPreset: false,
    };
  }

  // 2. Schedule & Cadence Preferences
  const schedulePrefs: SchedulePrefsPatch = {};

  if (/\b15\s*m(in(ute)?s?)?\b/.test(lower) || /\bshorter\s+(work\s+)?blocks?\b/.test(lower) || (isAdhdOrLowFriction && !/\b(20m|25m)\b/.test(lower))) {
    schedulePrefs.blockCadence = '15m';
    summaryParts.push('15m blocks (3m Startup + 12m Momentum)');
  } else if (/\b25\s*m(in(ute)?s?)?\b|\bpomodoro\b|\blonger\s+blocks?\b/.test(lower)) {
    schedulePrefs.blockCadence = '25m';
    summaryParts.push('25m blocks (5m Startup + 20m Momentum)');
  } else if (/\b20\s*m(in(ute)?s?)?\b|\bstandard\s+cadence\b/.test(lower)) {
    schedulePrefs.blockCadence = '20m';
    summaryParts.push('20m blocks (5m Startup + 15m Momentum)');
  }

  // Layout / Clutter / Density
  if (/\b(hide\s+clutter|minimal|compact|widget|less\s+clutter|clean\s+ui|declutter|distraction[-\s]?free|narrow)\b/.test(lower)) {
    schedulePrefs.layoutMode = 'widget';
    summaryParts.push('decluttered Compact Widget layout');
  } else if (/\b(split\s+view|split\s+mode|two[-\s]?column|balanced\s+split)\b/.test(lower)) {
    schedulePrefs.layoutMode = 'split';
    summaryParts.push('balanced Split layout');
  } else if (/\b(full\s*screen|widescreen|full\s+layout|expand\s+ui)\b/.test(lower)) {
    schedulePrefs.layoutMode = 'full';
    summaryParts.push('Full Widescreen layout');
  }

  // Closed List Lock Mode
  if (/\b(dual[-\s]?slot|two\s+projects|alternate\s+between\s+two|slot\s*#?1\s+and\s+#?2|ambition\s+slot)\b/.test(lower)) {
    schedulePrefs.closedListLockMode = 'dual_slot_ambition';
    summaryParts.push('Dual-Slot queue mode');
  } else if (/\b(strict\s+focus|single\s+project\s+lock|lock\s+to\s+#?1|strict\s+lock)\b/.test(lower)) {
    schedulePrefs.closedListLockMode = 'strict_focus_1';
    summaryParts.push('Strict Focus #1 lock');
  }

  // Evening Pulse Sensitivity
  if (/\b(gentle|fewer\s+check[-\s]?ins|less\s+interrupt|40m\s+check)\b/.test(lower)) {
    schedulePrefs.eveningPulseSensitivity = 'gentle';
    summaryParts.push('Gentle 40m/60m evening pacing');
  } else if (/\b(standard\s+pulse|20m\s+check[-\s]?in)\b/.test(lower)) {
    schedulePrefs.eveningPulseSensitivity = 'standard';
  }

  // Rollover hour (e.g. "rollover at 2am", "night owl 5am", "day starts at midnight")
  const rolloverMatch = lower.match(
    /\b(?:rollover|day\s+boundary|reset\s+day|new\s+day)\s+(?:at\s+|to\s+)?(\d{1,2})\s*(am|pm)?\b/
  );
  if (rolloverMatch) {
    let hr = parseInt(rolloverMatch[1], 10);
    const mer = rolloverMatch[2];
    if (mer === 'pm' && hr < 12) hr += 12;
    if (mer === 'am' && hr === 12) hr = 0;
    schedulePrefs.logicalDayRolloverHour = Math.max(0, Math.min(23, hr));
    summaryParts.push(`day rollover at ${formatRolloverHourLabel(schedulePrefs.logicalDayRolloverHour)}`);
  } else if (/\bmidnight\s+rollover\b/.test(lower)) {
    schedulePrefs.logicalDayRolloverHour = 0;
    summaryParts.push('12:00 AM rollover');
  }

  // Early shutdown time (e.g. "shutdown at 5:30 PM", "stop working at 7pm")
  const shutdownMatch = text.match(
    /\b(?:shut\s*down|stop\s+work(?:ing)?|end\s+shift|cutoff)\s+(?:at\s+|by\s+)?(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm))\b/
  );
  if (shutdownMatch) {
    schedulePrefs.earlyShutdownTime = shutdownMatch[1].toUpperCase().replace(/\s+/g, ' ');
    summaryParts.push(`evening cutoff at ${schedulePrefs.earlyShutdownTime}`);
  }

  if (Object.keys(schedulePrefs).length > 0) {
    rawPatch.schedulePrefs = schedulePrefs;
  }

  // 3. Baseline Floor Customization
  const zeroFloorMatch =
    /\b(0\s+baseline|zero\s+baseline|no\s+baseline|remove\s+baseline|0\s+admin)\b/.test(lower);
  const adminBlocksMatch = lower.match(
    /\b(?:keep\s+)?(?:daily\s+)?(?:admin|inbox|email|triage|baseline|floor|overhead)(?:\s+to|\s+at|\s+capped\s+at)?\s+(\d+)\s*blocks?\b/
  ) || lower.match(/\b(\d+)\s*blocks?\s+(?:of\s+)?(?:daily\s+)?(?:admin|inbox|triage|baseline|floor)\b/);

  if (zeroFloorMatch) {
    rawPatch.replaceAllBaselineSlots = true;
    rawPatch.baselineSlots = [];
    summaryParts.push('0-block baseline floor');
  } else if (adminBlocksMatch) {
    const count = Math.max(0, Math.min(8, parseInt(adminBlocksMatch[1], 10)));
    rawPatch.replaceAllBaselineSlots = true;
    if (count === 0) {
      rawPatch.baselineSlots = [];
      summaryParts.push('0-block baseline floor');
    } else {
      const slots: BaselineSlotPatch[] = [
        {
          label: isDesigner
            ? 'Client Admin, Slack & Asset Triage'
            : isEngineer
            ? 'PR Reviews, Standup Notes & Issue Triage'
            : 'Daily Admin & Inbox Triage',
          blocksTarget: count,
          isMechanicalRecall: false,
          supportsEarlyClearance: true,
          startupStep5m: isDesigner
            ? 'Open client inbox/Figma comments, flag top 2 replies, and close email tab.'
            : 'Process urgent messages for 5m and archive cleared threads.',
          cognitiveDemand: 'LIGHT_ADMIN',
        },
      ];
      rawPatch.baselineSlots = slots;
      summaryParts.push(`${count}-block daily admin baseline`);
    }
  } else if (isDesigner && !currentState.profileName?.includes('Design')) {
    rawPatch.replaceAllBaselineSlots = true;
    rawPatch.baselineSlots = [
      {
        label: 'Client Inbox & Feedback Triage',
        blocksTarget: 1,
        isMechanicalRecall: false,
        supportsEarlyClearance: true,
        startupStep5m: 'Open Figma comments & client messages, capture action bullets, close inbox.',
        cognitiveDemand: 'LIGHT_ADMIN',
      },
      {
        label: 'Visual Reference & Design Study',
        blocksTarget: 1,
        isMechanicalRecall: false,
        supportsEarlyClearance: false,
        startupStep5m: 'Collect 2 reference frames and annotate layout/typography hierarchy.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ];
    summaryParts.push('2-block studio baseline');
  } else if (isEngineer && /\b(setup|configure|customize|preset|workflow)\b/.test(lower)) {
    rawPatch.replaceAllBaselineSlots = true;
    rawPatch.baselineSlots = [
      {
        label: 'PR Review & Issue Triage',
        blocksTarget: 1,
        isMechanicalRecall: false,
        supportsEarlyClearance: true,
        startupStep5m: 'Open top PR diff and leave first concrete review comment.',
        cognitiveDemand: 'LIGHT_ADMIN',
      },
      {
        label: 'Architecture Docs / Spec Reading',
        blocksTarget: 1,
        isMechanicalRecall: false,
        supportsEarlyClearance: false,
        startupStep5m: 'Open RFC or technical doc and write 3 bullet takeaways.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
      },
    ];
    summaryParts.push('2-block engineering baseline');
  }

  // 4. Deliverable Weight Templates based on Persona
  if (isDesigner) {
    rawPatch.taskWeightTemplates = {
      heavyLabel: 'Client Design Milestone / High-Fi Flow',
      heavyBlocks: 8,
      mediumLabel: 'Component Exploration / Prototype',
      mediumBlocks: 4,
      quickLabel: 'Asset Export / Revision Pass',
      quickBlocks: 2,
    };
  } else if (isEngineer) {
    rawPatch.taskWeightTemplates = {
      heavyLabel: 'Feature Implementation + Tests',
      heavyBlocks: 8,
      mediumLabel: 'Bugfix / Refactor PR',
      mediumBlocks: 4,
      quickLabel: 'Config / Hotfix Patch',
      quickBlocks: 2,
    };
  } else if (isWriter) {
    rawPatch.taskWeightTemplates = {
      heavyLabel: 'Long-Form Chapter / Feature Draft',
      heavyBlocks: 8,
      mediumLabel: 'Essay / Revision Pass',
      mediumBlocks: 4,
      quickLabel: 'Outline / Pitch Memo',
      quickBlocks: 2,
    };
  }

  // 5. Evening Categories Extraction
  const eveningSeeds: ExtractedEveningChannelSeed[] = [];
  const topicPatterns: { regex: RegExp; seedKey: string }[] = [
    { regex: /\bsketch(?:ing)?\b|\bdrawing\b|\billustrat(?:ion|ing)\b|\bprocreate\b/i, seedKey: 'sketching' },
    { regex: /\bcozy\s+games?\b/i, seedKey: 'cozy games' },
    { regex: /\b(?:gaming|video\s+games?|rpg|baldur|steam\s+deck)\b/i, seedKey: 'gaming' },
    { regex: /\banime\b/i, seedKey: 'anime' },
    { regex: /\b(?:guitar|bass|piano|synth|music|ukulele)\b/i, seedKey: 'music' },
    { regex: /\b(?:reading|fiction|novels?|audiobooks?|books?)\b/i, seedKey: 'reading' },
    { regex: /\b(?:cooking|baking|tea|culinary)\b/i, seedKey: 'cooking' },
    { regex: /\b(?:3d\s*print|maker|hardware|knitting|woodworking|craft|lego)\b/i, seedKey: 'maker' },
    { regex: /\b(?:films?|movies?|cinema|comfort\s+shows?)\b/i, seedKey: 'cinema' },
    { regex: /\b(?:japanese|italian|spanish|french|language)\b/i, seedKey: 'language' },
  ];

  // Also parse explicit "around X, Y, and Z" list if present
  const aroundMatch = text.match(
    /(?:evening|recharge|slots?|channels?|hobbies)\s+(?:around|to|for|with|like)\s+([^.;]+)/i
  );
  if (aroundMatch) {
    const rawParts = aroundMatch[1]
      .split(/,|(?:\s+and\s+)|(?:\s*&\s*)/i)
      .map((s) => s.replace(/\b(hide\s+clutter|shorter\s+blocks|keep\s+.*)\b/gi, '').trim())
      .filter((s) => s.length >= 2 && s.length <= 40);
    for (const part of rawParts) {
      if (isSocialOrLiveEveningEntry(part)) {
        // Let validateAndClampConfigPatch catch & route it with an explicit note!
        eveningSeeds.push({
          name: part,
          icon: 'sparkles',
          mode: 'fluid',
          activeTitle: part,
          startupStep5m: `Start ${part}`,
        });
      } else {
        const seed = buildEveningSeedForTopic(part);
        if (
          seed &&
          !eveningSeeds.some((e) => e.name.toLowerCase() === seed.name.toLowerCase())
        ) {
          eveningSeeds.push(seed);
        }
      }
    }
  }

  for (const tp of topicPatterns) {
    if (tp.regex.test(lower)) {
      if (tp.seedKey === 'gaming' && eveningSeeds.some((s) => s.icon === 'gamepad')) {
        continue;
      }
      const seed = buildEveningSeedForTopic(tp.seedKey);
      if (
        seed &&
        !eveningSeeds.some((e) => e.name.toLowerCase() === seed.name.toLowerCase())
      ) {
        eveningSeeds.push(seed);
      }
    }
  }

  const wantsDeclutter = schedulePrefs.layoutMode === 'widget';
  if (eveningSeeds.length > 0) {
    const builtCategories: EveningCategoryPatch[] = eveningSeeds
      .slice(0, 6)
      .map((seed, idx) => ({
        slotNumber: idx + 1,
        name: seed.name,
        icon: seed.icon,
        mode: seed.mode,
        tripleTrack: seed.tripleTrack,
        activeTitle: seed.activeTitle,
        startupStep5m: seed.startupStep5m,
        hidden: false,
        subTracks: seed.subTracks,
      }));

    // If user asked to hide clutter and specified <= 4 evening slots, hide unused trailing slots 4..6
    if (wantsDeclutter && builtCategories.length < 6) {
      const existingCards = getEffectiveEveningCategoryCards(currentState.recharge);
      for (let slot = builtCategories.length + 1; slot <= Math.min(6, existingCards.length); slot++) {
        const ex = existingCards[slot - 1];
        if (ex) {
          builtCategories.push({
            id: ex.id,
            slotNumber: slot,
            name: ex.categoryName,
            icon: ex.icon || normalizeIconName(undefined, ex.categoryName),
            mode: ex.behavior === 'STICKY' ? 'sticky' : 'fluid',
            tripleTrack: ex.trackMode === 'TRIPLE',
            activeTitle: ex.activeTitle,
            startupStep5m: ex.startupPrompt || ex.startupStep || '5m low-friction start.',
            hidden: true,
          });
        }
      }
    }

    rawPatch.eveningCategories = builtCategories;
    summaryParts.push(
      `Evening channels (${eveningSeeds
        .filter((s) => !isSocialOrLiveEveningEntry(s.name))
        .map((s) => s.name)
        .join(', ')})`
    );
  }

  // 6. House Roadmap Tracks based on Persona
  if (isDesigner) {
    rawPatch.houseTracks = {
      ...(rawPatch.houseTracks || {}),
      tracks: [
        {
          trackId: 'science',
          title: 'Major Track 1: Client Design & Product Systems',
          isSandbox: false,
          inputWeeklyTarget: 4,
          outputWeeklyTarget: 8,
        },
        {
          trackId: 'writing',
          title: 'Major Track 2: Case Studies & Portfolio Publishing',
          isSandbox: false,
          inputWeeklyTarget: 2,
          outputWeeklyTarget: 4,
        },
        {
          trackId: 'coding',
          title: 'Sandbox Track 1: Interactive Prototypes & Creative Coding',
          isSandbox: true,
        },
        {
          trackId: 'music',
          title: 'Sandbox Track 2: Sketchbooks & Illustration Studies',
          isSandbox: true,
        },
      ],
    };
  } else if (isEngineer) {
    rawPatch.houseTracks = {
      ...(rawPatch.houseTracks || {}),
      tracks: [
        {
          trackId: 'science',
          title: 'Major Track 1: Core Systems & Production Engineering',
          isSandbox: false,
          inputWeeklyTarget: 4,
          outputWeeklyTarget: 10,
        },
        {
          trackId: 'writing',
          title: 'Major Track 2: Technical Writing & Design Docs',
          isSandbox: false,
          inputWeeklyTarget: 2,
          outputWeeklyTarget: 3,
        },
        {
          trackId: 'coding',
          title: 'Sandbox Track 1: Open-Source & Hardware Experiments',
          isSandbox: true,
        },
      ],
    };
  }

  // 7. UI Terminology Overrides
  const termOverrides: UiTerminologyOverrides = {};
  if (/\brename\b.*\bcruise\b/i.test(text) || isAdhdOrLowFriction) {
    if (isAdhdOrLowFriction) {
      termOverrides.cruiseLabel = 'Steady Pace';
      termOverrides.surgeLabel = 'Deep Sprint';
      termOverrides.taperLabel = 'Light Recovery';
      termOverrides.baselineFloorLabel = 'Daily Warmup Floor';
    }
  }
  const renameFloorMatch = text.match(
    /rename\s+(?:the\s+)?baseline(?:\s+floor)?\s+to\s+["']?([^"',.;]+)["']?/i
  );
  if (renameFloorMatch) {
    termOverrides.baselineFloorLabel = renameFloorMatch[1].trim();
  }
  const renameCruiseMatch = text.match(
    /rename\s+cruise(?:\s+mode)?\s+to\s+["']?([^"',.;]+)["']?/i
  );
  if (renameCruiseMatch) {
    termOverrides.cruiseLabel = renameCruiseMatch[1].trim();
  }
  if (Object.keys(termOverrides).length > 0) {
    rawPatch.uiTerminologyOverrides = termOverrides;
    summaryParts.push('custom UI labels');
  }

  // Run deterministic guardrail validator
  const { validatedPatch, guardrailNotes } = validateAndClampConfigPatch(
    rawPatch,
    currentState,
    text
  );

  // Build Contextual Clarifying Option Chips (2–3 options)
  if (validatedPatch.schedulePrefs?.blockCadence === '15m') {
    clarifyingOptions.push(
      {
        id: 'opt_lock_strict',
        label: 'Option A: Keep Strict #1 Project Lock',
        prompt: 'Keep Strict Focus #1 Lock so 100% of project blocks stay on my #1 deliverable.',
      },
      {
        id: 'opt_lock_dual',
        label: 'Option B: Enable Dual-Slot (#1 + #2)',
        prompt: 'Switch Closed List to Dual-Slot mode so I can alternate between Client Work (#1) and Personal Project (#2).',
      },
      {
        id: 'opt_gentle_evening',
        label: 'Option C: Gentle Evening Check-Ins (40m)',
        prompt: 'Set Evening Pulse Sensitivity to Gentle (40m check-in + 60m mandatory break).',
      }
    );
  } else {
    clarifyingOptions.push(
      {
        id: 'opt_15m_cadence',
        label: 'Option A: Shorter 15m Blocks (3m Startup)',
        prompt: 'Switch my work block cadence to 15m (3m Startup + 12m Momentum).',
      },
      {
        id: 'opt_widget_layout',
        label: 'Option B: Minimal Widget Layout',
        prompt: 'Switch to the compact Widget layout mode to hide visual clutter.',
      },
      {
        id: 'opt_zero_admin',
        label: 'Option C: Cap Daily Baseline at 1 Block',
        prompt: 'Keep daily admin baseline to 1 block with Early Clearance enabled.',
      }
    );
  }

  // Fallback default tweak if user typed a generic greeting / vague message
  const diffProbe = computeConfigDiffItems(currentState, validatedPatch);
  let reply: string;
  if (diffProbe.length === 0 && guardrailNotes.length === 0) {
    reply =
      'Describe your daily work style, preferred block length (15m / 20m / 25m), baseline habits (0–8 blocks), or evening hobbies, or pick one of the options below to preview live changes.';
  } else if (diffProbe.length === 0 && guardrailNotes.length > 0) {
    reply = `Preserved core state-machine invariants while reviewing your request. ${guardrailNotes[0]}`;
  } else {
    const summaryStr =
      summaryParts.length > 0
        ? summaryParts.join(', ')
        : `${diffProbe.length} workspace setting${diffProbe.length === 1 ? '' : 's'}`;
    reply = `Prepared ${summaryStr} in the Diff Preview below.${
      guardrailNotes.length > 0
        ? ' One or more requests were adjusted to preserve core pacing guardrails.'
        : ' Uncheck any individual row you want to skip before applying.'
    }`;
  }

  return {
    reply,
    clarifyingOptions: clarifyingOptions.slice(0, 3),
    configPatch: validatedPatch,
    guardrailNotes,
    executionTier: 'LOCAL_COMPILER',
  };
}

// ============================================================================
// 8. UNIFIED 3-TIER CONVERSATIONAL EXECUTION (`runConversationalArchitectTurn`)
// ============================================================================

function parseJsonTurnResponse(
  rawJsonText: string,
  currentState: SymmetryState,
  userPrompt: string,
  tier: ArchitectExecutionTier
): ArchitectTurnResponse {
  const cleaned = rawJsonText
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const parsed = JSON.parse(cleaned) as Record<string, unknown>;

  // Support either full ArchitectTurnResponse OR direct WorkspaceConfigPatch JSON
  const isTurnWrapper =
    typeof parsed.reply === 'string' ||
    (parsed.configPatch && typeof parsed.configPatch === 'object');

  const rawConfigPatch = (
    isTurnWrapper ? parsed.configPatch : parsed
  ) as WorkspaceConfigPatch;

  const rawNotes = Array.isArray(parsed.guardrailNotes)
    ? parsed.guardrailNotes.map((n) => String(n))
    : [];

  const { validatedPatch, guardrailNotes } = validateAndClampConfigPatch(
    rawConfigPatch,
    currentState,
    userPrompt,
    rawNotes
  );

  const rawOptions = Array.isArray(parsed.clarifyingOptions)
    ? parsed.clarifyingOptions
    : [];
  const clarifyingOptions: ArchitectClarifyingOption[] = rawOptions
    .slice(0, 3)
    .map((opt: unknown, idx: number) => {
      if (typeof opt === 'string') {
        return { id: `opt_${idx}`, label: opt, prompt: opt };
      }
      const o = (opt || {}) as Record<string, unknown>;
      const label = String(o.label || `Option ${String.fromCharCode(65 + idx)}`);
      return {
        id: String(o.id || `opt_${idx}`),
        label,
        prompt: String(o.prompt || label),
      };
    });

  const reply =
    typeof parsed.reply === 'string' && parsed.reply.trim()
      ? parsed.reply.trim()
      : 'Prepared your workspace configuration diff below. Review individual items and click Apply Changes.';

  return {
    reply,
    clarifyingOptions,
    configPatch: validatedPatch,
    guardrailNotes,
    executionTier: tier,
  };
}

/**
 * Parses an externally pasted JSON string (e.g., from `"Copy Setup Prompt for Gemini Chat"`)
 * into a validated `ArchitectTurnResponse`.
 */
export function parseExternalArchitectJson(
  rawText: string,
  currentState: SymmetryState
): ArchitectTurnResponse {
  return parseJsonTurnResponse(rawText, currentState, '', 'GEMINI_FLASH');
}

/**
 * 3-Tier Conversational Execution Engine:
 * Tier 1: `gemini-2.5-flash` with `responseMimeType: "application/json"` + `responseSchema`
 * Tier 2: Chrome Built-In `LanguageModel` API (`initialPrompts`, `expectedOutputs`, JSON Schema `responseConstraint`)
 * Tier 3: Deterministic Local Natural-Language Intent & Keyword Compiler
 */
export async function runConversationalArchitectTurn(
  userMessage: string,
  history: ArchitectChatMessage[],
  currentState: SymmetryState
): Promise<ArchitectTurnResponse> {
  const trimmed = userMessage.trim();
  const stateSummary = buildWorkspaceSummaryContext(currentState);

  // --- TIER 1: Gemini 2.5 Flash Structured JSON Output ---
  if (hasActiveGeminiAccess()) {
    try {
      const contents = [
        ...history.slice(-8).map((msg) => ({
          role: msg.role === 'assistant' ? ('model' as const) : ('user' as const),
          parts: [{ text: msg.content }],
        })),
        {
          role: 'user' as const,
          parts: [
            {
              text: `Current Workspace:\n${stateSummary}\n\nUser Request:\n${trimmed}`,
            },
          ],
        },
      ];

      const res = await callGemini({
        model: 'gemini-2.5-flash',
        systemInstruction: {
          parts: [{ text: ARCHITECT_SYSTEM_INSTRUCTION }],
        },
        contents,
        generationConfig: {
          temperature: 0.25,
          responseMimeType: 'application/json',
          responseSchema: GEMINI_ARCHITECT_RESPONSE_SCHEMA,
        },
      });

      if (res.ok && res.text) {
        return parseJsonTurnResponse(
          res.text,
          currentState,
          trimmed,
          'GEMINI_FLASH'
        );
      }
    } catch {
      // Fall through seamlessly to Tier 2 / Tier 3
    }
  }

  // --- TIER 2: Chrome Built-In On-Device `LanguageModel` API ---
  const chromeLm = getChromeLanguageModelNamespace();
  if (chromeLm) {
    try {
      const available = await probeChromeBuiltInAiAvailability();
      if (available) {
        const session = await chromeLm.create({
          initialPrompts: [
            {
              role: 'system',
              content: `${ARCHITECT_SYSTEM_INSTRUCTION}\n\nCurrent Workspace:\n${stateSummary}`,
            },
          ],
          expectedOutputs: [{ type: 'text', languages: ['en'] }],
        });
        try {
          const historyTranscript = history
            .slice(-4)
            .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
            .join('\n');
          const promptPayload = historyTranscript
            ? `${historyTranscript}\nUSER: ${trimmed}\nRespond strictly with valid JSON.`
            : `${trimmed}\nRespond strictly with valid JSON.`;
          const rawOutput = await session.prompt(promptPayload, {
            responseConstraint: ARCHITECT_TURN_RESPONSE_JSON_SCHEMA,
          });
          if (rawOutput) {
            return parseJsonTurnResponse(
              rawOutput,
              currentState,
              trimmed,
              'CHROME_BUILTIN_AI'
            );
          }
        } finally {
          session.destroy?.();
        }
      }
    } catch {
      // Fall through seamlessly to Tier 3 Local Intent Compiler
    }
  }

  // --- TIER 3: Rich Local Natural-Language Intent & Keyword Compiler ---
  return compileNaturalLanguageToConfigPatch(trimmed, currentState);
}

/**
 * Checks whether an arbitrary parsed JSON object looks like a `WorkspaceConfigPatch`
 * or `ArchitectTurnResponse` (used by `geminiImporter.ts` for `Cmd/Ctrl + Shift + V`).
 */
export function isWorkspaceArchitectJsonPayload(
  obj: Record<string, unknown> | null | undefined
): boolean {
  if (!obj || typeof obj !== 'object') return false;
  if (obj.configPatch && typeof obj.configPatch === 'object') return true;
  return Boolean(
    obj.schedulePrefs ||
      obj.presetMeta ||
      obj.taskWeightTemplates ||
      obj.breakMenuLabels ||
      obj.houseTracks ||
      obj.uiTerminologyOverrides ||
      (Array.isArray(obj.baselineSlots) &&
        obj.baselineSlots.length > 0 &&
        typeof (obj.baselineSlots[0] as Record<string, unknown>)?.startupStep5m ===
          'string')
  );
}
