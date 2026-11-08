import React, { useEffect, useState } from 'react';
import {
  Copy,
  Download,
  FileText,
  Layers,
  ListChecks,
  Moon,
  RotateCcw,
  Timer,
  Upload,
  X,
} from 'lucide-react';
import { triggerHaptic } from './utils/haptics';
import {
  FixedEventType,
  Level2BreakProtocol,
  LoadMode,
  MediaSubTrackId,
  PipelineDay,
  ProjectPresetType,
  RechargeCategoryId,
  StickyKey,
  StressResetProtocol,
  SymmetryState,
  TabId,
  TimerRunMode,
  TrackId,
} from './types/symmetry';
import {
  computeShiftMetrics,
  DEFAULT_SYMMETRY_STATE,
  generateSequentialChecklist,
  getLogicalDayKey,
  parseFromStateInput,
  serializeToStateMarkdown,
  STORAGE_KEY,
} from './state/defaultState';
import {
  cancelAllScheduledStageAlarms,
  fireSymmetryNotification,
  initSymmetryNotifications,
  NotificationLogEntry,
  scheduleTimerNotificationAt,
  SymmetryNotificationEvent,
} from './utils/notifications';
import { HeaderBar } from './components/HeaderBar';
import { PipelineDrawer } from './components/PipelineDrawer';
import { PlanningAssistantDrawer } from './components/PlanningAssistantDrawer';
import { Tab1Pipeline } from './components/Tab1Pipeline';
import { Tab2TimerTriage } from './components/Tab2TimerTriage';
import { Tab3Recharge } from './components/Tab3Recharge';
import { Tab4Roadmap } from './components/Tab4Roadmap';

export function App() {
  const [state, setState] = useState<SymmetryState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return parseFromStateInput(saved);
      }
    } catch {
      // Fallback to default deterministic state
    }
    return DEFAULT_SYMMETRY_STATE;
  });

  const [activeTab, setActiveTab] = useState<TabId>('PIPELINE');
  const [pipelineDrawerOpen, setPipelineDrawerOpen] = useState(false);
  const [assistantDrawerOpen, setAssistantDrawerOpen] = useState(false);
  const [stateModalOpen, setStateModalOpen] = useState(false);
  const [stateIoText, setStateIoText] = useState('');
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [notificationLog, setNotificationLog] = useState<NotificationLogEntry[]>([]);
  const [notificationsGranted, setNotificationsGranted] = useState(false);
  const [swOfflineReady, setSwOfflineReady] = useState(false);

  const showNotice = (msg: string) => {
    setStatusNotice(msg);
  };

  const dispatchLockScreenAlert = (
    eventType: SymmetryNotificationEvent,
    title: string,
    body: string
  ) => {
    fireSymmetryNotification(eventType, title, body).then((entry) => {
      setNotificationLog((prev) => [entry, ...prev.slice(0, 19)]);
    });
  };

  // Initialize Capacitor Android Notification Channel & check PWA Service Worker
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
  }, []);

  useEffect(() => {
    if (!statusNotice) return;
    const id = window.setTimeout(() => setStatusNotice(null), 4200);
    return () => window.clearTimeout(id);
  }, [statusNotice]);

  // Persist to localStorage on every state update (including targetEndTimeMs timestamps)
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors
    }
  }, [state]);

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

  // Dual-Theme State Shift: Sync body background and theme-color meta tag smoothly
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const bgHex = isEveningTheme ? '#0a0807' : '#060911';
    document.body.style.backgroundColor = bgHex;
    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', bgHex);
    }
  }, [isEveningTheme]);

  // 4:00 AM Day-Rollover Boundary Check (hours < 4 counts as the previous logical shift day)
  useEffect(() => {
    const checkFourAmRollover = () => {
      const currentLogicalDay = getLogicalDayKey(new Date());
      setState((prev) => {
        if (!prev.logicalDayKey) {
          return { ...prev, logicalDayKey: currentLogicalDay };
        }
        if (prev.logicalDayKey === currentLogicalDay) {
          return prev;
        }
        // Crossed 4:00 AM boundary into a new logical day
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

  // Global Spacebar shortcut (start/pause timer) and Cmd/Ctrl + / shortcut (toggle Planning Assistant)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === '/') {
        e.preventDefault();
        triggerHaptic([12]);
        setAssistantDrawerOpen((prev) => !prev);
        return;
      }

      if (e.code !== 'Space' || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable)
      ) {
        return;
      }
      e.preventDefault();
      triggerHaptic([15]);
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
  }, []);

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

  // Complete a 20m work block and route to the appropriate Break level
  const handleCompleteWorkBlockTransition = (prev: SymmetryState): SymmetryState => {
    const matchingBaseline = prev.baselineBlocks.find(
      (b) => b.id === prev.timer.activeBlockSourceId && !b.completed
    );

    let updatedBaseline = prev.baselineBlocks;
    let updatedDiscretionary = prev.discretionaryBlocksCompletedToday;
    let updatedProjects = prev.projectQueue;
    let updatedTracks = prev.roadmapTracks;

    if (matchingBaseline) {
      updatedBaseline = prev.baselineBlocks.map((b) =>
        b.id === matchingBaseline.id ? { ...b, completed: true } : b
      );
      updatedTracks = creditRoadmapTrack(
        updatedTracks,
        matchingBaseline.trackId,
        matchingBaseline.category === 'SYNTHESIS' ? 'OUTPUT' : 'INPUT',
        matchingBaseline.category === 'SYNTHESIS' ? 2 : 1
      );
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
      const primaryTrack = prev.projectQueue[0]?.trackId || 'writing';
      updatedTracks = creditRoadmapTrack(updatedTracks, primaryTrack, 'OUTPUT', 3);
    }

    const nextCandidate: SymmetryState = {
      ...prev,
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
  ]);

  // Handlers for Tab 1 (Focus Pipeline)
  const handleSelectLoadMode = (
    mode: LoadMode,
    targetBlocks: number,
    cruisePlus = false
  ) => {
    setState((prev) => {
      const nextFixedEvent: FixedEventType =
        mode === 'TAPER' && prev.fixedEvent === 'NONE' ? 'LAB_2H' : prev.fixedEvent;
      return {
        ...prev,
        loadMode: mode,
        cruisePlus,
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

  const handleToggleBaselineBlock = (blockId: string) => {
    setState((prev) => {
      const target = prev.baselineBlocks.find((b) => b.id === blockId);
      if (!target) return prev;
      const nextCompleted = !target.completed;
      const updatedBaseline = prev.baselineBlocks.map((b) =>
        b.id === blockId
          ? { ...b, completed: nextCompleted, bankedViaEarlyClearance: false }
          : b
      );
      let updatedTracks = prev.roadmapTracks;
      if (nextCompleted) {
        updatedTracks = creditRoadmapTrack(
          updatedTracks,
          target.trackId,
          target.category === 'SYNTHESIS' ? 'OUTPUT' : 'INPUT',
          target.category === 'SYNTHESIS' ? 2 : 1
        );
      }
      return {
        ...prev,
        baselineBlocks: updatedBaseline,
        roadmapTracks: updatedTracks,
      };
    });
  };

  const handleToggleEarlyClearance = () => {
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
      return {
        ...prev,
        discretionaryBlocksCompletedToday: prev.discretionaryBlocksCompletedToday + 1,
        projectQueue: updatedQueue,
        roadmapTracks: updatedTracks,
      };
    });
    showNotice('Logged +1 discretionary project block on Item #1 (Credited to Output).');
  };

  const handleCompleteProjectItem1 = () => {
    setState((prev) => {
      const completedItem = prev.projectQueue[0];
      const remaining = prev.projectQueue.slice(1);
      const [nextFromBacklog, ...restBacklog] = prev.projectBacklog;
      const newQueue = remaining.map((item, index) => ({
        ...item,
        slot: (index + 1) as 1 | 2 | 3,
      }));
      if (nextFromBacklog && newQueue.length < 3) {
        newQueue.push({
          ...nextFromBacklog,
          slot: (newQueue.length + 1) as 1 | 2 | 3,
        });
      }
      const prevArchive = prev.completedDeliverablesArchive || [];
      const nextArchive = completedItem
        ? [
            {
              id: `arch_${Date.now()}`,
              title: completedItem.title,
              trackId: completedItem.trackId,
              totalBlocks: completedItem.totalBlocks,
              completedAt: prev.logicalDayKey || getLogicalDayKey(),
            },
            ...prevArchive,
          ]
        : prevArchive;
      return {
        ...prev,
        projectQueue: newQueue,
        projectBacklog: restBacklog,
        completedDeliverablesArchive: nextArchive,
      };
    });
    showNotice('Completed Item #1! Archived in Part III & unlocked Item #2 as Primary Target.');
  };

  const handleAddProjectToQueue = (
    title: string,
    presetType: ProjectPresetType,
    totalBlocks: number,
    trackId: TrackId,
    startupStep: string
  ) => {
    setState((prev) => {
      if (prev.projectQueue.length >= 3) return prev;
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

      return {
        ...prev,
        loadMode: nextMode,
        cruisePlus: false,
        customModeBlockAdjustment: nextCeiling,
        projectQueue: nextQueue,
        projectBacklog: [...displaced, ...prev.projectBacklog],
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
    setState((prev) => ({
      ...prev,
      projectBacklog: [
        ...prev.projectBacklog,
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
      ],
    }));
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
          onOpenPipelineDrawer={() => setPipelineDrawerOpen(true)}
          onOpenStateModal={() => {
            setStateIoText(serializeToStateMarkdown(state));
            setStateModalOpen(true);
          }}
          onToggleAssistantDrawer={() =>
            setAssistantDrawerOpen((prev) => !prev)
          }
          onToggleZeroWorkSimulation={handleToggleZeroWorkSimulation}
          onResetDefault={() => {
            setState(DEFAULT_SYMMETRY_STATE);
            showNotice('Reset SymmetryManager to default deterministic state.');
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
              onSelectLoadMode={handleSelectLoadMode}
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
                setState((prev) => ({
                  ...prev,
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
                }));
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
                setState((prev) => ({
                  ...prev,
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
                }));
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
                  return {
                    ...prev,
                    pipelineDays: prev.pipelineDays.map((d, idx) =>
                      idx === 1
                        ? { ...d, deductedBlocksFromExtension: deducted }
                        : d
                    ),
                    roadmapTracks: creditRoadmapTrack(
                      prev.roadmapTracks,
                      prev.projectQueue[0]?.trackId || 'writing',
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
                  return {
                    ...prev,
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

                  const updatedSlots = { ...r.stickySlots };
                  if (stickyKey && !r.categoryRunning && r.pacingStage === 'STARTUP_5M') {
                    updatedSlots[stickyKey] = {
                      ...updatedSlots[stickyKey],
                      fiveMinStarts: Math.min(
                        3,
                        updatedSlots[stickyKey].fiveMinStarts + 1
                      ),
                    };
                  }

                  // Auto-credit Roadmap Input (Media) or Sandbox Output (Maker/Music)
                  let updatedTracks = prev.roadmapTracks;
                  if (!r.categoryRunning && r.pacingStage === 'STARTUP_5M') {
                    if (r.activeCategory === 'CAT3_MEDIA') {
                      updatedTracks = creditRoadmapTrack(
                        updatedTracks,
                        'writing',
                        'INPUT',
                        1
                      );
                    } else if (r.activeCategory === 'CAT2_MAKER') {
                      updatedTracks = creditRoadmapTrack(
                        updatedTracks,
                        'coding',
                        'OUTPUT',
                        2
                      );
                    } else if (r.activeCategory === 'CAT1_MUSIC') {
                      updatedTracks = creditRoadmapTrack(
                        updatedTracks,
                        'music',
                        'OUTPUT',
                        2
                      );
                    }
                  }

                  return {
                    ...prev,
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
                  if (!slot || slot.backlogQueue.length === 0) return prev;
                  const [nextTitle, ...restQueue] = slot.backlogQueue;
                  return {
                    ...prev,
                    recharge: {
                      ...prev.recharge,
                      stickySlots: {
                        ...prev.recharge.stickySlots,
                        [key]: {
                          ...slot,
                          activeTitle: nextTitle,
                          backlogQueue: [...restQueue, slot.activeTitle],
                          fiveMinStarts: 0,
                          unlockedViaCheckIn: false,
                        },
                      },
                    },
                  };
                });
                showNotice(`Promoted next backlog item for ${key} and reset [0 / 3] counter.`);
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

      {/* 7-Day Pipeline Table Drawer */}
      <PipelineDrawer
        isOpen={pipelineDrawerOpen}
        onClose={() => setPipelineDrawerOpen(false)}
        state={state}
        onUpdateDay={(dayIndex: number, patch: Partial<PipelineDay>) =>
          setState((prev) => {
            const updatedDays = prev.pipelineDays.map((d) =>
              d.dayIndex === dayIndex ? { ...d, ...patch } : d
            );
            const todayPatch = dayIndex === 1 ? patch : {};
            return {
              ...prev,
              loadMode: todayPatch.loadMode ?? prev.loadMode,
              customModeBlockAdjustment:
                todayPatch.baseTargetBlocks ?? prev.customModeBlockAdjustment,
              fixedEvent: todayPatch.fixedEvent ?? prev.fixedEvent,
              pipelineDays: updatedDays,
            };
          })
        }
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

      {/* State Sync Modal (3-Part state.md Compiler & Parser, Copy for Gemini, Download state.md, New Day Reset) */}
      {stateModalOpen && (
        <div
          id="modal-state-io"
          className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="max-w-2xl w-full p-5 sm:p-6 rounded-2xl bg-slate-900 border border-slate-700 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-100 flex items-center gap-2 font-mono">
                <FileText className="w-4 h-4 text-sky-400" />
                <span>State Sync — 3-Part `state.md` Compiler &amp; Parser</span>
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
                    const restored = parseFromStateInput(stateIoText);
                    setState(restored);
                    setStateModalOpen(false);
                    showNotice('Parsed and imported 3-part state.md / JSON into live state.');
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
                    logicalDayKey: getLogicalDayKey(),
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
                    `New Day Reset complete: Daily floor reset to 0/7, ceiling set to ${newCeiling} blocks${
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
              rows={12}
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
        </div>
      )}
    </div>
  );
}

export default App;

