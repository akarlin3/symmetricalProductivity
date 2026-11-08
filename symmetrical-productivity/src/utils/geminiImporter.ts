import {
  BaselineBlock,
  BaselineCategory,
  FixedEventType,
  LoadMode,
  PipelineDay,
  ProjectItem,
  ProjectPresetType,
  SmartIntakePlanResult,
  StickyKey,
  SymmetryState,
  TrackId,
} from '../types/symmetry';
import {
  DEFAULT_SYMMETRY_STATE,
  parseFromStateInput,
  syncTodayIntoDailyHistory,
  validateAndRestoreStateSnapshot,
} from '../state/defaultState';
import { applySmartIntakePlanToState } from './smartIntakePlanner';

export type GeminiDetectedFormat =
  | 'FORMAT_A_JSON_SYNC'
  | 'FORMAT_B_STATE_MD'
  | 'FORMAT_C_CONVERSATIONAL_PLAN';

export interface GeminiDetectedHighlights {
  loadModeLabel?: string;
  pipelineDaysUpdated?: number;
  focusSlot1Title?: string;
  sequentialChecklistSteps?: number;
  rechargeCategoriesUpdated?: number;
  roadmapTracksUpdated?: number;
}

export interface GeminiStatePatchResult {
  detectedFormat: GeminiDetectedFormat;
  formatLabel: string;
  nextState: SymmetryState;
  statePatch: Partial<SymmetryState>;
  appliedChanges: string[];
  diffSummaryBanner: string;
  detectedHighlights: GeminiDetectedHighlights;
}

/**
 * URL-safe Base64 encoding for `?geminiSync=<base64>` deep links.
 */
export function encodeGeminiSyncPayloadToBase64Url(payload: string): string {
  const utf8Bytes = new TextEncoder().encode(payload);
  let binary = '';
  for (let i = 0; i < utf8Bytes.length; i++) {
    binary += String.fromCharCode(utf8Bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a URL-safe Base64 `?geminiSync=<base64>` or `#geminiSync=<base64>` string back to UTF-8 text.
 */
export function decodeGeminiSyncBase64Url(encoded: string): string {
  const trimmed = decodeURIComponent(encoded.trim());
  const normalized = trimmed.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Inspects window.location for `?geminiSync=` or `#geminiSync=` on initial load.
 */
export function extractGeminiSyncParamFromLocation(): {
  rawParam: string;
  decodedText: string;
  cleanUrl: string;
} | null {
  if (typeof window === 'undefined') return null;
  try {
    const url = new URL(window.location.href);
    let rawParam = url.searchParams.get('geminiSync');
    let fromSearch = false;

    if (rawParam) {
      fromSearch = true;
    } else if (url.hash) {
      const hashContent = url.hash.replace(/^#\/?/, '');
      const hashParams = new URLSearchParams(hashContent);
      rawParam = hashParams.get('geminiSync');
    }

    if (!rawParam) return null;

    const decodedText = decodeGeminiSyncBase64Url(rawParam);

    if (fromSearch) {
      url.searchParams.delete('geminiSync');
    }
    let cleanHash = url.hash;
    if (cleanHash && cleanHash.includes('geminiSync=')) {
      const hashRaw = cleanHash.replace(/^#/, '');
      const hp = new URLSearchParams(hashRaw);
      hp.delete('geminiSync');
      const remainingHash = hp.toString();
      cleanHash = remainingHash ? `#${remainingHash}` : '';
    }
    const nextSearch = url.searchParams.toString();
    const cleanUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ''}${cleanHash}`;

    return {
      rawParam,
      decodedText,
      cleanUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Builds a shareable `?geminiSync=<base64>` deep-link URL for the current origin.
 */
export function buildGeminiSyncDeepLinkUrl(payloadText: string): string {
  const encoded = encodeGeminiSyncPayloadToBase64Url(payloadText);
  if (typeof window === 'undefined') {
    return `https://symmetrical.app/?geminiSync=${encoded}`;
  }
  const url = new URL(window.location.href);
  url.searchParams.set('geminiSync', encoded);
  return url.toString();
}

function formatModeBannerName(mode: LoadMode, cruisePlus?: boolean): string {
  if (mode === 'SURGE') return 'Surge Mode';
  if (mode === 'TAPER') return 'Taper / Lab Mode';
  return cruisePlus ? 'Cruise+ Mode' : 'Cruise Mode';
}

function normalizeLoadModeToken(raw: string): {
  mode: LoadMode;
  cruisePlus: boolean;
  canonicalTag: 'CRUISE' | 'SURGE' | 'TAPER_LAB';
} | null {
  const upper = raw.toUpperCase();
  if (
    upper.includes('TIER 2 SURGE') ||
    upper.includes('TIER 2: SURGE') ||
    /\bSURGE\b/.test(upper)
  ) {
    return { mode: 'SURGE', cruisePlus: false, canonicalTag: 'SURGE' };
  }
  if (
    upper.includes('TIER 3 TAPER') ||
    upper.includes('TIER 3: TAPER') ||
    upper.includes('TAPER/LAB') ||
    upper.includes('TAPER / LAB') ||
    upper.includes('TAPER_LAB') ||
    /\bTAPER\b/.test(upper)
  ) {
    return { mode: 'TAPER', cruisePlus: false, canonicalTag: 'TAPER_LAB' };
  }
  if (
    upper.includes('TIER 1 CRUISE') ||
    upper.includes('TIER 1: CRUISE') ||
    /\bCRUISE\+?\b/.test(upper)
  ) {
    return {
      mode: 'CRUISE',
      cruisePlus: /CRUISE\+/.test(upper),
      canonicalTag: 'CRUISE',
    };
  }
  return null;
}

function buildDiffSummaryBanner(
  highlights: GeminiDetectedHighlights,
  appliedChanges: string[]
): string {
  const parts: string[] = [];
  if (highlights.loadModeLabel) {
    parts.push(highlights.loadModeLabel);
  }
  if (highlights.pipelineDaysUpdated && highlights.pipelineDaysUpdated > 0) {
    parts.push('7-Day Pipeline updated');
  }
  if (highlights.focusSlot1Title) {
    parts.push(`Focus #1 set to '${highlights.focusSlot1Title}'`);
  }
  if (
    highlights.sequentialChecklistSteps &&
    highlights.sequentialChecklistSteps > 0 &&
    parts.length < 3
  ) {
    parts.push(`${highlights.sequentialChecklistSteps} Sequential Checklist blocks synced`);
  }
  if (
    highlights.rechargeCategoriesUpdated &&
    highlights.rechargeCategoriesUpdated > 0 &&
    parts.length < 3
  ) {
    parts.push(`${highlights.rechargeCategoriesUpdated} Evening Recharge slots updated`);
  }
  if (
    highlights.roadmapTracksUpdated &&
    highlights.roadmapTracksUpdated > 0 &&
    parts.length < 3
  ) {
    parts.push('4-Rung Roadmap updated');
  }

  if (parts.length === 0 && appliedChanges.length > 0) {
    parts.push(...appliedChanges.slice(0, 3));
  }

  const joined = parts.length > 0 ? parts.join(', ') : 'State updates ready';
  return `Detected from Gemini: ${joined} — Apply?`;
}

/**
 * Universal Multi-Format Parser (`parseGeminiResponseToStatePatch(rawText, currentState)`):
 * Allows the user to paste ANY text copied from a Gemini chat response and automatically
 * extracts and merges updates into `SymmetryState` (`AppState`) across 3 formats:
 *
 * - Format A — Embedded JSON / Sync Block (```json ... ``` or ```symmetrical-sync ... ``` or raw JSON)
 * - Format B — `state.md` Markdown Document (`# Part I`, `# Part II`, `# Part III`)
 * - Format C — Conversational Gemini Daily/Weekly Plan (Markdown 7-Day tables, `[20m | ... work left]` checklists, `5-Minute Ignition` / `5m Startup`, `Tier 1 Cruise` / `Tier 2 Surge` / `Tier 3 Taper/Lab`)
 */
export function parseGeminiResponseToStatePatch(
  rawText: string,
  currentState: SymmetryState = DEFAULT_SYMMETRY_STATE
): GeminiStatePatchResult {
  const trimmed = rawText.trim();
  if (!trimmed) {
    throw new Error('Paste a response from Gemini to parse and import.');
  }

  const workingState: SymmetryState = JSON.parse(JSON.stringify(currentState));
  const appliedChanges: string[] = [];
  const highlights: GeminiDetectedHighlights = {};

  // ============================================================================
  // FORMAT A: Embedded JSON / Sync Block (```symmetrical-sync ... ``` or ```json ... ``` or raw JSON)
  // ============================================================================
  const syncBlockFenceMatch = trimmed.match(
    /```(?:symmetrical-sync|json)\s*([\s\S]*?)```/i
  );
  const rawJsonCandidate = syncBlockFenceMatch
    ? syncBlockFenceMatch[1].trim()
    : trimmed.startsWith('{') && trimmed.endsWith('}')
    ? trimmed
    : null;

  if (rawJsonCandidate) {
    try {
      const parsedJson = JSON.parse(rawJsonCandidate) as Record<string, unknown>;
      if (parsedJson && typeof parsedJson === 'object') {
        // Case A1: SmartIntakePlanResult JSON schema
        if (
          typeof parsedJson.todayLoadMode === 'string' &&
          Array.isArray(parsedJson.closedListUpdates)
        ) {
          const plan = parsedJson as unknown as SmartIntakePlanResult;
          const next = applySmartIntakePlanToState(workingState, plan);
          const modeInfo = normalizeLoadModeToken(plan.todayLoadMode);
          const modeLabel = modeInfo
            ? formatModeBannerName(modeInfo.mode, modeInfo.cruisePlus)
            : `${plan.todayLoadMode} Mode`;
          highlights.loadModeLabel = modeLabel;
          if (plan.sevenDayPipeline && plan.sevenDayPipeline.length > 0) {
            highlights.pipelineDaysUpdated = plan.sevenDayPipeline.length;
          }
          if (next.projectQueue[0]?.title) {
            highlights.focusSlot1Title = next.projectQueue[0].title;
          }
          appliedChanges.push(
            `Load Mode → ${modeLabel}`,
            `7-Day Pipeline updated (${plan.sevenDayPipeline?.length || 7} days)`,
            `Focus #1 → "${next.projectQueue[0]?.title || 'Primary Project'}"`
          );
          const syncedNext: SymmetryState = {
            ...next,
            dailyHistory: syncTodayIntoDailyHistory(next),
          };
          return {
            detectedFormat: 'FORMAT_A_JSON_SYNC',
            formatLabel: 'Format A — Embedded JSON / Sync Block (Smart Intake Schema)',
            nextState: syncedNext,
            statePatch: syncedNext,
            appliedChanges,
            diffSummaryBanner: buildDiffSummaryBanner(highlights, appliedChanges),
            detectedHighlights: highlights,
          };
        }

        // Case A2: Full or Partial AppState / SymmetryState JSON patch
        const mergedCandidate: Record<string, unknown> = {
          ...workingState,
          ...parsedJson,
        };

        // Support alias keys `sevenDayPipeline` -> `pipelineDays` and `activeQueue` -> `projectQueue`
        if (
          Array.isArray(parsedJson.sevenDayPipeline) &&
          !Array.isArray(parsedJson.pipelineDays)
        ) {
          mergedCandidate.pipelineDays = workingState.pipelineDays.map(
            (existingDay, idx) => {
              const patchDay = (
                parsedJson.sevenDayPipeline as Record<string, unknown>[]
              )[idx];
              if (!patchDay || typeof patchDay !== 'object') return existingDay;
              const rawModeStr = String(
                patchDay.loadMode || patchDay.mode || existingDay.loadMode
              );
              const modeNormalized = normalizeLoadModeToken(rawModeStr);
              return {
                ...existingDay,
                ...patchDay,
                dayLabel: String(
                  patchDay.dayLabel || patchDay.day || existingDay.dayLabel
                ),
                loadMode: modeNormalized
                  ? modeNormalized.mode
                  : existingDay.loadMode,
                cruisePlus: modeNormalized
                  ? modeNormalized.cruisePlus
                  : Boolean(patchDay.cruisePlus ?? existingDay.cruisePlus),
              };
            }
          );
          highlights.pipelineDaysUpdated = (
            parsedJson.sevenDayPipeline as unknown[]
          ).length;
          appliedChanges.push(
            `Updated 7-Day Pipeline (${highlights.pipelineDaysUpdated} days)`
          );
        }

        if (
          Array.isArray(parsedJson.activeQueue) &&
          !Array.isArray(parsedJson.projectQueue)
        ) {
          mergedCandidate.projectQueue = (
            parsedJson.activeQueue as Record<string, unknown>[]
          )
            .slice(0, 3)
            .map((item, idx) => {
              const slotNum = ((idx + 1) as 1 | 2 | 3);
              const existing = workingState.projectQueue[idx];
              return {
                id: String(item.id || existing?.id || `proj_${slotNum}`),
                slot: slotNum,
                title: String(item.title || existing?.title || `Item #${slotNum}`),
                presetType: (item.presetType ||
                  existing?.presetType ||
                  'PAPER_8') as ProjectPresetType,
                completedBlocks: Number(
                  item.completedBlocks ?? existing?.completedBlocks ?? 0
                ),
                totalBlocks: Number(item.totalBlocks ?? existing?.totalBlocks ?? 8),
                trackId: (item.trackId ||
                  existing?.trackId ||
                  'science') as TrackId,
                startupStep: String(
                  item.startupStep ||
                    existing?.startupStep ||
                    'Complete first 5m startup step.'
                ),
                nextStepNote: String(
                  item.nextStepNote ||
                    existing?.nextStepNote ||
                    'Primary focus target.'
                ),
              };
            });
        }

        if (typeof parsedJson.loadMode === 'string') {
          const norm = normalizeLoadModeToken(parsedJson.loadMode);
          if (norm) {
            mergedCandidate.loadMode = norm.mode;
            if (norm.cruisePlus) mergedCandidate.cruisePlus = true;
            highlights.loadModeLabel = formatModeBannerName(
              norm.mode,
              Boolean(mergedCandidate.cruisePlus)
            );
            appliedChanges.push(`Load Mode → ${highlights.loadModeLabel}`);
          }
        }

        const restored = validateAndRestoreStateSnapshot(
          JSON.stringify(mergedCandidate)
        );
        if (Array.isArray(parsedJson.pipelineDays)) {
          highlights.pipelineDaysUpdated = restored.pipelineDays.length;
          appliedChanges.push(
            `Updated 7-Day Pipeline (${restored.pipelineDays.length} days)`
          );
        }
        if (
          Array.isArray(parsedJson.projectQueue) ||
          Array.isArray(parsedJson.activeQueue)
        ) {
          if (restored.projectQueue[0]?.title) {
            highlights.focusSlot1Title = restored.projectQueue[0].title;
            appliedChanges.push(
              `Focus #1 set to "${restored.projectQueue[0].title}"`
            );
          }
        }
        if (!highlights.loadModeLabel) {
          highlights.loadModeLabel = formatModeBannerName(
            restored.loadMode,
            restored.cruisePlus
          );
        }
        if (appliedChanges.length === 0) {
          appliedChanges.push(
            `Merged JSON state block (${Object.keys(parsedJson).length} keys)`
          );
        }

        const syncedRestored: SymmetryState = {
          ...restored,
          dailyHistory: syncTodayIntoDailyHistory(restored),
        };
        return {
          detectedFormat: 'FORMAT_A_JSON_SYNC',
          formatLabel: 'Format A — Embedded JSON / Sync Block',
          nextState: syncedRestored,
          statePatch: parsedJson as Partial<SymmetryState>,
          appliedChanges,
          diffSummaryBanner: buildDiffSummaryBanner(highlights, appliedChanges),
          detectedHighlights: highlights,
        };
      }
    } catch {
      // Fall through to Format B / Format C markdown & conversational parsing
    }
  }

  // Strip optional ```markdown ... ``` fence if Gemini wrapped its reply in a code fence
  const fenceMatch = trimmed.match(/```(?:markdown|md)?\s*([\s\S]*?)```/i);
  const mdText =
    fenceMatch &&
    (fenceMatch[1].includes('# Part I') ||
      fenceMatch[1].includes('| Day') ||
      fenceMatch[1].includes('[FOCUS #1]') ||
      fenceMatch[1].includes('work left]'))
      ? fenceMatch[1].trim()
      : trimmed;

  const isFormatBStateMd =
    /#\s*Part\s+I\b/i.test(mdText) ||
    /#\s*Part\s+II\b/i.test(mdText) ||
    /#\s*Part\s+III\b/i.test(mdText);

  let matchedAnyStructure = false;

  // If full 3-Part state.md is present, pre-populate via parseFromStateInput as baseline
  if (
    /#\s*Part\s+I\b/i.test(mdText) &&
    /#\s*Part\s+II\b/i.test(mdText) &&
    /#\s*Part\s+III\b/i.test(mdText)
  ) {
    try {
      const fullParsed = parseFromStateInput(mdText);
      Object.assign(workingState, fullParsed);
      matchedAnyStructure = true;
    } catch {
      // Continue with granular section extractors
    }
  }

  // ============================================================================
  // FORMAT B & FORMAT C: Load Mode, Tier 1/2/3, & Remaining Work Countdown
  // ============================================================================
  // Supports:
  // - `Active Load Mode: SURGE ... (14 total 20m blocks)`
  // - `Tier 1 Cruise` -> CRUISE, `Tier 2 Surge` -> SURGE, `Tier 3 Taper/Lab` -> TAPER_LAB (TAPER)
  // - `Mode: Cruise+ (13 blocks)`
  const explicitModeMatch =
    mdText.match(
      /Active Load Mode\*\*:\s*`?(CRUISE\+?|SURGE|TAPER(?:[\s/_-]*LAB)?)`?(?:[^\n]*?\((\d+)\s*(?:total\s*)?(?:20m\s*)?blocks?)?/i
    ) ||
    mdText.match(
      /\b(Tier\s*1\s*:?\s*Cruise\+?|Tier\s*2\s*:?\s*Surge|Tier\s*3\s*:?\s*Taper(?:\s*\/\s*Lab)?)\b(?:[^\n]*?\((\d+)\s*blocks?)?/i
    ) ||
    mdText.match(
      /(?:Today's\s+Load\s+Mode|Load\s+Mode|Recommended\s+Mode|Shift\s+Mode)\s*[:—-]\s*\*?\*?`?(Tier\s*1\s*Cruise\+?|Tier\s*2\s*Surge|Tier\s*3\s*Taper(?:\s*\/\s*Lab)?|Cruise\+?|Surge|Taper(?:\s*\/\s*Lab)?)`?\*?\*?(?:[^\n]*?\((\d+)\s*blocks?)?/i
    );

  if (explicitModeMatch) {
    const norm = normalizeLoadModeToken(explicitModeMatch[1]);
    if (norm) {
      workingState.loadMode = norm.mode;
      workingState.cruisePlus = norm.cruisePlus;
      if (explicitModeMatch[2]) {
        const parsedBlocks = Number(explicitModeMatch[2]);
        if (parsedBlocks >= 7 && parsedBlocks <= 18) {
          workingState.customModeBlockAdjustment = parsedBlocks;
        }
      } else {
        workingState.customModeBlockAdjustment =
          norm.mode === 'SURGE'
            ? 14
            : norm.mode === 'TAPER'
            ? 8
            : norm.cruisePlus
            ? 13
            : 12;
      }
      highlights.loadModeLabel = formatModeBannerName(
        workingState.loadMode,
        workingState.cruisePlus
      );
      matchedAnyStructure = true;
      appliedChanges.push(
        `Load Mode → ${highlights.loadModeLabel} (${
          workingState.customModeBlockAdjustment
        } blocks)`
      );
    }
  }

  // Parse Consecutive Surge Days (`Consecutive Surge Days: 1 / 2`)
  const surgeDaysMatch = mdText.match(
    /Consecutive Surge Days\*\*:\s*`?(\d+)\s*\/\s*2`?/i
  );
  if (surgeDaysMatch) {
    workingState.surgeConsecutiveDays = Math.min(
      2,
      Math.max(0, Number(surgeDaysMatch[1]))
    );
    matchedAnyStructure = true;
  }

  // Parse Bandwidth (`Current Bandwidth: Low | Steady | Sharp | High`)
  const bwMatch = mdText.match(
    /Current Bandwidth\*\*:\s*`?(Low|Steady|Sharp|High)`?/i
  );
  if (bwMatch) {
    const rawBw = bwMatch[1].toLowerCase();
    const bw: 'Low' | 'Steady' | 'Sharp' =
      rawBw === 'low' ? 'Low' : rawBw === 'steady' ? 'Steady' : 'Sharp';
    workingState.bandwidth = bw;
    workingState.energyBandwidth =
      bw === 'Low' ? 'LOW_FOGGY' : bw === 'Steady' ? 'STEADY' : 'SHARP';
    matchedAnyStructure = true;
  }

  // Parse Fixed Event Anchor
  const fixedMatch = mdText.match(
    /Fixed Event(?:\s*Anchor)?\*\*:\s*`?(NONE|LAB_2H|VOLUNTEER|EVENING_OUTING_6PM)`?/i
  );
  if (fixedMatch) {
    workingState.fixedEvent = fixedMatch[1].toUpperCase() as FixedEventType;
    matchedAnyStructure = true;
  }

  // ============================================================================
  // FORMAT B: Baseline Floor Progress (`X/Y` header summary & `- [x]` checkboxes)
  // ============================================================================
  const baselineSummaryRatioMatch = mdText.match(
    /Daily Core Baseline[^\n]*?`?\[?(\d+)\s*\/\s*(\d+)\s*(?:blocks?(?:\s*cleared)?)?\]?`?/i
  );

  const baselineLineRegex =
    /^-\s*\[([ xX])\]\s*\*\*([^*]+)\*\*\s*\(`(FLASHCARDS_ANATOMY|FLASHCARDS_COMP|READING|SYNTHESIS)`\)(?:\s*—\s*5m Startup:\s*\*([^*]+)\*)?(?:\s*`\[BANKED([^\]]*)\]`)?/gm;
  const baselineMatches = [...mdText.matchAll(baselineLineRegex)];

  if (baselineMatches.length > 0) {
    const updatedBaseline: BaselineBlock[] = [...workingState.baselineBlocks];
    let changedCount = 0;

    baselineMatches.forEach((m, idx) => {
      const completed = m[1].toLowerCase() === 'x';
      const title = m[2].trim();
      const category = m[3] as BaselineCategory;
      const startup = m[4]?.trim();
      const banked = Boolean(m[5]);

      const targetIdx = updatedBaseline.findIndex(
        (b, i) => i === idx || (b.category === category && b.title === title)
      );
      if (targetIdx >= 0) {
        const existing = updatedBaseline[targetIdx];
        if (
          existing.completed !== completed ||
          existing.bankedViaEarlyClearance !== banked ||
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
    const clearedCount = updatedBaseline.filter(
      (b) => b.completed || b.bankedViaEarlyClearance
    ).length;
    if (changedCount > 0 || isFormatBStateMd) {
      appliedChanges.push(
        `Baseline Floor progress (${clearedCount}/${updatedBaseline.length} blocks)`
      );
    }
  } else if (baselineSummaryRatioMatch) {
    const completedFloorCount = Math.max(0, Number(baselineSummaryRatioMatch[1]));
    const totalFloorCount = Math.max(1, Number(baselineSummaryRatioMatch[2]));
    workingState.baselineBlocks = workingState.baselineBlocks.map((b, idx) => ({
      ...b,
      completed: idx < completedFloorCount,
    }));
    matchedAnyStructure = true;
    appliedChanges.push(
      `Baseline Floor progress (${Math.min(
        completedFloorCount,
        workingState.baselineBlocks.length
      )}/${totalFloorCount} blocks)`
    );
  }

  // ============================================================================
  // FORMAT B: Closed List Items 1–3 (`[FOCUS #1]`) & Open List Backlog
  // ============================================================================
  const closedListItemRegex =
    /^([123])\.\s*\*\*(?:\[[^\]]+\]\s*)?([^*]+)\*\*\s*—\s*(?:Progress:\s*)?`?\[(\d+(?:\.\d+)?)\s*\/\s*(\d+)\s*blocks?\]`?(?:[^\n]*?Track:\s*`?(science|writing|personal|coding|music)`?)?(?:[^\n]*?5m Startup(?:\s*Step)?:\s*\*([^*\n]+)\*)?(?:\n\s*-\s*\*\*5m Startup Step\*\*:\s*\*([^*\n]+)\*)?(?:\n\s*-\s*\*\*Next-Step Note\*\*:\s*([^\n]+))?/gim;
  const closedMatches = [...mdText.matchAll(closedListItemRegex)];
  if (closedMatches.length > 0) {
    const newQueue: ProjectItem[] = [...workingState.projectQueue];

    for (const cm of closedMatches) {
      const slotNum = Number(cm[1]) as 1 | 2 | 3;
      const cleanTitle = cm[2].replace(/^\[FOCUS\s*#\d+\]\s*/i, '').trim();
      const completedBlocks = Math.max(0, Number(cm[3]) || 0);
      const totalBlocks = Math.max(1, Number(cm[4]) || 8);
      const rawTrack = (cm[5] || '').toLowerCase() as TrackId;
      const startupStep = (cm[6] || cm[7] || '').trim();
      const nextStepNote = (cm[8] || '').trim();

      const existingIdx = newQueue.findIndex((p) => p.slot === slotNum);
      const existing = newQueue[existingIdx];
      const trackId: TrackId = [
        'science',
        'writing',
        'personal',
        'coding',
        'music',
      ].includes(rawTrack)
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
    }

    workingState.projectQueue = newQueue
      .sort((a, b) => a.slot - b.slot)
      .slice(0, 3);
    if (workingState.projectQueue[0]) {
      highlights.focusSlot1Title = workingState.projectQueue[0].title;
      if (!workingState.timer.isRunning) {
        const p1 = workingState.projectQueue[0];
        workingState.timer = {
          ...workingState.timer,
          activeBlockSourceId: p1.id,
          activeTaskTitle: p1.title,
          activeTaskType: 'PROJECT',
          activeStartupPrompt: p1.startupStep,
        };
      }
    }
    matchedAnyStructure = true;
    appliedChanges.push(
      `Focus #1 set to "${workingState.projectQueue[0]?.title}" (${closedMatches.length} Closed List items)`
    );
  }

  // Open List Backlog (`- [Backlog #1] **Title** — `[0 / 8 blocks]` ...`)
  const backlogRegex =
    /^-\s*\[Backlog\s*#\d+\]\s*\*\*([^*]+)\*\*\s*—\s*(?:Progress:\s*)?`?\[(\d+)\s*\/\s*(\d+)\s*blocks?\]`?(?:[^\n]*?Track:\s*`?(science|writing|personal|coding|music)`?)?(?:[^\n]*?5m Startup(?:\s*Step)?:\s*\*([^*\n]+)\*)?/gim;
  const backlogMatches = [...mdText.matchAll(backlogRegex)];
  if (backlogMatches.length > 0) {
    const parsedBacklog: Omit<ProjectItem, 'slot'>[] = backlogMatches.map(
      (bm, i) => {
        const title = bm[1].trim();
        const completedBlocks = Math.max(0, Number(bm[2]) || 0);
        const totalBlocks = Math.max(1, Number(bm[3]) || 4);
        const rawTrack = (bm[4] || 'science').toLowerCase() as TrackId;
        const trackId: TrackId = [
          'science',
          'writing',
          'personal',
          'coding',
          'music',
        ].includes(rawTrack)
          ? rawTrack
          : 'science';
        const startupStep =
          bm[5]?.trim() || `Open "${title}" and complete first 5m startup step.`;
        const presetType: ProjectPresetType =
          totalBlocks === 8
            ? 'PAPER_8'
            : totalBlocks === 4
            ? 'SLIDES_4'
            : 'CUSTOM';
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
      }
    );
    workingState.projectBacklog = parsedBacklog;
    workingState.openListBacklog = parsedBacklog;
    matchedAnyStructure = true;
    appliedChanges.push(`Open List Backlog (${parsedBacklog.length} items)`);
  }

  // ============================================================================
  // FORMAT B & FORMAT C: 7-Day Master Pipeline Table (`Day | Mode & Fixed Anchors | Project Blocks | Exact Deliverables | Evening...`)
  // ============================================================================
  const allLines = mdText.split('\n').map((l) => l.trim());
  const tableBlocks: string[][] = [];
  let currentTable: string[] = [];
  for (const line of allLines) {
    if (line.startsWith('|') && line.endsWith('|')) {
      currentTable.push(line);
    } else if (currentTable.length > 0) {
      tableBlocks.push(currentTable);
      currentTable = [];
    }
  }
  if (currentTable.length > 0) {
    tableBlocks.push(currentTable);
  }

  for (const tLines of tableBlocks) {
    if (tLines.length < 3) continue;
    const headerCells = tLines[0]
      .split('|')
      .map((c) => c.trim().toLowerCase())
      .filter(Boolean);

    const is5ColMasterPipeline =
      headerCells.length >= 4 &&
      headerCells[0].includes('day') &&
      (headerCells[1].includes('mode') ||
        headerCells[1].includes('anchor') ||
        headerCells[2]?.includes('project') ||
        headerCells[3]?.includes('deliverable'));
    const is6ColLegacyPipeline =
      headerCells.length === 6 &&
      headerCells[0].includes('day') &&
      headerCells[1].includes('load mode');

    if (!is5ColMasterPipeline && !is6ColLegacyPipeline) continue;

    const dataRows = tLines
      .slice(2)
      .filter((line) => !/^\|[\s:-]+\|$/.test(line.replace(/\|/g, '|')));

    if (dataRows.length === 0) continue;

    let surgeStreak = 0;
    const updatedDays: PipelineDay[] = workingState.pipelineDays.map(
      (existingDay, idx) => {
        const rawRow = dataRows[idx];
        if (!rawRow) return existingDay;
        const cells = rawRow
          .split('|')
          .slice(1, -1)
          .map((c) => c.trim());

        if (is5ColMasterPipeline && cells.length >= 4) {
          const dayCol = cells[0] || existingDay.dayLabel;
          const modeAndAnchorsCol = cells[1] || '';
          const projectBlocksCol = cells[2] || '';
          const exactDeliverablesCol = cells[3] || '';
          const eveningBridgeCol = cells[4] || existingDay.eveningBridge || '';

          const normMode = normalizeLoadModeToken(modeAndAnchorsCol);
          let loadMode: LoadMode = normMode
            ? normMode.mode
            : existingDay.loadMode;
          const cruisePlus = normMode
            ? normMode.cruisePlus
            : /CRUISE\+/i.test(modeAndAnchorsCol);

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

          const blocksMatch = modeAndAnchorsCol.match(
            /\((\d+)\s*b(?:lks|locks)?/i
          );
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
            dayLabel: dayCol.replace(/\*\*/g, '').trim() || existingDay.dayLabel,
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
          const norm = normalizeLoadModeToken(modeCol);
          const loadMode: LoadMode = norm ? norm.mode : 'CRUISE';
          const cruisePlus = norm ? norm.cruisePlus : modeCol.includes('+');
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
            dayLabel: dayCol.replace(/\*\*/g, '').trim() || existingDay.dayLabel,
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
    if (day1 && !explicitModeMatch) {
      workingState.loadMode = day1.loadMode;
      workingState.cruisePlus = day1.cruisePlus;
      workingState.customModeBlockAdjustment = day1.baseTargetBlocks;
      workingState.fixedEvent = day1.fixedEvent;
      highlights.loadModeLabel = formatModeBannerName(
        day1.loadMode,
        day1.cruisePlus
      );
    }

    // Also check if Day 1 Exact Deliverables or Project Blocks column mentions a primary deliverable for Focus #1
    if (
      day1 &&
      !highlights.focusSlot1Title &&
      day1.deliverablesCompleted &&
      day1.deliverablesCompleted.length > 3
    ) {
      const cleanedDeliverable = day1.deliverablesCompleted
        .replace(/\*\*|`/g, '')
        .split(/[.;]/)[0]
        .trim();
      if (cleanedDeliverable && workingState.projectQueue[0]) {
        workingState.projectQueue = workingState.projectQueue.map((item, idx) =>
          idx === 0
            ? {
                ...item,
                nextStepNote: cleanedDeliverable,
              }
            : item
        );
      }
    }

    highlights.pipelineDaysUpdated = Math.min(7, dataRows.length);
    matchedAnyStructure = true;
    appliedChanges.push(
      `7-Day Pipeline updated (${highlights.pipelineDaysUpdated} days)`
    );
  }

  // ============================================================================
  // FORMAT C: Conversational Sequential Checklist Lines (`[20m | ... work left]` or `5-Minute Ignition` / `5m Startup`)
  // ============================================================================
  const checklistLineRegex =
    /^[-*\d.)\s]*\[(\d+)m\s*\|\s*([^\]]*?work\s+left)\]\s*(.+)$/gim;
  const checklistMatches = [...mdText.matchAll(checklistLineRegex)];

  // Also detect conversational `5-Minute Ignition` / `5m Startup` / `Focus #1` lines
  const ignitionPromptMatch =
    mdText.match(
      /(?:5-Minute\s+Ignition|5m\s+Startup(?:\s+Step)?|5m\s+Ignition)\s*[:—-]\s*\*?"?([^"\n*]+)"?\*?/i
    ) ||
    mdText.match(
      /\*\*5m\s+Startup(?:\s+Step)?\*\*\s*[:—-]\s*\*?"?([^"\n*]+)"?\*?/i
    );

  const conversationalFocusMatch =
    mdText.match(
      /(?:\[FOCUS\s*#1\]|Focus\s*#1|Closed\s+List\s*#1|Slot\s*#1|Item\s*#1)\s*[:—-]\s*\*\*([^*]+)\*\*(?:[^\n]*?\[(\d+)\s*\/\s*(\d+)\s*blocks?\])?/i
    ) ||
    mdText.match(
      /(?:\[FOCUS\s*#1\]|Focus\s*#1|Closed\s+List\s*#1)\s*[:—-]\s*"?([^"\n—|]+)"?/i
    );

  if (conversationalFocusMatch && !closedMatches.length) {
    const focusTitle = conversationalFocusMatch[1]
      .replace(/\*\*|`/g, '')
      .trim();
    const comp = conversationalFocusMatch[2]
      ? Number(conversationalFocusMatch[2])
      : workingState.projectQueue[0]?.completedBlocks ?? 0;
    const tot = conversationalFocusMatch[3]
      ? Number(conversationalFocusMatch[3])
      : workingState.projectQueue[0]?.totalBlocks ?? 8;

    if (focusTitle && workingState.projectQueue.length > 0) {
      const existing0 = workingState.projectQueue[0];
      const updated0: ProjectItem = {
        ...existing0,
        title: focusTitle,
        completedBlocks: Math.min(tot, comp),
        totalBlocks: tot,
        startupStep:
          ignitionPromptMatch?.[1]?.trim() || existing0.startupStep,
      };
      workingState.projectQueue = [
        updated0,
        ...workingState.projectQueue.slice(1),
      ];
      highlights.focusSlot1Title = focusTitle;
      matchedAnyStructure = true;
      appliedChanges.push(`Focus #1 set to "${focusTitle}"`);
    }
  }

  if (checklistMatches.length > 0) {
    let extractedFocusTitle: string | null = null;
    let extractedStartupStep: string | null =
      ignitionPromptMatch?.[1]?.trim() || null;
    let firstRemainingWorkStr: string | null = null;

    for (const cm of checklistMatches) {
      const remainingStr = cm[2].trim();
      const bodyText = cm[3].trim();
      if (!firstRemainingWorkStr) {
        firstRemainingWorkStr = remainingStr;
      }

      // Check if this line is a Focus #1 project block line
      const projMatch =
        bodyText.match(
          /(?:Closed\s+List\s*#1|Focus\s*#1|Project\s*#1)\s*[:—-]\s*\*\*([^*]+)\*\*/i
        ) ||
        bodyText.match(
          /(?:Closed\s+List\s*#1|Focus\s*#1|Project\s*#1)\s*[:—-]\s*([^—(\n]+)/i
        );
      if (projMatch && !extractedFocusTitle) {
        extractedFocusTitle = projMatch[1]
          .replace(/\(\s*Block\s*\d+[^)]*\)/i, '')
          .replace(/\*\*|`/g, '')
          .trim();
      }

      const inlineStartup = bodyText.match(
        /(?:5m\s+Startup|5-Minute\s+Ignition)\s*:\s*\*?([^*\n]+)\*?/i
      );
      if (inlineStartup && !extractedStartupStep) {
        extractedStartupStep = inlineStartup[1].trim();
      }
    }

    // Parse remaining work countdown from first sequential checklist line (e.g. `3h 40m work left` -> 11 blocks)
    if (firstRemainingWorkStr && !explicitModeMatch) {
      const hrMatch = firstRemainingWorkStr.match(/(\d+)\s*h/i);
      const minMatch = firstRemainingWorkStr.match(/(\d+)\s*m/i);
      const totalMins =
        (hrMatch ? Number(hrMatch[1]) * 60 : 0) +
        (minMatch ? Number(minMatch[1]) : 0);
      if (totalMins > 0) {
        const inferredBlocks = Math.round(totalMins / 20);
        if (inferredBlocks >= 7 && inferredBlocks <= 18) {
          workingState.customModeBlockAdjustment = inferredBlocks;
        }
      }
    }

    if (extractedFocusTitle && workingState.projectQueue.length > 0) {
      const existing0 = workingState.projectQueue[0];
      const updated0: ProjectItem = {
        ...existing0,
        title: extractedFocusTitle,
        startupStep: extractedStartupStep || existing0.startupStep,
      };
      workingState.projectQueue = [
        updated0,
        ...workingState.projectQueue.slice(1),
      ];
      highlights.focusSlot1Title = extractedFocusTitle;
    } else if (extractedStartupStep && workingState.projectQueue.length > 0) {
      workingState.projectQueue = [
        {
          ...workingState.projectQueue[0],
          startupStep: extractedStartupStep,
        },
        ...workingState.projectQueue.slice(1),
      ];
    }

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

    highlights.sequentialChecklistSteps = checklistMatches.length;
    matchedAnyStructure = true;
    appliedChanges.push(
      `Synced ${checklistMatches.length} Sequential Checklist [20m] steps`
    );
  } else if (ignitionPromptMatch && workingState.projectQueue.length > 0) {
    const stepText = ignitionPromptMatch[1].trim();
    const existing0 = workingState.projectQueue[0];
    workingState.projectQueue = [
      {
        ...existing0,
        startupStep: stepText,
      },
      ...workingState.projectQueue.slice(1),
    ];
    if (!workingState.timer.isRunning) {
      workingState.timer = {
        ...workingState.timer,
        activeStartupPrompt: stepText,
      };
    }
    matchedAnyStructure = true;
    appliedChanges.push(`Updated Focus #1 5m Startup Step → "${stepText}"`);
  }

  // ============================================================================
  // FORMAT B: Part II — Option 0 & Evening Recharge Active Titles and `[X / 3]` Sticky Counters
  // ============================================================================
  const opt0Match = mdText.match(/Option 0[\s\S]*?`?\[(\d+)\s*\/\s*2\]`?/i);
  if (opt0Match) {
    workingState.recharge.option0ConsecutiveWindows = Math.min(
      2,
      Math.max(0, Number(opt0Match[1]))
    );
    matchedAnyStructure = true;
  }

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
          queuedNext && queuedNext !== 'None'
            ? queuedNext
            : slot.queuedNextTitle,
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
          queuedNext && queuedNext !== 'None'
            ? queuedNext
            : slot.queuedNextTitle,
      };
      updatedRechargeCategories++;
    }
  }

  if (updatedRechargeCategories > 0) {
    highlights.rechargeCategoriesUpdated = updatedRechargeCategories;
    matchedAnyStructure = true;
    appliedChanges.push(
      `Evening Recharge titles & Sticky [X/3] counters (${updatedRechargeCategories} categories)`
    );
  }

  // ============================================================================
  // FORMAT B: Part III — 4-Rung Input/Output Counts
  // ============================================================================
  let updatedTracksCount = 0;
  workingState.roadmapTracks = workingState.roadmapTracks.map((track) => {
    const escapedName = track.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const trackRegex = new RegExp(
      `###\\s+(?:Track\\s+\\d+:\\s+)?${escapedName}[\\s\\S]*?Input\\s*\\(50%\\)\\*\\*:\\s*\`?(\\d+(?:\\.\\d+)?)\\s*blocks?\`?\\s*\\|\\s*\\*\\*Output\\s*\\(50%\\)\\*\\*:\\s*\`?(\\d+(?:\\.\\d+)?)\\s*blocks?\`?`,
      'i'
    );
    const tm = mdText.match(trackRegex);
    if (!tm) return track;
    updatedTracksCount++;
    return {
      ...track,
      inputBlocksCredited: Number(tm[1]),
      outputBlocksCredited: Number(tm[2]),
    };
  });

  if (updatedTracksCount > 0) {
    highlights.roadmapTracksUpdated = updatedTracksCount;
    matchedAnyStructure = true;
    appliedChanges.push(
      `4-Rung Roadmap Input/Output counts (${updatedTracksCount} tracks)`
    );
  }

  if (!matchedAnyStructure) {
    throw new Error(
      'Could not detect a JSON sync block, state.md headers, 7-Day Pipeline table, Sequential Checklist ([20m | ... work left]), or Load Mode in the pasted text.'
    );
  }

  if (!highlights.loadModeLabel) {
    highlights.loadModeLabel = formatModeBannerName(
      workingState.loadMode,
      workingState.cruisePlus
    );
  }
  if (!highlights.focusSlot1Title && workingState.projectQueue[0]?.title) {
    highlights.focusSlot1Title = workingState.projectQueue[0].title;
  }

  const detectedFormat: GeminiDetectedFormat = isFormatBStateMd
    ? 'FORMAT_B_STATE_MD'
    : 'FORMAT_C_CONVERSATIONAL_PLAN';

  const formatLabel = isFormatBStateMd
    ? 'Format B — 3-Part state.md Document'
    : 'Format C — Conversational Gemini Daily/Weekly Plan';

  const syncedState: SymmetryState = {
    ...workingState,
    dailyHistory: syncTodayIntoDailyHistory(workingState),
  };

  return {
    detectedFormat,
    formatLabel,
    nextState: syncedState,
    statePatch: syncedState,
    appliedChanges,
    diffSummaryBanner: buildDiffSummaryBanner(highlights, appliedChanges),
    detectedHighlights: highlights,
  };
}
