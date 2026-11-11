import {
  ActiveTaskType,
  AudioEngineSettings,
  BackupTriggerReason,
  BaselineBlock,
  CognitiveDemandTag,
  DailyHistoryEntry,
  ElasticBlockMultiplier,
  LoadMode,
  ProjectItem,
  StartupShrinkLevel,
  StateBackupSnapshot,
  StructureFlexibilityConfig,
  SymmetryState,
  TodayBlockLogEntry,
} from '../types/symmetry';

export const STORAGE_KEY = 'symmetry_manager_state_v1';
export const BACKUP_STORAGE_KEY = 'symmetry_state_backups_v1';
export const MAX_STATE_BACKUPS = 7;

export const DEFAULT_AUDIO_ENGINE_SETTINGS: AudioEngineSettings = {
  muted: false,
  volume: 0.45,
  soundscapeEnabled: true,
  soundscapeMode: 'WARM_BROWN_NOISE',
};


export const DEFAULT_FLEXIBILITY_TUNING: StructureFlexibilityConfig = {
  blockCadencePreset: '20_5_15',
  closedListLockMode: 'STRICT_SERIALIZED',
  activeFocusSlot: 1,
  slot1BlockedOnExternalFeedback: false,
  eveningPulseSensitivity: 'STANDARD_20_40_60',
  boundedCuriositySandboxUsedToday: false,
};

export function getBaselineCognitiveDemand(
  block: Pick<BaselineBlock, 'category' | 'cognitiveDemand'>
): CognitiveDemandTag {
  if (block.cognitiveDemand) return block.cognitiveDemand;
  if (
    block.category === 'FLASHCARDS_ANATOMY' ||
    block.category === 'FLASHCARDS_COMP'
  ) {
    return 'MECHANICAL_RECALL';
  }
  return 'DEEP_SYNTHESIS';
}

export function getProjectCognitiveDemand(
  project: Pick<ProjectItem, 'cognitiveDemand' | 'trackId' | 'presetType'>
): CognitiveDemandTag {
  if (project.cognitiveDemand) return project.cognitiveDemand;
  if (project.trackId === 'personal') return 'LIGHT_ADMIN';
  return 'DEEP_SYNTHESIS';
}

export function cycleCognitiveDemandTag(
  current: CognitiveDemandTag = 'DEEP_SYNTHESIS'
): CognitiveDemandTag {
  if (current === 'DEEP_SYNTHESIS') return 'MECHANICAL_RECALL';
  if (current === 'MECHANICAL_RECALL') return 'LIGHT_ADMIN';
  return 'DEEP_SYNTHESIS';
}

export function getBaselineSlotTargetBlocks(block: BaselineBlock): number {
  const rawTarget =
    typeof block.targetBlocks === 'number' && !Number.isNaN(block.targetBlocks)
      ? block.targetBlocks
      : typeof block.blocksTarget === 'number' && !Number.isNaN(block.blocksTarget)
      ? block.blocksTarget
      : undefined;
  if (typeof rawTarget === 'number') {
    return Math.max(1, Math.min(6, Math.round(rawTarget)));
  }
  return 1;
}

export function getBaselineSlotEffectiveTargetBlocks(block: BaselineBlock): number {
  const target = getBaselineSlotTargetBlocks(block);
  if (
    block.reallocatedViaEarlyClearance &&
    typeof block.reallocatedBlocksCount === 'number' &&
    block.reallocatedBlocksCount > 0
  ) {
    return Math.max(0, target - Math.min(target, Math.round(block.reallocatedBlocksCount)));
  }
  return target;
}

export function isBaselineSlotClearedForToday(block: BaselineBlock): boolean {
  const effectiveTarget = getBaselineSlotEffectiveTargetBlocks(block);
  if (block.completed || block.bankedViaEarlyClearance || block.reallocatedViaEarlyClearance) {
    return true;
  }
  const done =
    typeof block.completedBlocks === 'number' ? block.completedBlocks : 0;
  return done >= effectiveTarget && effectiveTarget > 0;
}

export function getBaselineSlotCompletedBlocks(block: BaselineBlock): number {
  const target = getBaselineSlotTargetBlocks(block);
  if (block.completed || block.bankedViaEarlyClearance) {
    return target;
  }
  const effectiveTarget = getBaselineSlotEffectiveTargetBlocks(block);
  if (typeof block.completedBlocks === 'number' && block.completedBlocks > 0) {
    return Math.min(effectiveTarget, Math.max(0, block.completedBlocks));
  }
  if (typeof block.partialCredit === 'number' && block.partialCredit > 0) {
    return Math.min(effectiveTarget, block.partialCredit);
  }
  return 0;
}

export function getTotalBaselineFloorBlocks(blocks: BaselineBlock[] | undefined): number {
  if (!blocks || blocks.length === 0) return 0;
  return blocks.reduce((sum, b) => sum + getBaselineSlotTargetBlocks(b), 0);
}

export function getEffectiveScheduledBaselineFloorBlocks(
  blocks: BaselineBlock[] | undefined
): number {
  if (!blocks || blocks.length === 0) return 0;
  return blocks.reduce((sum, b) => sum + getBaselineSlotEffectiveTargetBlocks(b), 0);
}

export function isBaselineSlotEarlyClearanceEligible(block: BaselineBlock): boolean {
  if (typeof block.earlyClearanceEligible === 'boolean') {
    return block.earlyClearanceEligible;
  }
  if (typeof block.supportsEarlyClearance === 'boolean') {
    return block.supportsEarlyClearance;
  }
  return (
    block.category === 'FLASHCARDS_ANATOMY' || block.category === 'FLASHCARDS_COMP'
  );
}

export function isBaselineSlotLateNightBlocked(block: BaselineBlock): boolean {
  if (typeof block.lateNightBlocker === 'boolean') {
    return block.lateNightBlocker;
  }
  return (
    block.category === 'FLASHCARDS_ANATOMY' || block.category === 'FLASHCARDS_COMP'
  );
}

export const DEFAULT_DAILY_AMBITION_DRIP: import('../types/symmetry').DailyAmbitionDripConfig = {
  enabled: true,
  targetBlocksPerDay: 1,
  completedToday: 0,
  preferredSlotIndex: 1,
};

export function isProjectAmbitionDripEligible(
  project:
    | Pick<
        ProjectItem,
        'slot' | 'isAmbitionDrip' | 'isSovereignDrip' | 'category' | 'trackId' | 'subTrack'
      >
    | Partial<ProjectItem>
    | undefined
    | null
): boolean {
  if (!project) return false;
  if (project.isAmbitionDrip || project.isSovereignDrip || project.category === 'sovereign') {
    return true;
  }
  if (project.slot && project.slot !== 1) {
    if (
      project.subTrack === '1B_INDEPENDENT' ||
      project.trackId === 'writing' ||
      project.trackId === 'coding' ||
      project.trackId === 'music' ||
      project.trackId === 'culture'
    ) {
      return true;
    }
  }
  return false;
}

export function isProjectSovereignDrip(
  project:
    | Pick<
        ProjectItem,
        'slot' | 'isAmbitionDrip' | 'isSovereignDrip' | 'category' | 'trackId' | 'subTrack'
      >
    | Partial<ProjectItem>
    | undefined
    | null
): boolean {
  return isProjectAmbitionDripEligible(project);
}

export function getEffectiveDailyAmbitionDrip(
  state: Pick<
    SymmetryState,
    | 'dailyAmbitionDrip'
    | 'dailySovereignDripDone'
    | 'dailySovereignDripTarget'
    | 'sovereignGoldenRuleMode'
  >
): import('../types/symmetry').DailyAmbitionDripConfig {
  const raw = state.dailyAmbitionDrip;
  const target = Math.max(
    1,
    Math.min(
      3,
      Math.round(raw?.targetBlocksPerDay ?? state.dailySovereignDripTarget ?? 1)
    )
  );
  const enabled =
    typeof raw?.enabled === 'boolean'
      ? raw.enabled
      : state.sovereignGoldenRuleMode !== false;
  const completedToday =
    typeof raw?.completedToday === 'number'
      ? Math.max(0, raw.completedToday)
      : state.dailySovereignDripDone
      ? target
      : 0;
  const preferredSlotIndex: 1 | 2 = raw?.preferredSlotIndex === 2 ? 2 : 1;
  return {
    enabled,
    targetBlocksPerDay: target,
    completedToday,
    preferredSlotIndex,
  };
}

export function isTodayExamDay(state: SymmetryState): boolean {
  if (state.preExamTaperActive) return true;
  const todayRow =
    state.pipelineDays?.find((d) => d.isToday) || state.pipelineDays?.[0];
  if (!todayRow) return false;
  const combined = `${todayRow.dayLabel || ''} ${todayRow.modeAndAnchors || ''} ${
    todayRow.fixedEventTimeLabel || ''
  }`;
  return /\bexam\s+day\b/i.test(combined);
}

export function getProjectActiveStartupStep(
  project: Pick<ProjectItem, 'startupStep' | 'blockSubSteps' | 'completedBlocks'>,
  futureOffset = 0
): string {
  if (Array.isArray(project.blockSubSteps) && project.blockSubSteps.length > 0) {
    const idx = Math.min(
      project.blockSubSteps.length - 1,
      Math.max(0, Math.floor(project.completedBlocks || 0) + futureOffset)
    );
    const candidate = project.blockSubSteps[idx];
    if (candidate && candidate.trim()) {
      return candidate.trim();
    }
  }
  return project.startupStep;
}

export function isOpenListItemUnlocked(
  item: Pick<import('../types/symmetry').OpenListItem, 'blockedByTitle'>,
  completedLog: import('../types/symmetry').CompletedDeliverableEntry[] | undefined
): boolean {
  const req = (item.blockedByTitle || '').trim().toLowerCase();
  if (!req) return true;
  if (!Array.isArray(completedLog) || completedLog.length === 0) return false;
  return completedLog.some((entry) => {
    const doneTitle = (entry.title || '').trim().toLowerCase();
    if (!doneTitle) return false;
    return doneTitle === req || doneTitle.includes(req) || req.includes(doneTitle);
  });
}

export function normalizeOpenListArray(
  rawBacklogArray: unknown
): import('../types/symmetry').OpenListItem[] {
  if (!Array.isArray(rawBacklogArray)) return [];
  return rawBacklogArray.map((item: unknown, idx: number) => {
    if (typeof item === 'string') {
      const isDrip = /ambition|sovereign|sextant|symmetryproductivity|novel|triptych/i.test(
        item
      );
      const blocksMatch = item.match(/\((\d+)b/i);
      const totalBlocks = blocksMatch ? Math.max(1, Number(blocksMatch[1])) : 4;
      return {
        id: `proj_open_${idx + 1}`,
        title: item,
        presetType:
          totalBlocks === 8
            ? 'PAPER_8'
            : totalBlocks === 4
            ? 'SLIDES_4'
            : totalBlocks === 2
            ? 'QUICK_2'
            : 'CUSTOM',
        completedBlocks: 0,
        totalBlocks,
        blocksTotal: totalBlocks,
        trackId: isDrip ? 'writing' : 'science',
        subTrack: isDrip ? undefined : '1A_INSTITUTIONAL',
        startupStep: 'Open deliverable and complete 5-minute startup step.',
        nextStepNote: 'Queued in Open List backlog.',
        cognitiveDemand: 'DEEP_SYNTHESIS',
        isAmbitionDrip: isDrip,
        isSovereignDrip: isDrip,
        category: isDrip ? 'sovereign' : 'institutional',
      };
    }
    const obj = (item || {}) as Partial<import('../types/symmetry').OpenListItem> & {
      blocksDone?: number;
    };
    const isDrip = Boolean(
      obj.isAmbitionDrip ||
        obj.isSovereignDrip ||
        obj.category === 'sovereign' ||
        obj.subTrack === '1B_INDEPENDENT' ||
        /sovereign\s+drip|ambition\s+drip/i.test(String(obj.title || ''))
    );
    const totalBlocks =
      typeof obj.totalBlocks === 'number'
        ? obj.totalBlocks
        : typeof obj.blocksTotal === 'number'
        ? obj.blocksTotal
        : 4;
    const rawTrackId = obj.trackId === 'personal' ? 'science' : obj.trackId;
    const blockedByTitle =
      typeof obj.blockedByTitle === 'string' && obj.blockedByTitle.trim()
        ? obj.blockedByTitle.trim()
        : undefined;
    return {
      id: obj.id || `proj_open_${idx + 1}`,
      title: obj.title || `Backlog Deliverable #${idx + 1}`,
      presetType: obj.presetType || 'CUSTOM',
      completedBlocks:
        typeof obj.completedBlocks === 'number'
          ? obj.completedBlocks
          : typeof obj.blocksDone === 'number'
          ? obj.blocksDone
          : 0,
      totalBlocks,
      blocksTotal: totalBlocks,
      trackId: rawTrackId || (isDrip ? 'writing' : 'science'),
      subTrack:
        obj.subTrack === '1A_INSTITUTIONAL' || obj.subTrack === '1B_INDEPENDENT'
          ? obj.subTrack
          : undefined,
      blockedByTitle,
      notes: typeof obj.notes === 'string' ? obj.notes : undefined,
      dueDateLabel: typeof obj.dueDateLabel === 'string' ? obj.dueDateLabel : undefined,
      launchUrl: typeof obj.launchUrl === 'string' ? obj.launchUrl : undefined,
      autoLaunchUrl: typeof obj.autoLaunchUrl === 'boolean' ? obj.autoLaunchUrl : undefined,
      blockSubSteps: Array.isArray(obj.blockSubSteps) ? obj.blockSubSteps : undefined,
      startupStep:
        obj.startupStep || 'Open deliverable and complete 5-minute startup step.',
      nextStepNote: obj.nextStepNote || 'Queued in Open List backlog.',
      cognitiveDemand: obj.cognitiveDemand || 'DEEP_SYNTHESIS',
      isAmbitionDrip: isDrip,
      isSovereignDrip: isDrip,
      category: obj.category || (isDrip ? 'sovereign' : 'institutional'),
    };
  });
}

export function getEffectiveEveningCategoryCards(
  recharge: SymmetryState['recharge']
): import('../types/symmetry').EveningCategoryCardConfig[] {
  const cat6Fallback: import('../types/symmetry').FluidCategoryConfig =
    recharge.fluidCategories?.CAT6_CULTURE ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories?.CAT6_CULTURE || {
      label: '6. Culture & Language',
      activeTitle: 'Spoken Audio, Foreign Cinema & Culinary Prep',
      subtitle: 'Low-pressure cultural & spoken language immersion — zero SRS flashcards.',
      startupStep:
        '5m spoken audio lesson, foreign music/cinema, or culinary prep — zero SRS flashcards',
    };

  const defaultCat6Card: import('../types/symmetry').EveningCategoryCardConfig = {
    id: 'CAT6_CULTURE',
    slotNumber: 6,
    categoryName: cat6Fallback.label.replace(/^6\.\s*/, ''),
    subtitle: cat6Fallback.subtitle,
    behavior: 'FLUID',
    trackMode: 'SINGLE',
    activeTitle: cat6Fallback.activeTitle,
    startupPrompt: cat6Fallback.startupStep,
    backlogQueue: [],
    fiveMinStarts: 0,
    unlockedViaCheckIn: false,
    hidden: false,
    legacyCategoryKey: 'CAT6_CULTURE',
    fluidKey: 'CAT6_CULTURE',
    launchUrl: cat6Fallback.launchUrl,
    autoLaunchUrl: cat6Fallback.autoLaunchUrl,
  };

  if (Array.isArray(recharge.categoryCards) && recharge.categoryCards.length > 0) {
    const hasCat6 = recharge.categoryCards.some(
      (c) => c.id === 'CAT6_CULTURE' || c.legacyCategoryKey === 'CAT6_CULTURE'
    );
    return hasCat6
      ? recharge.categoryCards
      : [...recharge.categoryCards, defaultCat6Card];
  }
  const cat1 =
    recharge.fluidCategories?.CAT1_MUSIC ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT1_MUSIC;
  const cat4 =
    recharge.fluidCategories?.CAT4_COMFORT ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT4_COMFORT;
  const s2 =
    recharge.stickySlots?.CAT2_MAKER ||
    DEFAULT_SYMMETRY_STATE.recharge.stickySlots.CAT2_MAKER;
  const s3a =
    recharge.stickySlots?.['3A_FICTION'] ||
    DEFAULT_SYMMETRY_STATE.recharge.stickySlots['3A_FICTION'];
  const s3b =
    recharge.stickySlots?.['3B_NONFICTION'] ||
    DEFAULT_SYMMETRY_STATE.recharge.stickySlots['3B_NONFICTION'];
  const s3c =
    recharge.stickySlots?.['3C_VIDEO'] ||
    DEFAULT_SYMMETRY_STATE.recharge.stickySlots['3C_VIDEO'];
  const s5 =
    recharge.stickySlots?.CAT5_GAMING ||
    DEFAULT_SYMMETRY_STATE.recharge.stickySlots.CAT5_GAMING;

  return [
    {
      id: 'CAT1_MUSIC',
      slotNumber: 1,
      categoryName: cat1.label.replace(/^1\.\s*/, ''),
      subtitle: cat1.subtitle,
      behavior: 'FLUID',
      trackMode: 'SINGLE',
      activeTitle: cat1.activeTitle,
      startupPrompt: cat1.startupStep,
      backlogQueue: [],
      fiveMinStarts: 0,
      unlockedViaCheckIn: false,
      hidden: false,
      legacyCategoryKey: 'CAT1_MUSIC',
      fluidKey: 'CAT1_MUSIC',
      launchUrl: cat1.launchUrl,
      autoLaunchUrl: cat1.autoLaunchUrl,
    },
    {
      id: 'CAT2_MAKER',
      slotNumber: 2,
      categoryName: s2.label.replace(/\s*\[Sticky\]$/i, ''),
      subtitle: 'Hands-on diagnostic, build, or tactile progression.',
      behavior: 'STICKY',
      trackMode: 'SINGLE',
      activeTitle: s2.activeTitle,
      startupPrompt: s2.startupStep,
      backlogQueue: [...(s2.backlogQueue || [])],
      fiveMinStarts: s2.fiveMinStarts || 0,
      unlockedViaCheckIn: Boolean(s2.unlockedViaCheckIn),
      hidden: false,
      legacyCategoryKey: 'CAT2_MAKER',
      stickyKey: 'CAT2_MAKER',
      launchUrl: s2.launchUrl,
      autoLaunchUrl: s2.autoLaunchUrl,
    },
    {
      id: 'CAT3_MEDIA',
      slotNumber: 3,
      categoryName: 'Reading & Media',
      subtitle: 'Parallel sticky tracks across Fiction, Nonfiction, and Watch.',
      behavior: 'STICKY',
      trackMode: 'TRIPLE',
      activeTitle: s3a.activeTitle,
      startupPrompt: s3a.startupStep,
      backlogQueue: [...(s3a.backlogQueue || [])],
      fiveMinStarts: s3a.fiveMinStarts || 0,
      unlockedViaCheckIn: Boolean(s3a.unlockedViaCheckIn),
      activeSubTrackId: recharge.activeMediaTab || '3A_FICTION',
      subTracks: [
        {
          id: '3A_FICTION',
          label: s3a.label.replace(/\s*\[Sticky\]$/i, ''),
          activeTitle: s3a.activeTitle,
          startupPrompt: s3a.startupStep,
          backlogQueue: [...(s3a.backlogQueue || [])],
          fiveMinStarts: s3a.fiveMinStarts || 0,
          unlockedViaCheckIn: Boolean(s3a.unlockedViaCheckIn),
          speedControl: true,
          launchUrl: s3a.launchUrl,
          autoLaunchUrl: s3a.autoLaunchUrl,
        },
        {
          id: '3B_NONFICTION',
          label: s3b.label.replace(/\s*\[Sticky\]$/i, ''),
          activeTitle: s3b.activeTitle,
          startupPrompt: s3b.startupStep,
          backlogQueue: [...(s3b.backlogQueue || [])],
          fiveMinStarts: s3b.fiveMinStarts || 0,
          unlockedViaCheckIn: Boolean(s3b.unlockedViaCheckIn),
          launchUrl: s3b.launchUrl,
          autoLaunchUrl: s3b.autoLaunchUrl,
        },
        {
          id: '3C_VIDEO',
          label: s3c.label.replace(/\s*\[Sticky\]$/i, ''),
          activeTitle: s3c.activeTitle,
          startupPrompt: s3c.startupStep,
          backlogQueue: [...(s3c.backlogQueue || [])],
          fiveMinStarts: s3c.fiveMinStarts || 0,
          unlockedViaCheckIn: Boolean(s3c.unlockedViaCheckIn),
          launchUrl: s3c.launchUrl,
          autoLaunchUrl: s3c.autoLaunchUrl,
        },
      ],
      hidden: false,
      legacyCategoryKey: 'CAT3_MEDIA',
    },
    {
      id: 'CAT4_COMFORT',
      slotNumber: 4,
      categoryName: cat4.label.replace(/^4\.\s*/, ''),
      subtitle: cat4.subtitle,
      behavior: 'FLUID',
      trackMode: 'SINGLE',
      activeTitle: cat4.activeTitle,
      startupPrompt: cat4.startupStep,
      backlogQueue: [],
      fiveMinStarts: 0,
      unlockedViaCheckIn: false,
      hidden: false,
      legacyCategoryKey: 'CAT4_COMFORT',
      fluidKey: 'CAT4_COMFORT',
      launchUrl: cat4.launchUrl,
      autoLaunchUrl: cat4.autoLaunchUrl,
    },
    {
      id: 'CAT5_GAMING',
      slotNumber: 5,
      categoryName: s5.label.replace(/\s*\[Sticky\]$/i, ''),
      subtitle: 'Focused interactive objective with 20m/40m check-in pacing.',
      behavior: 'STICKY',
      trackMode: 'SINGLE',
      activeTitle: s5.activeTitle,
      startupPrompt: s5.startupStep,
      backlogQueue: [...(s5.backlogQueue || [])],
      fiveMinStarts: s5.fiveMinStarts || 0,
      unlockedViaCheckIn: Boolean(s5.unlockedViaCheckIn),
      hidden: false,
      legacyCategoryKey: 'CAT5_GAMING',
      stickyKey: 'CAT5_GAMING',
      launchUrl: s5.launchUrl,
      autoLaunchUrl: s5.autoLaunchUrl,
    },
    defaultCat6Card,
  ];
}

export function getActiveFocusProject(
  state: SymmetryState
): ProjectItem | undefined {
  const lockMode =
    state.flexibilityTuning?.closedListLockMode || 'STRICT_SERIALIZED';
  const activeSlot =
    state.activeDualSlotNumber ??
    state.flexibilityTuning?.activeDualSlotNumber ??
    state.flexibilityTuning?.activeFocusSlot ??
    1;
  if (lockMode === 'DUAL_SLOT' && activeSlot === 2 && state.projectQueue[1]) {
    return state.projectQueue[1];
  }
  return state.projectQueue[0];
}

export function getActiveAmbitionDripProject(
  state: SymmetryState
): ProjectItem | undefined {
  const queue = state.projectQueue || [];
  if (queue.length === 0) return undefined;
  const dripCfg = getEffectiveDailyAmbitionDrip(state);
  const preferredItem = queue[dripCfg.preferredSlotIndex];
  if (
    preferredItem &&
    isProjectAmbitionDripEligible(preferredItem) &&
    preferredItem.completedBlocks < preferredItem.totalBlocks
  ) {
    return preferredItem;
  }
  const altIndex = dripCfg.preferredSlotIndex === 1 ? 2 : 1;
  const altItem = queue[altIndex];
  if (
    altItem &&
    isProjectAmbitionDripEligible(altItem) &&
    altItem.completedBlocks < altItem.totalBlocks
  ) {
    return altItem;
  }
  const eligible = queue.filter((p) => isProjectAmbitionDripEligible(p));
  if (eligible.length === 0) return undefined;
  return (
    eligible.find((p) => p.completedBlocks < p.totalBlocks) || eligible[0]
  );
}

export function getActiveSovereignDripProject(
  state: SymmetryState
): ProjectItem | undefined {
  return getActiveAmbitionDripProject(state);
}

export function getActiveBlockDurationsSeconds(state: SymmetryState): {
  startupSeconds: number;
  momentumSeconds: number;
  totalMinutes: number;
  startupMinutes: number;
  momentumMinutes: number;
  startupLabel: string;
  momentumLabel: string;
  multiplier: ElasticBlockMultiplier;
  blockCredit: ElasticBlockMultiplier;
} {
  const multiplier: ElasticBlockMultiplier =
    state.timer.elasticMultiplier === 0.5 || state.timer.elasticMultiplier === 2.0
      ? state.timer.elasticMultiplier
      : 1.0;

  if (multiplier === 0.5) {
    return {
      startupSeconds: 180,
      momentumSeconds: 420,
      totalMinutes: 10,
      startupMinutes: 3,
      momentumMinutes: 7,
      startupLabel: '3m Startup',
      momentumLabel: '7m Momentum',
      multiplier: 0.5,
      blockCredit: 0.5,
    };
  }

  if (multiplier === 2.0) {
    return {
      startupSeconds: 300,
      momentumSeconds: 2100,
      totalMinutes: 40,
      startupMinutes: 5,
      momentumMinutes: 35,
      startupLabel: '5m Startup',
      momentumLabel: '35m Momentum',
      multiplier: 2.0,
      blockCredit: 2.0,
    };
  }

  const preset = state.flexibilityTuning?.blockCadencePreset || '20_5_15';
  if (
    preset === '15_3_12' ||
    preset === '15M_3_12' ||
    preset === 'CADENCE_15_3_12'
  ) {
    return {
      startupSeconds: 180,
      momentumSeconds: 720,
      totalMinutes: 15,
      startupMinutes: 3,
      momentumMinutes: 12,
      startupLabel: '3m Startup',
      momentumLabel: '12m Momentum',
      multiplier: 1.0,
      blockCredit: 1.0,
    };
  }
  if (
    preset === '25_5_20' ||
    preset === '25M_5_20' ||
    preset === 'CADENCE_25_5_20'
  ) {
    return {
      startupSeconds: 300,
      momentumSeconds: 1200,
      totalMinutes: 25,
      startupMinutes: 5,
      momentumMinutes: 20,
      startupLabel: '5m Startup',
      momentumLabel: '20m Momentum',
      multiplier: 1.0,
      blockCredit: 1.0,
    };
  }

  return {
    startupSeconds: 300,
    momentumSeconds: 900,
    totalMinutes: 20,
    startupMinutes: 5,
    momentumMinutes: 15,
    startupLabel: '5m Startup',
    momentumLabel: '15m Momentum',
    multiplier: 1.0,
    blockCredit: 1.0,
  };
}

export function getShrunkStartupPrompt(
  basePrompt: string,
  taskTitleOrType: string,
  taskTypeOrLevel?: ActiveTaskType | StartupShrinkLevel,
  maybeLevel?: StartupShrinkLevel
): string {
  const level: StartupShrinkLevel =
    typeof maybeLevel === 'number'
      ? maybeLevel
      : typeof taskTypeOrLevel === 'number'
      ? taskTypeOrLevel
      : 1;
  const taskType: ActiveTaskType =
    typeof taskTypeOrLevel === 'string'
      ? taskTypeOrLevel
      : (taskTitleOrType as ActiveTaskType) || 'PROJECT';

  if (level === 2) {
    if (taskType === 'FLASHCARDS') {
      return 'Just open the deck on screen and read 1 single card without grading speed.';
    }
    if (taskType === 'READING') {
      return 'Just open the chapter/document on screen and write one messy header or read 1 paragraph.';
    }
    return 'Just open the document/deck on screen and write one messy header or read 1 card.';
  }
  if (level === 3) {
    return 'Take 1 deep breath, put hands on keyboard, and look at the current paragraph for 60 seconds.';
  }
  return basePrompt;
}

/**
 * Logical Day-Rollover Boundary (Default 4:00 AM, adjustable 0..23):
 * Any local hour < rolloverHour counts as part of the previous logical day.
 */
export function formatRolloverHourLabel(rolloverHour: number = 4): string {
  const clamped = Math.max(0, Math.min(23, Math.round(rolloverHour)));
  if (clamped === 0) return '12:00 AM';
  if (clamped < 12) return `${clamped}:00 AM`;
  if (clamped === 12) return '12:00 PM';
  return `${clamped - 12}:00 PM`;
}

export function getLogicalDayKey(
  date: Date = new Date(),
  rolloverHour: number = 4
): string {
  const clampedHour = Math.max(0, Math.min(23, Math.round(rolloverHour)));
  const shifted = new Date(date.getTime());
  if (shifted.getHours() < clampedHour) {
    shifted.setDate(shifted.getDate() - 1);
  }
  const y = shifted.getFullYear();
  const m = String(shifted.getMonth() + 1).padStart(2, '0');
  const d = String(shifted.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function isPre4amRolloverWindow(
  date: Date = new Date(),
  rolloverHour: number = 4
): boolean {
  const clampedHour = Math.max(0, Math.min(23, Math.round(rolloverHour)));
  return date.getHours() < clampedHour;
}

export interface ExamProximityInfo {
  isWithin3Days: boolean;
  daysToNov12: number;
  daysToDec8: number;
  nearestExamLabel: string;
  daysRemaining: number;
  examLabel: string;
  daysUntil: number;
}

export function getPreExamTaperSuggestion(date: Date = new Date()): ExamProximityInfo {
  const todayMidnight = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  ).getTime();
  const nov12Midnight = new Date(date.getFullYear(), 10, 12).getTime();
  const dec8Midnight = new Date(date.getFullYear(), 11, 8).getTime();

  const daysToNov12 = Math.round((nov12Midnight - todayMidnight) / (1000 * 60 * 60 * 24));
  const daysToDec8 = Math.round((dec8Midnight - todayMidnight) / (1000 * 60 * 60 * 24));

  const withinNov12 = daysToNov12 >= 0 && daysToNov12 <= 3;
  const withinDec8 = daysToDec8 >= 0 && daysToDec8 <= 3;
  const isWithin3Days = withinNov12 || withinDec8;

  const useNov12 = daysToNov12 >= 0 || daysToDec8 < 0;
  const label = useNov12 ? 'Nov 12: Anatomy Exam' : 'Dec 8: Comp Exam';
  const days = useNov12 ? daysToNov12 : daysToDec8;
  return {
    isWithin3Days,
    daysToNov12,
    daysToDec8,
    nearestExamLabel: label,
    daysRemaining: days,
    examLabel: label,
    daysUntil: days,
  };
}

export function createLogTimestamp(date: Date = new Date()): string {
  return date.toISOString();
}

const initialLogicalDay = getLogicalDayKey();

export const DEFAULT_HOUSE_SHELTER: import('../types/symmetry').RoadmapHouseStrip = {
  title: 'Relationships, Community & Service (Non-Quota Roof)',
  subtitle:
    'Family, volunteering, friendships, and live cultural outings protected outside solo block checklists.',
  horizonNotes: [
    {
      horizon: 1,
      horizonLabel: 'Horizon 1 (Immediate)',
      note: 'Protected evening shutdowns, shared meals, and unhurried presence.',
    },
    {
      horizon: 2,
      horizonLabel: 'Horizon 2 (Seasonal)',
      note: 'Recurring community commitments, volunteering, and close friendships.',
    },
    {
      horizon: 3,
      horizonLabel: 'Horizon 3 (Annual)',
      note: 'Live cultural outings, theatre/music nights, and seasonal gatherings.',
    },
    {
      horizon: 4,
      horizonLabel: 'Horizon 4 (Multi-Year)',
      note: 'Long-arc family stewardship, mentorship, and civic contribution.',
    },
  ],
};

export const DEFAULT_HOUSE_FOUNDATION: import('../types/symmetry').RoadmapHouseStrip = {
  title: 'Physical Vitality (Non-Quota Foundation)',
  subtitle:
    'Sleep/shutdown adherence, acute somatic recovery, and long-term conditioning — zero block quotas.',
  statusSummary: 'Sleep & Hard Shutdown Protected • Somatic Buffers Active',
  horizonNotes: [
    {
      horizon: 1,
      horizonLabel: 'Horizon 1 (Daily)',
      note: 'Consistent sleep window & hard end-of-shift shutdown adherence.',
    },
    {
      horizon: 2,
      horizonLabel: 'Horizon 2 (Acute)',
      note: 'Somatic reset buffers (breathing pace, hydration, walks, compression).',
    },
    {
      horizon: 3,
      horizonLabel: 'Horizon 3 (Seasonal)',
      note: 'Steady aerobic base, mobility, and sustainable strength conditioning.',
    },
    {
      horizon: 4,
      horizonLabel: 'Horizon 4 (Multi-Decade)',
      note: 'Long-term metabolic resilience, posture, and physical longevity.',
    },
  ],
};

export const DEFAULT_HOUSE_ROADMAP_TRACKS: import('../types/symmetry').RoadmapTrack[] = [
  {
    id: 'science',
    name: 'Major Track 1: Primary Vocation & Research',
    archetypeRole: '1A Institutional + 1B Independent Vocation',
    categoryLabel: 'MAJOR CORE TRACK',
    isSandbox: false,
    activeThisWeek: true,
    inputBlocksCredited: 14,
    inputWeeklyTarget: 24,
    outputBlocksCredited: 6,
    outputWeeklyTarget: 12,
    subTrack1ABlocksCredited: 5,
    subTrack1BBlocksCredited: 1,
    rungs: [
      {
        rungNumber: 1,
        label: 'Horizon 1 — Daily Core Intake',
        description: 'Baseline recall sprints & primary technical reading blocks',
        ledgerType: 'INPUT',
        completedBlocks: 10,
        targetBlocks: 16,
      },
      {
        rungNumber: 2,
        label: 'Horizon 2 — Mechanism & Quantitative Synthesis',
        description: 'Problem derivations, models, and condensed reference notes',
        ledgerType: 'INPUT',
        completedBlocks: 4,
        targetBlocks: 8,
      },
      {
        rungNumber: 3,
        label: 'Horizon 3 — 1A Institutional Deliverables',
        description: 'Serialized proposals, lab reports, and presentation builds',
        ledgerType: 'OUTPUT',
        completedBlocks: 5,
        targetBlocks: 8,
      },
      {
        rungNumber: 4,
        label: 'Horizon 4 — 1B Independent Research & Releases',
        description: 'Submitted manuscripts, open-source releases, and independent work',
        ledgerType: 'OUTPUT',
        completedBlocks: 1,
        targetBlocks: 4,
      },
    ],
  },
  {
    id: 'writing',
    name: 'Major Track 2: Writing & Authorship',
    archetypeRole: 'Serialized Essays, Books & Creative Works',
    categoryLabel: 'MAJOR CORE TRACK',
    isSandbox: false,
    activeThisWeek: true,
    inputBlocksCredited: 8,
    inputWeeklyTarget: 12,
    outputBlocksCredited: 7,
    outputWeeklyTarget: 12,
    rungs: [
      {
        rungNumber: 1,
        label: 'Horizon 1 — Literary & Nonfiction Intake',
        description: 'Evening Category 3A Fiction, 3B Nonfiction & 3C Video synthesis',
        ledgerType: 'INPUT',
        completedBlocks: 5,
        targetBlocks: 8,
      },
      {
        rungNumber: 2,
        label: 'Horizon 2 — Architecture & Worldbuilding Notes',
        description: 'Structural outlines, premise ledgers, and thematic notes',
        ledgerType: 'INPUT',
        completedBlocks: 3,
        targetBlocks: 4,
      },
      {
        rungNumber: 3,
        label: 'Horizon 3 — Active Manuscript Drafting',
        description: 'Daily Ambition Drip & serialized drafting blocks',
        ledgerType: 'OUTPUT',
        completedBlocks: 5,
        targetBlocks: 8,
      },
      {
        rungNumber: 4,
        label: 'Horizon 4 — Edition Completion & Submissions',
        description: 'Finalized editions, publications, and completed manuscripts',
        ledgerType: 'OUTPUT',
        completedBlocks: 2,
        targetBlocks: 4,
      },
    ],
  },
  {
    id: 'coding',
    name: 'Sandbox Track 1: Engineering, Software & Tactile Craft',
    archetypeRole: 'Hardware Diagnostics, CAD/3D Printing & Code Utilities',
    categoryLabel: 'ZERO-QUOTA SANDBOX',
    isSandbox: true,
    activeThisWeek: true,
    inputBlocksCredited: 2,
    inputWeeklyTarget: 0,
    outputBlocksCredited: 4,
    outputWeeklyTarget: 0,
    rungs: [
      {
        rungNumber: 1,
        label: 'Horizon 1 — Schematics & Technical Docs',
        description: 'Hardware/software reference docs & architecture inspection',
        ledgerType: 'INPUT',
        completedBlocks: 2,
        targetBlocks: 4,
      },
      {
        rungNumber: 2,
        label: 'Horizon 2 — 5m Bench & Diagnostic Steps',
        description: 'Evening Category 2 Maker & Category 5 tactical sessions',
        ledgerType: 'OUTPUT',
        completedBlocks: 2,
        targetBlocks: 4,
      },
      {
        rungNumber: 3,
        label: 'Horizon 3 — Utility Builds & Hardware Repairs',
        description: 'Iterative software tools, CAD brackets, and printer calibration',
        ledgerType: 'OUTPUT',
        completedBlocks: 1,
        targetBlocks: 4,
      },
      {
        rungNumber: 4,
        label: 'Horizon 4 — Shipped Tools & Working Hardware',
        description: 'Live web utilities, tagged packages, and finished builds',
        ledgerType: 'OUTPUT',
        completedBlocks: 1,
        targetBlocks: 2,
      },
    ],
  },
  {
    id: 'music',
    name: 'Sandbox Track 2: Music & Acoustic Practice',
    archetypeRole: 'Unpressured Multi-Instrument Play',
    categoryLabel: 'ZERO-QUOTA SANDBOX',
    isSandbox: true,
    activeThisWeek: false,
    inputBlocksCredited: 2,
    inputWeeklyTarget: 0,
    outputBlocksCredited: 2,
    outputWeeklyTarget: 0,
    rungs: [
      {
        rungNumber: 1,
        label: 'Horizon 1 — Active Listening & Repertoire',
        description: 'Arrangement listening & harmonic ear familiarity',
        ledgerType: 'INPUT',
        completedBlocks: 2,
        targetBlocks: 4,
      },
      {
        rungNumber: 2,
        label: 'Horizon 2 — 5m Cold Song Playthroughs',
        description: 'Evening Category 1 fluid instrument sessions (no DAW/drills)',
        ledgerType: 'OUTPUT',
        completedBlocks: 2,
        targetBlocks: 4,
      },
      {
        rungNumber: 3,
        label: 'Horizon 3 — Full-Track Memory Continuity',
        description: 'Relaxed start-to-finish song playthroughs',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 2,
      },
      {
        rungNumber: 4,
        label: 'Horizon 4 — Acoustic Capture & Shared Play',
        description: 'Simple one-take acoustic recordings or live jam sessions',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 2,
      },
    ],
  },
  {
    id: 'culture',
    name: 'Sandbox Track 3: Foreign Culture & Language',
    archetypeRole: 'Spoken Audio, Cinema & Culinary Immersion',
    categoryLabel: 'ZERO-QUOTA SANDBOX',
    isSandbox: true,
    activeThisWeek: false,
    inputBlocksCredited: 1,
    inputWeeklyTarget: 0,
    outputBlocksCredited: 1,
    outputWeeklyTarget: 0,
    rungs: [
      {
        rungNumber: 1,
        label: 'Horizon 1 — Spoken Audio & Ear Immersion',
        description: '5m spoken audio lessons on walks (zero SRS flashcard competition)',
        ledgerType: 'INPUT',
        completedBlocks: 1,
        targetBlocks: 4,
      },
      {
        rungNumber: 2,
        label: 'Horizon 2 — Foreign Cinema, Music & Idiom',
        description: 'Evening Category 6 cultural media & listening intake',
        ledgerType: 'INPUT',
        completedBlocks: 0,
        targetBlocks: 4,
      },
      {
        rungNumber: 3,
        label: 'Horizon 3 — Culinary & Conversational Practice',
        description: 'Regional dish prep and spoken phrase recall',
        ledgerType: 'OUTPUT',
        completedBlocks: 1,
        targetBlocks: 4,
      },
      {
        rungNumber: 4,
        label: 'Horizon 4 — Travel & Real-World Fluency',
        description: 'Unscripted conversation & lived cultural immersion',
        ledgerType: 'OUTPUT',
        completedBlocks: 0,
        targetBlocks: 2,
      },
    ],
  },
];

const LEGACY_TRACK_NAMES = new Set([
  'Scientist & Lab Builder',
  'Science / Clinical',
  'Primary Domain & Study',
  'Technical Architecture',
  'Core Study & Mastery',
  'Track 1 — Primary Domain',
  'Philosopher & Author',
  'Writing / Literature',
  'Writing & Synthesis',
  'Documentation & Specs',
  'Synthesis & Writing',
  'Track 2 — Secondary Output',
  'Coder/Maker & AveryCorp',
  'Coding / Hardware',
  'Side Projects & Craft',
  'Hardware & Tooling',
  'Applied Sandbox',
  'Sandbox A — Exploration',
  'Musician',
  'Music',
  'Music & Creative Play',
  'Music & Acoustic Play',
  'Sandbox B — Creative Play',
]);

export function migrateRoadmapTracksToHouseTopology(
  rawTracks: import('../types/symmetry').RoadmapTrack[] | undefined
): import('../types/symmetry').RoadmapTrack[] {
  if (!Array.isArray(rawTracks) || rawTracks.length === 0) {
    return DEFAULT_HOUSE_ROADMAP_TRACKS.map((t) => ({
      ...t,
      rungs: t.rungs.map((r) => ({ ...r })),
    }));
  }

  const byId = new Map<string, import('../types/symmetry').RoadmapTrack>();
  for (const t of rawTracks) {
    if (t && t.id) {
      byId.set(t.id, t);
    }
  }

  return DEFAULT_HOUSE_ROADMAP_TRACKS.map((defTrack) => {
    const existing = byId.get(defTrack.id);
    if (!existing) {
      return {
        ...defTrack,
        rungs: defTrack.rungs.map((r) => ({ ...r })),
      };
    }
    const shouldUpgradeName =
      !existing.name || LEGACY_TRACK_NAMES.has(existing.name.trim());
    const resolvedOutput =
      typeof existing.outputBlocksCredited === 'number'
        ? existing.outputBlocksCredited
        : defTrack.outputBlocksCredited;
    const sub1A =
      defTrack.id === 'science'
        ? typeof existing.subTrack1ABlocksCredited === 'number'
          ? existing.subTrack1ABlocksCredited
          : Math.max(0, resolvedOutput - (existing.subTrack1BBlocksCredited || 0))
        : undefined;
    const sub1B =
      defTrack.id === 'science'
        ? typeof existing.subTrack1BBlocksCredited === 'number'
          ? existing.subTrack1BBlocksCredited
          : 0
        : undefined;

    return {
      ...defTrack,
      ...existing,
      name: shouldUpgradeName ? defTrack.name : existing.name,
      categoryLabel: defTrack.isSandbox ? 'ZERO-QUOTA SANDBOX' : 'MAJOR CORE TRACK',
      isSandbox: defTrack.isSandbox,
      subTrack1ABlocksCredited: sub1A,
      subTrack1BBlocksCredited: sub1B,
      rungs:
        Array.isArray(existing.rungs) && existing.rungs.length === 4
          ? existing.rungs
          : defTrack.rungs.map((r) => ({ ...r })),
    };
  });
}

const DEFAULT_OPEN_LIST_BACKLOG: SymmetryState['openListBacklog'] = [
  {
    id: 'open_1',
    title: 'Lab Report #4 (Due Nov 24)',
    presetType: 'PAPER_8',
    completedBlocks: 0,
    totalBlocks: 8,
    blocksTotal: 8,
    trackId: 'science',
    subTrack: '1A_INSTITUTIONAL',
    startupStep:
      'Import raw measurement tables from Double Lab and plot baseline calibration curves.',
    nextStepNote: 'Promotes after Practicum Proposal completes.',
    cognitiveDemand: 'DEEP_SYNTHESIS',
    isAmbitionDrip: false,
    isSovereignDrip: false,
    category: 'institutional',
  },
  {
    id: 'open_2',
    title: 'Debut Science Fiction Novel — Premise & Worldbuilding Sandbox',
    presetType: 'PAPER_8',
    completedBlocks: 0,
    totalBlocks: 8,
    blocksTotal: 8,
    trackId: 'writing',
    blockedByTitle: 'A Symmetrical Triptych: Edition 4 (Completion & Submissions)',
    notes: 'Intra-track prerequisite lock until Edition 4 submissions wrap.',
    startupStep:
      'Open worldbuilding ledger and draft 1 scene beat or premise paragraph.',
    nextStepNote:
      'Locked until "A Symmetrical Triptych: Edition 4 (Completion & Submissions)" is 100%.',
    cognitiveDemand: 'DEEP_SYNTHESIS',
    isAmbitionDrip: true,
    isSovereignDrip: true,
    category: 'sovereign',
  },
  {
    id: 'open_3',
    title: 'Practicum Project Phase 1: Coding, Data Pipeline & Figures',
    presetType: 'PAPER_8',
    completedBlocks: 0,
    totalBlocks: 8,
    blocksTotal: 8,
    trackId: 'science',
    subTrack: '1A_INSTITUTIONAL',
    startupStep:
      'Initialize practicum analysis repository and run baseline dataset ingestion script.',
    nextStepNote: 'Scheduled after Lab Report #4.',
    cognitiveDemand: 'DEEP_SYNTHESIS',
    isAmbitionDrip: false,
    isSovereignDrip: false,
    category: 'institutional',
  },
];

const DEFAULT_COMPLETED_DELIVERABLES: SymmetryState['completedDeliverablesLog'] = [
  {
    id: 'arch_win_1',
    title: 'gm.averykarlin.org 5-Module Cockpit',
    trackId: 'coding',
    presetType: 'CUSTOM',
    totalBlocks: 6,
    blockCount: 6,
    blocksCompleted: 6,
    date: '2026-11-09',
    completedDate: '2026-11-09',
    completedAt: '2026-11-09',
  },
  {
    id: 'arch_win_2',
    title: 'SymmetryProductivity v1.0 Live',
    trackId: 'coding',
    presetType: 'CUSTOM',
    totalBlocks: 3,
    blockCount: 3,
    blocksCompleted: 3,
    date: '2026-11-09',
    completedDate: '2026-11-09',
    completedAt: '2026-11-09',
  },
  {
    id: 'arch_win_3',
    title: '3 Revised Academic Papers Submitted',
    trackId: 'science',
    presetType: 'CUSTOM',
    totalBlocks: 3,
    blockCount: 3,
    blocksCompleted: 3,
    date: '2026-11-08',
    completedDate: '2026-11-08',
    completedAt: '2026-11-08',
  },
  {
    id: 'arch_win_4',
    title: 'sextant-core v0.1.0 + Zenodo DOI',
    trackId: 'coding',
    presetType: 'CUSTOM',
    totalBlocks: 2,
    blockCount: 2,
    blocksCompleted: 2,
    date: '2026-11-08',
    completedDate: '2026-11-08',
    completedAt: '2026-11-08',
  },
  {
    id: 'arch_win_5',
    title: 'Master CV Update',
    trackId: 'science',
    presetType: 'QUICK_2',
    totalBlocks: 2,
    blockCount: 2,
    blocksCompleted: 2,
    date: '2026-11-07',
    completedDate: '2026-11-07',
    completedAt: '2026-11-07',
  },
  {
    id: 'arch_win_6',
    title: 'Anatomy Slide Decks #1–#4 [16/16]',
    trackId: 'science',
    presetType: 'SLIDES_4',
    totalBlocks: 16,
    blockCount: 16,
    blocksCompleted: 16,
    date: '2026-11-06',
    completedDate: '2026-11-06',
    completedAt: '2026-11-06',
  },
];

export const DEFAULT_TODAY_BLOCK_LOG: TodayBlockLogEntry[] = [];

export function buildDefault90DayHistory(
  anchorLogicalDay: string = initialLogicalDay
): DailyHistoryEntry[] {
  const parts = anchorLogicalDay.split('-').map(Number);
  const baseDate =
    parts.length === 3 && !parts.some(Number.isNaN)
      ? new Date(parts[0], parts[1] - 1, parts[2], 12, 0, 0)
      : new Date();

  const entries: DailyHistoryEntry[] = [];
  for (let offset = 89; offset >= 0; offset--) {
    const d = new Date(baseDate.getTime());
    d.setDate(d.getDate() - offset);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateKey = `${y}-${m}-${day}`;

    if (offset === 0) {
      entries.push({
        logicalDate: dateKey,
        mode: 'TAPER',
        blocksCompleted: 0,
        inputBlocks: 0,
        outputBlocks: 0,
        eveningSessions: 0,
      });
      continue;
    }

    // Deterministic 7-day cycle strictly honoring <= 2 consecutive Surge days
    const cycle = offset % 7;
    if (cycle === 0) {
      entries.push({
        logicalDate: dateKey,
        mode: 'CRUISE',
        blocksCompleted: 12,
        inputBlocks: 6,
        outputBlocks: 6,
        eveningSessions: 2,
      });
    } else if (cycle === 1) {
      entries.push({
        logicalDate: dateKey,
        mode: 'TAPER',
        blocksCompleted: 8,
        inputBlocks: 5,
        outputBlocks: 3,
        eveningSessions: 2,
      });
    } else if (cycle === 2) {
      entries.push({
        logicalDate: dateKey,
        mode: 'SURGE',
        blocksCompleted: 14,
        inputBlocks: 7,
        outputBlocks: 7,
        eveningSessions: 1,
      });
    } else if (cycle === 3) {
      entries.push({
        logicalDate: dateKey,
        mode: 'SURGE',
        blocksCompleted: 15,
        inputBlocks: 7,
        outputBlocks: 8,
        eveningSessions: 2,
      });
    } else if (cycle === 4) {
      entries.push({
        logicalDate: dateKey,
        mode: 'CRUISE',
        blocksCompleted: 11,
        inputBlocks: 6,
        outputBlocks: 5,
        eveningSessions: 2,
      });
    } else if (cycle === 5) {
      entries.push({
        logicalDate: dateKey,
        mode: 'EVENING_RECHARGE',
        blocksCompleted: 9,
        inputBlocks: 5,
        outputBlocks: 4,
        eveningSessions: 3,
      });
    } else {
      entries.push({
        logicalDate: dateKey,
        mode: offset % 14 === 6 ? 'TAPER' : 'CRUISE',
        blocksCompleted: offset % 14 === 6 ? 8 : 12,
        inputBlocks: offset % 14 === 6 ? 4 : 6,
        outputBlocks: offset % 14 === 6 ? 4 : 6,
        eveningSessions: 2,
      });
    }
  }
  return entries;
}

export const DEFAULT_DAILY_HISTORY: DailyHistoryEntry[] =
  buildDefault90DayHistory(initialLogicalDay);

const DEFAULT_BASELINE_SLOTS: BaselineBlock[] = [
  {
    id: 'floor_fc_anatomy',
    title: 'Anatomy Cards (Pre-Exam 50/50 Floor)',
    category: 'FLASHCARDS_ANATOMY',
    completed: false,
    targetBlocks: 2,
    blocksTarget: 2,
    completedBlocks: 0,
    bankedViaEarlyClearance: false,
    reallocatedViaEarlyClearance: false,
    reallocatedBlocksCount: 0,
    earlyClearanceEligible: true,
    supportsEarlyClearance: true,
    lateNightBlocker: true,
    startupStep:
      'Open RemNote Anatomy Decks #1–#4 and clear first 15 due cards.',
    trackId: 'science',
    cognitiveDemand: 'MECHANICAL_RECALL',
    launchUrl: 'https://www.remnote.com',
    autoLaunchUrl: false,
  },
  {
    id: 'floor_fc_comp',
    title: 'Comp Cards (250-card RemNote cap)',
    category: 'FLASHCARDS_COMP',
    completed: false,
    targetBlocks: 2,
    blocksTarget: 2,
    completedBlocks: 0,
    bankedViaEarlyClearance: false,
    reallocatedViaEarlyClearance: false,
    reallocatedBlocksCount: 0,
    earlyClearanceEligible: true,
    supportsEarlyClearance: true,
    lateNightBlocker: true,
    startupStep:
      'Open RemNote Comp review queue (250-card cap) and clear first 20 due cards.',
    trackId: 'science',
    cognitiveDemand: 'MECHANICAL_RECALL',
    launchUrl: 'https://www.remnote.com',
    autoLaunchUrl: false,
  },
  {
    id: 'floor_half_ch_read',
    title: 'Half-Chapter Reading (28 half-chapters left)',
    category: 'READING',
    completed: false,
    targetBlocks: 2,
    blocksTarget: 2,
    completedBlocks: 0,
    bankedViaEarlyClearance: false,
    reallocatedViaEarlyClearance: false,
    reallocatedBlocksCount: 0,
    earlyClearanceEligible: false,
    supportsEarlyClearance: false,
    lateNightBlocker: false,
    startupStep:
      'Open assigned Comp half-chapter, read first 2 pages, and mark key equations.',
    trackId: 'science',
    cognitiveDemand: 'DEEP_SYNTHESIS',
  },
  {
    id: 'floor_half_ch_synth',
    title: 'Half-Chapter Synthesis',
    category: 'SYNTHESIS',
    completed: false,
    targetBlocks: 1,
    blocksTarget: 1,
    completedBlocks: 0,
    bankedViaEarlyClearance: false,
    reallocatedViaEarlyClearance: false,
    reallocatedBlocksCount: 0,
    earlyClearanceEligible: false,
    supportsEarlyClearance: false,
    lateNightBlocker: false,
    startupStep:
      'Condense core equations and mechanism summary from today’s half-chapter.',
    trackId: 'science',
    cognitiveDemand: 'DEEP_SYNTHESIS',
  },
];

const DEFAULT_SEVEN_DAY_PIPELINE: SymmetryState['pipelineDays'] = [
  {
    dayIndex: 1,
    dayLabel: 'Tue, Nov 10',
    loadMode: 'TAPER',
    mode: 'TAPER_LAB',
    modeAndAnchors: 'TAPER_LAB (Double Lab Incl. Lab #4)',
    projectBlocksSummary: '3 proj blocks (2 Focus #1 + 1 Ambition Drip)',
    deliverablesCompleted:
      'Practicum Proposal (3/6) + Daily Ambition Drip: Symmetrical Triptych Ed. 4 (1b) (28 Half-Ch left)',
    primaryDeliverable:
      'Practicum Proposal (3/6) + Daily Ambition Drip: Symmetrical Triptych Ed. 4 (1b) (28 Half-Ch left)',
    cruisePlus: false,
    baseTargetBlocks: 10,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'LAB_2H',
    fixedEventTimeLabel: 'Double Lab Incl. Lab #4',
    earlyMorningAnchor: true,
    isToday: true,
  },
  {
    dayIndex: 2,
    dayLabel: 'Wed, Nov 11',
    loadMode: 'TAPER',
    mode: 'TAPER_LAB',
    modeAndAnchors: 'TAPER_LAB (Pre-Exam Final Polish)',
    projectBlocksSummary: '3 proj blocks',
    deliverablesCompleted:
      'Practicum Proposal (6/6 — 100% DONE!) + Daily Ambition Drip (1b) (27 Half-Ch left)',
    primaryDeliverable:
      'Practicum Proposal (6/6 — 100% DONE!) + Daily Ambition Drip (1b) (27 Half-Ch left)',
    cruisePlus: false,
    baseTargetBlocks: 10,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'LAB_2H',
    fixedEventTimeLabel: 'Pre-Exam Taper & Proposal Completion',
    earlyMorningAnchor: true,
    isToday: false,
  },
  {
    dayIndex: 3,
    dayLabel: 'Thu, Nov 12',
    loadMode: 'TAPER',
    mode: 'TAPER_LAB',
    modeAndAnchors: 'TAPER_LAB (EXAM DAY — Ambition Drip Auto-Paused)',
    projectBlocksSummary: '0 proj blocks',
    deliverablesCompleted:
      'Nov 12: Anatomy Exam + Licensing Practicum + Proposal Submitted!',
    primaryDeliverable:
      'Nov 12: Anatomy Exam + Licensing Practicum + Proposal Submitted!',
    cruisePlus: false,
    baseTargetBlocks: 7,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'LAB_2H',
    fixedEventTimeLabel: 'EXAM DAY — Anatomy Exam + Proposal Due',
    earlyMorningAnchor: true,
    isToday: false,
  },
  {
    dayIndex: 4,
    dayLabel: 'Fri, Nov 13',
    loadMode: 'CRUISE',
    mode: 'CRUISE',
    modeAndAnchors: 'CRUISE (Evening Outing — 6:00 PM Early Shutdown)',
    projectBlocksSummary: '4 proj blocks (3 Focus #1 + 1 Ambition Drip)',
    deliverablesCompleted:
      'Lab Report #4 (3/8) + Daily Ambition Drip: Symmetrical Triptych Ed. 4 / K1C (1b) (26 left)',
    primaryDeliverable:
      'Lab Report #4 (3/8) + Daily Ambition Drip: Symmetrical Triptych Ed. 4 / K1C (1b) (26 left)',
    cruisePlus: false,
    baseTargetBlocks: 11,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'EVENING_OUTING_6PM',
    fixedEventTimeLabel: 'Evening Outing — 6:00 PM Early Shutdown',
    earlyEveningShutdownBadge: 'Early Shutdown (6:00 PM)',
    earlyMorningAnchor: false,
    isToday: false,
  },
  {
    dayIndex: 5,
    dayLabel: 'Sat, Nov 14',
    loadMode: 'CRUISE',
    mode: 'CRUISE',
    modeAndAnchors: 'CRUISE (Weekend Flow)',
    projectBlocksSummary: '5 proj blocks (4 Focus #1 + 1 Ambition Drip)',
    deliverablesCompleted:
      'Lab Report #4 (7/8) + Daily Ambition Drip (1b) (25 left)',
    primaryDeliverable:
      'Lab Report #4 (7/8) + Daily Ambition Drip (1b) (25 left)',
    cruisePlus: false,
    baseTargetBlocks: 12,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'NONE',
    fixedEventTimeLabel: 'Weekend Flow',
    earlyMorningAnchor: false,
    isToday: false,
  },
  {
    dayIndex: 6,
    dayLabel: 'Sun, Nov 15',
    loadMode: 'CRUISE',
    mode: 'CRUISE',
    modeAndAnchors: 'CRUISE (Weekend Flow)',
    projectBlocksSummary: '4 proj blocks (3 Focus #1 + 1 Ambition Drip)',
    deliverablesCompleted:
      'Lab Report #4 (8/8 — 100% DONE!) + Practicum Phase 1 (2/8) + Ambition Drip (1b) (24 left)',
    primaryDeliverable:
      'Lab Report #4 (8/8 — 100% DONE!) + Practicum Phase 1 (2/8) + Ambition Drip (1b) (24 left)',
    cruisePlus: false,
    baseTargetBlocks: 11,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'NONE',
    fixedEventTimeLabel: 'Weekend Flow',
    earlyMorningAnchor: false,
    isToday: false,
  },
  {
    dayIndex: 7,
    dayLabel: 'Mon, Nov 16',
    loadMode: 'CRUISE',
    mode: 'CRUISE',
    modeAndAnchors: 'CRUISE (Standard Shift)',
    projectBlocksSummary: '4 proj blocks (3 Focus #1 + 1 Ambition Drip)',
    deliverablesCompleted:
      'Practicum Phase 1 (5/8) + Daily Ambition Drip (1b) (23 left)',
    primaryDeliverable:
      'Practicum Phase 1 (5/8) + Daily Ambition Drip (1b) (23 left)',
    cruisePlus: false,
    baseTargetBlocks: 11,
    deductedBlocksFromExtension: 0,
    completedBlocks: 0,
    fixedEvent: 'NONE',
    fixedEventTimeLabel: 'Standard Shift',
    earlyMorningAnchor: true,
    isToday: false,
  },
];

export const DEFAULT_SYMMETRY_STATE: SymmetryState = {
  version: '1.2.0',
  profilePresetId: 'AVERY_DEFAULT',
  profileName: 'Architect Live Preset (Medical Physics, Authorship & Hardware)',
  logicalDayRolloverHour: 4,
  earlyEveningShutdownTime: '6:00 PM',
  taskWeights: {
    heavyLabel: '2-Page Paper',
    heavyBlocks: 8,
    mediumLabel: 'Slide Deck',
    mediumBlocks: 4,
  },
  breakOptions: {
    l1Label:
      'Vape draw — step voltage up a notch if mental static persists + water / Look 20+ ft out window for 1 song',
    l2EspressoLabel: 'Vape + Espresso Ritual / Water',
    l2MusicLabel: '1–2 Song Riff on Bass/Guitar Cold (5m)',
    l2PhysicalLabel: '15m TENS / Normatec Compression Cycle',
    stressBreathingLabel:
      '15–20m Somatic Buffer: Vape voltage step-up + water, 4-7-8 breathing, or Normatec -> queue 5m Flashcard block',
    stressEspressoLabel: 'Vape + Espresso Ritual / Water',
    stressBootsLabel: '15m Normatec Compression Cycle -> queue 5m Flashcard block',
  },
  energyBandwidth: 'STEADY',
  shockAbsorberMode: 'FULL_SHIFT',
  shockAbsorberDeferredBlocks: 0,
  flexibilityTuning: { ...DEFAULT_FLEXIBILITY_TUNING },
  logicalDayKey: initialLogicalDay,
  todayBlockLog: DEFAULT_TODAY_BLOCK_LOG,
  dailyHistory: DEFAULT_DAILY_HISTORY,
  stateBackups: [],
  audioSettings: DEFAULT_AUDIO_ENGINE_SETTINGS,
  upcomingMilestones: [
    'Nov 12: Anatomy Exam',
    'Dec 8–9: Comp Exam (28 half-chapters left)',
  ],
  bandwidth: 'Sharp',
  loadMode: 'TAPER',
  preExamTaperActive: false,
  cruisePlus: false,
  customModeBlockAdjustment: 10, // 7 baseline floor + 3 discretionary (2 Focus #1 + 1 Daily Ambition Drip)

  surgeConsecutiveDays: 0,
  midDayResetCompletedToday: false,
  fixedEvent: 'LAB_2H',
  flashcardsReviewedCount: 0,
  flashcardsDailyCap: 250,
  ankiConnectEnabled: false,
  ankiConnectUrl: 'http://127.0.0.1:8765',
  earlyClearanceEnabled: false,
  baselineBlocks: DEFAULT_BASELINE_SLOTS,
  baselineSlots: DEFAULT_BASELINE_SLOTS,
  projectQueue: [
    {
      id: 'proj_1',
      slot: 1,
      title: 'Practicum Presentation Research Project Proposal',
      presetType: 'CUSTOM',
      completedBlocks: 1,
      totalBlocks: 6,
      trackId: 'science',
      subTrack: '1A_INSTITUTIONAL',
      startupStep: 'Open proposal doc + draft 2 bullet points for current section',
      nextStepNote: '1 / 6 blocks done • Due Thu Nov 12 (Track 1A Institutional Focus #1).',
      cognitiveDemand: 'DEEP_SYNTHESIS',
      isAmbitionDrip: false,
      isSovereignDrip: false,
      category: 'institutional',
      blockSubSteps: [
        'Block 1/6 (Outline & Setup): Open proposal doc + lock clinical physics problem statement',
        'Block 2/6 (Core Sections): Open proposal doc + draft 2 bullet points for Specific Aims',
        'Block 3/6 (Core Sections): Open proposal doc + draft dataset & pipeline methodology',
        'Block 4/6 (Figures/Equations): Specify quantitative validation metrics & figure layout',
        'Block 5/6 (Figures/Equations): Draft milestone timeline & benchmark table',
        'Block 6/6 (Final Polish): Read aloud, verify citations, and export submission PDF',
      ],
    },
    {
      id: 'proj_2',
      slot: 2,
      title: 'A Symmetrical Triptych: Edition 4 (Completion & Submissions)',
      presetType: 'CUSTOM',
      completedBlocks: 0,
      totalBlocks: 6,
      trackId: 'writing',
      startupStep: 'Open Edition 4 manuscript + revise 1 paragraph or submission field',
      nextStepNote: 'Daily Ambition Drip Slot #2 (Track 2 Writing & Authorship).',
      cognitiveDemand: 'DEEP_SYNTHESIS',
      isAmbitionDrip: true,
      isSovereignDrip: true,
      category: 'sovereign',
      blockSubSteps: [
        'Block 1/6 (Outline & Setup): Open Edition 4 manuscript + audit remaining revision notes',
        'Block 2/6 (Core Sections): Revise Part I transition & tighten 1 core paragraph',
        'Block 3/6 (Core Sections): Revise Part II pacing & verify structural symmetry',
        'Block 4/6 (Core Sections): Polish Part III closing movement & line edits',
        'Block 5/6 (Final Polish): Format clean submission manuscript + author bio packet',
        'Block 6/6 (Final Polish): Complete target venue submission fields & log dispatch',
      ],
    },
    {
      id: 'proj_3',
      slot: 3,
      title: 'Fixing the Creality K1C 3D Printer',
      presetType: 'CUSTOM',
      completedBlocks: 0,
      totalBlocks: 3,
      trackId: 'coding',
      startupStep: 'Isolate 1 single 5m hotend, extruder, or belt diagnostic step',
      nextStepNote: '0 / 3 blocks • Daily Ambition Drip Slot #3 (Sandbox 1 Hardware).',
      cognitiveDemand: 'MECHANICAL_RECALL',
      isAmbitionDrip: true,
      isSovereignDrip: true,
      category: 'sovereign',
      blockSubSteps: [
        'Block 1/3 (Outline & Setup): Isolate 1 single 5m hotend, extruder, or belt diagnostic step',
        'Block 2/3 (Core Sections): Clear filament path / tension belts and verify extrusion feed',
        'Block 3/3 (Final Polish): Run bed-level calibration mesh and verify first-layer test print',
      ],
    },
  ],
  projectBacklog: DEFAULT_OPEN_LIST_BACKLOG,
  openListBacklog: DEFAULT_OPEN_LIST_BACKLOG,
  completedDeliverablesLog: DEFAULT_COMPLETED_DELIVERABLES,
  completedDeliverablesArchive: DEFAULT_COMPLETED_DELIVERABLES,
  pipelineDays: DEFAULT_SEVEN_DAY_PIPELINE,
  sevenDayPipeline: DEFAULT_SEVEN_DAY_PIPELINE,
  discretionaryBlocksCompletedToday: 0,
  dailyAmbitionDrip: {
    enabled: true,
    targetBlocksPerDay: 1,
    completedToday: 0,
    preferredSlotIndex: 1, // Closed List Slot #2 (index 1)
  },
  dailySovereignDripDone: false,
  dailySovereignDripTarget: 1,
  sovereignGoldenRuleMode: true,
  timer: {
    mode: 'WORK_20M',
    workStage: 'IGNITION_5M',
    secondsLeft: 300, // 5m Startup Step (IGNITION_5M)
    targetEndTimeMs: null,
    isRunning: false,
    activeBlockSourceId: 'proj_1',
    activeTaskTitle: 'Practicum Presentation Research Project Proposal',
    activeTaskType: 'PROJECT',
    activeStartupPrompt:
      'Block 2/6 (Core Sections): Open proposal doc + draft 2 bullet points for Specific Aims',
    elasticMultiplier: 1.0,
    startupShrinkLevel: 1,
    chainedBlocksCount: 0,
    sessionDisplayDurationMinutes: 20,
    l1DurationMinutes: 5,
    l2DurationMinutes: 15,
    l2Protocol: 'ESPRESSO',
    l3DurationMinutes: 60,
    stressDurationMinutes: 15,
    stressProtocol: 'BREATHING_478',
    queuedRecoveryFlashcard5m: false,
    recoveryFlashcardRunning: false,
    recoveryFlashcardSecondsLeft: 300,
    recoveryFlashcardTargetEndTimeMs: null,
  },
  recharge: {
    endOfShiftLocked: false,
    manualEveningPreview: false,
    flowExtensionPromptOpen: false,
    flowExtensionActive: false,
    flowExtensionRunning: false,
    flowExtensionElapsedSeconds: 0,
    flowExtensionStartTimeMs: null,
    flowExtensionBlocksLoggedToday: 0,
    weeklyExtensionsUsed: 1,
    lastChimeMinute: 0,
    option0Running: false,
    option0SecondsLeft: 1200,
    option0TargetEndTimeMs: null,
    option0ConsecutiveWindows: 0,
    forkCheckModalOpen: false,
    activeCategory: 'NONE',
    activeMediaTab: '3A_FICTION',
    fictionSpeed: '2.00x',
    pacingStage: 'STARTUP_5M',
    categorySecondsLeft: 300,
    categoryTargetEndTimeMs: null,
    categoryElapsedMinutes: 0,
    categoryRunning: false,
    checkInModalOpen: false,
    checkInMilestone: 20,
    stickySlots: {
      CAT2_MAKER: {
        key: 'CAT2_MAKER',
        label: 'Creality K1C & Tactile Builds [Sticky]',
        activeTitle: 'Creality K1C & Tactile Builds',
        startupStep: 'Isolate 1 single 5m diagnostic or mechanical build step',
        backlogQueue: ['Custom Cable Organizer CAD Bracket', 'Multimeter Sensor Enclosure Print'],
        queuedNextTitle: 'Custom Cable Organizer CAD Bracket',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      '3A_FICTION': {
        key: '3A_FICTION',
        label: '3A Fiction [Sticky]',
        activeTitle: 'Soul Music (1.75x–2.25x, Queued: Exoplanet)',
        startupStep: 'Listen 5m at 1.75x–2.25x in boots or eyes closed',
        backlogQueue: ['Exoplanet', 'Feet of Clay', 'Hogfather'],
        queuedNextTitle: 'Exoplanet',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      '3B_NONFICTION': {
        key: '3B_NONFICTION',
        label: '3B Nonfiction [Sticky]',
        activeTitle: 'The American Way of Killing',
        startupStep: 'Listen 5m in recliner or compression boots',
        backlogQueue: ['The Emperor of All Maladies', 'Thinking in Systems'],
        queuedNextTitle: 'The Emperor of All Maladies',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      '3C_VIDEO': {
        key: '3C_VIDEO',
        label: '3C Video [Sticky]',
        activeTitle: "Widow's Bay",
        startupStep: 'Watch first 5m away from work monitor',
        backlogQueue: ['Severance Season 2', 'Andor Archive Cut'],
        queuedNextTitle: 'Severance Season 2',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
      CAT5_GAMING: {
        key: 'CAT5_GAMING',
        label: 'Gaming [Sticky]',
        activeTitle: "Baldur's Gate 3",
        startupStep: 'Boot save + 1 single 5m micro-objective',
        backlogQueue: ['Factorio', 'Dwarf Fortress', 'RimWorld', 'Hades II'],
        queuedNextTitle: 'Factorio',
        fiveMinStarts: 0,
        startsLogged: 0,
        unlockedViaCheckIn: false,
        archivedTitles: [],
      },
    },
    fluidCategories: {
      CAT1_MUSIC: {
        label: '1. Music (Bass/Guitar/Piano/Drums cold song)',
        activeTitle: 'Music (Bass/Guitar/Piano/Drums cold song)',
        subtitle: 'Bass / Guitar / Piano / Drums — fluid musical play.',
        startupStep: 'Play 1 familiar song cold — no DAW or drills',
      },
      CAT4_COMFORT: {
        label: "4. It's Always Sunny in Philadelphia",
        activeTitle: "It's Always Sunny in Philadelphia",
        subtitle: 'Low-friction comfort show recharge away from work monitor.',
        startupStep: 'First 5m of episode away from work monitor',
      },
      CAT6_CULTURE: {
        label: '6. Italian Culture & Language',
        activeTitle: 'Italian Culture & Language',
        subtitle:
          'Spoken Italian audio on walk, cinema/music, or Italian dish prep — zero RemNote SRS competition.',
        startupStep:
          '5m spoken Italian audio [Language Transfer / Pimsleur] on walk, cinema/music, or Italian dish prep — zero RemNote SRS competition',
      },
    },
    completedLog: [
      'Option 0: 20m Silent Stillness Window (1/2)',
      'Category 3A Fiction: Soul Music (20m Check-In cleared)',
      'Category 1 Music: 5m Cold Song Playthrough (Bass)',
    ],
  },
  roadmapShelter: DEFAULT_HOUSE_SHELTER,
  roadmapFoundation: DEFAULT_HOUSE_FOUNDATION,
  roadmapTracks: DEFAULT_HOUSE_ROADMAP_TRACKS,
};

export function formatMinutesAsWorkLeft(minutes: number): string {
  if (minutes <= 0) return '0m work left';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours}h ${String(mins).padStart(2, '0')}m work left`;
  }
  return `${mins}m work left`;
}

export function computeShiftMetrics(state: SymmetryState) {
  const floorLen = getTotalBaselineFloorBlocks(state.baselineBlocks) || 1;
  const rawTarget = Math.max(1, state.customModeBlockAdjustment || floorLen);
  const totalTargetBlocks = state.preExamTaperActive
    ? Math.min(9, rawTarget)
    : rawTarget;
  const completedBaselineCount =
    Math.round(
      state.baselineBlocks.reduce(
        (acc, b) => acc + getBaselineSlotCompletedBlocks(b),
        0
      ) * 10
    ) / 10;
  const totalCompletedBlocks =
    Math.round((completedBaselineCount + state.discretionaryBlocksCompletedToday) * 10) / 10;
  const remainingBlocks = Math.max(
    0,
    Math.round((totalTargetBlocks - totalCompletedBlocks) * 10) / 10
  );
  const remainingMinutes = Math.round(remainingBlocks * 20);

  const remainingWorkFormatted = formatMinutesAsWorkLeft(remainingMinutes);

  const durationPrefix =
    remainingMinutes === 0
      ? '[0m work left]'
      : `[${state.timer.sessionDisplayDurationMinutes}m | ${remainingWorkFormatted}]`;

  return {
    totalTargetBlocks,
    completedBaselineCount,
    totalCompletedBlocks,
    remainingBlocks,
    remainingMinutes,
    remainingWorkFormatted,
    durationPrefix,
    isZeroWorkLeft: remainingMinutes === 0,
  };
}

/**
 * Generates the exact Sequential 20m Checklist (Interleaved Work Blocks + Auto-Breaks + Running Countdown)
 * from Block 1 down to `[0m work left — Hard Shutdown]`.
 */
export function generateSequentialChecklist(
  state: SymmetryState
): import('../types/symmetry').SequentialChecklistStep[] {
  const nominalFloorLen = getTotalBaselineFloorBlocks(state.baselineBlocks) || 1;
  const effectiveBaselineCount = getEffectiveScheduledBaselineFloorBlocks(
    state.baselineBlocks
  );
  const rawTarget = Math.max(1, state.customModeBlockAdjustment || nominalFloorLen);
  const totalTargetBlocks = state.preExamTaperActive
    ? Math.min(9, rawTarget)
    : rawTarget;
  const primaryProject = getActiveFocusProject(state);
  const discretionaryCount = Math.max(0, totalTargetBlocks - effectiveBaselineCount);
  const bandwidth = state.energyBandwidth || 'STEADY';

  interface RawWorkSpec {
    blockNumber: number;
    sourceId: string;
    title: string;
    categoryBadge: string;
    taskType: import('../types/symmetry').ActiveTaskType;
    cognitiveDemand: CognitiveDemandTag;
    startupStep: string;
    completed: boolean;
    banked: boolean;
    isAmbitionDripCapstone?: boolean;
    launchUrl?: string;
    autoLaunchUrl?: boolean;
  }

  const expandSlotToUnits = (
    b: BaselineBlock,
    defaultTaskType: import('../types/symmetry').ActiveTaskType,
    badgePrefix: string
  ): Omit<RawWorkSpec, 'blockNumber'>[] => {
    const target = getBaselineSlotEffectiveTargetBlocks(b);
    if (target <= 0) return [];
    const completedUnits = Math.floor(getBaselineSlotCompletedBlocks(b));
    const units: Omit<RawWorkSpec, 'blockNumber'>[] = [];
    for (let u = 1; u <= target; u++) {
      const unitCompleted = Boolean(
        b.completed || b.bankedViaEarlyClearance || u <= completedUnits
      );
      const suffix = target > 1 && !b.title.includes('/') ? ` — Block ${u}/${target}` : '';
      units.push({
        sourceId: b.id,
        title: `${b.title}${suffix}`,
        categoryBadge:
          target > 1 ? `${badgePrefix} (${u}/${target})` : badgePrefix,
        taskType: defaultTaskType,
        cognitiveDemand: getBaselineCognitiveDemand(b),
        startupStep: b.startupStep,
        completed: unitCompleted,
        banked: Boolean(b.bankedViaEarlyClearance),
        launchUrl: b.launchUrl,
        autoLaunchUrl: b.autoLaunchUrl,
      });
    }
    return units;
  };

  const fcSlots = state.baselineBlocks.filter((b) =>
    isBaselineSlotLateNightBlocked(b)
  );
  const nonFcSlots = state.baselineBlocks.filter(
    (b) => !isBaselineSlotLateNightBlocked(b)
  );
  const readSlots = nonFcSlots.filter((b) => b.category !== 'SYNTHESIS');
  const synthSlots = nonFcSlots.filter((b) => b.category === 'SYNTHESIS');

  const fcUnits = fcSlots.flatMap((b) =>
    expandSlotToUnits(b, 'FLASHCARDS', 'EARLY/MID SHIFT • RECALL')
  );
  const readUnits = readSlots.flatMap((b) =>
    expandSlotToUnits(b, 'READING', 'BASELINE FLOOR • INTAKE/ADMIN')
  );
  const synthUnits = synthSlots.flatMap((b) =>
    expandSlotToUnits(b, 'SYNTHESIS', 'BASELINE FLOOR • SYNTHESIS')
  );

  const earlyFcCount = Math.ceil(fcUnits.length / 2);
  const earlyFc = fcUnits.slice(0, earlyFcCount).map((u, idx) => ({
    ...u,
    categoryBadge: `EARLY SHIFT • RECALL (${idx + 1}/${fcUnits.length})`,
  }));
  const midFc = fcUnits.slice(earlyFcCount).map((u, idx) => ({
    ...u,
    categoryBadge: `MID-SHIFT • RECALL (${earlyFcCount + idx + 1}/${fcUnits.length})`,
  }));

  const frontReadUnits =
    synthUnits.length === 0 && readUnits.length > 1
      ? readUnits.slice(0, -1)
      : readUnits;
  const tailSynthUnits =
    synthUnits.length === 0 && readUnits.length > 1
      ? readUnits.slice(-1).map((u) => ({
          ...u,
          taskType: 'SYNTHESIS' as const,
          categoryBadge: 'BASELINE FLOOR • SYNTHESIS (3/3)',
        }))
      : synthUnits;

  const orderedBaselineSpecs: Omit<RawWorkSpec, 'blockNumber'>[] = [
    ...earlyFc,
    ...frontReadUnits,
    ...midFc,
    ...tailSynthUnits,
  ];

  // If Shock Absorber compressed totalTargetBlocks below baselineCount, keep completed first + highest-yield remaining baseline specs
  let activeBaselineSpecs = orderedBaselineSpecs;
  if (totalTargetBlocks < orderedBaselineSpecs.length) {
    const doneSpecs = orderedBaselineSpecs.filter((s) => s.completed && !s.banked);
    const pendingSpecs = orderedBaselineSpecs.filter((s) => !s.completed && !s.banked);
    const bankedSpecs = orderedBaselineSpecs.filter((s) => s.banked);
    activeBaselineSpecs = [...doneSpecs, ...pendingSpecs, ...bankedSpecs].slice(
      0,
      totalTargetBlocks
    );
  }

  const dripCfg = getEffectiveDailyAmbitionDrip(state);
  const examDayActive = isTodayExamDay(state);
  const dripProject =
    dripCfg.enabled && !examDayActive
      ? getActiveAmbitionDripProject(state)
      : undefined;
  const reservedDripCount = dripProject
    ? Math.min(discretionaryCount, Math.max(1, dripCfg.targetBlocksPerDay))
    : 0;
  const focus1DiscretionaryCount = Math.max(
    0,
    discretionaryCount - reservedDripCount
  );

  const dripCompletedUnits = Math.min(
    reservedDripCount,
    Math.floor(dripCfg.completedToday)
  );
  const focus1CompletedUnits = Math.max(
    0,
    Math.floor(state.discretionaryBlocksCompletedToday) - dripCompletedUnits
  );

  const rawDiscretionarySpecs: Omit<RawWorkSpec, 'blockNumber'>[] = [];

  for (let d = 1; d <= focus1DiscretionaryCount; d++) {
    const isCompleted = d <= focus1CompletedUnits;
    const projTitle = primaryProject?.title || 'Closed List Focus #1';
    const projSlot = primaryProject?.slot || 1;
    const futureOffset = isCompleted
      ? Math.max(0, d - focus1CompletedUnits - 1)
      : Math.max(0, d - 1 - focus1CompletedUnits);
    const projStartup = primaryProject
      ? getProjectActiveStartupStep(primaryProject, futureOffset)
      : 'Open primary deliverable and complete 5m startup step.';
    const projDemand = primaryProject
      ? getProjectCognitiveDemand(primaryProject)
      : 'DEEP_SYNTHESIS';
    const subTrackBadge =
      primaryProject?.subTrack === '1B_INDEPENDENT'
        ? '1B INDEPENDENT'
        : primaryProject?.subTrack === '1A_INSTITUTIONAL'
        ? '1A INSTITUTIONAL'
        : 'SERIALIZED';
    rawDiscretionarySpecs.push({
      sourceId: primaryProject?.id || 'proj_1',
      title: `${projTitle} — Focus #${projSlot} (Block ${d}/${focus1DiscretionaryCount})`,
      categoryBadge: `${subTrackBadge} FOCUS #${projSlot} • (${d}/${focus1DiscretionaryCount})`,
      taskType: 'PROJECT',
      cognitiveDemand: projDemand,
      startupStep: projStartup,
      completed: isCompleted,
      banked: false,
      launchUrl: primaryProject?.launchUrl,
      autoLaunchUrl: primaryProject?.autoLaunchUrl,
    });
  }

  for (let k = 1; k <= reservedDripCount; k++) {
    if (!dripProject) break;
    const isDripCompleted =
      k <= dripCompletedUnits ||
      focus1DiscretionaryCount + k <=
        Math.floor(state.discretionaryBlocksCompletedToday);
    const futureOffset = isDripCompleted ? 0 : Math.max(0, k - 1 - dripCompletedUnits);
    rawDiscretionarySpecs.push({
      sourceId: dripProject.id,
      title: `${dripProject.title} — Daily Ambition Drip #${dripProject.slot} (${k}/${reservedDripCount})`,
      categoryBadge: `DAILY AMBITION DRIP • SLOT #${dripProject.slot} (20M CAP)`,
      taskType: 'PROJECT',
      cognitiveDemand: getProjectCognitiveDemand(dripProject),
      startupStep: getProjectActiveStartupStep(dripProject, futureOffset),
      completed: isDripCompleted,
      banked: false,
      isAmbitionDripCapstone: true,
      launchUrl: dripProject.launchUrl,
      autoLaunchUrl: dripProject.autoLaunchUrl,
    });
  }

  const combinedSpecs: Omit<RawWorkSpec, 'blockNumber'>[] = [
    ...activeBaselineSpecs,
    ...rawDiscretionarySpecs,
  ];

  // Reorder uncompleted specs dynamically when Energy-State Bandwidth Router is SHARP or LOW_FOGGY,
  // while keeping Capstone Ambition Drip at the end of the shift and blocking Flashcards from being final block.
  let finalOrderedSpecs = combinedSpecs;
  if (bandwidth === 'SHARP' || bandwidth === 'LOW_FOGGY') {
    const cleared = combinedSpecs.filter((s) => s.completed || s.banked);
    const pendingCapstone = combinedSpecs.filter(
      (s) => !s.completed && !s.banked && s.isAmbitionDripCapstone
    );
    const pendingRegular = combinedSpecs.filter(
      (s) => !s.completed && !s.banked && !s.isAmbitionDripCapstone
    );

    if (bandwidth === 'SHARP') {
      const deepPending = pendingRegular.filter(
        (s) => s.cognitiveDemand === 'DEEP_SYNTHESIS'
      );
      const otherPending = pendingRegular.filter(
        (s) => s.cognitiveDemand !== 'DEEP_SYNTHESIS'
      );
      if (
        pendingCapstone.length === 0 &&
        deepPending.length > 1 &&
        otherPending.length > 0
      ) {
        const anchorEnd = deepPending[deepPending.length - 1];
        const frontDeep = deepPending.slice(0, -1);
        finalOrderedSpecs = [
          ...cleared,
          ...frontDeep,
          ...otherPending,
          anchorEnd,
        ];
      } else {
        finalOrderedSpecs = [
          ...cleared,
          ...deepPending,
          ...otherPending,
          ...pendingCapstone,
        ];
      }
    } else {
      const lowFrictionPending = pendingRegular.filter(
        (s) =>
          s.cognitiveDemand === 'MECHANICAL_RECALL' ||
          s.cognitiveDemand === 'LIGHT_ADMIN'
      );
      const deepPending = pendingRegular.filter(
        (s) => s.cognitiveDemand === 'DEEP_SYNTHESIS'
      );
      finalOrderedSpecs = [
        ...cleared,
        ...lowFrictionPending,
        ...deepPending,
        ...pendingCapstone,
      ];
    }
  }

  // Enforce Late-Night Flashcard Blocker: never allow a FLASHCARDS block to sit at the final slot if a non-flashcard pending block exists
  if (finalOrderedSpecs.length > 1) {
    const lastIdx = finalOrderedSpecs.length - 1;
    if (finalOrderedSpecs[lastIdx].taskType === 'FLASHCARDS') {
      for (let j = lastIdx - 1; j >= 0; j--) {
        if (
          !finalOrderedSpecs[j].completed &&
          !finalOrderedSpecs[j].banked &&
          finalOrderedSpecs[j].taskType !== 'FLASHCARDS'
        ) {
          const copy = [...finalOrderedSpecs];
          const [nonFc] = copy.splice(j, 1);
          copy.push(nonFc);
          finalOrderedSpecs = copy;
          break;
        }
      }
    }
  }

  const workSpecs: RawWorkSpec[] = finalOrderedSpecs.map((spec, idx) => ({
    ...spec,
    blockNumber: idx + 1,
  }));

  const steps: import('../types/symmetry').SequentialChecklistStep[] = [];
  let chainPosition: 1 | 2 = 1;
  let foundFirstUncompleted = false;
  const isSurgeDay = state.loadMode === 'SURGE' || totalTargetBlocks >= 14;
  const l1Custom = state.breakOptions?.l1Label || 'Window gaze / water / 3 dishes';
  const l2Custom = `${state.breakOptions?.l2EspressoLabel || 'Espresso'} / ${
    state.breakOptions?.l2MusicLabel || '5m Cold Song'
  } / ${state.breakOptions?.l2PhysicalLabel || '15m TENS/Normatec'}`;

  for (let i = 0; i < workSpecs.length; i++) {
    const w = workSpecs[i];
    const isCleared = w.completed || w.banked;
    const isCurrentNext = !isCleared && !foundFirstUncompleted;
    if (isCurrentNext) {
      foundFirstUncompleted = true;
    }

    const remainingBlocksAfter = Math.max(0, totalTargetBlocks - w.blockNumber);
    const remainingMinutesAfter = remainingBlocksAfter * 20;
    const sessionMins = chainPosition * 20;

    const countdownBadge =
      remainingMinutesAfter === 0
        ? '[0m work left — End-of-Shift Bridge]'
        : `[${sessionMins}m | ${formatMinutesAsWorkLeft(remainingMinutesAfter)}]`;

    steps.push({
      stepNumber: steps.length + 1,
      id: `seq_work_${w.blockNumber}`,
      kind: 'WORK_BLOCK',
      blockNumber: w.blockNumber,
      sourceId: w.sourceId,
      title: `Block ${w.blockNumber}/${totalTargetBlocks}: ${w.title}`,
      categoryBadge: w.categoryBadge,
      taskType: w.taskType,
      cognitiveDemand: w.cognitiveDemand,
      startupStep: w.startupStep,
      durationMinutes: 20,
      chainPosition,
      remainingMinutesAfter,
      countdownBadge,
      completed: w.completed,
      banked: w.banked,
      isCurrentNext,
      isAmbitionDrip: Boolean(w.isAmbitionDripCapstone),
      launchUrl: w.launchUrl,
      autoLaunchUrl: w.autoLaunchUrl,
    });

    // Interleave break rows between work blocks (except after final work block)
    const nextWork = workSpecs[i + 1];
    if (nextWork) {
      const nextCleared = nextWork.completed || nextWork.banked;
      const breakCompleted = isCleared && nextCleared;

      if (isSurgeDay && w.blockNumber === 7) {
        steps.push({
          stepNumber: steps.length + 1,
          id: `seq_break_l3_after_7`,
          kind: 'BREAK_L3',
          title: 'Level 3 Mid-Shift Reset (60–120m: 30m meal + walk/boots)',
          categoryBadge: 'SURGE CIRCUIT BREAKER • MANDATORY AFTER BLOCK 7',
          startupStep:
            'Step away from desk for 60–120m: 30m real meal + outdoor walk or compression recovery.',
          durationMinutes: state.timer.l3DurationMinutes,
          remainingMinutesAfter,
          countdownBadge: `[60–120m Reset | ${formatMinutesAsWorkLeft(remainingMinutesAfter)}]`,
          completed: state.midDayResetCompletedToday || breakCompleted,
          isCurrentNext: false,
        });
        chainPosition = 1;
      } else if (chainPosition >= 2 || nextWork.taskType !== w.taskType) {
        const reasonTag =
          chainPosition >= 2 && nextWork.taskType !== w.taskType
            ? '40M CHAIN CAP + TASK SWITCH'
            : chainPosition >= 2
            ? 'MAX 2 CHAINED BLOCKS (40M) CAP'
            : `TASK SWITCH (${w.taskType} → ${nextWork.taskType})`;
        steps.push({
          stepNumber: steps.length + 1,
          id: `seq_break_l2_after_${w.blockNumber}`,
          kind: 'BREAK_L2',
          title: `Level 2 Task-Switch Buffer (10–15m: ${l2Custom})`,
          categoryBadge: `LEVEL 2 BUFFER • ${reasonTag}`,
          startupStep: `Run 10–15m physical buffer: ${l2Custom}.`,
          durationMinutes: state.timer.l2DurationMinutes,
          remainingMinutesAfter,
          countdownBadge: `[10–15m Buffer | ${formatMinutesAsWorkLeft(remainingMinutesAfter)}]`,
          completed: breakCompleted,
          isCurrentNext: false,
        });
        chainPosition = 1;
      } else {
        steps.push({
          stepNumber: steps.length + 1,
          id: `seq_break_l1_after_${w.blockNumber}`,
          kind: 'BREAK_L1',
          title: `Level 1 Micro-Reset (3–5m: ${l1Custom})`,
          categoryBadge: `SAME-TASK MICRO-RESET • ${w.taskType} CHAIN (1/2)`,
          startupStep: `Stand up for 3–5m: ${l1Custom} before chaining Block 2/2.`,
          durationMinutes: state.timer.l1DurationMinutes,
          remainingMinutesAfter,
          countdownBadge: `[3–5m Reset | ${formatMinutesAsWorkLeft(remainingMinutesAfter)}]`,
          completed: breakCompleted,
          isCurrentNext: false,
        });
        chainPosition = 2;
      }
    }
  }

  const allWorkCleared = workSpecs.every((w) => w.completed || w.banked);
  steps.push({
    stepNumber: steps.length + 1,
    id: 'seq_hard_shutdown',
    kind: 'SHUTDOWN',
    title: 'End-of-Shift Lock — Hard Shutdown & 6-Channel Evening Recharge Menu',
    categoryBadge: 'END-OF-SHIFT LOCK • ZERO WORK LEFT',
    startupStep:
      'Close all work windows, engage End-of-Shift Lock, and open Option 0 Stillness or 6-Channel Evening Recharge Menu.',
    durationMinutes: 0,
    remainingMinutesAfter: 0,
    countdownBadge: '[0m work left — Hard Shutdown]',
    completed: allWorkCleared,
    isCurrentNext: allWorkCleared,
  });

  return steps;
}

export function serializeToStateMarkdown(state: SymmetryState): string {
  const metrics = computeShiftMetrics(state);
  const seqSteps = generateSequentialChecklist(state);
  const workSteps = seqSteps.filter((s) => s.kind === 'WORK_BLOCK');
  const milestones = state.upcomingMilestones?.length
    ? state.upcomingMilestones.join(' • ')
    : state.profilePresetId === 'AVERY_DEFAULT'
      ? 'Nov 12: Anatomy Exam • Dec 8–9: Comp Exam (28 half-chapters left)'
      : 'None configured';

  const houseTracks = migrateRoadmapTracksToHouseTopology(state.roadmapTracks);
  const shelter = state.roadmapShelter || DEFAULT_HOUSE_SHELTER;
  const foundation = state.roadmapFoundation || DEFAULT_HOUSE_FOUNDATION;

  const totalInputBlocks = houseTracks.reduce(
    (sum, t) => sum + t.inputBlocksCredited,
    0
  );
  const totalOutputBlocks = houseTracks.reduce(
    (sum, t) => sum + t.outputBlocksCredited,
    0
  );
  const combinedIo = Math.max(1, totalInputBlocks + totalOutputBlocks);
  const inputPct = Math.round((totalInputBlocks / combinedIo) * 100);
  const outputPct = 100 - inputPct;

  const archiveList =
    state.completedDeliverablesLog && state.completedDeliverablesLog.length > 0
      ? state.completedDeliverablesLog
      : state.completedDeliverablesArchive &&
        state.completedDeliverablesArchive.length > 0
      ? state.completedDeliverablesArchive
      : DEFAULT_SYMMETRY_STATE.completedDeliverablesLog || [];

  const rechargeLog =
    state.recharge.completedLog && state.recharge.completedLog.length > 0
      ? state.recharge.completedLog
      : DEFAULT_SYMMETRY_STATE.recharge.completedLog || [];

  const rolloverHour = state.logicalDayRolloverHour ?? 4;
  const rolloverLabel = formatRolloverHourLabel(rolloverHour);
  const shutdownTime = state.earlyEveningShutdownTime || '6:00 PM';
  const cat1Fluid =
    state.recharge.fluidCategories?.CAT1_MUSIC ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT1_MUSIC;
  const cat4Fluid =
    state.recharge.fluidCategories?.CAT4_COMFORT ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT4_COMFORT;
  const cat6Fluid =
    state.recharge.fluidCategories?.CAT6_CULTURE ||
    DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT6_CULTURE!;
  const flex = state.flexibilityTuning || DEFAULT_FLEXIBILITY_TUNING;
  const floorTotalBlocks = getTotalBaselineFloorBlocks(state.baselineBlocks) || 7;
  const dripCfg = getEffectiveDailyAmbitionDrip(state);

  const lines: string[] = [
    '# SymmetryManager (`wl-balancer`) — Master `state.md`',
    '',
    '# Part I: On-Duty Capacity Governor State',
    '',
    `- **Profile Archetype**: ${state.profileName || DEFAULT_SYMMETRY_STATE.profileName} (\`${state.profilePresetId || 'AVERY_DEFAULT'}\`)`,
    `- **Logical Shift Date (${rolloverLabel} Boundary)**: ${state.logicalDayKey || getLogicalDayKey(new Date(), rolloverHour)}`,
    `- **Early Evening Shutdown Time (Outing Days)**: ${shutdownTime}`,
    `- **Current Energy Bandwidth**: ${state.energyBandwidth || 'STEADY'}`,
    `- **Shock Absorber Status**: ${state.shockAbsorberMode || 'FULL_SHIFT'} (Deferred Focus Blocks: ${state.shockAbsorberDeferredBlocks || 0})`,
    `- **Structure vs. Flexibility Tuning**: Cadence \`${flex.blockCadencePreset}\` • Lock Mode \`${flex.closedListLockMode}\` • Evening Pulse \`${flex.eveningPulseSensitivity}\``,
    `- **Deliverable Task Weights**: ${state.taskWeights?.heavyLabel || '2-Page Paper'} (${state.taskWeights?.heavyBlocks || 8}b) • ${state.taskWeights?.mediumLabel || 'Slide Deck'} (${state.taskWeights?.mediumBlocks || 4}b)`,
    `- **Upcoming Milestones**: ${milestones}`,
    `- **Active Load Mode**: ${state.loadMode}${state.cruisePlus ? ' (Cruise+)' : ''}${
      state.preExamTaperActive ? ' [Pre-Exam Taper Active]' : ''
    } — Target Ceiling: ${metrics.totalTargetBlocks} blocks`,
    `- **Daily Ambition Drip (Zero 100%-Institutional Days)**: ${
      dripCfg.enabled
        ? `[${dripCfg.completedToday}/${dripCfg.targetBlocksPerDay} blocks today • Preferred Slot #${dripCfg.preferredSlotIndex + 1}]`
        : '[Disabled]'
    }`,
    `- **Consecutive Surge Days**: ${state.surgeConsecutiveDays} / 2`,
    `- **Surge Mid-Day Reset (60–120m after Block 7)**: ${state.midDayResetCompletedToday ? 'Completed' : 'Pending'}`,
    `- **Fixed Event Anchor**: ${state.fixedEvent}`,
    `- **Today's Sequential Progress**: ${metrics.totalCompletedBlocks} / ${metrics.totalTargetBlocks} blocks complete — \`${metrics.durationPrefix}\``,
    `- **Flashcard Review Queue**: ${state.flashcardsReviewedCount} / ${state.flashcardsDailyCap} cards (${state.earlyClearanceEnabled ? 'Early Clearance Active' : 'Standard Pacing'}${state.ankiConnectEnabled ? ' • AnkiConnect Active' : ''})`,
    `- **Completed Deliverables Logged**: ${archiveList.length}`,
    '',
    `## Today’s ${floorTotalBlocks}-Block Daily Core Baseline`,
    ...state.baselineBlocks.map((b) => {
      const box = b.completed
        ? 'x'
        : b.bankedViaEarlyClearance
        ? 'B'
        : b.reallocatedViaEarlyClearance
        ? 'R'
        : ' ';
      const urlSuffix = b.launchUrl ? ` • Link: \`${b.launchUrl}\`` : '';
      return `- [${box}] **${b.title}** (\`${getBaselineSlotCompletedBlocks(b)}/${getBaselineSlotTargetBlocks(b)}b\` • \`${b.category}\` • \`${getBaselineCognitiveDemand(b)}\`${urlSuffix}) — 5m Startup: *${b.startupStep}*`;
    }),
    '',
    '## Today’s Sequential 20m Runway Preview',
    ...workSteps.map(
      (s) =>
        `- [${s.completed ? 'x' : s.banked ? 'B' : ' '}] **${s.title}** \`${s.countdownBadge}\` — 5m Startup: *${s.startupStep}*`
    ),
    '',
    '## Closed List 1–3 (Active Project Lock — Max 3)',
    ...state.projectQueue.map((p) => {
      const isDrip = isProjectAmbitionDripEligible(p);
      const statusLabel =
        p.slot === 1
          ? `SERIALIZED FOCUS #1 (${p.subTrack || '1A_INSTITUTIONAL'})`
          : isDrip
          ? dripCfg.completedToday >= dripCfg.targetBlocksPerDay
            ? 'DAILY AMBITION DRIP — 1B/DAY (BANKED TODAY)'
            : 'DAILY AMBITION DRIP — 1B/DAY (CAPSTONE UNLOCKED)'
          : 'LOCKED UNTIL ITEM #1 COMPLETES';
      const urlNote = p.launchUrl ? ` | Link: \`${p.launchUrl}\`` : '';
      const activeSubStep = getProjectActiveStartupStep(p);
      return `${p.slot}. **${p.title}** — \`[${p.completedBlocks} / ${p.totalBlocks} blocks]\` | Track: \`${p.trackId}${p.subTrack ? `/${p.subTrack}` : ''}\` | Demand: \`${getProjectCognitiveDemand(p)}\` | ${statusLabel}${urlNote} — Active 5m Startup: *${activeSubStep}*`;
    }),
    '',
    '## Open List Backlog (Deferred Deliverables & Prerequisite Locks)',
    ...(state.openListBacklog.length > 0
      ? state.openListBacklog.map((b, idx) => {
          const unlocked = isOpenListItemUnlocked(b, archiveList);
          const lockTag = b.blockedByTitle
            ? unlocked
              ? ` | Prereq Cleared: "${b.blockedByTitle}"`
              : ` | LOCKED until "${b.blockedByTitle}" is 100%`
            : '';
          return `- [Backlog #${idx + 1}] **${b.title}** — \`[0 / ${b.totalBlocks} blocks]\` (\`${b.presetType}\`, Track: \`${b.trackId}${b.subTrack ? `/${b.subTrack}` : ''}\`${lockTag}) — 5m Startup: *${b.startupStep}*`;
        })
      : ['- *(No deferred items in Open List Backlog)*']),
    '',
    '## 7-Day Master Pipeline Markdown Table',
    '| Day | Load Mode | Target Blocks | Extension Deduction | Fixed Event | Early Anchor | Deliverables & Daily Ambition Drip |',
    '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |',
    ...state.pipelineDays.map((d) => {
      const effective = Math.max(
        floorTotalBlocks,
        d.baseTargetBlocks - d.deductedBlocksFromExtension
      );
      const summary = d.deliverablesCompleted || d.primaryDeliverable || '—';
      const shutdownNote = d.earlyEveningShutdownBadge
        ? ` [${d.earlyEveningShutdownBadge}]`
        : '';
      return `| ${d.dayLabel} | ${d.mode || d.loadMode}${d.cruisePlus ? '+' : ''} | ${effective} (${d.projectBlocksSummary || `${d.baseTargetBlocks} base`}) | -${d.deductedBlocksFromExtension} blks | ${d.fixedEvent}${d.fixedEventTimeLabel ? ` (${d.fixedEventTimeLabel})` : ''}${shutdownNote} | ${d.earlyMorningAnchor ? 'Yes' : 'No'} | ${summary} |`;
    }),
    '',
    '---',
    '',
    '# Part II: Off-Duty 6-Channel Evening Recharge State',
    '',
    `- **End-of-Shift Lock Status**: ${metrics.isZeroWorkLeft ? 'LOCKED ([0m work left] — Evening Menu Active)' : `ON-DUTY (${metrics.remainingWorkFormatted})`}`,
    `- **Weekly Flow Extensions Used**: ${state.recharge.weeklyExtensionsUsed} / 2 (Today Logged: ${state.recharge.flowExtensionBlocksLoggedToday} blocks)`,
    `- **Option 0 (Rest / Stillness — 20m Silent Timer)**: ${state.recharge.option0Running ? 'Running' : 'Idle'} — Consecutive Windows: \`[${state.recharge.option0ConsecutiveWindows} / 2]\` (40m Cap -> Fork Check: "Go to Sleep" vs. "Start One 5m Activity")`,
    '',
    '## Categories 1–6 (Symmetrical 3x2 Grid, `[X / 3]` Sticky Counters & 5m Startup Prompts)',
    `- **Category 1 — Music [Fluid]**: ${cat1Fluid.activeTitle} — Counter: \`[Fluid]\` — 5m Startup: *${cat1Fluid.startupStep}*`,
    `- **Category 2 — Maker / Hardware [Sticky]**: ${state.recharge.stickySlots.CAT2_MAKER.activeTitle} — Counter: \`[${state.recharge.stickySlots.CAT2_MAKER.fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots.CAT2_MAKER.startupStep}* — Backlog: ${state.recharge.stickySlots.CAT2_MAKER.backlogQueue.join(', ') || 'None'}`,
    `- **Category 3A — Media: Fiction [Sticky]**: ${state.recharge.stickySlots['3A_FICTION'].activeTitle} (${state.recharge.fictionSpeed}) — Counter: \`[${state.recharge.stickySlots['3A_FICTION'].fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots['3A_FICTION'].startupStep}* — Backlog: ${state.recharge.stickySlots['3A_FICTION'].backlogQueue.join(', ') || 'None'}`,
    `- **Category 3B — Media: Nonfiction [Sticky]**: ${state.recharge.stickySlots['3B_NONFICTION'].activeTitle} — Counter: \`[${state.recharge.stickySlots['3B_NONFICTION'].fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots['3B_NONFICTION'].startupStep}* — Backlog: ${state.recharge.stickySlots['3B_NONFICTION'].backlogQueue.join(', ') || 'None'}`,
    `- **Category 3C — Media: Video [Sticky]**: ${state.recharge.stickySlots['3C_VIDEO'].activeTitle} — Counter: \`[${state.recharge.stickySlots['3C_VIDEO'].fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots['3C_VIDEO'].startupStep}* — Backlog: ${state.recharge.stickySlots['3C_VIDEO'].backlogQueue.join(', ') || 'None'}`,
    `- **Category 4 — Comfort Show [Fluid]**: ${cat4Fluid.activeTitle} — Counter: \`[Fluid]\` — 5m Startup: *${cat4Fluid.startupStep}*`,
    `- **Category 5 — Gaming [Sticky]**: ${state.recharge.stickySlots.CAT5_GAMING.activeTitle} — Counter: \`[${state.recharge.stickySlots.CAT5_GAMING.fiveMinStarts} / 3]\` — 5m Startup: *${state.recharge.stickySlots.CAT5_GAMING.startupStep}* — Backlog: ${state.recharge.stickySlots.CAT5_GAMING.backlogQueue.join(', ') || 'None'}`,
    `- **Category 6 — Culture & Language [Fluid]**: ${cat6Fluid.activeTitle} — Counter: \`[Fluid]\` — 5m Startup: *${cat6Fluid.startupStep}*`,
    '',
    '## Off-Duty Completed Recharge Log',
    ...(rechargeLog.length > 0
      ? rechargeLog.map((entry) => `- [x] ${entry}`)
      : ['- *(No off-duty recharge sessions logged yet)*']),
    '',
    '---',
    '',
    '# Part III: Structural House Horizon & Input/Output State',
    '',
    `- **Global Symmetrical Ledger Balance**: Input: **${totalInputBlocks} blocks (${inputPct}%)** | Output: **${totalOutputBlocks} blocks (${outputPct}%)** (Target: 50% Input / 50% Output)`,
    '',
    `## Top Shelter Strip — ${shelter.title}`,
    ...shelter.horizonNotes.map(
      (n) => `- **${n.horizonLabel}**: ${n.note}`
    ),
    '',
    '## 2 Major Core Tracks & 3 Zero-Quota Sandbox Tracks',
    ...houseTracks.flatMap((t) => {
      const statusTag = t.isSandbox
        ? t.activeThisWeek
          ? 'Active Sandbox Session'
          : 'Flexible Pace / Coasting in Neutral'
        : 'Active Core Quota';
      const subTrackDetail =
        t.id === 'science'
          ? ` (1A Institutional: ${t.subTrack1ABlocksCredited || 0}b | 1B Independent: ${t.subTrack1BBlocksCredited || 0}b)`
          : '';
      const targetStr = t.isSandbox
        ? `Input: ${t.inputBlocksCredited} blks | Output: ${t.outputBlocksCredited} blks (Zero-Quota)`
        : `Input: ${t.inputBlocksCredited}/${t.inputWeeklyTarget} blks | Output: ${t.outputBlocksCredited}/${t.outputWeeklyTarget} blks${subTrackDetail}`;
      return [
        `### ${t.name} (\`${t.categoryLabel}\` — ${statusTag})`,
        `- **Track Ledger**: ${targetStr}`,
        ...t.rungs.map(
          (r) =>
            `  - **${r.label}** (\`${r.ledgerType}\`): \`[${r.completedBlocks} / ${r.targetBlocks} blocks]\` — ${r.description}`
        ),
        '',
      ];
    }),
    `## Bottom Foundation Strip — ${foundation.title}`,
    `- **Status**: ${foundation.statusSummary || 'Sleep & Hard Shutdown Protected'}`,
    ...foundation.horizonNotes.map(
      (n) => `- **${n.horizonLabel}**: ${n.note}`
    ),
    '',
    '## Completed Deliverables Archive',
    ...(archiveList.length > 0
      ? archiveList.map(
          (item) =>
            `- [x] **${item.title}** — Track: \`${item.trackId}\` | Volume: \`${item.totalBlocks} blocks\` | Completed: \`${item.completedAt}\``
        )
      : ['- *(No archived deliverables yet)*']),
    '',
    '---',
    '',
    '## Today\'s Block Log (`todayBlockLog`)',
    ...(state.todayBlockLog?.length
      ? state.todayBlockLog.map(
          (e) =>
            `- \`[${e.logicalDate}]\` **${e.title}** (${e.category} • ${e.durationMinutes}m • ${e.roadmapTrack} / ${e.stroke})`
        )
      : ['- No blocks logged yet today.']),
    '',
    '## Machine-Readable State Payload',
    '```json',
    JSON.stringify(
      (() => {
        const clean = { ...(state as unknown as Record<string, unknown>) };
        delete clean.proModeUnlocked;
        delete clean.proPasswordToken;
        delete clean.geminiApiKey;
        return clean;
      })(),
      null,
      2
    ),
    '```',
    '',
  ];
  return lines.join('\n');
}

export function parseFromStateInput(rawText: string): SymmetryState {
  const trimmed = rawText.trim();
  const jsonBlockMatch = trimmed.match(/```json\s*([\s\S]*?)```/);
  let baseState: SymmetryState = DEFAULT_SYMMETRY_STATE;
  let parsedJsonSuccessfully = false;

  if (jsonBlockMatch || trimmed.startsWith('{')) {
    const candidate = jsonBlockMatch ? jsonBlockMatch[1].trim() : trimmed;
    const parsed = JSON.parse(candidate);
    parsedJsonSuccessfully = true;
    const defaultSticky = DEFAULT_SYMMETRY_STATE.recharge.stickySlots;
    const parsedSticky = parsed.recharge?.stickySlots || {};

    const normalizeSticky = (
      def: typeof defaultSticky.CAT2_MAKER,
      raw: Partial<typeof defaultSticky.CAT2_MAKER> | undefined
    ) => {
      const merged = { ...def, ...(raw || {}) };
      const starts =
        typeof raw?.startsLogged === 'number'
          ? raw.startsLogged
          : typeof raw?.fiveMinStarts === 'number'
          ? raw.fiveMinStarts
          : def.fiveMinStarts;
      const queue = Array.isArray(merged.backlogQueue)
        ? merged.backlogQueue
        : def.backlogQueue;
      return {
        ...merged,
        backlogQueue: queue,
        queuedNextTitle: merged.queuedNextTitle || queue[0] || '',
        fiveMinStarts: starts,
        startsLogged: starts,
        archivedTitles: Array.isArray(merged.archivedTitles)
          ? merged.archivedTitles
          : [],
      };
    };

    const rawBacklogArray = Array.isArray(parsed.openListBacklog)
      ? parsed.openListBacklog
      : Array.isArray(parsed.projectBacklog)
      ? parsed.projectBacklog
      : Array.isArray(parsed.openList)
      ? parsed.openList
      : DEFAULT_SYMMETRY_STATE.openListBacklog;

    const resolvedBacklog: SymmetryState['openListBacklog'] = rawBacklogArray.map(
      (item: unknown, idx: number) => {
        if (typeof item === 'string') {
          const isDrip = /ambition|sovereign|sextant|symmetryproductivity|novel|triptych/i.test(
            item
          );
          const blocksMatch = item.match(/\((\d+)b/i);
          const totalBlocks = blocksMatch ? Math.max(1, Number(blocksMatch[1])) : 4;
          return {
            id: `proj_open_${idx + 1}`,
            title: item,
            presetType:
              totalBlocks === 8
                ? 'PAPER_8'
                : totalBlocks === 4
                ? 'SLIDES_4'
                : totalBlocks === 2
                ? 'QUICK_2'
                : 'CUSTOM',
            completedBlocks: 0,
            totalBlocks,
            blocksTotal: totalBlocks,
            trackId: isDrip ? 'writing' : 'science',
            subTrack: isDrip ? undefined : '1A_INSTITUTIONAL',
            startupStep: 'Open deliverable and complete 5-minute startup step.',
            nextStepNote: 'Queued in Open List backlog.',
            cognitiveDemand: 'DEEP_SYNTHESIS',
            isAmbitionDrip: isDrip,
            isSovereignDrip: isDrip,
            category: isDrip ? 'sovereign' : 'institutional',
          };
        }
        const obj = item as Partial<import('../types/symmetry').OpenListItem> & {
          blocksDone?: number;
        };
        const isDrip = Boolean(
          obj.isAmbitionDrip ||
            obj.isSovereignDrip ||
            obj.category === 'sovereign' ||
            obj.subTrack === '1B_INDEPENDENT' ||
            /sovereign\s+drip|ambition\s+drip/i.test(String(obj.title || ''))
        );
        const totalBlocks =
          typeof obj.totalBlocks === 'number'
            ? obj.totalBlocks
            : typeof obj.blocksTotal === 'number'
            ? obj.blocksTotal
            : 4;
        const rawTrackId = obj.trackId === 'personal' ? 'science' : obj.trackId;
        const blockedByTitle =
          typeof obj.blockedByTitle === 'string' && obj.blockedByTitle.trim()
            ? obj.blockedByTitle.trim()
            : undefined;
        return {
          id: obj.id || `proj_open_${idx + 1}`,
          title: obj.title || `Backlog Deliverable #${idx + 1}`,
          presetType: obj.presetType || 'CUSTOM',
          completedBlocks:
            typeof obj.completedBlocks === 'number'
              ? obj.completedBlocks
              : typeof obj.blocksDone === 'number'
              ? obj.blocksDone
              : 0,
          totalBlocks,
          blocksTotal: totalBlocks,
          trackId: rawTrackId || (isDrip ? 'writing' : 'science'),
          subTrack:
            obj.subTrack === '1A_INSTITUTIONAL' || obj.subTrack === '1B_INDEPENDENT'
              ? obj.subTrack
              : undefined,
          blockedByTitle,
          notes: typeof obj.notes === 'string' ? obj.notes : undefined,
          startupStep:
            obj.startupStep ||
            'Open deliverable and complete 5-minute startup step.',
          nextStepNote:
            obj.nextStepNote ||
            (blockedByTitle
              ? `Locked until "${blockedByTitle}" is 100%.`
              : 'Queued in Open List backlog.'),
          cognitiveDemand: obj.cognitiveDemand || 'DEEP_SYNTHESIS',
          isAmbitionDrip: isDrip,
          isSovereignDrip: isDrip,
          category: isDrip ? 'sovereign' : 'institutional',
          blockSubSteps: Array.isArray(obj.blockSubSteps)
            ? obj.blockSubSteps
            : undefined,
          launchUrl: typeof obj.launchUrl === 'string' ? obj.launchUrl : undefined,
          autoLaunchUrl: Boolean(obj.autoLaunchUrl),
        };
      }
    );

    const resolvedCompleted = Array.isArray(parsed.completedDeliverablesLog)
      ? parsed.completedDeliverablesLog
      : Array.isArray(parsed.completedDeliverablesArchive)
      ? parsed.completedDeliverablesArchive
      : Array.isArray(parsed.completedBlocks?.completedDeliverablesLog)
      ? parsed.completedBlocks.completedDeliverablesLog
      : DEFAULT_SYMMETRY_STATE.completedDeliverablesLog;

    const normalizeLoadMode = (rawMode: unknown): LoadMode | undefined => {
      if (rawMode === 'CRUISE' || rawMode === 'SURGE' || rawMode === 'TAPER') {
        return rawMode;
      }
      if (typeof rawMode === 'string' && rawMode.toUpperCase().startsWith('TAPER')) {
        return 'TAPER';
      }
      return undefined;
    };

    const resolvedLoadMode: LoadMode =
      normalizeLoadMode(parsed.loadMode) ||
      normalizeLoadMode(parsed.tier) ||
      DEFAULT_SYMMETRY_STATE.loadMode;

    const rawBaselineArray =
      Array.isArray(parsed.baselineBlocks) && parsed.baselineBlocks.length > 0
        ? parsed.baselineBlocks
        : Array.isArray(parsed.baselineSlots) && parsed.baselineSlots.length > 0
        ? parsed.baselineSlots
        : Array.isArray(parsed.examFloor) && parsed.examFloor.length > 0
        ? parsed.examFloor
        : DEFAULT_SYMMETRY_STATE.baselineBlocks;

    const resolvedBaselineBlocks: BaselineBlock[] = rawBaselineArray.map(
      (b: Partial<BaselineBlock>, idx: number) => {
        const target =
          typeof b.targetBlocks === 'number'
            ? b.targetBlocks
            : typeof b.blocksTarget === 'number'
            ? b.blocksTarget
            : 1;
        const earlyEligible =
          typeof b.earlyClearanceEligible === 'boolean'
            ? b.earlyClearanceEligible
            : typeof b.supportsEarlyClearance === 'boolean'
            ? b.supportsEarlyClearance
            : b.category === 'FLASHCARDS_ANATOMY' ||
              b.category === 'FLASHCARDS_COMP';
        const rawTrackId = b.trackId === 'personal' ? 'science' : b.trackId;
        return {
          id: b.id || `floor_slot_${idx + 1}`,
          title: b.title || `Baseline Slot #${idx + 1}`,
          category: b.category || 'READING',
          completed: Boolean(b.completed),
          targetBlocks: target,
          blocksTarget: target,
          completedBlocks:
            typeof b.completedBlocks === 'number'
              ? b.completedBlocks
              : b.completed
              ? target
              : 0,
          bankedViaEarlyClearance: Boolean(b.bankedViaEarlyClearance),
          reallocatedViaEarlyClearance: Boolean(b.reallocatedViaEarlyClearance),
          reallocatedBlocksCount:
            typeof b.reallocatedBlocksCount === 'number'
              ? b.reallocatedBlocksCount
              : 0,
          earlyClearanceEligible: earlyEligible,
          supportsEarlyClearance: earlyEligible,
          lateNightBlocker:
            typeof b.lateNightBlocker === 'boolean'
              ? b.lateNightBlocker
              : earlyEligible,
          startupStep:
            b.startupStep ||
            b.startupPrompt ||
            'Open baseline material and complete 5-minute startup step.',
          trackId: rawTrackId || 'science',
          cognitiveDemand: b.cognitiveDemand,
          launchUrl: typeof b.launchUrl === 'string' ? b.launchUrl : undefined,
          autoLaunchUrl: Boolean(b.autoLaunchUrl),
        };
      }
    );

    const rawQueueArray = Array.isArray(parsed.projectQueue)
      ? parsed.projectQueue
      : Array.isArray(parsed.closedList)
      ? parsed.closedList
      : DEFAULT_SYMMETRY_STATE.projectQueue;

    const resolvedProjectQueue: ProjectItem[] = rawQueueArray
      .slice(0, 3)
      .map(
        (
          rawProj: Partial<ProjectItem> & {
            blocksDone?: number;
            blocksTotal?: number;
            subSteps?: string[];
          },
          idx: number
        ) => {
          const slotNum = ((idx + 1) as 1 | 2 | 3);
          const rawTrackId =
            rawProj.trackId === 'personal' ? 'science' : rawProj.trackId;
          const isDrip =
            slotNum === 1 &&
            rawProj.isAmbitionDrip === undefined &&
            rawProj.isSovereignDrip === undefined &&
            rawProj.category === undefined
              ? false
              : Boolean(
                  rawProj.isAmbitionDrip ||
                    rawProj.isSovereignDrip ||
                    rawProj.category === 'sovereign' ||
                    (slotNum !== 1 &&
                      (rawProj.subTrack === '1B_INDEPENDENT' ||
                        rawTrackId === 'writing' ||
                        rawTrackId === 'coding' ||
                        rawTrackId === 'music' ||
                        rawTrackId === 'culture'))
                );
          const totalBlocks =
            typeof rawProj.totalBlocks === 'number'
              ? rawProj.totalBlocks
              : typeof rawProj.blocksTotal === 'number'
              ? rawProj.blocksTotal
              : 6;
          const completedBlocks =
            typeof rawProj.completedBlocks === 'number'
              ? rawProj.completedBlocks
              : typeof rawProj.blocksDone === 'number'
              ? rawProj.blocksDone
              : 0;
          const resolvedTrackId = rawTrackId || (isDrip ? 'writing' : 'science');
          const resolvedSubTrack =
            rawProj.subTrack === '1A_INSTITUTIONAL' ||
            rawProj.subTrack === '1B_INDEPENDENT'
              ? rawProj.subTrack
              : resolvedTrackId === 'science'
              ? isDrip
                ? '1B_INDEPENDENT'
                : '1A_INSTITUTIONAL'
              : undefined;
          return {
            id: rawProj.id || `proj_${slotNum}`,
            slot: slotNum,
            title: rawProj.title || `Closed List Slot #${slotNum}`,
            presetType: rawProj.presetType || 'CUSTOM',
            completedBlocks,
            totalBlocks,
            trackId: resolvedTrackId,
            subTrack: resolvedSubTrack,
            startupStep:
              rawProj.startupStep ||
              'Open deliverable and complete 5-minute startup step.',
            nextStepNote:
              rawProj.nextStepNote ||
              (isDrip
                ? 'Daily Ambition Drip — 1 block/day unlocked.'
                : slotNum === 1
                ? 'Serialized Focus #1.'
                : 'Locked until Slot #1 completes.'),
            cognitiveDemand: rawProj.cognitiveDemand || 'DEEP_SYNTHESIS',
            blockedOnExternalFeedback: Boolean(rawProj.blockedOnExternalFeedback),
            blockSubSteps: Array.isArray(rawProj.blockSubSteps)
              ? rawProj.blockSubSteps
              : Array.isArray(rawProj.subSteps)
              ? rawProj.subSteps
              : undefined,
            isAmbitionDrip: isDrip,
            isSovereignDrip: isDrip,
            category: isDrip ? 'sovereign' : 'institutional',
            launchUrl:
              typeof rawProj.launchUrl === 'string' ? rawProj.launchUrl : undefined,
            autoLaunchUrl: Boolean(rawProj.autoLaunchUrl),
          };
        }
      );

    if (
      typeof parsed.hemingwayBridge === 'string' &&
      parsed.hemingwayBridge.trim() &&
      resolvedProjectQueue.length > 0
    ) {
      resolvedProjectQueue[0] = {
        ...resolvedProjectQueue[0],
        nextStepNote:
          resolvedProjectQueue[0].nextStepNote || parsed.hemingwayBridge.trim(),
      };
    }

    const resolvedDiscretionaryBlocks =
      typeof parsed.discretionaryBlocksCompletedToday === 'number'
        ? parsed.discretionaryBlocksCompletedToday
        : typeof parsed.completedBlocks === 'number'
        ? parsed.completedBlocks
        : typeof parsed.completedBlocks?.discretionaryBlocksCompletedToday ===
          'number'
        ? parsed.completedBlocks.discretionaryBlocksCompletedToday
        : DEFAULT_SYMMETRY_STATE.discretionaryBlocksCompletedToday;

    const resolvedDailySovereignDripDone =
      typeof parsed.dailySovereignDripDone === 'boolean'
        ? parsed.dailySovereignDripDone
        : Boolean(
            parsed.dailyAmbitionDrip &&
              parsed.dailyAmbitionDrip.completedToday >=
                (parsed.dailyAmbitionDrip.targetBlocksPerDay || 1)
          );

    const resolvedDailySovereignDripTarget =
      typeof parsed.dailyAmbitionDrip?.targetBlocksPerDay === 'number'
        ? Math.max(1, Math.round(parsed.dailyAmbitionDrip.targetBlocksPerDay))
        : typeof parsed.dailySovereignDripTarget === 'number' &&
          !Number.isNaN(parsed.dailySovereignDripTarget)
        ? Math.max(1, Math.round(parsed.dailySovereignDripTarget))
        : 1;

    const resolvedSovereignGoldenRuleMode =
      typeof parsed.dailyAmbitionDrip?.enabled === 'boolean'
        ? parsed.dailyAmbitionDrip.enabled
        : typeof parsed.sovereignGoldenRuleMode === 'boolean'
        ? parsed.sovereignGoldenRuleMode
        : true;

    const resolvedDailyAmbitionDrip = getEffectiveDailyAmbitionDrip({
      dailyAmbitionDrip: parsed.dailyAmbitionDrip,
      dailySovereignDripDone: resolvedDailySovereignDripDone,
      dailySovereignDripTarget: resolvedDailySovereignDripTarget,
      sovereignGoldenRuleMode: resolvedSovereignGoldenRuleMode,
    });

    const resolvedTodayBlockLog = Array.isArray(parsed.todayBlockLog)
      ? parsed.todayBlockLog
      : Array.isArray(parsed.completedBlocks?.todayBlockLog)
      ? parsed.completedBlocks.todayBlockLog
      : DEFAULT_SYMMETRY_STATE.todayBlockLog;

    const resolvedPipelineDays =
      Array.isArray(parsed.pipelineDays) && parsed.pipelineDays.length > 0
        ? parsed.pipelineDays
        : Array.isArray(parsed.sevenDayPipeline) &&
          parsed.sevenDayPipeline.length > 0
        ? parsed.sevenDayPipeline
        : DEFAULT_SYMMETRY_STATE.pipelineDays;

    const parsedRechargeSource =
      parsed.recharge || parsed.sanctuaryPillars || {};
    const parsedStickyFromSource =
      parsedRechargeSource.stickySlots || parsedSticky || {};

    const resolvedFluidCat6 = {
      ...DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT6_CULTURE!,
      ...(parsedRechargeSource?.fluidCategories?.CAT6_CULTURE || {}),
    };

    const rawCategoryCards = Array.isArray(parsedRechargeSource?.categoryCards)
      ? parsedRechargeSource.categoryCards
      : undefined;

    const resolvedCategoryCards =
      rawCategoryCards && rawCategoryCards.length > 0
        ? rawCategoryCards.some(
            (c: Partial<import('../types/symmetry').EveningCategoryCardConfig>) =>
              c.id === 'CAT6_CULTURE' || c.legacyCategoryKey === 'CAT6_CULTURE'
          )
          ? rawCategoryCards
          : [
              ...rawCategoryCards,
              {
                id: 'CAT6_CULTURE',
                slotNumber: 6,
                categoryName:
                  parsed.profilePresetId === 'AVERY_DEFAULT'
                    ? 'Italian Culture & Language'
                    : 'Culture & Language',
                subtitle:
                  parsed.profilePresetId === 'AVERY_DEFAULT'
                    ? resolvedFluidCat6.subtitle
                    : 'Low-pressure cultural & spoken language immersion — zero SRS flashcards.',
                behavior: 'FLUID' as const,
                trackMode: 'SINGLE' as const,
                activeTitle:
                  parsed.profilePresetId === 'AVERY_DEFAULT'
                    ? resolvedFluidCat6.activeTitle
                    : 'Spoken Audio, Foreign Cinema & Culinary Prep',
                startupPrompt:
                  parsed.profilePresetId === 'AVERY_DEFAULT'
                    ? resolvedFluidCat6.startupStep
                    : '5m spoken audio lesson, foreign music/cinema, or culinary prep — zero SRS flashcards',
                backlogQueue: [],
                fiveMinStarts: 0,
                unlockedViaCheckIn: false,
                hidden: false,
                legacyCategoryKey: 'CAT6_CULTURE' as const,
                fluidKey: 'CAT6_CULTURE' as const,
                launchUrl: resolvedFluidCat6.launchUrl,
                autoLaunchUrl: resolvedFluidCat6.autoLaunchUrl,
              },
            ]
        : undefined;

    const resolvedRoadmapTracks = migrateRoadmapTracksToHouseTopology(
      parsed.roadmapTracks
    );

    const resolvedShelter: import('../types/symmetry').RoadmapHouseStrip =
      parsed.roadmapShelter && Array.isArray(parsed.roadmapShelter.horizonNotes)
        ? {
            ...DEFAULT_HOUSE_SHELTER,
            ...parsed.roadmapShelter,
          }
        : DEFAULT_HOUSE_SHELTER;

    const resolvedFoundation: import('../types/symmetry').RoadmapHouseStrip =
      parsed.roadmapFoundation &&
      Array.isArray(parsed.roadmapFoundation.horizonNotes)
        ? {
            ...DEFAULT_HOUSE_FOUNDATION,
            ...parsed.roadmapFoundation,
          }
        : DEFAULT_HOUSE_FOUNDATION;

    baseState = {
      ...DEFAULT_SYMMETRY_STATE,
      ...parsed,
      loadMode: resolvedLoadMode,
      discretionaryBlocksCompletedToday: resolvedDiscretionaryBlocks,
      dailyAmbitionDrip: resolvedDailyAmbitionDrip,
      dailySovereignDripDone: resolvedDailySovereignDripDone,
      dailySovereignDripTarget: resolvedDailySovereignDripTarget,
      sovereignGoldenRuleMode: resolvedSovereignGoldenRuleMode,
      ankiConnectEnabled: Boolean(parsed.ankiConnectEnabled),
      ankiConnectUrl:
        typeof parsed.ankiConnectUrl === 'string' && parsed.ankiConnectUrl.trim()
          ? parsed.ankiConnectUrl.trim()
          : 'http://127.0.0.1:8765',
      profilePresetId: parsed.profilePresetId || DEFAULT_SYMMETRY_STATE.profilePresetId,
      profileName: parsed.profileName || DEFAULT_SYMMETRY_STATE.profileName,
      energyBandwidth:
        parsed.energyBandwidth === 'SHARP' ||
        parsed.energyBandwidth === 'STEADY' ||
        parsed.energyBandwidth === 'LOW_FOGGY'
          ? parsed.energyBandwidth
          : DEFAULT_SYMMETRY_STATE.energyBandwidth,
      shockAbsorberMode:
        parsed.shockAbsorberMode === 'FULL_SHIFT' ||
        parsed.shockAbsorberMode === 'HALF_SHIFT' ||
        parsed.shockAbsorberMode === 'MVF_FLOOR'
          ? parsed.shockAbsorberMode
          : DEFAULT_SYMMETRY_STATE.shockAbsorberMode,
      shockAbsorberDeferredBlocks:
        typeof parsed.shockAbsorberDeferredBlocks === 'number'
          ? parsed.shockAbsorberDeferredBlocks
          : 0,
      flexibilityTuning: {
        ...DEFAULT_FLEXIBILITY_TUNING,
        ...(parsed.flexibilityTuning || {}),
      },
      logicalDayRolloverHour:
        typeof parsed.logicalDayRolloverHour === 'number'
          ? Math.max(0, Math.min(6, Math.round(parsed.logicalDayRolloverHour)))
          : DEFAULT_SYMMETRY_STATE.logicalDayRolloverHour,
      earlyEveningShutdownTime:
        typeof parsed.earlyEveningShutdownTime === 'string' &&
        parsed.earlyEveningShutdownTime.trim()
          ? parsed.earlyEveningShutdownTime.trim()
          : DEFAULT_SYMMETRY_STATE.earlyEveningShutdownTime,
      taskWeights: {
        ...DEFAULT_SYMMETRY_STATE.taskWeights!,
        ...(parsed.taskWeights || {}),
      },
      breakOptions: {
        ...DEFAULT_SYMMETRY_STATE.breakOptions!,
        ...(parsed.breakOptions || {}),
      },
      preExamTaperActive: Boolean(parsed.preExamTaperActive),
      todayBlockLog: resolvedTodayBlockLog,
      upcomingMilestones:
        Array.isArray(parsed.upcomingMilestones) &&
        parsed.upcomingMilestones.length > 0
          ? parsed.upcomingMilestones
          : DEFAULT_SYMMETRY_STATE.upcomingMilestones,
      baselineBlocks: resolvedBaselineBlocks,
      baselineSlots: resolvedBaselineBlocks,
      projectQueue: resolvedProjectQueue,
      projectBacklog: resolvedBacklog,
      openListBacklog: resolvedBacklog,
      completedDeliverablesLog: resolvedCompleted,
      completedDeliverablesArchive: resolvedCompleted,
      pipelineDays: resolvedPipelineDays,
      sevenDayPipeline: resolvedPipelineDays,
      roadmapShelter: resolvedShelter,
      roadmapFoundation: resolvedFoundation,
      roadmapTracks: resolvedRoadmapTracks,
      timer: {
        ...DEFAULT_SYMMETRY_STATE.timer,
        ...(parsed.timer || {}),
        elasticMultiplier:
          parsed.timer?.elasticMultiplier === 0.5 ||
          parsed.timer?.elasticMultiplier === 1.0 ||
          parsed.timer?.elasticMultiplier === 2.0
            ? parsed.timer.elasticMultiplier
            : 1.0,
        startupShrinkLevel:
          parsed.timer?.startupShrinkLevel === 1 ||
          parsed.timer?.startupShrinkLevel === 2 ||
          parsed.timer?.startupShrinkLevel === 3
            ? parsed.timer.startupShrinkLevel
            : 1,
      },
      dailyHistory:
        Array.isArray(parsed.dailyHistory) && parsed.dailyHistory.length > 0
          ? parsed.dailyHistory
          : DEFAULT_SYMMETRY_STATE.dailyHistory,
      stateBackups: Array.isArray(parsed.stateBackups)
        ? parsed.stateBackups.slice(0, MAX_STATE_BACKUPS)
        : DEFAULT_SYMMETRY_STATE.stateBackups || [],
      audioSettings: {
        ...DEFAULT_AUDIO_ENGINE_SETTINGS,
        ...(parsed.audioSettings || {}),
      },
      recharge: {
        ...DEFAULT_SYMMETRY_STATE.recharge,
        ...parsedRechargeSource,
        categoryCards: resolvedCategoryCards,
        manualEveningPreview:
          typeof parsed.watchmansRest === 'boolean' &&
          parsedRechargeSource.manualEveningPreview === undefined
            ? parsed.watchmansRest
            : Boolean(parsedRechargeSource.manualEveningPreview),
        fluidCategories: {
          CAT1_MUSIC: {
            ...DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT1_MUSIC,
            ...(parsedRechargeSource?.fluidCategories?.CAT1_MUSIC || {}),
          },
          CAT4_COMFORT: {
            ...DEFAULT_SYMMETRY_STATE.recharge.fluidCategories!.CAT4_COMFORT,
            ...(parsedRechargeSource?.fluidCategories?.CAT4_COMFORT || {}),
          },
          CAT6_CULTURE: resolvedFluidCat6,
        },
        completedLog: Array.isArray(parsedRechargeSource?.completedLog)
          ? parsedRechargeSource.completedLog
          : DEFAULT_SYMMETRY_STATE.recharge.completedLog,
        stickySlots: {
          CAT2_MAKER: normalizeSticky(
            defaultSticky.CAT2_MAKER,
            parsedStickyFromSource.CAT2_MAKER
          ),
          '3A_FICTION': normalizeSticky(
            defaultSticky['3A_FICTION'],
            parsedStickyFromSource['3A_FICTION']
          ),
          '3B_NONFICTION': normalizeSticky(
            defaultSticky['3B_NONFICTION'],
            parsedStickyFromSource['3B_NONFICTION']
          ),
          '3C_VIDEO': normalizeSticky(
            defaultSticky['3C_VIDEO'],
            parsedStickyFromSource['3C_VIDEO']
          ),
          CAT5_GAMING: normalizeSticky(
            defaultSticky.CAT5_GAMING,
            parsedStickyFromSource.CAT5_GAMING
          ),
        },
      },
      lastUpdated:
        typeof parsed.lastUpdated === 'number' ? parsed.lastUpdated : undefined,
    };
  }

  // If the input contains Markdown sections (# Part I, # Part II, # Part III), apply any markdown-level overrides
  const hasMarkdownHeadings =
    trimmed.includes('# Part I') ||
    trimmed.includes('# Part II') ||
    trimmed.includes('# Part III') ||
    trimmed.includes('# SymmetryManager');

  if (!parsedJsonSuccessfully && !hasMarkdownHeadings) {
    throw new Error('Unrecognized state.md or JSON format');
  }

  if (hasMarkdownHeadings) {
    const mdWithoutJson = trimmed.replace(/```json[\s\S]*?```/g, '');

    // Parse Active Load Mode & Target Ceiling
    const modeMatch = mdWithoutJson.match(
      /\*\*Active Load Mode\*\*:\s*(CRUISE|SURGE|TAPER)(\s*\(Cruise\+\))?(?:\s*—\s*Target Ceiling:\s*(\d+)\s*blocks)?/i
    );
    if (modeMatch) {
      const mode = modeMatch[1].toUpperCase() as import('../types/symmetry').LoadMode;
      const cruisePlus = Boolean(modeMatch[2]);
      const ceiling = modeMatch[3]
        ? Number(modeMatch[3])
        : baseState.customModeBlockAdjustment;
      baseState = {
        ...baseState,
        loadMode: mode,
        cruisePlus,
        customModeBlockAdjustment: ceiling,
      };
    }

    // Parse Consecutive Surge Days
    const surgeMatch = mdWithoutJson.match(
      /\*\*Consecutive Surge Days\*\*:\s*(\d+)\s*\/\s*2/i
    );
    if (surgeMatch) {
      baseState = {
        ...baseState,
        surgeConsecutiveDays: Math.min(2, Math.max(0, Number(surgeMatch[1]))),
      };
    }

    // Parse Fixed Event Anchor
    const fixedMatch = mdWithoutJson.match(
      /\*\*Fixed Event Anchor\*\*:\s*(NONE|LAB_2H|VOLUNTEER|EVENING_OUTING_6PM)/i
    );
    if (fixedMatch) {
      baseState = {
        ...baseState,
        fixedEvent: fixedMatch[1].toUpperCase() as import('../types/symmetry').FixedEventType,
      };
    }

    // Parse Sticky [X / 3] counters from Part II
    const stickyCounterMap: { pattern: RegExp; key: import('../types/symmetry').StickyKey }[] = [
      {
        pattern: /Category 2 — Maker[\s\S]*?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?/i,
        key: 'CAT2_MAKER',
      },
      {
        pattern: /Category 3A — Media: Fiction[\s\S]*?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?/i,
        key: '3A_FICTION',
      },
      {
        pattern: /Category 3B — Media: Nonfiction[\s\S]*?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?/i,
        key: '3B_NONFICTION',
      },
      {
        pattern: /Category 3C — Media: Video[\s\S]*?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?/i,
        key: '3C_VIDEO',
      },
      {
        pattern: /Category 5 — Gaming[\s\S]*?Counter:\s*`?\[(\d+)\s*\/\s*3\]`?/i,
        key: 'CAT5_GAMING',
      },
    ];
    const updatedSticky = { ...baseState.recharge.stickySlots };
    for (const item of stickyCounterMap) {
      const m = mdWithoutJson.match(item.pattern);
      if (m) {
        updatedSticky[item.key] = {
          ...updatedSticky[item.key],
          fiveMinStarts: Math.min(3, Math.max(0, Number(m[1]))),
        };
      }
    }
    baseState = {
      ...baseState,
      recharge: {
        ...baseState.recharge,
        stickySlots: updatedSticky,
      },
    };
  }

  return baseState;
}

/**
 * Synchronizes today's live telemetry into the 90-day `dailyHistory` array.
 */
export function syncTodayIntoDailyHistory(
  state: SymmetryState
): import('../types/symmetry').DailyHistoryEntry[] {
  const logicalDate =
    state.logicalDayKey ||
    getLogicalDayKey(new Date(), state.logicalDayRolloverHour ?? 4);
  const existingHistory =
    Array.isArray(state.dailyHistory) && state.dailyHistory.length > 0
      ? [...state.dailyHistory]
      : buildDefault90DayHistory(logicalDate);

  const metrics = computeShiftMetrics(state);
  const completedBaseline = Math.round(
    state.baselineBlocks.reduce(
      (sum, b) => sum + getBaselineSlotCompletedBlocks(b),
      0
    )
  );
  const mediaStartsToday = (state.todayBlockLog || []).filter(
    (e) =>
      e.logicalDate === logicalDate &&
      e.category === 'EVENING_RECHARGE' &&
      e.stroke === 'INPUT'
  ).length;
  const inputBlocks = completedBaseline + mediaStartsToday;
  const outputBlocks =
    state.discretionaryBlocksCompletedToday +
    (state.recharge?.flowExtensionBlocksLoggedToday || 0);
  const eveningSessions = Math.max(
    state.recharge?.completedLog?.length || 0,
    (state.todayBlockLog || []).filter(
      (e) => e.logicalDate === logicalDate && e.category === 'EVENING_RECHARGE'
    ).length
  );

  const todayEntry: import('../types/symmetry').DailyHistoryEntry = {
    logicalDate,
    mode:
      metrics.isZeroWorkLeft && eveningSessions > 0
        ? 'EVENING_RECHARGE'
        : state.preExamTaperActive
        ? 'TAPER'
        : state.loadMode,
    blocksCompleted: metrics.totalCompletedBlocks,
    inputBlocks,
    outputBlocks,
    eveningSessions,
  };

  const idx = existingHistory.findIndex((h) => h.logicalDate === logicalDate);
  if (idx >= 0) {
    existingHistory[idx] = todayEntry;
  } else {
    existingHistory.push(todayEntry);
  }

  return existingHistory.slice(-90);
}

/**
 * Loads persisted backups from localStorage (fallback ring buffer across resets)
 */
export function loadExternalStateBackups(): import('../types/symmetry').StateBackupSnapshot[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_STATE_BACKUPS);
    }
  } catch {
    // ignore corrupt storage
  }
  return [];
}

/**
 * Creates a validated snapshot of the current state and pushes it to the 7-item ring buffer.
 */
export function pushStateBackup(
  currentState: SymmetryState,
  triggerReason: import('../types/symmetry').BackupTriggerReason,
  label: string
): import('../types/symmetry').StateBackupSnapshot[] {
  const metrics = computeShiftMetrics(currentState);
  const cleanStateToSerialize: SymmetryState = {
    ...currentState,
    stateBackups: undefined,
  };
  const snapshot: import('../types/symmetry').StateBackupSnapshot = {
    id: `bkp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    createdAtIso: new Date().toISOString(),
    logicalDate: currentState.logicalDayKey || getLogicalDayKey(),
    triggerReason,
    label,
    profileName: currentState.profileName || DEFAULT_SYMMETRY_STATE.profileName!,
    loadMode: currentState.loadMode,
    blocksCompleted: metrics.totalCompletedBlocks,
    targetBlocks: metrics.totalTargetBlocks,
    stateJson: JSON.stringify(cleanStateToSerialize),
  };

  const existing =
    currentState.stateBackups && currentState.stateBackups.length > 0
      ? currentState.stateBackups
      : loadExternalStateBackups();

  const updated = [snapshot, ...existing.filter((b) => b.id !== snapshot.id)].slice(
    0,
    MAX_STATE_BACKUPS
  );

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore storage quota errors
    }
  }

  return updated;
}

/**
 * Validates a snapshot JSON string against full SymmetryState schema requirements
 * before restoring it.
 */
export function validateAndRestoreStateSnapshot(
  snapshotJson: string,
  preserveBackups?: import('../types/symmetry').StateBackupSnapshot[]
): SymmetryState {
  if (!snapshotJson || typeof snapshotJson !== 'string') {
    throw new Error('Snapshot payload is empty or invalid.');
  }
  let rawObj: Record<string, unknown>;
  try {
    rawObj = JSON.parse(snapshotJson);
  } catch {
    throw new Error('Snapshot JSON is malformed and cannot be parsed.');
  }
  if (!rawObj || typeof rawObj !== 'object') {
    throw new Error('Snapshot root must be a JSON object.');
  }
  if (
    !['CRUISE', 'SURGE', 'TAPER'].includes(String(rawObj.loadMode || '')) ||
    !Array.isArray(rawObj.baselineBlocks) ||
    !Array.isArray(rawObj.projectQueue) ||
    !Array.isArray(rawObj.roadmapTracks) ||
    typeof rawObj.timer !== 'object' ||
    typeof rawObj.recharge !== 'object'
  ) {
    throw new Error(
      'Snapshot failed schema validation (missing loadMode, baselineBlocks, projectQueue, timer, or recharge).'
    );
  }

  const restored = parseFromStateInput(snapshotJson);
  return {
    ...restored,
    timer: {
      ...restored.timer,
      isRunning: false,
      targetEndTimeMs: null,
    },
    stateBackups: preserveBackups ?? restored.stateBackups ?? loadExternalStateBackups(),
  };
}


