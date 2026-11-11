import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Check,
  Clock,
  Copy,
  Download,
  FastForward,
  History,
  KeyRound,
  Layers,
  ListChecks,
  Loader2,
  Lock,
  Maximize2,
  Minimize2,
  Moon,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  ShieldCheck,
  Sliders,
  Sparkles,
  Timer,
  Upload,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { triggerHaptic } from './utils/haptics';
import {
  AudioEngineSettings,
  BaselineCategory,
  BlockCadencePreset,
  ClosedListLockMode,
  CompletedDeliverableEntry,
  DailyAmbitionDripConfig,
  EarlyClearanceActionMode,
  ElasticBlockMultiplier,
  EnergyBandwidthState,
  EveningPulseSensitivity,
  FixedEventType,
  LayoutMode,
  Level2BreakProtocol,
  LoadMode,
  MajorSubTrackId,
  MediaSubTrackId,
  OpenListItem,
  PipelineDay,
  ProfilePresetId,
  ProjectPresetType,
  RechargeCategoryId,
  RoadmapFoundationConfig,
  RoadmapShelterConfig,
  ShockAbsorberMode,
  SmartIntakePlanResult,
  SoundscapeMode,
  StartupShrinkLevel,
  StickyKey,
  StressResetProtocol,
  StructureFlexibilityConfig,
  SymmetryState,
  TabId,
  TimerRunMode,
  TodayBlockLogCategory,
  TodayBlockLogEntry,
  TrackId,
} from './types/symmetry';
import {
  computeShiftMetrics,
  createLogTimestamp,
  DEFAULT_AUDIO_ENGINE_SETTINGS,
  cycleCognitiveDemandTag,
  DEFAULT_FLEXIBILITY_TUNING,
  DEFAULT_HOUSE_FOUNDATION,
  DEFAULT_HOUSE_SHELTER,
  DEFAULT_SYMMETRY_STATE,
  formatRolloverHourLabel,
  generateSequentialChecklist,
  getActiveBlockDurationsSeconds,
  getActiveFocusProject,
  getBaselineCognitiveDemand,
  getBaselineSlotCompletedBlocks,
  getBaselineSlotTargetBlocks,
  getEffectiveDailyAmbitionDrip,
  getLogicalDayKey,
  getPreExamTaperSuggestion,
  getProjectActiveStartupStep,
  isBaselineSlotClearedForToday,
  isBaselineSlotEarlyClearanceEligible,
  isOpenListItemUnlocked,
  isProjectAmbitionDripEligible,
  isProjectSovereignDrip,
  isTodayExamDay,
  getProjectCognitiveDemand,
  parseFromStateInput,
  pushStateBackup,
  serializeToStateMarkdown,
  syncTodayIntoDailyHistory,
  validateAndRestoreStateSnapshot,
} from './state/defaultState';
import {
  applyPresetToState,
  ApplyPresetOptions,
  buildStateForPreset,
  getStoredArchitectModeUnlocked,
  getVisibleProfilePresets,
  isArchitectDomain,
  isArchitectUrlPath,
  ONBOARDING_COMPLETED_KEY,
  PROFILE_PRESET_METADATA,
  setStoredArchitectModeUnlocked,
  syncCategoryCardsToLegacyRecharge,
  UniversalPresetDefinition,
} from './state/profilePresets';
import { fetchAnkiConnectReviewedToday } from './utils/ankiConnectClient';
import {
  cancelAllScheduledStageAlarms,
  fireSymmetryNotification,
  initSymmetryNotifications,
  NotificationLogEntry,
  scheduleTimerNotificationAt,
  SymmetryNotificationEvent,
} from './utils/notifications';
import {
  applySmartIntakePlanToState,
  getEnvGeminiApiKey,
  getStoredGeminiApiKey,
  setStoredGeminiApiKey,
} from './utils/smartIntakePlanner';
import {
  isProModeUnlocked,
  lockProMode,
  PRO_MODE_CHANGE_EVENT,
  stripProSecretsFromStateObject,
  verifyProModePassword,
} from './utils/geminiClient';
import { playHarmonicChord, SOUNDSCAPE_METADATA, soundEngine } from './utils/soundEngine';
import { DualRingTimerSvg } from './components/DualRingTimerSvg';
import {
  ExternalMiniHud,
  useExternalMiniHudController,
} from './components/ExternalMiniHud';
import { HeaderBar } from './components/HeaderBar';
import { InsightsModal } from './components/InsightsModal';
import { KeyboardShortcutModal } from './components/KeyboardShortcutModal';
import { MobileBottomSheet } from './components/MobileBottomSheet';
import { CommandPaletteModal } from './components/CommandPaletteModal';
import { ConversationalArchitectModal } from './components/ConversationalArchitectModal';
import { GeminiBridgeModal } from './components/GeminiBridgeModal';
import {
  extractGeminiSyncParamFromLocation,
  parseGeminiResponseToStatePatch,
} from './utils/geminiImporter';
import {
  generateGeminiImportPrompt,
  stripMarkdownJsonFences,
} from './utils/geminiPromptGenerator';
import { OnboardingWizardModal } from './components/OnboardingWizardModal';
import { PipelineDrawer } from './components/PipelineDrawer';
import { PlanningAssistantDrawer } from './components/PlanningAssistantDrawer';
import { SpotlightTourModal } from './components/SpotlightTourModal';
import { TodayLogDrawer } from './components/TodayLogDrawer';
import { UndoToast, UndoToastState } from './components/UndoToast';
import { Tab1Pipeline } from './components/Tab1Pipeline';
import { Tab2TimerTriage } from './components/Tab2TimerTriage';
import { Tab3Recharge } from './components/Tab3Recharge';
import { Tab4Roadmap } from './components/Tab4Roadmap';
import {
  LIVE_SYNC_CHANNEL_NAME,
  useSymmetrySync,
} from './hooks/useSymmetrySync';

export { LIVE_SYNC_CHANNEL_NAME };

function detectInitialArchitectUnlock(): {
  unlocked: boolean;
  triggeredViaUrl: boolean;
} {
  if (typeof window === 'undefined') {
    return { unlocked: false, triggeredViaUrl: false };
  }
  try {
    const url = new URL(window.location.href);
    const modeParam = url.searchParams.get('mode')?.toLowerCase();
    const hashValue = url.hash.replace(/^#/, '').toLowerCase();
    const isPathTrigger = isArchitectUrlPath(url.pathname);
    const isUrlTrigger =
      isPathTrigger ||
      modeParam === 'avery' ||
      modeParam === 'architect' ||
      hashValue === 'avery' ||
      hashValue === 'architect';

    if (isUrlTrigger) {
      setStoredArchitectModeUnlocked(true);
      try {
        localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      } catch {
        // Ignore storage errors
      }
      if (modeParam === 'avery' || modeParam === 'architect') {
        url.searchParams.delete('mode');
      }
      const nextSearch = url.searchParams.toString();
      const nextHash =
        hashValue === 'avery' || hashValue === 'architect' ? '' : url.hash;
      const normalizedPath = isPathTrigger
        ? url.pathname.replace(/\/(avery|architect)\/?$/i, '/') || '/'
        : url.pathname;
      const cleanUrl = `${normalizedPath}${nextSearch ? `?${nextSearch}` : ''}${nextHash}`;
      window.history.replaceState({}, document.title, cleanUrl);
      return { unlocked: true, triggeredViaUrl: true };
    }

    if (isArchitectDomain(window.location.hostname)) {
      setStoredArchitectModeUnlocked(true);
      return { unlocked: true, triggeredViaUrl: false };
    }

    return {
      unlocked: getStoredArchitectModeUnlocked(),
      triggeredViaUrl: false,
    };
  } catch {
    return { unlocked: false, triggeredViaUrl: false };
  }
}

export function App() {
  const [initialUnlockInfo] = useState(() => detectInitialArchitectUnlock());
  const [architectModeUnlocked, setArchitectModeUnlocked] = useState<boolean>(
    initialUnlockInfo.unlocked
  );
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // 10-Second Undo Toast Stack & Countdown
  const undoStackRef = useRef<SymmetryState[]>([]);
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number>(10);
  const toggleMiniHudRef = useRef<() => void>(() => {});

  const pushUndoSnapshot = useCallback((snapshot: SymmetryState, label: string) => {
    const cloned: SymmetryState = JSON.parse(JSON.stringify(snapshot));
    undoStackRef.current = [cloned, ...undoStackRef.current.slice(0, 19)];
    const expiresAtMs = Date.now() + 10_000;
    setUndoToast({
      id: `undo_${Date.now()}`,
      label,
      expiresAtMs,
    });
    setUndoSecondsLeft(10);
  }, []);

  const showNotice = useCallback((msg: string) => {
    setStatusNotice(msg);
  }, []);

  const {
    state,
    setState,
    user,
    syncStatus,
    isFirebaseConfigured,
    firebaseSetupModalOpen,
    setFirebaseSetupModalOpen,
    connectFirebaseWithConfig,
    signInWithGoogle,
    signOutUser,
    exportStateJson,
    importStateJsonFile,
  } = useSymmetrySync({
    initialUnlockInfo,
    onNotify: showNotice,
    onPushUndoSnapshot: pushUndoSnapshot,
  });
  const [firebaseConfigDraft, setFirebaseConfigDraft] = useState<string>('');

  const [activeTab, setActiveTab] = useState<TabId>('PIPELINE');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('symmetrical_layout_mode');
        if (stored === 'FULL' || stored === 'COMPACT') {
          return stored;
        }
        localStorage.setItem('symmetrical_layout_mode', 'FULL');
      }
    } catch {
      // Fallback to FULL
    }
    return 'FULL';
  });

  const handleToggleLayoutMode = useCallback(() => {
    triggerHaptic([10]);
    soundEngine.playTactileClick('MODE_TOGGLE');
    setLayoutMode((prev) => {
      const next: LayoutMode = prev === 'FULL' ? 'COMPACT' : 'FULL';
      try {
        localStorage.setItem('symmetrical_layout_mode', next);
      } catch {
        // Ignore storage errors
      }
      return next;
    });
  }, []);

  const [todayLogDrawerOpen, setTodayLogDrawerOpen] = useState(false);
  const [pipelineDrawerOpen, setPipelineDrawerOpen] = useState(false);
  const [assistantDrawerOpen, setAssistantDrawerOpen] = useState(false);
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [geminiBridgeOpen, setGeminiBridgeOpen] = useState(false);
  const [geminiBridgeInitialTab, setGeminiBridgeInitialTab] = useState<
    'EXPORT' | 'IMPORT'
  >('EXPORT');
  const [geminiBridgeInitialImportText, setGeminiBridgeInitialImportText] =
    useState<string>('');
  const [geminiBridgeSourceLabel, setGeminiBridgeSourceLabel] = useState<
    string | null
  >(null);
  const [isGlobalFileDragOver, setIsGlobalFileDragOver] = useState(false);
  const [onboardingWizardOpen, setOnboardingWizardOpen] = useState(false);
  const [isFirstVisitOnboarding, setIsFirstVisitOnboarding] = useState(false);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [spotlightTourOpen, setSpotlightTourOpen] = useState(false);
  const [commandDockOpen, setCommandDockOpen] = useState(false);
  const [conversationalArchitectOpen, setConversationalArchitectOpen] =
    useState(false);
  const [cinemaFocusMode, setCinemaFocusMode] = useState(false);
  const [stateIoText, setStateIoText] = useState('');
  const [stateModalCustomPromptRequest, setStateModalCustomPromptRequest] =
    useState('');
  const [stateModalStep1Copied, setStateModalStep1Copied] = useState(false);
  const [notificationLog, setNotificationLog] = useState<NotificationLogEntry[]>([]);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [swOfflineReady, setSwOfflineReady] = useState(false);

  // Smart Intake & Week Planner state + Pro Mode & Gemini API Key storage
  const [smartIntakeText, setSmartIntakeText] = useState('');
  const [smartIntakePreview, setSmartIntakePreview] =
    useState<SmartIntakePlanResult | null>(null);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>(() =>
    getStoredGeminiApiKey()
  );
  const [proModeUnlocked, setProModeUnlocked] = useState<boolean>(() =>
    isProModeUnlocked()
  );
  const [proPasswordInput, setProPasswordInput] = useState<string>('');
  const [proVerifyLoading, setProVerifyLoading] = useState<boolean>(false);
  const [proVerifyError, setProVerifyError] = useState<string | null>(null);
  const [apiKeyVersion, setApiKeyVersion] = useState(0);

  useEffect(() => {
    const handleProModeChange = () => {
      setProModeUnlocked(isProModeUnlocked());
      setGeminiApiKeyInput(getStoredGeminiApiKey());
      setApiKeyVersion((v) => v + 1);
    };
    window.addEventListener(PRO_MODE_CHANGE_EVENT, handleProModeChange);
    return () =>
      window.removeEventListener(PRO_MODE_CHANGE_EVENT, handleProModeChange);
  }, []);

  const handleTriggerUndo = useCallback(() => {
    const [latestSnapshot, ...rest] = undoStackRef.current;
    if (!latestSnapshot) return;
    undoStackRef.current = rest;
    soundEngine.playTactileClick('MODE_TOGGLE');
    setState(latestSnapshot);
    const restoredLayout: LayoutMode =
      latestSnapshot.uiLayoutMode === 'widget' ? 'COMPACT' : 'FULL';
    setLayoutMode(restoredLayout);
    try {
      localStorage.setItem('symmetrical_layout_mode', restoredLayout);
    } catch {
      // Ignore storage errors
    }
    setUndoToast(null);
    setStatusNotice(
      'Undid last action — restored previous workspace configuration, block counters, and Roadmap totals.'
    );
  }, [setState]);

  const handleUpdateAudioSettings = useCallback(
    (patch: Partial<AudioEngineSettings>) => {
      setState((prev) => {
        const nextAudio: AudioEngineSettings = {
          ...DEFAULT_AUDIO_ENGINE_SETTINGS,
          ...(prev.audioSettings || {}),
          ...patch,
        };
        soundEngine.updateSettings(nextAudio);
        return {
          ...prev,
          audioSettings: nextAudio,
        };
      });
    },
    []
  );

  const dispatchLockScreenAlert = (
    eventType: SymmetryNotificationEvent,
    title: string,
    body: string
  ) => {
    fireSymmetryNotification(eventType, title, body).then((entry) => {
      setNotificationLog((prev) => [entry, ...prev.slice(0, 19)]);
    });
  };

  // Initialize Capacitor Android Notification Channel, PWA Service Worker, & Android App Shortcuts (?action=start|reset|evening)
  useEffect(() => {
    initSymmetryNotifications()
      .then((res) => {
        setNotificationsGranted(res.granted);
      })
      .catch(() => {});
    try {
      if ('serviceWorker' in navigator && navigator.serviceWorker) {
        navigator.serviceWorker.ready
          .then(() => setSwOfflineReady(true))
          .catch(() => setSwOfflineReady(false));
      }
    } catch {
      // Restricted context; swOfflineReady remains false
    }

    if (typeof window !== 'undefined') {
      // Method 3: Deep-Link URL Importer (?geminiSync=<base64> or #geminiSync=<base64>)
      const deepLinkSync = extractGeminiSyncParamFromLocation();
      if (deepLinkSync) {
        window.history.replaceState({}, document.title, deepLinkSync.cleanUrl);
        setGeminiBridgeInitialImportText(deepLinkSync.decodedText);
        setGeminiBridgeSourceLabel('Deep-Link URL (?geminiSync=)');
        setGeminiBridgeInitialTab('IMPORT');
        setGeminiBridgeOpen(true);
        try {
          const preview = parseGeminiResponseToStatePatch(
            deepLinkSync.decodedText,
            state
          );
          showNotice(preview.diffSummaryBanner);
        } catch {
          showNotice(
            'Loaded ?geminiSync= payload into Gemini Bridge — review and click Apply.'
          );
        }
        return;
      }

      const params = new URLSearchParams(window.location.search);
      const shortcutAction = params.get('action');
      const now = Date.now();
      if (shortcutAction === 'start') {
        setState((prev) => ({
          ...prev,
          timer: {
            ...prev.timer,
            mode: 'WORK_20M',
            workStage: 'IGNITION_5M',
            secondsLeft: 300,
            targetEndTimeMs: now + 300 * 1000,
            isRunning: true,
          },
        }));
        setActiveTab('PIPELINE');
        showNotice('App Shortcut: Started 5m Startup Step (IGNITION_5M).');
      } else if (shortcutAction === 'reset') {
        setState((prev) => ({
          ...prev,
          timer: {
            ...prev.timer,
            mode: 'STRESS_RESET',
            stressProtocol: 'BREATHING_478',
            stressDurationMinutes: 15,
            secondsLeft: 900,
            targetEndTimeMs: now + 900 * 1000,
            isRunning: true,
          },
        }));
        setActiveTab('TIMER');
        showNotice('App Shortcut: Started 15m 4-7-8 Stress Reset.');
      } else if (shortcutAction === 'evening') {
        setActiveTab('RECHARGE');
        showNotice('App Shortcut: Opened Evening Recharge Menu.');
      } else if (initialUnlockInfo.triggeredViaUrl) {
        showNotice(
          'Architect Mode Unlocked via Private URL — Loaded Avery Default configuration.'
        );
      } else {
        try {
          const onboardingDone = localStorage.getItem(ONBOARDING_COMPLETED_KEY);
          if (!onboardingDone) {
            setIsFirstVisitOnboarding(true);
            setOnboardingWizardOpen(true);
          }
        } catch {
          // Ignore storage access errors
        }
        if (initialUnlockInfo.unlocked) {
          const examCheck = getPreExamTaperSuggestion(new Date());
          if (examCheck.isWithin3Days) {
            showNotice(
              `Within ${examCheck.daysUntil}d of ${examCheck.examLabel} — Pre-Exam Taper Auto-Mode suggested.`
            );
          }
        }
      }
    }
  }, [initialUnlockInfo.triggeredViaUrl, initialUnlockInfo.unlocked]);

  // Method 2: One-Tap "Read from Clipboard" & Global Paste (Cmd/Ctrl + Shift + V)
  const handleOneTapSyncFromClipboard = useCallback(async () => {
    triggerHaptic([14]);
    soundEngine.playTactileClick('MODE_TOGGLE');
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
        const clipText = await navigator.clipboard.readText();
        if (clipText && clipText.trim()) {
          setGeminiBridgeInitialImportText(clipText);
          setGeminiBridgeSourceLabel('1-Tap Clipboard Sync (Cmd/Ctrl+Shift+V)');
          setGeminiBridgeInitialTab('IMPORT');
          setGeminiBridgeOpen(true);
          try {
            const preview = parseGeminiResponseToStatePatch(clipText, state);
            showNotice(preview.diffSummaryBanner);
          } catch {
            showNotice(
              'Read clipboard into Gemini Sync Hub — review or paste Gemini response.'
            );
          }
          return;
        }
      }
    } catch {
      // Clipboard read permission denied or unavailable; open modal on IMPORT tab for manual Cmd+V
    }
    setGeminiBridgeSourceLabel('Paste from Clipboard');
    setGeminiBridgeInitialTab('IMPORT');
    setGeminiBridgeOpen(true);
    showNotice(
      'Opened Gemini Reverse Bridge — press Cmd/Ctrl+V to paste and preview changes.'
    );
  }, [state]);

  // Method 4: Global Window Drag-and-Drop state.md / .json File Zone
  useEffect(() => {
    if (typeof window === 'undefined') return;
    let dragCounter = 0;

    const hasFiles = (e: DragEvent) =>
      Boolean(
        e.dataTransfer?.types &&
          Array.from(e.dataTransfer.types).includes('Files')
      );

    const onDragEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounter++;
      setIsGlobalFileDragOver(true);
    };

    const onDragOver = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      if (e.dataTransfer) {
        e.dataTransfer.dropEffect = 'copy';
      }
      setIsGlobalFileDragOver(true);
    };

    const onDragLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounter = Math.max(0, dragCounter - 1);
      if (dragCounter === 0) {
        setIsGlobalFileDragOver(false);
      }
    };

    const onDrop = async (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      dragCounter = 0;
      setIsGlobalFileDragOver(false);
      const file = e.dataTransfer?.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        if (!text.trim()) return;
        triggerHaptic([15, 30]);
        soundEngine.playTactileClick('MODE_TOGGLE');
        setGeminiBridgeInitialImportText(text);
        setGeminiBridgeSourceLabel(`Dropped File: ${file.name}`);
        setGeminiBridgeInitialTab('IMPORT');
        setGeminiBridgeOpen(true);
        try {
          const preview = parseGeminiResponseToStatePatch(text, state);
          showNotice(preview.diffSummaryBanner);
        } catch {
          showNotice(
            `Loaded "${file.name}" into Gemini Sync Hub — review and click Apply.`
          );
        }
      } catch {
        showNotice(`Could not read dropped file "${file.name}".`);
      }
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);
    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [state]);

  const handleUnlockArchitectMode = useCallback(
    (sourceLabel = 'Secret Trigger') => {
      setStoredArchitectModeUnlocked(true);
      setArchitectModeUnlocked(true);
      try {
        localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
      } catch {
        // Ignore storage errors
      }
      playHarmonicChord();
      setState((prev) => {
        const updatedBackups = pushStateBackup(
          prev,
          'PRESET_SWITCH',
          `Before Architect Mode Unlock (${sourceLabel})`
        );
        const averyState = buildStateForPreset('AVERY_DEFAULT', {
          logicalDayRolloverHour: prev.logicalDayRolloverHour ?? 4,
          earlyEveningShutdownTime: prev.earlyEveningShutdownTime ?? '6:00 PM',
        });
        pushUndoSnapshot(
          prev,
          'Architect Mode Unlocked → Avery Default Rung 1'
        );
        return {
          ...averyState,
          dailyHistory: syncTodayIntoDailyHistory(averyState),
          stateBackups: updatedBackups,
          audioSettings: prev.audioSettings || DEFAULT_AUDIO_ENGINE_SETTINGS,
        };
      });
      setIsFirstVisitOnboarding(false);
      setOnboardingWizardOpen(false);
      showNotice(
        `Architect Mode Unlocked (${sourceLabel}) — Loaded Avery Default Rung 1 state.`
      );
    },
    [pushUndoSnapshot]
  );

  const handleLockArchitectMode = useCallback(() => {
    triggerHaptic([15]);
    setStoredArchitectModeUnlocked(false);
    setArchitectModeUnlocked(false);
    setState((prev) => {
      if (prev.profilePresetId === 'AVERY_DEFAULT') {
        const updatedBackups = pushStateBackup(
          prev,
          'PRESET_SWITCH',
          'Before Locking Architect Mode'
        );
        const publicDefault = buildStateForPreset('BALANCED_CORE', {
          logicalDayRolloverHour: prev.logicalDayRolloverHour ?? 4,
          earlyEveningShutdownTime: prev.earlyEveningShutdownTime ?? '6:00 PM',
        });
        return {
          ...publicDefault,
          dailyHistory: syncTodayIntoDailyHistory(publicDefault),
          stateBackups: updatedBackups,
          audioSettings: prev.audioSettings || DEFAULT_AUDIO_ENGINE_SETTINGS,
        };
      }
      return prev;
    });
    showNotice(
      'Architect Mode locked and hidden — restored clean public profile view.'
    );
  }, []);

  const handleApplyProfilePreset = (
    presetOrId: ProfilePresetId | UniversalPresetDefinition,
    options?: ApplyPresetOptions
  ) => {
    triggerHaptic([15]);
    soundEngine.playTactileClick('MODE_TOGGLE');
    const resolvedId =
      typeof presetOrId === 'string' ? presetOrId : presetOrId.id;
    const resolvedTitle =
      typeof presetOrId === 'string'
        ? PROFILE_PRESET_METADATA.find((p) => p.id === presetOrId)?.title ||
          presetOrId
        : presetOrId.title;

    setState((prev) => {
      const updatedBackups = pushStateBackup(
        prev,
        'PRESET_SWITCH',
        `Before switching profile to ${resolvedTitle}`
      );
      const nextState = applyPresetToState(prev, presetOrId, {
        ...options,
        logicalDayRolloverHour:
          options?.logicalDayRolloverHour ?? prev.logicalDayRolloverHour ?? 4,
        earlyEveningShutdownTime:
          options?.earlyEveningShutdownTime ??
          prev.earlyEveningShutdownTime ??
          '6:00 PM',
      });
      pushUndoSnapshot(
        prev,
        `Switched Profile Archetype → ${nextState.profileName || resolvedTitle}`
      );
      return {
        ...nextState,
        dailyHistory: syncTodayIntoDailyHistory(nextState),
        stateBackups: updatedBackups,
        audioSettings: prev.audioSettings || DEFAULT_AUDIO_ENGINE_SETTINGS,
      };
    });
    try {
      localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
    setIsFirstVisitOnboarding(false);
    setOnboardingWizardOpen(false);
    if (
      resolvedId === 'MODULAR_BLANK_CANVAS' ||
      resolvedId === 'BLANK_CUSTOM'
    ) {
      showNotice(
        'Loaded Modular Blank Canvas — Click or double-click any slot, project, or track label to edit it inline.'
      );
    } else {
      showNotice(
        `Applied Preset: ${
          options?.customDraft?.profileName || resolvedTitle
        }${
          options?.keepActiveTasksAndLogs
            ? ' (Kept active tasks & logged blocks)'
            : ''
        } (Snapshot saved to Auto-Backups).`
      );
    }
  };

  const handleUpdateDayBoundaryPreferences = (
    rolloverHour: number,
    shutdownTime: string
  ) => {
    const safeHour = Math.max(0, Math.min(6, Math.round(rolloverHour)));
    const cleanShutdown = shutdownTime.trim() || '6:00 PM';
    setState((prev) => ({
      ...prev,
      logicalDayRolloverHour: safeHour,
      earlyEveningShutdownTime: cleanShutdown,
      logicalDayKey: getLogicalDayKey(new Date(), safeHour),
      pipelineDays: prev.pipelineDays.map((d) =>
        d.fixedEvent === 'EVENING_OUTING_6PM'
          ? { ...d, fixedEventTimeLabel: `${cleanShutdown} Early Shutdown` }
          : d
      ),
    }));
    showNotice(
      `Updated Day-Boundary Preferences: Rollover → ${formatRolloverHourLabel(
        safeHour
      )}, Evening Outing Shutdown → ${cleanShutdown}.`
    );
  };

  useEffect(() => {
    if (!statusNotice) return;
    const id = window.setTimeout(() => setStatusNotice(null), 4200);
    return () => window.clearTimeout(id);
  }, [statusNotice]);

  // System 2: Keep today's entry in `dailyHistory` synchronized with live shift telemetry
  useEffect(() => {
    setState((prev) => {
      const updatedHistory = syncTodayIntoDailyHistory(prev);
      const lastPrev = prev.dailyHistory?.[prev.dailyHistory.length - 1];
      const lastNext = updatedHistory[updatedHistory.length - 1];
      if (
        prev.dailyHistory &&
        prev.dailyHistory.length === updatedHistory.length &&
        lastPrev &&
        lastNext &&
        lastPrev.logicalDate === lastNext.logicalDate &&
        lastPrev.mode === lastNext.mode &&
        lastPrev.blocksCompleted === lastNext.blocksCompleted &&
        lastPrev.inputBlocks === lastNext.inputBlocks &&
        lastPrev.outputBlocks === lastNext.outputBlocks &&
        lastPrev.eveningSessions === lastNext.eveningSessions
      ) {
        return prev;
      }
      return {
        ...prev,
        dailyHistory: updatedHistory,
      };
    });
  }, [
    state.loadMode,
    state.preExamTaperActive,
    state.discretionaryBlocksCompletedToday,
    state.baselineBlocks,
    state.todayBlockLog?.length,
    state.recharge.completedLog?.length,
  ]);

  // System 1: Sync Procedural Web Audio Soundscape with active 5m Startup & 15m Momentum timers
  useEffect(() => {
    const audioSettings: AudioEngineSettings = {
      ...DEFAULT_AUDIO_ENGINE_SETTINGS,
      ...(state.audioSettings || {}),
    };
    const isWorkTimerRunning =
      state.timer.isRunning && state.timer.mode === 'WORK_20M';
    soundEngine.syncWithTimerState({
      isWorkTimerRunning,
      settings: audioSettings,
    });
  }, [
    state.timer.isRunning,
    state.timer.mode,
    state.timer.workStage,
    state.audioSettings,
  ]);

  // Schedule or cancel ahead-of-time notifications at exact targetEndTimeMs when timers start/pause/reset
  useEffect(() => {
    const anyTimerActive =
      (state.timer.isRunning && Boolean(state.timer.targetEndTimeMs)) ||
      (state.timer.recoveryFlashcardRunning &&
        Boolean(state.timer.recoveryFlashcardTargetEndTimeMs)) ||
      (state.recharge.option0Running &&
        Boolean(state.recharge.option0TargetEndTimeMs)) ||
      (state.recharge.categoryRunning &&
        Boolean(state.recharge.categoryTargetEndTimeMs));

    if (!anyTimerActive) {
      cancelAllScheduledStageAlarms();
      return;
    }

    if (state.timer.isRunning && state.timer.targetEndTimeMs) {
      if (state.timer.mode === 'WORK_20M' && state.timer.workStage === 'IGNITION_5M') {
        scheduleTimerNotificationAt(
          state.timer.targetEndTimeMs,
          '5m Startup Complete — Rolling into 15m Momentum',
          `Auto-rolling into 15m Momentum (MOMENTUM_15M) for "${state.timer.activeTaskTitle}".`,
          'ROLLOVER_5M_TO_15M'
        );
      } else if (
        state.timer.mode === 'WORK_20M' &&
        state.timer.workStage === 'MOMENTUM_15M'
      ) {
        scheduleTimerNotificationAt(
          state.timer.targetEndTimeMs,
          '20m Work Block Complete',
          `Completed 20m block for "${state.timer.activeTaskTitle}".`,
          'WORK_BLOCK_COMPLETE'
        );
      } else if (state.timer.mode === 'STRESS_RESET') {
        scheduleTimerNotificationAt(
          state.timer.targetEndTimeMs,
          'Stress / Fatigue Reset Complete',
          'Physical reset complete. 5m Flashcard recovery block queued.',
          'STRESS_RESET_COMPLETE'
        );
      } else {
        scheduleTimerNotificationAt(
          state.timer.targetEndTimeMs,
          'Break Complete — Ready for 5m Startup Step',
          'Break finished. Ready to start next 5m Startup Step (IGNITION_5M).',
          'BREAK_COMPLETE'
        );
      }
    }

    if (
      state.timer.recoveryFlashcardRunning &&
      state.timer.recoveryFlashcardTargetEndTimeMs
    ) {
      scheduleTimerNotificationAt(
        state.timer.recoveryFlashcardTargetEndTimeMs,
        '5m Recovery Flashcard Block Complete',
        'Recovery flashcard block cleared.',
        'WORK_BLOCK_COMPLETE'
      );
    }

    if (state.recharge.option0Running && state.recharge.option0TargetEndTimeMs) {
      scheduleTimerNotificationAt(
        state.recharge.option0TargetEndTimeMs,
        '20m Option 0 Stillness Complete',
        '20m stillness window complete.',
        'CHECKIN_20M_CHIME'
      );
    }

    if (state.recharge.categoryRunning && state.recharge.categoryTargetEndTimeMs) {
      if (state.recharge.pacingStage === 'STARTUP_5M') {
        scheduleTimerNotificationAt(
          state.recharge.categoryTargetEndTimeMs,
          '5m Startup Complete — Rolling into 15m Momentum',
          'Rolling into 20m Check-In window.',
          'ROLLOVER_5M_TO_15M'
        );
      } else if (
        state.recharge.pacingStage === 'WINDOW_20M' ||
        state.recharge.pacingStage === 'WINDOW_40M'
      ) {
        scheduleTimerNotificationAt(
          state.recharge.categoryTargetEndTimeMs,
          '20m Check-In: Keep going, switch, or rest?',
          'Keep going, switch, or rest?',
          'CHECKIN_20M_CHIME'
        );
      } else {
        scheduleTimerNotificationAt(
          state.recharge.categoryTargetEndTimeMs,
          '60m Limit Reached: Take a 5–10m physical break',
          'Enforcing mandatory 5–10m physical break.',
          'MANDATORY_60M_BREAK'
        );
      }
    }
  }, [
    state.timer.isRunning,
    state.timer.mode,
    state.timer.workStage,
    state.timer.targetEndTimeMs,
    state.timer.activeTaskTitle,
    state.timer.recoveryFlashcardRunning,
    state.timer.recoveryFlashcardTargetEndTimeMs,
    state.recharge.option0Running,
    state.recharge.option0TargetEndTimeMs,
    state.recharge.categoryRunning,
    state.recharge.categoryTargetEndTimeMs,
    state.recharge.pacingStage,
  ]);

  const metrics = computeShiftMetrics(state);
  const isEveningTheme = metrics.isZeroWorkLeft || activeTab === 'RECHARGE';
  const prevZeroWorkLeftRef = useRef<boolean>(metrics.isZeroWorkLeft);

  // System 1: Play warm harmonic chord when [0m work left — End of Shift] is reached
  useEffect(() => {
    if (!prevZeroWorkLeftRef.current && metrics.isZeroWorkLeft) {
      soundEngine.playEndOfShiftChord();
    }
    prevZeroWorkLeftRef.current = metrics.isZeroWorkLeft;
  }, [metrics.isZeroWorkLeft]);

  // System 3: Dynamically update <meta name="theme-color"> in document.head (#06080d when On-Duty, #090706 when in Evening Recharge)
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const bgHex = isEveningTheme ? '#090706' : '#06080d';
    document.body.style.backgroundColor = bgHex;
    let metaTheme = document.querySelector('meta[name="theme-color"]');
    if (!metaTheme) {
      metaTheme = document.createElement('meta');
      metaTheme.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTheme);
    }
    metaTheme.setAttribute('content', bgHex);
  }, [isEveningTheme]);

  // Logical Day-Rollover Boundary Check (configurable between 12:00 AM and 6:00 AM, default 4:00 AM)
  useEffect(() => {
    const checkFourAmRollover = () => {
      setState((prev) => {
        const rolloverHr = prev.logicalDayRolloverHour ?? 4;
        const currentLogicalDay = getLogicalDayKey(new Date(), rolloverHr);
        if (!prev.logicalDayKey) {
          return { ...prev, logicalDayKey: currentLogicalDay };
        }
        if (prev.logicalDayKey === currentLogicalDay) {
          return prev;
        }
        // Crossed rollover boundary into a new logical day
        const tomorrowDay = prev.pipelineDays[1];
        const appliedDeduction =
          prev.recharge.flowExtensionBlocksLoggedToday >= 3
            ? 2
            : prev.recharge.flowExtensionBlocksLoggedToday >= 2
            ? 1
            : tomorrowDay?.deductedBlocksFromExtension ?? 0;
        const baseCeiling =
          tomorrowDay?.baseTargetBlocks ??
          (prev.loadMode === 'SURGE'
            ? 14
            : prev.loadMode === 'TAPER'
            ? 8
            : prev.cruisePlus
            ? 13
            : 12);
        const newCeiling = Math.max(7, baseCeiling - appliedDeduction);
        const preservedStickySlots = Object.fromEntries(
          Object.entries(prev.recharge.stickySlots).map(([k, slot]) => [
            k,
            {
              ...slot,
              fiveMinStarts: slot.fiveMinStarts,
              unlockedViaCheckIn: false,
            },
          ])
        ) as SymmetryState['recharge']['stickySlots'];
        const primaryProject = prev.projectQueue[0];

        return {
          ...prev,
          logicalDayKey: currentLogicalDay,
          todayBlockLog: [],
          customModeBlockAdjustment: newCeiling,
          midDayResetCompletedToday: false,
          flashcardsReviewedCount: 0,
          earlyClearanceEnabled: false,
          discretionaryBlocksCompletedToday: 0,
          dailySovereignDripDone: false,
          dailyAmbitionDrip: {
            ...getEffectiveDailyAmbitionDrip(prev),
            completedToday: 0,
          },
          baselineBlocks: prev.baselineBlocks.map((b) => ({
            ...b,
            completed: false,
            completedBlocks: 0,
            bankedViaEarlyClearance: false,
            reallocatedViaEarlyClearance: false,
            reallocatedBlocksCount: 0,
          })),
          pipelineDays: prev.pipelineDays.map((d, idx) =>
            idx === 0
              ? {
                  ...d,
                  baseTargetBlocks: newCeiling,
                  completedBlocks: 0,
                  deductedBlocksFromExtension: appliedDeduction,
                }
              : idx === 1
              ? { ...d, deductedBlocksFromExtension: 0 }
              : d
          ),
          timer: {
            ...prev.timer,
            mode: 'WORK_20M',
            workStage: 'IGNITION_5M',
            secondsLeft: 300,
            targetEndTimeMs: null,
            isRunning: false,
            chainedBlocksCount: 0,
            activeBlockSourceId: primaryProject?.id || 'fc_anat_1',
            activeTaskTitle:
              primaryProject?.title || 'Anatomy Flashcards — Block 1/1',
            activeTaskType: primaryProject ? 'PROJECT' : 'FLASHCARDS',
            activeStartupPrompt: primaryProject
              ? getProjectActiveStartupStep(primaryProject)
              : 'Open deck + clear first 15 cards',
            queuedRecoveryFlashcard5m: false,
            recoveryFlashcardRunning: false,
            recoveryFlashcardSecondsLeft: 300,
            recoveryFlashcardTargetEndTimeMs: null,
          },
          recharge: {
            ...prev.recharge,
            endOfShiftLocked: false,
            manualEveningPreview: false,
            flowExtensionPromptOpen: false,
            flowExtensionActive: false,
            flowExtensionRunning: false,
            flowExtensionElapsedSeconds: 0,
            flowExtensionStartTimeMs: null,
            flowExtensionBlocksLoggedToday: 0,
            option0Running: false,
            option0SecondsLeft: 1200,
            option0TargetEndTimeMs: null,
            option0ConsecutiveWindows: 0,
            forkCheckModalOpen: false,
            activeCategory: 'NONE',
            pacingStage: 'STARTUP_5M',
            categorySecondsLeft: 300,
            categoryTargetEndTimeMs: null,
            categoryElapsedMinutes: 0,
            categoryRunning: false,
            checkInModalOpen: false,
            stickySlots: preservedStickySlots,
          },
        };
      });
    };

    checkFourAmRollover();
    const id = window.setInterval(checkFourAmRollover, 60_000);
    window.addEventListener('focus', checkFourAmRollover);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('focus', checkFourAmRollover);
    };
  }, []);

  // Optional Desktop AnkiConnect Polling during active Flashcard timers
  useEffect(() => {
    if (
      !state.ankiConnectEnabled ||
      !state.timer.isRunning ||
      state.timer.activeTaskType !== 'FLASHCARDS'
    ) {
      return;
    }
    let cancelled = false;
    const poll = async () => {
      const res = await fetchAnkiConnectReviewedToday(
        state.ankiConnectUrl || 'http://127.0.0.1:8765'
      );
      if (!cancelled && res.ok && typeof res.reviewedToday === 'number') {
        const clamped = Math.min(Math.max(0, res.reviewedToday), 999);
        setState((prev) =>
          prev.flashcardsReviewedCount === clamped
            ? prev
            : { ...prev, flashcardsReviewedCount: clamped }
        );
      }
    };
    void poll();
    const id = window.setInterval(() => void poll(), 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [
    state.ankiConnectEnabled,
    state.ankiConnectUrl,
    state.timer.isRunning,
    state.timer.activeTaskType,
    setState,
  ]);

  // 10-Second Undo Toast Expiration Countdown
  useEffect(() => {
    if (!undoToast) return;
    const tick = () => {
      const remainingMs = undoToast.expiresAtMs - Date.now();
      if (remainingMs <= 0) {
        setUndoToast(null);
      } else {
        setUndoSecondsLeft(Math.max(1, Math.ceil(remainingMs / 1000)));
      }
    };
    tick();
    const id = window.setInterval(tick, 250);
    return () => window.clearInterval(id);
  }, [undoToast]);

  // Global Keyboard Shortcuts: Cmd/Ctrl+\ (Toggle Widget/Split Layout), Cmd/Ctrl+G (Gemini Sync Hub), Cmd/Ctrl+Shift+V (1-Tap Sync from Clipboard), ? (Cheat-Sheet), Cmd+K (Command Bar), F (Cinema Focus Mode), R (Break), S (Stress Reset), Cmd+/ (AI Assistant), Cmd+J (Smart Intake), Cmd+Z (Undo), Space (Start/Pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === '\\' || e.code === 'Backslash')) {
        e.preventDefault();
        handleToggleLayoutMode();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        void handleOneTapSyncFromClipboard();
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        triggerHaptic([12]);
        soundEngine.playTactileClick('MODE_TOGGLE');
        setGeminiBridgeInitialTab('EXPORT');
        setGeminiBridgeOpen((prev) => !prev);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        triggerHaptic([12]);
        soundEngine.playTactileClick('MODE_TOGGLE');
        setCommandDockOpen(false);
        setConversationalArchitectOpen((prev) => !prev);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        triggerHaptic([12]);
        soundEngine.playTactileClick('MODE_TOGGLE');
        setCommandDockOpen((prev) => !prev);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        triggerHaptic([12]);
        soundEngine.playTactileClick('MODE_TOGGLE');
        setAssistantDrawerOpen((prev) => !prev);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        if (!pipelineDrawerOpen) {
          e.preventDefault();
          triggerHaptic([10]);
          if (activeTab !== 'PIPELINE') {
            setActiveTab('PIPELINE');
          }
          window.setTimeout(() => {
            const el = document.getElementById(
              'pipeline-intake-input'
            ) as HTMLInputElement | null;
            el?.focus();
            el?.select();
          }, 40);
        }
        return;
      }

      const target = e.target as HTMLElement | null;
      const isEditableInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if (e.key === 'Escape') {
        if (conversationalArchitectOpen) {
          e.preventDefault();
          setConversationalArchitectOpen(false);
          return;
        }
        if (geminiBridgeOpen) {
          e.preventDefault();
          setGeminiBridgeOpen(false);
          return;
        }
        if (commandDockOpen) {
          e.preventDefault();
          setCommandDockOpen(false);
          return;
        }
        if (cinemaFocusMode) {
          setCinemaFocusMode(false);
          return;
        }
        if (shortcutsModalOpen) {
          setShortcutsModalOpen(false);
          return;
        }
        if (spotlightTourOpen) {
          setSpotlightTourOpen(false);
          return;
        }
        if (insightsModalOpen) {
          setInsightsModalOpen(false);
          return;
        }
      }

      // Cmd+Z / Ctrl+Z triggers Undo when not typing in an input
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key.toLowerCase() === 'z') {
        if (isEditableInput) return;
        if (undoStackRef.current.length > 0) {
          e.preventDefault();
          triggerHaptic([15, 30]);
          handleTriggerUndo();
        }
        return;
      }

      if (isEditableInput || e.metaKey || e.ctrlKey || e.altKey) {
        return;
      }

      // ? (Shift + /) opens Keyboard Shortcut Cheat-Sheet
      if (e.key === '?' || (e.shiftKey && e.code === 'Slash')) {
        e.preventDefault();
        triggerHaptic([10]);
        soundEngine.playTactileClick('MODE_TOGGLE');
        setShortcutsModalOpen((prev) => !prev);
        return;
      }

      // F toggles Cinema Focus Mode
      if (!e.shiftKey && e.key.toLowerCase() === 'f' && !e.repeat) {
        e.preventDefault();
        triggerHaptic([12]);
        soundEngine.playTactileClick('MODE_TOGGLE');
        setCinemaFocusMode((prev) => !prev);
        return;
      }

      // P pops out / closes OS-level Always-on-Top Mini HUD (Document PiP / Video Stream PiP)
      if (!e.shiftKey && e.key.toLowerCase() === 'p' && !e.repeat) {
        e.preventDefault();
        soundEngine.playTactileClick('MODE_TOGGLE');
        toggleMiniHudRef.current();
        return;
      }

      // R triggers Break (L1 Micro-Reset or L2 Buffer)
      if (!e.shiftKey && e.key.toLowerCase() === 'r' && !e.repeat) {
        e.preventDefault();
        triggerHaptic([12]);
        soundEngine.playTactileClick('MODE_TOGGLE');
        const now = Date.now();
        setState((prev) => {
          const breakMode =
            prev.timer.chainedBlocksCount >= 2 ? 'BREAK_L2' : 'BREAK_L1';
          const durationSec =
            breakMode === 'BREAK_L2'
              ? prev.timer.l2DurationMinutes * 60
              : prev.timer.l1DurationMinutes * 60;
          return {
            ...prev,
            timer: {
              ...prev.timer,
              mode: breakMode,
              secondsLeft: durationSec,
              targetEndTimeMs: now + durationSec * 1000,
              isRunning: true,
              chainedBlocksCount: breakMode === 'BREAK_L1' ? 2 : 0,
            },
          };
        });
        setActiveTab('TIMER');
        showNotice('Hotkey [R]: Started Break timer.');
        return;
      }

      // S triggers 4-7-8 Stress Reset
      if (!e.shiftKey && e.key.toLowerCase() === 's' && !e.repeat) {
        e.preventDefault();
        triggerHaptic([15]);
        soundEngine.playTactileClick('MODE_TOGGLE');
        const now = Date.now();
        setState((prev) => {
          const mins = prev.timer.stressDurationMinutes || 15;
          return {
            ...prev,
            timer: {
              ...prev.timer,
              mode: 'STRESS_RESET',
              stressProtocol: 'BREATHING_478',
              stressDurationMinutes: mins,
              secondsLeft: mins * 60,
              targetEndTimeMs: now + mins * 60 * 1000,
              isRunning: true,
            },
          };
        });
        setActiveTab('TIMER');
        showNotice('Hotkey [S]: Started 15m 4-7-8 Stress / Fatigue Reset.');
        return;
      }

      if (e.code !== 'Space' || e.repeat) return;
      if (target && target.tagName === 'BUTTON') {
        return;
      }
      e.preventDefault();
      triggerHaptic([15]);
      soundEngine.playTactileClick('MODE_TOGGLE');
      const now = Date.now();
      setState((prev) => {
        const nextRunning = !prev.timer.isRunning;
        const currentSecondsLeft =
          prev.timer.isRunning && prev.timer.targetEndTimeMs
            ? Math.max(0, Math.ceil((prev.timer.targetEndTimeMs - now) / 1000))
            : prev.timer.secondsLeft;
        return {
          ...prev,
          timer: {
            ...prev.timer,
            isRunning: nextRunning,
            secondsLeft: currentSecondsLeft,
            targetEndTimeMs: nextRunning
              ? now + currentSecondsLeft * 1000
              : null,
          },
        };
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeTab,
    pipelineDrawerOpen,
    commandDockOpen,
    conversationalArchitectOpen,
    geminiBridgeOpen,
    handleOneTapSyncFromClipboard,
    handleToggleLayoutMode,
    handleTriggerUndo,
    cinemaFocusMode,
    shortcutsModalOpen,
    spotlightTourOpen,
    insightsModalOpen,
  ]);

  const handleApplySmartIntakePlan = (plan: SmartIntakePlanResult) => {
    setState((prev) => {
      pushUndoSnapshot(
        prev,
        `Applied Smart Intake Plan (${plan.todayLoadMode} • ${plan.closedListUpdates.length} Closed List items)`
      );
      return applySmartIntakePlanToState(prev, plan);
    });
    setSmartIntakePreview(null);
    setSmartIntakeText('');
    showNotice(
      `Applied Smart Intake Plan: Today Mode → ${plan.todayLoadMode}, ${plan.closedListUpdates.length} Closed List items, ${plan.fixedEvents.length} Fixed Events.`
    );
  };

  // Dynamic browser document.title update while any timer is running
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const fmt = (sec: number) => {
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    if (state.timer.isRunning) {
      const stageTag =
        state.timer.mode === 'WORK_20M'
          ? state.timer.workStage === 'IGNITION_5M'
            ? '5m Startup'
            : '15m Momentum'
          : state.timer.mode === 'BREAK_L1'
          ? 'L1 Break'
          : state.timer.mode === 'BREAK_L2'
          ? 'L2 Buffer'
          : state.timer.mode === 'BREAK_L3'
          ? 'L3 Mid-Day'
          : 'Stress Reset';
      document.title = `(${fmt(state.timer.secondsLeft)}) [${stageTag}] Symmetrical`;
    } else if (state.timer.recoveryFlashcardRunning) {
      document.title = `(${fmt(state.timer.recoveryFlashcardSecondsLeft)}) [5m Cards] Symmetrical`;
    } else if (state.recharge.option0Running) {
      document.title = `(${fmt(state.recharge.option0SecondsLeft)}) [Option 0 Rest] Symmetrical`;
    } else if (state.recharge.categoryRunning) {
      const stageLabel =
        state.recharge.pacingStage === 'STARTUP_5M'
          ? '5m Recharge'
          : state.recharge.pacingStage === 'MANDATORY_BREAK_60M'
          ? '60m Break'
          : 'Recharge';
      document.title = `(${fmt(state.recharge.categorySecondsLeft)}) [${stageLabel}] Symmetrical`;
    } else if (state.recharge.flowExtensionRunning) {
      document.title = `(+${fmt(state.recharge.flowExtensionElapsedSeconds)}) [Flow Extension] Symmetrical`;
    } else {
      document.title = `Symmetrical Productivity — ${metrics.durationPrefix}`;
    }
  }, [
    state.timer.isRunning,
    state.timer.mode,
    state.timer.workStage,
    state.timer.secondsLeft,
    state.timer.recoveryFlashcardRunning,
    state.timer.recoveryFlashcardSecondsLeft,
    state.recharge.option0Running,
    state.recharge.option0SecondsLeft,
    state.recharge.categoryRunning,
    state.recharge.pacingStage,
    state.recharge.categorySecondsLeft,
    state.recharge.flowExtensionRunning,
    state.recharge.flowExtensionElapsedSeconds,
    metrics.durationPrefix,
  ]);

  // Helper to credit Roadmap Input (50%) or Output (50%), with Major Track 1 (1A vs 1B) sub-track split
  const creditRoadmapTrack = (
    prevTracks: SymmetryState['roadmapTracks'],
    trackId: TrackId,
    ledgerType: 'INPUT' | 'OUTPUT',
    rungNumber: 1 | 2 | 3 | 4 = ledgerType === 'INPUT' ? 1 : 3,
    blockCredit = 1,
    subTrack?: MajorSubTrackId
  ) => {
    return prevTracks.map((t) => {
      if (t.id !== trackId) return t;
      const is1B = subTrack === '1B_INDEPENDENT';
      return {
        ...t,
        activeThisWeek: true,
        inputBlocksCredited:
          ledgerType === 'INPUT'
            ? Number((t.inputBlocksCredited + blockCredit).toFixed(2))
            : t.inputBlocksCredited,
        outputBlocksCredited:
          ledgerType === 'OUTPUT'
            ? Number((t.outputBlocksCredited + blockCredit).toFixed(2))
            : t.outputBlocksCredited,
        subTrack1ABlocksCredited:
          t.id === 'science' && ledgerType === 'OUTPUT' && !is1B
            ? Number(((t.subTrack1ABlocksCredited || 0) + blockCredit).toFixed(2))
            : t.subTrack1ABlocksCredited,
        subTrack1BBlocksCredited:
          t.id === 'science' && ledgerType === 'OUTPUT' && is1B
            ? Number(((t.subTrack1BBlocksCredited || 0) + blockCredit).toFixed(2))
            : t.subTrack1BBlocksCredited,
        rungs: t.rungs.map((r) =>
          r.rungNumber === rungNumber
            ? {
                ...r,
                completedBlocks: Number(
                  (r.completedBlocks + blockCredit).toFixed(2)
                ),
              }
            : r
        ),
      };
    });
  };

  // Helper to debit Roadmap Input (50%) or Output (50%)
  const debitRoadmapTrack = (
    prevTracks: SymmetryState['roadmapTracks'],
    trackId: string,
    ledgerType: 'INPUT' | 'OUTPUT',
    rungNumber: 1 | 2 | 3 | 4 = ledgerType === 'INPUT' ? 1 : 3,
    blockCredit = 1,
    subTrack?: MajorSubTrackId
  ) => {
    return prevTracks.map((t) => {
      if (t.id !== trackId) return t;
      const is1B = subTrack === '1B_INDEPENDENT';
      return {
        ...t,
        inputBlocksCredited:
          ledgerType === 'INPUT'
            ? Math.max(0, Number((t.inputBlocksCredited - blockCredit).toFixed(2)))
            : t.inputBlocksCredited,
        outputBlocksCredited:
          ledgerType === 'OUTPUT'
            ? Math.max(0, Number((t.outputBlocksCredited - blockCredit).toFixed(2)))
            : t.outputBlocksCredited,
        subTrack1ABlocksCredited:
          t.id === 'science' && ledgerType === 'OUTPUT' && !is1B
            ? Math.max(
                0,
                Number(((t.subTrack1ABlocksCredited || 0) - blockCredit).toFixed(2))
              )
            : t.subTrack1ABlocksCredited,
        subTrack1BBlocksCredited:
          t.id === 'science' && ledgerType === 'OUTPUT' && is1B
            ? Math.max(
                0,
                Number(((t.subTrack1BBlocksCredited || 0) - blockCredit).toFixed(2))
              )
            : t.subTrack1BBlocksCredited,
        rungs: t.rungs.map((r) =>
          r.rungNumber === rungNumber
            ? {
                ...r,
                completedBlocks: Math.max(
                  0,
                  Number((r.completedBlocks - blockCredit).toFixed(2))
                ),
              }
            : r
        ),
      };
    });
  };

  const baselineCategoryToLogCategory = (
    cat: BaselineCategory
  ): TodayBlockLogCategory => {
    if (cat === 'FLASHCARDS_ANATOMY') return 'FLOOR_ANATOMY';
    if (cat === 'FLASHCARDS_COMP') return 'FLOOR_COMP';
    if (cat === 'SYNTHESIS') return 'FLOOR_SYNTHESIS';
    return 'FLOOR_READING';
  };

  const logCategoryToBaselineCategory = (
    cat: TodayBlockLogCategory
  ): BaselineCategory | null => {
    if (cat === 'FLOOR_ANATOMY') return 'FLASHCARDS_ANATOMY';
    if (cat === 'FLOOR_COMP') return 'FLASHCARDS_COMP';
    if (cat === 'FLOOR_READING') return 'READING';
    if (cat === 'FLOOR_SYNTHESIS') return 'SYNTHESIS';
    return null;
  };

  const createTodayLogEntry = (
    prev: SymmetryState,
    params: {
      category: TodayBlockLogCategory;
      title: string;
      durationMinutes: number;
      blockCredit?: number;
      roadmapTrack: string;
      stroke: 'INPUT' | 'OUTPUT';
      sourceBlockId?: string;
      stickyKey?: StickyKey;
      rungNumber?: 1 | 2 | 3 | 4;
    }
  ): TodayBlockLogEntry => {
    const now = new Date();
    return {
      id: `log_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: createLogTimestamp(now),
      logicalDate:
        prev.logicalDayKey ||
        getLogicalDayKey(now, prev.logicalDayRolloverHour ?? 4),
      category: params.category,
      title: params.title,
      durationMinutes: params.durationMinutes,
      blockCredit: params.blockCredit,
      roadmapTrack: params.roadmapTrack,
      stroke: params.stroke,
      sourceBlockId: params.sourceBlockId,
      stickyKey: params.stickyKey,
      rungNumber: params.rungNumber,
    };
  };

  // Complete a work block (0.5x Micro-Block 10m, 1.0x Standard Block 20m, or 2.0x Chained Flow Block 40m) and route to the appropriate Break level
  const handleCompleteWorkBlockTransition = (prev: SymmetryState): SymmetryState => {
    soundEngine.playTactileClick('BLOCK_COMPLETE');
    const mult = prev.timer.elasticMultiplier ?? 1.0;
    const activeDurations = getActiveBlockDurationsSeconds(prev);
    const matchingBaseline = prev.baselineBlocks.find(
      (b) => b.id === prev.timer.activeBlockSourceId && !isBaselineSlotClearedForToday(b)
    );

    let updatedBaseline = prev.baselineBlocks;
    let updatedDiscretionary = prev.discretionaryBlocksCompletedToday;
    let updatedProjects = prev.projectQueue;
    let updatedTracks = prev.roadmapTracks;
    let newLogEntry: TodayBlockLogEntry;

    if (matchingBaseline) {
      const slotTarget = getBaselineSlotTargetBlocks(matchingBaseline);
      const prevSlotDone = getBaselineSlotCompletedBlocks(matchingBaseline);
      if (mult === 0.5) {
        const existingPartial = matchingBaseline.partialCredit || 0;
        if (existingPartial >= 0.5) {
          const nextDone = Math.min(slotTarget, prevSlotDone + 1);
          updatedBaseline = prev.baselineBlocks.map((b) =>
            b.id === matchingBaseline.id
              ? {
                  ...b,
                  completedBlocks: nextDone,
                  completed: nextDone >= slotTarget,
                  partialCredit: 0,
                }
              : b
          );
        } else {
          updatedBaseline = prev.baselineBlocks.map((b) =>
            b.id === matchingBaseline.id
              ? { ...b, partialCredit: 0.5 }
              : b
          );
        }
      } else {
        const blockGain = mult === 2.0 ? 2 : 1;
        const nextDone = Math.min(slotTarget, prevSlotDone + blockGain);
        updatedBaseline = prev.baselineBlocks.map((b) =>
          b.id === matchingBaseline.id
            ? {
                ...b,
                completedBlocks: nextDone,
                completed: nextDone >= slotTarget,
                partialCredit: 0,
              }
            : b
        );
        // If 2.0x Chained Flow Block overflowed the baseline slot target, credit extra to discretionary
        const absorbedByFloor = Math.max(0, nextDone - prevSlotDone);
        if (mult > absorbedByFloor) {
          const overflowCredit = Number((mult - absorbedByFloor).toFixed(2));
          updatedDiscretionary = Number(
            (updatedDiscretionary + overflowCredit).toFixed(2)
          );
        }
      }

      const stroke: 'INPUT' | 'OUTPUT' =
        matchingBaseline.category === 'SYNTHESIS' ? 'OUTPUT' : 'INPUT';
      const rungNum: 1 | 2 | 3 | 4 =
        matchingBaseline.category === 'SYNTHESIS' ? 2 : 1;
      updatedTracks = creditRoadmapTrack(
        updatedTracks,
        matchingBaseline.trackId,
        stroke,
        rungNum,
        mult,
        '1A_INSTITUTIONAL'
      );
      newLogEntry = createTodayLogEntry(prev, {
        category: baselineCategoryToLogCategory(matchingBaseline.category),
        title:
          mult === 0.5
            ? `${matchingBaseline.title} (0.5x Micro-Block)`
            : mult === 2.0
            ? `${matchingBaseline.title} (2.0x Chained Flow Block)`
            : matchingBaseline.title,
        durationMinutes: activeDurations.totalMinutes,
        blockCredit: mult,
        roadmapTrack: matchingBaseline.trackId,
        stroke,
        sourceBlockId: matchingBaseline.id,
        rungNumber: rungNum,
      });
    } else if (prev.timer.activeBlockSourceId === 'sandbox_curiosity') {
      updatedDiscretionary = Number((updatedDiscretionary + mult).toFixed(2));
      const sandboxTrack: TrackId =
        prev.roadmapTracks.find((t) => t.id === 'coding')?.id || 'science';
      updatedTracks = creditRoadmapTrack(
        updatedTracks,
        sandboxTrack,
        'INPUT',
        2,
        mult
      );
      newLogEntry = createTodayLogEntry(prev, {
        category: 'SANDBOX_CURIOSITY',
        title: `${prev.timer.activeTaskTitle} (${mult}x Block)`,
        durationMinutes: activeDurations.totalMinutes,
        blockCredit: mult,
        roadmapTrack: sandboxTrack,
        stroke: 'INPUT',
        sourceBlockId: 'sandbox_curiosity',
        rungNumber: 2,
      });
    }

    const prevDrip = getEffectiveDailyAmbitionDrip(prev);
    let updatedSovereignDripDone = Boolean(prev.dailySovereignDripDone);
    let updatedDailyAmbitionDrip: DailyAmbitionDripConfig = { ...prevDrip };

    if (!matchingBaseline && prev.timer.activeBlockSourceId !== 'sandbox_curiosity') {
      updatedDiscretionary = Number((updatedDiscretionary + mult).toFixed(2));
      const matchedBySourceId = prev.projectQueue.find(
        (p) => p.id === prev.timer.activeBlockSourceId
      );
      const activeFocusProj = matchedBySourceId || getActiveFocusProject(prev);
      const targetProjId = activeFocusProj?.id;
      const isDripRun = Boolean(
        activeFocusProj && isProjectAmbitionDripEligible(activeFocusProj)
      );
      if (isDripRun) {
        updatedSovereignDripDone = true;
        updatedDailyAmbitionDrip = {
          ...prevDrip,
          completedToday: prevDrip.completedToday + 1,
        };
      }
      updatedProjects = prev.projectQueue.map((p) => {
        if (p.id !== targetProjId) return p;
        const nextCompleted = Math.min(
          p.totalBlocks,
          Number((p.completedBlocks + mult).toFixed(2))
        );
        const nextSubStep =
          p.blockSubSteps && p.blockSubSteps.length > 0
            ? p.blockSubSteps[
                Math.min(p.blockSubSteps.length - 1, Math.floor(nextCompleted))
              ]
            : undefined;
        return {
          ...p,
          completedBlocks: nextCompleted,
          startupStep: nextSubStep || p.startupStep,
        };
      });
      const primaryTrack = activeFocusProj?.trackId || 'writing';
      const resolvedSubTrack: MajorSubTrackId =
        activeFocusProj?.subTrack ||
        (isDripRun ? '1B_INDEPENDENT' : '1A_INSTITUTIONAL');
      updatedTracks = creditRoadmapTrack(
        updatedTracks,
        primaryTrack,
        'OUTPUT',
        3,
        mult,
        resolvedSubTrack
      );
      newLogEntry = createTodayLogEntry(prev, {
        category: 'PROJECT_FOCUS_1',
        title:
          mult === 0.5
            ? `${activeFocusProj?.title || prev.timer.activeTaskTitle} (0.5x Micro-Block)`
            : mult === 2.0
            ? `${activeFocusProj?.title || prev.timer.activeTaskTitle} (2.0x Chained Flow Block)`
            : isDripRun
            ? `[Ambition Drip] ${activeFocusProj?.title || prev.timer.activeTaskTitle}`
            : activeFocusProj?.title || prev.timer.activeTaskTitle,
        durationMinutes: activeDurations.totalMinutes,
        blockCredit: mult,
        roadmapTrack: primaryTrack,
        stroke: 'OUTPUT',
        sourceBlockId: activeFocusProj?.id,
        rungNumber: 3,
      });
    }

    pushUndoSnapshot(
      prev,
      `Block Logged: ${newLogEntry!.title} (${newLogEntry!.durationMinutes}m • +${mult}b)`
    );

    const nextCandidate: SymmetryState = {
      ...prev,
      todayBlockLog: [...(prev.todayBlockLog || []), newLogEntry!],
      baselineBlocks: updatedBaseline,
      discretionaryBlocksCompletedToday: updatedDiscretionary,
      dailySovereignDripDone: updatedSovereignDripDone,
      dailyAmbitionDrip: updatedDailyAmbitionDrip,
      projectQueue: updatedProjects,
      roadmapTracks: updatedTracks,
    };

    const nextMetrics = computeShiftMetrics(nextCandidate);

    // Check Surge Mode 7-block Mid-Day Reset circuit breaker
    if (
      nextCandidate.loadMode === 'SURGE' &&
      nextMetrics.totalCompletedBlocks >= 7 &&
      !nextCandidate.midDayResetCompletedToday
    ) {
      return {
        ...nextCandidate,
        timer: {
          ...prev.timer,
          mode: 'BREAK_L3',
          workStage: 'IGNITION_5M',
          secondsLeft: prev.timer.l3DurationMinutes * 60,
          targetEndTimeMs: null,
          isRunning: false,
          chainedBlocksCount: 0,
          startupShrinkLevel: 1,
        },
      };
    }

    // Rule: 2.0x Chained Flow Block (40m) or 2 chained 20m blocks immediately enforces mandatory 10-15m Level 2 Task-Switch Buffer
    if (mult === 2.0 || prev.timer.chainedBlocksCount >= 2) {
      return {
        ...nextCandidate,
        timer: {
          ...prev.timer,
          mode: 'BREAK_L2',
          workStage: 'IGNITION_5M',
          secondsLeft: prev.timer.l2DurationMinutes * 60,
          targetEndTimeMs: null,
          isRunning: false,
          chainedBlocksCount: 0,
          startupShrinkLevel: 1,
        },
      };
    }

    return {
      ...nextCandidate,
      timer: {
        ...prev.timer,
        mode: 'BREAK_L1',
        workStage: 'IGNITION_5M',
        secondsLeft: prev.timer.l1DurationMinutes * 60,
        targetEndTimeMs: null,
        isRunning: false,
        chainedBlocksCount: 2,
        startupShrinkLevel: 1,
      },
    };
  };

  // Advance Recharge Pacing: 5m Startup -> 20m Check-In -> 40m Check-In -> 60m Mandatory Break
  const advanceCategoryMilestoneInternal = (
    prev: SymmetryState,
    now = Date.now()
  ): SymmetryState => {
    const r = prev.recharge;
    const isGentleEveningPulse =
      prev.flexibilityTuning?.eveningPulseSensitivity === 'GENTLE_40_60';
    if (r.pacingStage === 'STARTUP_5M') {
      dispatchLockScreenAlert(
        'ROLLOVER_5M_TO_15M',
        '5m Recharge Startup Step Complete',
        'Rolling into 20m Check-In window.'
      );
      const keepRunning = r.categoryRunning;
      const nextEndTimeMs = keepRunning
        ? (r.categoryTargetEndTimeMs ?? now) + 900 * 1000
        : null;
      const nextSecondsLeft =
        keepRunning && nextEndTimeMs
          ? Math.max(1, Math.ceil((nextEndTimeMs - now) / 1000))
          : 900;
      return {
        ...prev,
        recharge: {
          ...r,
          pacingStage: 'WINDOW_20M',
          categorySecondsLeft: nextSecondsLeft, // 15m remaining to 20m mark
          categoryTargetEndTimeMs: nextEndTimeMs,
          categoryElapsedMinutes: 5,
          categoryRunning: keepRunning,
        },
      };
    }
    if (r.pacingStage === 'WINDOW_20M') {
      dispatchLockScreenAlert(
        'CHECKIN_20M_CHIME',
        isGentleEveningPulse
          ? '20m Gentle Milestone Chime (Auto-Rolling to 40m)'
          : '20m Check-In Chime',
        'Keep going, switch, or rest? (Immediate Sticky swap unlocked).'
      );
      const stickyKey: StickyKey | null =
        r.activeCategory === 'CAT2_MAKER'
          ? 'CAT2_MAKER'
          : r.activeCategory === 'CAT5_GAMING'
          ? 'CAT5_GAMING'
          : r.activeCategory === 'CAT3_MEDIA'
          ? r.activeMediaTab
          : null;

      const updatedStickySlots = { ...r.stickySlots };
      if (stickyKey) {
        updatedStickySlots[stickyKey] = {
          ...updatedStickySlots[stickyKey],
          unlockedViaCheckIn: true,
        };
      }

      if (isGentleEveningPulse) {
        const keepRunning = r.categoryRunning;
        const nextEndTimeMs = keepRunning
          ? (r.categoryTargetEndTimeMs ?? now) + 1200 * 1000
          : null;
        return {
          ...prev,
          recharge: {
            ...r,
            pacingStage: 'WINDOW_40M',
            categorySecondsLeft: 1200,
            categoryTargetEndTimeMs: nextEndTimeMs,
            categoryElapsedMinutes: 20,
            categoryRunning: keepRunning,
            checkInModalOpen: false,
            checkInMilestone: 20,
            stickySlots: updatedStickySlots,
          },
        };
      }

      return {
        ...prev,
        recharge: {
          ...r,
          pacingStage: 'WINDOW_40M',
          categorySecondsLeft: 1200,
          categoryTargetEndTimeMs: null,
          categoryElapsedMinutes: 20,
          categoryRunning: false,
          checkInModalOpen: true,
          checkInMilestone: 20,
          stickySlots: updatedStickySlots,
        },
      };
    }
    if (r.pacingStage === 'WINDOW_40M') {
      dispatchLockScreenAlert(
        'CHECKIN_20M_CHIME',
        '40m Check-In Chime',
        'Keep going, switch, or rest? Mandatory physical break in 20m.'
      );
      return {
        ...prev,
        recharge: {
          ...r,
          pacingStage: 'MANDATORY_BREAK_60M',
          categorySecondsLeft: 600, // 10m Mandatory Physical Break at 60m
          categoryTargetEndTimeMs: null,
          categoryElapsedMinutes: 40,
          categoryRunning: false,
          checkInModalOpen: true,
          checkInMilestone: 40,
        },
      };
    }
    dispatchLockScreenAlert(
      'MANDATORY_60M_BREAK',
      '60m Mandatory Physical Break Alert',
      '60 minutes reached. Enforcing mandatory 5–10m physical break.'
    );
    return {
      ...prev,
      recharge: {
        ...r,
        pacingStage: 'STARTUP_5M',
        categorySecondsLeft: 300,
        categoryTargetEndTimeMs: null,
        categoryElapsedMinutes: 60,
        categoryRunning: false,
      },
    };
  };

  // Master timestamp-delta (targetEndTimeMs - Date.now()) reconciliation loop for all active timers
  useEffect(() => {
    const anyRunning =
      state.timer.isRunning ||
      state.timer.recoveryFlashcardRunning ||
      state.recharge.flowExtensionRunning ||
      state.recharge.option0Running ||
      state.recharge.categoryRunning;

    if (!anyRunning) return;

    const syncTimersWithNow = () => {
      const now = Date.now();
      setState((prev) => {
        let next = { ...prev };
        let changed = false;
        const activeDurations = getActiveBlockDurationsSeconds(prev);

        // 1. Primary Work (Startup / Momentum) / Break (L1/L2/L3) / Stress Reset Timer
        if (prev.timer.isRunning) {
          const endTimeMs =
            prev.timer.targetEndTimeMs ?? now + prev.timer.secondsLeft * 1000;
          const remainingMs = endTimeMs - now;
          const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));

          if (remainingMs > 0) {
            if (
              prev.timer.secondsLeft !== remainingSec ||
              prev.timer.targetEndTimeMs !== endTimeMs
            ) {
              next.timer = {
                ...prev.timer,
                targetEndTimeMs: endTimeMs,
                secondsLeft: remainingSec,
              };
              changed = true;
            }
          } else {
            changed = true;
            // Stage reached targetEndTimeMs -> deterministic state transition
            if (prev.timer.mode === 'WORK_20M' && prev.timer.workStage === 'IGNITION_5M') {
              // Rule 2: Auto-roll Startup Step (IGNITION_5M) into Momentum (MOMENTUM_15M) without stopping the timer
              dispatchLockScreenAlert(
                'ROLLOVER_5M_TO_15M',
                `${activeDurations.startupMinutes}m Startup Step Complete → ${activeDurations.momentumMinutes}m Momentum`,
                `Auto-rolling into ${activeDurations.momentumMinutes}m Momentum (MOMENTUM_15M) for "${prev.timer.activeTaskTitle}".`
              );
              const nextEndTimeMs =
                endTimeMs + activeDurations.momentumSeconds * 1000;
              const nextSecondsLeft = Math.max(
                1,
                Math.ceil((nextEndTimeMs - now) / 1000)
              );
              next.timer = {
                ...prev.timer,
                workStage: 'MOMENTUM_15M',
                secondsLeft: nextSecondsLeft,
                targetEndTimeMs: nextEndTimeMs,
                isRunning: true,
              };
            } else if (
              prev.timer.mode === 'WORK_20M' &&
              prev.timer.workStage === 'MOMENTUM_15M'
            ) {
              dispatchLockScreenAlert(
                'WORK_BLOCK_COMPLETE',
                `${activeDurations.totalMinutes}m Work Block Complete`,
                `Completed ${activeDurations.totalMinutes}m (${activeDurations.blockCredit}x) block for "${prev.timer.activeTaskTitle}".`
              );
              next = handleCompleteWorkBlockTransition(prev);
            } else if (prev.timer.mode === 'STRESS_RESET') {
              // Rule 6: Stress / Fatigue Reset finishes -> queues 5m Flashcard block
              dispatchLockScreenAlert(
                'STRESS_RESET_COMPLETE',
                'Stress / Fatigue Reset Complete',
                '5m Flashcard recovery block queued.'
              );
              next.timer = {
                ...prev.timer,
                isRunning: false,
                targetEndTimeMs: null,
                secondsLeft: prev.timer.stressDurationMinutes * 60,
                queuedRecoveryFlashcard5m: true,
                recoveryFlashcardSecondsLeft: 300,
                recoveryFlashcardTargetEndTimeMs: null,
                recoveryFlashcardRunning: false,
              };
            } else {
              // Level 1 / 2 / 3 Break completed -> chime + return to Startup Step
              dispatchLockScreenAlert(
                'BREAK_COMPLETE',
                `Break Complete → Ready for ${activeDurations.startupMinutes}m Startup Step`,
                `Break finished. Ready to start next ${activeDurations.startupMinutes}m Startup Step (IGNITION_5M).`
              );
              next.timer = {
                ...prev.timer,
                mode: 'WORK_20M',
                workStage: 'IGNITION_5M',
                secondsLeft: activeDurations.startupSeconds,
                targetEndTimeMs: null,
                isRunning: false,
                startupShrinkLevel: 1,
              };
              if (prev.timer.mode === 'BREAK_L3') {
                next.midDayResetCompletedToday = true;
              }
            }
          }
        }

        // 2. Queued 5m Recovery Flashcard Timer
        if (prev.timer.recoveryFlashcardRunning) {
          const recEndTimeMs =
            prev.timer.recoveryFlashcardTargetEndTimeMs ??
            now + prev.timer.recoveryFlashcardSecondsLeft * 1000;
          const recRemainingMs = recEndTimeMs - now;
          const recRemainingSec = Math.max(0, Math.ceil(recRemainingMs / 1000));

          if (recRemainingMs > 0) {
            if (
              next.timer.recoveryFlashcardSecondsLeft !== recRemainingSec ||
              next.timer.recoveryFlashcardTargetEndTimeMs !== recEndTimeMs
            ) {
              next.timer = {
                ...next.timer,
                recoveryFlashcardTargetEndTimeMs: recEndTimeMs,
                recoveryFlashcardSecondsLeft: recRemainingSec,
              };
              changed = true;
            }
          } else {
            changed = true;
            pushUndoSnapshot(prev, 'Block Logged: 5m Flashcard Recovery (5m)');
            dispatchLockScreenAlert(
              'WORK_BLOCK_COMPLETE',
              '5m Flashcard Recovery Block Complete',
              'Completed 5-minute Flashcard recovery ramp.'
            );
            next.timer = {
              ...next.timer,
              queuedRecoveryFlashcard5m: false,
              recoveryFlashcardRunning: false,
              recoveryFlashcardSecondsLeft: 300,
              recoveryFlashcardTargetEndTimeMs: null,
            };
            next.roadmapTracks = creditRoadmapTrack(
              next.roadmapTracks,
              'science',
              'INPUT',
              1
            );
            const recLogEntry = createTodayLogEntry(prev, {
              category: 'FLOOR_COMP',
              title: 'Stress Triage — 5m Flashcard Recovery Ramp',
              durationMinutes: 5,
              roadmapTrack: 'science',
              stroke: 'INPUT',
              rungNumber: 1,
            });
            next.todayBlockLog = [...(prev.todayBlockLog ?? []), recLogEntry];
          }
        }

        // 3. Flow Extension Open Count-Up Timer (20m Check-In Chimes & 60m Mandatory Break Alert)
        if (prev.recharge.flowExtensionRunning) {
          const startTimeMs =
            prev.recharge.flowExtensionStartTimeMs ??
            now - prev.recharge.flowExtensionElapsedSeconds * 1000;
          const newElapsed = Math.max(
            prev.recharge.flowExtensionElapsedSeconds,
            Math.floor((now - startTimeMs) / 1000)
          );

          if (
            newElapsed !== prev.recharge.flowExtensionElapsedSeconds ||
            prev.recharge.flowExtensionStartTimeMs !== startTimeMs
          ) {
            const prev60mBuckets = Math.floor(
              prev.recharge.flowExtensionElapsedSeconds / 3600
            );
            const new60mBuckets = Math.floor(newElapsed / 3600);
            const prev20mBuckets = Math.floor(
              prev.recharge.flowExtensionElapsedSeconds / 1200
            );
            const new20mBuckets = Math.floor(newElapsed / 1200);

            if (new60mBuckets > prev60mBuckets) {
              dispatchLockScreenAlert(
                'MANDATORY_60M_BREAK',
                '60m Mandatory Physical Break Alert',
                '60 minutes of Flow Extension elapsed. Take a mandatory 5–10m physical break.'
              );
            } else if (new20mBuckets > prev20mBuckets) {
              dispatchLockScreenAlert(
                'CHECKIN_20M_CHIME',
                '20m Flow Extension Check-In Chime',
                `${new20mBuckets * 20}m elapsed in Flow Extension.`
              );
            }
            next.recharge = {
              ...next.recharge,
              flowExtensionStartTimeMs: startTimeMs,
              flowExtensionElapsedSeconds: newElapsed,
            };
            changed = true;
          }
        }

        // 4. Option 0 Rest / Stillness 20m Timer
        if (prev.recharge.option0Running) {
          const optEndTimeMs =
            prev.recharge.option0TargetEndTimeMs ??
            now + prev.recharge.option0SecondsLeft * 1000;
          const optRemainingMs = optEndTimeMs - now;
          const optRemainingSec = Math.max(0, Math.ceil(optRemainingMs / 1000));

          if (optRemainingMs > 0) {
            if (
              next.recharge.option0SecondsLeft !== optRemainingSec ||
              next.recharge.option0TargetEndTimeMs !== optEndTimeMs
            ) {
              next.recharge = {
                ...next.recharge,
                option0TargetEndTimeMs: optEndTimeMs,
                option0SecondsLeft: optRemainingSec,
              };
              changed = true;
            }
          } else {
            changed = true;
            const windows = prev.recharge.option0ConsecutiveWindows + 1;
            pushUndoSnapshot(
              prev,
              `Block Logged: Option 0 Stillness (${windows}/2) (20m)`
            );
            dispatchLockScreenAlert(
              'WORK_BLOCK_COMPLETE',
              'Option 0 Stillness Window Complete',
              `Completed 20m Rest / Stillness window (${windows}/2).`
            );
            next.recharge = {
              ...next.recharge,
              option0Running: false,
              option0TargetEndTimeMs: null,
              option0SecondsLeft: 1200,
              option0ConsecutiveWindows: windows,
              forkCheckModalOpen: windows >= 2,
            };
            const optLogEntry = createTodayLogEntry(prev, {
              category: 'EVENING_RECHARGE',
              title: `Option 0 — Rest / Stillness Window (${windows}/2)`,
              durationMinutes: 20,
              roadmapTrack: 'personal',
              stroke: 'INPUT',
              rungNumber: 1,
            });
            next.todayBlockLog = [...(prev.todayBlockLog ?? []), optLogEntry];
          }
        }

        // 5. Evening Recharge Category Timer (5m Startup -> 20m Check-In -> 40m Check-In -> 60m Break)
        if (prev.recharge.categoryRunning) {
          const catEndTimeMs =
            prev.recharge.categoryTargetEndTimeMs ??
            now + prev.recharge.categorySecondsLeft * 1000;
          const catRemainingMs = catEndTimeMs - now;
          const catRemainingSec = Math.max(0, Math.ceil(catRemainingMs / 1000));

          if (catRemainingMs > 0) {
            if (
              next.recharge.categorySecondsLeft !== catRemainingSec ||
              next.recharge.categoryTargetEndTimeMs !== catEndTimeMs
            ) {
              next.recharge = {
                ...next.recharge,
                categoryTargetEndTimeMs: catEndTimeMs,
                categorySecondsLeft: catRemainingSec,
              };
              changed = true;
            }
          } else {
            changed = true;
            next = advanceCategoryMilestoneInternal(next, now);
          }
        }

        return changed ? next : prev;
      });
    };

    syncTimersWithNow();
    const interval = window.setInterval(syncTimersWithNow, 250);
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncTimersWithNow();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', syncTimersWithNow);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', syncTimersWithNow);
    };
  }, [
    state.timer.isRunning,
    state.timer.recoveryFlashcardRunning,
    state.recharge.flowExtensionRunning,
    state.recharge.option0Running,
    state.recharge.categoryRunning,
    pushUndoSnapshot,
  ]);

  // Handlers for Tab 1 (Focus Pipeline)
  const handleSelectLoadMode = (
    mode: LoadMode,
    targetBlocks: number,
    cruisePlus = false
  ) => {
    soundEngine.playTactileClick('MODE_TOGGLE');
    setState((prev) => {
      const nextFixedEvent: FixedEventType =
        mode === 'TAPER' && prev.fixedEvent === 'NONE' ? 'LAB_2H' : prev.fixedEvent;
      return {
        ...prev,
        loadMode: mode,
        cruisePlus,
        preExamTaperActive: mode === 'TAPER' ? prev.preExamTaperActive : false,
        customModeBlockAdjustment: targetBlocks,
        fixedEvent: nextFixedEvent,
        pipelineDays: prev.pipelineDays.map((d) =>
          d.isToday
            ? {
                ...d,
                loadMode: mode,
                cruisePlus,
                baseTargetBlocks: targetBlocks,
                fixedEvent: nextFixedEvent,
              }
            : d
        ),
      };
    });
    showNotice(`Switched to ${mode}${cruisePlus ? '+' : ''} Mode (${targetBlocks} blocks).`);
  };

  // Pre-Exam Taper Auto-Mode: Cancels heavy prose/synthesis, caps workload at Taper ceiling (7-9 blocks), routes to Exam Review & Active Recall
  const handleTogglePreExamTaper = (forceValue?: boolean) => {
    soundEngine.playTactileClick('MODE_TOGGLE');
    setState((prev) => {
      const nextActive =
        typeof forceValue === 'boolean' ? forceValue : !prev.preExamTaperActive;
      const cappedBlocks = nextActive
        ? Math.min(9, Math.max(7, prev.customModeBlockAdjustment || 8))
        : 12;

      return {
        ...prev,
        preExamTaperActive: nextActive,
        loadMode: nextActive ? 'TAPER' : 'CRUISE',
        cruisePlus: false,
        customModeBlockAdjustment: nextActive ? 8 : cappedBlocks,
        baselineBlocks: prev.baselineBlocks.map((b) =>
          b.category === 'SYNTHESIS'
            ? {
                ...b,
                bankedViaEarlyClearance: nextActive,
              }
            : b
        ),
        pipelineDays: prev.pipelineDays.map((d) =>
          d.isToday
            ? {
                ...d,
                loadMode: nextActive ? 'TAPER' : 'CRUISE',
                baseTargetBlocks: nextActive ? 8 : cappedBlocks,
              }
            : d
        ),
        timer: nextActive
          ? {
              ...prev.timer,
              activeBlockSourceId: 'fc_anat_1',
              activeTaskTitle:
                'Exam Review & Active Recall — High-Yield Practice Drill',
              activeTaskType: 'FLASHCARDS',
              activeStartupPrompt:
                'Open high-yield missed card tags + complete first 15 active recall questions.',
            }
          : prev.timer,
      };
    });
    showNotice(
      state.preExamTaperActive
        ? 'Disabled Pre-Exam Taper Mode — restored standard Cruise pipeline.'
        : 'Pre-Exam Taper Active: Synthesis canceled, ceiling capped at 8 blocks (7–9 range), routed to Exam Review & Active Recall.'
    );
  };

  const handleToggleBaselineBlock = (blockId: string) => {
    soundEngine.playTactileClick('BLOCK_COMPLETE');
    setState((prev) => {
      const target = prev.baselineBlocks.find((b) => b.id === blockId);
      if (!target) return prev;
      const targetBlocks = getBaselineSlotTargetBlocks(target);
      const currentDone = Math.floor(getBaselineSlotCompletedBlocks(target));
      const isCurrentlyFullyComplete =
        target.completed || currentDone >= targetBlocks;

      const stroke: 'INPUT' | 'OUTPUT' =
        target.category === 'SYNTHESIS' ? 'OUTPUT' : 'INPUT';
      const rungNum: 1 | 2 | 3 | 4 = target.category === 'SYNTHESIS' ? 2 : 1;

      let nextDone = currentDone;
      let nextCompleted = false;

      if (!isCurrentlyFullyComplete) {
        nextDone = Math.min(targetBlocks, currentDone + 1);
        nextCompleted = nextDone >= targetBlocks;
      } else {
        nextDone = 0;
        nextCompleted = false;
      }

      const updatedBaseline = prev.baselineBlocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              completed: nextCompleted,
              completedBlocks: nextDone,
              partialCredit: 0,
              bankedViaEarlyClearance: false,
            }
          : b
      );

      let updatedTracks = prev.roadmapTracks;
      let updatedLog = prev.todayBlockLog || [];

      if (!isCurrentlyFullyComplete) {
        updatedTracks = creditRoadmapTrack(
          updatedTracks,
          target.trackId,
          stroke,
          rungNum
        );
        const newEntry = createTodayLogEntry(prev, {
          category: baselineCategoryToLogCategory(target.category),
          title:
            targetBlocks > 1
              ? `${target.title} (${nextDone}/${targetBlocks})`
              : target.title,
          durationMinutes: 20,
          roadmapTrack: target.trackId,
          stroke,
          sourceBlockId: target.id,
          rungNumber: rungNum,
        });
        updatedLog = [...updatedLog, newEntry];
        pushUndoSnapshot(prev, `Block Logged: ${target.title} (20m)`);
      } else {
        const blocksToDebit = Math.max(1, currentDone);
        updatedTracks = debitRoadmapTrack(
          updatedTracks,
          target.trackId,
          stroke,
          rungNum,
          blocksToDebit
        );
        // Remove log entries for this baseline block
        updatedLog = updatedLog.filter((e) => e.sourceBlockId !== target.id);
        pushUndoSnapshot(prev, `Baseline Pill Unchecked: ${target.title}`);
      }

      return {
        ...prev,
        todayBlockLog: updatedLog,
        baselineBlocks: updatedBaseline,
        roadmapTracks: updatedTracks,
      };
    });
  };

  const handleToggleEarlyClearance = () => {
    soundEngine.playTactileClick('MODE_TOGGLE');
    setState((prev) => {
      const nextEnabled = !prev.earlyClearanceEnabled;
      const updatedBaseline = prev.baselineBlocks.map((b) => {
        const isEligible = isBaselineSlotEarlyClearanceEligible(b);
        if (!isEligible || b.completed) return b;
        return {
          ...b,
          bankedViaEarlyClearance: nextEnabled,
          reallocatedViaEarlyClearance: false,
          reallocatedBlocksCount: 0,
        };
      });
      pushUndoSnapshot(
        prev,
        nextEnabled
          ? 'Early Clearance Enabled: Unused Eligible Baseline Blocks Banked'
          : 'Early Clearance Disabled: Baseline Blocks Restored'
      );
      return {
        ...prev,
        earlyClearanceEnabled: nextEnabled,
        baselineBlocks: updatedBaseline,
      };
    });
    showNotice('Toggled Early Clearance banking.');
  };

  const handleApplySlotEarlyClearance = (
    slotId: string | 'ALL_ELIGIBLE',
    mode: EarlyClearanceActionMode
  ) => {
    soundEngine.playTactileClick('MODE_TOGGLE');
    setState((prev) => {
      let totalFreedBlocks = 0;
      const updatedBaseline = prev.baselineBlocks.map((b) => {
        const matchesTarget =
          slotId === 'ALL_ELIGIBLE'
            ? isBaselineSlotEarlyClearanceEligible(b) && !isBaselineSlotClearedForToday(b)
            : b.id === slotId;
        if (!matchesTarget || b.completed) return b;
        const slotTarget = getBaselineSlotTargetBlocks(b);
        const slotDone = getBaselineSlotCompletedBlocks(b);
        const freed = Math.max(1, slotTarget - slotDone);
        totalFreedBlocks += freed;
        if (mode === 'BANK_FREE_TIME') {
          return {
            ...b,
            bankedViaEarlyClearance: true,
            reallocatedViaEarlyClearance: false,
            reallocatedBlocksCount: 0,
          };
        }
        return {
          ...b,
          bankedViaEarlyClearance: false,
          reallocatedViaEarlyClearance: true,
          reallocatedBlocksCount: freed,
        };
      });

      const anyEligibleRemaining = updatedBaseline.some(
        (b) => isBaselineSlotEarlyClearanceEligible(b) && !isBaselineSlotClearedForToday(b)
      );

      pushUndoSnapshot(
        prev,
        mode === 'BANK_FREE_TIME'
          ? `Early Clearance Option A: Banked ${totalFreedBlocks}b as Free Recovery`
          : `Early Clearance Option B: Reallocated ${totalFreedBlocks}b to Project / Drip Queue`
      );

      return {
        ...prev,
        earlyClearanceEnabled: !anyEligibleRemaining,
        baselineBlocks: updatedBaseline,
      };
    });
    showNotice(
      mode === 'BANK_FREE_TIME'
        ? 'Early Clearance Option A: Banked remaining recall blocks as Free Recovery.'
        : 'Early Clearance Option B: Reallocated freed recall blocks 1-for-1 into Project / Ambition Drip queue.'
    );
  };

  const handleRestoreSlotEarlyClearance = (slotId: string) => {
    soundEngine.playTactileClick('MODE_TOGGLE');
    setState((prev) => {
      const updatedBaseline = prev.baselineBlocks.map((b) =>
        b.id === slotId
          ? {
              ...b,
              bankedViaEarlyClearance: false,
              reallocatedViaEarlyClearance: false,
              reallocatedBlocksCount: 0,
            }
          : b
      );
      return {
        ...prev,
        earlyClearanceEnabled: false,
        baselineBlocks: updatedBaseline,
      };
    });
    showNotice('Restored Baseline recall slot to active schedule.');
  };

  const handleToggleAnkiConnect = (enabled: boolean) => {
    setState((prev) => ({
      ...prev,
      ankiConnectEnabled: enabled,
      ankiConnectUrl: prev.ankiConnectUrl || 'http://127.0.0.1:8765',
    }));
    showNotice(
      enabled
        ? 'Enabled desktop AnkiConnect polling (http://127.0.0.1:8765).'
        : 'Disabled desktop AnkiConnect polling.'
    );
  };

  const handleLaunchBlockInTimer = (
    sourceId: string,
    title: string,
    taskType: 'FLASHCARDS' | 'READING' | 'SYNTHESIS' | 'PROJECT',
    startupPrompt: string
  ) => {
    // Enforce strict 1-block (20m) stopwatch cap on Ambition Drip secondary slots unless Flow Extension is unlocked
    const matchedProj = state.projectQueue.find((p) => p.id === sourceId);
    const activeFocus = getActiveFocusProject(state);
    if (
      matchedProj &&
      matchedProj.id !== activeFocus?.id &&
      isProjectAmbitionDripEligible(matchedProj)
    ) {
      const drip = getEffectiveDailyAmbitionDrip(state);
      if (isTodayExamDay(state)) {
        showNotice('Daily Ambition Drip is auto-paused for Exam / Pre-Exam Taper Day.');
        return;
      }
      if (
        drip.completedToday >= drip.targetBlocksPerDay &&
        !state.recharge.flowExtensionActive
      ) {
        showNotice(
          'Daily Ambition Drip is strictly stopwatch-capped at 1 block (20m) unless Flow Extension is unlocked.'
        );
        return;
      }
    }

    soundEngine.playTactileClick('MODE_TOGGLE');
    const now = Date.now();
    setState((prev) => {
      const isTaskSwitch = prev.timer.activeTaskType !== taskType;
      const activeDurations = getActiveBlockDurationsSeconds(prev);
      return {
        ...prev,
        timer: {
          ...prev.timer,
          mode: 'WORK_20M',
          workStage: 'IGNITION_5M',
          secondsLeft: activeDurations.startupSeconds,
          targetEndTimeMs: now + activeDurations.startupSeconds * 1000,
          isRunning: true,
          activeBlockSourceId: sourceId,
          activeTaskTitle: title,
          activeTaskType: taskType,
          activeStartupPrompt: startupPrompt,
          chainedBlocksCount: isTaskSwitch ? 1 : prev.timer.chainedBlocksCount,
          startupShrinkLevel: 1,
        },
      };
    });
    setActiveTab('TIMER');
    showNotice(`Started Startup Step (IGNITION_5M) for "${title}".`);
  };

  const handleIncrementProjectBlock = (projectId: string) => {
    const matchedCheck = state.projectQueue.find((p) => p.id === projectId);
    const activeFocusCheck = getActiveFocusProject(state);
    if (
      matchedCheck &&
      matchedCheck.id !== activeFocusCheck?.id &&
      isProjectAmbitionDripEligible(matchedCheck)
    ) {
      const drip = getEffectiveDailyAmbitionDrip(state);
      if (isTodayExamDay(state)) {
        showNotice('Daily Ambition Drip is auto-paused for Exam / Pre-Exam Taper Day.');
        return;
      }
      if (
        drip.completedToday >= drip.targetBlocksPerDay &&
        !state.recharge.flowExtensionActive
      ) {
        showNotice(
          'Daily Ambition Drip is strictly capped at 1 block (20m) today unless Flow Extension is unlocked.'
        );
        return;
      }
    }

    soundEngine.playTactileClick('BLOCK_COMPLETE');
    setState((prev) => {
      const targetProj =
        prev.projectQueue.find((p) => p.id === projectId) ||
        getActiveFocusProject(prev);
      if (!targetProj) return prev;
      const isDrip = isProjectAmbitionDripEligible(targetProj);
      const prevDrip = getEffectiveDailyAmbitionDrip(prev);
      const updatedQueue = prev.projectQueue.map((p) => {
        if (p.id !== targetProj.id) return p;
        const nextDone = Math.min(p.totalBlocks, p.completedBlocks + 1);
        const nextSubStep =
          p.blockSubSteps && p.blockSubSteps.length > 0
            ? p.blockSubSteps[Math.min(p.blockSubSteps.length - 1, nextDone)]
            : undefined;
        return {
          ...p,
          completedBlocks: nextDone,
          startupStep: nextSubStep || p.startupStep,
        };
      });
      const resolvedSubTrack: MajorSubTrackId =
        targetProj.subTrack || (isDrip ? '1B_INDEPENDENT' : '1A_INSTITUTIONAL');
      const updatedTracks = creditRoadmapTrack(
        prev.roadmapTracks,
        targetProj.trackId,
        'OUTPUT',
        3,
        1,
        resolvedSubTrack
      );
      const newEntry = createTodayLogEntry(prev, {
        category: 'PROJECT_FOCUS_1',
        title: isDrip
          ? `[Ambition Drip] ${targetProj.title}`
          : targetProj.title,
        durationMinutes: 20,
        blockCredit: 1,
        roadmapTrack: targetProj.trackId,
        stroke: 'OUTPUT',
        sourceBlockId: targetProj.id,
        rungNumber: 3,
      });
      pushUndoSnapshot(prev, `Block Logged: ${targetProj.title} (20m)`);
      return {
        ...prev,
        todayBlockLog: [...(prev.todayBlockLog || []), newEntry],
        discretionaryBlocksCompletedToday: prev.discretionaryBlocksCompletedToday + 1,
        dailySovereignDripDone: isDrip ? true : Boolean(prev.dailySovereignDripDone),
        dailyAmbitionDrip: isDrip
          ? {
              ...prevDrip,
              completedToday: prevDrip.completedToday + 1,
            }
          : prevDrip,
        projectQueue: updatedQueue,
        roadmapTracks: updatedTracks,
      };
    });
    showNotice('Logged +1 discretionary project block (Credited to Output).');
  };

  const handleToggleSovereignDripDone = () => {
    soundEngine.playTactileClick('MODE_TOGGLE');
    setState((prev) => {
      const prevDrip = getEffectiveDailyAmbitionDrip(prev);
      const nextDone = !(
        prev.dailySovereignDripDone ||
        prevDrip.completedToday >= prevDrip.targetBlocksPerDay
      );
      return {
        ...prev,
        dailySovereignDripDone: nextDone,
        dailyAmbitionDrip: {
          ...prevDrip,
          completedToday: nextDone ? prevDrip.targetBlocksPerDay : 0,
        },
      };
    });
  };

  const handleUpdateDailyAmbitionDrip = (patch: Partial<DailyAmbitionDripConfig>) => {
    soundEngine.playTactileClick('MODE_TOGGLE');
    setState((prev) => {
      const merged: DailyAmbitionDripConfig = {
        ...getEffectiveDailyAmbitionDrip(prev),
        ...patch,
      };
      return {
        ...prev,
        dailyAmbitionDrip: merged,
        dailySovereignDripTarget: merged.targetBlocksPerDay,
        dailySovereignDripDone: merged.completedToday >= merged.targetBlocksPerDay,
      };
    });
  };

  const handleUpdateOpenListItem = (
    itemId: string,
    patch: Partial<OpenListItem>
  ) => {
    setState((prev) => {
      const source = prev.openList ?? prev.openListBacklog ?? prev.projectBacklog ?? [];
      const updated = source.map((item) => {
        if (item.id !== itemId) return item;
        const merged = { ...item, ...patch };
        const total = merged.blocksTotal ?? merged.totalBlocks ?? 4;
        return {
          ...merged,
          blocksTotal: total,
          totalBlocks: total,
        };
      });
      return {
        ...prev,
        openList: updated,
        openListBacklog: updated,
        projectBacklog: updated,
      };
    });
    showNotice('Updated Open List item & prerequisite settings.');
  };

  const handleToggleGoldenRuleMode = () => {
    soundEngine.playTactileClick('MODE_TOGGLE');
    setState((prev) => ({
      ...prev,
      sovereignGoldenRuleMode: prev.sovereignGoldenRuleMode === false,
    }));
  };

  // ===========================================================================
  // DIRECT INLINE EDITING HANDLERS (Focus, Evening Recharge, Roadmap)
  // ===========================================================================
  const handleUpdateBaselineBlock = (
    blockId: string,
    patch: Partial<import('./types/symmetry').BaselineBlock>
  ) => {
    setState((prev) => {
      const updatedBaseline = prev.baselineBlocks.map((b) => {
        if (b.id !== blockId) return b;
        const merged = { ...b, ...patch };
        const nextTarget = getBaselineSlotTargetBlocks(merged);
        const nextDone = Math.min(
          nextTarget,
          patch.completedBlocks !== undefined
            ? patch.completedBlocks
            : getBaselineSlotCompletedBlocks(b)
        );
        return {
          ...merged,
          targetBlocks: nextTarget,
          completedBlocks: nextDone,
          completed: nextDone >= nextTarget,
        };
      });
      const updatedSlot = updatedBaseline.find((b) => b.id === blockId);
      const shouldSyncActiveTimer =
        prev.timer.activeBlockSourceId === blockId && updatedSlot;
      return {
        ...prev,
        baselineBlocks: updatedBaseline,
        timer: shouldSyncActiveTimer
          ? {
              ...prev.timer,
              activeTaskTitle: updatedSlot.title,
              activeStartupPrompt:
                updatedSlot.startupStep ||
                updatedSlot.startupPrompt ||
                prev.timer.activeStartupPrompt,
            }
          : prev.timer,
      };
    });
  };

  const handleAddBaselineBlock = () => {
    setState((prev) => {
      const nextNum = prev.baselineBlocks.length + 1;
      const newSlot: import('./types/symmetry').BaselineBlock = {
        id: `base_inline_${Date.now()}`,
        category: 'READING',
        title: `Daily Habit ${nextNum}`,
        durationMinutes: 20,
        targetBlocks: 1,
        completedBlocks: 0,
        completed: false,
        bankedViaEarlyClearance: false,
        earlyClearanceEligible: false,
        lateNightBlocker: false,
        trackId: prev.roadmapTracks[0]?.id || 'science',
        startupStep: 'Open workspace and complete first 5m step',
        startupPrompt: 'Open workspace and complete first 5m step',
      };
      return {
        ...prev,
        baselineBlocks: [...prev.baselineBlocks, newSlot],
      };
    });
    showNotice('Added new Daily Baseline slot — click its title or Edit icon to customize.');
  };

  const handleDeleteBaselineBlock = (blockId: string) => {
    setState((prev) => {
      const target = prev.baselineBlocks.find((b) => b.id === blockId);
      if (target) {
        pushUndoSnapshot(prev, `Removed Baseline Slot: ${target.title}`);
      }
      return {
        ...prev,
        baselineBlocks: prev.baselineBlocks.filter((b) => b.id !== blockId),
      };
    });
    showNotice('Removed Daily Baseline slot (Cmd/Ctrl+Z to Undo).');
  };

  const handleUpdateProjectItem = (
    projectId: string,
    patch: Partial<import('./types/symmetry').ProjectItem>
  ) => {
    setState((prev) => {
      const updatedQueue = prev.projectQueue.map((p) => {
        if (p.id !== projectId) return p;
        const merged = { ...p, ...patch };
        const clampedTotal = Math.max(
          1,
          Math.min(12, Math.round(merged.totalBlocks || 4))
        );
        return {
          ...merged,
          totalBlocks: clampedTotal,
          completedBlocks: Math.min(clampedTotal, merged.completedBlocks),
        };
      });
      const updatedProj = updatedQueue.find((p) => p.id === projectId);
      const shouldSyncTimer =
        prev.timer.activeBlockSourceId === projectId && updatedProj;
      return {
        ...prev,
        projectQueue: updatedQueue,
        timer: shouldSyncTimer
          ? {
              ...prev.timer,
              activeTaskTitle: updatedProj.title,
              activeStartupPrompt: getProjectActiveStartupStep(updatedProj),
            }
          : prev.timer,
      };
    });
  };

  const handleUpdateActiveTimerTask = (patch: {
    title?: string;
    startupPrompt?: string;
  }) => {
    setState((prev) => {
      const srcId = prev.timer.activeBlockSourceId;
      const updatedBaseline = prev.baselineBlocks.map((b) =>
        b.id === srcId
          ? {
              ...b,
              title: patch.title ?? b.title,
              startupStep: patch.startupPrompt ?? b.startupStep,
              startupPrompt:
                patch.startupPrompt ?? b.startupPrompt ?? b.startupStep,
            }
          : b
      );
      const updatedProjects = prev.projectQueue.map((p) =>
        p.id === srcId
          ? {
              ...p,
              title: patch.title ?? p.title,
              startupStep: patch.startupPrompt ?? p.startupStep,
            }
          : p
      );
      return {
        ...prev,
        baselineBlocks: updatedBaseline,
        projectQueue: updatedProjects,
        timer: {
          ...prev.timer,
          activeTaskTitle: patch.title ?? prev.timer.activeTaskTitle,
          activeStartupPrompt:
            patch.startupPrompt ?? prev.timer.activeStartupPrompt,
        },
      };
    });
  };

  const handleUpdateBreakOptions = (
    patch: Partial<import('./types/symmetry').BreakOptionsConfig>
  ) => {
    setState((prev) => ({
      ...prev,
      breakOptions: {
        l1Label:
          prev.breakOptions?.l1Label ||
          '3–5m Micro-Reset (Stand, stretch, water)',
        l2EspressoLabel:
          prev.breakOptions?.l2EspressoLabel || 'Espresso / Hydration',
        l2MusicLabel:
          prev.breakOptions?.l2MusicLabel || '5m Instrument / Tactile Reset',
        l2PhysicalLabel:
          prev.breakOptions?.l2PhysicalLabel || '15m Physical Mobility / TENS',
        stressBreathingLabel:
          prev.breakOptions?.stressBreathingLabel || '4-7-8 Breathing Pace',
        stressEspressoLabel:
          prev.breakOptions?.stressEspressoLabel || 'Espresso / Warm Drink',
        stressBootsLabel:
          prev.breakOptions?.stressBootsLabel || 'Compression / Physical Rest',
        ...(prev.breakOptions || {}),
        ...patch,
      },
    }));
    showNotice('Updated custom Break recovery options.');
  };

  const handleUpdateEveningCategoryCards = (
    cards: import('./types/symmetry').EveningCategoryCardConfig[]
  ) => {
    setState((prev) => {
      const synced = syncCategoryCardsToLegacyRecharge(
        cards,
        prev.recharge.stickySlots,
        prev.recharge.fluidCategories
      );
      return {
        ...prev,
        recharge: {
          ...prev.recharge,
          stickySlots: synced.stickySlots,
          fluidCategories: synced.fluidCategories,
          categoryCards: synced.categoryCards,
        },
      };
    });
  };

  const handleUpdateRoadmapTrack = (
    trackId: TrackId,
    patch: Partial<import('./types/symmetry').RoadmapTrack>
  ) => {
    setState((prev) => ({
      ...prev,
      roadmapTracks: prev.roadmapTracks.map((t) =>
        t.id === trackId ? { ...t, ...patch } : t
      ),
    }));
  };

  const handleUpdateRoadmapShelter = (patch: Partial<RoadmapShelterConfig>) => {
    setState((prev) => ({
      ...prev,
      roadmapShelter: {
        ...(prev.roadmapShelter || DEFAULT_HOUSE_SHELTER),
        ...patch,
        horizonMilestones: {
          ...(prev.roadmapShelter?.horizonMilestones ||
            DEFAULT_HOUSE_SHELTER.horizonMilestones),
          ...(patch.horizonMilestones || {}),
        },
      },
    }));
  };

  const handleUpdateRoadmapFoundation = (
    patch: Partial<RoadmapFoundationConfig>
  ) => {
    setState((prev) => ({
      ...prev,
      roadmapFoundation: {
        ...(prev.roadmapFoundation || DEFAULT_HOUSE_FOUNDATION),
        ...patch,
      },
    }));
  };

  const handleUpdateRoadmapRung = (
    trackId: TrackId,
    rungNumber: 1 | 2 | 3 | 4,
    patch: Partial<import('./types/symmetry').RoadmapRung>
  ) => {
    setState((prev) => ({
      ...prev,
      roadmapTracks: prev.roadmapTracks.map((t) =>
        t.id === trackId
          ? {
              ...t,
              rungs: t.rungs.map((r) =>
                r.rungNumber === rungNumber ? { ...r, ...patch } : r
              ),
            }
          : t
      ),
    }));
  };

  const handleToggleTrackSandboxType = (trackId: TrackId) => {
    setState((prev) => ({
      ...prev,
      roadmapTracks: prev.roadmapTracks.map((t) => {
        if (t.id !== trackId) return t;
        const nextSandbox = !t.isSandbox;
        return {
          ...t,
          isSandbox: nextSandbox,
          categoryLabel: nextSandbox ? 'ZERO-QUOTA SANDBOX' : 'CORE TRACK',
          inputWeeklyTarget: nextSandbox ? 0 : Math.max(6, t.inputWeeklyTarget || 10),
          outputWeeklyTarget: nextSandbox ? 0 : Math.max(6, t.outputWeeklyTarget || 10),
        };
      }),
    }));
    showNotice('Toggled Roadmap Track between Core Track and Zero-Quota Sandbox.');
  };

  // Handlers for Today's Log Slide-Over Drawer (Reassign, Edit Title, Delete, + Manual Block)
  const handleReassignLogEntryCategory = (
    entryId: string,
    newCategory: TodayBlockLogCategory
  ) => {
    setState((prev) => {
      const entries = prev.todayBlockLog || [];
      const target = entries.find((e) => e.id === entryId);
      if (!target || target.category === newCategory) return prev;

      const oldBaselineCat = logCategoryToBaselineCategory(target.category);
      const newBaselineCat = logCategoryToBaselineCategory(newCategory);

      let updatedBaseline = [...prev.baselineBlocks];
      let updatedDiscretionary = prev.discretionaryBlocksCompletedToday;
      let updatedProjects = [...prev.projectQueue];
      let updatedTracks = [...prev.roadmapTracks];

      // 1. Reverse old category state & Roadmap credit
      if (oldBaselineCat) {
        const oldBlock =
          updatedBaseline.find(
            (b) => b.id === target.sourceBlockId && b.completed
          ) ||
          updatedBaseline.find(
            (b) => b.category === oldBaselineCat && b.completed
          );
        if (oldBlock) {
          updatedBaseline = updatedBaseline.map((b) =>
            b.id === oldBlock.id ? { ...b, completed: false } : b
          );
        }
        updatedTracks = debitRoadmapTrack(
          updatedTracks,
          target.roadmapTrack,
          target.stroke,
          target.rungNumber || (target.stroke === 'OUTPUT' ? 2 : 1)
        );
      } else if (target.category === 'PROJECT_FOCUS_1') {
        updatedDiscretionary = Math.max(0, updatedDiscretionary - 1);
        updatedProjects = updatedProjects.map((p) =>
          p.slot === 1
            ? { ...p, completedBlocks: Math.max(0, p.completedBlocks - 1) }
            : p
        );
        updatedTracks = debitRoadmapTrack(
          updatedTracks,
          target.roadmapTrack,
          target.stroke,
          target.rungNumber || 3
        );
      }

      // 2. Apply new category state & Roadmap credit (preserving 20m daily ceiling credit)
      let nextSourceBlockId: string | undefined;
      let nextTrack: TrackId = 'science';
      let nextStroke: 'INPUT' | 'OUTPUT' = 'INPUT';
      let nextRung: 1 | 2 | 3 | 4 = 1;
      let nextTitle = target.title;

      if (newBaselineCat) {
        const candidateBlock =
          updatedBaseline.find(
            (b) => b.category === newBaselineCat && !b.completed
          ) || updatedBaseline.find((b) => b.category === newBaselineCat);

        if (candidateBlock && !candidateBlock.completed) {
          updatedBaseline = updatedBaseline.map((b) =>
            b.id === candidateBlock.id
              ? { ...b, completed: true, bankedViaEarlyClearance: false }
              : b
          );
          nextSourceBlockId = candidateBlock.id;
          nextTrack = candidateBlock.trackId;
          nextStroke =
            candidateBlock.category === 'SYNTHESIS' ? 'OUTPUT' : 'INPUT';
          nextRung = candidateBlock.category === 'SYNTHESIS' ? 2 : 1;
          nextTitle = candidateBlock.title;
        } else {
          // All baseline slots in that category are already marked complete; preserve 20m ceiling credit via discretionary count
          updatedDiscretionary += 1;
          nextTrack = newBaselineCat === 'SYNTHESIS' ? 'writing' : 'science';
          nextStroke = newBaselineCat === 'SYNTHESIS' ? 'OUTPUT' : 'INPUT';
          nextRung = newBaselineCat === 'SYNTHESIS' ? 2 : 1;
        }
        updatedTracks = creditRoadmapTrack(
          updatedTracks,
          nextTrack,
          nextStroke,
          nextRung
        );
      } else if (newCategory === 'PROJECT_FOCUS_1') {
        updatedDiscretionary += 1;
        const primary = updatedProjects[0];
        if (primary) {
          updatedProjects = updatedProjects.map((p) =>
            p.slot === 1
              ? {
                  ...p,
                  completedBlocks: Math.min(
                    p.totalBlocks,
                    p.completedBlocks + 1
                  ),
                }
              : p
          );
          nextSourceBlockId = primary.id;
          nextTrack = primary.trackId;
          nextTitle = primary.title;
        } else {
          nextTrack = 'writing';
        }
        nextStroke = 'OUTPUT';
        nextRung = 3;
        updatedTracks = creditRoadmapTrack(
          updatedTracks,
          nextTrack,
          nextStroke,
          nextRung
        );
      }

      pushUndoSnapshot(
        prev,
        `Reassigned Block: ${target.title} → ${newCategory} (20m)`
      );

      const updatedEntries = entries.map((e) =>
        e.id === entryId
          ? {
              ...e,
              category: newCategory,
              title: nextTitle,
              roadmapTrack: nextTrack,
              stroke: nextStroke,
              sourceBlockId: nextSourceBlockId,
              rungNumber: nextRung,
            }
          : e
      );

      return {
        ...prev,
        todayBlockLog: updatedEntries,
        baselineBlocks: updatedBaseline,
        discretionaryBlocksCompletedToday: updatedDiscretionary,
        projectQueue: updatedProjects,
        roadmapTracks: updatedTracks,
      };
    });
  };

  const handleEditLogEntryTitle = (entryId: string, newTitle: string) => {
    setState((prev) => {
      const entries = prev.todayBlockLog || [];
      const target = entries.find((e) => e.id === entryId);
      if (!target) return prev;
      pushUndoSnapshot(prev, `Edited Block Title: ${newTitle}`);
      return {
        ...prev,
        todayBlockLog: entries.map((e) =>
          e.id === entryId ? { ...e, title: newTitle } : e
        ),
      };
    });
  };

  const handleDeleteLogEntry = (entryId: string) => {
    setState((prev) => {
      const entries = prev.todayBlockLog || [];
      const target = entries.find((e) => e.id === entryId);
      if (!target) return prev;

      let updatedBaseline = [...prev.baselineBlocks];
      let updatedDiscretionary = prev.discretionaryBlocksCompletedToday;
      let updatedProjects = [...prev.projectQueue];
      let updatedTracks = [...prev.roadmapTracks];
      let updatedRecharge = { ...prev.recharge };
      let updatedPipelineDays = [...prev.pipelineDays];

      const baselineCat = logCategoryToBaselineCategory(target.category);
      if (baselineCat) {
        const matchingBlock =
          updatedBaseline.find(
            (b) => b.id === target.sourceBlockId && b.completed
          ) ||
          updatedBaseline.find(
            (b) => b.category === baselineCat && b.completed
          );
        if (matchingBlock) {
          updatedBaseline = updatedBaseline.map((b) =>
            b.id === matchingBlock.id ? { ...b, completed: false } : b
          );
        } else {
          updatedDiscretionary = Math.max(0, updatedDiscretionary - 1);
        }
      } else if (target.category === 'PROJECT_FOCUS_1') {
        updatedDiscretionary = Math.max(0, updatedDiscretionary - 1);
        updatedProjects = updatedProjects.map((p) =>
          p.slot === 1
            ? { ...p, completedBlocks: Math.max(0, p.completedBlocks - 1) }
            : p
        );
      } else if (target.category === 'FLOW_EXTENSION') {
        const nextExtCount = Math.max(
          0,
          updatedRecharge.flowExtensionBlocksLoggedToday - 1
        );
        const deducted =
          nextExtCount >= 3 ? 2 : nextExtCount >= 2 ? 1 : 0;
        updatedRecharge = {
          ...updatedRecharge,
          flowExtensionBlocksLoggedToday: nextExtCount,
        };
        updatedPipelineDays = updatedPipelineDays.map((d, idx) =>
          idx === 1 ? { ...d, deductedBlocksFromExtension: deducted } : d
        );
      } else if (target.category === 'EVENING_RECHARGE' && target.stickyKey) {
        const slot = updatedRecharge.stickySlots[target.stickyKey];
        if (slot) {
          const nextStarts = Math.max(0, slot.fiveMinStarts - 1);
          updatedRecharge = {
            ...updatedRecharge,
            stickySlots: {
              ...updatedRecharge.stickySlots,
              [target.stickyKey]: {
                ...slot,
                fiveMinStarts: nextStarts,
                startsLogged: nextStarts,
              },
            },
          };
        }
      }

      if (target.roadmapTrack) {
        updatedTracks = debitRoadmapTrack(
          updatedTracks,
          target.roadmapTrack,
          target.stroke,
          target.rungNumber || (target.stroke === 'OUTPUT' ? 3 : 1)
        );
      }

      pushUndoSnapshot(
        prev,
        `Deleted Log Entry: ${target.title} (${target.durationMinutes}m)`
      );

      return {
        ...prev,
        todayBlockLog: entries.filter((e) => e.id !== entryId),
        baselineBlocks: updatedBaseline,
        discretionaryBlocksCompletedToday: updatedDiscretionary,
        projectQueue: updatedProjects,
        roadmapTracks: updatedTracks,
        recharge: updatedRecharge,
        pipelineDays: updatedPipelineDays,
      };
    });
  };

  const handleAddManualBlock = (
    category: TodayBlockLogCategory,
    title: string,
    durationMinutes: number
  ) => {
    setState((prev) => {
      let updatedBaseline = [...prev.baselineBlocks];
      let updatedDiscretionary = prev.discretionaryBlocksCompletedToday;
      let updatedProjects = [...prev.projectQueue];
      let updatedTracks = [...prev.roadmapTracks];
      let updatedRecharge = { ...prev.recharge };
      let updatedPipelineDays = [...prev.pipelineDays];

      let sourceBlockId: string | undefined;
      let trackId: TrackId = 'science';
      let stroke: 'INPUT' | 'OUTPUT' = 'INPUT';
      let rungNumber: 1 | 2 | 3 | 4 = 1;

      const baselineCat = logCategoryToBaselineCategory(category);
      if (baselineCat) {
        const candidate = updatedBaseline.find(
          (b) => b.category === baselineCat && !b.completed
        );
        if (candidate) {
          updatedBaseline = updatedBaseline.map((b) =>
            b.id === candidate.id
              ? { ...b, completed: true, bankedViaEarlyClearance: false }
              : b
          );
          sourceBlockId = candidate.id;
          trackId = candidate.trackId;
        } else {
          updatedDiscretionary += 1;
          trackId = baselineCat === 'SYNTHESIS' ? 'writing' : 'science';
        }
        stroke = baselineCat === 'SYNTHESIS' ? 'OUTPUT' : 'INPUT';
        rungNumber = baselineCat === 'SYNTHESIS' ? 2 : 1;
        updatedTracks = creditRoadmapTrack(
          updatedTracks,
          trackId,
          stroke,
          rungNumber
        );
      } else if (category === 'PROJECT_FOCUS_1') {
        updatedDiscretionary += 1;
        const primary = updatedProjects[0];
        if (primary) {
          updatedProjects = updatedProjects.map((p) =>
            p.slot === 1
              ? {
                  ...p,
                  completedBlocks: Math.min(
                    p.totalBlocks,
                    p.completedBlocks + 1
                  ),
                }
              : p
          );
          sourceBlockId = primary.id;
          trackId = primary.trackId;
        } else {
          trackId = 'writing';
        }
        stroke = 'OUTPUT';
        rungNumber = 3;
        updatedTracks = creditRoadmapTrack(
          updatedTracks,
          trackId,
          stroke,
          rungNumber
        );
      } else if (category === 'FLOW_EXTENSION') {
        const nextExt = updatedRecharge.flowExtensionBlocksLoggedToday + 1;
        const deducted = nextExt >= 3 ? 2 : nextExt >= 2 ? 1 : 0;
        updatedRecharge = {
          ...updatedRecharge,
          flowExtensionBlocksLoggedToday: nextExt,
        };
        updatedPipelineDays = updatedPipelineDays.map((d, idx) =>
          idx === 1 ? { ...d, deductedBlocksFromExtension: deducted } : d
        );
        trackId = updatedProjects[0]?.trackId || 'writing';
        stroke = 'OUTPUT';
        rungNumber = 3;
        updatedTracks = creditRoadmapTrack(
          updatedTracks,
          trackId,
          stroke,
          rungNumber
        );
      } else {
        trackId = 'writing';
        stroke = 'INPUT';
        rungNumber = 1;
        updatedTracks = creditRoadmapTrack(
          updatedTracks,
          trackId,
          stroke,
          rungNumber
        );
      }

      const newEntry = createTodayLogEntry(prev, {
        category,
        title,
        durationMinutes,
        roadmapTrack: trackId,
        stroke,
        sourceBlockId,
        rungNumber,
      });

      pushUndoSnapshot(
        prev,
        `Block Logged: ${title} (${durationMinutes}m)`
      );

      return {
        ...prev,
        todayBlockLog: [...(prev.todayBlockLog || []), newEntry],
        baselineBlocks: updatedBaseline,
        discretionaryBlocksCompletedToday: updatedDiscretionary,
        projectQueue: updatedProjects,
        roadmapTracks: updatedTracks,
        recharge: updatedRecharge,
        pipelineDays: updatedPipelineDays,
      };
    });
  };

  // One-Tap Backlog Promotion & Completed Ledger Archive on Closed List Focus #1 (or Ambition Drip Slot #2/#3)
  const handleCompleteProjectById = (projectId?: string) => {
    setState((prev) => {
      const targetIndex = projectId
        ? prev.projectQueue.findIndex((p) => p.id === projectId)
        : 0;
      const resolvedIndex = targetIndex >= 0 ? targetIndex : 0;
      const completedItem = prev.projectQueue[resolvedIndex];
      const remaining = prev.projectQueue.filter((_, idx) => idx !== resolvedIndex);

      const logDate = prev.logicalDayKey || getLogicalDayKey();
      const recordedBlocks = completedItem
        ? Math.max(1, completedItem.completedBlocks || completedItem.totalBlocks)
        : 4;

      const newLedgerEntry: CompletedDeliverableEntry | null = completedItem
        ? {
            id: `done_${completedItem.id}_${Date.now()}`,
            title: completedItem.title,
            date: logDate,
            completedDate: logDate,
            completedAt: logDate,
            blockCount: recordedBlocks,
            blocksCompleted: recordedBlocks,
            totalBlocks: completedItem.totalBlocks,
            trackId: completedItem.trackId,
            presetType: completedItem.presetType,
          }
        : null;

      // Build updated ledger FIRST so items gated on completedItem.title unlock immediately
      const updatedLedger = newLedgerEntry
        ? [newLedgerEntry, ...(prev.completedDeliverablesLog ?? [])]
        : prev.completedDeliverablesLog ?? [];

      const prevArchive = prev.completedDeliverablesArchive || [];
      const nextArchive = newLedgerEntry
        ? [newLedgerEntry, ...prevArchive]
        : prevArchive;

      const sourceBacklog: OpenListItem[] =
        prev.openList && prev.openList.length > 0
          ? prev.openList
          : prev.openListBacklog && prev.openListBacklog.length > 0
          ? prev.openListBacklog
          : prev.projectBacklog;

      const unlockedIndex = sourceBacklog.findIndex((item) =>
        isOpenListItemUnlocked(item, updatedLedger)
      );
      const nextFromBacklog =
        unlockedIndex >= 0 ? sourceBacklog[unlockedIndex] : undefined;
      const restBacklog =
        unlockedIndex >= 0
          ? sourceBacklog.filter((_, idx) => idx !== unlockedIndex)
          : sourceBacklog;

      const newQueue = remaining.map((item, index) => ({
        ...item,
        slot: (index + 1) as 1 | 2 | 3,
        nextStepNote:
          index === 0 && !isProjectSovereignDrip(item)
            ? 'Promoted to Active Focus #1 — discretionary blocks serialized here.'
            : item.nextStepNote,
      }));

      if (nextFromBacklog && newQueue.length < 3) {
        const resolvedTotal =
          nextFromBacklog.totalBlocks ?? nextFromBacklog.blocksTotal ?? 4;
        newQueue.push({
          id: nextFromBacklog.id,
          slot: (newQueue.length + 1) as 1 | 2 | 3,
          title: nextFromBacklog.title,
          presetType: nextFromBacklog.presetType || 'SLIDES_4',
          completedBlocks: nextFromBacklog.completedBlocks || 0,
          totalBlocks: resolvedTotal,
          trackId: nextFromBacklog.trackId || 'science',
          subTrack: nextFromBacklog.subTrack,
          startupStep:
            nextFromBacklog.startupStep ||
            'Open workspace and complete first 5m startup step.',
          blockSubSteps: nextFromBacklog.blockSubSteps,
          launchUrl: nextFromBacklog.launchUrl,
          autoLaunchUrl: nextFromBacklog.autoLaunchUrl,
          isAmbitionDrip: nextFromBacklog.isAmbitionDrip,
          isSovereignDrip: nextFromBacklog.isSovereignDrip,
          category: nextFromBacklog.category,
          cognitiveDemand: nextFromBacklog.cognitiveDemand,
          nextStepNote:
            nextFromBacklog.notes ||
            nextFromBacklog.nextStepNote ||
            (newQueue.length === 0
              ? 'Promoted to Active Focus #1.'
              : 'Promoted from Open List into Slot #3.'),
        });
      }

      const completedSubTrack: MajorSubTrackId | undefined = completedItem
        ? completedItem.subTrack ||
          (isProjectAmbitionDripEligible(completedItem)
            ? '1B_INDEPENDENT'
            : '1A_INSTITUTIONAL')
        : undefined;

      const updatedTracks = completedItem
        ? creditRoadmapTrack(
            prev.roadmapTracks,
            completedItem.trackId,
            'OUTPUT',
            4,
            1,
            completedSubTrack
          )
        : prev.roadmapTracks;

      pushUndoSnapshot(
        prev,
        `Completed Deliverable: ${completedItem?.title || 'Item'}`
      );

      return {
        ...prev,
        projectQueue: newQueue,
        openList: restBacklog,
        projectBacklog: restBacklog,
        openListBacklog: restBacklog,
        completedDeliverablesLog: updatedLedger,
        completedDeliverablesArchive: nextArchive,
        roadmapTracks: updatedTracks,
      };
    });
    showNotice(
      'Archived Deliverable to Completed Ledger, credited Roadmap Output, and promoted highest-priority unlocked Open List item.'
    );
  };

  const handleCompleteProjectItem1 = () => {
    handleCompleteProjectById();
  };

  const handleAddProjectToQueue = (
    title: string,
    presetType: ProjectPresetType,
    totalBlocks: number,
    trackId: TrackId,
    startupStep: string,
    extra?: { blockSubSteps?: string[]; blockedByTitle?: string }
  ) => {
    setState((prev) => {
      if (prev.projectQueue.length >= 3 || extra?.blockedByTitle) {
        const backlogItem: OpenListItem = {
          id: `proj_${Date.now()}`,
          title,
          presetType,
          completedBlocks: 0,
          totalBlocks,
          blocksTotal: totalBlocks,
          trackId,
          startupStep,
          blockSubSteps: extra?.blockSubSteps,
          blockedByTitle: extra?.blockedByTitle,
          nextStepNote: extra?.blockedByTitle
            ? `Locked until "${extra.blockedByTitle}" is 100%.`
            : 'Queued in Open List Backlog.',
        };
        const currentBacklog =
          prev.openList ?? prev.openListBacklog ?? prev.projectBacklog ?? [];
        const nextBacklog = [...currentBacklog, backlogItem];
        return {
          ...prev,
          openList: nextBacklog,
          projectBacklog: nextBacklog,
          openListBacklog: nextBacklog,
        };
      }
      const newSlot = (prev.projectQueue.length + 1) as 1 | 2 | 3;
      const isDripDefault =
        newSlot >= 2 &&
        (trackId === 'writing' ||
          trackId === 'coding' ||
          trackId === 'music' ||
          trackId === 'culture');
      return {
        ...prev,
        projectQueue: [
          ...prev.projectQueue,
          {
            id: `proj_${Date.now()}`,
            slot: newSlot,
            title,
            presetType,
            completedBlocks: 0,
            totalBlocks,
            trackId,
            subTrack: trackId === 'science' ? '1A_INSTITUTIONAL' : undefined,
            isAmbitionDrip: isDripDefault,
            isSovereignDrip: isDripDefault,
            startupStep,
            blockSubSteps: extra?.blockSubSteps,
            nextStepNote:
              newSlot === 1
                ? 'Active primary target.'
                : isDripDefault
                ? 'Ambition Drip Slot (1b/day capstone).'
                : 'Serialized behind Item #1.',
          },
        ],
      };
    });
    showNotice(`Added "${title}" to Active Project Queue.`);
  };

  const handlePromoteDeliverableWithSurge = (
    title: string,
    presetType: ProjectPresetType,
    totalBlocks: number,
    trackId: TrackId,
    startupStep: string
  ) => {
    setState((prev) => {
      const newItem = {
        id: `proj_${Date.now()}`,
        slot: 1 as 1 | 2 | 3,
        title,
        presetType,
        completedBlocks: 0,
        totalBlocks,
        trackId,
        startupStep,
        nextStepNote: 'Promoted via Option A (Hard Deadline) with Surge blocks.',
      };

      const combined = [newItem, ...prev.projectQueue];
      const nextQueue = combined.slice(0, 3).map((item, idx) => ({
        ...item,
        slot: (idx + 1) as 1 | 2 | 3,
      }));
      const displaced: OpenListItem[] = combined
        .slice(3)
        .map(({ slot: _slot, ...rest }) => ({
          ...rest,
          blocksTotal: rest.totalBlocks,
        }));
      const canSurge = prev.surgeConsecutiveDays < 2 || prev.loadMode === 'SURGE';
      const nextMode: LoadMode = canSurge ? 'SURGE' : prev.loadMode;
      const nextCeiling = canSurge ? 14 : prev.customModeBlockAdjustment;
      const currentBacklog =
        prev.openList ?? prev.openListBacklog ?? prev.projectBacklog ?? [];
      const nextBacklog = [...displaced, ...currentBacklog];

      return {
        ...prev,
        loadMode: nextMode,
        cruisePlus: false,
        customModeBlockAdjustment: nextCeiling,
        projectQueue: nextQueue,
        openList: nextBacklog,
        projectBacklog: nextBacklog,
        openListBacklog: nextBacklog,
        pipelineDays: prev.pipelineDays.map((d) =>
          d.isToday
            ? {
                ...d,
                loadMode: nextMode,
                cruisePlus: false,
                baseTargetBlocks: nextCeiling,
              }
            : d
        ),
      };
    });
    showNotice(
      `Option A applied: Promoted "${title}" to Closed List #1 and scheduled Surge blocks.`
    );
  };

  const handleDemoteDeliverableToBacklog = (
    title: string,
    presetType: ProjectPresetType,
    totalBlocks: number,
    trackId: TrackId,
    startupStep: string,
    blockedByTitle?: string
  ) => {
    setState((prev) => {
      const currentBacklog =
        prev.openList ?? prev.openListBacklog ?? prev.projectBacklog ?? [];
      const newBacklog: OpenListItem[] = [
        ...currentBacklog,
        {
          id: `proj_${Date.now()}`,
          title,
          presetType,
          completedBlocks: 0,
          totalBlocks,
          blocksTotal: totalBlocks,
          trackId,
          startupStep,
          blockedByTitle,
          notes: blockedByTitle
            ? `Locked until "${blockedByTitle}" is 100%.`
            : 'Queued in Open List backlog to preserve Cruise Mode.',
          nextStepNote: blockedByTitle
            ? `Locked until "${blockedByTitle}" is 100%.`
            : 'Demoted to Open List backlog to preserve Cruise Mode.',
        },
      ];
      return {
        ...prev,
        openList: newBacklog,
        projectBacklog: newBacklog,
        openListBacklog: newBacklog,
      };
    });
    showNotice(
      blockedByTitle
        ? `Added "${title}" to Open List with prerequisite lock ("${blockedByTitle}").`
        : `Option B applied: Added "${title}" to Open List Backlog (Cruise Mode & Closed List preserved).`
    );
  };

  const handleRecalibrateStepDownTier = () => {
    setState((prev) => {
      if (prev.loadMode === 'SURGE') {
        return {
          ...prev,
          loadMode: 'CRUISE',
          cruisePlus: false,
          customModeBlockAdjustment: 12,
          pipelineDays: prev.pipelineDays.map((d) =>
            d.isToday
              ? { ...d, loadMode: 'CRUISE', cruisePlus: false, baseTargetBlocks: 12 }
              : d
          ),
        };
      }
      if (prev.loadMode === 'CRUISE') {
        return {
          ...prev,
          loadMode: 'TAPER',
          cruisePlus: false,
          customModeBlockAdjustment: 8,
          pipelineDays: prev.pipelineDays.map((d) =>
            d.isToday
              ? { ...d, loadMode: 'TAPER', cruisePlus: false, baseTargetBlocks: 8 }
              : d
          ),
        };
      }
      // Already in TAPER -> step down to 7-block Core Floor + Early Clearance banking
      return {
        ...prev,
        loadMode: 'TAPER',
        cruisePlus: false,
        customModeBlockAdjustment: 7,
        earlyClearanceEnabled: true,
        baselineBlocks: prev.baselineBlocks.map((b) => {
          const isFc =
            b.category === 'FLASHCARDS_ANATOMY' || b.category === 'FLASHCARDS_COMP';
          if (!isFc || b.completed) return b;
          return { ...b, bankedViaEarlyClearance: true };
        }),
      };
    });
    showNotice('Recalibrated Remainder of Day (Option A): Stepped down one Load Mode tier.');
  };

  const handleRecalibrateReSequenceNow = () => {
    setState((prev) => {
      const steps = generateSequentialChecklist(prev);
      const nextWorkStep = steps.find(
        (s) => s.kind === 'WORK_BLOCK' && !s.completed && !s.banked
      );
      const activeDurations = getActiveBlockDurationsSeconds(prev);
      return {
        ...prev,
        timer: {
          ...prev.timer,
          mode: 'WORK_20M',
          workStage: 'IGNITION_5M',
          secondsLeft: activeDurations.startupSeconds,
          targetEndTimeMs: null,
          isRunning: false,
          chainedBlocksCount: 0,
          startupShrinkLevel: 1,
          activeBlockSourceId:
            nextWorkStep?.sourceId || prev.timer.activeBlockSourceId,
          activeTaskTitle: nextWorkStep?.title || prev.timer.activeTaskTitle,
          activeTaskType: nextWorkStep?.taskType || prev.timer.activeTaskType,
          activeStartupPrompt:
            nextWorkStep?.startupStep || prev.timer.activeStartupPrompt,
        },
      };
    });
    showNotice(
      'Recalibrated Remainder of Day (Option B): Re-sequenced remaining blocks starting now.'
    );
  };

  const handleLaunchBreakStepInTimer = (
    breakMode: 'BREAK_L1' | 'BREAK_L2' | 'BREAK_L3'
  ) => {
    const now = Date.now();
    setState((prev) => {
      const durationSec =
        breakMode === 'BREAK_L1'
          ? prev.timer.l1DurationMinutes * 60
          : breakMode === 'BREAK_L2'
          ? prev.timer.l2DurationMinutes * 60
          : prev.timer.l3DurationMinutes * 60;
      return {
        ...prev,
        timer: {
          ...prev.timer,
          mode: breakMode,
          secondsLeft: durationSec,
          targetEndTimeMs: now + durationSec * 1000,
          isRunning: true,
          chainedBlocksCount: breakMode === 'BREAK_L1' ? 2 : 0,
        },
      };
    });
    setActiveTab('TIMER');
    showNotice(`Launched ${breakMode} timer from Sequential Checklist.`);
  };

  // ===========================================================================
  // 5 "STRUCTURED ELASTICITY" SYSTEMS — HANDLERS
  // ===========================================================================

  // 1. Energy-State Bandwidth Router (Sharp | Steady | Low / Foggy) & Cognitive Demand Tags
  const handleSetEnergyBandwidth = (bandwidth: EnergyBandwidthState) => {
    setState((prev) => {
      const candidate: SymmetryState = {
        ...prev,
        energyBandwidth: bandwidth,
      };
      const steps = generateSequentialChecklist(candidate);
      const nextWorkStep = steps.find(
        (s) => s.kind === 'WORK_BLOCK' && !s.completed && !s.banked
      );
      if (!prev.timer.isRunning && nextWorkStep) {
        return {
          ...candidate,
          timer: {
            ...candidate.timer,
            activeBlockSourceId:
              nextWorkStep.sourceId || candidate.timer.activeBlockSourceId,
            activeTaskTitle: nextWorkStep.title,
            activeTaskType: nextWorkStep.taskType || candidate.timer.activeTaskType,
            activeStartupPrompt: nextWorkStep.startupStep,
            startupShrinkLevel: 1,
          },
        };
      }
      return candidate;
    });
    const labelMap: Record<EnergyBandwidthState, string> = {
      SHARP:
        'Bandwidth → Sharp: Prioritizing DEEP_SYNTHESIS (Closed List Focus #1 & Half-Chapter synthesis) early in shift.',
      STEADY:
        'Bandwidth → Steady: Interleaving MECHANICAL_RECALL sprints and DEEP_SYNTHESIS normally.',
      LOW_FOGGY:
        'Bandwidth → Low / Foggy: Routing next block to MECHANICAL_RECALL or LIGHT_ADMIN (with 15m Stress/Fatigue Reset option).',
    };
    showNotice(labelMap[bandwidth]);
  };

  const handleCycleCognitiveDemand = (
    targetKind: 'BASELINE' | 'PROJECT',
    targetId: string
  ) => {
    setState((prev) => {
      if (targetKind === 'BASELINE') {
        return {
          ...prev,
          baselineBlocks: prev.baselineBlocks.map((b) => {
            if (b.id !== targetId) return b;
            const current = getBaselineCognitiveDemand(b);
            return {
              ...b,
              cognitiveDemand: cycleCognitiveDemandTag(current),
            };
          }),
        };
      }
      return {
        ...prev,
        projectQueue: prev.projectQueue.map((p) => {
          if (p.id !== targetId) return p;
          const current = getProjectCognitiveDemand(p);
          return {
            ...p,
            cognitiveDemand: cycleCognitiveDemandTag(current),
          };
        }),
      };
    });
  };

  // 2. Elastic Block Accordion (0.5x Half-Block 10m | 1.0x Standard 20m | 2.0x Double-Block 40m)
  const handleSelectElasticMultiplier = (multiplier: ElasticBlockMultiplier) => {
    const now = Date.now();
    setState((prev) => {
      const candidate: SymmetryState = {
        ...prev,
        timer: {
          ...prev.timer,
          elasticMultiplier: multiplier,
        },
      };
      const durations = getActiveBlockDurationsSeconds(candidate);
      if (prev.timer.mode !== 'WORK_20M') {
        return candidate;
      }
      const nextSec =
        prev.timer.workStage === 'IGNITION_5M'
          ? durations.startupSeconds
          : durations.momentumSeconds;
      return {
        ...candidate,
        timer: {
          ...candidate.timer,
          secondsLeft: nextSec,
          targetEndTimeMs: prev.timer.isRunning
            ? now + nextSec * 1000
            : null,
        },
      };
    });
    if (multiplier === 0.5) {
      showNotice(
        'Elastic Block Accordion → 0.5x Micro-Block (10m = 3m Startup + 7m Momentum • Logs 0.5b).'
      );
    } else if (multiplier === 2.0) {
      showNotice(
        'Elastic Block Accordion → 2.0x Chained Flow Block (40m = 5m Startup + 35m Momentum • Logs 2.0b + enforces L2 Buffer).'
      );
    } else {
      showNotice(
        'Elastic Block Accordion → 1.0x Standard Block (5m Startup + 15m Momentum • Logs 1.0b).'
      );
    }
  };

  // 3. "Shrink Startup Step" (3-Tier Friction De-Escalator on Timer HUD: Level 1 -> Level 2 -> Level 3)
  const handleShrinkStartupStep = (targetLevel?: StartupShrinkLevel) => {
    setState((prev) => {
      const currentLevel = prev.timer.startupShrinkLevel ?? 1;
      const nextLevel: StartupShrinkLevel =
        targetLevel ??
        (currentLevel === 1 ? 2 : currentLevel === 2 ? 3 : 1);
      return {
        ...prev,
        timer: {
          ...prev.timer,
          startupShrinkLevel: nextLevel,
        },
      };
    });
  };

  // 4. One-Tap "Life Happened" Shock Absorber (Compress Remainder of Day)
  const handleApplyShockAbsorber = (
    mode: ShockAbsorberMode,
    targetCeiling?: number
  ) => {
    setState((prev) => {
      const completedBaselineCount = prev.baselineBlocks.reduce(
        (acc, b) => acc + (b.completed ? 1 : b.partialCredit || 0),
        0
      );
      const totalAlreadyDone =
        completedBaselineCount + prev.discretionaryBlocksCompletedToday;

      const rawTarget =
        targetCeiling ??
        (mode === 'FULL_SHIFT' ? 12 : mode === 'HALF_SHIFT' ? 6 : 4);
      const realisticCeiling = Math.max(
        Math.ceil(totalAlreadyDone),
        rawTarget
      );

      // How many discretionary Focus #1 project blocks were originally planned vs now fit
      const prevDiscretionaryPlanned = Math.max(
        0,
        prev.customModeBlockAdjustment - prev.baselineBlocks.length
      );
      const newDiscretionaryPlanned = Math.max(
        0,
        realisticCeiling - prev.baselineBlocks.length
      );
      const deferredProjectBlocks = Math.max(
        0,
        prevDiscretionaryPlanned - newDiscretionaryPlanned
      );

      // Prioritize highest-yield Baseline Floor blocks first (1 block per core category, then remaining)
      // and bank excess uncompleted baseline blocks above realisticCeiling so [0m work left] is achievable with zero overdue warnings
      const remainingBudgetForBaseline = Math.max(
        0,
        Math.round(realisticCeiling - totalAlreadyDone)
      );

      // High-yield priority order for uncompleted baseline slots
      const uncompletedBlocks = prev.baselineBlocks.filter((b) => !b.completed);
      const priorityOrderedIds: string[] = [];
      const seenCategories = new Set<string>();
      for (const b of uncompletedBlocks) {
        if (!seenCategories.has(b.category)) {
          seenCategories.add(b.category);
          priorityOrderedIds.push(b.id);
        }
      }
      for (const b of uncompletedBlocks) {
        if (!priorityOrderedIds.includes(b.id)) {
          priorityOrderedIds.push(b.id);
        }
      }
      const keepActiveBaselineIds = new Set(
        priorityOrderedIds.slice(0, remainingBudgetForBaseline)
      );

      const updatedBaseline = prev.baselineBlocks.map((b) => {
        if (b.completed) return { ...b, bankedViaEarlyClearance: false };
        if (mode === 'FULL_SHIFT') {
          return { ...b, bankedViaEarlyClearance: false };
        }
        return {
          ...b,
          bankedViaEarlyClearance: !keepActiveBaselineIds.has(b.id),
        };
      });

      const primaryProjTitle =
        prev.projectQueue[0]?.title || 'Focus #1 Project Blocks';

      const updatedPipelineDays: PipelineDay[] = prev.pipelineDays.map((d, idx) => {
        if (idx === 0) {
          return {
            ...d,
            loadMode: (mode === 'FULL_SHIFT' ? 'CRUISE' : 'TAPER') as LoadMode,
            cruisePlus: false,
            baseTargetBlocks: realisticCeiling,
          };
        }
        if (idx === 1 && deferredProjectBlocks > 0 && mode !== 'FULL_SHIFT') {
          const shiftNote = `+${deferredProjectBlocks}b shifted from today (${primaryProjTitle})`;
          const cleanPrevDeliverable = (
            d.primaryDeliverable ||
            d.projectBlocksSummary ||
            ''
          ).replace(/\s*\(\+\d+b shifted from today[^)]*\)/g, '');
          return {
            ...d,
            baseTargetBlocks: Math.min(
              14,
              Math.max(
                d.baseTargetBlocks,
                d.baseTargetBlocks + Math.min(2, deferredProjectBlocks)
              )
            ),
            primaryDeliverable: `${cleanPrevDeliverable} (${shiftNote})`.trim(),
            projectBlocksSummary: `${cleanPrevDeliverable} (${shiftNote})`.trim(),
          };
        }
        return d;
      });

      const nextCandidate: SymmetryState = {
        ...prev,
        shockAbsorberMode: mode,
        shockAbsorberDeferredBlocks: deferredProjectBlocks,
        loadMode: mode === 'FULL_SHIFT' ? 'CRUISE' : 'TAPER',
        cruisePlus: false,
        customModeBlockAdjustment: realisticCeiling,
        earlyClearanceEnabled: mode !== 'FULL_SHIFT',
        baselineBlocks: updatedBaseline,
        pipelineDays: updatedPipelineDays,
      };

      const nextSteps = generateSequentialChecklist(nextCandidate);
      const nextWork = nextSteps.find(
        (s) => s.kind === 'WORK_BLOCK' && !s.completed && !s.banked
      );

      pushUndoSnapshot(
        prev,
        `Shock Absorber Applied (${mode} → ${realisticCeiling}b ceiling)`
      );

      return {
        ...nextCandidate,
        timer: nextWork
          ? {
              ...nextCandidate.timer,
              activeBlockSourceId:
                nextWork.sourceId || nextCandidate.timer.activeBlockSourceId,
              activeTaskTitle: nextWork.title,
              activeTaskType:
                nextWork.taskType || nextCandidate.timer.activeTaskType,
              activeStartupPrompt: nextWork.startupStep,
              startupShrinkLevel: 1,
            }
          : nextCandidate.timer,
      };
    });

    const modeSummary =
      mode === 'FULL_SHIFT'
        ? `Restored Full Shift (${targetCeiling ?? 12} blocks).`
        : mode === 'HALF_SHIFT'
        ? `Shock Absorber: Re-capped today to Half Shift (${targetCeiling ?? 6} blocks), prioritized highest-yield Floor blocks, and shifted deferred Focus #1 blocks to tomorrow.`
        : `Shock Absorber: Re-capped today to Minimum Viable Floor (${targetCeiling ?? 4} blocks), banked remaining slots cleanly, and shifted Focus #1 project blocks to tomorrow.`;
    showNotice(modeSummary);
  };

  // 5. "Bounded Curiosity" Sandbox Block & Flexible Custom Rules Toggle
  const handleSetActiveDualSlotNumber = (slot: 1 | 2) => {
    setState((prev) => {
      const targetProj =
        prev.projectQueue.find((p) => p.slot === slot) || prev.projectQueue[0];
      const nextState: SymmetryState = {
        ...prev,
        activeDualSlotNumber: slot,
        flexibilityTuning: {
          ...(prev.flexibilityTuning ?? DEFAULT_FLEXIBILITY_TUNING),
          activeFocusSlot: slot,
          activeDualSlotNumber: slot,
        },
      };
      if (!prev.timer.isRunning && targetProj) {
        return {
          ...nextState,
          timer: {
            ...nextState.timer,
            activeBlockSourceId: targetProj.id,
            activeTaskTitle: `${targetProj.title} — Active Dual-Slot #${slot}`,
            activeTaskType: 'PROJECT',
            activeStartupPrompt: targetProj.startupStep,
            startupShrinkLevel: 1,
          },
        };
      }
      return nextState;
    });
    showNotice(
      `Dual-Slot Closed List Lock: Switched active discretionary focus to Slot #${slot}.`
    );
  };

  const handleLaunchBoundedCuriosityBlock = () => {
    const now = Date.now();
    setState((prev) => {
      const activeDurations = getActiveBlockDurationsSeconds(prev);
      return {
        ...prev,
        timer: {
          ...prev.timer,
          mode: 'WORK_20M',
          workStage: 'IGNITION_5M',
          secondsLeft: activeDurations.startupSeconds,
          targetEndTimeMs: now + activeDurations.startupSeconds * 1000,
          isRunning: true,
          activeBlockSourceId: 'sandbox_curiosity',
          activeTaskTitle:
            'Bounded Curiosity Sandbox — Time-Boxed Exploratory Rabbit-Hole',
          activeTaskType: 'PROJECT',
          activeStartupPrompt:
            'Write 1 specific question or hypothesis to explore for 15m, then return to main pipeline when chime rings',
          startupShrinkLevel: 1,
        },
      };
    });
    setActiveTab('TIMER');
    showNotice(
      'Launched Bounded Curiosity Sandbox Block (counts toward daily ceiling & auto-returns to pipeline on completion).'
    );
  };

  const handleUpdateFlexibilityTuning = (
    patch: Partial<StructureFlexibilityConfig>
  ) => {
    setState((prev) => {
      const nextTuning: StructureFlexibilityConfig = {
        ...(prev.flexibilityTuning ?? DEFAULT_FLEXIBILITY_TUNING),
        ...patch,
      };
      const nextCandidate: SymmetryState = {
        ...prev,
        flexibilityTuning: nextTuning,
        activeDualSlotNumber:
          nextTuning.closedListLockMode === 'STRICT_SERIALIZED'
            ? 1
            : prev.activeDualSlotNumber ?? 1,
      };
      const durations = getActiveBlockDurationsSeconds(nextCandidate);
      const shouldSyncIdleTimer =
        !prev.timer.isRunning && prev.timer.mode === 'WORK_20M';
      return {
        ...nextCandidate,
        timer: shouldSyncIdleTimer
          ? {
              ...nextCandidate.timer,
              secondsLeft:
                prev.timer.workStage === 'IGNITION_5M'
                  ? durations.startupSeconds
                  : durations.momentumSeconds,
            }
          : nextCandidate.timer,
      };
    });
    showNotice('Updated Structure vs. Flexibility Tuning configuration.');
  };

  const handleApplyStatePatch = (
    patch: Partial<SymmetryState>,
    summary: string
  ) => {
    setState((prev) => ({
      ...prev,
      ...patch,
      timer: patch.timer ? { ...prev.timer, ...patch.timer } : prev.timer,
      recharge: patch.recharge
        ? { ...prev.recharge, ...patch.recharge }
        : prev.recharge,
    }));
    showNotice(`AI Planning Assistant applied statePatch: ${summary}`);
  };

  // Interactive 7-Day Master Pipeline Day updater
  const handleUpdatePipelineDay = (dayIndex: number, patch: Partial<PipelineDay>) => {
    setState((prev) => {
      const updatedDays = prev.pipelineDays.map((d) =>
        d.dayIndex === dayIndex ? { ...d, ...patch } : d
      );
      const todayPatch = dayIndex === 1 ? patch : {};
      let maxConsecutiveSurge = prev.surgeConsecutiveDays;
      if (patch.loadMode) {
        let streak = 0;
        let maxStreak = 0;
        for (const d of updatedDays) {
          if (d.loadMode === 'SURGE') {
            streak += 1;
            if (streak > maxStreak) maxStreak = streak;
          } else {
            streak = 0;
          }
        }
        maxConsecutiveSurge = Math.min(2, maxStreak);
      }
      return {
        ...prev,
        loadMode: todayPatch.loadMode ?? prev.loadMode,
        customModeBlockAdjustment:
          todayPatch.baseTargetBlocks ?? prev.customModeBlockAdjustment,
        fixedEvent: todayPatch.fixedEvent ?? prev.fixedEvent,
        surgeConsecutiveDays: maxConsecutiveSurge,
        pipelineDays: updatedDays,
      };
    });
  };

  // Toggle between On-Duty and 0m work left simulation
  const handleToggleZeroWorkSimulation = () => {
    setState((prev) => {
      const currentMetrics = computeShiftMetrics(prev);
      if (currentMetrics.isZeroWorkLeft) {
        // Restore to 3 completed baseline blocks (3h 00m work left)
        return {
          ...prev,
          discretionaryBlocksCompletedToday: 0,
          earlyClearanceEnabled: false,
          baselineBlocks: prev.baselineBlocks.map((b, idx) => ({
            ...b,
            completed: idx === 0 || idx === 1 || idx === 4,
            bankedViaEarlyClearance: false,
          })),
        };
      } else {
        // Complete/bank remaining blocks so [0m work left] triggers End-of-Shift Lock
        const baselineTotal = prev.baselineBlocks.length;
        const neededDiscretionary = Math.max(
          0,
          prev.customModeBlockAdjustment - baselineTotal
        );
        return {
          ...prev,
          discretionaryBlocksCompletedToday: neededDiscretionary,
          baselineBlocks: prev.baselineBlocks.map((b) => ({
            ...b,
            completed: true,
          })),
        };
      }
    });
  };

  const handleToggleTimerRun = () => {
    const now = Date.now();
    setState((prev) => {
      const nextRunning = !prev.timer.isRunning;
      const currentSecondsLeft =
        prev.timer.isRunning && prev.timer.targetEndTimeMs
          ? Math.max(0, Math.ceil((prev.timer.targetEndTimeMs - now) / 1000))
          : prev.timer.secondsLeft;
      return {
        ...prev,
        timer: {
          ...prev.timer,
          isRunning: nextRunning,
          secondsLeft: currentSecondsLeft,
          targetEndTimeMs: nextRunning
            ? now + currentSecondsLeft * 1000
            : null,
        },
      };
    });
  };

  // Fast-forward current timer stage (Startup -> Momentum -> Break Router / Stress Reset -> 5m Flashcards)
  const handleFastForwardTimerStage = () => {
    const now = Date.now();
    setState((prev) => {
      const activeDurations = getActiveBlockDurationsSeconds(prev);
      if (prev.timer.mode === 'WORK_20M' && prev.timer.workStage === 'IGNITION_5M') {
        dispatchLockScreenAlert(
          'ROLLOVER_5M_TO_15M',
          `${activeDurations.startupMinutes}m Startup Step Complete → ${activeDurations.momentumMinutes}m Momentum`,
          `Auto-rolling into ${activeDurations.momentumMinutes}m Momentum (MOMENTUM_15M) for "${prev.timer.activeTaskTitle}".`
        );
        showNotice(
          `${activeDurations.startupMinutes}m Startup Step complete → Auto-rolled into ${activeDurations.momentumMinutes}m Momentum (MOMENTUM_15M).`
        );
        return {
          ...prev,
          timer: {
            ...prev.timer,
            workStage: 'MOMENTUM_15M',
            secondsLeft: activeDurations.momentumSeconds,
            targetEndTimeMs: now + activeDurations.momentumSeconds * 1000,
            isRunning: true,
          },
        };
      }
      if (prev.timer.mode === 'WORK_20M' && prev.timer.workStage === 'MOMENTUM_15M') {
        dispatchLockScreenAlert(
          'WORK_BLOCK_COMPLETE',
          `${activeDurations.totalMinutes}m Work Block Complete`,
          `Completed ${activeDurations.totalMinutes}m (${activeDurations.blockCredit}x) block for "${prev.timer.activeTaskTitle}".`
        );
        const next = handleCompleteWorkBlockTransition(prev);
        const nextM = computeShiftMetrics(next);
        if (nextM.isZeroWorkLeft) {
          showNotice('0m work left reached! End-of-Shift Lock engaged.');
          setActiveTab('RECHARGE');
        } else {
          showNotice(
            `${activeDurations.totalMinutes}m (${activeDurations.blockCredit}x) Block complete! Auto-routed to ${
              next.timer.mode === 'BREAK_L3'
                ? 'Level 3 Mid-Day Reset (60m)'
                : next.timer.mode === 'BREAK_L2'
                ? 'Level 2 Buffer (10–15m)'
                : 'Level 1 Micro-Reset (3–5m)'
            }.`
          );
        }
        return next;
      }
      if (prev.timer.mode === 'STRESS_RESET') {
        dispatchLockScreenAlert(
          'STRESS_RESET_COMPLETE',
          'Stress / Fatigue Reset Complete',
          '5m Flashcard recovery block queued.'
        );
        showNotice('15–20m Physical Reset complete → Queued 5m Flashcard recovery block.');
        return {
          ...prev,
          timer: {
            ...prev.timer,
            isRunning: false,
            targetEndTimeMs: null,
            secondsLeft: prev.timer.stressDurationMinutes * 60,
            queuedRecoveryFlashcard5m: true,
            recoveryFlashcardSecondsLeft: 300,
            recoveryFlashcardTargetEndTimeMs: null,
            recoveryFlashcardRunning: false,
          },
        };
      }
      // Break complete -> chime + return to Startup Step
      dispatchLockScreenAlert(
        'BREAK_COMPLETE',
        `Break Complete → Ready for ${activeDurations.startupMinutes}m Startup Step`,
        `Break finished. Ready to start next ${activeDurations.startupMinutes}m Startup Step (IGNITION_5M).`
      );
      showNotice(
        `Break complete → Ready for next ${activeDurations.startupMinutes}m Startup Step (IGNITION_5M).`
      );
      return {
        ...prev,
        midDayResetCompletedToday:
          prev.timer.mode === 'BREAK_L3' ? true : prev.midDayResetCompletedToday,
        timer: {
          ...prev.timer,
          mode: 'WORK_20M',
          workStage: 'IGNITION_5M',
          secondsLeft: activeDurations.startupSeconds,
          targetEndTimeMs: null,
          isRunning: false,
          startupShrinkLevel: 1,
        },
      };
    });
  };

  // External OS-Level Mini HUD Controller (Document PiP 300x135 React Portal + Universal 480x220 Canvas Stream Video PiP)
  const miniHudController = useExternalMiniHudController({
    state,
    onToggleTimerRun: handleToggleTimerRun,
    onFastForwardCurrentStage: handleFastForwardTimerStage,
    onShrinkStartupStep: () => handleShrinkStartupStep(),
    onNotify: showNotice,
  });
  toggleMiniHudRef.current = () => {
    void miniHudController.onToggleMiniHud();
  };

  return (
    <div
      className={`w-full max-w-none min-h-screen flex flex-col justify-between transition-colors duration-500 ${
        isEveningTheme
          ? 'theme-evening text-amber-50'
          : 'theme-on-duty text-slate-100'
      }`}
    >
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
        style={
          layoutMode === 'COMPACT'
            ? { maxWidth: '460px', marginInline: 'auto' }
            : state.uiLayoutMode === 'split'
            ? { maxWidth: '1440px', marginInline: 'auto' }
            : undefined
        }
        className="w-full max-w-none px-3 sm:px-5 py-3 flex flex-col gap-3"
      >
        <HeaderBar
          state={state}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          layoutMode={layoutMode}
          onToggleLayoutMode={handleToggleLayoutMode}
          onOpenTodayLogDrawer={() => setTodayLogDrawerOpen(true)}
          onOpenPipelineDrawer={() => setPipelineDrawerOpen(true)}
          onOpenInsightsModal={() => setInsightsModalOpen(true)}
          onOpenSpotlightTour={() => setSpotlightTourOpen(true)}
          onOpenShortcutsModal={() => setShortcutsModalOpen(true)}
          onUpdateAudioSettings={(patch) => {
            soundEngine.playTactileClick('MODE_TOGGLE');
            setState((prev) => ({
              ...prev,
              audioSettings: {
                ...(prev.audioSettings || DEFAULT_AUDIO_ENGINE_SETTINGS),
                ...patch,
              },
            }));
          }}
          onOpenStateModal={() => {
            setGeminiApiKeyInput(getStoredGeminiApiKey());
            setStateIoText(serializeToStateMarkdown(state));
            setStateModalOpen(true);
          }}
          onOpenOnboardingWizard={() => {
            setIsFirstVisitOnboarding(false);
            setOnboardingWizardOpen(true);
          }}
          onOpenConversationalArchitect={() =>
            setConversationalArchitectOpen(true)
          }
          onToggleAssistantDrawer={() =>
            setAssistantDrawerOpen((prev) => !prev)
          }
          onToggleZeroWorkSimulation={handleToggleZeroWorkSimulation}
          onResetDefault={() => {
            setState((prev) => {
              const updatedBackups = pushStateBackup(
                prev,
                'RESET_DEFAULT',
                `Before Default Reset (${prev.profileName || 'Active Profile'})`
              );
              const resetBase = architectModeUnlocked
                ? DEFAULT_SYMMETRY_STATE
                : buildStateForPreset('BALANCED_CORE');
              return {
                ...resetBase,
                dailyHistory: syncTodayIntoDailyHistory(resetBase),
                stateBackups: updatedBackups,
              };
            });
            showNotice('Reset SymmetryManager to default deterministic state (snapshot saved).');
          }}
          isEveningTheme={isEveningTheme}
          onOpenCommandDock={() => setCommandDockOpen(true)}
          onOpenGeminiBridgeModal={() => {
            setGeminiBridgeInitialTab('EXPORT');
            setGeminiBridgeOpen(true);
          }}
          onOpenGeminiImportTab={() => {
            setGeminiBridgeInitialTab('IMPORT');
            setGeminiBridgeOpen(true);
          }}
          onOneTapSyncFromClipboard={() => {
            void handleOneTapSyncFromClipboard();
          }}
          cinemaFocusMode={cinemaFocusMode}
          onToggleCinemaFocusMode={() =>
            setCinemaFocusMode((prev) => !prev)
          }
          architectModeUnlocked={architectModeUnlocked}
          onUnlockArchitectMode={handleUnlockArchitectMode}
          proModeUnlocked={proModeUnlocked}
          user={user}
          syncStatus={syncStatus}
          isFirebaseConfigured={isFirebaseConfigured}
          onSignInWithGoogle={() => {
            void signInWithGoogle();
          }}
          onSignOutUser={() => {
            void signOutUser();
          }}
          onExportJsonBackup={exportStateJson}
          onImportJsonBackupFile={(file) => {
            void importStateJsonFile(file);
          }}
          onToggleSovereignDripDone={handleToggleSovereignDripDone}
          onToggleGoldenRuleMode={handleToggleGoldenRuleMode}
        />

        {/* Status Toast Notice */}
        {statusNotice && (
          <div className="w-full">
            <div
              id="status-toast-banner"
              className={`px-3.5 py-2 rounded-2xl border backdrop-blur-xl text-xs font-mono flex items-center justify-between ${
                isEveningTheme
                  ? 'bg-amber-950/80 border-amber-500/40 text-amber-200'
                  : 'bg-cyan-950/80 border-cyan-500/40 text-cyan-200'
              }`}
            >
              <span>{statusNotice}</span>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                className="text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Active Tab Viewport */}
        <main className="w-full max-w-none">
          {activeTab === 'PIPELINE' && (
            <Tab1Pipeline
              state={state}
              layoutMode={layoutMode}
              smartIntakeText={smartIntakeText}
              onChangeSmartIntakeText={setSmartIntakeText}
              smartIntakePreview={smartIntakePreview}
              onSetSmartIntakePreview={setSmartIntakePreview}
              onApplySmartIntakePlan={handleApplySmartIntakePlan}
              onOpenStateModal={() => {
                setGeminiApiKeyInput(getStoredGeminiApiKey());
                setStateIoText(serializeToStateMarkdown(state));
                setStateModalOpen(true);
              }}
              onOpenCommandDock={() => setCommandDockOpen(true)}
              cinemaFocusMode={cinemaFocusMode}
              onToggleCinemaFocusMode={() =>
                setCinemaFocusMode((prev) => !prev)
              }
              architectModeUnlocked={architectModeUnlocked}
              onUnlockArchitectMode={handleUnlockArchitectMode}
              apiKeyVersion={apiKeyVersion}
              onSelectLoadMode={handleSelectLoadMode}
              onTogglePreExamTaper={handleTogglePreExamTaper}
              onSetSurgeConsecutiveDays={(days) =>
                setState((prev) => ({ ...prev, surgeConsecutiveDays: days }))
              }
              onSetFixedEvent={(event) =>
                setState((prev) => ({
                  ...prev,
                  fixedEvent: event,
                  pipelineDays: prev.pipelineDays.map((d) =>
                    d.isToday ? { ...d, fixedEvent: event } : d
                  ),
                }))
              }
              onSetSessionDisplayDuration={(mins) =>
                setState((prev) => ({
                  ...prev,
                  timer: { ...prev.timer, sessionDisplayDurationMinutes: mins },
                }))
              }
              onToggleBaselineBlock={handleToggleBaselineBlock}
              onToggleEarlyClearance={handleToggleEarlyClearance}
              onApplySlotEarlyClearance={handleApplySlotEarlyClearance}
              onRestoreSlotEarlyClearance={handleRestoreSlotEarlyClearance}
              onToggleAnkiConnect={handleToggleAnkiConnect}
              onUpdateFlashcardCount={(count) =>
                setState((prev) => ({ ...prev, flashcardsReviewedCount: count }))
              }
              onLaunchBlockInTimer={handleLaunchBlockInTimer}
              onLaunchBreakStepInTimer={handleLaunchBreakStepInTimer}
              onIncrementProjectBlock={handleIncrementProjectBlock}
              onCompleteProjectItem1={handleCompleteProjectItem1}
              onCompleteProjectById={handleCompleteProjectById}
              onToggleSovereignDripDone={handleToggleSovereignDripDone}
              onUpdateDailyAmbitionDrip={handleUpdateDailyAmbitionDrip}
              onToggleGoldenRuleMode={handleToggleGoldenRuleMode}
              onAddProjectToQueue={handleAddProjectToQueue}
              onPromoteDeliverableWithSurge={handlePromoteDeliverableWithSurge}
              onDemoteDeliverableToBacklog={handleDemoteDeliverableToBacklog}
              onUpdateOpenListItem={handleUpdateOpenListItem}
              onRecalibrateStepDownTier={handleRecalibrateStepDownTier}
              onRecalibrateReSequenceNow={handleRecalibrateReSequenceNow}
              onOpenPipelineDrawer={() => setPipelineDrawerOpen(true)}
              onUpdatePipelineDay={handleUpdatePipelineDay}
              onOpenMiniHudPip={() => void miniHudController.onToggleMiniHud()}
              isMiniHudOpen={miniHudController.isMiniHudOpen}
              autoFloatOnTabSwitch={miniHudController.autoFloatOnTabSwitch}
              onToggleAutoFloatOnTabSwitch={() =>
                miniHudController.onToggleAutoFloatOnTabSwitch()
              }
              onTriggerMidDayReset={() => {
                const now = Date.now();
                setState((prev) => {
                  const secs = prev.timer.l3DurationMinutes * 60;
                  return {
                    ...prev,
                    timer: {
                      ...prev.timer,
                      mode: 'BREAK_L3',
                      secondsLeft: secs,
                      targetEndTimeMs: now + secs * 1000,
                      isRunning: true,
                    },
                  };
                });
                showNotice('Started mandatory 60–120m Surge Mid-Day Reset.');
              }}
              onToggleTimerRun={() => {
                const now = Date.now();
                setState((prev) => {
                  const nextRunning = !prev.timer.isRunning;
                  const currentSecondsLeft =
                    prev.timer.isRunning && prev.timer.targetEndTimeMs
                      ? Math.max(
                          0,
                          Math.ceil((prev.timer.targetEndTimeMs - now) / 1000)
                        )
                      : prev.timer.secondsLeft;
                  return {
                    ...prev,
                    timer: {
                      ...prev.timer,
                      isRunning: nextRunning,
                      secondsLeft: currentSecondsLeft,
                      targetEndTimeMs: nextRunning
                        ? now + currentSecondsLeft * 1000
                        : null,
                    },
                  };
                });
              }}
              onResetCurrentStage={() =>
                setState((prev) => {
                  const durations = getActiveBlockDurationsSeconds(prev);
                  return {
                    ...prev,
                    timer: {
                      ...prev.timer,
                      isRunning: false,
                      targetEndTimeMs: null,
                      secondsLeft:
                        prev.timer.mode === 'WORK_20M'
                          ? prev.timer.workStage === 'IGNITION_5M'
                            ? durations.startupSeconds
                            : durations.momentumSeconds
                          : prev.timer.mode === 'BREAK_L1'
                          ? prev.timer.l1DurationMinutes * 60
                          : prev.timer.mode === 'BREAK_L2'
                          ? prev.timer.l2DurationMinutes * 60
                          : prev.timer.mode === 'BREAK_L3'
                          ? prev.timer.l3DurationMinutes * 60
                          : prev.timer.stressDurationMinutes * 60,
                    },
                  };
                })
              }
              onFastForwardCurrentStage={handleFastForwardTimerStage}
              onSwitchTimerMode={(mode: TimerRunMode) =>
                setState((prev) => {
                  const durations = getActiveBlockDurationsSeconds(prev);
                  return {
                    ...prev,
                    timer: {
                      ...prev.timer,
                      mode,
                      isRunning: false,
                      targetEndTimeMs: null,
                      workStage: 'IGNITION_5M',
                      secondsLeft:
                        mode === 'WORK_20M'
                          ? durations.startupSeconds
                          : mode === 'BREAK_L1'
                          ? prev.timer.l1DurationMinutes * 60
                          : mode === 'BREAK_L2'
                          ? prev.timer.l2DurationMinutes * 60
                          : mode === 'BREAK_L3'
                          ? prev.timer.l3DurationMinutes * 60
                          : prev.timer.stressDurationMinutes * 60,
                    },
                  };
                })
              }
              onSelectL1Minutes={(mins) =>
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode: 'BREAK_L1',
                    l1DurationMinutes: mins,
                    secondsLeft: mins * 60,
                    targetEndTimeMs: null,
                    isRunning: false,
                  },
                }))
              }
              onSelectL2Minutes={(mins) =>
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode: 'BREAK_L2',
                    l2DurationMinutes: mins,
                    secondsLeft: mins * 60,
                    targetEndTimeMs: null,
                    isRunning: false,
                  },
                }))
              }
              onSelectL2Protocol={(protocol: Level2BreakProtocol) =>
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode: 'BREAK_L2',
                    l2Protocol: protocol,
                    secondsLeft: prev.timer.l2DurationMinutes * 60,
                    targetEndTimeMs: null,
                    isRunning: false,
                  },
                }))
              }
              onSelectL3Minutes={(mins) =>
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode: 'BREAK_L3',
                    l3DurationMinutes: mins,
                    secondsLeft: mins * 60,
                    targetEndTimeMs: null,
                    isRunning: false,
                  },
                }))
              }
              onTriggerStressReset={(
                protocol: StressResetProtocol = 'BREATHING_478',
                mins: 15 | 20 = 15
              ) => {
                const now = Date.now();
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode: 'STRESS_RESET',
                    stressProtocol: protocol,
                    stressDurationMinutes: mins,
                    secondsLeft: mins * 60,
                    targetEndTimeMs: now + mins * 60 * 1000,
                    isRunning: true,
                  },
                }));
                showNotice(
                  'Suspended heavy reading/writing → Started 15–20m Stress / Fatigue Reset.'
                );
              }}
              onCompleteStressResetInto5mFlashcards={() => {
                const now = Date.now();
                dispatchLockScreenAlert(
                  'STRESS_RESET_COMPLETE',
                  'Stress / Fatigue Reset Complete',
                  '5m Flashcard recovery block queued.'
                );
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    isRunning: false,
                    targetEndTimeMs: null,
                    queuedRecoveryFlashcard5m: true,
                    recoveryFlashcardSecondsLeft: 300,
                    recoveryFlashcardTargetEndTimeMs: now + 300 * 1000,
                    recoveryFlashcardRunning: true,
                  },
                }));
                showNotice('Physical reset finished → Queued 5m Flashcard block.');
              }}
              onToggleRecoveryFlashcardTimer={() => {
                const now = Date.now();
                setState((prev) => {
                  const nextRunning = !prev.timer.recoveryFlashcardRunning;
                  const currentSec =
                    prev.timer.recoveryFlashcardRunning &&
                    prev.timer.recoveryFlashcardTargetEndTimeMs
                      ? Math.max(
                          0,
                          Math.ceil(
                            (prev.timer.recoveryFlashcardTargetEndTimeMs - now) /
                              1000
                          )
                        )
                      : prev.timer.recoveryFlashcardSecondsLeft;
                  return {
                    ...prev,
                    timer: {
                      ...prev.timer,
                      recoveryFlashcardRunning: nextRunning,
                      recoveryFlashcardSecondsLeft: currentSec,
                      recoveryFlashcardTargetEndTimeMs: nextRunning
                        ? now + currentSec * 1000
                        : null,
                    },
                  };
                });
              }}
              onCompleteRecoveryFlashcard5m={() => {
                triggerHaptic([15]);
                dispatchLockScreenAlert(
                  'WORK_BLOCK_COMPLETE',
                  '5m Flashcard Recovery Block Complete',
                  'Completed 5-minute Flashcard recovery ramp.'
                );
                setState((prev) => {
                  const newEntry = createTodayLogEntry(prev, {
                    category: 'FLOOR_COMP',
                    title: '5m Flashcard Recovery Ramp',
                    durationMinutes: 5,
                    roadmapTrack: 'science',
                    stroke: 'INPUT',
                    rungNumber: 1,
                  });
                  pushUndoSnapshot(
                    prev,
                    'Block Logged: 5m Flashcard Recovery Ramp (5m)'
                  );
                  return {
                    ...prev,
                    todayBlockLog: [...(prev.todayBlockLog || []), newEntry],
                    roadmapTracks: creditRoadmapTrack(
                      prev.roadmapTracks,
                      'science',
                      'INPUT',
                      1
                    ),
                    timer: {
                      ...prev.timer,
                      queuedRecoveryFlashcard5m: false,
                      recoveryFlashcardRunning: false,
                      recoveryFlashcardSecondsLeft: 300,
                      recoveryFlashcardTargetEndTimeMs: null,
                    },
                  };
                });
                showNotice('Completed 5m Flashcard recovery block.');
              }}
              onGoToRecharge={() => setActiveTab('RECHARGE')}
              onSetEnergyBandwidth={handleSetEnergyBandwidth}
              onCycleCognitiveDemand={handleCycleCognitiveDemand}
              onSelectElasticMultiplier={handleSelectElasticMultiplier}
              onShrinkStartupStep={handleShrinkStartupStep}
              onApplyShockAbsorber={handleApplyShockAbsorber}
              onSetActiveDualSlotNumber={handleSetActiveDualSlotNumber}
              onLaunchBoundedCuriosityBlock={handleLaunchBoundedCuriosityBlock}
              onUpdateBaselineBlock={handleUpdateBaselineBlock}
              onAddBaselineBlock={handleAddBaselineBlock}
              onDeleteBaselineBlock={handleDeleteBaselineBlock}
              onUpdateProjectItem={handleUpdateProjectItem}
              onUpdateActiveTimerTask={handleUpdateActiveTimerTask}
              onUpdateBreakOptions={handleUpdateBreakOptions}
            />
          )}

          {activeTab === 'TIMER' && (
            <Tab2TimerTriage
              state={state}
              onToggleTimerRun={() => {
                const now = Date.now();
                setState((prev) => {
                  const nextRunning = !prev.timer.isRunning;
                  const currentSecondsLeft =
                    prev.timer.isRunning && prev.timer.targetEndTimeMs
                      ? Math.max(0, Math.ceil((prev.timer.targetEndTimeMs - now) / 1000))
                      : prev.timer.secondsLeft;
                  return {
                    ...prev,
                    timer: {
                      ...prev.timer,
                      isRunning: nextRunning,
                      secondsLeft: currentSecondsLeft,
                      targetEndTimeMs: nextRunning
                        ? now + currentSecondsLeft * 1000
                        : null,
                    },
                  };
                });
              }}
              onResetCurrentStage={() =>
                setState((prev) => {
                  const durations = getActiveBlockDurationsSeconds(prev);
                  return {
                    ...prev,
                    timer: {
                      ...prev.timer,
                      isRunning: false,
                      targetEndTimeMs: null,
                      secondsLeft:
                        prev.timer.mode === 'WORK_20M'
                          ? prev.timer.workStage === 'IGNITION_5M'
                            ? durations.startupSeconds
                            : durations.momentumSeconds
                          : prev.timer.mode === 'BREAK_L1'
                          ? prev.timer.l1DurationMinutes * 60
                          : prev.timer.mode === 'BREAK_L2'
                          ? prev.timer.l2DurationMinutes * 60
                          : prev.timer.mode === 'BREAK_L3'
                          ? prev.timer.l3DurationMinutes * 60
                          : prev.timer.stressDurationMinutes * 60,
                    },
                  };
                })
              }
              onFastForwardCurrentStage={handleFastForwardTimerStage}
              onSwitchTimerMode={(mode: TimerRunMode) =>
                setState((prev) => {
                  const durations = getActiveBlockDurationsSeconds(prev);
                  return {
                    ...prev,
                    timer: {
                      ...prev.timer,
                      mode,
                      isRunning: false,
                      targetEndTimeMs: null,
                      workStage: 'IGNITION_5M',
                      secondsLeft:
                        mode === 'WORK_20M'
                          ? durations.startupSeconds
                          : mode === 'BREAK_L1'
                          ? prev.timer.l1DurationMinutes * 60
                          : mode === 'BREAK_L2'
                          ? prev.timer.l2DurationMinutes * 60
                          : mode === 'BREAK_L3'
                          ? prev.timer.l3DurationMinutes * 60
                          : prev.timer.stressDurationMinutes * 60,
                    },
                  };
                })
              }
              onSelectL1Minutes={(mins) =>
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode: 'BREAK_L1',
                    l1DurationMinutes: mins,
                    secondsLeft: mins * 60,
                    targetEndTimeMs: null,
                    isRunning: false,
                  },
                }))
              }
              onSelectL2Minutes={(mins) =>
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode: 'BREAK_L2',
                    l2DurationMinutes: mins,
                    secondsLeft: mins * 60,
                    targetEndTimeMs: null,
                    isRunning: false,
                  },
                }))
              }
              onSelectL2Protocol={(protocol: Level2BreakProtocol) =>
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode: 'BREAK_L2',
                    l2Protocol: protocol,
                    secondsLeft: prev.timer.l2DurationMinutes * 60,
                    targetEndTimeMs: null,
                    isRunning: false,
                  },
                }))
              }
              onSelectL3Minutes={(mins) =>
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode: 'BREAK_L3',
                    l3DurationMinutes: mins,
                    secondsLeft: mins * 60,
                    targetEndTimeMs: null,
                    isRunning: false,
                  },
                }))
              }
              onTriggerStressReset={(
                protocol: StressResetProtocol = 'BREATHING_478',
                mins: 15 | 20 = 15
              ) => {
                const now = Date.now();
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode: 'STRESS_RESET',
                    stressProtocol: protocol,
                    stressDurationMinutes: mins,
                    secondsLeft: mins * 60,
                    targetEndTimeMs: now + mins * 60 * 1000,
                    isRunning: true,
                  },
                }));
                showNotice(
                  'Suspended heavy reading/writing → Started 15–20m Stress / Fatigue Reset.'
                );
              }}
              onCompleteStressResetInto5mFlashcards={() => {
                const now = Date.now();
                dispatchLockScreenAlert(
                  'STRESS_RESET_COMPLETE',
                  'Stress / Fatigue Reset Complete',
                  '5m Flashcard recovery block queued.'
                );
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    isRunning: false,
                    targetEndTimeMs: null,
                    queuedRecoveryFlashcard5m: true,
                    recoveryFlashcardSecondsLeft: 300,
                    recoveryFlashcardTargetEndTimeMs: now + 300 * 1000,
                    recoveryFlashcardRunning: true,
                  },
                }));
                showNotice('Physical reset finished → Queued 5m Flashcard block.');
              }}
              onToggleRecoveryFlashcardTimer={() => {
                const now = Date.now();
                setState((prev) => {
                  const nextRunning = !prev.timer.recoveryFlashcardRunning;
                  const currentSec =
                    prev.timer.recoveryFlashcardRunning &&
                    prev.timer.recoveryFlashcardTargetEndTimeMs
                      ? Math.max(
                          0,
                          Math.ceil(
                            (prev.timer.recoveryFlashcardTargetEndTimeMs - now) / 1000
                          )
                        )
                      : prev.timer.recoveryFlashcardSecondsLeft;
                  return {
                    ...prev,
                    timer: {
                      ...prev.timer,
                      recoveryFlashcardRunning: nextRunning,
                      recoveryFlashcardSecondsLeft: currentSec,
                      recoveryFlashcardTargetEndTimeMs: nextRunning
                        ? now + currentSec * 1000
                        : null,
                    },
                  };
                });
              }}
              onCompleteRecoveryFlashcard5m={() => {
                triggerHaptic([15]);
                dispatchLockScreenAlert(
                  'WORK_BLOCK_COMPLETE',
                  '5m Flashcard Recovery Block Complete',
                  'Completed 5-minute Flashcard recovery ramp.'
                );
                setState((prev) => {
                  const newEntry = createTodayLogEntry(prev, {
                    category: 'FLOOR_COMP',
                    title: '5m Flashcard Recovery Ramp',
                    durationMinutes: 5,
                    roadmapTrack: 'science',
                    stroke: 'INPUT',
                    rungNumber: 1,
                  });
                  pushUndoSnapshot(
                    prev,
                    'Block Logged: 5m Flashcard Recovery Ramp (5m)'
                  );
                  return {
                    ...prev,
                    todayBlockLog: [...(prev.todayBlockLog || []), newEntry],
                    roadmapTracks: creditRoadmapTrack(
                      prev.roadmapTracks,
                      'science',
                      'INPUT',
                      1
                    ),
                    timer: {
                      ...prev.timer,
                      queuedRecoveryFlashcard5m: false,
                      recoveryFlashcardRunning: false,
                      recoveryFlashcardSecondsLeft: 300,
                      recoveryFlashcardTargetEndTimeMs: null,
                    },
                  };
                });
                showNotice('Completed 5m Flashcard recovery block.');
              }}
              notificationLog={notificationLog}
              notificationsGranted={notificationsGranted}
              swOfflineReady={swOfflineReady}
              onRequestNotificationPermissions={() => {
                initSymmetryNotifications().then((res) => {
                  setNotificationsGranted(res.granted);
                  showNotice(
                    `Android / Web Lock-Screen Notification Channel initialized (${res.platform}).`
                  );
                });
              }}
              onManualTriggerNotification={(eventType, title, body) => {
                dispatchLockScreenAlert(eventType, title, body);
                showNotice(`Dispatched Lock-Screen Alert: ${title}`);
              }}
              onOpenMiniHudPip={() => void miniHudController.onToggleMiniHud()}
              isMiniHudOpen={miniHudController.isMiniHudOpen}
              autoFloatOnTabSwitch={miniHudController.autoFloatOnTabSwitch}
              onToggleAutoFloatOnTabSwitch={() =>
                miniHudController.onToggleAutoFloatOnTabSwitch()
              }
              onSelectElasticMultiplier={handleSelectElasticMultiplier}
              onShrinkStartupStep={handleShrinkStartupStep}
            />
          )}

          {activeTab === 'RECHARGE' && (
            <Tab3Recharge
              state={state}
              layoutMode={layoutMode}
              onUnlockZeroWorkLeft={handleToggleZeroWorkSimulation}
              onOpenFlowExtensionPrompt={() =>
                setState((prev) => ({
                  ...prev,
                  recharge: { ...prev.recharge, flowExtensionPromptOpen: true },
                }))
              }
              onCancelFlowExtensionPrompt={() =>
                setState((prev) => ({
                  ...prev,
                  recharge: { ...prev.recharge, flowExtensionPromptOpen: false },
                }))
              }
              onConfirmFlowExtension={() => {
                triggerHaptic([15]);
                const now = Date.now();
                setState((prev) => ({
                  ...prev,
                  recharge: {
                    ...prev.recharge,
                    flowExtensionPromptOpen: false,
                    flowExtensionActive: true,
                    flowExtensionRunning: true,
                    flowExtensionStartTimeMs:
                      now - prev.recharge.flowExtensionElapsedSeconds * 1000,
                    weeklyExtensionsUsed: Math.min(
                      2,
                      prev.recharge.weeklyExtensionsUsed + 1
                    ),
                  },
                }));
                showNotice('Flow Extension confirmed → Open count-up timer started.');
              }}
              onToggleFlowExtensionTimer={() => {
                const now = Date.now();
                setState((prev) => {
                  const nextRunning = !prev.recharge.flowExtensionRunning;
                  const currentElapsed =
                    prev.recharge.flowExtensionRunning &&
                    prev.recharge.flowExtensionStartTimeMs
                      ? Math.max(
                          prev.recharge.flowExtensionElapsedSeconds,
                          Math.floor(
                            (now - prev.recharge.flowExtensionStartTimeMs) / 1000
                          )
                        )
                      : prev.recharge.flowExtensionElapsedSeconds;
                  return {
                    ...prev,
                    recharge: {
                      ...prev.recharge,
                      flowExtensionRunning: nextRunning,
                      flowExtensionElapsedSeconds: currentElapsed,
                      flowExtensionStartTimeMs: nextRunning
                        ? now - currentElapsed * 1000
                        : null,
                    },
                  };
                });
              }}
              onLogFlowExtensionBlock20m={() => {
                triggerHaptic([15]);
                const now = Date.now();
                setState((prev) => {
                  const newBlocksLogged =
                    prev.recharge.flowExtensionBlocksLoggedToday + 1;
                  if (newBlocksLogged === 3) {
                    dispatchLockScreenAlert(
                      'MANDATORY_60M_BREAK',
                      '60m Mandatory Physical Break Alert',
                      '3 Flow Extension blocks (60m) logged. Take a mandatory 60m micro-break.'
                    );
                  } else {
                    dispatchLockScreenAlert(
                      'CHECKIN_20M_CHIME',
                      '20m Flow Extension Check-In Chime',
                      `Extension Block #${newBlocksLogged} (${newBlocksLogged * 20}m) logged.`
                    );
                  }
                  // Rule 7: Deduct 1-2 project blocks from tomorrow's target for every 2-3 extension blocks logged
                  const deducted =
                    newBlocksLogged >= 3 ? 2 : newBlocksLogged >= 2 ? 1 : 0;
                  const newElapsed =
                    prev.recharge.flowExtensionElapsedSeconds + 1200;
                  const primaryTrack = prev.projectQueue[0]?.trackId || 'writing';
                  const newEntry = createTodayLogEntry(prev, {
                    category: 'FLOW_EXTENSION',
                    title: `Flow Extension Block #${newBlocksLogged}`,
                    durationMinutes: 20,
                    roadmapTrack: primaryTrack,
                    stroke: 'OUTPUT',
                    rungNumber: 3,
                  });
                  pushUndoSnapshot(
                    prev,
                    `Block Logged: Flow Extension Block #${newBlocksLogged} (20m)`
                  );
                  return {
                    ...prev,
                    todayBlockLog: [...(prev.todayBlockLog || []), newEntry],
                    pipelineDays: prev.pipelineDays.map((d, idx) =>
                      idx === 1
                        ? { ...d, deductedBlocksFromExtension: deducted }
                        : d
                    ),
                    roadmapTracks: creditRoadmapTrack(
                      prev.roadmapTracks,
                      primaryTrack,
                      'OUTPUT',
                      3
                    ),
                    recharge: {
                      ...prev.recharge,
                      flowExtensionElapsedSeconds: newElapsed,
                      flowExtensionStartTimeMs: prev.recharge.flowExtensionRunning
                        ? now - newElapsed * 1000
                        : null,
                      flowExtensionBlocksLoggedToday: newBlocksLogged,
                    },
                  };
                });
                showNotice(
                  'Logged +20m Flow Extension block (2–3 blocks auto-deducts 1–2 blocks from tomorrow).'
                );
              }}
              onSetWeeklyExtensionsUsed={(count) =>
                setState((prev) => ({
                  ...prev,
                  recharge: { ...prev.recharge, weeklyExtensionsUsed: count },
                }))
              }
              onToggleTomorrowEarlyAnchor={() =>
                setState((prev) => ({
                  ...prev,
                  pipelineDays: prev.pipelineDays.map((d, idx) =>
                    idx === 1
                      ? { ...d, earlyMorningAnchor: !d.earlyMorningAnchor }
                      : d
                  ),
                }))
              }
              onToggleOption0Timer={() => {
                triggerHaptic([15]);
                const now = Date.now();
                setState((prev) => {
                  const nextRunning = !prev.recharge.option0Running;
                  const currentSec =
                    prev.recharge.option0Running &&
                    prev.recharge.option0TargetEndTimeMs
                      ? Math.max(
                          0,
                          Math.ceil(
                            (prev.recharge.option0TargetEndTimeMs - now) / 1000
                          )
                        )
                      : prev.recharge.option0SecondsLeft;
                  return {
                    ...prev,
                    recharge: {
                      ...prev.recharge,
                      option0Running: nextRunning,
                      option0SecondsLeft: currentSec,
                      option0TargetEndTimeMs: nextRunning
                        ? now + currentSec * 1000
                        : null,
                    },
                  };
                });
              }}
              onCompleteOption0Window={() => {
                triggerHaptic([15]);
                dispatchLockScreenAlert(
                  'WORK_BLOCK_COMPLETE',
                  'Option 0 Stillness Window Complete',
                  'Completed 20m Rest / Stillness window.'
                );
                setState((prev) => {
                  const nextWin = prev.recharge.option0ConsecutiveWindows + 1;
                  const newEntry = createTodayLogEntry(prev, {
                    category: 'EVENING_RECHARGE',
                    title: `Option 0 Stillness Window (${nextWin}/2)`,
                    durationMinutes: 20,
                    roadmapTrack: 'personal',
                    stroke: 'INPUT',
                    rungNumber: 1,
                  });
                  pushUndoSnapshot(
                    prev,
                    `Block Logged: Option 0 Stillness (${nextWin}/2) (20m)`
                  );
                  return {
                    ...prev,
                    todayBlockLog: [...(prev.todayBlockLog || []), newEntry],
                    recharge: {
                      ...prev.recharge,
                      option0Running: false,
                      option0TargetEndTimeMs: null,
                      option0SecondsLeft: 1200,
                      option0ConsecutiveWindows: nextWin,
                      forkCheckModalOpen: nextWin >= 2,
                    },
                  };
                });
              }}
              onResolveForkCheck={(choice) => {
                setState((prev) => ({
                  ...prev,
                  recharge: {
                    ...prev.recharge,
                    forkCheckModalOpen: false,
                    option0ConsecutiveWindows: 0,
                    activeCategory:
                      choice === 'START_5M_ACTIVITY'
                        ? 'CAT1_MUSIC'
                        : prev.recharge.activeCategory,
                  },
                }));
                showNotice(
                  choice === 'SLEEP'
                    ? 'Fork Check resolved: Ending evening session for sleep.'
                    : 'Fork Check resolved: Selected 5m Activity.'
                );
              }}
              onSelectCategory={(cat: RechargeCategoryId) =>
                setState((prev) => ({
                  ...prev,
                  recharge: {
                    ...prev.recharge,
                    activeCategory: cat,
                    pacingStage: 'STARTUP_5M',
                    categorySecondsLeft: 300,
                    categoryTargetEndTimeMs: null,
                    categoryRunning: false,
                  },
                }))
              }
              onSelectMediaSubTab={(sub: MediaSubTrackId) =>
                setState((prev) => ({
                  ...prev,
                  recharge: {
                    ...prev.recharge,
                    activeCategory: 'CAT3_MEDIA',
                    activeMediaTab: sub,
                  },
                }))
              }
              onSelectFictionSpeed={(speed) =>
                setState((prev) => ({
                  ...prev,
                  recharge: { ...prev.recharge, fictionSpeed: speed },
                }))
              }
              onStartCategory5mStep={() => {
                triggerHaptic([15]);
                const now = Date.now();
                setState((prev) => {
                  const r = prev.recharge;
                  const nextRunning = !r.categoryRunning;
                  const currentSec =
                    r.categoryRunning && r.categoryTargetEndTimeMs
                      ? Math.max(
                          0,
                          Math.ceil((r.categoryTargetEndTimeMs - now) / 1000)
                        )
                      : r.categorySecondsLeft;

                  const stickyKey: StickyKey | null =
                    r.activeCategory === 'CAT2_MAKER'
                      ? 'CAT2_MAKER'
                      : r.activeCategory === 'CAT5_GAMING'
                      ? 'CAT5_GAMING'
                      : r.activeCategory === 'CAT3_MEDIA'
                      ? r.activeMediaTab
                      : null;

                  const isFresh5mStart =
                    !r.categoryRunning && r.pacingStage === 'STARTUP_5M';

                  const updatedSlots = { ...r.stickySlots };
                  if (stickyKey && isFresh5mStart) {
                    soundEngine.playTactileClick('STICKY_PIP');
                    const nextStarts = Math.min(
                      3,
                      (updatedSlots[stickyKey].startsLogged ??
                        updatedSlots[stickyKey].fiveMinStarts) + 1
                    );
                    updatedSlots[stickyKey] = {
                      ...updatedSlots[stickyKey],
                      fiveMinStarts: nextStarts,
                      startsLogged: nextStarts,
                    };
                  }

                  // Auto-credit Roadmap Input (Media) or Sandbox Output (Maker/Music)
                  let updatedTracks = prev.roadmapTracks;
                  let updatedLog = prev.todayBlockLog || [];

                  if (isFresh5mStart) {
                    let trackCredited: TrackId = 'writing';
                    let strokeCredited: 'INPUT' | 'OUTPUT' = 'INPUT';
                    let rungCredited: 1 | 2 | 3 | 4 = 1;
                    const matchingCustomCard = (r.categoryCards || []).find(
                      (card) => card.id === r.activeCategory
                    );
                    let rechargeTitle = matchingCustomCard
                      ? `${matchingCustomCard.activeTitle} (${matchingCustomCard.categoryName} 5m Start)`
                      : 'Evening Recharge 5m Step';

                    if (r.activeCategory === 'CAT3_MEDIA') {
                      trackCredited = 'writing';
                      strokeCredited = 'INPUT';
                      rungCredited = 1;
                      rechargeTitle = `${updatedSlots[r.activeMediaTab].activeTitle} (Media 5m Start)`;
                      updatedTracks = creditRoadmapTrack(
                        updatedTracks,
                        trackCredited,
                        strokeCredited,
                        rungCredited
                      );
                    } else if (r.activeCategory === 'CAT2_MAKER') {
                      trackCredited = 'coding';
                      strokeCredited = 'OUTPUT';
                      rungCredited = 2;
                      rechargeTitle = `${updatedSlots.CAT2_MAKER.activeTitle} (Maker 5m Start)`;
                      updatedTracks = creditRoadmapTrack(
                        updatedTracks,
                        trackCredited,
                        strokeCredited,
                        rungCredited
                      );
                    } else if (r.activeCategory === 'CAT1_MUSIC') {
                      trackCredited = 'music';
                      strokeCredited = 'OUTPUT';
                      rungCredited = 2;
                      rechargeTitle = `${
                        matchingCustomCard?.activeTitle ||
                        r.fluidCategories?.CAT1_MUSIC.activeTitle ||
                        'Acoustic / Instrument Cold Song'
                      } (5m)`;
                      updatedTracks = creditRoadmapTrack(
                        updatedTracks,
                        trackCredited,
                        strokeCredited,
                        rungCredited
                      );
                    } else if (r.activeCategory === 'CAT5_GAMING') {
                      trackCredited = 'coding';
                      strokeCredited = 'INPUT';
                      rungCredited = 1;
                      rechargeTitle = `${updatedSlots.CAT5_GAMING.activeTitle} (Gaming 5m Start)`;
                      updatedTracks = creditRoadmapTrack(
                        updatedTracks,
                        trackCredited,
                        strokeCredited,
                        rungCredited
                      );
                    } else if (r.activeCategory === 'CAT6_CULTURE') {
                      trackCredited = 'culture';
                      strokeCredited = 'INPUT';
                      rungCredited = 1;
                      rechargeTitle = `${
                        matchingCustomCard?.activeTitle ||
                        r.fluidCategories?.CAT6_CULTURE?.activeTitle ||
                        'Culture & Language'
                      } (5m Start)`;
                      updatedTracks = creditRoadmapTrack(
                        updatedTracks,
                        trackCredited,
                        strokeCredited,
                        rungCredited
                      );
                    } else if (r.activeCategory === 'CAT4_COMFORT') {
                      trackCredited = 'writing';
                      strokeCredited = 'INPUT';
                      rungCredited = 1;
                      rechargeTitle = `${
                        matchingCustomCard?.activeTitle ||
                        r.fluidCategories?.CAT4_COMFORT.activeTitle ||
                        "It's Always Sunny in Philadelphia"
                      } (5m Start)`;
                    } else {
                      trackCredited = 'culture';
                      strokeCredited = 'INPUT';
                      rungCredited = 1;
                      updatedTracks = creditRoadmapTrack(
                        updatedTracks,
                        trackCredited,
                        strokeCredited,
                        rungCredited
                      );
                    }

                    const newEntry = createTodayLogEntry(prev, {
                      category: 'EVENING_RECHARGE',
                      title: rechargeTitle,
                      durationMinutes: 5,
                      roadmapTrack: trackCredited,
                      stroke: strokeCredited,
                      stickyKey: stickyKey || undefined,
                      rungNumber: rungCredited,
                    });
                    updatedLog = [...updatedLog, newEntry];

                    const countLabel = stickyKey
                      ? ` [${updatedSlots[stickyKey].fiveMinStarts}/3]`
                      : '';
                    pushUndoSnapshot(
                      prev,
                      `Block Logged: ${rechargeTitle}${countLabel} (5m)`
                    );
                  }

                  return {
                    ...prev,
                    todayBlockLog: updatedLog,
                    roadmapTracks: updatedTracks,
                    recharge: {
                      ...r,
                      categoryRunning: nextRunning,
                      categorySecondsLeft: currentSec,
                      categoryTargetEndTimeMs: nextRunning
                        ? now + currentSec * 1000
                        : null,
                      stickySlots: updatedSlots,
                    },
                  };
                });
              }}
              onAdvanceCategoryPacingMilestone={() => {
                triggerHaptic([15]);
                setState((prev) => advanceCategoryMilestoneInternal(prev, Date.now()));
              }}
              onResolveCheckInPrompt={(decision) => {
                triggerHaptic([15]);
                const now = Date.now();
                setState((prev) => ({
                  ...prev,
                  recharge: {
                    ...prev.recharge,
                    checkInModalOpen: false,
                    categoryRunning: decision === 'KEEP_GOING',
                    categoryTargetEndTimeMs:
                      decision === 'KEEP_GOING'
                        ? now + prev.recharge.categorySecondsLeft * 1000
                        : null,
                    option0Running: decision === 'REST',
                    option0TargetEndTimeMs:
                      decision === 'REST'
                        ? now + prev.recharge.option0SecondsLeft * 1000
                        : null,
                  },
                }));
              }}
              onSwapStickyItemFromBacklog={(key: StickyKey) => {
                triggerHaptic([15]);
                setState((prev) => {
                  const slot = prev.recharge.stickySlots[key];
                  if (!slot) return prev;
                  const promotedTitle =
                    slot.queuedNextTitle || slot.backlogQueue[0] || slot.activeTitle;
                  const restQueue =
                    slot.backlogQueue.length > 0
                      ? slot.backlogQueue.slice(1)
                      : [];
                  const updatedBacklog = [...restQueue, slot.activeTitle];
                  const updatedArchive = [
                    slot.activeTitle,
                    ...(slot.archivedTitles ?? []),
                  ];
                  pushUndoSnapshot(
                    prev,
                    `Sticky Backlog Swapped: ${slot.activeTitle} → ${promotedTitle}`
                  );
                  return {
                    ...prev,
                    recharge: {
                      ...prev.recharge,
                      stickySlots: {
                        ...prev.recharge.stickySlots,
                        [key]: {
                          ...slot,
                          activeTitle: promotedTitle,
                          queuedNextTitle: updatedBacklog[0] || slot.activeTitle,
                          backlogQueue: updatedBacklog,
                          archivedTitles: updatedArchive,
                          fiveMinStarts: 0,
                          startsLogged: 0,
                          unlockedViaCheckIn: false,
                        },
                      },
                    },
                  };
                });
                showNotice(
                  `Archived active title on ${key}, promoted queuedNextTitle, and reset [0 / 3] startsLogged.`
                );
              }}
              onIncrementStickyStart={(key: StickyKey) => {
                triggerHaptic([10]);
                soundEngine.playTactileClick('STICKY_PIP');
                setState((prev) => {
                  const slot = prev.recharge.stickySlots[key];
                  if (!slot) return prev;
                  const nextCount = Math.min(
                    3,
                    (slot.startsLogged ?? slot.fiveMinStarts) + 1
                  );
                  return {
                    ...prev,
                    recharge: {
                      ...prev.recharge,
                      stickySlots: {
                        ...prev.recharge.stickySlots,
                        [key]: {
                          ...slot,
                          fiveMinStarts: nextCount,
                          startsLogged: nextCount,
                        },
                      },
                    },
                  };
                });
                showNotice(`Logged +1 5m start on ${key}.`);
              }}
              onUpdateEveningCategoryCards={handleUpdateEveningCategoryCards}
            />
          )}

          {activeTab === 'ROADMAP' && (
            <Tab4Roadmap
              state={state}
              layoutMode={layoutMode}
              onIncrementRungBlock={(trackId, rungNumber) => {
                triggerHaptic([15]);
                setState((prev) => {
                  const track = prev.roadmapTracks.find((t) => t.id === trackId);
                  const rung = track?.rungs.find((r) => r.rungNumber === rungNumber);
                  if (!track || !rung) return prev;
                  pushUndoSnapshot(
                    prev,
                    `Block Logged: ${track.name} Rung ${rungNumber} (20m)`
                  );
                  return {
                    ...prev,
                    roadmapTracks: creditRoadmapTrack(
                      prev.roadmapTracks,
                      trackId,
                      rung.ledgerType,
                      rungNumber
                    ),
                  };
                });
              }}
              onToggleSandboxActiveWeek={(trackId) =>
                setState((prev) => ({
                  ...prev,
                  roadmapTracks: prev.roadmapTracks.map((t) =>
                    t.id === trackId
                      ? { ...t, activeThisWeek: !t.activeThisWeek }
                      : t
                  ),
                }))
              }
              onUpdateRoadmapTrack={handleUpdateRoadmapTrack}
              onUpdateRoadmapRung={handleUpdateRoadmapRung}
              onToggleTrackSandboxType={handleToggleTrackSandboxType}
              onUpdateRoadmapShelter={handleUpdateRoadmapShelter}
              onUpdateRoadmapFoundation={handleUpdateRoadmapFoundation}
            />
          )}
        </main>
      </motion.div>

      {/* Footer */}
      <footer
        style={
          layoutMode === 'COMPACT'
            ? { maxWidth: '460px', marginInline: 'auto' }
            : undefined
        }
        className={`w-full max-w-none px-3 sm:px-5 py-2 border-t border-white/[0.04] text-[10px] font-mono tabular-nums flex flex-wrap items-center justify-between gap-2 transition-colors duration-500 ${
          isEveningTheme ? 'text-stone-500' : 'text-slate-500'
        }`}
      >
        <span>SymmetryManager • {layoutMode}</span>
        <span>{metrics.durationPrefix}</span>
      </footer>

      {/* Glassmorphic Sticky Bottom Navigation for Mobile Thumb Reach */}
      <nav
        id="mobile-sticky-bottom-nav"
        aria-label="Mobile Thumb Navigation"
        className={`sm:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/[0.05] backdrop-blur-xl transition-colors duration-500 ${
          isEveningTheme
            ? 'bg-[#0c0a09]/85 text-amber-100'
            : 'bg-[#090d16]/85 text-slate-100'
        }`}
      >
        <div className="grid grid-cols-3 gap-1.5 px-3 py-2">
          {(
            [
              {
                id: 'PIPELINE' as TabId,
                label: 'Focus',
                icon: ListChecks,
                badge: `${metrics.totalCompletedBlocks}/${metrics.totalTargetBlocks}`,
              },
              {
                id: 'RECHARGE' as TabId,
                label: 'Evening',
                icon: Moon,
                badge: metrics.isZeroWorkLeft ? 'OPEN' : '0m',
              },
              {
                id: 'ROADMAP' as TabId,
                label: 'Roadmap',
                icon: Layers,
                badge: '4-Rung',
              },
            ] as const
          ).map((item) => {
            const Icon = item.icon;
            const active =
              activeTab === item.id ||
              (item.id === 'PIPELINE' && activeTab === 'TIMER');
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic([15]);
                  setActiveTab(item.id);
                }}
                className={`py-1.5 px-2 rounded-full flex items-center justify-center gap-1.5 transition cursor-pointer ${
                  active
                    ? isEveningTheme
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-500/35'
                      : 'bg-cyan-500/15 text-cyan-200 border border-cyan-500/35'
                    : isEveningTheme
                    ? 'text-stone-400 hover:text-amber-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-3.5 h-3.5 shrink-0" />
                <span className="text-xs font-medium">{item.label}</span>
                <span className="text-[10px] font-mono font-light tabular-nums opacity-75">
                  {item.badge}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* 10-Second Floating Glassmorphic Undo Toast */}
      <UndoToast
        toast={undoToast}
        secondsRemaining={undoSecondsLeft}
        onUndo={handleTriggerUndo}
        onDismiss={() => setUndoToast(null)}
        isEveningTheme={isEveningTheme}
      />

      {/* Editable Today's Block Log Slide-Over Drawer */}
      <TodayLogDrawer
        isOpen={todayLogDrawerOpen}
        onClose={() => setTodayLogDrawerOpen(false)}
        state={state}
        onReassignEntryCategory={handleReassignLogEntryCategory}
        onEditEntryTitle={handleEditLogEntryTitle}
        onDeleteEntry={handleDeleteLogEntry}
        onAddManualBlock={handleAddManualBlock}
        isEveningTheme={isEveningTheme}
      />

      {/* 7-Day Pipeline Table Drawer */}
      <PipelineDrawer
        isOpen={pipelineDrawerOpen}
        onClose={() => setPipelineDrawerOpen(false)}
        state={state}
        smartIntakeText={smartIntakeText}
        onChangeSmartIntakeText={setSmartIntakeText}
        smartIntakePreview={smartIntakePreview}
        onSetSmartIntakePreview={setSmartIntakePreview}
        onApplySmartIntakePlan={handleApplySmartIntakePlan}
        onOpenStateModal={() => {
          setGeminiApiKeyInput(getStoredGeminiApiKey());
          setStateIoText(serializeToStateMarkdown(state));
          setStateModalOpen(true);
        }}
        onUnlockArchitectMode={handleUnlockArchitectMode}
        apiKeyVersion={apiKeyVersion}
        onUpdateDay={handleUpdatePipelineDay}
      />

      {/* State-Aware AI Side-Panel (Cmd/Ctrl + /) */}
      <PlanningAssistantDrawer
        isOpen={assistantDrawerOpen}
        onClose={() => setAssistantDrawerOpen(false)}
        state={state}
        onApplyStatePatch={handleApplyStatePatch}
        onSelectTab={setActiveTab}
        isEveningTheme={isEveningTheme}
      />

      {/* External OS-Level Mini HUD (Interactive Document PiP 300x135 React Portal + Universal 480x220 Canvas Stream Video PiP) */}
      <ExternalMiniHud
        state={state}
        onToggleTimerRun={handleToggleTimerRun}
        onFastForwardCurrentStage={handleFastForwardTimerStage}
        onShrinkStartupStep={() => handleShrinkStartupStep()}
        onNotify={showNotice}
        pipWindow={miniHudController.pipWindow}
        setPipWindow={miniHudController.setPipWindow}
        engineMode={miniHudController.engineMode}
        setEngineMode={miniHudController.setEngineMode}
        autoFloatOnTabSwitch={miniHudController.autoFloatOnTabSwitch}
        onToggleAutoFloatOnTabSwitch={
          miniHudController.onToggleAutoFloatOnTabSwitch
        }
        onRequestPopOut={miniHudController.onRequestPopOut}
        onCloseMiniHud={miniHudController.onCloseMiniHud}
        tabSwitchFloatPromptOpen={miniHudController.tabSwitchFloatPromptOpen}
        onDismissTabSwitchFloatPrompt={
          miniHudController.onDismissTabSwitchFloatPrompt
        }
        canvasRef={miniHudController.canvasRef}
        videoRef={miniHudController.videoRef}
      />

      {/* State Sync Modal (Settings / Profile Archetype / Day-Boundary Preferences / Rolling Auto-Backups / Gemini API Key / 3-Part state.md Compiler & Parser) */}
      <MobileBottomSheet
        isOpen={stateModalOpen}
        onClose={() => setStateModalOpen(false)}
        id="modal-state-io"
        ariaLabel="Settings, Profile Archetypes, Auto-Backups & 3-Part state.md Sync"
        maxWidthClass="w-full max-w-none"
      >
        <div className="w-full p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-700 space-y-4 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono">
              <Sliders className="w-4 h-4 text-sky-400" />
              <span>Settings, Profile Archetypes &amp; 3-Part `state.md` Sync</span>
            </h2>
            <button
              id="btn-close-state-modal"
              type="button"
              onClick={() => setStateModalOpen(false)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Profile Archetype & Onboarding Wizard Launcher + 1-Click Starter Templates */}
          <div
            id="settings-profile-archetype-section"
            className="p-3.5 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-mono font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Profile Archetype &amp; Starter Templates</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Active Profile:{' '}
                  <strong className="text-amber-300 font-mono">
                    {state.profileName ||
                      (architectModeUnlocked
                        ? 'Avery Default (Medical Physics, Writing & Maker)'
                        : 'Academic & Grad Researcher')}
                  </strong>{' '}
                  ({state.baselineBlocks.length}-Block Floor)
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {architectModeUnlocked && (
                  <button
                    id="btn-lock-architect-mode"
                    type="button"
                    onClick={() => {
                      handleLockArchitectMode();
                      setStateModalOpen(false);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-amber-500/40 text-amber-200 font-mono font-bold text-xs cursor-pointer transition"
                  >
                    Lock / Hide Architect Mode
                  </button>
                )}

                <button
                  id="btn-settings-customize-with-ai"
                  type="button"
                  onClick={() => {
                    setStateModalOpen(false);
                    setConversationalArchitectOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Customize with AI</span>
                </button>

                <button
                  id="btn-switch-reset-profile-template"
                  type="button"
                  onClick={() => {
                    setStateModalOpen(false);
                    setIsFirstVisitOnboarding(false);
                    setOnboardingWizardOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-extrabold text-xs flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Switch / Reset Profile Template</span>
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-1.5 pt-1">
              {getVisibleProfilePresets(architectModeUnlocked).map((preset) => {
                const isCurrent = state.profilePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    id={`settings-quick-preset-${preset.id}`}
                    type="button"
                    onClick={() => {
                      if (preset.id === 'BLANK_CUSTOM') {
                        setStateModalOpen(false);
                        setIsFirstVisitOnboarding(false);
                        setOnboardingWizardOpen(true);
                      } else {
                        handleApplyProfilePreset(preset.id);
                        setStateModalOpen(false);
                      }
                    }}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border cursor-pointer transition ${
                      isCurrent
                        ? 'bg-indigo-500/30 border-indigo-400 text-indigo-100 font-bold'
                        : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-300'
                    }`}
                  >
                    {preset.number}. {preset.shortTitle}
                  </button>
                );
              })}
            </div>
          </div>

          {/* System 4: Rolling Auto-Backups Ring Buffer (Last 7 Automatic Snapshots) */}
          <div
            id="settings-rolling-auto-backups"
            className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Rolling Auto-Backups Ring Buffer ({(state.stateBackups || []).length} / 7 Snapshots)
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Automatic snapshots captured before state resets, preset switches, or JSON/Markdown imports.
                </p>
              </div>
              <button
                id="btn-create-manual-snapshot"
                type="button"
                onClick={() => {
                  soundEngine.playTactileClick('MODE_TOGGLE');
                  setState((prev) => ({
                    ...prev,
                    stateBackups: pushStateBackup(
                      prev,
                      'MANUAL_SNAPSHOT',
                      `Manual Snapshot (${prev.profileName || 'Active State'})`
                    ),
                  }));
                  showNotice('Captured manual snapshot into 7-slot rolling ring buffer.');
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-cyan-200 font-mono font-bold text-[11px] cursor-pointer"
              >
                + Snapshot Now
              </button>
            </div>

            {(state.stateBackups || []).length === 0 ? (
              <div className="text-[11px] font-mono text-slate-400 py-2 px-3 rounded-lg bg-slate-900/80 border border-slate-800">
                No automatic snapshots recorded yet. Any preset switch, New Day Reset, Default Reset, or state.md import will automatically save a snapshot here (up to 7).
              </div>
            ) : (
              <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
                {(state.stateBackups || []).map((snap, idx) => (
                  <div
                    key={snap.id}
                    id={`backup-snapshot-row-${idx}`}
                    className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 font-mono text-[10px] font-bold">
                          #{idx + 1} • {snap.triggerReason}
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-100 truncate">
                          {snap.label}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                        {snap.createdAtIso} • {snap.profileName} • Mode: {snap.loadMode} • {snap.blocksCompleted}/{snap.targetBlocks} blocks
                      </div>
                    </div>

                    <button
                      id={`btn-restore-snapshot-${idx}`}
                      type="button"
                      onClick={() => {
                        soundEngine.playTactileClick('MODE_TOGGLE');
                        try {
                          const restored = validateAndRestoreStateSnapshot(
                            snap.stateJson,
                            state.stateBackups || []
                          );
                          setState(restored);
                          setStateIoText(serializeToStateMarkdown(restored));
                          showNotice(
                            `Restored verified snapshot: "${snap.label}" (${snap.createdAtIso}).`
                          );
                        } catch {
                          showNotice('Snapshot failed schema validation.');
                        }
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono font-extrabold text-[11px] cursor-pointer shrink-0"
                    >
                      Restore Snapshot
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Universal Day-Boundary & Pacing Preferences */}
          <div
            id="settings-day-boundary-preferences"
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Universal Day-Boundary &amp; Pacing Preferences</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                Shift Key: {state.logicalDayKey}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                <label
                  htmlFor="select-logical-day-rollover-hour"
                  className="block text-[11px] font-mono font-bold text-slate-200"
                >
                  Logical Day Rollover Hour (12:00 AM – 6:00 AM)
                </label>
                <select
                  id="select-logical-day-rollover-hour"
                  value={state.logicalDayRolloverHour ?? 4}
                  onChange={(e) =>
                    handleUpdateDayBoundaryPreferences(
                      Number(e.target.value),
                      state.earlyEveningShutdownTime || '6:00 PM'
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-cyan-200 font-bold"
                >
                  {[0, 1, 2, 3, 4, 5, 6].map((hr) => (
                    <option key={hr} value={hr}>
                      {formatRolloverHourLabel(hr)}
                      {hr === 4 ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] font-mono text-slate-400">
                  Hours before {formatRolloverHourLabel(state.logicalDayRolloverHour ?? 4)} stay on the active logical shift day.
                </p>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1">
                <label
                  htmlFor="select-early-evening-shutdown-time"
                  className="block text-[11px] font-mono font-bold text-slate-200"
                >
                  Early Evening Shutdown Time (Evening Outing Days)
                </label>
                <select
                  id="select-early-evening-shutdown-time"
                  value={state.earlyEveningShutdownTime || '6:00 PM'}
                  onChange={(e) =>
                    handleUpdateDayBoundaryPreferences(
                      state.logicalDayRolloverHour ?? 4,
                      e.target.value
                    )
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-amber-200 font-bold"
                >
                  {[
                    '5:00 PM',
                    '5:30 PM',
                    '6:00 PM',
                    '6:30 PM',
                    '7:00 PM',
                    '7:30 PM',
                    '8:00 PM',
                  ].map((timeStr) => (
                    <option key={timeStr} value={timeStr}>
                      {timeStr}
                      {timeStr === '6:00 PM' ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] font-mono text-slate-400">
                  Sets the hard cutoff timestamp when Evening Outing fixed event is active.
                </p>
              </div>
            </div>
          </div>

          {/* 5. "Structure vs. Flexibility Tuning" Panel (3 Ergonomic Dials within Safe Bounds) */}
          <div
            id="settings-flexibility-tuning-panel"
            className="p-3.5 rounded-xl bg-slate-950 border border-cyan-500/40 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Structure vs. Flexibility Tuning (Structured Elasticity)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tune 3 ergonomic dials within safe bounds while keeping the core state-machine architecture intact.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-[10px] font-mono font-bold text-cyan-200">
                1.0x Unit = 20m Default
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {/* Dial 1: Block Cadence Preset */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-mono font-bold text-slate-200">
                  1. Block Cadence Preset
                </div>
                <div className="flex flex-col gap-1">
                  {(
                    [
                      {
                        id: 'CADENCE_15_3_12' as BlockCadencePreset,
                        label: '15m (3m+12m)',
                      },
                      {
                        id: 'CADENCE_20_5_15' as BlockCadencePreset,
                        label: '20m Default (5m+15m)',
                      },
                      {
                        id: 'CADENCE_25_5_20' as BlockCadencePreset,
                        label: '25m (5m+20m)',
                      },
                    ]
                  ).map((opt) => {
                    const activePreset =
                      state.flexibilityTuning?.blockCadencePreset ??
                      'CADENCE_20_5_15';
                    const isSelected = activePreset === opt.id;
                    return (
                      <button
                        key={opt.id}
                        id={`btn-cadence-preset-${opt.id}`}
                        type="button"
                        onClick={() =>
                          handleUpdateFlexibilityTuning({
                            blockCadencePreset: opt.id,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg font-mono text-[11px] text-left border transition cursor-pointer flex items-center justify-between ${
                          isSelected
                            ? 'bg-cyan-500/20 border-cyan-400 text-cyan-100 font-bold'
                            : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <span>{opt.label}</span>
                        {isSelected && <Check className="w-3 h-3 text-cyan-300 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dial 2: Closed List Lock Mode */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-mono font-bold text-slate-200">
                  2. Closed List Lock Mode
                </div>
                <div className="flex flex-col gap-1">
                  {(
                    [
                      {
                        id: 'STRICT_SERIALIZED' as ClosedListLockMode,
                        label: 'Strict Serialized (#1 Only — Default)',
                        sub: '100% of discretionary blocks locked on Slot #1',
                      },
                      {
                        id: 'DUAL_SLOT' as ClosedListLockMode,
                        label: 'Dual-Slot (#1 & #2 Toggle)',
                        sub: 'Allow toggling between #1 and #2 when blocked on external feedback',
                      },
                    ]
                  ).map((opt) => {
                    const activeLock =
                      state.flexibilityTuning?.closedListLockMode ??
                      'STRICT_SERIALIZED';
                    const isSelected = activeLock === opt.id;
                    return (
                      <button
                        key={opt.id}
                        id={`btn-closed-list-lock-${opt.id}`}
                        type="button"
                        onClick={() =>
                          handleUpdateFlexibilityTuning({
                            closedListLockMode: opt.id,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg font-mono text-left border transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-400 text-amber-100 font-bold'
                            : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="text-[11px] flex items-center justify-between gap-1">
                          <span>{opt.label}</span>
                          {isSelected && (
                            <Check className="w-3 h-3 text-amber-300 shrink-0" />
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-snug">
                          {opt.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dial 3: Evening Pulse Check Sensitivity */}
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5">
                <div className="text-[11px] font-mono font-bold text-slate-200">
                  3. Evening Pulse Check Sensitivity
                </div>
                <div className="flex flex-col gap-1">
                  {(
                    [
                      {
                        id: 'STANDARD_20_40_60' as EveningPulseSensitivity,
                        label: 'Standard (20m & 40m soft prompts, 60m hard break)',
                        sub: 'Default check-in modal at 20m & 40m marks',
                      },
                      {
                        id: 'GENTLE_40_60' as EveningPulseSensitivity,
                        label: 'Gentle (40m soft prompt, 60m hard break)',
                        sub: 'Auto-rolls 20m milestone chime into 40m prompt',
                      },
                    ]
                  ).map((opt) => {
                    const activePulse =
                      state.flexibilityTuning?.eveningPulseSensitivity ??
                      'STANDARD_20_40_60';
                    const isSelected = activePulse === opt.id;
                    return (
                      <button
                        key={opt.id}
                        id={`btn-evening-pulse-${opt.id}`}
                        type="button"
                        onClick={() =>
                          handleUpdateFlexibilityTuning({
                            eveningPulseSensitivity: opt.id,
                          })
                        }
                        className={`px-2.5 py-1.5 rounded-lg font-mono text-left border transition cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100 font-bold'
                            : 'bg-slate-950/80 hover:bg-slate-800 border-slate-800 text-slate-300'
                        }`}
                      >
                        <div className="text-[11px] flex items-center justify-between gap-1">
                          <span>{opt.label}</span>
                          {isSelected && (
                            <Check className="w-3 h-3 text-emerald-300 shrink-0" />
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-normal mt-0.5 leading-snug">
                          {opt.sub}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Pro Mode & AI Access Section */}
          <div
            id="settings-gemini-api-key-section"
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Pro Mode &amp; AI Access</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {proModeUnlocked
                  ? '✓ Priority 1: Pro Mode Active (/api/gemini-pro)'
                  : getStoredGeminiApiKey()
                  ? '✓ Priority 2: Personal BYOK Key saved'
                  : getEnvGeminiApiKey()
                  ? '✓ Priority 2: VITE_GEMINI_API_KEY env fallback'
                  : 'Priority 3: Offline Deterministic Parser'}
              </span>
            </div>

            {/* Card 1: Unlock Pro Mode (Cloudflare Secret) */}
            <div
              id="settings-pro-mode-card"
              className={`p-3 rounded-xl border space-y-2 ${
                proModeUnlocked
                  ? 'bg-emerald-950/30 border-emerald-500/40'
                  : 'bg-slate-900/70 border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="input-pro-mode-password"
                  className="text-xs font-mono font-bold text-emerald-300 flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Unlock Pro Mode (Cloudflare Secret)</span>
                </label>
                {proModeUnlocked ? (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 text-[10px] font-mono font-bold">
                    PRO UNLOCKED
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-slate-400">
                    Server-verified via /api/gemini-pro
                  </span>
                )}
              </div>

              {proModeUnlocked ? (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                  <p className="text-[11px] font-mono text-emerald-200/90">
                    Pro Mode is active. Requests route through Cloudflare Pages Function <code className="text-emerald-300">/api/gemini-pro</code> using server-side <code className="text-emerald-300">GEMINI_API_KEY</code>.
                  </p>
                  <button
                    id="btn-lock-pro-mode"
                    type="button"
                    onClick={() => {
                      lockProMode();
                      setProModeUnlocked(false);
                      setProPasswordInput('');
                      setProVerifyError(null);
                      setApiKeyVersion((v) => v + 1);
                      showNotice('Locked Pro Mode and cleared local token.');
                    }}
                    className="px-3 py-1.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-200 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Pro Mode</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="input-pro-mode-password"
                      type="password"
                      value={proPasswordInput}
                      onChange={(e) => {
                        setProPasswordInput(e.target.value);
                        if (proVerifyError) setProVerifyError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && proPasswordInput.trim() && !proVerifyLoading) {
                          e.preventDefault();
                          document.getElementById('btn-unlock-pro-mode')?.click();
                        }
                      }}
                      placeholder="Enter Pro Mode password (or type /pro <password> in Cmd+K)..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
                    />
                    <button
                      id="btn-unlock-pro-mode"
                      type="button"
                      disabled={proVerifyLoading || !proPasswordInput.trim()}
                      onClick={async () => {
                        setProVerifyLoading(true);
                        setProVerifyError(null);
                        const res = await verifyProModePassword(proPasswordInput);
                        setProVerifyLoading(false);
                        if (res.ok) {
                          setProModeUnlocked(true);
                          setProPasswordInput('');
                          setApiKeyVersion((v) => v + 1);
                          playHarmonicChord();
                          showNotice('Pro Mode unlocked via Cloudflare Secret (/api/gemini-pro).');
                        } else {
                          setProVerifyError(res.error || 'Invalid Pro Mode password');
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                    >
                      {proVerifyLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5" />
                          <span>Unlock Pro</span>
                        </>
                      )}
                    </button>
                  </div>
                  {proVerifyError && (
                    <div
                      id="pro-mode-error-banner"
                      className="text-[11px] font-mono text-rose-300 bg-rose-950/60 border border-rose-500/40 rounded-lg px-2.5 py-1.5"
                    >
                      {proVerifyError}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Card 2: Use Own API Key (BYOK) */}
            <div className="p-3 rounded-xl bg-slate-900/50 border border-slate-800 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label
                  htmlFor="input-gemini-api-key"
                  className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Use Own API Key (BYOK)</span>
                </label>
                <span className="text-[11px] font-mono text-slate-400">
                  {getStoredGeminiApiKey()
                    ? '✓ Saved in localStorage'
                    : getEnvGeminiApiKey()
                    ? '✓ Using VITE_GEMINI_API_KEY env fallback'
                    : 'No personal key saved'}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  id="input-gemini-api-key"
                  type="password"
                  value={geminiApiKeyInput}
                  onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                  placeholder={
                    getEnvGeminiApiKey()
                      ? 'Fallback active (import.meta.env.VITE_GEMINI_API_KEY) — enter key to override...'
                      : 'Enter personal Gemini API key (AIza...) or leave blank for offline parser...'
                  }
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-save-gemini-api-key"
                    type="button"
                    onClick={() => {
                      setStoredGeminiApiKey(geminiApiKeyInput);
                      setApiKeyVersion((v) => v + 1);
                      showNotice(
                        geminiApiKeyInput.trim()
                          ? 'Saved personal BYOK Gemini API key to localStorage.'
                          : 'Cleared personal BYOK Gemini API key from localStorage.'
                      );
                    }}
                    className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Key</span>
                  </button>
                  {geminiApiKeyInput && (
                    <button
                      id="btn-clear-gemini-api-key"
                      type="button"
                      onClick={() => {
                        setGeminiApiKeyInput('');
                        setStoredGeminiApiKey('');
                        setApiKeyVersion((v) => v + 1);
                        showNotice('Cleared personal BYOK Gemini API key from localStorage.');
                      }}
                      className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Router Priority: <code className="text-emerald-300">1. Pro Mode (/api/gemini-pro)</code> → <code className="text-cyan-300">2. Personal BYOK Key</code> → <code className="text-amber-300">3. Offline Local Parser</code>. Pro credentials are never exported in <code className="text-sky-300">state.md</code> / <code className="text-sky-300">state.json</code>.
              </p>
            </div>
          </div>

          {/* 2-Step Guided Gemini JSON Schema Prompt Generator & Importer */}
          <div
            id="state-modal-gemini-step1-card"
            className="p-3.5 rounded-2xl bg-sky-950/25 border border-sky-500/35 space-y-2.5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono text-[10px] font-bold uppercase">
                  Step 1: Get JSON from Gemini
                </span>
                <span className="text-xs font-bold text-slate-100">
                  1-Click Gemini JSON Schema Prompt Generator
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  id="btn-state-modal-copy-gemini-prompt"
                  type="button"
                  onClick={() => {
                    const promptText = generateGeminiImportPrompt(
                      state,
                      stateModalCustomPromptRequest
                    );
                    navigator.clipboard?.writeText(promptText);
                    setStateModalStep1Copied(true);
                    window.setTimeout(
                      () => setStateModalStep1Copied(false),
                      3500
                    );
                    showNotice('Copied! Paste into Gemini to get your JSON');
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition ${
                    stateModalStep1Copied
                      ? 'bg-emerald-400 text-slate-950'
                      : 'bg-sky-400 hover:bg-sky-300 text-slate-950'
                  }`}
                >
                  {stateModalStep1Copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 shrink-0 stroke-[2.5]" />
                      <span>Copied! Paste into Gemini to get your JSON</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 shrink-0" />
                      <span>Copy Prompt for Gemini</span>
                    </>
                  )}
                </button>
                <button
                  id="btn-state-modal-copy-prompt-open-gemini"
                  type="button"
                  onClick={async () => {
                    const promptText = generateGeminiImportPrompt(
                      state,
                      stateModalCustomPromptRequest
                    );
                    navigator.clipboard?.writeText(promptText);
                    setStateModalStep1Copied(true);
                    window.setTimeout(
                      () => setStateModalStep1Copied(false),
                      3500
                    );
                    showNotice('Copied! Paste into Gemini to get your JSON');
                    const isMobile =
                      typeof navigator !== 'undefined' &&
                      /Android|iPhone|iPad|iPod/i.test(
                        navigator.userAgent || ''
                      );
                    if (
                      isMobile &&
                      typeof navigator !== 'undefined' &&
                      typeof navigator.share === 'function'
                    ) {
                      try {
                        await navigator.share({
                          title: 'Symmetrical Productivity Gemini Prompt',
                          text: promptText,
                        });
                        return;
                      } catch {
                        // Fall back to opening web tab
                      }
                    }
                    if (typeof window !== 'undefined') {
                      window.open(
                        'https://gemini.google.com/app',
                        '_blank',
                        'noopener,noreferrer'
                      );
                    }
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-sky-400/40 text-sky-200 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Copy Prompt &amp; Open Gemini ↗</span>
                </button>
              </div>
            </div>

            <input
              id="input-state-modal-custom-gemini-instructions"
              type="text"
              value={stateModalCustomPromptRequest}
              onChange={(e) => setStateModalCustomPromptRequest(e.target.value)}
              placeholder="Optional: Add specific instructions for Gemini (e.g., 'Plan my week around Thursday's exam')..."
              className="w-full px-3 py-1.5 rounded-xl bg-slate-950/90 border border-slate-700 focus:border-sky-400 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />

            <textarea
              id="textarea-state-modal-gemini-prompt-preview"
              readOnly
              rows={5}
              value={generateGeminiImportPrompt(
                state,
                stateModalCustomPromptRequest
              )}
              className="w-full p-2.5 rounded-xl bg-slate-950/90 border border-slate-800 text-slate-300 font-mono text-[11px] leading-relaxed focus:outline-none resize-y"
            />
          </div>

          <p className="text-xs text-slate-400">
            <strong>Step 2: Paste Gemini&apos;s JSON Response</strong> (or 3-part <code className="text-sky-300">state.md</code>) below, or click <strong>Paste from Clipboard &amp; Apply</strong> to strip markdown fences, validate, and apply with a saved Undo snapshot.
          </p>

          {/* Primary State Sync Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <button
              id="btn-state-modal-paste-clipboard-apply"
              type="button"
              onClick={async () => {
                let candidateRaw = stateIoText.trim();
                try {
                  if (
                    typeof navigator !== 'undefined' &&
                    navigator.clipboard?.readText
                  ) {
                    const clip = await navigator.clipboard.readText();
                    if (clip && clip.trim()) {
                      candidateRaw = clip.trim();
                      setStateIoText(candidateRaw);
                    }
                  }
                } catch {
                  // Fall back to existing stateIoText
                }
                if (!candidateRaw) {
                  showNotice(
                    'Clipboard is empty — paste Gemini’s JSON response into the textarea first.'
                  );
                  return;
                }
                try {
                  const updatedBackups = pushStateBackup(
                    state,
                    'JSON_IMPORT',
                    `Before Gemini JSON Import (${
                      state.profileName || 'Active State'
                    })`
                  );
                  const stripped = stripMarkdownJsonFences(candidateRaw);
                  const { nextState, diffSummaryBanner } =
                    parseGeminiResponseToStatePatch(
                      stripped.startsWith('{') ? stripped : candidateRaw,
                      state
                    );
                  pushUndoSnapshot(
                    state,
                    `Before Gemini Import (${diffSummaryBanner.replace(
                      ' — Apply?',
                      ''
                    )})`
                  );
                  setState({
                    ...nextState,
                    stateBackups: updatedBackups,
                  });
                  setStateModalOpen(false);
                  showNotice(
                    `${diffSummaryBanner.replace(
                      ' — Apply?',
                      ''
                    )} (Saved Undo snapshot).`
                  );
                } catch {
                  showNotice('Invalid Gemini JSON or state.md syntax.');
                }
              }}
              className="px-3 py-2.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Paste from Clipboard &amp; Apply</span>
            </button>

            <button
              id="btn-copy-state-markdown"
              type="button"
              onClick={() => {
                const md = serializeToStateMarkdown(state);
                setStateIoText(md);
                navigator.clipboard?.writeText(md);
                showNotice('Copied 3-part state.md for Gemini to clipboard.');
              }}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-sky-600/50 text-sky-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Copy state.md for Gemini</span>
            </button>

            <button
              id="btn-download-state-markdown"
              type="button"
              onClick={() => {
                const md = serializeToStateMarkdown(state);
                setStateIoText(md);
                const blob = new Blob([md], {
                  type: 'text/markdown;charset=utf-8',
                });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'state.md';
                a.click();
                URL.revokeObjectURL(url);
                showNotice('Downloaded 3-part state.md file.');
              }}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-emerald-500/50 text-emerald-200 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Download state.md</span>
            </button>

            <button
              id="btn-import-state-payload"
              type="button"
              onClick={() => {
                try {
                  const updatedBackups = pushStateBackup(
                    state,
                    'JSON_IMPORT',
                    `Before state.md / JSON Import (${state.profileName || 'Active State'})`
                  );
                  const stripped = stripMarkdownJsonFences(stateIoText);
                  let restored: SymmetryState;
                  let summaryMsg =
                    'Parsed and imported 3-part state.md / JSON into live state (snapshot saved).';
                  try {
                    const patchRes = parseGeminiResponseToStatePatch(
                      stripped.startsWith('{') ? stripped : stateIoText,
                      state
                    );
                    restored = patchRes.nextState;
                    summaryMsg = `${patchRes.diffSummaryBanner.replace(
                      ' — Apply?',
                      ''
                    )} (snapshot saved).`;
                  } catch {
                    restored = parseFromStateInput(stateIoText);
                  }
                  pushUndoSnapshot(state, 'Before State Import');
                  setState({
                    ...restored,
                    stateBackups: updatedBackups,
                  });
                  setStateModalOpen(false);
                  showNotice(summaryMsg);
                } catch {
                  showNotice('Invalid state.md or JSON syntax.');
                }
              }}
              className="px-3 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>Import state.md / JSON</span>
            </button>

            <button
              id="btn-new-day-reset"
              type="button"
              onClick={() => {
                const updatedBackups = pushStateBackup(
                  state,
                  'NEW_DAY_RESET',
                  `Before New Day Reset (${state.logicalDayKey})`
                );
                const tomorrowDay = state.pipelineDays[1];
                const appliedDeduction =
                  state.recharge.flowExtensionBlocksLoggedToday >= 3
                    ? 2
                    : state.recharge.flowExtensionBlocksLoggedToday >= 2
                    ? 1
                    : tomorrowDay?.deductedBlocksFromExtension ?? 0;
                const baseCeiling =
                  tomorrowDay?.baseTargetBlocks ??
                  (state.loadMode === 'SURGE'
                    ? 14
                    : state.loadMode === 'TAPER'
                    ? 8
                    : state.cruisePlus
                    ? 13
                    : 12);
                const newCeiling = Math.max(7, baseCeiling - appliedDeduction);

                const preservedStickySlots = Object.fromEntries(
                  Object.entries(state.recharge.stickySlots).map(([k, slot]) => [
                    k,
                    {
                      ...slot,
                      fiveMinStarts: slot.fiveMinStarts, // Preserves [X/3] counter
                      unlockedViaCheckIn: false,
                    },
                  ])
                ) as SymmetryState['recharge']['stickySlots'];

                const primaryProject = state.projectQueue[0];

                const nextState: SymmetryState = {
                  ...state,
                  stateBackups: updatedBackups,
                  logicalDayKey: getLogicalDayKey(
                    new Date(),
                    state.logicalDayRolloverHour ?? 4
                  ),
                  // Preserve consecutive Surge day counts & 4-Rung Roadmap totals
                  surgeConsecutiveDays: state.surgeConsecutiveDays,
                  roadmapTracks: state.roadmapTracks,
                  // Apply today's block ceiling (with Flow Extension deductions from last night)
                  customModeBlockAdjustment: newCeiling,
                  shockAbsorberMode: 'FULL_SHIFT',
                  // Reset daily floor checkboxes & daily counters to 0
                  midDayResetCompletedToday: false,
                  flashcardsReviewedCount: 0,
                  earlyClearanceEnabled: false,
                  discretionaryBlocksCompletedToday: 0,
                  dailySovereignDripDone: false,
                  dailyAmbitionDrip: {
                    ...getEffectiveDailyAmbitionDrip(state),
                    completedToday: 0,
                  },
                  todayBlockLog: [],
                  baselineBlocks: state.baselineBlocks.map((b) => ({
                    ...b,
                    completed: false,
                    completedBlocks: 0,
                    partialCredit: 0,
                    bankedViaEarlyClearance: false,
                    reallocatedViaEarlyClearance: false,
                    reallocatedBlocksCount: 0,
                  })),
                  pipelineDays: state.pipelineDays.map((d, idx) =>
                    idx === 0
                      ? {
                          ...d,
                          baseTargetBlocks: newCeiling,
                          completedBlocks: 0,
                          deductedBlocksFromExtension: appliedDeduction,
                        }
                      : idx === 1
                      ? {
                          ...d,
                          deductedBlocksFromExtension: 0,
                        }
                      : d
                  ),
                  timer: {
                    ...state.timer,
                    mode: 'WORK_20M',
                    workStage: 'IGNITION_5M',
                    secondsLeft: 300,
                    targetEndTimeMs: null,
                    isRunning: false,
                    chainedBlocksCount: 0,
                    elasticMultiplier: 1.0,
                    startupShrinkLevel: 1,
                    activeBlockSourceId: primaryProject?.id || 'fc_anat_1',
                    activeTaskTitle:
                      primaryProject?.title || 'Core Flashcards — Block 1/1',
                    activeTaskType: primaryProject ? 'PROJECT' : 'FLASHCARDS',
                    activeStartupPrompt: primaryProject
                      ? getProjectActiveStartupStep(primaryProject)
                      : 'Open deck + clear first 15 cards',
                    queuedRecoveryFlashcard5m: false,
                    recoveryFlashcardRunning: false,
                    recoveryFlashcardSecondsLeft: 300,
                    recoveryFlashcardTargetEndTimeMs: null,
                  },
                  recharge: {
                    ...state.recharge,
                    endOfShiftLocked: false,
                    manualEveningPreview: false,
                    flowExtensionPromptOpen: false,
                    flowExtensionActive: false,
                    flowExtensionRunning: false,
                    flowExtensionElapsedSeconds: 0,
                    flowExtensionStartTimeMs: null,
                    flowExtensionBlocksLoggedToday: 0,
                    option0Running: false,
                    option0SecondsLeft: 1200,
                    option0TargetEndTimeMs: null,
                    option0ConsecutiveWindows: 0,
                    forkCheckModalOpen: false,
                    activeCategory: 'NONE',
                    pacingStage: 'STARTUP_5M',
                    categorySecondsLeft: 300,
                    categoryTargetEndTimeMs: null,
                    categoryElapsedMinutes: 0,
                    categoryRunning: false,
                    checkInModalOpen: false,
                    stickySlots: preservedStickySlots,
                  },
                };
                setState(nextState);
                setStateIoText(serializeToStateMarkdown(nextState));
                setStateModalOpen(false);
                showNotice(
                  `New Day Reset complete (snapshot saved): Daily floor reset to 0/${state.baselineBlocks.length}, ceiling set to ${newCeiling} blocks${
                    appliedDeduction > 0
                      ? ` (-${appliedDeduction} Flow Extension deduction applied)`
                      : ''
                  }, Roadmap & Sticky [X/3] counters preserved.`
                );
              }}
              className="px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 shrink-0" />
              <span>New Day Reset</span>
            </button>
          </div>

          <textarea
            id="textarea-state-io"
            rows={10}
            value={stateIoText}
            onChange={(e) => setStateIoText(e.target.value)}
            className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:outline-none"
          />

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setStateIoText(serializeToStateMarkdown(state))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs cursor-pointer"
              >
                Format as 3-Part state.md
              </button>
              <button
                type="button"
                onClick={() =>
                  setStateIoText(
                    JSON.stringify(stripProSecretsFromStateObject(state), null, 2)
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs cursor-pointer"
              >
                Format as JSON
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Supports Gemini JSON Schema, 3-Part state.md, and full JSON payload
            </span>
          </div>
        </div>
      </MobileBottomSheet>

      {/* Profile Archetype & Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={onboardingWizardOpen}
        isFirstVisit={isFirstVisitOnboarding}
        state={state}
        architectModeUnlocked={architectModeUnlocked}
        onLockArchitectMode={handleLockArchitectMode}
        onOpenConversationalArchitect={() => {
          try {
            localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
          } catch {
            // Ignore storage errors
          }
          setIsFirstVisitOnboarding(false);
          setOnboardingWizardOpen(false);
          setConversationalArchitectOpen(true);
        }}
        onClose={() => {
          try {
            localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
          } catch {
            // Ignore storage errors
          }
          setIsFirstVisitOnboarding(false);
          setOnboardingWizardOpen(false);
        }}
        onApplyPreset={handleApplyProfilePreset}
        onUpdateDayBoundaryPreferences={handleUpdateDayBoundaryPreferences}
      />

      {/* System 2: Empirical Insights Telemetry Drawer & 90-Day Symmetry Heatmap */}
      <InsightsModal
        isOpen={insightsModalOpen}
        onClose={() => setInsightsModalOpen(false)}
        state={state}
        isEvening={isEveningTheme}
      />

      {/* System 5: Keyboard Shortcut Cheat-Sheet (? / Cmd+K) */}
      <KeyboardShortcutModal
        isOpen={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
        isEvening={isEveningTheme}
        handlers={{
          onToggleStartPause: () => {
            const now = Date.now();
            setState((prev) => {
              const nextRunning = !prev.timer.isRunning;
              const currentSec =
                prev.timer.isRunning && prev.timer.targetEndTimeMs
                  ? Math.max(
                      0,
                      Math.ceil((prev.timer.targetEndTimeMs - now) / 1000)
                    )
                  : prev.timer.secondsLeft;
              return {
                ...prev,
                timer: {
                  ...prev.timer,
                  isRunning: nextRunning,
                  secondsLeft: currentSec,
                  targetEndTimeMs: nextRunning
                    ? now + currentSec * 1000
                    : null,
                },
              };
            });
          },
          onToggleCinemaFocus: () => setCinemaFocusMode((prev) => !prev),
          onTriggerBreak: () => {
            const now = Date.now();
            setState((prev) => {
              const breakMode =
                prev.timer.chainedBlocksCount >= 2 ? 'BREAK_L2' : 'BREAK_L1';
              const durationSec =
                breakMode === 'BREAK_L2'
                  ? prev.timer.l2DurationMinutes * 60
                  : prev.timer.l1DurationMinutes * 60;
              return {
                ...prev,
                timer: {
                  ...prev.timer,
                  mode: breakMode,
                  secondsLeft: durationSec,
                  targetEndTimeMs: now + durationSec * 1000,
                  isRunning: true,
                  chainedBlocksCount: breakMode === 'BREAK_L1' ? 2 : 0,
                },
              };
            });
            setActiveTab('TIMER');
            showNotice('Started Break timer.');
          },
          onTriggerStressReset: () => {
            const now = Date.now();
            setState((prev) => {
              const mins = prev.timer.stressDurationMinutes || 15;
              return {
                ...prev,
                timer: {
                  ...prev.timer,
                  mode: 'STRESS_RESET',
                  stressProtocol: 'BREATHING_478',
                  stressDurationMinutes: mins,
                  secondsLeft: mins * 60,
                  targetEndTimeMs: now + mins * 60 * 1000,
                  isRunning: true,
                },
              };
            });
            setActiveTab('TIMER');
            showNotice('Started 15m 4-7-8 Stress / Fatigue Reset.');
          },
          onFocusSmartIntake: () => {
            setActiveTab('PIPELINE');
            window.setTimeout(() => {
              const el = document.getElementById(
                'pipeline-intake-input'
              ) as HTMLInputElement | null;
              el?.focus();
              el?.select();
            }, 40);
          },
          onToggleAiAssistant: () => setAssistantDrawerOpen((prev) => !prev),
          onTriggerUndo: handleTriggerUndo,
          onLaunchSpotlightTour: () => setSpotlightTourOpen(true),
        }}
      />

      {/* System 5: 4-Step Interactive Spotlight Tour ("How Symmetrical Works") */}
      <SpotlightTourModal
        isOpen={spotlightTourOpen}
        onClose={() => setSpotlightTourOpen(false)}
        onSelectTab={(tab) => setActiveTab(tab)}
        onOpenShortcutsModal={() => setShortcutsModalOpen(true)}
        isEvening={isEveningTheme}
      />

      {/* Raycast-Style Command Dock & Smart Intake Palette (Cmd/Ctrl + K) */}
      <CommandPaletteModal
        isOpen={commandDockOpen}
        onClose={() => setCommandDockOpen(false)}
        state={state}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onToggleTimerRun={() => {
          const now = Date.now();
          setState((prev) => {
            const nextRunning = !prev.timer.isRunning;
            const currentSecondsLeft =
              prev.timer.isRunning && prev.timer.targetEndTimeMs
                ? Math.max(0, Math.ceil((prev.timer.targetEndTimeMs - now) / 1000))
                : prev.timer.secondsLeft;
            return {
              ...prev,
              timer: {
                ...prev.timer,
                isRunning: nextRunning,
                secondsLeft: currentSecondsLeft,
                targetEndTimeMs: nextRunning
                  ? now + currentSecondsLeft * 1000
                  : null,
              },
            };
          });
        }}
        onResetCurrentStage={() =>
          setState((prev) => ({
            ...prev,
            timer: {
              ...prev.timer,
              isRunning: false,
              targetEndTimeMs: null,
              secondsLeft:
                prev.timer.mode === 'WORK_20M'
                  ? prev.timer.workStage === 'IGNITION_5M'
                    ? 300
                    : 900
                  : prev.timer.mode === 'BREAK_L1'
                  ? prev.timer.l1DurationMinutes * 60
                  : prev.timer.mode === 'BREAK_L2'
                  ? prev.timer.l2DurationMinutes * 60
                  : prev.timer.mode === 'BREAK_L3'
                  ? prev.timer.l3DurationMinutes * 60
                  : prev.timer.stressDurationMinutes * 60,
            },
          }))
        }
        onFastForwardCurrentStage={handleFastForwardTimerStage}
        cinemaFocusMode={cinemaFocusMode}
        onToggleCinemaFocusMode={() => setCinemaFocusMode((prev) => !prev)}
        onOpenMiniHudPip={() => void miniHudController.onToggleMiniHud()}
        isMiniHudOpen={miniHudController.isMiniHudOpen}
        onSelectLoadMode={(mode, targetBlocks) =>
          handleSelectLoadMode(mode, targetBlocks, false)
        }
        onTriggerStressReset={() => {
          const now = Date.now();
          setState((prev) => ({
            ...prev,
            timer: {
              ...prev.timer,
              mode: 'STRESS_RESET',
              stressProtocol: 'BREATHING_478',
              stressDurationMinutes: 15,
              secondsLeft: 900,
              targetEndTimeMs: now + 900 * 1000,
              isRunning: true,
            },
          }))
          showNotice(
            'Suspended heavy reading/writing → Started 15m 4-7-8 Stress / Fatigue Reset.'
          );
        }}
        smartIntakeText={smartIntakeText}
        onChangeSmartIntakeText={setSmartIntakeText}
        smartIntakePreview={smartIntakePreview}
        onSetSmartIntakePreview={setSmartIntakePreview}
        onApplySmartIntakePlan={handleApplySmartIntakePlan}
        onOpenConversationalArchitect={() =>
          setConversationalArchitectOpen(true)
        }
        onOpenGeminiBridgeModal={() => setGeminiBridgeOpen(true)}
        onUnlockArchitectMode={handleUnlockArchitectMode}
        onProModeStatusChange={(unlocked, msg) => {
          setProModeUnlocked(unlocked);
          setApiKeyVersion((v) => v + 1);
          if (msg) showNotice(msg);
        }}
      />

      {/* Conversational Setup & Live Workspace Architect (Cmd/Ctrl + Shift + K) */}
      <ConversationalArchitectModal
        isOpen={conversationalArchitectOpen}
        onClose={() => setConversationalArchitectOpen(false)}
        state={state}
        isEveningTheme={isEveningTheme}
        canUndo={undoStackRef.current.length > 0 || Boolean(undoToast)}
        onTriggerUndo={handleTriggerUndo}
        onApplyCustomizedState={(nextState, undoSummary, layoutOverride) => {
          setState((prev) => {
            const snapshotPrev: SymmetryState = {
              ...prev,
              uiLayoutMode:
                prev.uiLayoutMode ||
                (layoutMode === 'COMPACT' ? 'widget' : 'full'),
            };
            const updatedBackups = pushStateBackup(
              snapshotPrev,
              'CONVERSATIONAL_ARCHITECT',
              `Before AI Architect (${undoSummary})`
            );
            pushUndoSnapshot(
              snapshotPrev,
              `AI Architect Applied (${undoSummary}) — Press Cmd/Ctrl+Z to revert`
            );
            return {
              ...nextState,
              stateBackups: updatedBackups,
            };
          });

          if (layoutOverride) {
            const targetLayout: LayoutMode =
              layoutOverride === 'widget' ? 'COMPACT' : 'FULL';
            setLayoutMode(targetLayout);
            try {
              localStorage.setItem('symmetrical_layout_mode', targetLayout);
            } catch {
              // Ignore storage errors
            }
          }

          showNotice(
            `Applied AI Workspace Customization: ${undoSummary} (Cmd/Ctrl+Z to revert).`
          );
        }}
      />

      {/* Global Window Drag-and-Drop state.md / .json Overlay */}
      {isGlobalFileDragOver && (
        <div
          id="global-gemini-file-drop-overlay"
          className="fixed inset-0 z-[70] bg-slate-950/85 backdrop-blur-md border-4 border-dashed border-emerald-400 flex items-center justify-center p-6 pointer-events-none"
        >
          <div className="w-full p-6 rounded-3xl bg-emerald-950/60 border border-emerald-400/50 text-center flex flex-col items-center space-y-2 shadow-[0_0_50px_rgba(52,211,153,0.35)]">
            <Upload className="w-10 h-10 text-emerald-300" />
            <div className="text-lg font-mono font-bold text-emerald-100">
              Drop <code className="text-emerald-300">state.md</code> or{' '}
              <code className="text-emerald-300">.json</code> to Preview &amp; Sync from Gemini
            </div>
            <p className="text-xs font-mono text-emerald-200/80">
              Automatically parses Format A (JSON), Format B (state.md), or Format C (Conversational Plan) with 1-tap Undo protection.
            </p>
          </div>
        </div>
      )}

      {/* Export to Gemini & Bidirectional Sync Hub (Cmd/Ctrl + G or Cmd/Ctrl + Shift + V) */}
      <GeminiBridgeModal
        isOpen={geminiBridgeOpen}
        onClose={() => setGeminiBridgeOpen(false)}
        state={state}
        initialTab={geminiBridgeInitialTab}
        initialImportText={geminiBridgeInitialImportText}
        initialImportSourceLabel={geminiBridgeSourceLabel}
        onApplyImportedState={(nextState, summary) => {
          setState((prev) => {
            const updatedBackups = pushStateBackup(
              prev,
              'JSON_IMPORT',
              `Before Gemini Sync (${summary})`
            );
            pushUndoSnapshot(
              prev,
              `Gemini Sync Applied (${summary.replace(' — Apply?', '')}) — Press Cmd/Ctrl+Z to revert`
            );
            return {
              ...nextState,
              stateBackups: updatedBackups,
            };
          });
        }}
        onChangeBandwidth={(bandwidth) =>
          setState((prev) => ({
            ...prev,
            bandwidth,
            energyBandwidth:
              bandwidth === 'Low'
                ? 'LOW_FOGGY'
                : bandwidth === 'Steady'
                ? 'STEADY'
                : 'SHARP',
          }))
        }
        onShowNotice={showNotice}
        isEveningTheme={isEveningTheme}
      />

      {/* Connect Firebase Cloud Sync Modal (When VITE_FIREBASE_* is not yet set in .env.local or Cloudflare Worker vars) */}
      {firebaseSetupModalOpen && (
        <div
          id="firebase-setup-modal"
          className="fixed inset-0 z-[75] bg-black/75 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="w-full max-w-lg rounded-2xl bg-[#080b12] border border-white/10 p-6 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-3">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400">
                  CLOUD FIRESTORE SETUP
                </span>
                <h3 className="text-lg font-semibold tracking-tight text-white">
                  Connect Google Sign-In &amp; Cloud Sync
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setFirebaseSetupModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.06] flex items-center justify-center text-slate-300 cursor-pointer"
                aria-label="Close Firebase Setup Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Paste your Firebase Web App config object (
              <code className="font-mono text-sky-300">
                const firebaseConfig = &#123; ... &#125;
              </code>
              ) from the Firebase Console, or your{' '}
              <code className="font-mono text-sky-300">VITE_FIREBASE_*</code>{' '}
              keys below. You can also set them in{' '}
              <code className="font-mono text-slate-200">.env.local</code> or
              Cloudflare Worker variables.
            </p>

            <textarea
              id="input-firebase-config-paste"
              rows={7}
              value={firebaseConfigDraft}
              onChange={(e) => setFirebaseConfigDraft(e.target.value)}
              placeholder={`VITE_FIREBASE_API_KEY=AIzaSy...\nVITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com\nVITE_FIREBASE_PROJECT_ID=your-project\nVITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app\nVITE_FIREBASE_MESSAGING_SENDER_ID=123456789\nVITE_FIREBASE_APP_ID=1:123456789:web:abcdef`}
              className="w-full rounded-xl bg-black/50 border border-white/10 p-3 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400/60"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setFirebaseSetupModalOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] text-xs font-medium text-slate-300 cursor-pointer"
              >
                Continue in Local Mode
              </button>
              <button
                id="btn-save-firebase-config-signin"
                type="button"
                onClick={() => {
                  void connectFirebaseWithConfig(firebaseConfigDraft);
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <span>Connect &amp; Sign in with Google</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


