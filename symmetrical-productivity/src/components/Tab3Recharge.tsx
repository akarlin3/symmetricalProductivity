import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BookOpen,
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Coffee,
  Cpu,
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  FastForward,
  Film,
  Flame,
  Gamepad2,
  Globe,
  Headphones,
  Lock,
  Moon,
  Music,
  Palette,
  Pause,
  Play,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Tv,
  Unlock,
  Wrench,
} from 'lucide-react';
import {
  EveningCategoryCardConfig,
  EveningSubTrackConfig,
  LayoutMode,
  MediaSubTrackId,
  RechargeCategoryId,
  StickyKey,
  SymmetryState,
} from '../types/symmetry';
import {
  computeShiftMetrics,
  getEffectiveEveningCategoryCards,
} from '../state/defaultState';
import { BreathingVisualizer478 } from './BreathingVisualizer478';
import { InlineEditableText } from './InlineEditableText';
import { triggerHaptic } from '../utils/haptics';
import { AveryCorpEmblem } from './AveryCorpEmblem';
import {
  isValidResourceLaunchUrl,
  openResourceLaunchUrl,
} from '../utils/ankiConnectClient';

interface Tab3RechargeProps {
  state: SymmetryState;
  layoutMode?: LayoutMode;
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
  onUpdateEveningCategoryCards?: (cards: EveningCategoryCardConfig[]) => void;
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
  onUpdateEveningCategoryCards,
}) => {
  const metrics = computeShiftMetrics(state);
  const { recharge } = state;

  const [hoveredCat, setHoveredCat] = useState<string | null>(null);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);
  const [editingCardIds, setEditingCardIds] = useState<Record<string, boolean>>({});
  const [newBacklogInputs, setNewBacklogInputs] = useState<Record<string, string>>({});
  const [option0Expanded, setOption0Expanded] = useState(false);
  const [flowDetailsOpen, setFlowDetailsOpen] = useState(false);

  const allCategoryCards = getEffectiveEveningCategoryCards(recharge);
  const visibleCategoryCards = allCategoryCards.filter((c) => !c.hidden);
  const hiddenCategoryCards = allCategoryCards.filter((c) => c.hidden);

  // Flow Extension 3-part eligibility check (Rule 7 + Live Calendar <10:00 AM Anchor Lock)
  const tomorrowDay = state.pipelineDays[1];
  const tomorrowHasZeroEarlyEvents =
    !state.hasMorningAnchorTomorrow && !tomorrowDay?.earlyMorningAnchor;
  const activeTaskNotFlashcards = state.timer.activeTaskType !== 'FLASHCARDS';
  const weeklyCapUnder2 = recharge.weeklyExtensionsUsed < 2;
  const canUseFlowExtension =
    tomorrowHasZeroEarlyEvents && activeTaskNotFlashcards && weeklyCapUnder2;

  const formatMMSS = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const isCardDisclosed = (cardId: string) =>
    recharge.activeCategory === cardId ||
    expandedCat === cardId ||
    hoveredCat === cardId ||
    Boolean(editingCardIds[cardId]) ||
    Boolean(state.inlineEditModeActive);

  const toggleCardExpand = (card: EveningCategoryCardConfig) => {
    const targetCat: RechargeCategoryId =
      card.legacyCategoryKey || 'CAT1_MUSIC';
    onSelectCategory(targetCat);
    setExpandedCat((prev) => (prev === card.id ? null : card.id));
  };

  const toggleEditCard = (cardId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCardIds((prev) => ({
      ...prev,
      [cardId]: !prev[cardId],
    }));
  };

  const updateCardById = (
    cardId: string,
    updater: (card: EveningCategoryCardConfig) => EveningCategoryCardConfig
  ) => {
    const updated = allCategoryCards.map((c) => (c.id === cardId ? updater(c) : c));
    onUpdateEveningCategoryCards?.(updated);
  };

  const handleAddCategoryCard = () => {
    const nextSlot = allCategoryCards.length + 1;
    const newCard: EveningCategoryCardConfig = {
      id: `CUSTOM_CAT_${Date.now()}`,
      slotNumber: nextSlot,
      categoryName: `Activity ${nextSlot}`,
      subtitle: 'Custom evening recharge slot.',
      behavior: 'FLUID',
      trackMode: 'SINGLE',
      activeTitle: `Custom Recharge Activity ${nextSlot}`,
      startupPrompt: 'Spend 5 minutes starting this activity away from your work setup.',
      backlogQueue: ['Queued Next Item'],
      fiveMinStarts: 0,
      unlockedViaCheckIn: false,
      hidden: false,
      legacyCategoryKey: 'CAT1_MUSIC',
    };
    const nextCards = [...allCategoryCards, newCard];
    onUpdateEveningCategoryCards?.(nextCards);
    setEditingCardIds((prev) => ({ ...prev, [newCard.id]: true }));
  };

  const getCardDomId = (card: EveningCategoryCardConfig): string => {
    if (card.id === 'CAT1_MUSIC') return 'recharge-card-cat1-music';
    if (card.id === 'CAT2_MAKER') return 'recharge-card-cat2-maker';
    if (card.id === 'CAT3_MEDIA') return 'recharge-card-cat3-media';
    if (card.id === 'CAT4_COMFORT') return 'recharge-card-cat4-comfort';
    if (card.id === 'CAT5_GAMING') return 'recharge-card-cat5-gaming';
    if (card.id === 'CAT6_CULTURE') return 'recharge-card-cat6-culture';
    return `recharge-card-${card.id.toLowerCase()}`;
  };

  const getCardIcon = (slotNumber: number, customIcon?: string) => {
    const token = (customIcon || '').toLowerCase();
    if (token === 'palette') return <Palette className="w-3 h-3 text-pink-300" />;
    if (token === 'gamepad') return <Gamepad2 className="w-3 h-3 text-emerald-300" />;
    if (token === 'tv') return <Tv className="w-3 h-3 text-amber-300" />;
    if (token === 'film') return <Film className="w-3 h-3 text-amber-300" />;
    if (token === 'book') return <BookOpen className="w-3 h-3 text-sky-300" />;
    if (token === 'music') return <Music className="w-3 h-3 text-rose-300" />;
    if (token === 'wrench') return <Wrench className="w-3 h-3 text-orange-300" />;
    if (token === 'code') return <Code2 className="w-3 h-3 text-cyan-300" />;
    if (token === 'coffee') return <Coffee className="w-3 h-3 text-amber-300" />;
    if (token === 'globe') return <Globe className="w-3 h-3 text-cyan-300" />;
    if (token === 'sparkles') return <Sparkles className="w-3 h-3 text-amber-300" />;
    if (slotNumber === 1) return <Music className="w-3 h-3 text-rose-300" />;
    if (slotNumber === 2) return <Cpu className="w-3 h-3 text-orange-300" />;
    if (slotNumber === 3) return <Headphones className="w-3 h-3 text-amber-300" />;
    if (slotNumber === 4) return <Tv className="w-3 h-3 text-amber-300" />;
    if (slotNumber === 5) return <Gamepad2 className="w-3 h-3 text-emerald-300" />;
    return <Globe className="w-3 h-3 text-cyan-300" />;
  };

  return (
    <div className="relative w-full max-w-none space-y-3.5 text-amber-50 animate-tab-enter pb-10">
      {/* Subtle Ambient Warm Halo */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 inset-x-0 h-52 rounded-full blur-3xl opacity-45 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 70% 100% at 50% 0%, rgba(245, 158, 11, 0.22), rgba(234, 88, 12, 0.08) 55%, transparent 85%)',
        }}
      />

      {/* Editorial Section Header */}
      <div className="w-full flex flex-wrap items-end justify-between gap-3 border-b border-white/[0.05] pb-3">
        <div className="flex items-center gap-3">
          <AveryCorpEmblem
            size={38}
            variant="image"
            cropMode="full-seal"
            ariaLabel="AveryCorp End-of-Shift Seal"
          />
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300/80 flex items-center gap-1.5">
              <Moon className="w-3 h-3 text-amber-400" />
              <span>Off-Duty Recovery • 6-Channel 3×2 Grid</span>
            </span>
            <h2 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-amber-50 mt-0.5">
              Evening Recharge Menu
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddCategoryCard}
            className="px-3.5 py-1.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 font-mono text-xs text-amber-200 flex items-center gap-1.5 cursor-pointer transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Category</span>
          </button>

          {!metrics.isZeroWorkLeft ? (
            <div
              id="evening-lock-gate-notice"
              className="flex items-center gap-3 px-4 py-2 rounded-full bento-surface-evening"
            >
              <span className="text-xs font-mono text-amber-200/80 tabular-nums">
                {metrics.remainingWorkFormatted} left
              </span>
              <button
                id="btn-unlock-evening-menu-now"
                type="button"
                onClick={() => {
                  triggerHaptic([20]);
                  onUnlockZeroWorkLeft();
                }}
                className="px-3.5 py-1 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3 h-3" />
                <span>Set [0m work left]</span>
              </button>
            </div>
          ) : (
            <div className="px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/25 font-mono text-xs text-amber-200 flex items-center gap-2">
              <Lock className="w-3 h-3 text-amber-400" />
              <span>End-of-Shift Lock • [0m work left]</span>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          OPTION 0 (STILLNESS): SLIM SINGLE-LINE BANNER AT THE TOP
         ===================================================================== */}
      <section
        id="option-0-stillness-card"
        aria-labelledby="option-0-heading"
        className="w-full rounded-3xl bento-hero-border-evening px-5 py-3 transition-all duration-300 space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4 min-w-0">
            <span className="px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-300/30 font-mono text-[10px] uppercase tracking-widest text-amber-200 shrink-0">
              Option 0 • Stillness
            </span>

            <h3
              id="option-0-heading"
              className="font-serif text-xl sm:text-2xl font-medium text-amber-50 truncate"
            >
              20-Minute Silent Stillness
            </h3>

            <span className="text-xs font-mono text-amber-200/70 tabular-nums">
              [{recharge.option0ConsecutiveWindows} / 2 windows]
            </span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="px-3.5 py-1.5 rounded-full bg-black/45 border border-white/[0.05] font-mono text-lg font-light tabular-nums text-amber-100">
              {formatMMSS(recharge.option0SecondsLeft)}
            </div>

            <button
              id="btn-option0-start-pause"
              type="button"
              onClick={onToggleOption0Timer}
              className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs flex items-center gap-1.5 cursor-pointer"
            >
              {recharge.option0Running ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Pause</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Begin 20m</span>
                </>
              )}
            </button>

            <button
              id="btn-option0-complete-window"
              type="button"
              onClick={onCompleteOption0Window}
              className="px-3 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.05] text-amber-200/90 font-mono text-xs cursor-pointer"
              title="Complete 20m window (+1 toward 40m Fork Check)"
            >
              +1 Window
            </button>

            <button
              type="button"
              onClick={() => setOption0Expanded((prev) => !prev)}
              className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.05] text-amber-200/70 cursor-pointer"
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
              className="pt-3 border-t border-white/[0.05] overflow-hidden"
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
            className="p-5 rounded-2xl bg-black/80 border border-amber-400/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-mono text-xs font-medium uppercase">
                40m Cap Reached (2 / 2 Windows) • Fork Check
              </span>
            </div>
            <p className="text-sm text-amber-50">
              40 minutes of stillness completed. Choose your next path:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                id="btn-fork-go-to-sleep"
                type="button"
                onClick={() => onResolveForkCheck('SLEEP')}
                className="py-2.5 px-4 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-amber-100 font-mono text-xs cursor-pointer"
              >
                Go to Sleep
              </button>
              <button
                id="btn-fork-start-5m-activity"
                type="button"
                onClick={() => onResolveForkCheck('START_5M_ACTIVITY')}
                className="py-2.5 px-4 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs cursor-pointer"
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
          className="w-full rounded-3xl bento-surface-evening px-6 py-4 space-y-4"
        >
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Flame className="w-4 h-4 text-amber-400 shrink-0" />
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-amber-300/80 block">
                  Active Pacing • {recharge.pacingStage.replace(/_/g, ' ')}
                </span>
                <span className="font-serif text-xl text-amber-50">
                  5m Startup → 20m &amp; 40m Check-In → 60m Break
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="px-4 py-1.5 rounded-full bg-black/50 border border-white/[0.05] font-mono text-xl font-light tabular-nums text-amber-100">
                {formatMMSS(recharge.categorySecondsLeft)}
              </div>

              <button
                id="btn-start-category-5m"
                type="button"
                onClick={onStartCategory5mStep}
                className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {recharge.categoryRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
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
                className="px-3 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.05] text-amber-100 font-mono text-xs flex items-center gap-1 cursor-pointer"
                title="Advance to next milestone (5m → 20m → 40m → 60m)"
              >
                <FastForward className="w-3.5 h-3.5" />
                <span>Next</span>
              </button>
            </div>
          </div>

          {recharge.checkInModalOpen && (
            <div
              id="recharge-checkin-modal"
              className="p-4 rounded-2xl bg-black/80 border border-amber-400/50 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-stone-950 font-mono text-xs font-medium uppercase">
                  {recharge.checkInMilestone}m Check-In
                </span>
                <span className="text-xs font-mono text-emerald-300">
                  Sticky Swap Unlocked
                </span>
              </div>
              <p className="font-serif text-xl text-amber-50">
                “Keep going, switch, or rest?”
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <button
                  id="btn-checkin-keep-going"
                  type="button"
                  onClick={() => onResolveCheckInPrompt('KEEP_GOING')}
                  className="py-2 px-3 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs cursor-pointer"
                >
                  Keep Going
                </button>
                <button
                  id="btn-checkin-switch"
                  type="button"
                  onClick={() => onResolveCheckInPrompt('SWITCH')}
                  className="py-2 px-3 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-amber-100 font-mono text-xs cursor-pointer"
                >
                  Switch / Swap Sticky
                </button>
                <button
                  id="btn-checkin-rest"
                  type="button"
                  onClick={() => onResolveCheckInPrompt('REST')}
                  className="py-2 px-3 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.05] text-amber-200 font-mono text-xs cursor-pointer"
                >
                  Rest (Option 0)
                </button>
              </div>
            </div>
          )}
        </section>
      )}

      {/* =====================================================================
          6-CHANNEL SYMMETRICAL 3x2 RECHARGE GRID WITH INLINE "EDIT CARD" & LAUNCH URL
         ===================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 w-full">
        {visibleCategoryCards.map((card) => {
          const isEditingCard = Boolean(editingCardIds[card.id]);
          const isTriple = card.trackMode === 'TRIPLE' && Array.isArray(card.subTracks);
          const activeSubTrackId =
            card.id === 'CAT3_MEDIA'
              ? recharge.activeMediaTab
              : card.activeSubTrackId || card.subTracks?.[0]?.id || '3A_FICTION';
          const activeSubTrack: EveningSubTrackConfig | undefined = isTriple
            ? card.subTracks?.find((s) => s.id === activeSubTrackId) ||
              card.subTracks?.[0]
            : undefined;

          const legacyStickyKey: StickyKey | undefined =
            card.id === 'CAT3_MEDIA'
              ? recharge.activeMediaTab
              : card.stickyKey;

          const liveStickySlot = legacyStickyKey
            ? recharge.stickySlots[legacyStickyKey]
            : undefined;

          const displayActiveTitle = isTriple
            ? activeSubTrack?.activeTitle ||
              liveStickySlot?.activeTitle ||
              card.activeTitle
            : liveStickySlot?.activeTitle || card.activeTitle;

          const displayStartupPrompt: string =
            (isTriple
              ? activeSubTrack?.startupPrompt ||
                liveStickySlot?.startupStep ||
                card.startupPrompt
              : liveStickySlot?.startupStep || card.startupPrompt) ||
            'Complete 5m startup step';

          const displayBacklog = isTriple
            ? activeSubTrack?.backlogQueue ||
              liveStickySlot?.backlogQueue ||
              card.backlogQueue
            : liveStickySlot?.backlogQueue || card.backlogQueue;

          const displayLaunchUrl = isTriple
            ? activeSubTrack?.launchUrl ?? liveStickySlot?.launchUrl ?? card.launchUrl ?? ''
            : liveStickySlot?.launchUrl ?? card.launchUrl ?? '';

          const displayAutoLaunchUrl = Boolean(
            isTriple
              ? activeSubTrack?.autoLaunchUrl ??
                  liveStickySlot?.autoLaunchUrl ??
                  card.autoLaunchUrl
              : liveStickySlot?.autoLaunchUrl ?? card.autoLaunchUrl
          );

          const displayStarts = isTriple
            ? liveStickySlot?.startsLogged ??
              liveStickySlot?.fiveMinStarts ??
              activeSubTrack?.fiveMinStarts ??
              0
            : liveStickySlot?.startsLogged ??
              liveStickySlot?.fiveMinStarts ??
              card.fiveMinStarts ??
              0;

          const displayUnlocked = Boolean(
            liveStickySlot?.unlockedViaCheckIn ||
              activeSubTrack?.unlockedViaCheckIn ||
              card.unlockedViaCheckIn ||
              recharge.checkInModalOpen
          );

          const isSelectedCard =
            recharge.activeCategory === (card.legacyCategoryKey || card.id);

          return (
            <article
              key={card.id}
              id={getCardDomId(card)}
              onMouseEnter={() => setHoveredCat(card.id)}
              onMouseLeave={() => setHoveredCat(null)}
              onClick={() => toggleCardExpand(card)}
              className={`rounded-3xl p-4 border transition-all duration-300 cursor-pointer flex flex-col justify-between space-y-3.5 ${
                isSelectedCard
                  ? 'bento-hero-border-evening border-amber-400/35'
                  : 'bento-surface-evening'
              }`}
            >
              <div className="space-y-2.5">
                {/* Card Top Header: Category Badge + Optional Launch Link + Inline "Edit Card" Button */}
                <div className="flex items-center justify-between gap-1.5">
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-400/25 font-mono text-[10px] uppercase tracking-widest text-amber-200 flex items-center gap-1.5 min-w-0">
                    {getCardIcon(card.slotNumber ?? 1, card.icon)}
                    <span className="truncate">
                      {card.slotNumber ?? 1}.{' '}
                      <InlineEditableText
                        value={card.categoryName}
                        onSave={(newName) =>
                          updateCardById(card.id, (c) => ({
                            ...c,
                            categoryName: newName,
                          }))
                        }
                      />{' '}
                      • {card.behavior === 'STICKY' ? 'Sticky' : 'Fluid'}
                      {isTriple ? ` (${activeSubTrackId.slice(0, 2)})` : ''}
                    </span>
                  </span>

                  <div className="flex items-center gap-1 shrink-0">
                    {isValidResourceLaunchUrl(displayLaunchUrl) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openResourceLaunchUrl(displayLaunchUrl);
                        }}
                        title={`Open linked resource (${displayLaunchUrl})`}
                        className="px-2 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/35 text-amber-200 font-mono text-[10px] inline-flex items-center gap-1 cursor-pointer"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>Open</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => toggleEditCard(card.id, e)}
                      className={`px-2 py-0.5 rounded-full border font-mono text-[10px] inline-flex items-center gap-1 transition shrink-0 ${
                        isEditingCard
                          ? 'bg-amber-400 text-stone-950 border-amber-300 font-semibold'
                          : 'bg-black/40 hover:bg-white/[0.08] border-white/[0.08] text-amber-200/80 hover:text-amber-100'
                      }`}
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>{isEditingCard ? 'Done' : 'Edit Card'}</span>
                    </button>
                  </div>
                </div>

                {/* Active Item Title (Inline Editable) */}
                <h3 className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-amber-50">
                  <InlineEditableText
                    value={displayActiveTitle}
                    onSave={(newTitle) =>
                      updateCardById(card.id, (c) => {
                        if (c.trackMode === 'TRIPLE' && Array.isArray(c.subTracks)) {
                          return {
                            ...c,
                            subTracks: c.subTracks.map((sub) =>
                              sub.id === activeSubTrackId
                                ? { ...sub, activeTitle: newTitle }
                                : sub
                            ),
                          };
                        }
                        return { ...c, activeTitle: newTitle };
                      })
                    }
                  />
                </h3>

                {/* Inline "Edit Card" Full Configuration Panel right on the card face */}
                {isEditingCard && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="p-3.5 rounded-2xl bg-black/75 border border-amber-400/40 space-y-3 text-xs"
                  >
                    <div className="flex items-center justify-between border-b border-white/[0.08] pb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-amber-300 font-semibold">
                        Inline Card Customization
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          updateCardById(card.id, (c) => ({ ...c, hidden: true }))
                        }
                        className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:bg-rose-500/25 text-[10px] font-mono inline-flex items-center gap-1"
                      >
                        <EyeOff className="w-3 h-3" />
                        Hide Card
                      </button>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-amber-200/70 mb-0.5">
                        Category Name (e.g., Culture &amp; Language, Music, Maker)
                      </label>
                      <input
                        type="text"
                        value={card.categoryName}
                        onChange={(e) =>
                          updateCardById(card.id, (c) => ({
                            ...c,
                            categoryName: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-full px-2.5 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-amber-50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-mono uppercase text-amber-200/70 mb-0.5">
                          Pacing Behavior
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          {(['FLUID', 'STICKY'] as const).map((beh) => (
                            <button
                              key={beh}
                              type="button"
                              onClick={() =>
                                updateCardById(card.id, (c) => ({
                                  ...c,
                                  behavior: beh,
                                }))
                              }
                              className={`py-1 rounded font-mono text-[10px] border ${
                                card.behavior === beh
                                  ? 'bg-amber-400/25 border-amber-400 text-amber-100 font-semibold'
                                  : 'bg-stone-950 border-stone-800 text-stone-400'
                              }`}
                            >
                              {beh === 'STICKY' ? 'Sticky [X/3]' : 'Fluid'}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-mono uppercase text-amber-200/70 mb-0.5">
                          Track Layout
                        </label>
                        <div className="grid grid-cols-2 gap-1">
                          {(['SINGLE', 'TRIPLE'] as const).map((tm) => (
                            <button
                              key={tm}
                              type="button"
                              onClick={() =>
                                updateCardById(card.id, (c) => ({
                                  ...c,
                                  trackMode: tm,
                                  subTracks:
                                    tm === 'TRIPLE' && (!c.subTracks || c.subTracks.length === 0)
                                      ? [
                                          {
                                            id: '3A_FICTION',
                                            label: '3A Track A',
                                            activeTitle: c.activeTitle,
                                            startupPrompt: c.startupPrompt,
                                            backlogQueue: [...(c.backlogQueue || [])],
                                            fiveMinStarts: 0,
                                            unlockedViaCheckIn: false,
                                            speedControl: true,
                                          },
                                          {
                                            id: '3B_NONFICTION',
                                            label: '3B Track B',
                                            activeTitle: 'Sub-Track B Item',
                                            startupPrompt: c.startupPrompt,
                                            backlogQueue: [],
                                            fiveMinStarts: 0,
                                            unlockedViaCheckIn: false,
                                          },
                                          {
                                            id: '3C_VIDEO',
                                            label: '3C Track C',
                                            activeTitle: 'Sub-Track C Item',
                                            startupPrompt: c.startupPrompt,
                                            backlogQueue: [],
                                            fiveMinStarts: 0,
                                            unlockedViaCheckIn: false,
                                          },
                                        ]
                                      : c.subTracks,
                                }))
                              }
                              className={`py-1 rounded font-mono text-[10px] border ${
                                card.trackMode === tm
                                  ? 'bg-amber-400/25 border-amber-400 text-amber-100 font-semibold'
                                  : 'bg-stone-950 border-stone-800 text-stone-400'
                              }`}
                            >
                              {tm === 'TRIPLE' ? 'Triple (A/B/C)' : 'Single-Track'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-amber-200/70 mb-0.5">
                        Active Item Title {isTriple ? `(${activeSubTrack?.label || activeSubTrackId})` : ''}
                      </label>
                      <input
                        type="text"
                        value={displayActiveTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateCardById(card.id, (c) => {
                            if (c.trackMode === 'TRIPLE' && Array.isArray(c.subTracks)) {
                              return {
                                ...c,
                                subTracks: c.subTracks.map((sub) =>
                                  sub.id === activeSubTrackId
                                    ? { ...sub, activeTitle: val }
                                    : sub
                                ),
                              };
                            }
                            return { ...c, activeTitle: val };
                          });
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-full px-2.5 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-amber-50"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-mono uppercase text-amber-200/70 mb-0.5">
                        5m Startup Prompt
                      </label>
                      <input
                        type="text"
                        value={displayStartupPrompt}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateCardById(card.id, (c) => {
                            if (c.trackMode === 'TRIPLE' && Array.isArray(c.subTracks)) {
                              return {
                                ...c,
                                subTracks: c.subTracks.map((sub) =>
                                  sub.id === activeSubTrackId
                                    ? { ...sub, startupPrompt: val }
                                    : sub
                                ),
                              };
                            }
                            return { ...c, startupPrompt: val };
                          });
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        className="w-full px-2.5 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-amber-100"
                      />
                    </div>

                    {/* Optional Resource Launch URL + Auto-Open Toggle */}
                    <div className="space-y-1.5 pt-1 border-t border-white/[0.08]">
                      <label className="block text-[10px] font-mono uppercase text-amber-200/70">
                        Optional Resource URL / Deep Link
                      </label>
                      <input
                        type="text"
                        value={displayLaunchUrl}
                        onChange={(e) => {
                          const val = e.target.value;
                          updateCardById(card.id, (c) => {
                            if (c.trackMode === 'TRIPLE' && Array.isArray(c.subTracks)) {
                              return {
                                ...c,
                                subTracks: c.subTracks.map((sub) =>
                                  sub.id === activeSubTrackId
                                    ? { ...sub, launchUrl: val }
                                    : sub
                                ),
                              };
                            }
                            return { ...c, launchUrl: val };
                          });
                        }}
                        onKeyDown={(e) => e.stopPropagation()}
                        placeholder="https://... or app deep link"
                        className="w-full px-2.5 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-amber-100"
                      />
                      <label className="inline-flex items-center gap-1.5 text-[10px] font-mono text-amber-200/80 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={displayAutoLaunchUrl}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            updateCardById(card.id, (c) => {
                              if (c.trackMode === 'TRIPLE' && Array.isArray(c.subTracks)) {
                                return {
                                  ...c,
                                  subTracks: c.subTracks.map((sub) =>
                                    sub.id === activeSubTrackId
                                      ? { ...sub, autoLaunchUrl: checked }
                                      : sub
                                  ),
                                };
                              }
                              return { ...c, autoLaunchUrl: checked };
                            });
                          }}
                          className="accent-amber-400"
                        />
                        <span>Auto-open URL when clicking Begin 5m</span>
                      </label>
                    </div>

                    {/* Backlog Queue Editor */}
                    <div className="space-y-1.5 pt-1 border-t border-white/[0.08]">
                      <label className="block text-[10px] font-mono uppercase text-amber-200/70">
                        Backlog Queue ({displayBacklog.length} items)
                      </label>
                      <div className="space-y-1 max-h-28 overflow-y-auto">
                        {displayBacklog.map((item, bIdx) => (
                          <div
                            key={`${item}_${bIdx}`}
                            className="flex items-center justify-between gap-1.5 bg-stone-950/90 px-2 py-1 rounded border border-stone-800"
                          >
                            <InlineEditableText
                              value={item}
                              onSave={(editedItem) => {
                                const nextQ = displayBacklog.map((q, idx) =>
                                  idx === bIdx ? editedItem : q
                                );
                                updateCardById(card.id, (c) => {
                                  if (
                                    c.trackMode === 'TRIPLE' &&
                                    Array.isArray(c.subTracks)
                                  ) {
                                    return {
                                      ...c,
                                      subTracks: c.subTracks.map((sub) =>
                                        sub.id === activeSubTrackId
                                          ? { ...sub, backlogQueue: nextQ }
                                          : sub
                                      ),
                                    };
                                  }
                                  return { ...c, backlogQueue: nextQ };
                                });
                              }}
                              textClassName="text-[11px] text-amber-100"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const nextQ = displayBacklog.filter(
                                  (_, idx) => idx !== bIdx
                                );
                                updateCardById(card.id, (c) => {
                                  if (
                                    c.trackMode === 'TRIPLE' &&
                                    Array.isArray(c.subTracks)
                                  ) {
                                    return {
                                      ...c,
                                      subTracks: c.subTracks.map((sub) =>
                                        sub.id === activeSubTrackId
                                          ? { ...sub, backlogQueue: nextQ }
                                          : sub
                                      ),
                                    };
                                  }
                                  return { ...c, backlogQueue: nextQ };
                                });
                              }}
                              className="text-stone-500 hover:text-rose-400 p-0.5"
                              title="Remove from backlog"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={newBacklogInputs[card.id] || ''}
                          onChange={(e) =>
                            setNewBacklogInputs((prev) => ({
                              ...prev,
                              [card.id]: e.target.value,
                            }))
                          }
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              const val = (newBacklogInputs[card.id] || '').trim();
                              if (!val) return;
                              const nextQ = [...displayBacklog, val];
                              updateCardById(card.id, (c) => {
                                if (
                                  c.trackMode === 'TRIPLE' &&
                                  Array.isArray(c.subTracks)
                                ) {
                                  return {
                                    ...c,
                                    subTracks: c.subTracks.map((sub) =>
                                      sub.id === activeSubTrackId
                                        ? { ...sub, backlogQueue: nextQ }
                                        : sub
                                    ),
                                  };
                                }
                                return { ...c, backlogQueue: nextQ };
                              });
                              setNewBacklogInputs((prev) => ({
                                ...prev,
                                [card.id]: '',
                              }));
                            }
                          }}
                          placeholder="Add item to backlog queue..."
                          className="flex-1 px-2 py-1 rounded bg-stone-950 border border-stone-700 text-xs text-amber-50"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const val = (newBacklogInputs[card.id] || '').trim();
                            if (!val) return;
                            const nextQ = [...displayBacklog, val];
                            updateCardById(card.id, (c) => {
                              if (
                                c.trackMode === 'TRIPLE' &&
                                Array.isArray(c.subTracks)
                              ) {
                                return {
                                  ...c,
                                  subTracks: c.subTracks.map((sub) =>
                                    sub.id === activeSubTrackId
                                      ? { ...sub, backlogQueue: nextQ }
                                      : sub
                                  ),
                                };
                              }
                              return { ...c, backlogQueue: nextQ };
                            });
                            setNewBacklogInputs((prev) => ({
                              ...prev,
                              [card.id]: '',
                            }));
                          }}
                          className="px-2 py-1 rounded bg-amber-400 text-stone-950 font-mono text-[10px] font-semibold"
                        >
                          + Add
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {isCardDisclosed(card.id) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden pt-1.5 space-y-2.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Triple-Track Switcher when card is in TRIPLE mode */}
                      {isTriple && card.subTracks && (
                        <div
                          role="tablist"
                          aria-label="Triple-Track Media Switcher"
                          className="p-1 rounded-full bg-black/45 border border-white/[0.05] grid grid-cols-3 gap-1"
                        >
                          {card.subTracks.map((tab) => {
                            const active = activeSubTrackId === tab.id;
                            return (
                              <button
                                key={tab.id}
                                id={
                                  card.id === 'CAT3_MEDIA'
                                    ? `media-subtab-${tab.id}`
                                    : `subtab-${card.id}-${tab.id}`
                                }
                                type="button"
                                role="tab"
                                aria-selected={active}
                                onClick={() => {
                                  if (
                                    card.id === 'CAT3_MEDIA' &&
                                    (tab.id === '3A_FICTION' ||
                                      tab.id === '3B_NONFICTION' ||
                                      tab.id === '3C_VIDEO')
                                  ) {
                                    onSelectMediaSubTab(tab.id);
                                  } else {
                                    updateCardById(card.id, (c) => ({
                                      ...c,
                                      activeSubTrackId: tab.id,
                                    }));
                                  }
                                }}
                                className={`py-1 px-2 rounded-full font-mono text-[10px] text-center transition cursor-pointer ${
                                  active
                                    ? 'bg-amber-400 text-stone-950 font-medium'
                                    : 'text-amber-100/75 hover:text-amber-50'
                                }`}
                              >
                                {tab.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {card.behavior === 'STICKY' && (
                        <div className="flex items-center justify-between gap-2">
                          <StickyDotsCounter
                            starts={displayStarts}
                            unlockedViaCheckIn={displayUnlocked}
                          />

                          {isTriple && activeSubTrackId === '3A_FICTION' && (
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
                      )}

                      <div className="text-xs text-amber-100/75 leading-relaxed">
                        5m Startup: “
                        <InlineEditableText
                          value={displayStartupPrompt}
                          onSave={(newPrompt) =>
                            updateCardById(card.id, (c) => {
                              if (
                                c.trackMode === 'TRIPLE' &&
                                Array.isArray(c.subTracks)
                              ) {
                                return {
                                  ...c,
                                  subTracks: c.subTracks.map((sub) =>
                                    sub.id === activeSubTrackId
                                      ? { ...sub, startupPrompt: newPrompt }
                                      : sub
                                  ),
                                };
                              }
                              return { ...c, startupPrompt: newPrompt };
                            })
                          }
                        />
                        ”
                      </div>

                      {card.behavior === 'STICKY' && (
                        <>
                          <div className="text-[11px] font-mono text-stone-400 truncate">
                            Next: {displayBacklog[0] || 'None'}
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <button
                              id={
                                legacyStickyKey
                                  ? `btn-log-start-${legacyStickyKey}`
                                  : `btn-log-start-${card.id}`
                              }
                              type="button"
                              onClick={() => {
                                if (legacyStickyKey && onIncrementStickyStart) {
                                  onIncrementStickyStart(legacyStickyKey);
                                } else {
                                  updateCardById(card.id, (c) => ({
                                    ...c,
                                    fiveMinStarts: Math.min(3, (c.fiveMinStarts || 0) + 1),
                                  }));
                                }
                              }}
                              className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.05] text-amber-200 font-mono text-[11px] cursor-pointer"
                            >
                              +1 Start
                            </button>

                            <button
                              id={
                                legacyStickyKey
                                  ? `btn-swap-sticky-${legacyStickyKey}`
                                  : `btn-swap-sticky-${card.id}`
                              }
                              type="button"
                              disabled={displayStarts < 3 && !displayUnlocked}
                              onClick={() => {
                                if (legacyStickyKey) {
                                  onSwapStickyItemFromBacklog(legacyStickyKey);
                                } else if (displayBacklog.length > 0) {
                                  const [nextTitle, ...rest] = displayBacklog;
                                  updateCardById(card.id, (c) => ({
                                    ...c,
                                    activeTitle: nextTitle,
                                    backlogQueue: [...rest, c.activeTitle],
                                    fiveMinStarts: 0,
                                  }));
                                }
                              }}
                              className="px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.11] disabled:opacity-35 border border-white/[0.06] text-amber-100 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Swap</span>
                            </button>
                          </div>
                        </>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (displayAutoLaunchUrl && isValidResourceLaunchUrl(displayLaunchUrl)) {
                    openResourceLaunchUrl(displayLaunchUrl);
                  }
                  onSelectCategory(card.legacyCategoryKey || 'CAT1_MUSIC');
                  onStartCategory5mStep();
                }}
                className="w-full py-2 px-4 rounded-full bg-amber-400/90 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Begin 5m</span>
              </button>
            </article>
          );
        })}
      </div>

      {/* Hidden Categories Restore Strip */}
      {hiddenCategoryCards.length > 0 && (
        <div className="p-4 rounded-2xl bg-black/45 border border-white/[0.06] flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-mono text-amber-200/75">
            Hidden Recharge Categories ({hiddenCategoryCards.length}):
          </span>
          <div className="flex flex-wrap gap-2">
            {hiddenCategoryCards.map((hc) => (
              <button
                key={hc.id}
                type="button"
                onClick={() =>
                  updateCardById(hc.id, (c) => ({ ...c, hidden: false }))
                }
                className="px-2.5 py-1 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] font-mono text-[11px] text-amber-100 flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3 h-3 text-amber-300" />
                <span>Restore {hc.categoryName}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          FLOW EXTENSION GATE & COUNT-UP CONSOLE (RULE 7)
         ===================================================================== */}
      <section
        id="flow-extension-card"
        aria-labelledby="flow-extension-heading"
        className="w-full rounded-3xl bento-surface-evening px-6 py-4 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <h3
                id="flow-extension-heading"
                className="font-serif text-xl sm:text-2xl font-medium text-amber-50"
              >
                Flow Extension
              </h3>
              <p className="text-xs font-mono text-amber-200/70">
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
              className="px-4 py-2 rounded-full bg-amber-400/90 hover:bg-amber-300 disabled:opacity-35 text-stone-950 font-mono font-medium text-xs cursor-pointer"
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
              className="p-2 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.05] text-amber-200/75 cursor-pointer"
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
            className="p-4 rounded-2xl bg-black/80 border border-amber-400/50 space-y-3"
          >
            <p className="text-sm font-mono text-amber-100">
              “Confirm this is genuine creative flow and not deadline stress”
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                id="btn-confirm-flow-extension"
                type="button"
                onClick={onConfirmFlowExtension}
                className="px-4 py-2 rounded-full bg-amber-400 hover:bg-amber-300 text-stone-950 font-mono font-medium text-xs cursor-pointer"
              >
                Confirm Creative Flow &amp; Start Count-Up
              </button>
              <button
                id="btn-cancel-flow-extension"
                type="button"
                onClick={onCancelFlowExtensionPrompt}
                className="px-4 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] text-amber-100 font-mono text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Active Flow Extension Open Count-Up Console */}
        {recharge.flowExtensionActive && (
          <div className="p-4 rounded-2xl bg-black/50 border border-amber-400/35 flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-0.5">
              <span className="text-[10px] font-mono uppercase text-amber-300">
                Open Count-Up • 20m Chimes + 60m Micro-Break
              </span>
              <div className="font-mono text-2xl font-light tabular-nums text-amber-100">
                +{formatMMSS(recharge.flowExtensionElapsedSeconds)} •{' '}
                {recharge.flowExtensionBlocksLoggedToday} ext blocks
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleFlowExtensionTimer}
                className="px-3.5 py-2 rounded-full bg-amber-400 text-stone-950 font-mono font-medium text-xs cursor-pointer"
              >
                {recharge.flowExtensionRunning ? 'Pause' : 'Resume'}
              </button>
              <button
                id="btn-log-flow-extension-20m"
                type="button"
                onClick={onLogFlowExtensionBlock20m}
                className="px-3.5 py-2 rounded-full bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.08] text-amber-100 font-mono text-xs cursor-pointer"
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
              className="pt-3 border-t border-white/[0.05] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono overflow-hidden"
            >
              <div className="p-3 rounded-2xl bg-black/35 border border-white/[0.05] flex items-center justify-between">
                <span>1. Tomorrow Early Event: {tomorrowHasZeroEarlyEvents ? 'None' : 'Active'}</span>
                <button
                  type="button"
                  onClick={onToggleTomorrowEarlyAnchor}
                  className="px-2 py-0.5 rounded bg-white/[0.06] text-[10px] cursor-pointer"
                >
                  Toggle
                </button>
              </div>

              <div className="p-3 rounded-2xl bg-black/35 border border-white/[0.05] flex items-center justify-between">
                <span>2. Task: {state.timer.activeTaskType}</span>
                <span className={activeTaskNotFlashcards ? 'text-emerald-300' : 'text-red-300'}>
                  {activeTaskNotFlashcards ? 'PASS' : 'LOCKED'}
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-black/35 border border-white/[0.05] flex items-center justify-between">
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
