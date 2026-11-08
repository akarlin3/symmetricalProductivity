import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Bot,
  Calendar,
  Clock,
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
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import {
  AudioEngineSettings,
  FixedEventType,
  SoundscapeMode,
  SymmetryState,
  TabId,
} from '../types/symmetry';
import {
  computeShiftMetrics,
  DEFAULT_AUDIO_ENGINE_SETTINGS,
  formatRolloverHourLabel,
  getLogicalDayKey,
  isPre4amRolloverWindow,
} from '../state/defaultState';
import { triggerHaptic } from '../utils/haptics';
import { playHarmonicChord, SOUNDSCAPE_METADATA, soundEngine } from '../utils/soundEngine';
import { AveryCorpEmblem } from './AveryCorpEmblem';

interface HeaderBarProps {
  state: SymmetryState;
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
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
  cinemaFocusMode?: boolean;
  onToggleCinemaFocusMode?: () => void;
  architectModeUnlocked?: boolean;
  onUnlockArchitectMode?: (source: string) => void;
}

const SPRING_TRANSITION = {
  type: 'spring' as const,
  stiffness: 420,
  damping: 32,
};

export const HeaderBar: React.FC<HeaderBarProps> = ({
  state,
  activeTab,
  onSelectTab,
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
  cinemaFocusMode = false,
  onToggleCinemaFocusMode,
  architectModeUnlocked = false,
  onUnlockArchitectMode,
}) => {
  const tapTimestampsRef = useRef<number[]>([]);
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);

  // Trigger B: 5 taps within 3 seconds on the geometric Prism logo or app title
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
    LAB_2H: 'Fixed Event: 09:00 AM – 11:00 AM Lab (~2h)',
    VOLUNTEER: 'Fixed Event: 01:00 PM – 03:00 PM Volunteer Shift',
    EVENING_OUTING_6PM: `Fixed Event: ${shutdownTime} Evening Outing`,
  };
  const fixedEventDisplay = fixedEventLabels[state.fixedEvent];
  const logicalDay = state.logicalDayKey || getLogicalDayKey(new Date(), rolloverHour);
  const isLateShiftPreRollover = isPre4amRolloverWindow(new Date(), rolloverHour);
  const todayLoggedCount = (state.todayBlockLog || []).filter(
    (entry) => entry.logicalDate === logicalDay
  ).length;

  const isCinemaReceding = cinemaFocusMode && state.timer.isRunning;

  const visibleMilestones = (state.upcomingMilestones || []).filter((m) => {
    if (architectModeUnlocked) return true;
    const lower = m.toLowerCase();
    return !lower.includes('nov 12') && !lower.includes('dec 8');
  });

  const tabs: { id: TabId; label: string; shortLabel: string; badge?: string }[] = [
    {
      id: 'PIPELINE',
      label: '1. Focus Pipeline',
      shortLabel: 'Pipeline',
      badge: `${metrics.totalCompletedBlocks}/${metrics.totalTargetBlocks}`,
    },
    {
      id: 'TIMER',
      label: '2. Active Timer & Triage',
      shortLabel: 'Timer',
      badge: state.timer.workStage === 'IGNITION_5M' ? '5m' : '15m',
    },
    {
      id: 'RECHARGE',
      label: '3. Evening Recharge Menu',
      shortLabel: 'Recharge',
      badge: metrics.isZeroWorkLeft ? 'UNLOCKED' : '0m Lock',
    },
    {
      id: 'ROADMAP',
      label: '4. Long-Term Roadmap',
      shortLabel: 'Roadmap',
      badge: '4-Rung',
    },
  ];

  return (
    <header
      className={`sticky top-0 z-30 border-b backdrop-blur-2xl transition-colors duration-500 ${
        isEveningTheme
          ? 'bg-[#090706]/85 border-amber-500/10 text-amber-50 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.08)]'
          : 'bg-[#06080d]/80 border-white/[0.07] text-slate-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        {/* Top Row: Brand, Duration-Only Counter, Milestones, Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div
            className={`flex items-center gap-3 transition-all duration-500 ${
              isCinemaReceding
                ? 'opacity-15 blur-[2px] hover:opacity-100 hover:blur-0'
                : ''
            }`}
          >
            <AveryCorpEmblem
              id="header-brand-prism-trigger"
              size={36}
              variant="image"
              cropMode="mark-only"
              isTimerActive={isWorkTimerRunning}
              architectUnlocked={architectModeUnlocked}
              showPreviewPopover
              onClick={handleBrandPrismTap}
              ariaLabel="AveryCorp Institute Header Emblem (5-Tap Architect Trigger)"
            />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  id="header-app-title-trigger"
                  onClick={handleBrandPrismTap}
                  className={`font-bold tracking-tight cursor-pointer select-none ${
                    isEveningTheme
                      ? 'font-serif text-xl sm:text-2xl text-amber-50 font-normal tracking-normal'
                      : 'text-base sm:text-lg text-white'
                  }`}
                >
                  {isEveningTheme ? 'Evening Recharge Menu' : 'SymmetryManager'}
                </h1>
                {architectModeUnlocked && (
                  <button
                    id="badge-architect-mode"
                    type="button"
                    onClick={() => {
                      triggerHaptic([10]);
                      onOpenStateModal();
                    }}
                    title="Architect Mode Active — Click to manage or lock in Settings"
                    className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border bg-amber-500/20 border-amber-400/50 text-amber-200 hover:bg-amber-500/30 transition cursor-pointer"
                  >
                    ARCHITECT
                  </button>
                )}
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border transition-colors duration-500 ${
                    isEveningTheme
                      ? 'bg-amber-500/15 border-amber-500/35 text-amber-200'
                      : state.preExamTaperActive
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                      : 'bg-white/[0.045] border-white/[0.12] text-sky-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
                  }`}
                >
                  {isEveningTheme
                    ? 'End-of-Shift Lock'
                    : state.preExamTaperActive
                    ? 'Pre-Exam Taper Mode'
                    : `${state.loadMode}${state.cruisePlus ? '+' : ''} Mode`}
                </span>
                <span
                  className={`hidden lg:inline-flex items-center gap-1 text-[10px] font-mono tracking-tight tabular-nums px-2 py-0.5 rounded-full border ${
                    isEveningTheme
                      ? 'bg-stone-900/70 border-amber-500/15 text-amber-200/80'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
                  }`}
                  title={`${rolloverLabel} Day-Rollover Boundary`}
                >
                  <Clock className="w-3 h-3" />
                  <span>
                    Shift {logicalDay}{' '}
                    {isLateShiftPreRollover
                      ? `(Pre-${rolloverHour === 0 ? '12AM' : `${rolloverHour}AM`} Window)`
                      : `(${rolloverHour === 0 ? '12AM' : `${rolloverHour}AM`} Rollover)`}
                  </span>
                </span>
              </div>
              {architectModeUnlocked && (
                <div
                  id="header-averycorp-micro-subtitle"
                  className="text-[9px] font-mono uppercase tracking-[0.18em] text-amber-300/80 mt-0.5 select-none"
                >
                  AVERYCORP INSTITUTE • EST. 2026
                </div>
              )}
            </div>
          </div>

          {/* Center / Primary Duration-Only Readout (Rule 1) — Remains in 100% Sharp Focus during Cinema Focus Mode */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              id="duration-only-header-badge"
              className={`px-3 py-1.5 rounded-xl border font-mono tracking-tight tabular-nums text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-500 ${
                metrics.isZeroWorkLeft || isEveningTheme
                  ? 'bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.14)]'
                  : 'bg-sky-500/12 border-sky-400/40 text-sky-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
              }`}
              title="Duration-Only Display (No wall-clock timestamps unless Fixed Event logged)"
            >
              {metrics.isZeroWorkLeft ? (
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Zap
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isEveningTheme ? 'text-amber-400' : 'text-sky-400'
                  }`}
                />
              )}
              <span className="tracking-tight tabular-nums">{metrics.durationPrefix}</span>
            </div>

            {fixedEventDisplay && (
              <div
                id="fixed-event-timestamp-pill"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 font-mono tracking-tight tabular-nums text-xs flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{fixedEventDisplay}</span>
              </div>
            )}

            {/* Compact Upcoming Milestones Pills */}
            {visibleMilestones.length > 0 && (
              <div
                id="upcoming-milestones-banner"
                className={`hidden xl:flex items-center gap-1.5 transition-all duration-500 ${
                  isCinemaReceding
                    ? 'opacity-15 blur-[2px] hover:opacity-100 hover:blur-0'
                    : ''
                }`}
              >
                {visibleMilestones.map((milestone, idx) => (
                  <span
                    key={idx}
                    className={`px-2.5 py-1 rounded-lg font-mono text-[11px] tracking-tight tabular-nums font-semibold border ${
                      isEveningTheme
                        ? 'bg-white/[0.03] border-amber-500/15 text-amber-200/90'
                        : 'bg-white/[0.03] border-white/[0.08] text-slate-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
                    }`}
                  >
                    {milestone}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Utility Buttons: Soundscape HUD, Insights, Command Dock (Cmd+K), Cinema Focus (F), Assistant, Today's Log, 7-Day Pipeline Drawer, Simulate 0m Work Left, Profile Wizard, State.md Import/Export, ? Tour */}
          <div
            className={`flex flex-wrap items-center gap-1.5 relative transition-all duration-500 ${
              isCinemaReceding
                ? 'opacity-15 blur-[2px] hover:opacity-100 hover:blur-0'
                : ''
            }`}
          >
            {onOpenGeminiBridgeModal && (
              <button
                id="btn-open-gemini-bridge-modal"
                type="button"
                onClick={() => {
                  triggerHaptic([12]);
                  soundEngine.playTactileClick('UI_TAP');
                  onOpenGeminiBridgeModal();
                }}
                className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)] ${
                  isEveningTheme
                    ? 'bg-gradient-to-r from-amber-500/25 to-orange-500/20 hover:from-amber-500/35 hover:to-orange-500/30 border-amber-400/50 text-amber-100'
                    : 'bg-gradient-to-r from-sky-500/25 to-indigo-500/25 hover:from-sky-500/35 hover:to-indigo-500/35 border-sky-400/50 text-sky-100 shadow-[0_0_15px_rgba(56,189,248,0.18)]'
                }`}
                title="Open Export to Gemini & Bidirectional Sync Hub (Cmd/Ctrl + G)"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span>Sync with Gemini</span>
                <kbd className="px-1 py-0.5 rounded bg-black/45 border border-white/15 text-[9px] font-mono text-sky-200">
                  ⌘G
                </kbd>
              </button>
            )}

            {/* 1. Procedural Web Audio Soundscape & Tactile Acoustic HUD */}
            <div className="relative">
              <div className="inline-flex items-center rounded-xl border overflow-hidden bg-white/[0.03] border-white/[0.1]">
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
                  className={`px-2 py-1.5 text-xs font-mono flex items-center gap-1 cursor-pointer transition ${
                    audioSettings.muted
                      ? 'text-slate-500 hover:text-slate-300'
                      : isWorkTimerRunning
                      ? 'bg-emerald-500/20 text-emerald-200'
                      : 'text-cyan-300 hover:bg-white/[0.06]'
                  }`}
                  title={
                    audioSettings.muted
                      ? 'Unmute Procedural Web Audio Soundscape & Tactile Clicks'
                      : 'Mute Procedural Web Audio Soundscape'
                  }
                >
                  {audioSettings.muted ? (
                    <VolumeX className="w-3.5 h-3.5" />
                  ) : (
                    <Volume2
                      className={`w-3.5 h-3.5 ${
                        isWorkTimerRunning ? 'animate-pulse text-emerald-300' : ''
                      }`}
                    />
                  )}
                </button>
                <button
                  id="btn-hud-audio-menu"
                  type="button"
                  onClick={() => {
                    soundEngine.playTactileClick('UI_TAP');
                    setAudioMenuOpen((prev) => !prev);
                  }}
                  className="px-2 py-1.5 border-l border-white/[0.08] text-[11px] font-mono text-slate-200 hover:bg-white/[0.06] cursor-pointer flex items-center gap-1"
                  title="Configure Procedural Focus Soundscape (Warm Brown Noise, Soft Rain, 40Hz Binaural Focus Drone) & Volume"
                >
                  <span className="hidden xl:inline">
                    {SOUNDSCAPE_METADATA[audioSettings.soundscapeMode]?.shortLabel ||
                      'Brown Noise'}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {audioSettings.muted
                      ? 'Muted'
                      : `${Math.round(audioSettings.volume * 100)}%`}
                  </span>
                </button>
              </div>

              {audioMenuOpen && (
                <div
                  id="hud-audio-popover"
                  className="absolute right-0 mt-2 w-80 rounded-2xl bg-[#0b101b]/95 backdrop-blur-xl border border-cyan-500/35 shadow-2xl p-3.5 z-50 space-y-3 text-slate-100"
                >
                  <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                    <div>
                      <div className="text-xs font-bold font-mono text-cyan-200">
                        Procedural Web Audio Engine
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Auto-fades 2s in on 5m/15m timer start; fades out on Pause/Break
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAudioMenuOpen(false)}
                      className="text-xs font-mono text-slate-400 hover:text-white cursor-pointer px-1.5"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Soundscape Mode Selector */}
                  <div className="space-y-1.5">
                    <span className="block text-[10px] font-mono uppercase tracking-wider text-slate-400">
                      Focus Soundscape Mode
                    </span>
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
                          className={`w-full text-left p-2 rounded-xl border transition cursor-pointer ${
                            active
                              ? 'bg-cyan-500/15 border-cyan-400/60 text-cyan-100'
                              : 'bg-white/[0.02] hover:bg-white/[0.06] border-white/[0.07] text-slate-300'
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs font-mono font-bold">
                            <span>{meta.label}</span>
                            {active && (
                              <span className="text-[10px] text-cyan-300">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {meta.subtitle}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Master Volume Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="text-slate-300">Ambient Gain</span>
                      <span className="text-cyan-300 font-bold">
                        {audioSettings.muted
                          ? 'Muted'
                          : `${Math.round(audioSettings.volume * 100)}%`}
                      </span>
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
                  </div>

                  {/* Tactile Acoustic Clicks Toggle */}
                  <div className="pt-1 border-t border-white/[0.08] flex items-center justify-between text-[11px] font-mono">
                    <span className="text-slate-300">
                      15ms Tactile Clicks &amp; 0m Chord
                    </span>
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
                      className={`px-2.5 py-1 rounded-lg border font-bold cursor-pointer ${
                        audioSettings.tactileClicksEnabled
                          ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                          : 'bg-white/[0.04] border-white/[0.1] text-slate-400'
                      }`}
                    >
                      {audioSettings.tactileClicksEnabled ? 'ON' : 'OFF'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Empirical Insights & 90-Day Symmetry Heatmap Button */}
            {onOpenInsightsModal && (
              <button
                id="btn-open-insights-modal"
                type="button"
                onClick={() => {
                  triggerHaptic([10]);
                  soundEngine.playTactileClick('UI_TAP');
                  onOpenInsightsModal();
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer ${
                  isEveningTheme
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/45 text-amber-100'
                    : 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-400/45 text-indigo-100'
                }`}
                title="Open Empirical Insights Drawer & 90-Day Symmetry Heatmap"
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span>Insights</span>
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
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] ${
                  isEveningTheme
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/35 text-amber-100'
                    : 'bg-white/[0.045] hover:bg-white/[0.09] border-white/[0.12] text-slate-100'
                }`}
                title="Open Raycast Command Dock & Smart Intake Palette (Cmd/Ctrl + K)"
              >
                <Command className="w-3.5 h-3.5 text-sky-400" />
                <span className="hidden lg:inline">Command</span>
                <kbd className="px-1 py-0.5 rounded bg-black/45 border border-white/10 text-[9px] font-mono text-slate-300">
                  ⌘K
                </kbd>
              </button>
            )}

            {onToggleCinemaFocusMode && (
              <button
                id="btn-header-cinema-focus"
                type="button"
                onClick={() => {
                  triggerHaptic([12]);
                  onToggleCinemaFocusMode();
                }}
                className={`px-2 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1 cursor-pointer ${
                  cinemaFocusMode
                    ? 'bg-sky-400 text-slate-950 border-sky-300 font-bold shadow-[0_0_14px_rgba(56,189,248,0.4)]'
                    : isEveningTheme
                    ? 'bg-white/[0.04] hover:bg-white/[0.08] border-amber-500/20 text-amber-100'
                    : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.09] text-slate-200'
                }`}
                title="Toggle Cinema Focus Mode (Press F)"
              >
                {cinemaFocusMode ? (
                  <Minimize2 className="w-3.5 h-3.5" />
                ) : (
                  <Maximize2 className="w-3.5 h-3.5" />
                )}
                <kbd className="hidden xl:inline px-1 py-0.5 rounded bg-black/35 text-[9px] font-mono">
                  F
                </kbd>
              </button>
            )}

            <button
              id="btn-open-planning-assistant"
              type="button"
              onClick={() => {
                triggerHaptic([12]);
                soundEngine.playTactileClick('UI_TAP');
                onToggleAssistantDrawer();
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                isEveningTheme
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/35 text-amber-100'
                  : 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/40 text-sky-100'
              }`}
              title="Toggle Planning Assistant AI Side-Panel (Cmd/Ctrl + /)"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Assistant</span>
              <kbd className="hidden lg:inline px-1 py-0.5 rounded bg-black/35 text-[9px] font-mono">
                ⌘/
              </kbd>
            </button>

            <button
              id="btn-open-today-log-drawer"
              type="button"
              onClick={() => {
                triggerHaptic([10]);
                soundEngine.playTactileClick('UI_TAP');
                onOpenTodayLogDrawer();
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono tracking-tight tabular-nums font-semibold flex items-center gap-1.5 cursor-pointer ${
                isEveningTheme
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/35 text-amber-100'
                  : 'bg-sky-500/10 hover:bg-sky-500/20 border-sky-400/35 text-sky-200'
              }`}
              title={`Open Editable Today's Block Log drawer (since ${rolloverLabel} logical day)`}
            >
              <ListChecks className="w-3.5 h-3.5 shrink-0" />
              <span>Today&apos;s Log ({todayLoggedCount} blocks)</span>
            </button>

            <button
              id="btn-open-pipeline-drawer"
              type="button"
              onClick={() => {
                soundEngine.playTactileClick('UI_TAP');
                onOpenPipelineDrawer();
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                isEveningTheme
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-amber-500/15 text-amber-100'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.09] text-slate-200'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden md:inline">7-Day Table</span>
            </button>

            <button
              id="btn-toggle-zero-work-sim"
              type="button"
              onClick={() => {
                triggerHaptic([15]);
                onToggleZeroWorkSimulation();
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                metrics.isZeroWorkLeft
                  ? 'bg-sky-500/15 hover:bg-sky-500/25 border-sky-400/40 text-sky-200'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/40 text-amber-200'
              }`}
              title="Toggle between On-Duty remaining blocks and 0m work left (End-of-Shift Lock)"
            >
              {metrics.isZeroWorkLeft ? (
                <>
                  <Sun className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Resume Shift</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Test 0m Lock</span>
                </>
              )}
            </button>

            {onOpenOnboardingWizard && (
              <button
                id="btn-header-open-onboarding-wizard"
                type="button"
                onClick={() => {
                  soundEngine.playTactileClick('UI_TAP');
                  onOpenOnboardingWizard();
                }}
                className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                  isEveningTheme
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/35 text-amber-100'
                    : 'bg-indigo-500/15 hover:bg-indigo-500/25 border-indigo-400/45 text-indigo-100'
                }`}
                title="Switch / Reset Profile Archetype Template & Onboarding Wizard"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Profile Archetype</span>
              </button>
            )}

            <button
              id="btn-open-state-io"
              type="button"
              onClick={() => {
                soundEngine.playTactileClick('UI_TAP');
                onOpenStateModal();
              }}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                isEveningTheme
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-amber-500/15 text-amber-100'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.09] text-slate-200'
              }`}
              title="Open Settings & State Sync modal (Switch / Reset Profile Template, Rolling Auto-Backups, State Sync)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings &amp; Sync</span>
            </button>

            {/* 5. Header `?` Button for 4-Step Spotlight Tour & Keyboard Shortcut Cheat-Sheet */}
            {onOpenSpotlightTour && (
              <button
                id="btn-header-help-tour"
                type="button"
                onClick={() => {
                  triggerHaptic([10]);
                  soundEngine.playTactileClick('UI_TAP');
                  onOpenSpotlightTour();
                }}
                onContextMenu={(e) => {
                  if (onOpenShortcutsModal) {
                    e.preventDefault();
                    onOpenShortcutsModal();
                  }
                }}
                className={`px-2.5 py-1.5 rounded-xl border font-mono font-bold text-xs flex items-center gap-1 cursor-pointer ${
                  isEveningTheme
                    ? 'border-amber-400/45 bg-amber-500/15 hover:bg-amber-500/25 text-amber-100'
                    : 'border-cyan-400/45 bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-200'
                }`}
                title="How Symmetrical Works — Launch 4-Step Interactive Spotlight Tour & Keyboard Shortcut Cheat-Sheet (?)"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                <span>?</span>
              </button>
            )}

            <button
              id="btn-reset-default-state"
              type="button"
              onClick={onResetDefault}
              className={`p-1.5 rounded-xl border cursor-pointer ${
                isEveningTheme
                  ? 'border-amber-500/15 bg-white/[0.03] hover:bg-white/[0.08] text-amber-300/70 hover:text-amber-200'
                  : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-slate-400 hover:text-slate-200'
              }`}
              title="Reset to default state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Row: Segmented Glassmorphic 4-Tab Bar with Spring-Animated Pill (layoutId="activeNavTab") */}
        <nav
          aria-label="Primary Tabs"
          className={`mt-2.5 p-1 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-1 transition-all duration-500 ${
            isEveningTheme
              ? 'bg-black/45 border-amber-500/10 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.06)]'
              : 'bg-white/[0.025] border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
          } ${
            isCinemaReceding
              ? 'opacity-15 blur-[2px] hover:opacity-100 hover:blur-0'
              : ''
          }`}
        >
          {tabs.map((t) => {
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                id={`tab-nav-${t.id.toLowerCase()}`}
                type="button"
                onClick={() => onSelectTab(t.id)}
                className={`relative px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                  isActive
                    ? isEveningTheme
                      ? 'text-amber-50'
                      : 'text-sky-50'
                    : isEveningTheme
                    ? 'hover:bg-white/[0.03] text-stone-400 hover:text-amber-100'
                    : 'hover:bg-white/[0.03] text-slate-400 hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavTab"
                    transition={SPRING_TRANSITION}
                    className={`absolute inset-0 rounded-xl pointer-events-none ${
                      isEveningTheme
                        ? 'bg-gradient-to-b from-amber-500/25 to-amber-500/10 border border-amber-400/45 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.22),0_4px_16px_rgba(245,158,11,0.18)]'
                        : 'bg-gradient-to-b from-sky-400/20 to-indigo-500/10 border border-sky-400/45 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18),0_4px_16px_rgba(56,189,248,0.18)]'
                    }`}
                  />
                )}
                <span className="relative z-10 truncate">
                  <span className="hidden md:inline">{t.label}</span>
                  <span className="md:hidden">{t.shortLabel}</span>
                </span>
                {t.badge && (
                  <span
                    className={`relative z-10 text-[10px] font-mono tracking-tight tabular-nums px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? isEveningTheme
                          ? 'bg-amber-500/30 text-amber-100'
                          : 'bg-sky-500/25 text-sky-100'
                        : isEveningTheme
                        ? 'bg-white/[0.05] text-stone-400'
                        : 'bg-white/[0.05] text-slate-400'
                    }`}
                  >
                    {t.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
