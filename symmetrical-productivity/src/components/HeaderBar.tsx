import React, { useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  Bot,
  Calendar,
  ClipboardPaste,
  Clock,
  Columns2,
  Command,
  Download,
  HelpCircle,
  ListChecks,
  Lock,
  Maximize2,
  Minimize2,
  Moon,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  Timer,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import {
  AudioEngineSettings,
  FixedEventType,
  LayoutMode,
  SoundscapeMode,
  SymmetryState,
  TabId,
} from '../types/symmetry';
import {
  computeShiftMetrics,
  DEFAULT_AUDIO_ENGINE_SETTINGS,
  formatRolloverHourLabel,
  getLogicalDayKey,
} from '../state/defaultState';
import { triggerHaptic } from '../utils/haptics';
import { playHarmonicChord, SOUNDSCAPE_METADATA, soundEngine } from '../utils/soundEngine';
import { AveryCorpEmblem } from './AveryCorpEmblem';

interface HeaderBarProps {
  state: SymmetryState;
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  layoutMode?: LayoutMode;
  onToggleLayoutMode?: () => void;
  onOpenTodayLogDrawer: () => void;
  onOpenPipelineDrawer: () => void;
  onOpenStateModal: () => void;
  onOpenOnboardingWizard?: () => void;
  onToggleAssistantDrawer: () => void;
  onToggleZeroWorkSimulation: () => void;
  onResetDefault: () => void;
  onOpenInsightsModal?: () => void;
  onOpenSpotlightTour?: () => void;
  onOpenShortcutsModal?: () => void;
  onUpdateAudioSettings?: (patch: Partial<AudioEngineSettings>) => void;
  isEveningTheme: boolean;
  onOpenCommandDock?: () => void;
  onOpenGeminiBridgeModal?: () => void;
  onOneTapSyncFromClipboard?: () => void;
  cinemaFocusMode?: boolean;
  onToggleCinemaFocusMode?: () => void;
  architectModeUnlocked?: boolean;
  onUnlockArchitectMode?: (source: string) => void;
}

const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 34,
};

export const HeaderBar: React.FC<HeaderBarProps> = ({
  state,
  activeTab,
  onSelectTab,
  layoutMode = 'WIDGET',
  onToggleLayoutMode,
  onOpenTodayLogDrawer,
  onOpenPipelineDrawer,
  onOpenStateModal,
  onOpenOnboardingWizard,
  onToggleAssistantDrawer,
  onToggleZeroWorkSimulation,
  onResetDefault,
  onOpenInsightsModal,
  onOpenSpotlightTour,
  onOpenShortcutsModal,
  onUpdateAudioSettings,
  isEveningTheme,
  onOpenCommandDock,
  onOpenGeminiBridgeModal,
  onOneTapSyncFromClipboard,
  cinemaFocusMode = false,
  onToggleCinemaFocusMode,
  architectModeUnlocked = false,
  onUnlockArchitectMode,
}) => {
  const tapTimestampsRef = useRef<number[]>([]);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);

  // Trigger B: 5 taps within 3 seconds on the geometric emblem or app title
  const handleBrandPrismTap = () => {
    const now = Date.now();
    const recent = tapTimestampsRef.current.filter((t) => now - t <= 3000);
    recent.push(now);
    tapTimestampsRef.current = recent;

    if (recent.length >= 5) {
      tapTimestampsRef.current = [];
      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate([20, 40, 20]);
        } else {
          triggerHaptic([20, 40, 20]);
        }
      } catch {
        // ignore vibration errors
      }
      playHarmonicChord();
      onUnlockArchitectMode?.('5-Tap Header Prism Gesture');
    } else {
      triggerHaptic([8]);
    }
  };

  const audioSettings: AudioEngineSettings = {
    ...DEFAULT_AUDIO_ENGINE_SETTINGS,
    ...(state.audioSettings || {}),
  };
  const isWorkTimerRunning =
    state.timer.isRunning && state.timer.mode === 'WORK_20M';
  const metrics = computeShiftMetrics(state);
  const rolloverHour = state.logicalDayRolloverHour ?? 4;
  const rolloverLabel = formatRolloverHourLabel(rolloverHour);
  const shutdownTime = state.earlyEveningShutdownTime || '6:00 PM';
  const fixedEventLabels: Record<FixedEventType, string | null> = {
    NONE: null,
    LAB_2H: '09:00–11:00 AM Lab',
    VOLUNTEER: '01:00–03:00 PM Volunteer',
    EVENING_OUTING_6PM: `${shutdownTime} Evening Outing`,
  };
  const fixedEventDisplay = fixedEventLabels[state.fixedEvent];
  const logicalDay = state.logicalDayKey || getLogicalDayKey(new Date(), rolloverHour);
  const todayLoggedCount = (state.todayBlockLog || []).filter(
    (entry) => entry.logicalDate === logicalDay
  ).length;

  const isCinemaReceding = cinemaFocusMode && state.timer.isRunning;

  const visibleMilestones = (state.upcomingMilestones || []).filter((m) => {
    if (architectModeUnlocked) return true;
    const lower = m.toLowerCase();
    return !lower.includes('nov 12') && !lower.includes('dec 8');
  });

  // 3 Primary Views in the Sleek Center Pill Switcher
  const primaryViews: { id: TabId; label: string; navId: string }[] = [
    { id: 'PIPELINE', label: 'Focus', navId: 'tab-nav-pipeline' },
    { id: 'RECHARGE', label: 'Evening', navId: 'tab-nav-recharge' },
    { id: 'ROADMAP', label: 'Roadmap', navId: 'tab-nav-roadmap' },
  ];

  const compactDurationText = metrics.isZeroWorkLeft
    ? '[0m left]'
    : `[${metrics.remainingWorkFormatted} left]`;

  return (
    <>
      <header className="sticky top-0 z-30 pointer-events-none">
        <div
          className={`w-full min-h-10 px-3 py-1 pointer-events-auto rounded-2xl sm:rounded-full border backdrop-blur-2xl flex flex-wrap items-center justify-between gap-1.5 transition-all duration-500 ${
            isEveningTheme
              ? 'bg-[#090706]/85 border-white/[0.05] text-amber-50 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.06),0_12px_28px_-14px_rgba(0,0,0,0.85)]'
              : 'bg-[#06080d]/85 border-white/[0.05] text-slate-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.07),0_12px_28px_-14px_rgba(0,0,0,0.85)]'
          }`}
        >
          {/* 1. LEFT: 26px Small Square Emblem + Full Title + Compact [Xh YYm left] Pill */}
          <div className="flex items-center gap-1.5 shrink-0">
            <AveryCorpEmblem
              id="header-brand-prism-trigger"
              size={26}
              variant="image"
              cropMode="full-seal"
              isTimerActive={isWorkTimerRunning}
              architectUnlocked={architectModeUnlocked}
              showPreviewPopover
              onClick={handleBrandPrismTap}
              ariaLabel="AveryCorp Institute Header Emblem (5-Tap Architect Trigger)"
            />

            <h1
              id="header-app-title-trigger"
              onClick={handleBrandPrismTap}
              className={`text-[11px] font-medium tracking-tight cursor-pointer select-none whitespace-nowrap shrink-0 transition-opacity duration-500 ${
                isCinemaReceding ? 'opacity-20 hover:opacity-100' : ''
              } ${isEveningTheme ? 'text-amber-100/90' : 'text-slate-200'}`}
            >
              Symmetry Productivity
            </h1>

            {/* Compact Duration-Only Pill (Remains sharp during Cinema Focus) */}
            <div
              id="duration-only-header-badge"
              onClick={handleBrandPrismTap}
              className={`px-2 py-0.5 rounded-full border font-mono text-[11px] font-normal tracking-tight tabular-nums flex items-center gap-1 transition-all duration-500 shrink-0 cursor-pointer select-none ${
                metrics.isZeroWorkLeft || isEveningTheme
                  ? 'bg-amber-500/10 border-amber-400/25 text-amber-200'
                  : 'bg-white/[0.03] border-white/[0.07] text-slate-200'
              }`}
              title={`${metrics.durationPrefix} — Duration-Only Display (No wall-clock timestamps unless Fixed Event logged)`}
            >
              {metrics.isZeroWorkLeft ? (
                <Lock className="w-2.5 h-2.5 text-amber-400 shrink-0" />
              ) : (
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isEveningTheme ? 'bg-amber-400' : 'bg-sky-400'
                  }`}
                />
              )}
              <span>{compactDurationText}</span>
            </div>

            {fixedEventDisplay && (
              <div
                id="fixed-event-timestamp-pill"
                className={`${
                  layoutMode === 'SPLIT' ? 'hidden md:flex' : 'hidden'
                } px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-200 font-mono tracking-tight tabular-nums text-[10px] items-center gap-1 shrink-0`}
              >
                <Calendar className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                <span>{fixedEventDisplay}</span>
              </div>
            )}
          </div>

          {/* 2. CENTER: Single Sleek Pill Switcher for the 3 Primary Views (Focus | Evening | Roadmap) */}
          <nav
            aria-label="Primary Views"
            className={`p-0.5 rounded-full border flex items-center gap-0.5 transition-all duration-500 ${
              isEveningTheme
                ? 'bg-black/40 border-white/[0.05]'
                : 'bg-white/[0.02] border-white/[0.05]'
            } ${
              isCinemaReceding
                ? 'opacity-20 blur-[1px] hover:opacity-100 hover:blur-0'
                : ''
            }`}
          >
            {primaryViews.map((view) => {
              const isActive =
                activeTab === view.id ||
                (view.id === 'PIPELINE' && activeTab === 'TIMER');
              return (
                <button
                  key={view.id}
                  id={view.navId}
                  type="button"
                  onClick={() => {
                    triggerHaptic([8]);
                    onSelectTab(view.id);
                  }}
                  className={`relative px-2.5 py-0.5 rounded-full text-xs font-medium tracking-tight transition-colors cursor-pointer ${
                    isActive
                      ? isEveningTheme
                        ? 'text-amber-50'
                        : 'text-white'
                      : isEveningTheme
                      ? 'text-stone-400 hover:text-amber-100'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeNavTab"
                      transition={SPRING_TRANSITION}
                      className={`absolute inset-0 rounded-full pointer-events-none ${
                        isEveningTheme
                          ? 'bg-amber-500/20 border border-amber-400/30 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.12)]'
                          : 'bg-white/[0.08] border border-white/[0.10] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                      }`}
                    />
                  )}
                  <span className="relative z-10">{view.label}</span>
                </button>
              );
            })}
          </nav>

          {/* 3. RIGHT: Layout Toggle, Cmd+K, and Menu Icons */}
          <div
            className={`flex items-center gap-1 shrink-0 transition-all duration-500 ${
              isCinemaReceding
                ? 'opacity-20 blur-[1px] hover:opacity-100 hover:blur-0'
                : ''
            }`}
          >
            {onToggleLayoutMode && (
              <button
                id="btn-layout-mode-toggle"
                type="button"
                onClick={() => {
                  triggerHaptic([10]);
                  soundEngine.playTactileClick('MODE_TOGGLE');
                  onToggleLayoutMode();
                }}
                className={`h-7 w-7 rounded-full border flex items-center justify-center cursor-pointer transition ${
                  layoutMode === 'SPLIT'
                    ? isEveningTheme
                      ? 'bg-amber-500/15 border-amber-400/35 text-amber-200'
                      : 'bg-cyan-500/15 border-cyan-400/35 text-cyan-200'
                    : isEveningTheme
                    ? 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.05] text-amber-100/90'
                    : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.05] text-slate-300'
                }`}
                title="Toggle Widget / Split Layout (Cmd+\)"
                aria-label="Toggle Widget / Split Layout (Cmd+\)"
              >
                {layoutMode === 'WIDGET' ? (
                  <Columns2 className="w-3.5 h-3.5" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5" />
                )}
              </button>
            )}

            {onOpenCommandDock && (
              <button
                id="btn-open-command-dock"
                type="button"
                onClick={() => {
                  triggerHaptic([10]);
                  onOpenCommandDock();
                }}
                className={`h-7 w-7 rounded-full border text-xs font-mono flex items-center justify-center cursor-pointer transition ${
                  isEveningTheme
                    ? 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.05] text-amber-100/90'
                    : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.05] text-slate-200'
                }`}
                title="Command & Smart Intake (Cmd/Ctrl + K)"
                aria-label="Open Command and Smart Intake (Cmd+K)"
              >
                <Command className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              id="btn-open-header-menu-drawer"
              type="button"
              onClick={() => {
                triggerHaptic([10]);
                soundEngine.playTactileClick('UI_TAP');
                setMenuDrawerOpen(true);
              }}
              className={`h-7 w-7 rounded-full border flex items-center justify-center cursor-pointer transition relative ${
                isEveningTheme
                  ? 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.05] text-amber-100/90'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.05] text-slate-200'
              }`}
              title="Open Menu, Audio, Logs, Insights & Settings"
              aria-label="Open Menu and Settings Drawer"
            >
              <Sliders className="w-3.5 h-3.5" />
              {!audioSettings.muted && isWorkTimerRunning && (
                <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* CLEAN SLIDE-OVER MENU / SETTINGS DRAWER */}
      <AnimatePresence>
        {menuDrawerOpen && (
          <div className="fixed inset-0 z-50 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMenuDrawerOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.aside
              id="header-slideover-menu"
              aria-label="System Menu and Controls"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={SPRING_TRANSITION}
              className={`relative z-10 w-full max-w-sm h-full overflow-y-auto border-l p-6 flex flex-col justify-between space-y-6 ${
                isEveningTheme
                  ? 'bg-[#0b0908]/95 border-white/[0.05] text-amber-50'
                  : 'bg-[#080b12]/95 border-white/[0.05] text-slate-100'
              } backdrop-blur-2xl shadow-2xl`}
            >
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-white/[0.05] pb-4">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      SYSTEM CONTROLS
                    </span>
                    <h2 className="font-serif text-2xl font-medium tracking-tight text-white">
                      Menu &amp; Settings
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMenuDrawerOpen(false)}
                    className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] flex items-center justify-center text-slate-300 cursor-pointer"
                    aria-label="Close Menu"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Shift Status Summary */}
                <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.05] space-y-2">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-400">Active Shift</span>
                    <span className="text-slate-200 tabular-nums">
                      {metrics.durationPrefix}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Logical Day {logicalDay}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-300">
                      {state.preExamTaperActive
                        ? 'Pre-Exam Taper'
                        : `${state.loadMode}${state.cruisePlus ? '+' : ''} Mode`}
                    </span>
                  </div>
                  {architectModeUnlocked && (
                    <div className="pt-1 flex items-center justify-between">
                      <span className="text-[10px] font-mono uppercase text-amber-300">
                        Architect Mode Active
                      </span>
                      <button
                        id="badge-architect-mode"
                        type="button"
                        onClick={() => {
                          setMenuDrawerOpen(false);
                          onOpenStateModal();
                        }}
                        className="text-[10px] font-mono underline text-amber-200 cursor-pointer"
                      >
                        Manage
                      </button>
                    </div>
                  )}
                  {visibleMilestones.length > 0 && (
                    <div className="pt-2 border-t border-white/[0.05] flex flex-wrap gap-1.5">
                      {visibleMilestones.map((m, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-white/[0.03] border border-white/[0.05] font-mono text-[10px] text-slate-300"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Primary Drawers & Logs */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block px-1">
                    Drawers &amp; Telemetry
                  </span>

                  <div className="grid grid-cols-1 gap-2">
                    <button
                      id="btn-open-today-log-drawer"
                      type="button"
                      onClick={() => {
                        triggerHaptic([10]);
                        soundEngine.playTactileClick('UI_TAP');
                        setMenuDrawerOpen(false);
                        onOpenTodayLogDrawer();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 text-slate-200">
                        <ListChecks className="w-4 h-4 text-sky-400" />
                        <span>Today&apos;s Block Log</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                        {todayLoggedCount} blocks ({rolloverLabel})
                      </span>
                    </button>

                    <button
                      id="btn-open-pipeline-drawer"
                      type="button"
                      onClick={() => {
                        soundEngine.playTactileClick('UI_TAP');
                        setMenuDrawerOpen(false);
                        onOpenPipelineDrawer();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 text-slate-200">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        <span>7-Day Master Pipeline Table</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Open →
                      </span>
                    </button>

                    {onOpenInsightsModal && (
                      <button
                        id="btn-open-insights-modal"
                        type="button"
                        onClick={() => {
                          triggerHaptic([10]);
                          soundEngine.playTactileClick('UI_TAP');
                          setMenuDrawerOpen(false);
                          onOpenInsightsModal();
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-medium flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 text-slate-200">
                          <BarChart3 className="w-4 h-4 text-indigo-400" />
                          <span>Empirical Insights &amp; 90-Day Heatmap</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          View
                        </span>
                      </button>
                    )}

                    <button
                      id="btn-open-planning-assistant"
                      type="button"
                      onClick={() => {
                        triggerHaptic([12]);
                        soundEngine.playTactileClick('UI_TAP');
                        setMenuDrawerOpen(false);
                        onToggleAssistantDrawer();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 text-slate-200">
                        <Bot className="w-4 h-4 text-sky-400" />
                        <span>Planning Assistant Side-Panel</span>
                      </span>
                      <kbd className="text-[10px] font-mono text-slate-400">⌘/</kbd>
                    </button>

                    <button
                      id="tab-nav-timer"
                      type="button"
                      onClick={() => {
                        triggerHaptic([10]);
                        setMenuDrawerOpen(false);
                        onSelectTab('TIMER');
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 text-slate-200">
                        <Timer className="w-4 h-4 text-cyan-400" />
                        <span>Expanded Timer &amp; Lock-Screen Console</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Open
                      </span>
                    </button>
                  </div>
                </div>

                {/* Procedural Web Audio Soundscape Controls */}
                <div className="p-4 rounded-2xl bg-white/[0.025] border border-white/[0.05] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
                      Focus Soundscape &amp; Audio
                    </span>
                    <button
                      id="btn-hud-audio-mute-toggle"
                      type="button"
                      onClick={() => {
                        triggerHaptic([8]);
                        const nextMuted = !audioSettings.muted;
                        onUpdateAudioSettings?.({ muted: nextMuted });
                        if (!nextMuted) {
                          soundEngine.playTactileClick('MODE_TOGGLE');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-full border font-mono text-[11px] flex items-center gap-1.5 cursor-pointer ${
                        audioSettings.muted
                          ? 'bg-white/[0.02] border-white/[0.05] text-slate-400'
                          : 'bg-cyan-500/15 border-cyan-400/30 text-cyan-200'
                      }`}
                    >
                      {audioSettings.muted ? (
                        <>
                          <VolumeX className="w-3 h-3" />
                          <span>Muted</span>
                        </>
                      ) : (
                        <>
                          <Volume2 className="w-3 h-3" />
                          <span>{Math.round(audioSettings.volume * 100)}%</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        'WARM_BROWN_NOISE',
                        'SOFT_RAIN',
                        'BINAURAL_40HZ',
                      ] as SoundscapeMode[]
                    ).map((modeKey) => {
                      const meta = SOUNDSCAPE_METADATA[modeKey];
                      const active = audioSettings.soundscapeMode === modeKey;
                      return (
                        <button
                          key={modeKey}
                          id={`btn-soundscape-${modeKey.toLowerCase()}`}
                          type="button"
                          onClick={() => {
                            soundEngine.playTactileClick('MODE_TOGGLE');
                            onUpdateAudioSettings?.({
                              soundscapeMode: modeKey,
                              muted: false,
                            });
                          }}
                          className={`p-2 rounded-xl border text-center font-mono text-[10px] transition cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400/40 text-cyan-100 font-medium'
                              : 'bg-white/[0.02] hover:bg-white/[0.05] border-white/[0.05] text-slate-400'
                          }`}
                        >
                          {meta.shortLabel}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    id="slider-hud-audio-volume"
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={audioSettings.volume}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      onUpdateAudioSettings?.({
                        volume: val,
                        muted: false,
                      });
                    }}
                    className="w-full accent-cyan-400 cursor-pointer"
                  />

                  <div className="flex items-center justify-between text-[11px] font-mono pt-1 border-t border-white/[0.05]">
                    <span className="text-slate-400">Tactile Acoustic Clicks</span>
                    <button
                      id="btn-toggle-tactile-clicks"
                      type="button"
                      onClick={() => {
                        const next = !audioSettings.tactileClicksEnabled;
                        onUpdateAudioSettings?.({
                          tactileClicksEnabled: next,
                        });
                        if (next) soundEngine.playTactileClick('STICKY_PIP');
                      }}
                      className={`px-2 py-0.5 rounded-md border text-[10px] cursor-pointer ${
                        audioSettings.tactileClicksEnabled
                          ? 'bg-emerald-500/15 border-emerald-400/30 text-emerald-200'
                          : 'bg-white/[0.03] border-white/[0.05] text-slate-400'
                      }`}
                    >
                      {audioSettings.tactileClicksEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>

                {/* State Sync, Presets & Quick Utilities */}
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block px-1">
                    State Sync &amp; Architecture
                  </span>

                  <div className="grid grid-cols-1 gap-2">
                    {onOpenGeminiBridgeModal && (
                      <button
                        id="btn-open-gemini-bridge-modal"
                        type="button"
                        onClick={() => {
                          triggerHaptic([12]);
                          soundEngine.playTactileClick('UI_TAP');
                          setMenuDrawerOpen(false);
                          onOpenGeminiBridgeModal();
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-400/25 text-xs font-medium text-sky-100 flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <Sparkles className="w-4 h-4 text-sky-300" />
                          <span>Sync with Gemini Hub</span>
                        </span>
                        <kbd className="text-[10px] font-mono text-sky-200/80">⌘G</kbd>
                      </button>
                    )}

                    {onOneTapSyncFromClipboard && (
                      <button
                        id="btn-one-tap-sync-clipboard"
                        type="button"
                        onClick={() => {
                          triggerHaptic([14]);
                          soundEngine.playTactileClick('UI_TAP');
                          setMenuDrawerOpen(false);
                          onOneTapSyncFromClipboard();
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-400/25 text-xs font-medium text-emerald-100 flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5">
                          <ClipboardPaste className="w-4 h-4 text-emerald-300" />
                          <span>1-Tap Sync from Clipboard</span>
                        </span>
                        <kbd className="text-[10px] font-mono text-emerald-200/80">⌘⇧V</kbd>
                      </button>
                    )}

                    <button
                      id="btn-open-state-io"
                      type="button"
                      onClick={() => {
                        soundEngine.playTactileClick('UI_TAP');
                        setMenuDrawerOpen(false);
                        onOpenStateModal();
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-medium flex items-center justify-between cursor-pointer"
                    >
                      <span className="flex items-center gap-2.5 text-slate-200">
                        <Download className="w-4 h-4 text-slate-400" />
                        <span>Settings &amp; 3-Part state.md Sync</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Configure
                      </span>
                    </button>

                    {onOpenOnboardingWizard && (
                      <button
                        id="btn-header-open-onboarding-wizard"
                        type="button"
                        onClick={() => {
                          soundEngine.playTactileClick('UI_TAP');
                          setMenuDrawerOpen(false);
                          onOpenOnboardingWizard();
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-medium flex items-center justify-between cursor-pointer"
                      >
                        <span className="flex items-center gap-2.5 text-slate-200">
                          <Sparkles className="w-4 h-4 text-indigo-400" />
                          <span>Profile Archetype Templates</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-400">
                          Switch
                        </span>
                      </button>
                    )}

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <button
                        id="btn-toggle-zero-work-sim"
                        type="button"
                        onClick={() => {
                          triggerHaptic([15]);
                          onToggleZeroWorkSimulation();
                          setMenuDrawerOpen(false);
                        }}
                        className="px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {metrics.isZeroWorkLeft ? (
                          <>
                            <Sun className="w-3.5 h-3.5 text-sky-400" />
                            <span>Resume Shift</span>
                          </>
                        ) : (
                          <>
                            <Moon className="w-3.5 h-3.5 text-amber-400" />
                            <span>Test 0m Lock</span>
                          </>
                        )}
                      </button>

                      {onToggleCinemaFocusMode && (
                        <button
                          id="btn-header-cinema-focus"
                          type="button"
                          onClick={() => {
                            triggerHaptic([12]);
                            onToggleCinemaFocusMode();
                            setMenuDrawerOpen(false);
                          }}
                          className="px-3 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs font-medium text-slate-200 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {cinemaFocusMode ? (
                            <Minimize2 className="w-3.5 h-3.5 text-sky-400" />
                          ) : (
                            <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                          )}
                          <span>Cinema Focus</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Footer: Tour, Shortcuts, Reset */}
              <div className="pt-4 border-t border-white/[0.05] flex items-center justify-between gap-2">
                {onOpenSpotlightTour && (
                  <button
                    id="btn-header-help-tour"
                    type="button"
                    onClick={() => {
                      triggerHaptic([10]);
                      setMenuDrawerOpen(false);
                      onOpenSpotlightTour();
                    }}
                    onContextMenu={(e) => {
                      if (onOpenShortcutsModal) {
                        e.preventDefault();
                        setMenuDrawerOpen(false);
                        onOpenShortcutsModal();
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Interactive Tour</span>
                  </button>
                )}

                <button
                  id="btn-reset-default-state"
                  type="button"
                  onClick={() => {
                    onResetDefault();
                    setMenuDrawerOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer"
                  title="Reset to default state"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
