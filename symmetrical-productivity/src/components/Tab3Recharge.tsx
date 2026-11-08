import React from 'react';
import {
  BookOpen,
  Cpu,
  FastForward,
  Film,
  Flame,
  Gamepad2,
  Headphones,
  Lock,
  Moon,
  Music,
  Pause,
  Play,
  RefreshCw,
  Sparkles,
  Tv,
  Unlock,
} from 'lucide-react';
import {
  MediaSubTrackId,
  RechargeCategoryId,
  StickyKey,
  SymmetryState,
} from '../types/symmetry';
import { computeShiftMetrics } from '../state/defaultState';
import { BreathingVisualizer478 } from './BreathingVisualizer478';
import { triggerHaptic } from '../utils/haptics';

interface Tab3RechargeProps {
  state: SymmetryState;
  onUnlockZeroWorkLeft: () => void;
  onOpenFlowExtensionPrompt: () => void;
  onCancelFlowExtensionPrompt: () => void;
  onConfirmFlowExtension: () => void;
  onToggleFlowExtensionTimer: () => void;
  onLogFlowExtensionBlock20m: () => void;
  onSetWeeklyExtensionsUsed: (count: number) => void;
  onToggleTomorrowEarlyAnchor: () => void;
  onToggleOption0Timer: () => void;
  onCompleteOption0Window: () => void;
  onResolveForkCheck: (choice: 'SLEEP' | 'START_5M_ACTIVITY') => void;
  onSelectCategory: (cat: RechargeCategoryId) => void;
  onSelectMediaSubTab: (sub: MediaSubTrackId) => void;
  onSelectFictionSpeed: (speed: '1.75x' | '2.00x' | '2.25x') => void;
  onStartCategory5mStep: () => void;
  onAdvanceCategoryPacingMilestone: () => void;
  onResolveCheckInPrompt: (decision: 'KEEP_GOING' | 'SWITCH' | 'REST') => void;
  onSwapStickyItemFromBacklog: (key: StickyKey) => void;
  onIncrementStickyStart?: (key: StickyKey) => void;
}

/**
 * Helper to render visual [X / 3] progress dots for Sticky items (Categories 2, 3A/3B/3C, 5)
 */
const StickyDotsCounter: React.FC<{
  starts: number;
  unlockedViaCheckIn: boolean;
}> = ({ starts, unlockedViaCheckIn }) => {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1" aria-label={`${starts} of 3 starts`}>
        {[0, 1, 2].map((idx) => {
          const filled = idx < starts;
          return (
            <span
              key={idx}
              className={`w-2.5 h-2.5 rounded-full transition-all ${
                filled
                  ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                  : 'bg-amber-950/80 border border-amber-500/40'
              }`}
            />
          );
        })}
      </div>
      <span className="font-mono text-[11px] font-bold tabular-nums text-amber-200">
        [{starts} / 3]
      </span>
      {(starts >= 3 || unlockedViaCheckIn) && (
        <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 font-mono text-[9px] uppercase text-emerald-200 font-bold">
          Swap / Complete Ready
        </span>
      )}
    </div>
  );
};

export const Tab3Recharge: React.FC<Tab3RechargeProps> = ({
  state,
  onUnlockZeroWorkLeft,
  onOpenFlowExtensionPrompt,
  onCancelFlowExtensionPrompt,
  onConfirmFlowExtension,
  onToggleFlowExtensionTimer,
  onLogFlowExtensionBlock20m,
  onSetWeeklyExtensionsUsed,
  onToggleTomorrowEarlyAnchor,
  onToggleOption0Timer,
  onCompleteOption0Window,
  onResolveForkCheck,
  onSelectCategory,
  onSelectMediaSubTab,
  onSelectFictionSpeed,
  onStartCategory5mStep,
  onAdvanceCategoryPacingMilestone,
  onResolveCheckInPrompt,
  onSwapStickyItemFromBacklog,
  onIncrementStickyStart,
}) => {
  const metrics = computeShiftMetrics(state);
  const { recharge } = state;

  // Flow Extension 3-part eligibility check (Rule 7)
  const tomorrowDay = state.pipelineDays[1];
  const tomorrowHasZeroEarlyEvents = !tomorrowDay?.earlyMorningAnchor;
  const activeTaskNotFlashcards = state.timer.activeTaskType !== 'FLASHCARDS';
  const weeklyCapUnder2 = recharge.weeklyExtensionsUsed < 2;
  const canUseFlowExtension =
    tomorrowHasZeroEarlyEvents && activeTaskNotFlashcards && weeklyCapUnder2;

  const formatMMSS = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const activeMediaSlot = recharge.stickySlots[recharge.activeMediaTab];
  const makerSlot = recharge.stickySlots.CAT2_MAKER;
  const gamingSlot = recharge.stickySlots.CAT5_GAMING;

  return (
    <div className="relative space-y-6 text-amber-50 animate-tab-enter pb-8">
      {/* Top Radial Campfire Atmospheric Halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-10 inset-x-0 h-56 rounded-full blur-3xl opacity-60 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 75% 100% at 50% 0%, rgba(245, 158, 11, 0.28), rgba(234, 88, 12, 0.12) 55%, transparent 85%)',
        }}
      />

      {/* Header Banner */}
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-amber-500/20 pb-4">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-amber-300/90">
            <Moon className="w-3.5 h-3.5 text-amber-400" />
            <span>LOW-BLUE-LIGHT MODE • ZERO GAMIFICATION</span>
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-amber-50 tracking-normal mt-1">
            Evening Recharge Menu
          </h2>
        </div>

        {/* Gate Pill or Shift Lock Status */}
        {!metrics.isZeroWorkLeft ? (
          <div
            id="evening-lock-gate-notice"
            className="flex flex-wrap items-center gap-3 px-4 py-2.5 rounded-2xl bento-surface-evening"
          >
            <div className="text-xs font-mono text-amber-200/90">
              <span className="font-bold text-amber-300">{metrics.remainingWorkFormatted}</span> remaining on shift
            </div>
            <button
              id="btn-unlock-evening-menu-now"
              type="button"
              onClick={() => {
                triggerHaptic([20]);
                onUnlockZeroWorkLeft();
              }}
              className="px-3.5 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Set [0m work left] &amp; Lock Shift</span>
            </button>
          </div>
        ) : (
          <div className="px-4 py-2 rounded-2xl bg-amber-500/15 border border-amber-400/50 font-mono text-xs text-amber-200 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>End-of-Shift Lock Active • [0m work left]</span>
          </div>
        )}
      </div>

      {/* =====================================================================
          WIDE, SERENE GLASSMORPHIC BANNER: OPTION 0 (20M STILLNESS)
          WITH EMBEDDED, ANIMATED 4-7-8 BREATHING AURA RING
         ===================================================================== */}
      <section
        id="option-0-stillness-card"
        aria-labelledby="option-0-heading"
        className="rounded-3xl bento-hero-border-evening p-6 sm:p-7 space-y-5"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left 7 Columns: Option 0 Stillness Controls & Consecutive Window Pacing */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 rounded-full bg-amber-400/20 border border-amber-300/50 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-200">
                OPTION 0 • REST / STILLNESS
              </span>
              <span className="px-2.5 py-1 rounded-full bg-black/40 border border-amber-500/30 font-mono text-[11px] text-amber-200/90">
                Consecutive Windows: [{recharge.option0ConsecutiveWindows} / 2] (40m Cap)
              </span>
            </div>

            <div>
              <h3
                id="option-0-heading"
                className="font-serif text-2xl sm:text-3xl text-amber-50"
              >
                20-Minute Silent Stillness Window
              </h3>
              <p className="text-xs sm:text-sm text-amber-100/80 mt-1 leading-relaxed">
                Zero startup step and zero scrolling. Eyes closed, recliner, or compression boots. Capped at 2 consecutive 20m windows (40m) before triggering a neutral Fork Check.
              </p>
            </div>

            {/* Timer Readout & Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <div className="px-5 py-3 rounded-2xl bg-black/55 border border-amber-500/40 font-mono text-3xl sm:text-4xl font-extrabold tabular-nums text-amber-100 shadow-inner">
                {formatMMSS(recharge.option0SecondsLeft)}
              </div>

              <button
                id="btn-option0-start-pause"
                type="button"
                onClick={onToggleOption0Timer}
                className="px-5 py-3.5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-bold text-xs sm:text-sm flex items-center gap-2 cursor-pointer shadow-lg shadow-amber-500/25"
              >
                {recharge.option0Running ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause Stillness</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Start 20m Stillness</span>
                  </>
                )}
              </button>

              <button
                id="btn-option0-complete-window"
                type="button"
                onClick={onCompleteOption0Window}
                className="px-4 py-3.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-amber-400/40 text-amber-100 font-mono font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                title="Complete 20m window now (2 consecutive windows triggers the 40m Fork Check)"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Log +1 Window ({recharge.option0ConsecutiveWindows}/2)</span>
              </button>
            </div>
          </div>

          {/* Right 5 Columns: Embedded Animated 4-7-8 Breathing Aura Ring */}
          <div className="lg:col-span-5">
            <BreathingVisualizer478
              id="option0-breathing-478-visualizer"
              isActiveContext={true}
              defaultExpanded={true}
              variant="evening"
              compact={true}
            />
          </div>
        </div>

        {/* 40m Fork Check Prompt Modal (Rule 8: "Go to Sleep" vs. "Start One 5m Activity") */}
        {recharge.forkCheckModalOpen && (
          <div
            id="option-0-fork-check-modal"
            className="p-5 rounded-2xl bg-black/75 border-2 border-amber-400 space-y-3 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-mono text-xs font-bold uppercase">
                40m Cap Reached (2 / 2 Windows) • Fork Check
              </span>
              <span className="font-mono text-xs text-amber-200">
                No third passive window
              </span>
            </div>
            <p className="text-sm text-amber-50 font-medium">
              40 minutes of stillness completed. Choose your next path:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="btn-fork-go-to-sleep"
                type="button"
                onClick={() => onResolveForkCheck('SLEEP')}
                className="py-3 px-4 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-amber-500/40 text-amber-100 font-mono font-bold text-xs cursor-pointer"
              >
                Go to Sleep
              </button>
              <button
                id="btn-fork-start-5m-activity"
                type="button"
                onClick={() => onResolveForkCheck('START_5M_ACTIVITY')}
                className="py-3 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-bold text-xs cursor-pointer"
              >
                Start One 5m Activity
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          EVENING PACING BAR (5m Startup -> 20m & 40m Check-In -> 60m Mandatory Break)
         ===================================================================== */}
      <section
        id="recharge-pacing-console"
        aria-label="Evening Category Pacing Console"
        className="rounded-3xl bento-surface-evening p-5 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>ACTIVE RECHARGE PACING ENGINE</span>
            </span>
            <h3 className="font-serif text-2xl text-amber-50 mt-0.5">
              5m Startup Step → 20m &amp; 40m Check-In → 60m Physical Break
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="px-4 py-2 rounded-2xl bg-black/50 border border-amber-500/40 font-mono text-2xl font-extrabold tabular-nums text-amber-200">
              {formatMMSS(recharge.categorySecondsLeft)}
            </div>

            <button
              id="btn-start-category-5m"
              type="button"
              disabled={recharge.activeCategory === 'NONE'}
              onClick={onStartCategory5mStep}
              className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-stone-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
            >
              {recharge.categoryRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    {recharge.pacingStage === 'STARTUP_5M'
                      ? 'Start 5m Step'
                      : 'Resume Window'}
                  </span>
                </>
              )}
            </button>

            <button
              id="btn-advance-category-milestone"
              type="button"
              disabled={recharge.activeCategory === 'NONE'}
              onClick={onAdvanceCategoryPacingMilestone}
              className="px-3.5 py-2.5 rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] disabled:opacity-40 border border-amber-400/40 text-amber-100 font-mono font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              title="Advance to next milestone (5m → 20m Check-In → 40m Check-In → 60m Break)"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Next Milestone</span>
            </button>
          </div>
        </div>

        {/* 4-Step Visual Milestone Track */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          {(
            [
              { id: 'STARTUP_5M', label: '1. 5m Startup Step' },
              { id: 'WINDOW_20M', label: '2. 20m Check-In' },
              { id: 'WINDOW_40M', label: '3. 40m Check-In' },
              { id: 'MANDATORY_BREAK_60M', label: '4. 60m Physical Break' },
            ] as const
          ).map((step) => {
            const active = recharge.pacingStage === step.id;
            return (
              <div
                key={step.id}
                className={`p-2.5 rounded-xl border text-center transition ${
                  active
                    ? 'bg-amber-500/20 border-amber-400 text-amber-100 font-bold shadow-[inset_0_1px_0_0_rgba(255,251,235,0.2)]'
                    : 'bg-black/30 border-amber-500/15 text-stone-400'
                }`}
              >
                {step.label}
              </div>
            );
          })}
        </div>

        {/* 20m / 40m Check-In Prompt Modal ("Keep going, switch, or rest?") */}
        {recharge.checkInModalOpen && (
          <div
            id="recharge-checkin-modal"
            className="p-4 rounded-2xl bg-black/75 border-2 border-amber-400 space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-mono text-xs font-bold uppercase">
                {recharge.checkInMilestone}m Check-In Prompt
              </span>
              <span className="text-xs font-mono text-emerald-300">
                ✓ Immediate Sticky Backlog Swap Unlocked
              </span>
            </div>
            <p className="text-sm font-semibold text-amber-50">
              “Keep going, switch, or rest?”
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <button
                id="btn-checkin-keep-going"
                type="button"
                onClick={() => onResolveCheckInPrompt('KEEP_GOING')}
                className="py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-bold text-xs cursor-pointer"
              >
                Keep Going
              </button>
              <button
                id="btn-checkin-switch"
                type="button"
                onClick={() => onResolveCheckInPrompt('SWITCH')}
                className="py-2.5 px-3 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-amber-400/50 text-amber-100 font-mono font-bold text-xs cursor-pointer"
              >
                Switch Activity / Swap Sticky
              </button>
              <button
                id="btn-checkin-rest"
                type="button"
                onClick={() => onResolveCheckInPrompt('REST')}
                className="py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-amber-500/30 text-amber-200 font-mono font-bold text-xs cursor-pointer"
              >
                Rest (Option 0)
              </button>
            </div>
          </div>
        )}
      </section>

      {/* =====================================================================
          5 RICH RECHARGE CATEGORY MEDIA CARDS WITH DISTINCT ACCENT SIGNATURES
         ===================================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-5">
        {/* CARD 1: MUSIC [FLUID] (4 Cols on Desktop) — Warm Rose-Amber Signature */}
        <article
          id="recharge-card-cat1-music"
          onClick={() => onSelectCategory('CAT1_MUSIC')}
          className={`lg:col-span-4 rounded-3xl p-5 border transition cursor-pointer flex flex-col justify-between space-y-4 ${
            recharge.activeCategory === 'CAT1_MUSIC'
              ? 'backdrop-blur-xl bg-gradient-to-br from-rose-500/20 via-amber-500/12 to-black/50 border-amber-300 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.22),0_0_32px_-8px_rgba(244,63,94,0.3)]'
              : 'bento-surface-evening hover:border-amber-400/45'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 border border-rose-400/40 font-mono text-[10px] font-bold uppercase text-rose-200 flex items-center gap-1">
                <Music className="w-3 h-3 text-rose-300" />
                <span>CAT 1 • FLUID</span>
              </span>
              <span className="font-mono text-[10px] text-amber-200/75">
                Zero DAW / Zero Drills
              </span>
            </div>

            <div>
              <h3 className="font-serif text-2xl text-amber-50">
                {recharge.fluidCategories?.CAT1_MUSIC.label ||
                  '1. Acoustic & Instrument Play'}
              </h3>
              <p className="text-xs text-amber-100/80 mt-0.5">
                {recharge.fluidCategories?.CAT1_MUSIC.subtitle ||
                  'Bass / Guitar / Piano / Drums — fluid musical expression.'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-black/45 border border-rose-400/25 font-mono text-xs text-rose-100">
              5m Startup: “
              {recharge.fluidCategories?.CAT1_MUSIC.startupStep ||
                'Play 1 familiar song cold — no DAW or drills'}
              ”
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategory('CAT1_MUSIC');
              onStartCategory5mStep();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch 5m Cold Song</span>
          </button>
        </article>

        {/* CARD 2: MAKER / HARDWARE [STICKY] (4 Cols on Desktop) — Copper/Orange Signature */}
        <article
          id="recharge-card-cat2-maker"
          onClick={() => onSelectCategory('CAT2_MAKER')}
          className={`lg:col-span-4 rounded-3xl p-5 border transition cursor-pointer flex flex-col justify-between space-y-4 ${
            recharge.activeCategory === 'CAT2_MAKER'
              ? 'backdrop-blur-xl bg-gradient-to-br from-orange-500/25 via-amber-500/12 to-black/50 border-amber-300 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.22),0_0_32px_-8px_rgba(249,115,22,0.3)]'
              : 'bento-surface-evening hover:border-amber-400/45'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-orange-500/20 border border-orange-400/40 font-mono text-[10px] font-bold uppercase text-orange-200 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-orange-300" />
                <span>CAT 2 • STICKY</span>
              </span>

              <StickyDotsCounter
                starts={makerSlot.startsLogged ?? makerSlot.fiveMinStarts}
                unlockedViaCheckIn={
                  makerSlot.unlockedViaCheckIn || recharge.checkInModalOpen
                }
              />
            </div>

            <div>
              <h3 className="font-serif text-2xl text-amber-50">
                2. {makerSlot.activeTitle}
              </h3>
              <p className="text-xs text-amber-100/80 mt-0.5">
                Maker / Hardware bench — locked until 3 starts or 20m Check-In.
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-black/45 border border-orange-400/25 font-mono text-xs text-orange-100">
              5m Startup: “{makerSlot.startupStep}”
            </div>

            <div className="text-[11px] font-mono text-stone-400 flex flex-wrap items-center justify-between gap-1">
              <span className="truncate">
                Queued Next: {makerSlot.queuedNextTitle || makerSlot.backlogQueue[0] || 'None'}
              </span>
              {makerSlot.archivedTitles && makerSlot.archivedTitles.length > 0 && (
                <span className="text-emerald-300/90 text-[10px]">
                  Archived: {makerSlot.archivedTitles.length}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCategory('CAT2_MAKER');
                onStartCategory5mStep();
              }}
              className="flex-1 py-2.5 px-2.5 rounded-xl bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-mono font-bold text-xs flex items-center justify-center gap-1 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>5m K1C Step</span>
            </button>

            {onIncrementStickyStart && (
              <button
                id="btn-log-start-CAT2_MAKER"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onIncrementStickyStart('CAT2_MAKER');
                }}
                className="py-2.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-amber-500/30 text-amber-200 font-mono text-[11px] cursor-pointer"
                title="Log +1 5m start toward [3 / 3] unlock"
              >
                +1 Start
              </button>
            )}

            <button
              id="btn-swap-sticky-CAT2_MAKER"
              type="button"
              disabled={
                (makerSlot.startsLogged ?? makerSlot.fiveMinStarts) < 3 &&
                !makerSlot.unlockedViaCheckIn &&
                !recharge.checkInModalOpen
              }
              onClick={(e) => {
                e.stopPropagation();
                onSwapStickyItemFromBacklog('CAT2_MAKER');
              }}
              className="py-2.5 px-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] disabled:opacity-35 border border-amber-400/40 text-amber-100 font-mono text-xs flex items-center gap-1 cursor-pointer"
              title="Unlock after [3 / 3] 5m starts or at any 20m Check-In"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Swap / Complete</span>
            </button>
          </div>
        </article>

        {/* CARD 4: COMFORT SHOW [FLUID] (4 Cols on Desktop) — Warm Terracotta Signature */}
        <article
          id="recharge-card-cat4-comfort"
          onClick={() => onSelectCategory('CAT4_COMFORT')}
          className={`lg:col-span-4 rounded-3xl p-5 border transition cursor-pointer flex flex-col justify-between space-y-4 ${
            recharge.activeCategory === 'CAT4_COMFORT'
              ? 'backdrop-blur-xl bg-gradient-to-br from-amber-500/25 via-red-500/12 to-black/50 border-amber-300 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.22),0_0_32px_-8px_rgba(245,158,11,0.3)]'
              : 'bento-surface-evening hover:border-amber-400/45'
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 font-mono text-[10px] font-bold uppercase text-amber-200 flex items-center gap-1">
                <Tv className="w-3 h-3 text-amber-300" />
                <span>CAT 4 • FLUID</span>
              </span>
              <span className="font-mono text-[10px] text-amber-200/75">
                Off Work Monitor
              </span>
            </div>

            <div>
              <h3 className="font-serif text-2xl text-amber-50">
                {recharge.fluidCategories?.CAT4_COMFORT.label ||
                  "4. It's Always Sunny in Philadelphia"}
              </h3>
              <p className="text-xs text-amber-100/80 mt-0.5">
                {recharge.fluidCategories?.CAT4_COMFORT.subtitle ||
                  'Low-friction comfort show recharge away from the desk setup.'}
              </p>
            </div>

            <div className="p-3 rounded-2xl bg-black/45 border border-amber-400/25 font-mono text-xs text-amber-100">
              5m Startup: “
              {recharge.fluidCategories?.CAT4_COMFORT.startupStep ||
                'First 5m of episode away from work monitor'}
              ”
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategory('CAT4_COMFORT');
              onStartCategory5mStep();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch 5m Episode Start</span>
          </button>
        </article>

        {/* CARD 3: TRIPLE-TRACK MEDIA [STICKY] (7 Cols on Desktop) — Rich Gold Signature + Segmented Pill Switcher */}
        <article
          id="recharge-card-cat3-media"
          onClick={() => onSelectCategory('CAT3_MEDIA')}
          className={`lg:col-span-7 rounded-3xl p-5 sm:p-6 border transition cursor-pointer flex flex-col justify-between space-y-4 ${
            recharge.activeCategory === 'CAT3_MEDIA'
              ? 'backdrop-blur-xl bg-gradient-to-br from-amber-400/22 via-yellow-600/12 to-black/55 border-amber-300 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.22),0_0_36px_-8px_rgba(251,191,36,0.32)]'
              : 'bento-surface-evening hover:border-amber-400/45'
          }`}
        >
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400/20 border border-amber-300/50 font-mono text-[10px] font-bold uppercase text-amber-200 flex items-center gap-1.5">
                <Headphones className="w-3 h-3 text-amber-300" />
                <span>CAT 3 • TRIPLE-TRACK MEDIA [STICKY]</span>
              </span>

              <StickyDotsCounter
                starts={activeMediaSlot.startsLogged ?? activeMediaSlot.fiveMinStarts}
                unlockedViaCheckIn={
                  activeMediaSlot.unlockedViaCheckIn || recharge.checkInModalOpen
                }
              />
            </div>

            {/* Segmented Pill Switcher Inside Card 3 to Flip Instantly Between 3A, 3B, and 3C */}
            <div
              role="tablist"
              aria-label="Triple-Track Media Switcher"
              className="p-1 rounded-2xl bg-black/55 border border-amber-500/25 grid grid-cols-3 gap-1"
              onClick={(e) => e.stopPropagation()}
            >
              {(
                [
                  {
                    id: '3A_FICTION' as MediaSubTrackId,
                    short: '3A Fiction',
                    sub: 'Soul Music',
                    icon: BookOpen,
                  },
                  {
                    id: '3B_NONFICTION' as MediaSubTrackId,
                    short: '3B Nonfiction',
                    sub: 'American Way',
                    icon: Headphones,
                  },
                  {
                    id: '3C_VIDEO' as MediaSubTrackId,
                    short: '3C Video',
                    sub: "Widow's Bay",
                    icon: Film,
                  },
                ] as const
              ).map((tab) => {
                const Icon = tab.icon;
                const active = recharge.activeMediaTab === tab.id;
                const slot = recharge.stickySlots[tab.id];
                const starts = slot.startsLogged ?? slot.fiveMinStarts;
                return (
                  <button
                    key={tab.id}
                    id={`media-subtab-${tab.id}`}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => onSelectMediaSubTab(tab.id)}
                    className={`p-2 rounded-xl text-left transition cursor-pointer flex flex-col justify-between ${
                      active
                        ? 'bg-amber-400 text-stone-950 font-bold shadow-md'
                        : 'hover:bg-white/[0.06] text-amber-100/80'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span className="font-mono text-[10px] uppercase flex items-center gap-1">
                        <Icon className="w-3 h-3 shrink-0" />
                        <span>{tab.short}</span>
                      </span>
                      <span
                        className={`font-mono text-[10px] ${
                          active ? 'text-stone-900 font-extrabold' : 'text-amber-300'
                        }`}
                      >
                        [{starts}/3]
                      </span>
                    </div>
                    <span className="text-[11px] truncate mt-0.5 block">
                      {slot.activeTitle}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Active Sub-Track Detail Box */}
            <div className="p-4 rounded-2xl bg-black/45 border border-amber-400/25 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-mono text-[10px] uppercase text-amber-300">
                    {activeMediaSlot.label}
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl text-amber-50">
                    {activeMediaSlot.activeTitle}
                  </h3>
                </div>

                {/* Speed Pills for 3A Fiction ("Soul Music" at 1.75x–2.25x) */}
                {recharge.activeMediaTab === '3A_FICTION' && (
                  <div
                    className="flex items-center gap-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {(['1.75x', '2.00x', '2.25x'] as const).map((spd) => (
                      <button
                        key={spd}
                        type="button"
                        onClick={() => onSelectFictionSpeed(spd)}
                        className={`px-2 py-1 rounded-lg font-mono text-[11px] border cursor-pointer ${
                          recharge.fictionSpeed === spd
                            ? 'bg-amber-400 text-stone-950 border-amber-300 font-bold'
                            : 'bg-black/40 border-amber-500/30 text-amber-200'
                        }`}
                      >
                        {spd}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="font-mono text-xs text-amber-100/90">
                5m Startup: “{activeMediaSlot.startupStep}”
              </p>

              <div className="text-[11px] font-mono text-stone-400 flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-500/15">
                <span>
                  Queued Next:{' '}
                  <strong className="text-amber-200">
                    {activeMediaSlot.queuedNextTitle ||
                      activeMediaSlot.backlogQueue[0] ||
                      'None'}
                  </strong>{' '}
                  • Backlog: {activeMediaSlot.backlogQueue.join(' • ')}
                </span>
                <span className="text-amber-300">Credits Roadmap Input (50%)</span>
              </div>
              {activeMediaSlot.archivedTitles &&
                activeMediaSlot.archivedTitles.length > 0 && (
                  <div className="text-[10px] font-mono text-emerald-300/90">
                    Archived Completed: {activeMediaSlot.archivedTitles.join(' • ')}
                  </div>
                )}
            </div>
          </div>

          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                onSelectCategory('CAT3_MEDIA');
                onStartCategory5mStep();
              }}
              className="flex-1 py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start 5m ({activeMediaSlot.activeTitle})</span>
            </button>

            {onIncrementStickyStart && (
              <button
                id={`btn-log-start-${recharge.activeMediaTab}`}
                type="button"
                onClick={() => onIncrementStickyStart(recharge.activeMediaTab)}
                className="py-2.5 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-amber-500/30 text-amber-200 font-mono text-[11px] cursor-pointer"
                title="Log +1 5m start toward [3 / 3] unlock"
              >
                +1 Start
              </button>
            )}

            <button
              id={`btn-swap-sticky-${recharge.activeMediaTab}`}
              type="button"
              disabled={
                (activeMediaSlot.startsLogged ?? activeMediaSlot.fiveMinStarts) < 3 &&
                !activeMediaSlot.unlockedViaCheckIn &&
                !recharge.checkInModalOpen
              }
              onClick={() => onSwapStickyItemFromBacklog(recharge.activeMediaTab)}
              className="py-2.5 px-3.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] disabled:opacity-35 border border-amber-400/40 text-amber-100 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
              title="Archive current title & promote queuedNextTitle (requires [3 / 3] starts or 20m Check-In)"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Swap / Complete</span>
            </button>
          </div>
        </article>

        {/* CARD 5: GAMING [STICKY] (5 Cols on Desktop) — Warm Emerald-Bronze Signature */}
        <article
          id="recharge-card-cat5-gaming"
          onClick={() => onSelectCategory('CAT5_GAMING')}
          className={`lg:col-span-5 rounded-3xl p-5 sm:p-6 border transition cursor-pointer flex flex-col justify-between space-y-4 ${
            recharge.activeCategory === 'CAT5_GAMING'
              ? 'backdrop-blur-xl bg-gradient-to-br from-emerald-500/20 via-amber-500/14 to-black/55 border-amber-300 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.22),0_0_36px_-8px_rgba(16,185,129,0.28)]'
              : 'bento-surface-evening hover:border-amber-400/45'
          }`}
        >
          <div className="space-y-3.5">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 font-mono text-[10px] font-bold uppercase text-emerald-200 flex items-center gap-1.5">
                <Gamepad2 className="w-3.5 h-3.5 text-emerald-300" />
                <span>CAT 5 • GAMING [STICKY]</span>
              </span>

              <StickyDotsCounter
                starts={gamingSlot.startsLogged ?? gamingSlot.fiveMinStarts}
                unlockedViaCheckIn={
                  gamingSlot.unlockedViaCheckIn || recharge.checkInModalOpen
                }
              />
            </div>

            <div>
              <h3 className="font-serif text-2xl sm:text-3xl text-amber-50">
                5. {gamingSlot.activeTitle}
              </h3>
              <p className="text-xs text-amber-100/80 mt-0.5">
                Single-player narrative / tactical objective with 20m &amp; 40m pacing chimes.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-black/45 border border-emerald-400/25 font-mono text-xs text-emerald-100">
              5m Startup: “{gamingSlot.startupStep}”
            </div>

            <div className="p-3 rounded-2xl bg-black/35 border border-amber-500/15 space-y-1">
              <div className="text-[10px] font-mono uppercase text-amber-300/80 flex items-center justify-between">
                <span>
                  Queued Next: {gamingSlot.queuedNextTitle || gamingSlot.backlogQueue[0] || 'None'}
                </span>
                {gamingSlot.archivedTitles && gamingSlot.archivedTitles.length > 0 && (
                  <span className="text-emerald-300">
                    Archived: {gamingSlot.archivedTitles.length}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {gamingSlot.backlogQueue.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-amber-500/20 font-mono text-[11px] text-amber-100/85"
                  >
                    {idx + 1}. {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div
            className="flex items-center gap-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => {
                onSelectCategory('CAT5_GAMING');
                onStartCategory5mStep();
              }}
              className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch 5m Objective</span>
            </button>

            {onIncrementStickyStart && (
              <button
                id="btn-log-start-CAT5_GAMING"
                type="button"
                onClick={() => onIncrementStickyStart('CAT5_GAMING')}
                className="py-2.5 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.12] border border-amber-500/30 text-amber-200 font-mono text-[11px] cursor-pointer"
                title="Log +1 5m start toward [3 / 3] unlock"
              >
                +1 Start
              </button>
            )}

            <button
              id="btn-swap-sticky-CAT5_GAMING"
              type="button"
              disabled={
                (gamingSlot.startsLogged ?? gamingSlot.fiveMinStarts) < 3 &&
                !gamingSlot.unlockedViaCheckIn &&
                !recharge.checkInModalOpen
              }
              onClick={() => onSwapStickyItemFromBacklog('CAT5_GAMING')}
              className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.14] disabled:opacity-35 border border-amber-400/40 text-amber-100 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Swap / Complete</span>
            </button>
          </div>
        </article>
      </div>

      {/* =====================================================================
          FLOW EXTENSION GATE & COUNT-UP CONSOLE (RULE 7)
         ===================================================================== */}
      <section
        id="flow-extension-card"
        aria-labelledby="flow-extension-heading"
        className="rounded-3xl bento-surface-evening p-5 sm:p-6 space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300 font-bold">
                END-OF-SHIFT FLOW EXTENSION • RULE 7 CIRCUIT BREAKER
              </span>
            </div>
            <h3
              id="flow-extension-heading"
              className="font-serif text-2xl text-amber-50"
            >
              Creative Flow Extension (Open Count-Up + Auto-Deduction)
            </h3>
            <p className="text-xs text-amber-100/75">
              Enabled only if tomorrow has zero early morning events/labs, active task is not flashcards, and weekly extensions used &lt; 2. Automatically deducts 1–2 project blocks from tomorrow&apos;s target for every 2–3 extension blocks logged.
            </p>
          </div>

          <button
            id="btn-flow-extension"
            type="button"
            disabled={!canUseFlowExtension && !recharge.flowExtensionActive}
            onClick={onOpenFlowExtensionPrompt}
            className="px-4 py-2.5 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-35 text-stone-950 font-mono font-bold text-xs cursor-pointer shrink-0"
          >
            {recharge.flowExtensionActive
              ? 'Flow Extension Active'
              : canUseFlowExtension
              ? 'Request Flow Extension'
              : 'Flow Extension Locked'}
          </button>
        </div>

        {/* 3 Eligibility Gate Pills */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs font-mono">
          <div
            className={`p-3 rounded-2xl border flex items-center justify-between ${
              tomorrowHasZeroEarlyEvents
                ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200'
                : 'bg-red-950/40 border-red-700/50 text-red-200'
            }`}
          >
            <span>1. Tomorrow Early Event: {tomorrowHasZeroEarlyEvents ? 'None' : 'Active'}</span>
            <button
              type="button"
              onClick={onToggleTomorrowEarlyAnchor}
              className="px-2 py-0.5 rounded bg-black/40 border border-white/15 text-[10px] cursor-pointer"
            >
              Toggle
            </button>
          </div>

          <div
            className={`p-3 rounded-2xl border flex items-center justify-between ${
              activeTaskNotFlashcards
                ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200'
                : 'bg-red-950/40 border-red-700/50 text-red-200'
            }`}
          >
            <span>2. Active Task: {state.timer.activeTaskType}</span>
            <span>{activeTaskNotFlashcards ? 'PASS' : 'LOCKED'}</span>
          </div>

          <div
            className={`p-3 rounded-2xl border flex items-center justify-between ${
              weeklyCapUnder2
                ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-200'
                : 'bg-red-950/40 border-red-700/50 text-red-200'
            }`}
          >
            <span>3. Weekly Used: {recharge.weeklyExtensionsUsed} / 2</span>
            <div className="flex gap-1">
              {[0, 1, 2].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => onSetWeeklyExtensionsUsed(n)}
                  className={`px-1.5 py-0.5 rounded text-[10px] border cursor-pointer ${
                    recharge.weeklyExtensionsUsed === n
                      ? 'bg-amber-400 text-stone-950 border-amber-300 font-bold'
                      : 'bg-black/40 border-white/15 text-amber-100'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Neutral Confirmation Modal */}
        {recharge.flowExtensionPromptOpen && (
          <div
            id="flow-extension-confirm-modal"
            className="p-4 rounded-2xl bg-black/80 border-2 border-amber-400 space-y-3"
          >
            <p className="text-sm font-mono font-bold text-amber-100">
              “Confirm this is genuine creative flow and not deadline stress”
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                id="btn-confirm-flow-extension"
                type="button"
                onClick={onConfirmFlowExtension}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-bold text-xs cursor-pointer"
              >
                Confirm Creative Flow &amp; Start Count-Up
              </button>
              <button
                id="btn-cancel-flow-extension"
                type="button"
                onClick={onCancelFlowExtensionPrompt}
                className="px-4 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-amber-100 font-mono text-xs cursor-pointer"
              >
                Cancel (Return to Recharge)
              </button>
            </div>
          </div>
        )}

        {/* Active Flow Extension Open Count-Up Console */}
        {recharge.flowExtensionActive && (
          <div className="p-4 rounded-2xl bg-black/50 border border-amber-400/50 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-amber-300 font-bold">
                OPEN COUNT-UP • 20M CHIMES + 60M MICRO-BREAK
              </span>
              <div className="font-mono text-2xl font-extrabold tabular-nums text-amber-100">
                +{formatMMSS(recharge.flowExtensionElapsedSeconds)} •{' '}
                {recharge.flowExtensionBlocksLoggedToday} ext blocks logged (Tomorrow Deduction: -
                {tomorrowDay?.deductedBlocksFromExtension || 0} blks)
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleFlowExtensionTimer}
                className="px-3.5 py-2 rounded-xl bg-amber-400 text-stone-950 font-mono font-bold text-xs cursor-pointer"
              >
                {recharge.flowExtensionRunning ? 'Pause Count-Up' : 'Resume Count-Up'}
              </button>
              <button
                id="btn-log-flow-extension-20m"
                type="button"
                onClick={onLogFlowExtensionBlock20m}
                className="px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-amber-400/50 text-amber-100 font-mono font-semibold text-xs cursor-pointer"
              >
                Log +20m Extension Block
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};
