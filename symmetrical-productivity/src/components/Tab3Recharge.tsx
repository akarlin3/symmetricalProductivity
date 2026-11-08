import React from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  FastForward,
  Gamepad2,
  Lock,
  Moon,
  Music,
  Pause,
  Play,
  RefreshCw,
  Tv,
  Unlock,
  Wrench,
} from 'lucide-react';
import {
  MediaSubTrackId,
  RechargeCategoryId,
  StickyKey,
  SymmetryState,
} from '../types/symmetry';
import { computeShiftMetrics } from '../state/defaultState';

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
}

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

  const activeStickyKey: StickyKey | null =
    recharge.activeCategory === 'CAT2_MAKER'
      ? 'CAT2_MAKER'
      : recharge.activeCategory === 'CAT5_GAMING'
      ? 'CAT5_GAMING'
      : recharge.activeCategory === 'CAT3_MEDIA'
      ? recharge.activeMediaTab
      : null;

  return (
    <div className="space-y-6 text-amber-50">
      {/* Gate Banner if work blocks still remain */}
      {!metrics.isZeroWorkLeft && (
        <div
          id="evening-lock-gate-notice"
          className="p-4 sm:p-5 rounded-2xl bg-stone-900/95 border border-amber-700/60 flex flex-wrap items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider font-mono text-amber-300">
                End-of-Shift Bridge ({metrics.remainingWorkFormatted} remaining)
              </h2>
              <p className="text-xs text-stone-300 mt-0.5">
                Evening Recharge Menu automatically unlocks at <code className="text-amber-300">0m work left</code>. You can preview the menu below or click to simulate <code className="text-amber-300">0m work left</code> now.
              </p>
            </div>
          </div>
          <button
            id="btn-unlock-evening-menu-now"
            type="button"
            onClick={onUnlockZeroWorkLeft}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <Unlock className="w-4 h-4" />
            <span>Set [0m work left] &amp; Lock Shift</span>
          </button>
        </div>
      )}

      {/* Top Row: Flow Extension Gate (Rule 7) + Option 0 Rest/Stillness Timer (Rule 8) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Flow Extension Gate & Count-Up Timer */}
        <section
          aria-labelledby="flow-extension-heading"
          className="lg:col-span-7 p-5 rounded-2xl bg-stone-900/90 border border-amber-900/60 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2
                id="flow-extension-heading"
                className="text-sm font-bold uppercase tracking-wider font-mono text-amber-300"
              >
                Flow Extension Gate &amp; Open Count-Up Timer
              </h2>
              <p className="text-xs text-stone-300 mt-0.5">
                Auto-deducts 1–2 project blocks from tomorrow’s target for every 2–3 extension blocks logged.
              </p>
            </div>
            <span
              className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold border ${
                canUseFlowExtension
                  ? 'bg-emerald-950/70 border-emerald-600/60 text-emerald-300'
                  : 'bg-stone-950 border-stone-700 text-stone-400'
              }`}
            >
              {canUseFlowExtension ? 'GATE ELIGIBLE' : 'GATE LOCKED'}
            </span>
          </div>

          {/* 3 Gate Conditions Checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div
              className={`p-3 rounded-xl border ${
                tomorrowHasZeroEarlyEvents
                  ? 'bg-stone-950/80 border-emerald-700/50 text-emerald-200'
                  : 'bg-stone-950/80 border-red-800/60 text-red-300'
              }`}
            >
              <div className="font-mono font-bold flex items-center justify-between">
                <span>1. Tomorrow Morning</span>
                <button
                  id="btn-toggle-tomorrow-anchor"
                  type="button"
                  onClick={onToggleTomorrowEarlyAnchor}
                  className="underline text-[10px] text-amber-300 cursor-pointer"
                >
                  Toggle
                </button>
              </div>
              <div className="mt-1 text-[11px]">
                {tomorrowHasZeroEarlyEvents
                  ? 'Zero Early Events / Labs'
                  : 'Early Event Logged (Blocked)'}
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                activeTaskNotFlashcards
                  ? 'bg-stone-950/80 border-emerald-700/50 text-emerald-200'
                  : 'bg-stone-950/80 border-red-800/60 text-red-300'
              }`}
            >
              <div className="font-mono font-bold">2. Active Task Type</div>
              <div className="mt-1 text-[11px]">
                {activeTaskNotFlashcards
                  ? `${state.timer.activeTaskType} (Not Flashcards)`
                  : 'Flashcards Active (Blocked)'}
              </div>
            </div>

            <div
              className={`p-3 rounded-xl border ${
                weeklyCapUnder2
                  ? 'bg-stone-950/80 border-emerald-700/50 text-emerald-200'
                  : 'bg-stone-950/80 border-red-800/60 text-red-300'
              }`}
            >
              <div className="font-mono font-bold flex items-center justify-between">
                <span>3. Weekly Cap (&lt; 2)</span>
                <div className="inline-flex gap-1">
                  {[0, 1, 2].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => onSetWeeklyExtensionsUsed(n)}
                      className={`px-1 rounded text-[10px] cursor-pointer ${
                        recharge.weeklyExtensionsUsed === n
                          ? 'bg-amber-500 text-stone-950 font-bold'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-1 text-[11px]">
                Used: {recharge.weeklyExtensionsUsed} / 2 this week
              </div>
            </div>
          </div>

          {/* Open Count-Up Timer or Launch Button */}
          {!recharge.flowExtensionActive ? (
            <div className="flex items-center justify-between gap-3 pt-2">
              <button
                id="btn-flow-extension"
                type="button"
                disabled={!canUseFlowExtension}
                onClick={onOpenFlowExtensionPrompt}
                className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:bg-stone-800 disabled:text-stone-500 text-stone-950 font-bold text-xs sm:text-sm flex items-center gap-2 transition cursor-pointer disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" />
                <span>Start Flow Extension (Open Count-Up Timer)</span>
              </button>

              {tomorrowDay && tomorrowDay.deductedBlocksFromExtension > 0 && (
                <span className="font-mono text-xs text-amber-300">
                  Tomorrow Quota Deduction: -{tomorrowDay.deductedBlocksFromExtension} proj blks
                </span>
              )}
            </div>
          ) : (
            <div
              id="flow-extension-active-console"
              className="p-4 rounded-xl bg-stone-950 border border-amber-600/70 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-mono uppercase text-amber-300 font-bold">
                    Open Count-Up Flow Extension Timer (20m Chimes / 60m Break)
                  </div>
                  <div className="text-[11px] text-stone-400">
                    Extension Blocks Logged Today:{' '}
                    <strong className="text-amber-200">
                      {recharge.flowExtensionBlocksLoggedToday} blocks
                    </strong>{' '}
                    (Tomorrow Target Deduction:{' '}
                    <strong className="text-emerald-300">
                      -{tomorrowDay?.deductedBlocksFromExtension || 0} blocks
                    </strong>
                    )
                  </div>
                </div>
                <div
                  id="flow-extension-countup-readout"
                  className="text-2xl sm:text-3xl font-mono font-bold text-amber-200"
                >
                  {formatMMSS(recharge.flowExtensionElapsedSeconds)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  id="btn-toggle-flow-countup"
                  type="button"
                  onClick={onToggleFlowExtensionTimer}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {recharge.flowExtensionRunning ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Count-Up</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Resume Count-Up</span>
                    </>
                  )}
                </button>

                <button
                  id="btn-log-flow-extension-20m"
                  type="button"
                  onClick={onLogFlowExtensionBlock20m}
                  className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-700/50 text-amber-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
                  title="Advance +20m Chime & log 1 extension block (2-3 blocks auto-deducts 1-2 blocks from tomorrow)"
                >
                  <FastForward className="w-3.5 h-3.5 text-amber-400" />
                  <span>+20m Chime (+1 Ext Block)</span>
                </button>
              </div>
            </div>
          )}
        </section>

        {/* Option 0: Rest / Stillness Timer (20m, 2-Window Cap -> 40m Fork Check) */}
        <section
          aria-labelledby="option-0-rest-heading"
          className="lg:col-span-5 p-5 rounded-2xl bg-stone-900/90 border border-amber-900/60 flex flex-col justify-between space-y-4"
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2
                id="option-0-rest-heading"
                className="text-sm font-bold uppercase tracking-wider font-mono text-amber-300"
              >
                Option 0: Rest / Stillness (20m)
              </h2>
              <span className="px-2 py-0.5 rounded bg-stone-950 border border-amber-800/60 font-mono text-xs text-amber-200">
                Windows: [{recharge.option0ConsecutiveWindows} / 2] (Max 40m)
              </span>
            </div>

            <p className="text-xs text-stone-300">
              20m silent timer with <strong>zero startup step</strong> and <strong>no scrolling</strong>. Capped at 2 consecutive windows (40m), then prompts a Fork Check: <em>&ldquo;Go to Sleep&rdquo;</em> vs. <em>&ldquo;Start One 5m Activity&rdquo;</em>.
            </p>

            <div className="p-4 rounded-xl bg-stone-950 border border-stone-800 flex items-center justify-between">
              <div>
                <div className="text-[11px] font-mono uppercase text-stone-400">
                  Silent Stillness Countdown
                </div>
                <div
                  id="option0-timer-digits"
                  className="text-3xl font-mono font-bold text-amber-200 mt-0.5"
                >
                  {formatMMSS(recharge.option0SecondsLeft)}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <button
                  id="btn-option0-start-pause"
                  type="button"
                  disabled={recharge.option0ConsecutiveWindows >= 2}
                  onClick={onToggleOption0Timer}
                  className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
                >
                  {recharge.option0Running ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause 20m</span>
                    </>
                  ) : (
                    <>
                      <Moon className="w-3.5 h-3.5" />
                      <span>Start 20m Rest</span>
                    </>
                  )}
                </button>
                <button
                  id="btn-option0-complete-window"
                  type="button"
                  onClick={onCompleteOption0Window}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-300 font-mono text-[11px] cursor-pointer"
                >
                  Complete 20m Window ({recharge.option0ConsecutiveWindows + 1}/2)
                </button>
              </div>
            </div>
          </div>

          <div className="text-[11px] font-mono text-stone-400 border-t border-stone-800 pt-2.5 flex items-center justify-between">
            <span>Zero Startup Step Required</span>
            <span className="text-amber-300">Strict No-Scrolling Window</span>
          </div>
        </section>
      </div>

      {/* Section 2: 5 Evening Recharge Categories & Pacing Console (Rule 8) */}
      <section
        aria-labelledby="recharge-categories-heading"
        className="p-5 rounded-2xl bg-stone-900/90 border border-amber-900/60 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="recharge-categories-heading"
              className="text-sm font-bold uppercase tracking-wider font-mono text-amber-300"
            >
              Evening Recharge Menu (5 Categories &amp; Sticky Swap Tracker)
            </h2>
            <p className="text-xs text-stone-300 mt-0.5">
              Pacing: 5m Startup Step → 20m &amp; 40m Check-In (&ldquo;Keep going, switch, or rest?&rdquo;) → Mandatory 5–10m physical break at 60m.
            </p>
          </div>
          <span className="font-mono text-xs text-amber-200 bg-stone-950 px-3 py-1 rounded-xl border border-amber-800/60">
            Sticky Swap Rule: [X / 3] 5m Starts OR Immediate Swap at 20m Check-In
          </span>
        </div>

        {/* 5 Category Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {/* Category 1: Music [Fluid] */}
          <div
            id="recharge-card-cat1-music"
            className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition ${
              recharge.activeCategory === 'CAT1_MUSIC'
                ? 'bg-stone-950 border-amber-500 shadow-sm'
                : 'bg-stone-950/70 border-stone-800'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-700/60 text-sky-300 font-mono text-[10px] font-bold">
                  1. MUSIC [FLUID]
                </span>
                <Music className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-amber-50">
                5m Cold Song Play (Bass / Guitar)
              </h3>
              <p className="text-xs text-stone-400">
                Pick up instrument and play 1 song cold. Explicitly <strong>no DAW / no drills</strong>.
              </p>
            </div>
            <button
              id="btn-select-cat1-music"
              type="button"
              onClick={() => onSelectCategory('CAT1_MUSIC')}
              className="w-full px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-mono text-xs font-bold cursor-pointer"
            >
              Launch 5m Cold Song Step
            </button>
          </div>

          {/* Category 2: Maker / Hardware [Sticky] */}
          <div
            id="recharge-card-cat2-maker"
            className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition ${
              recharge.activeCategory === 'CAT2_MAKER'
                ? 'bg-stone-950 border-amber-500 shadow-sm'
                : 'bg-stone-950/70 border-stone-800'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700/60 text-amber-300 font-mono text-[10px] font-bold">
                  2. MAKER / HARDWARE [STICKY]
                </span>
                <span className="font-mono text-xs font-bold text-amber-300">
                  [{recharge.stickySlots.CAT2_MAKER.fiveMinStarts} / 3] Starts
                </span>
              </div>
              <h3 className="text-sm font-bold text-amber-50">
                {recharge.stickySlots.CAT2_MAKER.activeTitle}
              </h3>
              <p className="text-xs text-stone-400">
                5m K1C 3D printer diagnostic/build step. Next in backlog:{' '}
                <span className="text-stone-300">
                  {recharge.stickySlots.CAT2_MAKER.backlogQueue[0]}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                id="btn-select-cat2-maker"
                type="button"
                onClick={() => onSelectCategory('CAT2_MAKER')}
                className="flex-1 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-mono text-xs font-bold cursor-pointer"
              >
                5m K1C Step
              </button>
              <button
                id="btn-swap-sticky-cat2"
                type="button"
                disabled={
                  recharge.stickySlots.CAT2_MAKER.fiveMinStarts < 3 &&
                  !recharge.stickySlots.CAT2_MAKER.unlockedViaCheckIn
                }
                onClick={() => onSwapStickyItemFromBacklog('CAT2_MAKER')}
                className="px-2.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-40 border border-stone-700 text-stone-200 font-mono text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                title="Promote next item from backlog (Requires 3/3 starts or 20m Check-In unlock)"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Swap</span>
              </button>
            </div>
          </div>

          {/* Category 3: Media [Sticky Triple-Track] (3A Fiction, 3B Nonfiction, 3C Video) */}
          <div
            id="recharge-card-cat3-media"
            className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition md:col-span-2 lg:col-span-1 ${
              recharge.activeCategory === 'CAT3_MEDIA'
                ? 'bg-stone-950 border-amber-500 shadow-sm'
                : 'bg-stone-950/70 border-stone-800'
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700/60 text-amber-300 font-mono text-[10px] font-bold">
                  3. MEDIA [STICKY TRIPLE-TRACK]
                </span>
                <span className="font-mono text-xs font-bold text-amber-300">
                  [{recharge.stickySlots[recharge.activeMediaTab].fiveMinStarts} / 3] Starts
                </span>
              </div>

              {/* Parallel Sub-Tabs: 3A Fiction, 3B Nonfiction, 3C Video */}
              <div className="grid grid-cols-3 gap-1 bg-stone-900 p-1 rounded-lg border border-stone-800">
                {(
                  [
                    { id: '3A_FICTION', label: '3A Fiction' },
                    { id: '3B_NONFICTION', label: '3B Nonfiction' },
                    { id: '3C_VIDEO', label: '3C Video' },
                  ] as { id: MediaSubTrackId; label: string }[]
                ).map((sub) => (
                  <button
                    key={sub.id}
                    id={`btn-media-subtab-${sub.id.toLowerCase()}`}
                    type="button"
                    onClick={() => onSelectMediaSubTab(sub.id)}
                    className={`py-1 px-1.5 rounded font-mono text-[11px] transition cursor-pointer ${
                      recharge.activeMediaTab === sub.id
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-amber-50">
                    {recharge.stickySlots[recharge.activeMediaTab].activeTitle}
                  </h3>
                  {recharge.activeMediaTab === '3A_FICTION' && (
                    <div className="inline-flex rounded bg-stone-900 p-0.5 border border-stone-800">
                      {(['1.75x', '2.00x', '2.25x'] as const).map((spd) => (
                        <button
                          key={spd}
                          type="button"
                          onClick={() => onSelectFictionSpeed(spd)}
                          className={`px-1.5 py-0.5 rounded font-mono text-[10px] cursor-pointer ${
                            recharge.fictionSpeed === spd
                              ? 'bg-amber-500 text-stone-950 font-bold'
                              : 'text-stone-400'
                          }`}
                        >
                          {spd}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-xs text-stone-400">
                  {recharge.activeMediaTab === '3A_FICTION'
                    ? `Audiobook/Print pacing at ${recharge.fictionSpeed}.`
                    : recharge.activeMediaTab === '3B_NONFICTION'
                    ? 'Narrative nonfiction track (auto-credits Roadmap Input).'
                    : 'Dedicated episodic series track.'}{' '}
                  Backlog:{' '}
                  <span className="text-stone-300">
                    {recharge.stickySlots[recharge.activeMediaTab].backlogQueue[0]}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-select-cat3-media"
                type="button"
                onClick={() => onSelectCategory('CAT3_MEDIA')}
                className="flex-1 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-mono text-xs font-bold cursor-pointer"
              >
                Start 5m ({recharge.activeMediaTab.slice(0, 2)})
              </button>
              <button
                id="btn-swap-sticky-cat3"
                type="button"
                disabled={
                  recharge.stickySlots[recharge.activeMediaTab].fiveMinStarts < 3 &&
                  !recharge.stickySlots[recharge.activeMediaTab].unlockedViaCheckIn
                }
                onClick={() => onSwapStickyItemFromBacklog(recharge.activeMediaTab)}
                className="px-2.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-40 border border-stone-700 text-stone-200 font-mono text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Swap</span>
              </button>
            </div>
          </div>

          {/* Category 4: Comfort Show [Fluid] */}
          <div
            id="recharge-card-cat4-comfort"
            className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition ${
              recharge.activeCategory === 'CAT4_COMFORT'
                ? 'bg-stone-950 border-amber-500 shadow-sm'
                : 'bg-stone-950/70 border-stone-800'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-sky-950 border border-sky-700/60 text-sky-300 font-mono text-[10px] font-bold">
                  4. COMFORT SHOW [FLUID]
                </span>
                <Tv className="w-4 h-4 text-amber-400" />
              </div>
              <h3 className="text-sm font-bold text-amber-50">
                &ldquo;It&rsquo;s Always Sunny in Philadelphia&rdquo;
              </h3>
              <p className="text-xs text-stone-400">
                5m episode start <strong>away from work monitor</strong>. Zero sticky commitment counter.
              </p>
            </div>
            <button
              id="btn-select-cat4-comfort"
              type="button"
              onClick={() => onSelectCategory('CAT4_COMFORT')}
              className="w-full px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-mono text-xs font-bold cursor-pointer"
            >
              Launch 5m Episode Start
            </button>
          </div>

          {/* Category 5: Gaming [Sticky] */}
          <div
            id="recharge-card-cat5-gaming"
            className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition ${
              recharge.activeCategory === 'CAT5_GAMING'
                ? 'bg-stone-950 border-amber-500 shadow-sm'
                : 'bg-stone-950/70 border-stone-800'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded bg-amber-950 border border-amber-700/60 text-amber-300 font-mono text-[10px] font-bold">
                  5. GAMING [STICKY]
                </span>
                <span className="font-mono text-xs font-bold text-amber-300">
                  [{recharge.stickySlots.CAT5_GAMING.fiveMinStarts} / 3] Starts
                </span>
              </div>
              <h3 className="text-sm font-bold text-amber-50">
                {recharge.stickySlots.CAT5_GAMING.activeTitle}
              </h3>
              <p className="text-xs text-stone-400">
                5m micro-objective (clear 1 room/inventory step). Backlog:{' '}
                <span className="text-stone-300">
                  {recharge.stickySlots.CAT5_GAMING.backlogQueue[0]}
                </span>
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                id="btn-select-cat5-gaming"
                type="button"
                onClick={() => onSelectCategory('CAT5_GAMING')}
                className="flex-1 px-3 py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/50 text-amber-200 font-mono text-xs font-bold cursor-pointer"
              >
                5m Micro-Objective
              </button>
              <button
                id="btn-swap-sticky-cat5"
                type="button"
                disabled={
                  recharge.stickySlots.CAT5_GAMING.fiveMinStarts < 3 &&
                  !recharge.stickySlots.CAT5_GAMING.unlockedViaCheckIn
                }
                onClick={() => onSwapStickyItemFromBacklog('CAT5_GAMING')}
                className="px-2.5 py-2 rounded-lg bg-stone-900 hover:bg-stone-800 disabled:opacity-40 border border-stone-700 text-stone-200 font-mono text-xs flex items-center gap-1 cursor-pointer disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Swap</span>
              </button>
            </div>
          </div>

          {/* Active Recharge Pacing Console Card (5m -> 20m Check-In -> 40m Check-In -> 60m Break) */}
          <div
            id="recharge-pacing-console"
            className="p-4 rounded-xl bg-stone-950 border border-amber-600/70 flex flex-col justify-between space-y-3"
          >
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase text-amber-300 font-bold">
                  Active Pacing Console
                </span>
                <span className="font-mono text-xs text-stone-300">
                  Stage: {recharge.pacingStage}
                </span>
              </div>

              <div className="text-2xl font-mono font-bold text-amber-100">
                {formatMMSS(recharge.categorySecondsLeft)}
              </div>

              <p className="text-[11px] text-stone-400">
                {recharge.activeCategory === 'NONE'
                  ? 'Select any of the 5 Recharge Categories to begin its 5m Startup Step.'
                  : `Active: ${recharge.activeCategory} (${
                      activeStickyKey
                        ? `Sticky [${recharge.stickySlots[activeStickyKey].fiveMinStarts}/3]`
                        : 'Fluid'
                    })`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                id="btn-start-recharge-5m-step"
                type="button"
                disabled={recharge.activeCategory === 'NONE'}
                onClick={onStartCategory5mStep}
                className="flex-1 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-stone-950 font-bold text-xs cursor-pointer"
              >
                {recharge.categoryRunning ? 'Pause Timer' : 'Start / Log 5m Step'}
              </button>
              <button
                id="btn-advance-recharge-milestone"
                type="button"
                disabled={recharge.activeCategory === 'NONE'}
                onClick={onAdvanceCategoryPacingMilestone}
                className="px-2.5 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 disabled:opacity-40 text-amber-200 font-mono text-xs cursor-pointer"
                title="Advance to next pacing milestone (5m -> 20m Check-In -> 40m Check-In -> 60m Break)"
              >
                Next Milestone →
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MODAL 1: Flow Extension Neutral Confirmation Prompt (Rule 7) */}
      {recharge.flowExtensionPromptOpen && (
        <div
          id="modal-flow-extension-confirm"
          className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full p-6 rounded-2xl bg-stone-900 border border-amber-500/80 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-amber-200 font-mono uppercase">
              Flow Extension Confirmation
            </h3>
            <p className="text-sm text-amber-50 font-medium">
              Confirm this is genuine creative flow and not deadline stress
            </p>
            <p className="text-xs text-stone-400">
              Starts an open count-up timer with 20m check-in chimes and a 60m micro-break. Every 2–3 extension blocks logged automatically deducts 1–2 project blocks from tomorrow&rsquo;s target.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                id="btn-cancel-flow-confirm"
                type="button"
                onClick={onCancelFlowExtensionPrompt}
                className="px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-flow-extension"
                type="button"
                onClick={onConfirmFlowExtension}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 text-xs font-bold cursor-pointer"
              >
                Confirm Genuine Creative Flow
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Option 0 Fork Check at 2 Consecutive Windows / 40m (Rule 8) */}
      {recharge.forkCheckModalOpen && (
        <div
          id="modal-option0-fork-check"
          className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full p-6 rounded-2xl bg-stone-900 border border-amber-500/80 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-amber-200 font-mono uppercase">
              40m Stillness Cap Reached — Fork Check
            </h3>
            <p className="text-sm text-amber-50">
              2 consecutive 20m Rest / Stillness windows (40m) completed. Choose next action:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
              <button
                id="btn-fork-go-to-sleep"
                type="button"
                onClick={() => onResolveForkCheck('SLEEP')}
                className="px-4 py-3 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-700/60 text-amber-100 font-bold text-xs cursor-pointer"
              >
                Go to Sleep
              </button>
              <button
                id="btn-fork-start-5m-activity"
                type="button"
                onClick={() => onResolveForkCheck('START_5M_ACTIVITY')}
                className="px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer"
              >
                Start One 5m Activity
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: 20m / 40m Recharge Check-In Prompt ("Keep going, switch, or rest?") (Rule 8) */}
      {recharge.checkInModalOpen && (
        <div
          id="modal-recharge-checkin"
          className="fixed inset-0 z-50 bg-stone-950/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full p-6 rounded-2xl bg-stone-900 border border-amber-500/80 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-amber-200 font-mono uppercase">
                {recharge.checkInMilestone}m Recharge Check-In
              </h3>
              <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-600/60 text-emerald-300 font-mono text-[10px]">
                Immediate Sticky Swap Unlocked
              </span>
            </div>
            <p className="text-sm font-semibold text-amber-50">
              Keep going, switch, or rest?
            </p>
            <p className="text-xs text-stone-400">
              Reaching a 20m Check-In also unlocks immediate backlog promotion for the active Sticky category if you wish to switch.
            </p>
            <div className="grid grid-cols-3 gap-2 pt-2">
              <button
                id="btn-checkin-keep-going"
                type="button"
                onClick={() => onResolveCheckInPrompt('KEEP_GOING')}
                className="px-3 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs cursor-pointer"
              >
                Keep Going
              </button>
              <button
                id="btn-checkin-switch"
                type="button"
                onClick={() => onResolveCheckInPrompt('SWITCH')}
                className="px-3 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 border border-amber-700/60 text-amber-200 font-bold text-xs cursor-pointer"
              >
                Switch / Swap
              </button>
              <button
                id="btn-checkin-rest"
                type="button"
                onClick={() => onResolveCheckInPrompt('REST')}
                className="px-3 py-2.5 rounded-xl bg-stone-950 hover:bg-stone-800 border border-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
              >
                Rest (Option 0)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
