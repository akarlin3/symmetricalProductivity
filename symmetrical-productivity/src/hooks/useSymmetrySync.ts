import React, { useCallback, useEffect, useRef, useState } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import {
  auth,
  db,
  FIREBASE_CONFIG_CHANGE_EVENT,
  initializeFirebaseInstances,
  isFirebaseConfigured as initialFirebaseConfigured,
  onAuthStateChanged,
  parseFirebaseConfigText,
  signInWithGooglePopup,
  signOutFromFirebase,
  type User,
} from '../lib/firebase';
import { SymmetryState, SymmetrySyncStatus } from '../types/symmetry';
import {
  DEFAULT_SYMMETRY_STATE,
  loadExternalStateBackups,
  parseFromStateInput,
  pushStateBackup,
  STORAGE_KEY,
  syncTodayIntoDailyHistory,
} from '../state/defaultState';
import {
  buildStateForPreset,
  ONBOARDING_COMPLETED_KEY,
} from '../state/profilePresets';
import { stripProSecretsFromStateObject } from '../utils/geminiClient';

export const LIVE_SYNC_CHANNEL_NAME = 'symmetrical_live_state';
const FIRESTORE_DEBOUNCE_MS = 500;

/**
 * Attaches the unified SymmetryProductivity schema fields (`tier`, `completedBlocks`,
 * `examFloor`, `closedList`, `openList`, `sanctuaryPillars`, `hemingwayBridge`,
 * `watchmansRest`, `lastUpdated`) onto the complete `SymmetryState` object.
 */
export function buildUnifiedSymmetryPayload(
  state: SymmetryState,
  lastUpdatedOverride?: number
): SymmetryState {
  const resolvedTimestamp =
    typeof lastUpdatedOverride === 'number'
      ? lastUpdatedOverride
      : typeof state.lastUpdated === 'number'
      ? state.lastUpdated
      : Date.now();

  const primaryItem = state.projectQueue?.[0];
  const bridgeNote =
    primaryItem?.nextStepNote?.trim() || primaryItem?.startupStep?.trim() || '';

  return {
    ...state,
    dailySovereignDripDone: Boolean(state.dailySovereignDripDone),
    dailySovereignDripTarget: state.dailySovereignDripTarget ?? 1,
    sovereignGoldenRuleMode: state.sovereignGoldenRuleMode ?? true,
    tier: state.loadMode,
    completedBlocks: {
      discretionaryBlocksCompletedToday: state.discretionaryBlocksCompletedToday,
      todayBlockLog: state.todayBlockLog || [],
      completedDeliverablesLog: state.completedDeliverablesLog || [],
    },
    examFloor: state.baselineBlocks,
    baselineSlots: state.baselineBlocks,
    closedList: state.projectQueue,
    openList: state.openListBacklog || state.projectBacklog || [],
    sevenDayPipeline: state.pipelineDays,
    sanctuaryPillars: state.recharge,
    hemingwayBridge: bridgeNote,
    watchmansRest: Boolean(
      state.recharge?.endOfShiftLocked || state.recharge?.manualEveningPreview
    ),
    lastUpdated: resolvedTimestamp,
  };
}

/**
 * Computes a deterministic signature of meaningful state transitions while
 * ignoring 1Hz timer countdown ticks (`secondsLeft`, `elapsedSeconds`, etc.)
 * so Firestore writes only trigger on block completion, timer start/stop,
 * list edits, or mode toggles.
 */
export function computeMeaningfulStateSignature(state: SymmetryState): string {
  return JSON.stringify({
    profilePresetId: state.profilePresetId,
    profileName: state.profileName,
    logicalDayRolloverHour: state.logicalDayRolloverHour,
    earlyEveningShutdownTime: state.earlyEveningShutdownTime,
    energyBandwidth: state.energyBandwidth,
    shockAbsorberMode: state.shockAbsorberMode,
    shockAbsorberDeferredBlocks: state.shockAbsorberDeferredBlocks,
    flexibilityTuning: state.flexibilityTuning,
    loadMode: state.loadMode,
    cruisePlus: state.cruisePlus,
    preExamTaperActive: state.preExamTaperActive,
    customModeBlockAdjustment: state.customModeBlockAdjustment,
    surgeConsecutiveDays: state.surgeConsecutiveDays,
    midDayResetCompletedToday: state.midDayResetCompletedToday,
    fixedEvent: state.fixedEvent,
    flashcardsReviewedCount: state.flashcardsReviewedCount,
    earlyClearanceEnabled: state.earlyClearanceEnabled,
    discretionaryBlocksCompletedToday: state.discretionaryBlocksCompletedToday,
    dailySovereignDripDone: state.dailySovereignDripDone,
    dailySovereignDripTarget: state.dailySovereignDripTarget,
    sovereignGoldenRuleMode: state.sovereignGoldenRuleMode,
    baselineBlocks: state.baselineBlocks,
    projectQueue: state.projectQueue,
    projectBacklog: state.projectBacklog,
    openListBacklog: state.openListBacklog,
    completedDeliverablesLog: state.completedDeliverablesLog,
    pipelineDays: state.pipelineDays,
    todayBlockLog: state.todayBlockLog,
    roadmapTracks: state.roadmapTracks,
    audioSettings: state.audioSettings,
    // Timer transitions (start/stop, stage change, task change, targetEndTimeMs) — excluding per-second secondsLeft
    timerTransition: {
      mode: state.timer.mode,
      workStage: state.timer.workStage,
      isRunning: state.timer.isRunning,
      targetEndTimeMs: state.timer.targetEndTimeMs,
      activeBlockSourceId: state.timer.activeBlockSourceId,
      activeTaskTitle: state.timer.activeTaskTitle,
      activeTaskType: state.timer.activeTaskType,
      activeStartupPrompt: state.timer.activeStartupPrompt,
      elasticMultiplier: state.timer.elasticMultiplier,
      startupShrinkLevel: state.timer.startupShrinkLevel,
      chainedBlocksCount: state.timer.chainedBlocksCount,
      sessionDisplayDurationMinutes: state.timer.sessionDisplayDurationMinutes,
      l1DurationMinutes: state.timer.l1DurationMinutes,
      l2DurationMinutes: state.timer.l2DurationMinutes,
      l2Protocol: state.timer.l2Protocol,
      l3DurationMinutes: state.timer.l3DurationMinutes,
      stressDurationMinutes: state.timer.stressDurationMinutes,
      stressProtocol: state.timer.stressProtocol,
      queuedRecoveryFlashcard5m: state.timer.queuedRecoveryFlashcard5m,
      recoveryFlashcardRunning: state.timer.recoveryFlashcardRunning,
      recoveryFlashcardTargetEndTimeMs: state.timer.recoveryFlashcardTargetEndTimeMs,
    },
    // Recharge transitions — excluding per-second countdown ticks
    rechargeTransition: {
      endOfShiftLocked: state.recharge.endOfShiftLocked,
      manualEveningPreview: state.recharge.manualEveningPreview,
      flowExtensionActive: state.recharge.flowExtensionActive,
      flowExtensionRunning: state.recharge.flowExtensionRunning,
      flowExtensionStartTimeMs: state.recharge.flowExtensionStartTimeMs,
      flowExtensionBlocksLoggedToday: state.recharge.flowExtensionBlocksLoggedToday,
      weeklyExtensionsUsed: state.recharge.weeklyExtensionsUsed,
      option0Running: state.recharge.option0Running,
      option0TargetEndTimeMs: state.recharge.option0TargetEndTimeMs,
      option0ConsecutiveWindows: state.recharge.option0ConsecutiveWindows,
      forkCheckModalOpen: state.recharge.forkCheckModalOpen,
      activeCategory: state.recharge.activeCategory,
      activeMediaTab: state.recharge.activeMediaTab,
      fictionSpeed: state.recharge.fictionSpeed,
      pacingStage: state.recharge.pacingStage,
      categoryTargetEndTimeMs: state.recharge.categoryTargetEndTimeMs,
      categoryRunning: state.recharge.categoryRunning,
      checkInModalOpen: state.recharge.checkInModalOpen,
      checkInMilestone: state.recharge.checkInMilestone,
      stickySlots: state.recharge.stickySlots,
      fluidCategories: state.recharge.fluidCategories,
      categoryCards: state.recharge.categoryCards,
      completedLog: state.recharge.completedLog,
    },
  });
}

function serializeForFirestore(state: SymmetryState): Record<string, unknown> {
  const unified = buildUnifiedSymmetryPayload(state, state.lastUpdated || Date.now());
  const stripped = stripProSecretsFromStateObject(
    unified as unknown as Record<string, unknown>
  );
  delete stripped.stateBackups;
  return JSON.parse(JSON.stringify(stripped)) as Record<string, unknown>;
}

function reconcileIncomingTimer(incoming: SymmetryState): SymmetryState {
  const now = Date.now();
  const reconciledTimer = {
    ...incoming.timer,
    secondsLeft:
      incoming.timer?.isRunning && incoming.timer?.targetEndTimeMs
        ? Math.max(0, Math.ceil((incoming.timer.targetEndTimeMs - now) / 1000))
        : incoming.timer?.secondsLeft ?? 300,
    recoveryFlashcardSecondsLeft:
      incoming.timer?.recoveryFlashcardRunning &&
      incoming.timer?.recoveryFlashcardTargetEndTimeMs
        ? Math.max(
            0,
            Math.ceil((incoming.timer.recoveryFlashcardTargetEndTimeMs - now) / 1000)
          )
        : incoming.timer?.recoveryFlashcardSecondsLeft ?? 300,
  };

  const reconciledRecharge = {
    ...incoming.recharge,
    option0SecondsLeft:
      incoming.recharge?.option0Running && incoming.recharge?.option0TargetEndTimeMs
        ? Math.max(
            0,
            Math.ceil((incoming.recharge.option0TargetEndTimeMs - now) / 1000)
          )
        : incoming.recharge?.option0SecondsLeft ?? 1200,
    categorySecondsLeft:
      incoming.recharge?.categoryRunning && incoming.recharge?.categoryTargetEndTimeMs
        ? Math.max(
            0,
            Math.ceil((incoming.recharge.categoryTargetEndTimeMs - now) / 1000)
          )
        : incoming.recharge?.categorySecondsLeft ?? 300,
  };

  return {
    ...incoming,
    timer: reconciledTimer,
    recharge: reconciledRecharge,
  };
}

export interface UseSymmetrySyncOptions {
  initialUnlockInfo: {
    unlocked: boolean;
    triggeredViaUrl: boolean;
  };
  onNotify?: (message: string) => void;
  onPushUndoSnapshot?: (snapshot: SymmetryState, label: string) => void;
}

export interface UseSymmetrySyncReturn {
  state: SymmetryState;
  setState: React.Dispatch<React.SetStateAction<SymmetryState>>;
  user: User | null;
  syncStatus: SymmetrySyncStatus;
  isFirebaseConfigured: boolean;
  firebaseSetupModalOpen: boolean;
  setFirebaseSetupModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  connectFirebaseWithConfig: (rawConfigText: string) => Promise<boolean>;
  signInWithGoogle: () => Promise<void>;
  signOutUser: () => Promise<void>;
  exportStateJson: () => void;
  importStateJsonFile: (file: File) => Promise<void>;
}

export function useSymmetrySync({
  initialUnlockInfo,
  onNotify,
  onPushUndoSnapshot,
}: UseSymmetrySyncOptions): UseSymmetrySyncReturn {
  const [state, setState] = useState<SymmetryState>(() => {
    try {
      if (typeof window !== 'undefined') {
        const externalBackups = loadExternalStateBackups();
        if (initialUnlockInfo.triggeredViaUrl) {
          const averyState = buildStateForPreset('AVERY_DEFAULT');
          return buildUnifiedSymmetryPayload(
            {
              ...averyState,
              dailyHistory: syncTodayIntoDailyHistory(averyState),
              stateBackups: externalBackups,
            },
            Date.now()
          );
        }
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = parseFromStateInput(saved);
          if (
            !initialUnlockInfo.unlocked &&
            parsed.profilePresetId === 'AVERY_DEFAULT'
          ) {
            const publicDefault = buildStateForPreset('BALANCED_CORE');
            return buildUnifiedSymmetryPayload(
              {
                ...publicDefault,
                dailyHistory: syncTodayIntoDailyHistory(publicDefault),
                stateBackups:
                  parsed.stateBackups && parsed.stateBackups.length > 0
                    ? parsed.stateBackups
                    : externalBackups,
              },
              parsed.lastUpdated || Date.now()
            );
          }
          return buildUnifiedSymmetryPayload(
            {
              ...parsed,
              dailyHistory: syncTodayIntoDailyHistory(parsed),
              stateBackups:
                parsed.stateBackups && parsed.stateBackups.length > 0
                  ? parsed.stateBackups
                  : externalBackups,
            },
            parsed.lastUpdated || 0
          );
        }
      }
    } catch {
      // Fallback to default deterministic state
    }
    if (initialUnlockInfo.unlocked) {
      return buildUnifiedSymmetryPayload(DEFAULT_SYMMETRY_STATE, 0);
    }
    const publicFallback = buildStateForPreset('BALANCED_CORE');
    return buildUnifiedSymmetryPayload(
      {
        ...publicFallback,
        dailyHistory: syncTodayIntoDailyHistory(publicFallback),
      },
      0
    );
  });

  const [user, setUser] = useState<User | null>(null);
  const [syncStatus, setSyncStatus] = useState<SymmetrySyncStatus>('LOCAL_MODE');
  const [isFirebaseConfigured, setIsFirebaseConfigured] = useState<boolean>(
    initialFirebaseConfigured
  );
  const [firebaseSetupModalOpen, setFirebaseSetupModalOpen] =
    useState<boolean>(false);

  // Refs for tracking state & sync loop guards
  const stateRef = useRef<SymmetryState>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleConfigChange = () => {
      setIsFirebaseConfigured(Boolean(auth && db));
    };
    window.addEventListener(FIREBASE_CONFIG_CHANGE_EVENT, handleConfigChange);
    return () =>
      window.removeEventListener(
        FIREBASE_CONFIG_CHANGE_EVENT,
        handleConfigChange
      );
  }, []);

  const isReceivingRemoteSyncRef = useRef<boolean>(false);
  const initialCloudHandshakeDoneRef = useRef<boolean>(false);
  const lastMeaningfulSignatureRef = useRef<string>('');
  const lastCloudPushedSignatureRef = useRef<string>('');
  const debounceTimerRef = useRef<number | null>(null);

  // Cross-Tab Live Sync (BroadcastChannel) refs
  const tabIdRef = useRef<string>('');
  const broadcastChannelRef = useRef<BroadcastChannel | null>(null);

  // 1. Cross-Tab Live Sync via BroadcastChannel('symmetrical_live_state')
  useEffect(() => {
    if (!tabIdRef.current) {
      tabIdRef.current = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }
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
        const incoming = reconcileIncomingTimer(data.state as SymmetryState);
        lastMeaningfulSignatureRef.current =
          computeMeaningfulStateSignature(incoming);
        setState(incoming);
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

  // 2. Firebase Auth State Listener
  useEffect(() => {
    if (typeof window === 'undefined' || !isFirebaseConfigured || !auth) {
      return;
    }

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        initialCloudHandshakeDoneRef.current = false;
        setSyncStatus('LOCAL_MODE');
      } else {
        setSyncStatus('SYNCING');
      }
    });

    return () => unsubscribeAuth();
  }, [isFirebaseConfigured]);

  // 3. Firestore Real-Time `onSnapshot` Listener + Timestamp Conflict Resolution
  useEffect(() => {
    if (typeof window === 'undefined' || !isFirebaseConfigured || !db || !user) {
      return;
    }

    const userDocRef = doc(db, 'users', user.uid);
    initialCloudHandshakeDoneRef.current = false;

    const unsubscribeSnapshot = onSnapshot(
      userDocRef,
      (snapshot) => {
        const localCurrent = stateRef.current;
        const localLastUpdated =
          typeof localCurrent.lastUpdated === 'number'
            ? localCurrent.lastUpdated
            : 0;

        if (!snapshot.exists()) {
          // Cloud doc doesn't exist yet -> push local state to users/{uid}
          const timestampNow = localLastUpdated > 0 ? localLastUpdated : Date.now();
          const enrichedLocal = buildUnifiedSymmetryPayload(
            localCurrent,
            timestampNow
          );
          stateRef.current = enrichedLocal;
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(enrichedLocal));
          } catch {
            // ignore quota errors
          }
          const payload = serializeForFirestore(enrichedLocal);
          lastCloudPushedSignatureRef.current =
            computeMeaningfulStateSignature(enrichedLocal);
          initialCloudHandshakeDoneRef.current = true;
          setSyncStatus('SYNCING');
          setDoc(userDocRef, payload, { merge: true })
            .then(() => {
              setSyncStatus('SYNCED');
            })
            .catch((err) => {
              console.warn('[SymmetrySync] Initial cloud write failed:', err);
              setSyncStatus('LOCAL_MODE');
            });
          return;
        }

        const cloudData = snapshot.data() as Record<string, unknown>;
        const cloudLastUpdated =
          typeof cloudData.lastUpdated === 'number' ? cloudData.lastUpdated : 0;

        if (cloudLastUpdated > localLastUpdated) {
          // Cloud state is newer -> hydrate local state
          try {
            const hydrated = parseFromStateInput(JSON.stringify(cloudData));
            const reconciled = reconcileIncomingTimer({
              ...hydrated,
              dailyHistory: syncTodayIntoDailyHistory(hydrated),
              stateBackups:
                localCurrent.stateBackups && localCurrent.stateBackups.length > 0
                  ? localCurrent.stateBackups
                  : loadExternalStateBackups(),
              lastUpdated: cloudLastUpdated,
            });
            const unifiedHydrated = buildUnifiedSymmetryPayload(
              reconciled,
              cloudLastUpdated
            );
            const incomingSig = computeMeaningfulStateSignature(unifiedHydrated);
            lastMeaningfulSignatureRef.current = incomingSig;
            lastCloudPushedSignatureRef.current = incomingSig;
            isReceivingRemoteSyncRef.current = true;
            stateRef.current = unifiedHydrated;
            try {
              localStorage.setItem(STORAGE_KEY, JSON.stringify(unifiedHydrated));
              localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
            } catch {
              // ignore storage errors
            }
            setState(unifiedHydrated);
          } catch (err) {
            console.warn('[SymmetrySync] Failed to parse cloud snapshot:', err);
          }
          initialCloudHandshakeDoneRef.current = true;
          setSyncStatus('SYNCED');
        } else if (
          !initialCloudHandshakeDoneRef.current &&
          localLastUpdated > cloudLastUpdated
        ) {
          // Local state is newer on initial connect -> push local state to users/{uid}
          const enrichedLocal = buildUnifiedSymmetryPayload(
            localCurrent,
            localLastUpdated
          );
          const payload = serializeForFirestore(enrichedLocal);
          lastCloudPushedSignatureRef.current =
            computeMeaningfulStateSignature(enrichedLocal);
          initialCloudHandshakeDoneRef.current = true;
          setSyncStatus('SYNCING');
          setDoc(userDocRef, payload, { merge: true })
            .then(() => {
              setSyncStatus('SYNCED');
            })
            .catch((err) => {
              console.warn('[SymmetrySync] Conflict resolution push failed:', err);
              setSyncStatus('LOCAL_MODE');
            });
        } else {
          initialCloudHandshakeDoneRef.current = true;
          setSyncStatus('SYNCED');
        }
      },
      (err) => {
        console.warn('[SymmetrySync] Firestore onSnapshot error:', err);
        setSyncStatus('LOCAL_MODE');
      }
    );

    return () => {
      unsubscribeSnapshot();
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, [isFirebaseConfigured, user]);

  // 4. Persist to localStorage on EVERY change + Debounced (500ms) Outbound Firestore Write on meaningful transitions
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const currentSig = computeMeaningfulStateSignature(state);
    const isInitialMount = lastMeaningfulSignatureRef.current === '';
    if (isInitialMount) {
      lastMeaningfulSignatureRef.current = currentSig;
    }
    const meaningfulChanged =
      !isInitialMount && currentSig !== lastMeaningfulSignatureRef.current;

    const updatedTimestamp = meaningfulChanged
      ? Date.now()
      : typeof state.lastUpdated === 'number'
      ? state.lastUpdated
      : 0;

    const unifiedState = buildUnifiedSymmetryPayload(state, updatedTimestamp);
    stateRef.current = unifiedState;

    // Always persist complete schema + lastUpdated in localStorage on every change
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(unifiedState));
    } catch {
      // Ignore storage quota errors
    }

    if (isReceivingRemoteSyncRef.current) {
      isReceivingRemoteSyncRef.current = false;
      lastMeaningfulSignatureRef.current = currentSig;
      return;
    }

    if (!meaningfulChanged) {
      // Rapid 1s timer tick only — already saved in localStorage; skip BroadcastChannel and Firestore spam
      return;
    }

    lastMeaningfulSignatureRef.current = currentSig;

    // Broadcast meaningful transition across local tabs
    try {
      broadcastChannelRef.current?.postMessage({
        senderTabId: tabIdRef.current,
        timestamp: updatedTimestamp,
        state: unifiedState,
      });
    } catch {
      // Ignore BroadcastChannel errors
    }

    // Debounce outbound Firestore write (500ms) if user is signed in
    if (
      isFirebaseConfigured &&
      db &&
      user &&
      initialCloudHandshakeDoneRef.current &&
      currentSig !== lastCloudPushedSignatureRef.current
    ) {
      setSyncStatus('SYNCING');
      if (debounceTimerRef.current !== null) {
        window.clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = window.setTimeout(() => {
        debounceTimerRef.current = null;
        if (!db || !user) return;
        const latestState = stateRef.current;
        const latestPayload = serializeForFirestore(latestState);
        lastCloudPushedSignatureRef.current =
          computeMeaningfulStateSignature(latestState);
        const userDocRef = doc(db, 'users', user.uid);
        setDoc(userDocRef, latestPayload, { merge: true })
          .then(() => {
            setSyncStatus('SYNCED');
          })
          .catch((err) => {
            console.warn('[SymmetrySync] Outbound Firestore write failed:', err);
            setSyncStatus('LOCAL_MODE');
          });
      }, FIRESTORE_DEBOUNCE_MS);
    }
  }, [isFirebaseConfigured, state, user]);

  // 5. Auth & JSON Backup Actions
  const signInWithGoogle = useCallback(async () => {
    if (!isFirebaseConfigured || !auth) {
      setFirebaseSetupModalOpen(true);
      return;
    }
    try {
      setSyncStatus('SYNCING');
      const cred = await signInWithGooglePopup();
      if (cred?.user) {
        onNotify?.(
          `Signed in as ${cred.user.displayName || cred.user.email || 'Google User'} — Cloud Firestore sync active.`
        );
      }
    } catch (err) {
      setSyncStatus(user ? 'SYNCED' : 'LOCAL_MODE');
      const message =
        err instanceof Error ? err.message : 'Google Sign-In cancelled or failed.';
      onNotify?.(`Google Sign-In: ${message}`);
    }
  }, [isFirebaseConfigured, onNotify, user]);

  const connectFirebaseWithConfig = useCallback(
    async (rawConfigText: string): Promise<boolean> => {
      const parsed = parseFirebaseConfigText(rawConfigText);
      if (!parsed) {
        onNotify?.(
          'Invalid Firebase config — include apiKey, authDomain, projectId, and appId (or VITE_FIREBASE_* lines).'
        );
        return false;
      }
      const ok = initializeFirebaseInstances(parsed);
      if (!ok) {
        onNotify?.('Could not initialize Firebase with the provided config.');
        return false;
      }
      setIsFirebaseConfigured(true);
      setFirebaseSetupModalOpen(false);
      try {
        setSyncStatus('SYNCING');
        const cred = await signInWithGooglePopup();
        if (cred?.user) {
          onNotify?.(
            `Connected Firebase & signed in as ${cred.user.displayName || cred.user.email || 'Google User'}.`
          );
        }
      } catch (err) {
        setSyncStatus('LOCAL_MODE');
        const message =
          err instanceof Error
            ? err.message
            : 'Saved Firebase config. Click Sign in with Google to authenticate.';
        onNotify?.(`Firebase Config Saved: ${message}`);
      }
      return true;
    },
    [onNotify]
  );

  const signOutUser = useCallback(async () => {
    try {
      await signOutFromFirebase();
      setSyncStatus('LOCAL_MODE');
      onNotify?.('Signed out — running on instant localStorage persistence.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Sign-out failed.';
      onNotify?.(`Sign-out error: ${message}`);
    }
  }, [onNotify]);

  const exportStateJson = useCallback(() => {
    if (typeof window === 'undefined') return;
    const unified = buildUnifiedSymmetryPayload(stateRef.current, Date.now());
    const clean = stripProSecretsFromStateObject(
      unified as unknown as Record<string, unknown>
    );
    const jsonString = JSON.stringify(clean, null, 2);
    const blob = new Blob([jsonString], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `symmetry-backup-${dateStamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    onNotify?.(`Exported JSON backup (symmetry-backup-${dateStamp}.json).`);
  }, [onNotify]);

  const importStateJsonFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        if (!text.trim()) {
          onNotify?.('Selected backup file is empty.');
          return;
        }
        const current = stateRef.current;
        const updatedBackups = pushStateBackup(
          current,
          'JSON_IMPORT',
          `Before JSON Backup Import (${file.name})`
        );
        onPushUndoSnapshot?.(current, `Before JSON Import (${file.name})`);
        const restored = parseFromStateInput(text);
        const now = Date.now();
        const unifiedRestored = buildUnifiedSymmetryPayload(
          {
            ...restored,
            dailyHistory: syncTodayIntoDailyHistory(restored),
            stateBackups: updatedBackups,
          },
          now
        );
        setState(unifiedRestored);
        onNotify?.(`Imported JSON backup "${file.name}" into active state.`);
      } catch {
        onNotify?.(`Invalid JSON or state.md file: "${file.name}".`);
      }
    },
    [onNotify, onPushUndoSnapshot]
  );

  return {
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
  };
}
