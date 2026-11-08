import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  Command,
  FastForward,
  Layers,
  ListChecks,
  Loader2,
  Maximize2,
  Moon,
  Pause,
  PictureInPicture2,
  Play,
  RotateCcw,
  Sparkles,
  Terminal,
  Timer,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {
  LoadMode,
  SmartIntakePlanResult,
  SymmetryState,
  TabId,
} from '../types/symmetry';
import { computeShiftMetrics } from '../state/defaultState';
import { isArchitectPassphrase } from '../state/profilePresets';
import { generateSmartIntakePlan } from '../utils/smartIntakePlanner';
import { triggerHaptic } from '../utils/haptics';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: SymmetryState;
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  onToggleTimerRun: () => void;
  onResetCurrentStage: () => void;
  onFastForwardCurrentStage: () => void;
  cinemaFocusMode: boolean;
  onToggleCinemaFocusMode: () => void;
  onOpenMiniHudPip?: () => void;
  isMiniHudOpen?: boolean;
  onSelectLoadMode: (mode: LoadMode, targetBlocks: number) => void;
  onTriggerStressReset: () => void;
  smartIntakeText: string;
  onChangeSmartIntakeText: (val: string) => void;
  smartIntakePreview: SmartIntakePlanResult | null;
  onSetSmartIntakePreview: (plan: SmartIntakePlanResult | null) => void;
  onApplySmartIntakePlan: (plan: SmartIntakePlanResult) => void;
  onOpenGeminiBridgeModal?: () => void;
  architectModeUnlocked?: boolean;
  onUnlockArchitectMode?: (source: string) => void;
  onLockArchitectMode?: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  state,
  onSelectTab,
  onToggleTimerRun,
  onResetCurrentStage,
  onFastForwardCurrentStage,
  cinemaFocusMode,
  onToggleCinemaFocusMode,
  onOpenMiniHudPip,
  isMiniHudOpen = false,
  onSelectLoadMode,
  onTriggerStressReset,
  smartIntakeText,
  onChangeSmartIntakeText,
  smartIntakePreview,
  onSetSmartIntakePreview,
  onApplySmartIntakePlan,
  onOpenGeminiBridgeModal,
  onUnlockArchitectMode,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const metrics = computeShiftMetrics(state);

  useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 40);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  const handleInputChange = (val: string) => {
    if (isArchitectPassphrase(val) && onUnlockArchitectMode) {
      onChangeSmartIntakeText('');
      onSetSmartIntakePreview(null);
      onUnlockArchitectMode(`Command Palette (${val.trim().toLowerCase()})`);
      onClose();
      return;
    }
    onChangeSmartIntakeText(val);
  };

  const handleParseIntake = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = smartIntakeText.trim();
    if (!trimmed || isParsing) return;
    if (isArchitectPassphrase(trimmed) && onUnlockArchitectMode) {
      onChangeSmartIntakeText('');
      onSetSmartIntakePreview(null);
      onUnlockArchitectMode(`Command Palette (${trimmed.toLowerCase()})`);
      onClose();
      return;
    }
    triggerHaptic([12]);
    setIsParsing(true);
    try {
      const plan = await generateSmartIntakePlan(trimmed, state);
      onSetSmartIntakePreview(plan);
    } finally {
      setIsParsing(false);
    }
  };

  const quickActions = [
    ...(onOpenGeminiBridgeModal
      ? [
          {
            id: 'cmd-open-gemini-bridge',
            label: 'Sync with Gemini & Bidirectional Hub',
            subtitle:
              'Compile 3-Part state.md + JSON (Modes A–D) or paste response from Gemini',
            shortcut: '⌘G',
            icon: Sparkles,
            accent: 'text-sky-300',
            action: () => {
              triggerHaptic([12]);
              onClose();
              onOpenGeminiBridgeModal();
            },
          },
        ]
      : []),
    {
      id: 'cmd-toggle-timer',
      label: state.timer.isRunning
        ? 'Pause Active Chronograph Timer'
        : 'Start Active 5m Startup / 15m Momentum Timer',
      subtitle: `${state.timer.activeTaskTitle} (${metrics.durationPrefix})`,
      shortcut: 'Space',
      icon: state.timer.isRunning ? Pause : Play,
      accent: 'text-sky-300',
      action: () => {
        triggerHaptic([15]);
        onToggleTimerRun();
        onClose();
      },
    },
    ...(onOpenMiniHudPip
      ? [
          {
            id: 'cmd-pop-out-mini-hud',
            label: isMiniHudOpen
              ? 'Close External OS Mini HUD'
              : 'Pop Out Mini HUD (OS Always-on-Top Window)',
            subtitle:
              'Float 300×135 Document PiP React Portal or 480×220 Canvas Stream Video PiP over desktop apps',
            shortcut: 'P',
            icon: PictureInPicture2,
            accent: 'text-cyan-300',
            action: () => {
              triggerHaptic([15]);
              onOpenMiniHudPip();
              onClose();
            },
          },
        ]
      : []),
    {
      id: 'cmd-reset-stage',
      label: 'Reset Current Timer Stage',
      subtitle:
        state.timer.workStage === 'IGNITION_5M'
          ? 'Reset 5m Startup Step to 05:00'
          : 'Reset current countdown stage',
      shortcut: 'R',
      icon: RotateCcw,
      accent: 'text-slate-300',
      action: () => {
        triggerHaptic([10]);
        onResetCurrentStage();
        onClose();
      },
    },
    {
      id: 'cmd-skip-stage',
      label: 'Skip / Rollover Timer Stage',
      subtitle: 'Roll 5m Startup → 15m Momentum → Auto-Break Router',
      shortcut: 'S',
      icon: FastForward,
      accent: 'text-cyan-300',
      action: () => {
        triggerHaptic([15]);
        onFastForwardCurrentStage();
        onClose();
      },
    },
    {
      id: 'cmd-cinema-focus',
      label: cinemaFocusMode
        ? 'Exit Cinema Focus Mode'
        : 'Engage Cinema Focus Mode',
      subtitle:
        'Dim surrounding Bento cards so only the Chronograph, 5m Startup Script, and remaining work pill stay sharp',
      shortcut: 'F',
      icon: Maximize2,
      accent: 'text-indigo-300',
      action: () => {
        triggerHaptic([12]);
        onToggleCinemaFocusMode();
        onClose();
      },
    },
    {
      id: 'cmd-stress-reset',
      label: '4-7-8 Stress / Fatigue Reset (15m)',
      subtitle:
        'Suspend heavy reading/writing, run 4-7-8 visual pacer, then queue 5m Flashcards',
      shortcut: '4-7-8',
      icon: Wind,
      accent: 'text-amber-300',
      action: () => {
        triggerHaptic([20, 40, 20]);
        onTriggerStressReset();
        onClose();
      },
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="raycast-command-dock-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/65 backdrop-blur-md flex items-start justify-center pt-16 sm:pt-24 px-4 overflow-y-auto"
        >
          <motion.div
            id="raycast-command-dock-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Raycast Command Dock and Smart Intake Palette"
            initial={{ opacity: 0, scale: 0.96, y: -12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl rounded-3xl backdrop-blur-3xl bg-slate-950/85 border border-white/15 shadow-[0_25px_70px_-15px_rgba(0,0,0,0.85)] overflow-hidden"
            style={{
              boxShadow:
                'inset 0 1px 0 0 rgba(255, 255, 255, 0.12), 0 25px 70px -15px rgba(0, 0, 0, 0.85)',
            }}
          >
            {/* Top Search / Brain-Dump Input Strip */}
            <form
              onSubmit={handleParseIntake}
              className="flex items-center gap-3 px-4 py-3.5 border-b border-white/10 bg-white/[0.02]"
            >
              <Command className="w-4 h-4 text-sky-400 shrink-0" />
              <input
                ref={inputRef}
                id="command-palette-intake-input"
                type="text"
                value={smartIntakeText}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="Type a command or brain-dump week plan (+paper Draft 8b, +lab Tue 2h)..."
                className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 font-mono focus:outline-none"
              />
              {smartIntakeText.trim() && (
                <button
                  type="submit"
                  disabled={isParsing}
                  className="px-3 py-1 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                >
                  {isParsing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Parsing</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>Parse Intake</span>
                    </>
                  )}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-2 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 font-mono text-[10px] text-slate-300 cursor-pointer"
              >
                Esc
              </button>
            </form>

            {/* Inline Smart Intake Diff Preview when parsed */}
            {smartIntakePreview && (
              <div className="p-4 border-b border-white/10 bg-sky-950/25 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider font-bold text-sky-300">
                    Smart Intake Diff Preview • Mode → {smartIntakePreview.todayLoadMode}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic([20]);
                        onApplySmartIntakePlan(smartIntakePreview);
                        onClose();
                      }}
                      className="px-3 py-1 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Apply Plan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetSmartIntakePreview(null)}
                      className="px-2.5 py-1 rounded-xl bg-white/[0.06] border border-white/10 text-slate-300 font-mono text-xs cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div className="text-xs font-mono text-slate-200 flex flex-wrap gap-2">
                  {smartIntakePreview.closedListUpdates.map((u, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-lg bg-black/50 border border-white/10"
                    >
                      #{idx + 1} {u.title} ({u.blocksTotal}b)
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Chronograph & Focus Commands */}
            <div className="p-3 space-y-3 max-h-[65vh] overflow-y-auto">
              <div>
                <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold flex items-center justify-between">
                  <span>Precision Chronograph &amp; Focus Controls</span>
                  <span className="tabular-nums text-sky-300">{metrics.durationPrefix}</span>
                </div>
                <div className="space-y-1">
                  {quickActions.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        id={item.id}
                        type="button"
                        onClick={item.action}
                        className="w-full px-3 py-2.5 rounded-2xl hover:bg-white/[0.06] border border-transparent hover:border-white/10 flex items-center justify-between gap-3 text-left transition cursor-pointer group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-white/[0.04] border border-white/10 flex items-center justify-center shrink-0">
                            <Icon className={`w-4 h-4 ${item.accent}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-white truncate">
                              {item.label}
                            </div>
                            <div className="text-[11px] font-mono text-slate-400 truncate">
                              {item.subtitle}
                            </div>
                          </div>
                        </div>
                        <kbd className="px-2 py-1 rounded-lg bg-white/[0.06] border border-white/15 font-mono text-[11px] font-bold text-slate-200 shrink-0">
                          {item.shortcut}
                        </kbd>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Navigation & Load Mode Quick Switchers */}
              <div className="pt-2 border-t border-white/[0.07] grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                    Switch View
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'PIPELINE' as TabId, label: '1. Pipeline', icon: ListChecks },
                        { id: 'TIMER' as TabId, label: '2. Timer', icon: Timer },
                        { id: 'RECHARGE' as TabId, label: '3. Recharge', icon: Moon },
                        { id: 'ROADMAP' as TabId, label: '4. Roadmap', icon: Layers },
                      ] as const
                    ).map((t) => {
                      const Icon = t.icon;
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => {
                            onSelectTab(t.id);
                            onClose();
                          }}
                          className="px-2.5 py-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-mono text-slate-200 flex items-center gap-1.5 cursor-pointer"
                        >
                          <Icon className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                          <span className="truncate">{t.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-widest text-slate-400 font-bold">
                    Load Mode Governor
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { mode: 'CRUISE' as LoadMode, label: 'Cruise (12)', blocks: 12 },
                        { mode: 'SURGE' as LoadMode, label: 'Surge (14)', blocks: 14 },
                        { mode: 'TAPER' as LoadMode, label: 'Taper (8)', blocks: 8 },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.mode}
                        type="button"
                        disabled={
                          m.mode === 'SURGE' &&
                          state.surgeConsecutiveDays >= 2 &&
                          state.loadMode !== 'SURGE'
                        }
                        onClick={() => {
                          onSelectLoadMode(m.mode, m.blocks);
                          onClose();
                        }}
                        className={`px-2 py-2 rounded-xl border text-[11px] font-mono font-bold cursor-pointer disabled:opacity-40 ${
                          state.loadMode === m.mode
                            ? 'bg-sky-500/20 border-sky-400 text-sky-100'
                            : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/[0.08] text-slate-300'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Footer Bar with Keyboard Badge Hints */}
            <div className="px-4 py-2.5 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-400">
              <div className="flex flex-wrap items-center gap-2">
                {(
                  [
                    { key: 'Space', desc: 'Start/Pause' },
                    { key: 'R', desc: 'Reset' },
                    { key: 'S', desc: 'Skip' },
                    { key: 'F', desc: 'Cinema Focus' },
                    { key: 'Esc', desc: 'Dismiss' },
                  ] as const
                ).map((hint) => (
                  <span key={hint.key} className="inline-flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/15 text-slate-200 font-bold">
                      {hint.key}
                    </kbd>
                    <span>{hint.desc}</span>
                  </span>
                ))}
              </div>
              <span className="flex items-center gap-1 text-sky-300">
                <Zap className="w-3 h-3" />
                <span>Symmetry Command Dock</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
