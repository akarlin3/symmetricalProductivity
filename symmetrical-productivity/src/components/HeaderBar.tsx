import React, { useState } from 'react';
import {
  BarChart3,
  Bot,
  Calendar,
  Clock,
  Download,
  HelpCircle,
  ListChecks,
  Lock,
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
import { SOUNDSCAPE_METADATA, soundEngine } from '../utils/soundEngine';

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
}

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
}) => {
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
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
      className={`sticky top-0 z-30 border-b backdrop-blur-xl transition-colors duration-500 ${
        isEveningTheme
          ? 'bg-[#0a0807]/85 border-amber-500/20 text-amber-50 shadow-[inset_0_-1px_0_0_rgba(245,158,11,0.12)]'
          : 'bg-[#060911]/80 border-white/[0.08] text-slate-100 shadow-[inset_0_-1px_0_0_rgba(255,255,255,0.05)]'
      }`}
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5">
        {/* Top Row: Brand, Duration-Only Counter, Milestones, Action Controls */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-3">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border font-mono font-bold text-xs tracking-tighter transition-all duration-500 ${
                isEveningTheme
                  ? 'bg-amber-500/15 border-amber-400/40 text-amber-200 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.2)]'
                  : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]'
              }`}
            >
              SM
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className={`font-bold tracking-tight ${
                    isEveningTheme
                      ? 'font-serif text-xl sm:text-2xl text-amber-50 font-normal tracking-normal'
                      : 'text-base sm:text-lg text-white'
                  }`}
                >
                  {isEveningTheme ? 'Evening Recharge Menu' : 'SymmetryManager'}
                </h1>
                <span
                  className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border transition-colors duration-500 ${
                    isEveningTheme
                      ? 'bg-amber-500/15 border-amber-500/40 text-amber-200'
                      : state.preExamTaperActive
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-200'
                      : 'bg-white/[0.04] border-white/[0.12] text-cyan-300'
                  }`}
                >
                  {isEveningTheme
                    ? 'End-of-Shift Lock'
                    : state.preExamTaperActive
                    ? 'Pre-Exam Taper Mode'
                    : `${state.loadMode}${state.cruisePlus ? '+' : ''} Mode`}
                </span>
                <span
                  className={`hidden lg:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                    isEveningTheme
                      ? 'bg-stone-900/70 border-amber-900/50 text-amber-200/80'
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
            </div>
          </div>

          {/* Center / Primary Duration-Only Readout (Rule 1) + Milestones */}
          <div className="flex flex-wrap items-center gap-2">
            <div
              id="duration-only-header-badge"
              className={`px-3 py-1.5 rounded-xl border font-mono tabular-nums text-xs sm:text-sm font-bold tracking-tight flex items-center gap-2 transition-colors duration-500 ${
                metrics.isZeroWorkLeft || isEveningTheme
                  ? 'bg-amber-500/15 border-amber-500/45 text-amber-200 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.14)]'
                  : 'bg-cyan-500/10 border-cyan-400/40 text-cyan-200 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
              }`}
              title="Duration-Only Display (No wall-clock timestamps unless Fixed Event logged)"
            >
              {metrics.isZeroWorkLeft ? (
                <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              ) : (
                <Zap
                  className={`w-3.5 h-3.5 shrink-0 ${
                    isEveningTheme ? 'text-amber-400' : 'text-cyan-400'
                  }`}
                />
              )}
              <span className="tabular-nums">{metrics.durationPrefix}</span>
            </div>

            {fixedEventDisplay && (
              <div
                id="fixed-event-timestamp-pill"
                className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 font-mono tabular-nums text-xs flex items-center gap-1.5"
              >
                <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>{fixedEventDisplay}</span>
              </div>
            )}

            {/* Compact Upcoming Milestones Pills */}
            <div
              id="upcoming-milestones-banner"
              className="hidden xl:flex items-center gap-1.5"
            >
              {(state.upcomingMilestones?.length
                ? state.upcomingMilestones
                : ['Nov 12: Anatomy Exam', 'Dec 8–9: Comp Exam']
              ).map((milestone, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] font-semibold border ${
                    isEveningTheme
                      ? 'bg-white/[0.03] border-amber-500/25 text-amber-200/90'
                      : 'bg-white/[0.03] border-white/[0.08] text-slate-300'
                  }`}
                >
                  {milestone}
                </span>
              ))}
            </div>
          </div>

          {/* Utility Buttons: Soundscape HUD, Insights, Assistant, Today's Log, 7-Day Pipeline Drawer, Simulate 0m Work Left, Profile Wizard, State.md Import/Export, ? Tour */}
          <div className="flex flex-wrap items-center gap-1.5 relative">
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
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/45 text-amber-100'
                  : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/45 text-cyan-100'
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
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-mono font-semibold flex items-center gap-1.5 cursor-pointer ${
                isEveningTheme
                  ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/45 text-amber-100'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-400/40 text-cyan-200'
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
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-amber-500/25 text-amber-100'
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
                  ? 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/45 text-cyan-200'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/45 text-amber-200'
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
                    ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-400/45 text-amber-100'
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
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-amber-500/25 text-amber-100'
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
                  ? 'border-amber-500/20 bg-white/[0.03] hover:bg-white/[0.08] text-amber-300/70 hover:text-amber-200'
                  : 'border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.07] text-slate-400 hover:text-slate-200'
              }`}
              title="Reset to default state"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Bottom Row: Segmented Glassmorphic 4-Tab Bar */}
        <nav
          aria-label="Primary Tabs"
          className={`mt-2.5 p-1 rounded-2xl border grid grid-cols-2 sm:grid-cols-4 gap-1 ${
            isEveningTheme
              ? 'bg-black/40 border-amber-500/20'
              : 'bg-white/[0.02] border-white/[0.07]'
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
                className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between gap-1.5 transition cursor-pointer ${
                  isActive
                    ? isEveningTheme
                      ? 'bg-amber-500/20 border border-amber-400/50 text-amber-100 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.18)]'
                      : 'bg-cyan-500/15 border border-cyan-400/45 text-cyan-100 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]'
                    : isEveningTheme
                    ? 'border border-transparent hover:bg-white/[0.04] text-stone-400 hover:text-amber-100'
                    : 'border border-transparent hover:bg-white/[0.04] text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="truncate">
                  <span className="hidden md:inline">{t.label}</span>
                  <span className="md:hidden">{t.shortLabel}</span>
                </span>
                {t.badge && (
                  <span
                    className={`text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md ${
                      isActive
                        ? isEveningTheme
                          ? 'bg-amber-500/30 text-amber-100'
                          : 'bg-cyan-500/25 text-cyan-100'
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
