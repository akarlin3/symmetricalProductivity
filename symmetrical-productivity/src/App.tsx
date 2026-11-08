import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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
  CompletedDeliverableEntry,
  FixedEventType,
  Level2BreakProtocol,
  LoadMode,
  MediaSubTrackId,
  PipelineDay,
  ProfilePresetId,
  ProjectPresetType,
  RechargeCategoryId,
  SmartIntakePlanResult,
  SoundscapeMode,
  StickyKey,
  StressResetProtocol,
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
  DEFAULT_SYMMETRY_STATE,
  formatRolloverHourLabel,
  generateSequentialChecklist,
  getLogicalDayKey,
  getPreExamTaperSuggestion,
  loadExternalStateBackups,
  parseFromStateInput,
  pushStateBackup,
  serializeToStateMarkdown,
  STORAGE_KEY,
  syncTodayIntoDailyHistory,
  validateAndRestoreStateSnapshot,
} from './state/defaultState';
import {
  buildStateForPreset,
  CustomArchitectureDraft,
  ONBOARDING_COMPLETED_KEY,
  PROFILE_PRESET_METADATA,
} from './state/profilePresets';
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
import { SOUNDSCAPE_METADATA, soundEngine } from './utils/soundEngine';
import { DualRingTimerSvg } from './components/DualRingTimerSvg';
import { HeaderBar } from './components/HeaderBar';
import { InsightsModal } from './components/InsightsModal';
import { KeyboardShortcutModal } from './components/KeyboardShortcutModal';
import { MobileBottomSheet } from './components/MobileBottomSheet';
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

export const LIVE_SYNC_CHANNEL_NAME = 'symmetrical_live_state';

export function App() {
  const [state, setState] = useState<SymmetryState>(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = parseFromStateInput(saved);
          const externalBackups = loadExternalStateBackups();
          return {
            ...parsed,
            dailyHistory: syncTodayIntoDailyHistory(parsed),
            stateBackups:
              parsed.stateBackups && parsed.stateBackups.length > 0
                ? parsed.stateBackups
                : externalBackups,
          };
        }
      }
    } catch {
      // Fallback to default deterministic state
    }
    return DEFAULT_SYMMETRY_STATE;
  });

  const [activeTab, setActiveTab] = useState<TabId>('PIPELINE');
  const [todayLogDrawerOpen, setTodayLogDrawerOpen] = useState(false);
  const [pipelineDrawerOpen, setPipelineDrawerOpen] = useState(false);
  const [assistantDrawerOpen, setAssistantDrawerOpen] = useState(false);
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [onboardingWizardOpen, setOnboardingWizardOpen] = useState(false);
  const [isFirstVisitOnboarding, setIsFirstVisitOnboarding] = useState(false);
  const [insightsModalOpen, setInsightsModalOpen] = useState(false);
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
  const [spotlightTourOpen, setSpotlightTourOpen] = useState(false);
  const [cinemaFocusOpen, setCinemaFocusOpen] = useState(false);
  const [stateIoText, setStateIoText] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [notificationLog, setNotificationLog] = useState<NotificationLogEntry[]>([]);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [swOfflineReady, setSwOfflineReady] = useState(false);
  // Document Picture-in-Picture & Floating Corner Fallback state
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [floatingMiniHudOpen, setFloatingMiniHudOpen] = useState(false);

  // Smart Intake & Week Planner state + Gemini API Key storage
  const [smartIntakeText, setSmartIntakeText] = useState('');
  const [smartIntakePreview, setSmartIntakePreview] =
    useState<SmartIntakePlanResult | null>(null);
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState<string>(() =>
    getStoredGeminiApiKey()
  );
  const [apiKeyVersion, setApiKeyVersion] = useState(0);

  // Cross-Tab Live Sync (BroadcastChannel) refs
  const tabIdRef = useRef<string>(
    `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  );
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);
  const isReceivingRemoteSyncRef = useRef<boolean>(false);
  const lastBroadcastSignatureRef = useRef<string>('');

  // 10-Second Undo Toast Stack & Countdown
  const undoStackRef = useRef<SymmetryState[]>([]);
  const [undoToast, setUndoToast] = useState<UndoToastState | null>(null);
  const [undoSecondsLeft, setUndoSecondsLeft] = useState<number>(10);

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

  const handleTriggerUndo = useCallback(() => {
    const [latestSnapshot, ...rest] = undoStackRef.current;
    if (!latestSnapshot) return;
    undoStackRef.current = rest;
    soundEngine.playTactileClick('MODE_TOGGLE');
    setState(latestSnapshot);
    setUndoToast(null);
    setStatusNotice('Undid last action — restored previous block counter, countdown, and Roadmap totals.');
  }, []);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
  };

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
        const examCheck = getPreExamTaperSuggestion(new Date());
        if (examCheck.isWithin3Days) {
          showNotice(
            `Within ${examCheck.daysUntil}d of ${examCheck.examLabel} — Pre-Exam Taper Auto-Mode suggested.`
          );
        }
      }
    }
  }, []);

  const handleApplyProfilePreset = (
    presetId: ProfilePresetId,
    options?: {
      logicalDayRolloverHour?: number;
      earlyEveningShutdownTime?: string;
      customDraft?: CustomArchitectureDraft;
    }
  ) => {
    triggerHaptic([15]);
    soundEngine.playTactileClick('MODE_TOGGLE');
    setState((prev) => {
      const updatedBackups = pushStateBackup(
        prev,
        'PRESET_SWITCH',
        `Before switching profile to ${presetId}`
      );
      const nextState = buildStateForPreset(presetId, {
        logicalDayRolloverHour:
          options?.logicalDayRolloverHour ?? prev.logicalDayRolloverHour ?? 4,
        earlyEveningShutdownTime:
          options?.earlyEveningShutdownTime ??
          prev.earlyEveningShutdownTime ??
          '6:00 PM',
        customDraft: options?.customDraft,
      });
      pushUndoSnapshot(
        prev,
        `Switched Profile Archetype → ${nextState.profileName || presetId}`
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
    const meta = PROFILE_PRESET_METADATA.find((p) => p.id === presetId);
    showNotice(
      `Applied Profile Template: ${
        options?.customDraft?.profileName || meta?.title || presetId
      } (Snapshot saved to Auto-Backups).`
    );
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

  // System 4: Cross-Tab Live Sync via BroadcastChannel('symmetrical_live_state')
  useEffect(() => {
    if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
      return;
    }
    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(LIVE_SYNC_CHANNEL_NAME);
      broadcastChannelRef.current = channel;
      channel.onmessage = (event) => {
        const data = event.data;
        if (
          !data ||
          data.senderTabId === tabIdRef.current ||
          !data.state ||
          typeof data.state !== 'object'
        ) {
          return;
        }
        isReceivingRemoteSyncRef.current = true;
        const now = Date.now();
        const incoming = data.state as SymmetryState;
        // Reconcile running timer against shared targetEndTimeMs so tabs never duplicate or drift
        const reconciledTimer = {
          ...incoming.timer,
          secondsLeft:
            incoming.timer?.isRunning && incoming.timer?.targetEndTimeMs
              ? Math.max(
                  0,
                  Math.ceil((incoming.timer.targetEndTimeMs - now) / 1000)
                )
              : incoming.timer?.secondsLeft ?? 300,
        };
        setState({
          ...incoming,
          timer: reconciledTimer,
        });
      };
    } catch {
      // BroadcastChannel unavailable in restricted context
    }
    return () => {
      if (channel) {
        channel.close();
      }
      broadcastChannelRef.current = null;
    };
  }, []);

  // Persist to localStorage & broadcast meaningful state transitions across open tabs
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }

    if (isReceivingRemoteSyncRef.current) {
      isReceivingRemoteSyncRef.current = false;
      return;
    }

    const signature = JSON.stringify({
      loadMode: state.loadMode,
      cruisePlus: state.cruisePlus,
      preExamTaperActive: state.preExamTaperActive,
      customModeBlockAdjustment: state.customModeBlockAdjustment,
      discretionaryBlocksCompletedToday: state.discretionaryBlocksCompletedToday,
      earlyClearanceEnabled: state.earlyClearanceEnabled,
      flashcardsReviewedCount: state.flashcardsReviewedCount,
      baselineBlocks: state.baselineBlocks,
      projectQueue: state.projectQueue,
      todayBlockLogLen: state.todayBlockLog?.length || 0,
      timerRunning: state.timer.isRunning,
      timerMode: state.timer.mode,
      timerWorkStage: state.timer.workStage,
      timerTargetEnd: state.timer.targetEndTimeMs,
      timerTask: state.timer.activeTaskTitle,
      recharge: state.recharge,
      roadmapTracks: state.roadmapTracks,
      audioSettings: state.audioSettings,
    });

    if (signature !== lastBroadcastSignatureRef.current) {
      lastBroadcastSignatureRef.current = signature;
      try {
        broadcastChannelRef.current?.postMessage({
          senderTabId: tabIdRef.current,
          timestamp: Date.now(),
          state,
        });
      } catch {
        // Ignore channel post errors
      }
    }
  }, [state]);

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
          baselineBlocks: prev.baselineBlocks.map((b) => ({
            ...b,
            completed: false,
            bankedViaEarlyClearance: false,
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
            activeStartupPrompt:
              primaryProject?.startupStep || 'Open deck + clear first 15 cards',
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

  // Global Keyboard Shortcuts: ? (Cheat-Sheet), Cmd+K (Command Bar), F (Cinema Focus Mode), R (Break), S (Stress Reset), Cmd+/ (AI Assistant), Cmd+J (Smart Intake), Cmd+Z (Undo), Space (Start/Pause)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        triggerHaptic([12]);
        setAssistantDrawerOpen((prev) => !prev);
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        triggerHaptic([10]);
        soundEngine.playTactileClick('MODE_TOGGLE');
        setShortcutsModalOpen((prev) => !prev);
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
        if (cinemaFocusOpen) {
          setCinemaFocusOpen(false);
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
        setCinemaFocusOpen((prev) => !prev);
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
    handleTriggerUndo,
    cinemaFocusOpen,
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

  // Helper to credit Roadmap Input (50%) or Output (50%)
  const creditRoadmapTrack = (
    prevTracks: SymmetryState['roadmapTracks'],
    trackId: TrackId,
    ledgerType: 'INPUT' | 'OUTPUT',
    rungNumber: 1 | 2 | 3 | 4 = ledgerType === 'INPUT' ? 1 : 3
  ) => {
    return prevTracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        activeThisWeek: true,
        inputBlocksCredited:
          ledgerType === 'INPUT' ? t.inputBlocksCredited + 1 : t.inputBlocksCredited,
        outputBlocksCredited:
          ledgerType === 'OUTPUT' ? t.outputBlocksCredited + 1 : t.outputBlocksCredited,
        rungs: t.rungs.map((r) =>
          r.rungNumber === rungNumber
            ? { ...r, completedBlocks: r.completedBlocks + 1 }
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
    rungNumber: 1 | 2 | 3 | 4 = ledgerType === 'INPUT' ? 1 : 3
  ) => {
    return prevTracks.map((t) => {
      if (t.id !== trackId) return t;
      return {
        ...t,
        inputBlocksCredited:
          ledgerType === 'INPUT'
            ? Math.max(0, t.inputBlocksCredited - 1)
            : t.inputBlocksCredited,
        outputBlocksCredited:
          ledgerType === 'OUTPUT'
            ? Math.max(0, t.outputBlocksCredited - 1)
            : t.outputBlocksCredited,
        rungs: t.rungs.map((r) =>
          r.rungNumber === rungNumber
            ? { ...r, completedBlocks: Math.max(0, r.completedBlocks - 1) }
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
      roadmapTrack: params.roadmapTrack,
      stroke: params.stroke,
      sourceBlockId: params.sourceBlockId,
      stickyKey: params.stickyKey,
      rungNumber: params.rungNumber,
    };
  };

  // Complete a 20m work block and route to the appropriate Break level
  const handleCompleteWorkBlockTransition = (prev: SymmetryState): SymmetryState => {
    soundEngine.playTactileClick('BLOCK_COMPLETE');
    const matchingBaseline = prev.baselineBlocks.find(
      (b) => b.id === prev.timer.activeBlockSourceId && !b.completed
    );

    let updatedBaseline = prev.baselineBlocks;
    let updatedDiscretionary = prev.discretionaryBlocksCompletedToday;
    let updatedProjects = prev.projectQueue;
    let updatedTracks = prev.roadmapTracks;
    let newLogEntry: TodayBlockLogEntry;

    if (matchingBaseline) {
      updatedBaseline = prev.baselineBlocks.map((b) =>
        b.id === matchingBaseline.id ? { ...b, completed: true } : b
      );
      const stroke: 'INPUT' | 'OUTPUT' =
        matchingBaseline.category === 'SYNTHESIS' ? 'OUTPUT' : 'INPUT';
      const rungNum: 1 | 2 | 3 | 4 =
        matchingBaseline.category === 'SYNTHESIS' ? 2 : 1;
      updatedTracks = creditRoadmapTrack(
        updatedTracks,
        matchingBaseline.trackId,
        stroke,
        rungNum
      );
      newLogEntry = createTodayLogEntry(prev, {
        category: baselineCategoryToLogCategory(matchingBaseline.category),
        title: matchingBaseline.title,
        durationMinutes: 20,
        roadmapTrack: matchingBaseline.trackId,
        stroke,
        sourceBlockId: matchingBaseline.id,
        rungNumber: rungNum,
      });
    } else {
      updatedDiscretionary += 1;
      updatedProjects = prev.projectQueue.map((p) =>
        p.slot === 1
          ? {
              ...p,
              completedBlocks: Math.min(p.totalBlocks, p.completedBlocks + 1),
            }
          : p
      );
      const primaryProj = prev.projectQueue[0];
      const primaryTrack = primaryProj?.trackId || 'writing';
      updatedTracks = creditRoadmapTrack(updatedTracks, primaryTrack, 'OUTPUT', 3);
      newLogEntry = createTodayLogEntry(prev, {
        category: 'PROJECT_FOCUS_1',
        title: primaryProj?.title || prev.timer.activeTaskTitle,
        durationMinutes: 20,
        roadmapTrack: primaryTrack,
        stroke: 'OUTPUT',
        sourceBlockId: primaryProj?.id,
        rungNumber: 3,
      });
    }

    pushUndoSnapshot(
      prev,
      `Block Logged: ${newLogEntry.title} (${newLogEntry.durationMinutes}m)`
    );

    const nextCandidate: SymmetryState = {
      ...prev,
      todayBlockLog: [...(prev.todayBlockLog || []), newLogEntry],
      baselineBlocks: updatedBaseline,
      discretionaryBlocksCompletedToday: updatedDiscretionary,
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
        },
      };
    }

    // Check chained 20m block count (max 2 chained blocks [40m] before mandatory 10-15m Level 2 break)
    if (prev.timer.chainedBlocksCount >= 2) {
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
      },
    };
  };

  // Advance Recharge Pacing: 5m Startup -> 20m Check-In -> 40m Check-In -> 60m Mandatory Break
  const advanceCategoryMilestoneInternal = (
    prev: SymmetryState,
    now = Date.now()
  ): SymmetryState => {
    const r = prev.recharge;
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
        '20m Check-In Chime',
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

        // 1. Primary Work (5m Startup / 15m Momentum) / Break (L1/L2/L3) / Stress Reset Timer
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
              // Rule 2: Auto-roll 5m Startup Step (IGNITION_5M) into 15m Momentum (MOMENTUM_15M) without stopping the timer
              dispatchLockScreenAlert(
                'ROLLOVER_5M_TO_15M',
                '5m Startup Step Complete → 15m Momentum',
                `Auto-rolling into 15m Momentum (MOMENTUM_15M) for "${prev.timer.activeTaskTitle}".`
              );
              const nextEndTimeMs = endTimeMs + 900 * 1000;
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
                '20m Work Block Complete',
                `Completed 20m block for "${prev.timer.activeTaskTitle}".`
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
              // Level 1 / 2 / 3 Break completed -> chime + return to 5m Startup Step
              dispatchLockScreenAlert(
                'BREAK_COMPLETE',
                'Break Complete → Ready for 5m Startup Step',
                'Break finished. Ready to start next 5m Startup Step (IGNITION_5M).'
              );
              next.timer = {
                ...prev.timer,
                mode: 'WORK_20M',
                workStage: 'IGNITION_5M',
                secondsLeft: 300,
                targetEndTimeMs: null,
                isRunning: false,
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
      const nextCompleted = !target.completed;
      const stroke: 'INPUT' | 'OUTPUT' =
        target.category === 'SYNTHESIS' ? 'OUTPUT' : 'INPUT';
      const rungNum: 1 | 2 | 3 | 4 = target.category === 'SYNTHESIS' ? 2 : 1;

      const updatedBaseline = prev.baselineBlocks.map((b) =>
        b.id === blockId
          ? { ...b, completed: nextCompleted, bankedViaEarlyClearance: false }
          : b
      );

      let updatedTracks = prev.roadmapTracks;
      let updatedLog = prev.todayBlockLog || [];

      if (nextCompleted) {
        updatedTracks = creditRoadmapTrack(
          updatedTracks,
          target.trackId,
          stroke,
          rungNum
        );
        const newEntry = createTodayLogEntry(prev, {
          category: baselineCategoryToLogCategory(target.category),
          title: target.title,
          durationMinutes: 20,
          roadmapTrack: target.trackId,
          stroke,
          sourceBlockId: target.id,
          rungNumber: rungNum,
        });
        updatedLog = [...updatedLog, newEntry];
        pushUndoSnapshot(prev, `Block Logged: ${target.title} (20m)`);
      } else {
        updatedTracks = debitRoadmapTrack(
          updatedTracks,
          target.trackId,
          stroke,
          rungNum
        );
        // Remove the most recent log entry for this baseline block
        const reverseIdx = [...updatedLog]
          .reverse()
          .findIndex((e) => e.sourceBlockId === target.id);
        if (reverseIdx !== -1) {
          const removeIdx = updatedLog.length - 1 - reverseIdx;
          updatedLog = updatedLog.filter((_, idx) => idx !== removeIdx);
        }
        pushUndoSnapshot(prev, `Baseline Pill Unchecked: ${target.title} (20m)`);
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
        const isFlashcard =
          b.category === 'FLASHCARDS_ANATOMY' || b.category === 'FLASHCARDS_COMP';
        if (!isFlashcard || b.completed) return b;
        return {
          ...b,
          bankedViaEarlyClearance: nextEnabled,
        };
      });
      pushUndoSnapshot(
        prev,
        nextEnabled
          ? 'Early Clearance Enabled: Unused Flashcards Banked'
          : 'Early Clearance Disabled: Flashcard Blocks Restored'
      );
      return {
        ...prev,
        earlyClearanceEnabled: nextEnabled,
        baselineBlocks: updatedBaseline,
      };
    });
    showNotice('Toggled Flashcard Early Clearance banking.');
  };

  const handleLaunchBlockInTimer = (
    sourceId: string,
    title: string,
    taskType: 'FLASHCARDS' | 'READING' | 'SYNTHESIS' | 'PROJECT',
    startupPrompt: string
  ) => {
    soundEngine.playTactileClick('MODE_TOGGLE');
    const now = Date.now();
    setState((prev) => {
      const isTaskSwitch = prev.timer.activeTaskType !== taskType;
      return {
        ...prev,
        timer: {
          ...prev.timer,
          mode: 'WORK_20M',
          workStage: 'IGNITION_5M',
          secondsLeft: 300,
          targetEndTimeMs: now + 300 * 1000,
          isRunning: true,
          activeBlockSourceId: sourceId,
          activeTaskTitle: title,
          activeTaskType: taskType,
          activeStartupPrompt: startupPrompt,
          chainedBlocksCount: isTaskSwitch ? 1 : prev.timer.chainedBlocksCount,
        },
      };
    });
    setActiveTab('TIMER');
    showNotice(`Started 5m Startup Step (IGNITION_5M) for "${title}".`);
  };

  const handleIncrementProjectBlock = (projectId: string) => {
    soundEngine.playTactileClick('BLOCK_COMPLETE');
    setState((prev) => {
      const primary = prev.projectQueue.find((p) => p.id === projectId && p.slot === 1);
      if (!primary) return prev;
      const updatedQueue = prev.projectQueue.map((p) =>
        p.slot === 1
          ? {
              ...p,
              completedBlocks: Math.min(p.totalBlocks, p.completedBlocks + 1),
            }
          : p
      );
      const updatedTracks = creditRoadmapTrack(
        prev.roadmapTracks,
        primary.trackId,
        'OUTPUT',
        3
      );
      const newEntry = createTodayLogEntry(prev, {
        category: 'PROJECT_FOCUS_1',
        title: primary.title,
        durationMinutes: 20,
        roadmapTrack: primary.trackId,
        stroke: 'OUTPUT',
        sourceBlockId: primary.id,
        rungNumber: 3,
      });
      pushUndoSnapshot(prev, `Block Logged: ${primary.title} (20m)`);
      return {
        ...prev,
        todayBlockLog: [...(prev.todayBlockLog || []), newEntry],
        discretionaryBlocksCompletedToday: prev.discretionaryBlocksCompletedToday + 1,
        projectQueue: updatedQueue,
        roadmapTracks: updatedTracks,
      };
    });
    showNotice('Logged +1 discretionary project block on Item #1 (Credited to Output).');
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

  // One-Tap Backlog Promotion & Completed Ledger Archive on Closed List Focus #1
  const handleCompleteProjectItem1 = () => {
    setState((prev) => {
      const completedItem = prev.projectQueue[0];
      const remaining = prev.projectQueue.slice(1);
      const sourceBacklog =
        prev.openListBacklog && prev.openListBacklog.length > 0
          ? prev.openListBacklog
          : prev.projectBacklog;
      const [nextFromBacklog, ...restBacklog] = sourceBacklog;

      const newQueue = remaining.map((item, index) => ({
        ...item,
        slot: (index + 1) as 1 | 2 | 3,
        nextStepNote:
          index === 0
            ? 'Promoted to Active Focus #1 — 100% of discretionary blocks locked here.'
            : 'Locked until Item #1 is marked complete.',
      }));

      if (nextFromBacklog && newQueue.length < 3) {
        newQueue.push({
          ...nextFromBacklog,
          slot: (newQueue.length + 1) as 1 | 2 | 3,
          nextStepNote:
            newQueue.length === 0
              ? 'Promoted to Active Focus #1.'
              : 'Promoted from Open Backlog into Slot #3.',
        });
      }

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

      const updatedLedger = newLedgerEntry
        ? [newLedgerEntry, ...(prev.completedDeliverablesLog ?? [])]
        : prev.completedDeliverablesLog ?? [];

      const prevArchive = prev.completedDeliverablesArchive || [];
      const nextArchive = newLedgerEntry
        ? [newLedgerEntry, ...prevArchive]
        : prevArchive;

      const updatedTracks = completedItem
        ? creditRoadmapTrack(prev.roadmapTracks, completedItem.trackId, 'OUTPUT', 4)
        : prev.roadmapTracks;

      pushUndoSnapshot(
        prev,
        `Completed Deliverable #1: ${completedItem?.title || 'Item #1'}`
      );

      return {
        ...prev,
        projectQueue: newQueue,
        projectBacklog: restBacklog,
        openListBacklog: restBacklog,
        completedDeliverablesLog: updatedLedger,
        completedDeliverablesArchive: nextArchive,
        roadmapTracks: updatedTracks,
      };
    });
    showNotice(
      'Archived Deliverable #1 to Completed Ledger, incremented 4-Rung Output bar, shifted #2 → #1, and promoted Open Backlog into Slot #3.'
    );
  };

  const handleAddProjectToQueue = (
    title: string,
    presetType: ProjectPresetType,
    totalBlocks: number,
    trackId: TrackId,
    startupStep: string
  ) => {
    setState((prev) => {
      if (prev.projectQueue.length >= 3) {
        const backlogItem = {
          id: `proj_${Date.now()}`,
          title,
          presetType,
          completedBlocks: 0,
          totalBlocks,
          trackId,
          startupStep,
          nextStepNote: 'Queued in Open List Backlog.',
        };
        const nextBacklog = [...(prev.openListBacklog ?? prev.projectBacklog), backlogItem];
        return {
          ...prev,
          projectBacklog: nextBacklog,
          openListBacklog: nextBacklog,
        };
      }
      const newSlot = (prev.projectQueue.length + 1) as 1 | 2 | 3;
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
            startupStep,
            nextStepNote:
              newSlot === 1
                ? 'Active primary target.'
                : 'Locked until Item #1 completes.',
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
      const displaced = combined.slice(3).map(({ slot: _slot, ...rest }) => rest);
      const canSurge = prev.surgeConsecutiveDays < 2 || prev.loadMode === 'SURGE';
      const nextMode: LoadMode = canSurge ? 'SURGE' : prev.loadMode;
      const nextCeiling = canSurge ? 14 : prev.customModeBlockAdjustment;
      const nextBacklog = [...displaced, ...(prev.openListBacklog ?? prev.projectBacklog)];

      return {
        ...prev,
        loadMode: nextMode,
        cruisePlus: false,
        customModeBlockAdjustment: nextCeiling,
        projectQueue: nextQueue,
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
    startupStep: string
  ) => {
    setState((prev) => {
      const newBacklog = [
        ...(prev.openListBacklog ?? prev.projectBacklog),
        {
          id: `proj_${Date.now()}`,
          title,
          presetType,
          completedBlocks: 0,
          totalBlocks,
          trackId,
          startupStep,
          nextStepNote: 'Demoted to Open List backlog to preserve Cruise Mode.',
        },
      ];
      return {
        ...prev,
        projectBacklog: newBacklog,
        openListBacklog: newBacklog,
      };
    });
    showNotice(
      `Option B applied: Added "${title}" to Open List Backlog (Cruise Mode & Closed List preserved).`
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
      return {
        ...prev,
        timer: {
          ...prev.timer,
          mode: 'WORK_20M',
          workStage: 'IGNITION_5M',
          secondsLeft: 300,
          targetEndTimeMs: null,
          isRunning: false,
          chainedBlocksCount: 0,
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

  // Document Picture-in-Picture API (width: 260, height: 110) with Floating Corner Fallback
  const handleToggleMiniHudPip = async () => {
    triggerHaptic([15]);
    if (typeof window === 'undefined') return;

    if (pipWindow && !pipWindow.closed) {
      pipWindow.close();
      setPipWindow(null);
      setFloatingMiniHudOpen(false);
      showNotice('Closed Mini HUD (PiP).');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const docPip = (window as any).documentPictureInPicture;
    if (docPip && typeof docPip.requestWindow === 'function') {
      try {
        const win: Window = await docPip.requestWindow({
          width: 260,
          height: 110,
        });
        win.document.title = 'Symmetry Mini HUD';
        win.document.body.style.margin = '0';
        win.document.body.style.backgroundColor = '#060911';
        win.document.body.style.color = '#f8fafc';
        win.document.body.style.fontFamily =
          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace';
        win.document.body.style.overflow = 'hidden';

        const handlePipClose = () => {
          setPipWindow(null);
        };
        win.addEventListener('pagehide', handlePipClose);
        setPipWindow(win);
        setFloatingMiniHudOpen(true);
        showNotice('Opened Always-on-Top Mini HUD (Document Picture-in-Picture 260×110).');
        return;
      } catch {
        // Fall through to compact floating corner fallback
      }
    }

    const nextFallback = !floatingMiniHudOpen;
    setFloatingMiniHudOpen(nextFallback);
    showNotice(
      nextFallback
        ? 'Opened Floating Mini HUD (260×110 corner HUD active).'
        : 'Closed Floating Mini HUD.'
    );
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

  // Fast-forward current timer stage (5m -> 15m -> Break Router / Stress Reset -> 5m Flashcards)
  const handleFastForwardTimerStage = () => {
    const now = Date.now();
    setState((prev) => {
      if (prev.timer.mode === 'WORK_20M' && prev.timer.workStage === 'IGNITION_5M') {
        dispatchLockScreenAlert(
          'ROLLOVER_5M_TO_15M',
          '5m Startup Step Complete → 15m Momentum',
          `Auto-rolling into 15m Momentum (MOMENTUM_15M) for "${prev.timer.activeTaskTitle}".`
        );
        showNotice('5m Startup Step complete → Auto-rolled into 15m Momentum (MOMENTUM_15M).');
        return {
          ...prev,
          timer: {
            ...prev.timer,
            workStage: 'MOMENTUM_15M',
            secondsLeft: 900,
            targetEndTimeMs: now + 900 * 1000,
            isRunning: true,
          },
        };
      }
      if (prev.timer.mode === 'WORK_20M' && prev.timer.workStage === 'MOMENTUM_15M') {
        dispatchLockScreenAlert(
          'WORK_BLOCK_COMPLETE',
          '20m Work Block Complete',
          `Completed 20m block for "${prev.timer.activeTaskTitle}".`
        );
        const next = handleCompleteWorkBlockTransition(prev);
        const nextM = computeShiftMetrics(next);
        if (nextM.isZeroWorkLeft) {
          showNotice('0m work left reached! End-of-Shift Lock engaged.');
          setActiveTab('RECHARGE');
        } else {
          showNotice(
            `20m Block complete! Auto-routed to ${
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
      // Break complete -> chime + return to 5m Startup Step
      dispatchLockScreenAlert(
        'BREAK_COMPLETE',
        'Break Complete → Ready for 5m Startup Step',
        'Break finished. Ready to start next 5m Startup Step (IGNITION_5M).'
      );
      showNotice('Break complete → Ready for next 5m Startup Step (IGNITION_5M).');
      return {
        ...prev,
        midDayResetCompletedToday:
          prev.timer.mode === 'BREAK_L3' ? true : prev.midDayResetCompletedToday,
        timer: {
          ...prev.timer,
          mode: 'WORK_20M',
          workStage: 'IGNITION_5M',
          secondsLeft: 300,
          targetEndTimeMs: null,
          isRunning: false,
        },
      };
    });
  };

  return (
    <div
      className={`min-h-screen flex flex-col justify-between transition-colors duration-500 ${
        isEveningTheme
          ? 'theme-evening text-amber-50'
          : 'theme-on-duty text-slate-100'
      }`}
    >
      <div>
        <HeaderBar
          state={state}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
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
              return {
                ...DEFAULT_SYMMETRY_STATE,
                stateBackups: updatedBackups,
              };
            });
            showNotice('Reset SymmetryManager to default deterministic state (snapshot saved).');
          }}
          isEveningTheme={isEveningTheme}
        />

        {/* Status Toast Notice */}
        {statusNotice && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3">
            <div
              id="status-toast-banner"
              className={`px-3.5 py-2 rounded-2xl border backdrop-blur-xl text-xs font-mono flex items-center justify-between ${
                isEveningTheme
                  ? 'bg-amber-950/80 border-amber-500/50 text-amber-200'
                  : 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200'
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
        <main className="max-w-7xl mx-auto px-3 sm:px-6 py-5">
          {activeTab === 'PIPELINE' && (
            <Tab1Pipeline
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
              onUpdateFlashcardCount={(count) =>
                setState((prev) => ({ ...prev, flashcardsReviewedCount: count }))
              }
              onLaunchBlockInTimer={handleLaunchBlockInTimer}
              onLaunchBreakStepInTimer={handleLaunchBreakStepInTimer}
              onIncrementProjectBlock={handleIncrementProjectBlock}
              onCompleteProjectItem1={handleCompleteProjectItem1}
              onAddProjectToQueue={handleAddProjectToQueue}
              onPromoteDeliverableWithSurge={handlePromoteDeliverableWithSurge}
              onDemoteDeliverableToBacklog={handleDemoteDeliverableToBacklog}
              onRecalibrateStepDownTier={handleRecalibrateStepDownTier}
              onRecalibrateReSequenceNow={handleRecalibrateReSequenceNow}
              onOpenPipelineDrawer={() => setPipelineDrawerOpen(true)}
              onUpdatePipelineDay={handleUpdatePipelineDay}
              onOpenMiniHudPip={handleToggleMiniHudPip}
              isMiniHudOpen={Boolean(pipWindow) || floatingMiniHudOpen}
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
              onSwitchTimerMode={(mode: TimerRunMode) =>
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode,
                    isRunning: false,
                    targetEndTimeMs: null,
                    workStage: 'IGNITION_5M',
                    secondsLeft:
                      mode === 'WORK_20M'
                        ? 300
                        : mode === 'BREAK_L1'
                        ? prev.timer.l1DurationMinutes * 60
                        : mode === 'BREAK_L2'
                        ? prev.timer.l2DurationMinutes * 60
                        : mode === 'BREAK_L3'
                        ? prev.timer.l3DurationMinutes * 60
                        : prev.timer.stressDurationMinutes * 60,
                  },
                }))
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
              onSwitchTimerMode={(mode: TimerRunMode) =>
                setState((prev) => ({
                  ...prev,
                  timer: {
                    ...prev.timer,
                    mode,
                    isRunning: false,
                    targetEndTimeMs: null,
                    workStage: 'IGNITION_5M',
                    secondsLeft:
                      mode === 'WORK_20M'
                        ? 300
                        : mode === 'BREAK_L1'
                        ? prev.timer.l1DurationMinutes * 60
                        : mode === 'BREAK_L2'
                        ? prev.timer.l2DurationMinutes * 60
                        : mode === 'BREAK_L3'
                        ? prev.timer.l3DurationMinutes * 60
                        : prev.timer.stressDurationMinutes * 60,
                  },
                }))
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
              onOpenMiniHudPip={handleToggleMiniHudPip}
              isMiniHudOpen={Boolean(pipWindow) || floatingMiniHudOpen}
            />
          )}

          {activeTab === 'RECHARGE' && (
            <Tab3Recharge
              state={state}
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
                    let trackCredited: TrackId = 'personal';
                    let strokeCredited: 'INPUT' | 'OUTPUT' = 'INPUT';
                    let rungCredited: 1 | 2 | 3 | 4 = 1;
                    let rechargeTitle = 'Evening Recharge 5m Step';

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
                      trackCredited = 'personal';
                      strokeCredited = 'INPUT';
                      rungCredited = 1;
                      rechargeTitle = `${updatedSlots.CAT5_GAMING.activeTitle} (Gaming 5m Start)`;
                    } else if (r.activeCategory === 'CAT4_COMFORT') {
                      trackCredited = 'personal';
                      strokeCredited = 'INPUT';
                      rungCredited = 1;
                      rechargeTitle = `${
                        r.fluidCategories?.CAT4_COMFORT.activeTitle ||
                        "It's Always Sunny in Philadelphia"
                      } (5m Start)`;
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
            />
          )}

          {activeTab === 'ROADMAP' && (
            <Tab4Roadmap
              state={state}
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
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer
        className={`max-w-6xl w-full mx-auto px-3 sm:px-6 py-4 border-t text-[11px] font-mono tabular-nums flex flex-wrap items-center justify-between gap-2 transition-colors duration-500 ${
          isEveningTheme
            ? 'border-amber-900/40 text-stone-400'
            : 'border-slate-800/70 text-slate-400'
        }`}
      >
        <span>SymmetryManager PWA • Web &amp; Capacitor Android Ready</span>
        <span>
          Persistence: localStorage + state.md • Header: {metrics.durationPrefix}
        </span>
      </footer>

      {/* Glassmorphic Sticky Bottom Navigation for Mobile Thumb Reach */}
      <nav
        id="mobile-sticky-bottom-nav"
        aria-label="Mobile Thumb Navigation"
        className={`sm:hidden fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-xl transition-colors duration-500 ${
          isEveningTheme
            ? 'bg-[#0c0a09]/85 border-amber-900/50 text-amber-100'
            : 'bg-[#090d16]/85 border-slate-800/90 text-slate-100'
        }`}
      >
        <div className="grid grid-cols-4 gap-1 px-2 py-1.5">
          {(
            [
              {
                id: 'PIPELINE' as TabId,
                label: 'Pipeline',
                icon: ListChecks,
                badge: `${metrics.totalCompletedBlocks}/${metrics.totalTargetBlocks}`,
              },
              {
                id: 'TIMER' as TabId,
                label: 'Timer',
                icon: Timer,
                badge: `${String(Math.floor(state.timer.secondsLeft / 60)).padStart(2, '0')}:${String(
                  state.timer.secondsLeft % 60
                ).padStart(2, '0')}`,
              },
              {
                id: 'RECHARGE' as TabId,
                label: 'Recharge',
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
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  triggerHaptic([15]);
                  setActiveTab(item.id);
                }}
                className={`py-1.5 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition cursor-pointer ${
                  active
                    ? isEveningTheme
                      ? 'bg-amber-500/20 text-amber-200 border border-amber-500/50'
                      : 'bg-cyan-500/20 text-cyan-200 border border-cyan-500/50'
                    : isEveningTheme
                    ? 'text-stone-400 hover:text-amber-200'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-mono tabular-nums font-bold">
                    {item.badge}
                  </span>
                </div>
                <span className="text-[11px] font-semibold leading-tight">
                  {item.label}
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

      {/* Document Picture-in-Picture (260x110) Portal */}
      {pipWindow &&
        !pipWindow.closed &&
        createPortal(
          <div
            id="doc-pip-mini-hud"
            style={{
              width: '100%',
              height: '100vh',
              boxSizing: 'border-box',
              padding: '8px 10px',
              background: '#060911',
              color: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              fontFamily:
                'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '6px',
                fontSize: '10px',
                color: '#67e8f9',
                fontWeight: 700,
              }}
            >
              <span>
                {state.timer.mode === 'WORK_20M'
                  ? state.timer.workStage === 'IGNITION_5M'
                    ? '5m Startup'
                    : '15m Momentum'
                  : state.timer.mode}
              </span>
              <span
                style={{
                  padding: '1px 5px',
                  borderRadius: '6px',
                  background: 'rgba(6, 182, 212, 0.16)',
                  border: '1px solid rgba(34, 211, 238, 0.4)',
                  color: '#cffafe',
                  fontSize: '9px',
                }}
              >
                {metrics.durationPrefix}
              </span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 800,
                  letterSpacing: '-0.03em',
                  fontVariantNumeric: 'tabular-nums',
                  color: '#ffffff',
                }}
              >
                {`${String(Math.floor(state.timer.secondsLeft / 60)).padStart(
                  2,
                  '0'
                )}:${String(state.timer.secondsLeft % 60).padStart(2, '0')}`}
              </span>

              <div style={{ display: 'flex', gap: '5px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const now = Date.now();
                    setState((prev) => {
                      const nextRunning = !prev.timer.isRunning;
                      const currentSec =
                        prev.timer.isRunning && prev.timer.targetEndTimeMs
                          ? Math.max(
                              0,
                              Math.ceil(
                                (prev.timer.targetEndTimeMs - now) / 1000
                              )
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
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: state.timer.isRunning ? '#fbbf24' : '#22d3ee',
                    color: '#020617',
                    fontWeight: 800,
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  {state.timer.isRunning ? 'Pause' : 'Start'}
                </button>
                <button
                  type="button"
                  onClick={handleFastForwardTimerStage}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '8px',
                    border: '1px solid rgba(148, 163, 184, 0.35)',
                    background: 'rgba(255, 255, 255, 0.08)',
                    color: '#e2e8f0',
                    fontWeight: 700,
                    fontSize: '10px',
                    cursor: 'pointer',
                  }}
                >
                  Skip
                </button>
              </div>
            </div>
          </div>,
          pipWindow.document.body
        )}

      {/* Compact Floating Always-on-Top Corner Fallback Mini-Timer (260x110) */}
      {floatingMiniHudOpen && (
        <aside
          id="floating-mini-hud-pip"
          aria-label="Floating Always-on-Top Mini-Timer HUD"
          style={{ width: '260px', height: '110px' }}
          className="fixed bottom-16 sm:bottom-5 right-4 z-50 rounded-2xl bg-slate-950/95 border border-cyan-400/60 shadow-[0_12px_35px_rgba(6,182,212,0.28)] backdrop-blur-xl px-3 py-2.5 flex flex-col justify-between font-mono"
        >
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1 truncate">
              <PictureInPicture2 className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>
                {state.timer.mode === 'WORK_20M'
                  ? state.timer.workStage === 'IGNITION_5M'
                    ? '5m Startup'
                    : '15m Momentum'
                  : state.timer.mode === 'STRESS_RESET'
                  ? '4-7-8 Reset'
                  : 'Break'}
              </span>
            </span>
            <div className="flex items-center gap-1 shrink-0">
              <span
                id="mini-hud-work-left-badge"
                className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/40 text-[9px] font-bold text-cyan-200 tabular-nums"
              >
                {metrics.durationPrefix}
              </span>
              <button
                id="btn-close-floating-mini-hud"
                type="button"
                onClick={() => setFloatingMiniHudOpen(false)}
                className="p-0.5 rounded hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
                title="Close Mini HUD"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span
              id="mini-hud-countdown"
              className="text-2xl font-extrabold tabular-nums tracking-tight text-white"
            >
              {`${String(Math.floor(state.timer.secondsLeft / 60)).padStart(
                2,
                '0'
              )}:${String(state.timer.secondsLeft % 60).padStart(2, '0')}`}
            </span>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-mini-hud-pause-resume"
                type="button"
                onClick={() => {
                  triggerHaptic([10]);
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
                }}
                className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                  state.timer.isRunning
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-cyan-400 text-slate-950'
                }`}
              >
                {state.timer.isRunning ? (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>Start</span>
                  </>
                )}
              </button>

              <button
                id="btn-mini-hud-skip"
                type="button"
                onClick={() => {
                  triggerHaptic([10]);
                  handleFastForwardTimerStage();
                }}
                className="px-2 py-1 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-white/[0.15] text-cyan-200 font-mono text-[10px] font-bold flex items-center gap-0.5 cursor-pointer"
              >
                <FastForward className="w-3 h-3" />
                <span>Skip</span>
              </button>
            </div>
          </div>

          <div className="text-[9px] text-slate-400 truncate">
            {state.timer.activeTaskTitle}
          </div>
        </aside>
      )}

      {/* State Sync Modal (Settings / Profile Archetype / Day-Boundary Preferences / Rolling Auto-Backups / Gemini API Key / 3-Part state.md Compiler & Parser) */}
      <MobileBottomSheet
        isOpen={stateModalOpen}
        onClose={() => setStateModalOpen(false)}
        id="modal-state-io"
        ariaLabel="Settings, Profile Archetypes, Auto-Backups & 3-Part state.md Sync"
        maxWidthClass="max-w-3xl"
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
                    {state.profileName || 'Avery Default (Medical Physics, Writing & Maker)'}
                  </strong>{' '}
                  ({state.baselineBlocks.length}-Block Floor)
                </p>
              </div>

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

            <div className="flex flex-wrap gap-1.5 pt-1">
              {PROFILE_PRESET_METADATA.map((preset) => {
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

          {/* Gemini API Key Storage & Fallback Section */}
          <div
            id="settings-gemini-api-key-section"
            className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="input-gemini-api-key"
                className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5"
              >
                <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
                <span>Gemini 2.5 Flash API Key (localStorage: geminiApiKey)</span>
              </label>
              <span className="text-[11px] font-mono text-slate-400">
                {getStoredGeminiApiKey()
                  ? '✓ Saved in localStorage'
                  : getEnvGeminiApiKey()
                  ? '✓ Using VITE_GEMINI_API_KEY env fallback'
                  : 'No API key set (Offline Regex Parser active)'}
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
                    : 'Enter Gemini API key (AIza...) or leave blank for offline regex parser...'
                }
                className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
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
                        ? 'Saved geminiApiKey to localStorage for Smart Intake (gemini-2.5-flash).'
                        : 'Cleared geminiApiKey from localStorage (using env fallback or offline regex parser).'
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
                      showNotice('Cleared geminiApiKey from localStorage.');
                    }}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">
              Fallback chain: <code className="text-cyan-300">localStorage.getItem(&apos;geminiApiKey&apos;)</code> → <code className="text-cyan-300">import.meta.env.VITE_GEMINI_API_KEY</code> → Local Offline Regex Parser (<code className="text-amber-300">+paper Draft 8b</code>, <code className="text-amber-300">+lab Tue 2h</code>).
            </p>
          </div>

          <p className="text-xs text-slate-400">
            Compiles and parses the 3-part <code className="text-sky-300">state.md</code> architecture (<strong>Part I: On-Duty Capacity Governor</strong>, <strong>Part II: Off-Duty 5-Pillar Recharge</strong>, <strong>Part III: 4-Rung Master Horizon &amp; Input/Output State</strong>). Copy or download <code className="text-sky-300">state.md</code> for Gemini, paste updated Markdown/JSON to sync, or run a <strong>New Day Reset</strong>.
          </p>

          {/* Primary 4 State Sync Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
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
                  const restored = parseFromStateInput(stateIoText);
                  setState({
                    ...restored,
                    stateBackups: updatedBackups,
                  });
                  setStateModalOpen(false);
                  showNotice('Parsed and imported 3-part state.md / JSON into live state (snapshot saved).');
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
                  // Reset daily floor checkboxes & daily counters to 0
                  midDayResetCompletedToday: false,
                  flashcardsReviewedCount: 0,
                  earlyClearanceEnabled: false,
                  discretionaryBlocksCompletedToday: 0,
                  todayBlockLog: [],
                  baselineBlocks: state.baselineBlocks.map((b) => ({
                    ...b,
                    completed: false,
                    bankedViaEarlyClearance: false,
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
                    activeBlockSourceId: primaryProject?.id || 'fc_anat_1',
                    activeTaskTitle:
                      primaryProject?.title || 'Anatomy Flashcards — Block 1/1',
                    activeTaskType: primaryProject ? 'PROJECT' : 'FLASHCARDS',
                    activeStartupPrompt:
                      primaryProject?.startupStep ||
                      'Open deck + clear first 15 cards',
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
                onClick={() => setStateIoText(JSON.stringify(state, null, 2))}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-mono text-xs cursor-pointer"
              >
                Format as JSON
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-400">
              Supports direct Markdown edits in Part I, II, &amp; III + JSON payload
            </span>
          </div>
        </div>
      </MobileBottomSheet>

      {/* Profile Archetype & Onboarding Wizard Modal */}
      <OnboardingWizardModal
        isOpen={onboardingWizardOpen}
        isFirstVisit={isFirstVisitOnboarding}
        state={state}
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
          onToggleCinemaFocus: () => setCinemaFocusOpen((prev) => !prev),
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

      {/* Cinema Focus Mode Overlay (Hotkey: F) */}
      {cinemaFocusOpen && (
        <div
          id="cinema-focus-mode-overlay"
          className="fixed inset-0 z-50 bg-[#05070c]/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-slate-100"
        >
          <div className="max-w-xl w-full p-6 sm:p-8 rounded-3xl bg-slate-950/90 border border-cyan-500/40 shadow-[0_25px_80px_rgba(6,182,212,0.22)] space-y-6 text-center font-mono">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-bold uppercase tracking-wider">
                Cinema Focus Mode • {metrics.durationPrefix}
              </span>
              <button
                id="btn-close-cinema-focus"
                type="button"
                onClick={() => setCinemaFocusOpen(false)}
                className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span>Exit [F / Esc]</span>
              </button>
            </div>

            <div className="space-y-1">
              <div className="text-xs uppercase tracking-widest text-amber-300 font-bold">
                {state.timer.mode === 'WORK_20M'
                  ? state.timer.workStage === 'IGNITION_5M'
                    ? 'Stage 1: 5m Startup Step (IGNITION_5M)'
                    : 'Stage 2: 15m Momentum (MOMENTUM_15M)'
                  : state.timer.mode === 'STRESS_RESET'
                  ? '15–20m 4-7-8 Stress / Fatigue Reset'
                  : `Break (${state.timer.mode})`}
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white">
                {state.timer.activeTaskTitle}
              </h2>
              <p className="text-xs text-cyan-200/90">
                5m Startup Step: {state.timer.activeStartupPrompt}
              </p>
            </div>

            <div className="text-6xl sm:text-7xl font-extrabold tabular-nums tracking-tight text-cyan-300 py-2">
              {`${String(Math.floor(state.timer.secondsLeft / 60)).padStart(
                2,
                '0'
              )}:${String(state.timer.secondsLeft % 60).padStart(2, '0')}`}
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                id="btn-cinema-start-pause"
                type="button"
                onClick={() => {
                  soundEngine.playTactileClick('MODE_TOGGLE');
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
                }}
                className={`px-6 py-3 rounded-2xl font-extrabold text-sm flex items-center gap-2 cursor-pointer ${
                  state.timer.isRunning
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-cyan-400 text-slate-950'
                }`}
              >
                {state.timer.isRunning ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause [Space]</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start [Space]</span>
                  </>
                )}
              </button>

              <button
                id="btn-cinema-skip-stage"
                type="button"
                onClick={handleFastForwardTimerStage}
                className="px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FastForward className="w-4 h-4 text-cyan-400" />
                <span>Advance Stage</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;


