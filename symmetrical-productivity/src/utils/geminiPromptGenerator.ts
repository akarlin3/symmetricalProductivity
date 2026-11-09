import {
  DEFAULT_SYMMETRY_STATE,
  getBaselineSlotCompletedBlocks,
  getBaselineSlotTargetBlocks,
  getEffectiveEveningCategoryCards,
  isBaselineSlotEarlyClearanceEligible,
} from '../state/defaultState';
import {
  BaselineBlock,
  LoadMode,
  ProjectItem,
  ProjectPresetType,
  StickyKey,
  SymmetryState,
  TrackId,
} from '../types/symmetry';

/**
 * Generates a self-contained, 1-click copyable prompt instructing Gemini
 * to return a strict, lossless JSON block matching the Symmetrical Productivity
 * import schema.
 */
export function generateGeminiImportPrompt(
  currentState: SymmetryState,
  customUserRequest?: string
): string {
  const trimmedRequest = (customUserRequest || '').trim();
  const topInstruction = trimmedRequest
    ? `Update my schedule / state based on this request: "${trimmedRequest}"\nThen convert the updated plan into a Symmetrical Productivity JSON state payload.`
    : 'Convert our current plan / state into a Symmetrical Productivity JSON state payload.';

  const loadModeSchemaValue =
    currentState.loadMode === 'TAPER' ? 'TAPER_LAB' : currentState.loadMode;

  const currentBandwidthSchemaValue: 'SHARP' | 'STEADY' | 'LOW' =
    currentState.energyBandwidth === 'SHARP' || currentState.bandwidth === 'Sharp'
      ? 'SHARP'
      : currentState.energyBandwidth === 'LOW_FOGGY' || currentState.bandwidth === 'Low'
      ? 'LOW'
      : 'STEADY';

  const baselineSummary = (currentState.baselineBlocks || []).map((b) => {
    const blocksTarget = getBaselineSlotTargetBlocks(b);
    const blocksDone = getBaselineSlotCompletedBlocks(b);
    const isMechanicalRecall =
      b.cognitiveDemand === 'MECHANICAL_RECALL' ||
      b.category === 'FLASHCARDS_ANATOMY' ||
      b.category === 'FLASHCARDS_COMP';
    const supportsEarlyClearance = isBaselineSlotEarlyClearanceEligible(b);
    return `  - [${b.id}] "${b.title}" (${blocksDone}/${blocksTarget} blocks done | mechanicalRecall=${isMechanicalRecall} | earlyClearance=${supportsEarlyClearance}) — 5m Startup: "${b.startupStep}"`;
  });

  const closedListSummary = (currentState.projectQueue || [])
    .slice(0, 3)
    .map((proj, idx) => {
      const subSteps = Array.isArray(proj.blockSubSteps)
        ? proj.blockSubSteps.filter(Boolean)
        : [];
      return `  - #${idx + 1} [${proj.id}] "${proj.title}" (${proj.completedBlocks}/${proj.totalBlocks} blocks done | track="${proj.trackId}") — 5m Startup: "${proj.startupStep}"${
        subSteps.length > 0 ? ` | subSteps: ${JSON.stringify(subSteps)}` : ''
      }`;
    });

  const openListItems = (
    currentState.openListBacklog ||
    currentState.projectBacklog ||
    []
  ).map((item) => item.title);

  const pipelineSummary = (currentState.pipelineDays || []).map(
    (d) =>
      `  - ${d.dayLabel}: modeAndAnchors="${d.modeAndAnchors || d.mode}" | projectBlocks="${
        d.projectBlocksSummary || `${d.completedBlocks}/${d.baseTargetBlocks}b`
      }" | deliverables="${
        d.deliverablesCompleted || d.primaryDeliverable || ''
      }" | eveningBridge="${d.eveningBridge || ''}"`
  );

  const effectiveCards = getEffectiveEveningCategoryCards(currentState.recharge);
  const eveningSummary: string[] = [];
  for (const card of effectiveCards) {
    if (card.trackMode === 'TRIPLE' && Array.isArray(card.subTracks)) {
      for (const sub of card.subTracks) {
        eveningSummary.push(
          `  - [${sub.id}] "${sub.label}" (mode="sticky" | activeTitle="${
            sub.activeTitle
          }" | triesLogged=${sub.fiveMinStarts || 0} | startupStep5m="${
            sub.startupPrompt
          }" | queuedNext="${sub.backlogQueue?.[0] || ''}")`
        );
      }
    } else {
      eveningSummary.push(
        `  - [${card.id}] "${card.categoryName}" (mode="${
          card.behavior === 'STICKY' ? 'sticky' : 'fluid'
        }" | activeTitle="${card.activeTitle}" | triesLogged=${
          card.fiveMinStarts || 0
        } | startupStep5m="${card.startupPrompt}" | queuedNext="${
          card.backlogQueue?.[0] || ''
        }")`
      );
    }
  }

  return [
    topInstruction,
    '',
    '=== CURRENT ACTIVE STATE SNAPSHOT (Preserve unchanged fields, update modified fields) ===',
    `- loadMode: "${loadModeSchemaValue}" (consecutiveSurgeDays: ${currentState.surgeConsecutiveDays || 0}, currentBandwidth: "${currentBandwidthSchemaValue}")`,
    '- baselineSlots (Daily Core Baseline):',
    ...(baselineSummary.length > 0 ? baselineSummary : ['  - (None)']),
    '- closedList (Active Project Queue #1–#3, max 3 items):',
    ...(closedListSummary.length > 0 ? closedListSummary : ['  - (Empty)']),
    `- openList (Backlog): ${JSON.stringify(openListItems)}`,
    '- sevenDayPipeline:',
    ...(pipelineSummary.length > 0 ? pipelineSummary : ['  - (Default 7-day rows)']),
    '- eveningCategories (Evening Recharge Menu):',
    ...(eveningSummary.length > 0 ? eveningSummary : ['  - (Default categories)']),
    '',
    'Respond ONLY with a valid ```json code block matching this exact Symmetrical Productivity schema (omit unchanged fields or return the full state object):',
    '{',
    '  "loadMode": "CRUISE" | "SURGE" | "TAPER_LAB",',
    '  "consecutiveSurgeDays": 0,',
    '  "currentBandwidth": "SHARP" | "STEADY" | "LOW",',
    '  "baselineSlots": [',
    '    { "id": "string", "label": "string", "blocksTarget": 1, "blocksDone": 0, "isMechanicalRecall": true, "supportsEarlyClearance": true, "startupStep5m": "string" }',
    '  ],',
    '  "closedList": [',
    '    { "id": "string", "title": "string", "blocksTotal": 8, "blocksDone": 0, "startupStep5m": "string", "trackId": "string", "blockSubSteps": ["string"] }',
    '  ],',
    '  "openList": ["string"],',
    '  "sevenDayPipeline": [',
    '    { "day": "Mon", "modeAndAnchors": "string", "projectBlocks": "string", "deliverables": "string", "eveningBridge": "string" }',
    '  ],',
    '  "eveningCategories": [',
    '    { "id": "string", "name": "string", "mode": "sticky" | "fluid", "activeTitle": "string", "triesLogged": 0, "startupStep5m": "string", "queuedNext": "string" }',
    '  ]',
    '}',
  ].join('\n');
}

/**
 * Strips any surrounding ```json ... ``` or ``` ... ``` markdown fences
 * from a pasted Gemini response string.
 */
export function stripMarkdownJsonFences(rawText: string): string {
  const trimmed = rawText.trim();
  const fenceMatch = trimmed.match(
    /```(?:symmetrical-sync|json|markdown|md)?\s*([\s\S]*?)```/i
  );
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].trim();
  }
  return trimmed;
}

/**
 * Losslessly applies a Gemini JSON schema payload (or partial patch) onto a
 * `SymmetryState` object and returns the updated state along with a human-readable
 * list of detected changes.
 */
export function applyGeminiJsonSchemaToState(
  currentState: SymmetryState = DEFAULT_SYMMETRY_STATE,
  parsedJson: Record<string, unknown>
): {
  nextState: SymmetryState;
  appliedChanges: string[];
} {
  const next: SymmetryState = JSON.parse(JSON.stringify(currentState));
  const appliedChanges: string[] = [];

  // 1. loadMode ("CRUISE" | "SURGE" | "TAPER_LAB" | "TAPER")
  if (typeof parsedJson.loadMode === 'string' && parsedJson.loadMode.trim()) {
    const rawMode = parsedJson.loadMode.trim().toUpperCase();
    let resolvedMode: LoadMode = next.loadMode;
    let resolvedCruisePlus = next.cruisePlus;
    if (rawMode === 'SURGE') {
      resolvedMode = 'SURGE';
      resolvedCruisePlus = false;
    } else if (rawMode === 'TAPER_LAB' || rawMode === 'TAPER' || rawMode.includes('TAPER')) {
      resolvedMode = 'TAPER';
      resolvedCruisePlus = false;
    } else if (rawMode === 'CRUISE_PLUS' || rawMode === 'CRUISE+') {
      resolvedMode = 'CRUISE';
      resolvedCruisePlus = true;
    } else if (rawMode === 'CRUISE') {
      resolvedMode = 'CRUISE';
      resolvedCruisePlus = false;
    }
    next.loadMode = resolvedMode;
    next.cruisePlus = resolvedCruisePlus;
    if (typeof parsedJson.customModeBlockAdjustment !== 'number') {
      next.customModeBlockAdjustment =
        resolvedMode === 'SURGE'
          ? 14
          : resolvedMode === 'TAPER'
          ? 8
          : resolvedCruisePlus
          ? 13
          : 12;
    }
    appliedChanges.push(
      `Load Mode → ${
        resolvedMode === 'TAPER'
          ? 'Taper / Lab Mode'
          : resolvedMode === 'SURGE'
          ? 'Surge Mode'
          : resolvedCruisePlus
          ? 'Cruise+ Mode'
          : 'Cruise Mode'
      }`
    );
  }

  // 2. consecutiveSurgeDays
  if (typeof parsedJson.consecutiveSurgeDays === 'number') {
    next.surgeConsecutiveDays = Math.max(
      0,
      Math.min(2, Math.round(parsedJson.consecutiveSurgeDays))
    );
    appliedChanges.push(`Consecutive Surge Days → ${next.surgeConsecutiveDays}/2`);
  } else if (typeof parsedJson.surgeConsecutiveDays === 'number') {
    next.surgeConsecutiveDays = Math.max(
      0,
      Math.min(2, Math.round(parsedJson.surgeConsecutiveDays))
    );
  }

  // 3. currentBandwidth ("SHARP" | "STEADY" | "LOW")
  if (typeof parsedJson.currentBandwidth === 'string' && parsedJson.currentBandwidth.trim()) {
    const bw = parsedJson.currentBandwidth.trim().toUpperCase();
    if (bw === 'SHARP') {
      next.energyBandwidth = 'SHARP';
      next.bandwidth = 'Sharp';
      appliedChanges.push('Bandwidth → Sharp');
    } else if (bw === 'LOW' || bw === 'LOW_FOGGY') {
      next.energyBandwidth = 'LOW_FOGGY';
      next.bandwidth = 'Low';
      appliedChanges.push('Bandwidth → Low');
    } else if (bw === 'STEADY') {
      next.energyBandwidth = 'STEADY';
      next.bandwidth = 'Steady';
      appliedChanges.push('Bandwidth → Steady');
    }
  }

  // 4. baselineSlots
  if (Array.isArray(parsedJson.baselineSlots) && parsedJson.baselineSlots.length > 0) {
    const rawSlots = parsedJson.baselineSlots as Record<string, unknown>[];
    next.baselineBlocks = rawSlots.map((slot, idx) => {
      const slotId = String(slot.id || '');
      const existing: BaselineBlock | undefined =
        next.baselineBlocks.find((b) => b.id === slotId) ||
        next.baselineBlocks[idx] ||
        DEFAULT_SYMMETRY_STATE.baselineBlocks[idx] ||
        DEFAULT_SYMMETRY_STATE.baselineBlocks[0];

      const label = String(slot.label || slot.title || existing.title || `Baseline Slot #${idx + 1}`);
      const blocksTarget = Math.max(
        1,
        Math.min(6, Number(slot.blocksTarget ?? slot.targetBlocks ?? existing.targetBlocks ?? 1))
      );
      const blocksDone = Math.max(
        0,
        Math.min(
          blocksTarget,
          Number(
            slot.blocksDone ??
              slot.completedBlocks ??
              (slot.completed ? blocksTarget : existing.completed ? blocksTarget : 0)
          )
        )
      );
      const isMechanical =
        typeof slot.isMechanicalRecall === 'boolean'
          ? slot.isMechanicalRecall
          : existing.cognitiveDemand === 'MECHANICAL_RECALL' ||
            existing.category === 'FLASHCARDS_ANATOMY' ||
            existing.category === 'FLASHCARDS_COMP';
      const supportsEarly =
        typeof slot.supportsEarlyClearance === 'boolean'
          ? slot.supportsEarlyClearance
          : existing.earlyClearanceEligible ?? isMechanical;
      const startupStep = String(
        slot.startupStep5m || slot.startupStep || existing.startupStep || 'Complete 5m startup step.'
      );

      return {
        ...existing,
        id: slotId || existing.id || `base_${idx + 1}`,
        title: label,
        targetBlocks: blocksTarget,
        completedBlocks: blocksDone,
        completed: blocksDone >= blocksTarget,
        partialCredit: blocksDone > 0 && blocksDone < blocksTarget ? 0.5 : 0,
        cognitiveDemand: isMechanical ? 'MECHANICAL_RECALL' : 'DEEP_SYNTHESIS',
        earlyClearanceEligible: supportsEarly,
        startupStep,
      };
    });
    appliedChanges.push(`Daily Core Baseline updated (${next.baselineBlocks.length} slots)`);
  }

  // 5. closedList
  if (Array.isArray(parsedJson.closedList) && parsedJson.closedList.length > 0) {
    const rawClosed = (parsedJson.closedList as Record<string, unknown>[]).slice(0, 3);
    next.projectQueue = rawClosed.map((item, idx) => {
      const slotNum = (idx + 1) as 1 | 2 | 3;
      const existing = next.projectQueue[idx];
      const blocksTotal = Math.max(
        1,
        Number(item.blocksTotal ?? item.totalBlocks ?? existing?.totalBlocks ?? 8)
      );
      const blocksDone = Math.max(
        0,
        Math.min(
          blocksTotal,
          Number(item.blocksDone ?? item.completedBlocks ?? existing?.completedBlocks ?? 0)
        )
      );
      const rawTrack = String(item.trackId || existing?.trackId || 'science').toLowerCase();
      const validTrackIds: TrackId[] = ['science', 'writing', 'personal', 'coding', 'music'];
      const trackId: TrackId = (validTrackIds.includes(rawTrack as TrackId)
        ? rawTrack
        : 'science') as TrackId;
      const presetType: ProjectPresetType =
        (item.presetType as ProjectPresetType) ||
        existing?.presetType ||
        (blocksTotal <= 4 ? 'SLIDES_4' : 'PAPER_8');
      const startupStep = String(
        item.startupStep5m ||
          item.startupStep ||
          existing?.startupStep ||
          'Open document and complete first 5m startup step.'
      );
      const blockSubSteps = Array.isArray(item.blockSubSteps)
        ? item.blockSubSteps.map((s) => String(s))
        : existing?.blockSubSteps;

      return {
        ...(existing || {}),
        id: String(item.id || existing?.id || `proj_${slotNum}`),
        slot: slotNum,
        title: String(item.title || existing?.title || `Active Project #${slotNum}`),
        presetType,
        completedBlocks: blocksDone,
        totalBlocks: blocksTotal,
        trackId,
        startupStep,
        nextStepNote: String(
          item.nextStepNote || existing?.nextStepNote || startupStep
        ),
        blockSubSteps,
      };
    });

    if (next.projectQueue[0] && !next.timer.isRunning) {
      next.timer = {
        ...next.timer,
        activeBlockSourceId: next.projectQueue[0].id,
        activeTaskTitle: next.projectQueue[0].title,
        activeTaskType: 'PROJECT',
        activeStartupPrompt: next.projectQueue[0].startupStep,
      };
    }

    appliedChanges.push(
      `Closed List updated (${next.projectQueue.length} item${
        next.projectQueue.length === 1 ? '' : 's'
      }; #1 → "${next.projectQueue[0]?.title || 'Primary Project'}")`
    );
  }

  // 6. openList (array of strings or ProjectItem objects)
  if (Array.isArray(parsedJson.openList)) {
    const normalizedBacklog: Omit<ProjectItem, 'slot'>[] = parsedJson.openList
      .map((entry, idx): Omit<ProjectItem, 'slot'> | null => {
        if (typeof entry === 'string') {
          const title = entry.trim();
          if (!title) return null;
          const existing = (next.openListBacklog || []).find(
            (b) => b.title.toLowerCase() === title.toLowerCase()
          );
          if (existing) return existing;
          const isDeck = /slide|deck|presentation/i.test(title);
          return {
            id: `open_${idx + 1}_${Date.now().toString(36).slice(-3)}`,
            title,
            presetType: isDeck ? 'SLIDES_4' : 'PAPER_8',
            completedBlocks: 0,
            totalBlocks: isDeck ? 4 : 8,
            trackId: 'science',
            startupStep: 'Open project file and complete first 5m startup step.',
            nextStepNote: 'Queued in Open List backlog.',
            cognitiveDemand: 'DEEP_SYNTHESIS',
          };
        }
        if (entry && typeof entry === 'object') {
          const obj = entry as Record<string, unknown>;
          const title = String(obj.title || '').trim();
          if (!title) return null;
          const blocksTotal = Number(obj.blocksTotal ?? obj.totalBlocks ?? 8);
          return {
            id: String(obj.id || `open_${idx + 1}`),
            title,
            presetType: (obj.presetType as ProjectPresetType) || (blocksTotal <= 4 ? 'SLIDES_4' : 'PAPER_8'),
            completedBlocks: Number(obj.blocksDone ?? obj.completedBlocks ?? 0),
            totalBlocks: blocksTotal,
            trackId: ((obj.trackId as TrackId) || 'science'),
            startupStep: String(
              obj.startupStep5m || obj.startupStep || 'Open project file and complete first 5m startup step.'
            ),
            nextStepNote: String(obj.nextStepNote || 'Queued in Open List backlog.'),
          };
        }
        return null;
      })
      .filter((x): x is Omit<ProjectItem, 'slot'> => x !== null);

    next.openListBacklog = normalizedBacklog;
    next.projectBacklog = normalizedBacklog;
    appliedChanges.push(`Open List updated (${normalizedBacklog.length} item${normalizedBacklog.length === 1 ? '' : 's'})`);
  }

  // 7. sevenDayPipeline
  if (Array.isArray(parsedJson.sevenDayPipeline) && parsedJson.sevenDayPipeline.length > 0) {
    const rawPipeline = parsedJson.sevenDayPipeline as Record<string, unknown>[];
    next.pipelineDays = next.pipelineDays.map((existingDay, idx) => {
      const patchDay =
        rawPipeline.find(
          (r) =>
            String(r.day || r.dayLabel || '')
              .toLowerCase()
              .slice(0, 3) === existingDay.dayLabel.toLowerCase().slice(0, 3)
        ) || rawPipeline[idx];
      if (!patchDay || typeof patchDay !== 'object') return existingDay;

      const modeAndAnchors = String(
        patchDay.modeAndAnchors ?? patchDay.mode ?? existingDay.modeAndAnchors ?? existingDay.mode
      );
      const upperMode = modeAndAnchors.toUpperCase();
      const inferredLoadMode: LoadMode = upperMode.includes('SURGE')
        ? 'SURGE'
        : upperMode.includes('TAPER') || upperMode.includes('LAB')
        ? 'TAPER'
        : existingDay.loadMode;
      const inferredCruisePlus = upperMode.includes('CRUISE+');

      const projectBlocksSummary = String(
        patchDay.projectBlocks ??
          patchDay.projectBlocksSummary ??
          existingDay.projectBlocksSummary ??
          ''
      );
      const deliverables = String(
        patchDay.deliverables ??
          patchDay.deliverablesCompleted ??
          patchDay.primaryDeliverable ??
          existingDay.deliverablesCompleted ??
          existingDay.primaryDeliverable ??
          ''
      );
      const eveningBridge = String(
        patchDay.eveningBridge ?? existingDay.eveningBridge ?? ''
      );

      return {
        ...existingDay,
        dayLabel: String(patchDay.day || patchDay.dayLabel || existingDay.dayLabel),
        loadMode: inferredLoadMode,
        cruisePlus: inferredCruisePlus,
        mode: modeAndAnchors,
        modeAndAnchors,
        projectBlocksSummary,
        deliverablesCompleted: deliverables,
        primaryDeliverable: deliverables || existingDay.primaryDeliverable,
        eveningBridge,
      };
    });
    appliedChanges.push(`7-Day Pipeline updated (${rawPipeline.length} days)`);
  }

  // 8. eveningCategories
  if (Array.isArray(parsedJson.eveningCategories) && parsedJson.eveningCategories.length > 0) {
    const rawCats = parsedJson.eveningCategories as Record<string, unknown>[];
    const stickySlots = { ...next.recharge.stickySlots };
    const fluidCategories = {
      CAT1_MUSIC: {
        ...DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT1_MUSIC,
        ...(next.recharge.fluidCategories?.CAT1_MUSIC || {}),
      },
      CAT4_COMFORT: {
        ...DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT4_COMFORT,
        ...(next.recharge.fluidCategories?.CAT4_COMFORT || {}),
      },
    };

    const resolveStickyKey = (idOrName: string): StickyKey | null => {
      const upper = idOrName.toUpperCase();
      if (upper.includes('CAT2') || upper.includes('MAKER') || upper.includes('HARDWARE') || upper === '2') {
        return 'CAT2_MAKER';
      }
      if (upper.includes('3A') || upper.includes('FICTION')) {
        return '3A_FICTION';
      }
      if (upper.includes('3B') || upper.includes('NONFICTION') || upper.includes('NON-FICTION')) {
        return '3B_NONFICTION';
      }
      if (upper.includes('3C') || upper.includes('VIDEO') || upper.includes('WATCH')) {
        return '3C_VIDEO';
      }
      if (upper.includes('CAT5') || upper.includes('GAMING') || upper.includes('GAME') || upper === '5') {
        return 'CAT5_GAMING';
      }
      return null;
    };

    for (const cat of rawCats) {
      if (!cat || typeof cat !== 'object') continue;
      const idStr = String(cat.id || '');
      const nameStr = String(cat.name || '');
      const combinedKey = `${idStr} ${nameStr}`;
      const activeTitle = typeof cat.activeTitle === 'string' ? cat.activeTitle : undefined;
      const startupStep = typeof cat.startupStep5m === 'string'
        ? cat.startupStep5m
        : typeof cat.startupStep === 'string'
        ? cat.startupStep
        : undefined;
      const triesLogged = typeof cat.triesLogged === 'number'
        ? Math.max(0, Math.min(3, Math.round(cat.triesLogged)))
        : typeof cat.fiveMinStarts === 'number'
        ? Math.max(0, Math.min(3, Math.round(cat.fiveMinStarts)))
        : undefined;
      const queuedNext = typeof cat.queuedNext === 'string' ? cat.queuedNext.trim() : undefined;

      const stickyKey = resolveStickyKey(combinedKey);
      if (stickyKey && stickySlots[stickyKey]) {
        const existingSlot = stickySlots[stickyKey];
        const updatedQueue = queuedNext
          ? [queuedNext, ...(existingSlot.backlogQueue || []).filter((q) => q !== queuedNext)]
          : existingSlot.backlogQueue || [];
        stickySlots[stickyKey] = {
          ...existingSlot,
          activeTitle: activeTitle || existingSlot.activeTitle,
          startupStep: startupStep || existingSlot.startupStep,
          fiveMinStarts: triesLogged ?? existingSlot.fiveMinStarts,
          startsLogged: triesLogged ?? existingSlot.startsLogged ?? existingSlot.fiveMinStarts,
          backlogQueue: updatedQueue,
          queuedNextTitle: queuedNext ?? existingSlot.queuedNextTitle,
        };
      } else if (/CAT1|MUSIC|^1\b/i.test(combinedKey)) {
        fluidCategories.CAT1_MUSIC = {
          ...fluidCategories.CAT1_MUSIC,
          activeTitle: activeTitle || fluidCategories.CAT1_MUSIC.activeTitle,
          startupStep: startupStep || fluidCategories.CAT1_MUSIC.startupStep,
        };
      } else if (/CAT4|COMFORT|^4\b/i.test(combinedKey)) {
        fluidCategories.CAT4_COMFORT = {
          ...fluidCategories.CAT4_COMFORT,
          activeTitle: activeTitle || fluidCategories.CAT4_COMFORT.activeTitle,
          startupStep: startupStep || fluidCategories.CAT4_COMFORT.startupStep,
        };
      }
    }

    next.recharge = {
      ...next.recharge,
      stickySlots,
      fluidCategories,
      // Clear cached categoryCards if present so getEffectiveEveningCategoryCards reflects updated stickySlots/fluidCategories
      categoryCards: undefined,
    };
    appliedChanges.push(`Evening Recharge Menu updated (${rawCats.length} categories)`);
  }

  return { nextState: next, appliedChanges };
}
