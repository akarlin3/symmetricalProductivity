import React from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Calendar,
  Clock,
  Command,
  Download,
  ListChecks,
  Lock,
  Maximize2,
  Minimize2,
  Moon,
  RotateCcw,
  Sliders,
  Sparkles,
  Sun,
  Zap,
} from 'lucide-react';
import { FixedEventType, SymmetryState, TabId } from '../types/symmetry';
import {
  computeShiftMetrics,
  formatRolloverHourLabel,
  getLogicalDayKey,
  isPre4amRolloverWindow,
} from '../state/defaultState';
import { triggerHaptic } from '../utils/haptics';

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
  isEveningTheme: boolean;
  onOpenCommandDock?: () => void;
  cinemaFocusMode?: boolean;
  onToggleCinemaFocusMode?: () => void;
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
  isEveningTheme,
  onOpenCommandDock,
  cinemaFocusMode = false,
  onToggleCinemaFocusMode,
}) => {
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
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center border font-mono font-bold text-xs tracking-tighter transition-all duration-500 ${
                isEveningTheme
                  ? 'bg-amber-500/15 border-amber-400/35 text-amber-200 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.18)]'
                  : 'bg-sky-500/15 border-sky-400/40 text-sky-300 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.18)]'
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
            <div
              id="upcoming-milestones-banner"
              className={`hidden xl:flex items-center gap-1.5 transition-all duration-500 ${
                isCinemaReceding
                  ? 'opacity-15 blur-[2px] hover:opacity-100 hover:blur-0'
                  : ''
              }`}
            >
              {(state.upcomingMilestones?.length
                ? state.upcomingMilestones
                : ['Nov 12: Anatomy Exam', 'Dec 8–9: Comp Exam']
              ).map((milestone, idx) => (
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
          </div>

          {/* Utility Buttons: Command Dock (Cmd+K), Cinema Focus (F), Planning Assistant, Today's Log, 7-Day Pipeline Drawer, Simulate 0m Work Left, Profile Wizard, State.md Import/Export */}
          <div
            className={`flex items-center gap-1.5 transition-all duration-500 ${
              isCinemaReceding
                ? 'opacity-15 blur-[2px] hover:opacity-100 hover:blur-0'
                : ''
            }`}
          >
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
              onClick={onOpenPipelineDrawer}
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
                onClick={onOpenOnboardingWizard}
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
              onClick={onOpenStateModal}
              className={`px-2.5 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 cursor-pointer ${
                isEveningTheme
                  ? 'bg-white/[0.04] hover:bg-white/[0.08] border-amber-500/15 text-amber-100'
                  : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.09] text-slate-200'
              }`}
              title="Open Settings & State Sync modal (Switch / Reset Profile Template, Day-Boundary Preferences, State Sync)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Settings &amp; Sync</span>
            </button>

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
