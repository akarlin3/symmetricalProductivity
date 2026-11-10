import {
  DEFAULT_HOUSE_FOUNDATION,
  DEFAULT_HOUSE_SHELTER,
  DEFAULT_SYMMETRY_STATE,
  getBaselineSlotCompletedBlocks,
  getBaselineSlotTargetBlocks,
  getEffectiveDailyAmbitionDrip,
  getEffectiveEveningCategoryCards,
  isBaselineSlotEarlyClearanceEligible,
  isProjectAmbitionDripEligible,
  migrateRoadmapTracksToHouseTopology,
  normalizeOpenListArray,
} from '../state/defaultState';
import {
  BaselineBlock,
  LoadMode,
  MajorSubTrackId,
  ProjectItem,
  ProjectPresetType,
  RoadmapHorizonNote,
  RoadmapTrack,
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

  const drip = getEffectiveDailyAmbitionDrip(currentState);

  const baselineSummary = (currentState.baselineBlocks || []).map((b) => {
    const blocksTarget = getBaselineSlotTargetBlocks(b);
    const blocksDone = getBaselineSlotCompletedBlocks(b);
    const isMechanicalRecall =
      b.cognitiveDemand === 'MECHANICAL_RECALL' ||
      b.category === 'FLASHCARDS_ANATOMY' ||
      b.category === 'FLASHCARDS_COMP';
    const supportsEarlyClearance = isBaselineSlotEarlyClearanceEligible(b);
    const launchSuffix = b.launchUrl ? ` | launchUrl="${b.launchUrl}"` : '';
    return `  - [${b.id}] "${b.title}" (${blocksDone}/${blocksTarget} blocks done | mechanicalRecall=${isMechanicalRecall} | earlyClearance=${supportsEarlyClearance}${launchSuffix}) — 5m Startup: "${b.startupStep}"`;
  });

  const closedListSummary = (currentState.projectQueue || [])
    .slice(0, 3)
    .map((proj, idx) => {
      const subSteps = Array.isArray(proj.blockSubSteps)
        ? proj.blockSubSteps.filter(Boolean)
        : [];
      const isDrip = isProjectAmbitionDripEligible(proj);
      const subTrack =
        proj.subTrack ||
        (proj.trackId === 'science'
          ? isDrip
            ? '1B_INDEPENDENT'
            : '1A_INSTITUTIONAL'
          : undefined);
      const launchSuffix = proj.launchUrl ? ` | launchUrl="${proj.launchUrl}"` : '';
      return `  - #${idx + 1} [${proj.id}] "${proj.title}" (${proj.completedBlocks}/${proj.totalBlocks} blocks done | isAmbitionDrip=${isDrip} | track="${proj.trackId}"${subTrack ? ` | subTrack="${subTrack}"` : ''}${launchSuffix}) — 5m Startup: "${proj.startupStep}"${
        subSteps.length > 0 ? ` | blockSubSteps: ${JSON.stringify(subSteps)}` : ''
      }`;
    });

  const structuredOpenList = normalizeOpenListArray(
    currentState.openList || currentState.openListBacklog || currentState.projectBacklog || []
  ).map((item) => ({
    id: item.id,
    title: item.title,
    blocksTotal: item.blocksTotal ?? item.totalBlocks ?? 8,
    trackId: item.trackId || 'science',
    ...(item.subTrack ? { subTrack: item.subTrack } : {}),
    ...(item.blockedByTitle ? { blockedByTitle: item.blockedByTitle } : {}),
    ...(item.notes ? { notes: item.notes } : {}),
    ...(item.launchUrl ? { launchUrl: item.launchUrl } : {}),
  }));

  const pipelineSummary = (currentState.pipelineDays || []).map(
    (d) =>
      `  - ${d.dayLabel}: modeAndAnchors="${d.modeAndAnchors || d.mode}" | projectBlocks="${
        d.projectBlocksSummary || `${d.completedBlocks}/${d.baseTargetBlocks}b`
      }" | deliverables="${
        d.deliverablesCompleted || d.primaryDeliverable || ''
      }" | eveningBridge="${d.eveningBridge || ''}"${
        d.earlyEveningShutdownBadge ? ' | earlyShutdown6PM=true' : ''
      }`
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
          }" | queuedNext="${sub.backlogQueue?.[0] || ''}"${
            sub.launchUrl ? ` | launchUrl="${sub.launchUrl}"` : ''
          })`
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
        }"${card.launchUrl ? ` | launchUrl="${card.launchUrl}"` : ''})`
      );
    }
  }

  const shelter = currentState.roadmapShelter || DEFAULT_HOUSE_SHELTER;
  const foundation = currentState.roadmapFoundation || DEFAULT_HOUSE_FOUNDATION;
  const houseTracks = migrateRoadmapTracksToHouseTopology(currentState.roadmapTracks);
  const roadmapSummary = houseTracks.map(
    (t) =>
      `  - [${t.id}] "${t.name}" (${t.isSandbox ? 'Zero-Quota Sandbox' : 'Major Core Track'} | input=${t.inputBlocksCredited}b | output=${t.outputBlocksCredited}b${
        t.id === 'science'
          ? ` | 1A_Institutional=${t.subTrack1ABlocksCredited ?? t.outputBlocksCredited}b | 1B_Independent=${t.subTrack1BBlocksCredited ?? 0}b`
          : ''
      })`
  );

  return [
    topInstruction,
    '',
    '=== CURRENT ACTIVE STATE SNAPSHOT (Preserve unchanged fields, update modified fields) ===',
    `- loadMode: "${loadModeSchemaValue}" (consecutiveSurgeDays: ${currentState.surgeConsecutiveDays || 0}, currentBandwidth: "${currentBandwidthSchemaValue}")`,
    `- dailyAmbitionDrip: ${JSON.stringify(drip)}`,
    '- baselineSlots (Daily Core Baseline):',
    ...(baselineSummary.length > 0 ? baselineSummary : ['  - (None)']),
    '- closedList (Active Project Queue #1–#3, max 3 items):',
    ...(closedListSummary.length > 0 ? closedListSummary : ['  - (Empty)']),
    `- openList (Backlog with optional blockedByTitle prerequisites): ${JSON.stringify(structuredOpenList)}`,
    '- sevenDayPipeline:',
    ...(pipelineSummary.length > 0 ? pipelineSummary : ['  - (Default 7-day rows)']),
    '- eveningCategories (6-Channel Evening Recharge Menu):',
    ...(eveningSummary.length > 0 ? eveningSummary : ['  - (Default 6 categories)']),
    `- roadmapShelter (Non-Quota Roof): "${shelter.title}" — ${JSON.stringify(shelter.horizonNotes)}`,
    `- roadmapFoundation (Non-Quota Vitality Foundation): "${foundation.title}" (status="${foundation.statusSummary || ''}") — ${JSON.stringify(foundation.horizonNotes)}`,
    '- roadmapTracks (Structural House: 2 Major Core + 3 Zero-Quota Sandbox):',
    ...roadmapSummary,
    '',
    'Respond ONLY with a valid ```json code block matching this exact Symmetrical Productivity schema (omit unchanged fields or return the full state object):',
    '{',
    '  "loadMode": "CRUISE" | "SURGE" | "TAPER_LAB",',
    '  "consecutiveSurgeDays": 0,',
    '  "currentBandwidth": "SHARP" | "STEADY" | "LOW",',
    '  "dailyAmbitionDrip": { "enabled": true, "targetBlocksPerDay": 1, "completedToday": 0, "preferredSlotIndex": 1 },',
    '  "baselineSlots": [',
    '    { "id": "string", "label": "string", "blocksTarget": 1, "blocksDone": 0, "isMechanicalRecall": true, "supportsEarlyClearance": true, "startupStep5m": "string", "launchUrl": "string" }',
    '  ],',
    '  "closedList": [',
    '    { "id": "string", "title": "string", "blocksTotal": 8, "blocksDone": 0, "startupStep5m": "string", "trackId": "science" | "writing" | "coding" | "music" | "culture", "subTrack": "1A_INSTITUTIONAL" | "1B_INDEPENDENT", "isAmbitionDrip": false, "blockSubSteps": ["string"], "launchUrl": "string" }',
    '  ],',
    '  "openList": [',
    '    { "id": "string", "title": "string", "blocksTotal": 8, "trackId": "science", "blockedByTitle": "string", "notes": "string", "launchUrl": "string" }',
    '  ],',
    '  "sevenDayPipeline": [',
    '    { "day": "Mon", "modeAndAnchors": "string", "projectBlocks": "string", "deliverables": "string", "eveningBridge": "string", "earlyEveningShutdownBadge": false }',
    '  ],',
    '  "eveningCategories": [',
    '    { "id": "CAT1_MUSIC" | "CAT2_MAKER" | "3A_FICTION" | "3B_NONFICTION" | "3C_VIDEO" | "CAT4_COMFORT" | "CAT5_GAMING" | "CAT6_CULTURE", "name": "string", "mode": "sticky" | "fluid", "activeTitle": "string", "triesLogged": 0, "startupStep5m": "string", "queuedNext": "string", "launchUrl": "string" }',
    '  ],',
    '  "roadmapShelter": { "title": "Relationships, Community & Service (Non-Quota Roof)", "horizonNotes": [{ "horizonNumber": 1, "label": "Horizon 1", "note": "string" }] },',
    '  "roadmapFoundation": { "title": "Physical Vitality (Non-Quota Foundation)", "statusSummary": "string", "horizonNotes": [{ "horizonNumber": 1, "label": "Horizon 1", "note": "string" }] },',
    '  "roadmapTracks": [',
    '    { "id": "science" | "writing" | "coding" | "music" | "culture", "name": "string", "isSandbox": false, "inputBlocksCredited": 0, "outputBlocksCredited": 0, "subTrack1ABlocksCredited": 0, "subTrack1BBlocksCredited": 0 }',
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

  // 3b. dailyAmbitionDrip (with legacy dailySovereignDripDone / dailySovereignDripTarget fallback)
  const existingDrip = getEffectiveDailyAmbitionDrip(next);
  if (parsedJson.dailyAmbitionDrip && typeof parsedJson.dailyAmbitionDrip === 'object') {
    const rawDrip = parsedJson.dailyAmbitionDrip as Record<string, unknown>;
    const enabled =
      typeof rawDrip.enabled === 'boolean' ? rawDrip.enabled : existingDrip.enabled;
    const targetBlocksPerDay =
      typeof rawDrip.targetBlocksPerDay === 'number'
        ? Math.max(1, Math.min(3, Math.round(rawDrip.targetBlocksPerDay)))
        : existingDrip.targetBlocksPerDay;
    const completedToday =
      typeof rawDrip.completedToday === 'number'
        ? Math.max(0, Math.round(rawDrip.completedToday))
        : existingDrip.completedToday;
    const preferredSlotIndex: 1 | 2 =
      rawDrip.preferredSlotIndex === 2 ? 2 : 1;
    next.dailyAmbitionDrip = {
      enabled,
      targetBlocksPerDay,
      completedToday,
      preferredSlotIndex,
    };
    next.dailySovereignDripDone = completedToday >= targetBlocksPerDay;
    next.dailySovereignDripTarget = targetBlocksPerDay;
    appliedChanges.push(
      `Daily Ambition Drip → ${
        enabled ? `${completedToday}/${targetBlocksPerDay} (Slot #${preferredSlotIndex + 1})` : 'Paused'
      }`
    );
  } else if (
    typeof parsedJson.dailySovereignDripDone === 'boolean' ||
    typeof parsedJson.dailySovereignDripTarget === 'number'
  ) {
    const target =
      typeof parsedJson.dailySovereignDripTarget === 'number'
        ? Math.max(1, Math.round(parsedJson.dailySovereignDripTarget))
        : existingDrip.targetBlocksPerDay;
    const doneBool =
      typeof parsedJson.dailySovereignDripDone === 'boolean'
        ? parsedJson.dailySovereignDripDone
        : existingDrip.completedToday >= target;
    next.dailySovereignDripDone = doneBool;
    next.dailySovereignDripTarget = target;
    next.dailyAmbitionDrip = {
      ...existingDrip,
      targetBlocksPerDay: target,
      completedToday: doneBool ? target : 0,
    };
    appliedChanges.push(
      `Daily Ambition Drip → ${doneBool ? `${target}/${target} DONE` : `0/${target} PENDING`}`
    );
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
      const launchUrl =
        typeof slot.launchUrl === 'string' ? slot.launchUrl.trim() : existing.launchUrl;
      const autoLaunchUrl =
        typeof slot.autoLaunchUrl === 'boolean' ? slot.autoLaunchUrl : existing.autoLaunchUrl;

      return {
        ...existing,
        id: slotId || existing.id || `base_${idx + 1}`,
        title: label,
        targetBlocks: blocksTarget,
        blocksTarget,
        completedBlocks: blocksDone,
        completed: blocksDone >= blocksTarget,
        partialCredit: blocksDone > 0 && blocksDone < blocksTarget ? 0.5 : 0,
        cognitiveDemand: isMechanical ? 'MECHANICAL_RECALL' : 'DEEP_SYNTHESIS',
        earlyClearanceEligible: supportsEarly,
        supportsEarlyClearance: supportsEarly,
        startupStep,
        launchUrl,
        autoLaunchUrl,
      };
    });
    next.baselineSlots = next.baselineBlocks;
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
      const isDrip =
        typeof item.isAmbitionDrip === 'boolean'
          ? item.isAmbitionDrip
          : typeof item.isSovereignDrip === 'boolean'
          ? item.isSovereignDrip
          : item.category === 'sovereign'
          ? true
          : item.category === 'institutional'
          ? false
          : slotNum === 1
          ? false
          : Boolean(
              existing?.isAmbitionDrip ||
                existing?.isSovereignDrip ||
                existing?.category === 'sovereign'
            );
      const rawTrack = String(
        item.trackId || existing?.trackId || (isDrip ? 'writing' : 'science')
      ).toLowerCase();
      const validTrackIds: TrackId[] = [
        'science',
        'writing',
        'personal',
        'coding',
        'music',
        'culture',
      ];
      const trackId: TrackId = (validTrackIds.includes(rawTrack as TrackId)
        ? rawTrack
        : 'science') as TrackId;
      const subTrack: MajorSubTrackId | undefined =
        item.subTrack === '1A_INSTITUTIONAL' || item.subTrack === '1B_INDEPENDENT'
          ? item.subTrack
          : existing?.subTrack ||
            (trackId === 'science'
              ? isDrip
                ? '1B_INDEPENDENT'
                : '1A_INSTITUTIONAL'
              : undefined);
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
      const launchUrl =
        typeof item.launchUrl === 'string' ? item.launchUrl.trim() : existing?.launchUrl;
      const autoLaunchUrl =
        typeof item.autoLaunchUrl === 'boolean'
          ? item.autoLaunchUrl
          : existing?.autoLaunchUrl;

      return {
        ...(existing || {}),
        id: String(item.id || existing?.id || `proj_${slotNum}`),
        slot: slotNum,
        title: String(item.title || existing?.title || `Active Project #${slotNum}`),
        presetType,
        completedBlocks: blocksDone,
        totalBlocks: blocksTotal,
        trackId,
        subTrack,
        startupStep,
        nextStepNote: String(
          item.nextStepNote || existing?.nextStepNote || startupStep
        ),
        blockSubSteps,
        launchUrl,
        autoLaunchUrl,
        isAmbitionDrip: isDrip,
        isSovereignDrip: isDrip,
        category: isDrip ? 'sovereign' : 'institutional',
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

  // 6. openList (array of strings or structured OpenListItem objects with blockedByTitle)
  if (Array.isArray(parsedJson.openList)) {
    const structured = normalizeOpenListArray(parsedJson.openList);
    const normalizedBacklog: Omit<ProjectItem, 'slot'>[] = structured.map((item) => ({
      id: item.id,
      title: item.title,
      presetType:
        item.presetType ||
        ((item.blocksTotal ?? item.totalBlocks ?? 8) <= 4 ? 'SLIDES_4' : 'PAPER_8'),
      completedBlocks: item.completedBlocks ?? 0,
      totalBlocks: item.totalBlocks ?? item.blocksTotal ?? 8,
      trackId: item.trackId || 'science',
      subTrack: item.subTrack,
      startupStep:
        item.startupStep ||
        `Open "${item.title}" and complete first 5m startup step.`,
      nextStepNote: item.notes || item.nextStepNote || 'Queued in Open List backlog.',
      blockedByTitle: item.blockedByTitle,
      notes: item.notes,
      launchUrl: item.launchUrl,
      autoLaunchUrl: item.autoLaunchUrl,
      isAmbitionDrip: item.isAmbitionDrip,
      isSovereignDrip: item.isAmbitionDrip ?? item.isSovereignDrip,
      category: item.category || (item.isAmbitionDrip ? 'sovereign' : 'institutional'),
    }));

    next.openList = structured;
    next.openListBacklog = normalizedBacklog;
    next.projectBacklog = normalizedBacklog;
    appliedChanges.push(
      `Open List updated (${structured.length} item${structured.length === 1 ? '' : 's'})`
    );
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
      const earlyShutdownBadge =
        typeof patchDay.earlyEveningShutdownBadge === 'boolean'
          ? patchDay.earlyEveningShutdownBadge
          : /early\s*shutdown|6:00\s*pm/i.test(modeAndAnchors) ||
            Boolean(existingDay.earlyEveningShutdownBadge);

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
        earlyEveningShutdownBadge: earlyShutdownBadge,
      };
    });
    appliedChanges.push(`7-Day Pipeline updated (${rawPipeline.length} days)`);
  }

  // 8. eveningCategories (supports all 6 categories including CAT6_CULTURE + launchUrl)
  if (Array.isArray(parsedJson.eveningCategories) && parsedJson.eveningCategories.length > 0) {
    const rawCats = parsedJson.eveningCategories as Record<string, unknown>[];
    const stickySlots = { ...next.recharge.stickySlots };
    const defaultFluid = DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!;
    const fluidCategories = {
      CAT1_MUSIC: {
        ...defaultFluid.CAT1_MUSIC,
        ...(next.recharge.fluidCategories?.CAT1_MUSIC || {}),
      },
      CAT4_COMFORT: {
        ...defaultFluid.CAT4_COMFORT,
        ...(next.recharge.fluidCategories?.CAT4_COMFORT || {}),
      },
      CAT6_CULTURE: {
        ...(defaultFluid.CAT6_CULTURE || {
          label: '6. Culture & Language',
          activeTitle: 'Culture & Language',
          subtitle:
            'Low-pressure cultural & spoken language immersion — zero SRS flashcards.',
          startupStep:
            '5m spoken audio lesson, foreign music/cinema, or culinary prep — zero SRS flashcards.',
        }),
        ...(next.recharge.fluidCategories?.CAT6_CULTURE || {}),
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
      const launchUrl = typeof cat.launchUrl === 'string' ? cat.launchUrl.trim() : undefined;
      const autoLaunchUrl =
        typeof cat.autoLaunchUrl === 'boolean' ? cat.autoLaunchUrl : undefined;

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
          ...(launchUrl !== undefined ? { launchUrl } : {}),
          ...(autoLaunchUrl !== undefined ? { autoLaunchUrl } : {}),
        };
      } else if (/CAT1|MUSIC|^1\b/i.test(combinedKey)) {
        fluidCategories.CAT1_MUSIC = {
          ...fluidCategories.CAT1_MUSIC,
          activeTitle: activeTitle || fluidCategories.CAT1_MUSIC.activeTitle,
          startupStep: startupStep || fluidCategories.CAT1_MUSIC.startupStep,
          ...(launchUrl !== undefined ? { launchUrl } : {}),
          ...(autoLaunchUrl !== undefined ? { autoLaunchUrl } : {}),
        };
      } else if (/CAT4|COMFORT|^4\b/i.test(combinedKey)) {
        fluidCategories.CAT4_COMFORT = {
          ...fluidCategories.CAT4_COMFORT,
          activeTitle: activeTitle || fluidCategories.CAT4_COMFORT.activeTitle,
          startupStep: startupStep || fluidCategories.CAT4_COMFORT.startupStep,
          ...(launchUrl !== undefined ? { launchUrl } : {}),
          ...(autoLaunchUrl !== undefined ? { autoLaunchUrl } : {}),
        };
      } else if (/CAT6|CULTURE|LANGUAGE|ITALIAN|^6\b/i.test(combinedKey)) {
        const existingCat6 = fluidCategories.CAT6_CULTURE || {
          label: '6. Culture & Language',
          activeTitle: 'Culture & Language',
          subtitle: 'Low-pressure cultural & spoken language immersion — zero SRS flashcards.',
          startupStep:
            '5m spoken audio lesson, foreign music/cinema, or culinary prep — zero SRS flashcards',
        };
        fluidCategories.CAT6_CULTURE = {
          ...existingCat6,
          activeTitle: activeTitle || existingCat6.activeTitle,
          startupStep: startupStep || existingCat6.startupStep,
          ...(launchUrl !== undefined ? { launchUrl } : {}),
          ...(autoLaunchUrl !== undefined ? { autoLaunchUrl } : {}),
        };
      }
    }

    next.recharge = {
      ...next.recharge,
      stickySlots,
      fluidCategories,
      categoryCards: undefined,
    };
    appliedChanges.push(`Evening Recharge Menu updated (${rawCats.length} categories)`);
  }

  // 9. Structural House Roadmap (roadmapShelter, roadmapFoundation, roadmapTracks)
  if (parsedJson.roadmapShelter && typeof parsedJson.roadmapShelter === 'object') {
    const rawShelter = parsedJson.roadmapShelter as Record<string, unknown>;
    const existingShelter = next.roadmapShelter || DEFAULT_HOUSE_SHELTER;
    next.roadmapShelter = {
      ...existingShelter,
      title: typeof rawShelter.title === 'string' ? rawShelter.title : existingShelter.title,
      subtitle:
        typeof rawShelter.subtitle === 'string' ? rawShelter.subtitle : existingShelter.subtitle,
      horizonNotes: Array.isArray(rawShelter.horizonNotes)
        ? (rawShelter.horizonNotes as RoadmapHorizonNote[])
        : existingShelter.horizonNotes,
    };
    appliedChanges.push('Updated Roadmap Shelter (Non-Quota Roof)');
  }

  if (parsedJson.roadmapFoundation && typeof parsedJson.roadmapFoundation === 'object') {
    const rawFound = parsedJson.roadmapFoundation as Record<string, unknown>;
    const existingFound = next.roadmapFoundation || DEFAULT_HOUSE_FOUNDATION;
    next.roadmapFoundation = {
      ...existingFound,
      title: typeof rawFound.title === 'string' ? rawFound.title : existingFound.title,
      subtitle:
        typeof rawFound.subtitle === 'string' ? rawFound.subtitle : existingFound.subtitle,
      statusSummary:
        typeof rawFound.statusSummary === 'string'
          ? rawFound.statusSummary
          : existingFound.statusSummary,
      horizonNotes: Array.isArray(rawFound.horizonNotes)
        ? (rawFound.horizonNotes as RoadmapHorizonNote[])
        : existingFound.horizonNotes,
    };
    appliedChanges.push('Updated Roadmap Foundation (Physical Vitality)');
  }

  if (Array.isArray(parsedJson.roadmapTracks) && parsedJson.roadmapTracks.length > 0) {
    const baseHouseTracks = migrateRoadmapTracksToHouseTopology(next.roadmapTracks);
    const rawTracks = parsedJson.roadmapTracks as Record<string, unknown>[];
    const mergedTracks: RoadmapTrack[] = baseHouseTracks.map((baseTrack, idx) => {
      const patch =
        rawTracks.find((rt) => String(rt.id || '').toLowerCase() === baseTrack.id) ||
        rawTracks[idx];
      if (!patch || typeof patch !== 'object') return baseTrack;
      const nextCategoryLabel: RoadmapTrack['categoryLabel'] =
        patch.categoryLabel === 'CORE TRACK' ||
        patch.categoryLabel === 'MAJOR CORE TRACK' ||
        patch.categoryLabel === 'ZERO-QUOTA SANDBOX'
          ? patch.categoryLabel
          : baseTrack.categoryLabel;
      return {
        ...baseTrack,
        name: typeof patch.name === 'string' ? patch.name : baseTrack.name,
        categoryLabel: nextCategoryLabel,
        isSandbox:
          typeof patch.isSandbox === 'boolean' ? patch.isSandbox : baseTrack.isSandbox,
        inputBlocksCredited:
          typeof patch.inputBlocksCredited === 'number'
            ? patch.inputBlocksCredited
            : baseTrack.inputBlocksCredited,
        outputBlocksCredited:
          typeof patch.outputBlocksCredited === 'number'
            ? patch.outputBlocksCredited
            : baseTrack.outputBlocksCredited,
        subTrack1ABlocksCredited:
          typeof patch.subTrack1ABlocksCredited === 'number'
            ? patch.subTrack1ABlocksCredited
            : baseTrack.subTrack1ABlocksCredited,
        subTrack1BBlocksCredited:
          typeof patch.subTrack1BBlocksCredited === 'number'
            ? patch.subTrack1BBlocksCredited
            : baseTrack.subTrack1BBlocksCredited,
        rungs: Array.isArray(patch.rungs)
          ? (patch.rungs as RoadmapTrack['rungs'])
          : baseTrack.rungs,
      };
    });
    next.roadmapTracks = mergedTracks;
    appliedChanges.push(`Updated Structural House Roadmap (${mergedTracks.length} tracks)`);
  }

  return { nextState: next, appliedChanges };
}
