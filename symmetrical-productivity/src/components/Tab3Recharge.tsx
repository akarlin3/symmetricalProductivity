import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
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
import { AveryCorpEmblem } from './AveryCorpEmblem';

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
              className={`w-2 h-2 rounded-full transition-all ${
                filled
                  ? 'bg-amber-400 shadow-[0_0_6px_#f59e0b]'
                  : 'bg-amber-950/80 border border-amber-500/35'
              }`}
            />
          );
        })}
      </div>
      <span className="font-mono text-[11px] font-normal tabular-nums text-amber-200/90">
        [{starts} / 3]
      </span>
      {(starts >= 3 || unlockedViaCheckIn) && (
        <span className="text-[10px] font-mono text-emerald-300">
          Swap Ready
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

  const [hoveredCat, setHoveredCat] = useState<RechargeCategoryId | null>(null);
  const [expandedCat, setExpandedCat] = useState<RechargeCategoryId | null>(null);
  const [option0Expanded, setOption0Expanded] = useState(false);
  const [flowDetailsOpen, setFlowDetailsOpen] = useState(false);

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

  const isCardDisclosed = (catId: RechargeCategoryId) =>
    recharge.activeCategory === catId ||
    expandedCat === catId ||
    hoveredCat === catId;

  const toggleCardExpand = (catId: RechargeCategoryId) => {
    onSelectCategory(catId);
    setExpandedCat((prev) => (prev === catId ? null : catId));
  };

  return (
    <div className="relative max-w-3xl mx-auto space-y-3 text-amber-50 animate-tab-enter pb-2">
      {/* Subtle Ambient Warm Halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-8 inset-x-0 h-36 rounded-full blur-3xl opacity-40 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(245, 158, 11, 0.22), rgba(234, 88, 12, 0.08) 55%, transparent 85%)',
        }}
      />

      {/* Compact Editorial Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-white/[0.05] pb-2.5">
        <div className="flex items-center gap-2.5">
          <AveryCorpEmblem
            size={28}
            variant="image"
            cropMode="mark-only"
            ariaLabel="AveryCorp End-of-Shift Seal"
          />
          <div>
            <span className="text-[11px] font-mono uppercase tracking-widest text-amber-300/80 flex items-center gap-1">
              <Moon className="w-3 h-3 text-amber-400" />
              <span>Evening Sanctuary</span>
            </span>
            <h2 className="font-serif text-lg sm:text-xl leading-snug font-medium tracking-tight text-amber-50">
              Evening Recharge Menu
            </h2>
          </div>
        </div>

        {!metrics.isZeroWorkLeft ? (
          <div
            id="evening-lock-gate-notice"
            className="flex items-center gap-2.5 px-3 py-1 rounded-full bento-surface-evening"
          >
            <span className="text-[11px] font-mono text-amber-200/80 tabular-nums">
              {metrics.remainingWorkFormatted} left
            </span>
            <button
              id="btn-unlock-evening-menu-now"
              type="button"
              onClick={() => {
                triggerHaptic([20]);
                onUnlockZeroWorkLeft();
              }}
              className="px-2.5 py-0.5 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <Unlock className="w-3 h-3" />
              <span>Set [0m work left]</span>
            </button>
          </div>
        ) : (
          <div className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/25 font-mono text-[11px] text-amber-200 flex items-center gap-1.5">
            <Lock className="w-3 h-3 text-amber-400" />
            <span>End-of-Shift Lock • [0m work left]</span>
          </div>
        )}
      </div>

      {/* =====================================================================
          OPTION 0 (STILLNESS): SLIM SINGLE-ROW BAR AT THE TOP (py-2 px-3.5)
         ===================================================================== */}
      <section
        id="option-0-stillness-card"
        aria-labelledby="option-0-heading"
        className="rounded-2xl bento-hero-border-evening py-2 px-3.5 transition-all duration-300 space-y-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2.5 min-w-0">
            <span className="px-2 py-0.5 rounded-full bg-amber-400/15 border border-amber-300/30 font-mono text-[11px] uppercase tracking-wider text-amber-200 shrink-0">
              Option 0 • Stillness
            </span>

            <h3
              id="option-0-heading"
              className="font-serif text-lg leading-snug font-medium text-amber-50 truncate"
            >
              20-Minute Silent Stillness
            </h3>

            <span className="text-[11px] font-mono text-amber-200/70 tabular-nums">
              [{recharge.option0ConsecutiveWindows} / 2 windows]
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-2.5 py-1 rounded-full bg-black/45 border border-white/[0.05] font-mono text-sm font-normal tabular-nums text-amber-100">
              {formatMMSS(recharge.option0SecondsLeft)}
            </div>

            <button
              id="btn-option0-start-pause"
              type="button"
              onClick={onToggleOption0Timer}
              className="px-3 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs flex items-center gap-1 cursor-pointer"
            >
              {recharge.option0Running ? (
                <>
                  <Pause className="w-3 h-3 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-current" />
                  <span>Begin 20m</span>
                </>
              )}
            </button>

            <button
              id="btn-option0-complete-window"
              type="button"
              onClick={onCompleteOption0Window}
              className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.05] text-amber-200/90 font-mono text-[11px] cursor-pointer"
              title="Complete 20m window (+1 toward 40m Fork Check)"
            >
              +1 Window
            </button>

            <button
              type="button"
              onClick={() => setOption0Expanded((prev) => !prev)}
              className="p-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] text-amber-200/70 cursor-pointer"
              title="Toggle 4-7-8 Breathing Visualizer"
              aria-label="Toggle 4-7-8 Breathing Visualizer"
            >
              {option0Expanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Optional Expanded 4-7-8 Breathing Pacer */}
        <AnimatePresence>
          {(option0Expanded || recharge.option0Running) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2 border-t border-white/[0.05] overflow-hidden"
            >
              <BreathingVisualizer478
                id="option0-breathing-478-visualizer"
                isActiveContext={true}
                defaultExpanded={true}
                variant="evening"
                compact={true}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* 40m Fork Check Prompt Modal (Rule 8: "Go to Sleep" vs. "Start One 5m Activity") */}
        {recharge.forkCheckModalOpen && (
          <div
            id="option-0-fork-check-modal"
            className="p-3.5 rounded-xl bg-black/80 border border-amber-400/50 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-mono text-[11px] font-medium uppercase">
                40m Cap Reached (2 / 2 Windows) • Fork Check
              </span>
            </div>
            <p className="text-xs text-amber-50">
              40 minutes of stillness completed. Choose your next path:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                id="btn-fork-go-to-sleep"
                type="button"
                onClick={() => onResolveForkCheck('SLEEP')}
                className="py-1.5 px-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-amber-100 font-mono text-xs cursor-pointer"
              >
                Go to Sleep
              </button>
              <button
                id="btn-fork-start-5m-activity"
                type="button"
                onClick={() => onResolveForkCheck('START_5M_ACTIVITY')}
                className="py-1.5 px-3 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs cursor-pointer"
              >
                Start One 5m Activity
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Active Category Pacing Bar (Shown cleanly when an Evening Category is selected or running) */}
      {(recharge.activeCategory !== 'NONE' || recharge.checkInModalOpen) && (
        <section
          id="recharge-pacing-console"
          aria-label="Evening Category Pacing Console"
          className="rounded-2xl bento-surface-evening px-3.5 py-2.5 space-y-2.5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-300/80 block">
                  Active Pacing • {recharge.pacingStage.replace(/_/g, ' ')}
                </span>
                <span className="font-serif text-lg leading-snug text-amber-50">
                  5m Startup → 20m &amp; 40m Check-In → 60m Break
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="px-3 py-1 rounded-full bg-black/50 border border-white/[0.05] font-mono text-sm font-normal tabular-nums text-amber-100">
                {formatMMSS(recharge.categorySecondsLeft)}
              </div>

              <button
                id="btn-start-category-5m"
                type="button"
                onClick={onStartCategory5mStep}
                className="px-3 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs flex items-center gap-1 cursor-pointer"
              >
                {recharge.categoryRunning ? (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>
                      {recharge.pacingStage === 'STARTUP_5M'
                        ? 'Begin 5m'
                        : 'Resume'}
                    </span>
                  </>
                )}
              </button>

              <button
                id="btn-advance-category-milestone"
                type="button"
                onClick={onAdvanceCategoryPacingMilestone}
                className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.05] text-amber-100 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                title="Advance to next milestone (5m → 20m → 40m → 60m)"
              >
                <FastForward className="w-3 h-3" />
                <span>Next</span>
              </button>
            </div>
          </div>

          {recharge.checkInModalOpen && (
            <div
              id="recharge-checkin-modal"
              className="p-3 rounded-xl bg-black/80 border border-amber-400/50 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-amber-400 text-stone-950 font-mono text-[11px] font-medium uppercase">
                  {recharge.checkInMilestone}m Check-In
                </span>
                <span className="text-[11px] font-mono text-emerald-300">
                  Sticky Swap Unlocked
                </span>
              </div>
              <p className="font-serif text-lg leading-snug text-amber-50">
                “Keep going, switch, or rest?”
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  id="btn-checkin-keep-going"
                  type="button"
                  onClick={() => onResolveCheckInPrompt('KEEP_GOING')}
                  className="py-1.5 px-3 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs cursor-pointer"
                >
                  Keep Going
                </button>
                <button
                  id="btn-checkin-switch"
                  type="button"
                  onClick={() => onResolveCheckInPrompt('SWITCH')}
                  className="py-1.5 px-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-amber-100 font-mono text-xs cursor-pointer"
                >
                  Switch / Swap Sticky
                </button>
                <button
                  id="btn-checkin-rest"
                  type="button"
                  onClick={() => onResolveCheckInPrompt('REST')}
                  className="py-1.5 px-3 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.05] text-amber-200 font-mono text-xs cursor-pointer"
                >
                  Rest (Option 0)
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          5 RECHARGE CATEGORIES IN A TIGHT 2- OR 3-COLUMN GRID (gap-2.5, p-3)
          All 5 cards + Option 0 fit inside a single viewport without scrolling.
         ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {/* CARD 1: MUSIC [FLUID] */}
        <article
          id="recharge-card-cat1-music"
          onMouseEnter={() => setHoveredCat('CAT1_MUSIC')}
          onMouseLeave={() => setHoveredCat(null)}
          onClick={() => toggleCardExpand('CAT1_MUSIC')}
          className={`rounded-2xl p-3 border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-2.5 ${
            recharge.activeCategory === 'CAT1_MUSIC'
              ? 'bento-hero-border-evening border-amber-400/35'
              : 'bento-surface-evening'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-400/25 font-mono text-[11px] uppercase tracking-wider text-rose-200 flex items-center gap-1">
                <Music className="w-3 h-3 text-rose-300" />
                <span>1. Music • Fluid</span>
              </span>
            </div>

            <h3 className="font-serif text-lg leading-snug font-medium tracking-tight text-amber-50">
              {recharge.fluidCategories?.CAT1_MUSIC.activeTitle ||
                'Cold Song on Bass / Guitar'}
            </h3>

            <AnimatePresence>
              {isCardDisclosed('CAT1_MUSIC') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-1 space-y-1.5"
                >
                  <p className="text-xs text-amber-100/75 leading-snug">
                    5m Startup: “
                    {recharge.fluidCategories?.CAT1_MUSIC.startupStep ||
                      'Play 1 familiar song cold — no DAW or drills'}
                    ”
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategory('CAT1_MUSIC');
              onStartCategory5mStep();
            }}
            className="w-full py-1.5 px-3 rounded-full bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Begin 5m</span>
          </button>
        </article>

        {/* CARD 2: MAKER / HARDWARE [STICKY] */}
        <article
          id="recharge-card-cat2-maker"
          onMouseEnter={() => setHoveredCat('CAT2_MAKER')}
          onMouseLeave={() => setHoveredCat(null)}
          onClick={() => toggleCardExpand('CAT2_MAKER')}
          className={`rounded-2xl p-3 border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-2.5 ${
            recharge.activeCategory === 'CAT2_MAKER'
              ? 'bento-hero-border-evening border-amber-400/35'
              : 'bento-surface-evening'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-400/25 font-mono text-[11px] uppercase tracking-wider text-orange-200 flex items-center gap-1">
                <Cpu className="w-3 h-3 text-orange-300" />
                <span>2. Maker • Sticky</span>
              </span>
            </div>

            <h3 className="font-serif text-lg leading-snug font-medium tracking-tight text-amber-50">
              {makerSlot.activeTitle}
            </h3>

            <AnimatePresence>
              {isCardDisclosed('CAT2_MAKER') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-1 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <StickyDotsCounter
                    starts={makerSlot.startsLogged ?? makerSlot.fiveMinStarts}
                    unlockedViaCheckIn={
                      makerSlot.unlockedViaCheckIn || recharge.checkInModalOpen
                    }
                  />
                  <p className="text-xs text-amber-100/75 leading-snug">
                    5m Startup: “{makerSlot.startupStep}”
                  </p>
                  <div className="text-[11px] font-mono text-stone-400 truncate">
                    Next: {makerSlot.queuedNextTitle || makerSlot.backlogQueue[0] || 'None'}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {onIncrementStickyStart && (
                      <button
                        id="btn-log-start-CAT2_MAKER"
                        type="button"
                        onClick={() => onIncrementStickyStart('CAT2_MAKER')}
                        className="px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.05] text-amber-200 font-mono text-[11px] cursor-pointer"
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
                      onClick={() => onSwapStickyItemFromBacklog('CAT2_MAKER')}
                      className="px-2.5 py-0.5 rounded-full bg-white/[0.05] hover:bg-white/[0.11] disabled:opacity-35 border border-white/[0.06] text-amber-100 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Swap</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategory('CAT2_MAKER');
              onStartCategory5mStep();
            }}
            className="w-full py-1.5 px-3 rounded-full bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Begin 5m</span>
          </button>
        </article>

        {/* CARD 3: MEDIA [STICKY TRIPLE-TRACK] */}
        <article
          id="recharge-card-cat3-media"
          onMouseEnter={() => setHoveredCat('CAT3_MEDIA')}
          onMouseLeave={() => setHoveredCat(null)}
          onClick={() => toggleCardExpand('CAT3_MEDIA')}
          className={`rounded-2xl p-3 border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-2.5 ${
            recharge.activeCategory === 'CAT3_MEDIA'
              ? 'bento-hero-border-evening border-amber-400/35'
              : 'bento-surface-evening'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/25 font-mono text-[11px] uppercase tracking-wider text-amber-200 flex items-center gap-1">
                <Headphones className="w-3 h-3 text-amber-300" />
                <span>3. Media • Sticky ({recharge.activeMediaTab.slice(0, 2)})</span>
              </span>
            </div>

            <h3 className="font-serif text-lg leading-snug font-medium tracking-tight text-amber-50">
              {activeMediaSlot.activeTitle}
            </h3>

            <AnimatePresence>
              {isCardDisclosed('CAT3_MEDIA') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-1 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Triple-Track Switcher (3A Fiction, 3B Nonfiction, 3C Video) */}
                  <div
                    role="tablist"
                    aria-label="Triple-Track Media Switcher"
                    className="p-0.5 rounded-full bg-black/45 border border-white/[0.05] grid grid-cols-3 gap-1"
                  >
                    {(
                      [
                        { id: '3A_FICTION' as MediaSubTrackId, short: '3A Fiction', icon: BookOpen },
                        { id: '3B_NONFICTION' as MediaSubTrackId, short: '3B Nonfic', icon: Headphones },
                        { id: '3C_VIDEO' as MediaSubTrackId, short: '3C Video', icon: Film },
                      ] as const
                    ).map((tab) => {
                      const active = recharge.activeMediaTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          id={`media-subtab-${tab.id}`}
                          type="button"
                          role="tab"
                          aria-selected={active}
                          onClick={() => onSelectMediaSubTab(tab.id)}
                          className={`py-0.5 px-1.5 rounded-full font-mono text-[10px] text-center transition cursor-pointer ${
                            active
                              ? 'bg-amber-400 text-stone-950 font-medium'
                              : 'text-amber-100/75 hover:text-amber-50'
                          }`}
                        >
                          {tab.short}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <StickyDotsCounter
                      starts={activeMediaSlot.startsLogged ?? activeMediaSlot.fiveMinStarts}
                      unlockedViaCheckIn={
                        activeMediaSlot.unlockedViaCheckIn || recharge.checkInModalOpen
                      }
                    />

                    {recharge.activeMediaTab === '3A_FICTION' && (
                      <div className="flex items-center gap-1">
                        {(['1.75x', '2.00x', '2.25x'] as const).map((spd) => (
                          <button
                            key={spd}
                            type="button"
                            onClick={() => onSelectFictionSpeed(spd)}
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] border cursor-pointer ${
                              recharge.fictionSpeed === spd
                                ? 'bg-amber-400/20 border-amber-400/50 text-amber-100'
                                : 'bg-black/40 border-white/[0.05] text-amber-200/70'
                            }`}
                          >
                            {spd}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-amber-100/75 leading-snug">
                    5m Startup: “{activeMediaSlot.startupStep}”
                  </p>

                  <div className="text-[11px] font-mono text-stone-400 truncate">
                    Next: {activeMediaSlot.queuedNextTitle || activeMediaSlot.backlogQueue[0] || 'None'}
                  </div>

                  <div className="flex items-center gap-1.5 pt-0.5">
                    {onIncrementStickyStart && (
                      <button
                        id={`btn-log-start-${recharge.activeMediaTab}`}
                        type="button"
                        onClick={() => onIncrementStickyStart(recharge.activeMediaTab)}
                        className="px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.05] text-amber-200 font-mono text-[11px] cursor-pointer"
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
                      className="px-2.5 py-0.5 rounded-full bg-white/[0.05] hover:bg-white/[0.11] disabled:opacity-35 border border-white/[0.06] text-amber-100 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Swap</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategory('CAT3_MEDIA');
              onStartCategory5mStep();
            }}
            className="w-full py-1.5 px-3 rounded-full bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Begin 5m</span>
          </button>
        </article>

        {/* CARD 4: COMFORT SHOW [FLUID] */}
        <article
          id="recharge-card-cat4-comfort"
          onMouseEnter={() => setHoveredCat('CAT4_COMFORT')}
          onMouseLeave={() => setHoveredCat(null)}
          onClick={() => toggleCardExpand('CAT4_COMFORT')}
          className={`rounded-2xl p-3 border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-2.5 ${
            recharge.activeCategory === 'CAT4_COMFORT'
              ? 'bento-hero-border-evening border-amber-400/35'
              : 'bento-surface-evening'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/25 font-mono text-[11px] uppercase tracking-wider text-amber-200 flex items-center gap-1">
                <Tv className="w-3 h-3 text-amber-300" />
                <span>4. Comfort Show • Fluid</span>
              </span>
            </div>

            <h3 className="font-serif text-lg leading-snug font-medium tracking-tight text-amber-50">
              {recharge.fluidCategories?.CAT4_COMFORT.activeTitle ||
                "It's Always Sunny in Philadelphia"}
            </h3>

            <AnimatePresence>
              {isCardDisclosed('CAT4_COMFORT') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-1 space-y-1.5"
                >
                  <p className="text-xs text-amber-100/75 leading-snug">
                    5m Startup: “
                    {recharge.fluidCategories?.CAT4_COMFORT.startupStep ||
                      'First 5m of episode away from work monitor'}
                    ”
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategory('CAT4_COMFORT');
              onStartCategory5mStep();
            }}
            className="w-full py-1.5 px-3 rounded-full bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Begin 5m</span>
          </button>
        </article>

        {/* CARD 5: GAMING [STICKY] */}
        <article
          id="recharge-card-cat5-gaming"
          onMouseEnter={() => setHoveredCat('CAT5_GAMING')}
          onMouseLeave={() => setHoveredCat(null)}
          onClick={() => toggleCardExpand('CAT5_GAMING')}
          className={`rounded-2xl p-3 border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-2.5 ${
            recharge.activeCategory === 'CAT5_GAMING'
              ? 'bento-hero-border-evening border-amber-400/35'
              : 'bento-surface-evening'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-400/25 font-mono text-[11px] uppercase tracking-wider text-emerald-200 flex items-center gap-1">
                <Gamepad2 className="w-3 h-3 text-emerald-300" />
                <span>5. Gaming • Sticky</span>
              </span>
            </div>

            <h3 className="font-serif text-lg leading-snug font-medium tracking-tight text-amber-50">
              {gamingSlot.activeTitle}
            </h3>

            <AnimatePresence>
              {isCardDisclosed('CAT5_GAMING') && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden pt-1 space-y-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <StickyDotsCounter
                    starts={gamingSlot.startsLogged ?? gamingSlot.fiveMinStarts}
                    unlockedViaCheckIn={
                      gamingSlot.unlockedViaCheckIn || recharge.checkInModalOpen
                    }
                  />
                  <p className="text-xs text-amber-100/75 leading-snug">
                    5m Startup: “{gamingSlot.startupStep}”
                  </p>
                  <div className="text-[11px] font-mono text-stone-400 truncate">
                    Next: {gamingSlot.queuedNextTitle || gamingSlot.backlogQueue[0] || 'None'}
                  </div>
                  <div className="flex items-center gap-1.5 pt-0.5">
                    {onIncrementStickyStart && (
                      <button
                        id="btn-log-start-CAT5_GAMING"
                        type="button"
                        onClick={() => onIncrementStickyStart('CAT5_GAMING')}
                        className="px-2 py-0.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.05] text-amber-200 font-mono text-[11px] cursor-pointer"
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
                      className="px-2.5 py-0.5 rounded-full bg-white/[0.05] hover:bg-white/[0.11] disabled:opacity-35 border border-white/[0.06] text-amber-100 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Swap</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectCategory('CAT5_GAMING');
              onStartCategory5mStep();
            }}
            className="w-full py-1.5 px-3 rounded-full bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3 h-3 fill-current" />
            <span>Begin 5m</span>
          </button>
        </article>
      </div>

      {/* =====================================================================
          FLOW EXTENSION GATE & COUNT-UP CONSOLE (RULE 7)
         ===================================================================== */}
      <section
        id="flow-extension-card"
        aria-labelledby="flow-extension-heading"
        className="rounded-2xl bento-surface-evening py-2 px-3.5 space-y-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="flex flex-wrap items-baseline gap-2">
              <h3
                id="flow-extension-heading"
                className="font-serif text-lg leading-snug font-medium text-amber-50"
              >
                Flow Extension
              </h3>
              <p className="text-[11px] font-mono text-amber-200/70">
                Weekly used: {recharge.weeklyExtensionsUsed}/2 • Tomorrow deduction: -{tomorrowDay?.deductedBlocksFromExtension || 0} blks
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-flow-extension"
              type="button"
              disabled={!canUseFlowExtension && !recharge.flowExtensionActive}
              onClick={onOpenFlowExtensionPrompt}
              className="px-3 py-1 rounded-full bg-amber-400/90 hover:bg-amber-300 disabled:opacity-35 text-stone-950 font-mono font-medium text-xs cursor-pointer"
            >
              {recharge.flowExtensionActive
                ? 'Flow Extension Active'
                : canUseFlowExtension
                ? 'Request Flow Extension'
                : 'Flow Extension Locked'}
            </button>

            <button
              type="button"
              onClick={() => setFlowDetailsOpen((prev) => !prev)}
              className="p-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-amber-200/75 cursor-pointer"
              aria-label="Toggle Flow Extension Eligibility Details"
            >
              {flowDetailsOpen ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Neutral Confirmation Modal */}
        {recharge.flowExtensionPromptOpen && (
          <div
            id="flow-extension-confirm-modal"
            className="p-3 rounded-xl bg-black/80 border border-amber-400/50 space-y-2"
          >
            <p className="text-xs font-mono text-amber-100">
              “Confirm this is genuine creative flow and not deadline stress”
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                id="btn-confirm-flow-extension"
                type="button"
                onClick={onConfirmFlowExtension}
                className="px-3 py-1.5 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs cursor-pointer"
              >
                Confirm Creative Flow &amp; Start Count-Up
              </button>
              <button
                id="btn-cancel-flow-extension"
                type="button"
                onClick={onCancelFlowExtensionPrompt}
                className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-amber-100 font-mono text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Active Flow Extension Open Count-Up Console */}
        {recharge.flowExtensionActive && (
          <div className="p-3 rounded-xl bg-black/50 border border-amber-400/35 flex flex-wrap items-center justify-between gap-2.5">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-amber-300">
                Open Count-Up • 20m Chimes + 60m Micro-Break
              </span>
              <div className="font-mono text-lg font-normal tabular-nums text-amber-100">
                +{formatMMSS(recharge.flowExtensionElapsedSeconds)} •{' '}
                {recharge.flowExtensionBlocksLoggedToday} ext blocks
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleFlowExtensionTimer}
                className="px-3 py-1 rounded-full bg-amber-400 text-stone-950 font-mono font-medium text-xs cursor-pointer"
              >
                {recharge.flowExtensionRunning ? 'Pause' : 'Resume'}
              </button>
              <button
                id="btn-log-flow-extension-20m"
                type="button"
                onClick={onLogFlowExtensionBlock20m}
                className="px-3 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-amber-100 font-mono text-xs cursor-pointer"
              >
                Log +20m Block
              </button>
            </div>
          </div>
        )}

        {/* Collapsible 3-Gate Eligibility Controls */}
        <AnimatePresence>
          {flowDetailsOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="pt-2 border-t border-white/[0.05] grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] font-mono overflow-hidden"
            >
              <div className="p-2.5 rounded-xl bg-black/35 border border-white/[0.05] flex items-center justify-between">
                <span>1. Tomorrow Early Event: {tomorrowHasZeroEarlyEvents ? 'None' : 'Active'}</span>
                <button
                  type="button"
                  onClick={onToggleTomorrowEarlyAnchor}
                  className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] cursor-pointer"
                >
                  Toggle
                </button>
              </div>

              <div className="p-2.5 rounded-xl bg-black/35 border border-white/[0.05] flex items-center justify-between">
                <span>2. Task: {state.timer.activeTaskType}</span>
                <span className={activeTaskNotFlashcards ? 'text-emerald-300' : 'text-red-300'}>
                  {activeTaskNotFlashcards ? 'PASS' : 'LOCKED'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-black/35 border border-white/[0.05] flex items-center justify-between">
                <span>3. Weekly: {recharge.weeklyExtensionsUsed}/2</span>
                <div className="flex gap-1">
                  {[0, 1, 2].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onSetWeeklyExtensionsUsed(n)}
                      className={`px-1.5 py-0.5 rounded text-[10px] cursor-pointer ${
                        recharge.weeklyExtensionsUsed === n
                          ? 'bg-amber-400 text-stone-950 font-medium'
                          : 'bg-white/[0.04] text-amber-100'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    </div>
  );
};
