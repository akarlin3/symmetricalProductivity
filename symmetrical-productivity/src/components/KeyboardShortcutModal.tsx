import React, { useMemo, useState } from 'react';
import {
  Bot,
  Coffee,
  Command,
  Compass,
  HeartPulse,
  Keyboard,
  Maximize2,
  Play,
  Search,
  Sparkles,
  Undo2,
  X,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { soundEngine } from '../utils/soundEngine';

export interface ShortcutActionHandlers {
  onToggleStartPause: () => void;
  onToggleCinemaFocus: () => void;
  onTriggerBreak: () => void;
  onTriggerStressReset: () => void;
  onFocusSmartIntake: () => void;
  onToggleAiAssistant: () => void;
  onTriggerUndo: () => void;
  onLaunchSpotlightTour: () => void;
}

interface KeyboardShortcutModalProps {
  isOpen: boolean;
  onClose: () => void;
  isEvening: boolean;
  handlers: ShortcutActionHandlers;
}

interface ShortcutSpec {
  id: string;
  title: string;
  description: string;
  category: 'TIMER & PACING' | 'NAVIGATION & AI' | 'RESILIENCE & SYSTEM';
  keys: string[];
  icon: React.ReactNode;
  onExecute: () => void;
}

export const KeyboardShortcutModal: React.FC<KeyboardShortcutModalProps> = ({
  isOpen,
  onClose,
  isEvening,
  handlers,
}) => {
  const [query, setQuery] = useState('');

  const shortcuts: ShortcutSpec[] = useMemo(
    () => [
      {
        id: 'shortcut-space',
        title: 'Start / Pause Active Timer',
        description:
          'Starts or pauses the 5m Startup / 15m Momentum dial and fades Focus Soundscape.',
        category: 'TIMER & PACING',
        keys: ['Space'],
        icon: <Play className="w-4 h-4 text-emerald-400" />,
        onExecute: () => {
          onClose();
          handlers.onToggleStartPause();
        },
      },
      {
        id: 'shortcut-f',
        title: 'Cinema Focus Mode',
        description:
          'Expands the 20m SVG Ring Dial into a distraction-free full-screen theater HUD.',
        category: 'TIMER & PACING',
        keys: ['F'],
        icon: <Maximize2 className="w-4 h-4 text-cyan-400" />,
        onExecute: () => {
          onClose();
          handlers.onToggleCinemaFocus();
        },
      },
      {
        id: 'shortcut-r',
        title: 'Start Break Buffer (L1 / L2)',
        description:
          'Switches the timer to a physical Break Buffer and smoothly fades out ambient noise.',
        category: 'TIMER & PACING',
        keys: ['R'],
        icon: <Coffee className="w-4 h-4 text-amber-400" />,
        onExecute: () => {
          onClose();
          handlers.onTriggerBreak();
        },
      },
      {
        id: 'shortcut-s',
        title: 'Stress / Fatigue Reset (4-7-8)',
        description:
          'Suspends heavy reading/writing and starts a 15m 4-7-8 Breathing Reset + 5m Flashcards.',
        category: 'RESILIENCE & SYSTEM',
        keys: ['S'],
        icon: <HeartPulse className="w-4 h-4 text-rose-400" />,
        onExecute: () => {
          onClose();
          handlers.onTriggerStressReset();
        },
      },
      {
        id: 'shortcut-cmd-k',
        title: 'Command Bar & Shortcut Launcher',
        description:
          'Opens this Raycast/Linear command palette and hotkey reference from anywhere.',
        category: 'NAVIGATION & AI',
        keys: ['Cmd', 'K'],
        icon: <Command className="w-4 h-4 text-indigo-400" />,
        onExecute: () => {
          onClose();
        },
      },
      {
        id: 'shortcut-cmd-j',
        title: 'Smart Intake & Week Planner',
        description:
          'Focuses the natural-language Smart Intake bar to parse tasks, exams, and outings.',
        category: 'NAVIGATION & AI',
        keys: ['Cmd', 'J'],
        icon: <Sparkles className="w-4 h-4 text-cyan-300" />,
        onExecute: () => {
          onClose();
          handlers.onFocusSmartIntake();
        },
      },
      {
        id: 'shortcut-cmd-slash',
        title: 'AI Planning Assistant Drawer',
        description:
          'Toggles the state-aware Partner AI side-panel for live schedule recalibration.',
        category: 'NAVIGATION & AI',
        keys: ['Cmd', '/'],
        icon: <Bot className="w-4 h-4 text-sky-400" />,
        onExecute: () => {
          onClose();
          handlers.onToggleAiAssistant();
        },
      },
      {
        id: 'shortcut-cmd-z',
        title: 'Undo Last State Mutation',
        description:
          'Reverts the most recent block completion, mode switch, or state edit from the undo stack.',
        category: 'RESILIENCE & SYSTEM',
        keys: ['Cmd', 'Z'],
        icon: <Undo2 className="w-4 h-4 text-amber-300" />,
        onExecute: () => {
          onClose();
          handlers.onTriggerUndo();
        },
      },
      {
        id: 'shortcut-question',
        title: 'Keyboard Shortcut Cheat-Sheet',
        description:
          'Opens this translucent hotkey cheat-sheet and 4-Step Spotlight Tour launcher.',
        category: 'RESILIENCE & SYSTEM',
        keys: ['?'],
        icon: <Keyboard className="w-4 h-4 text-slate-300" />,
        onExecute: () => {
          onClose();
        },
      },
    ],
    [handlers, onClose]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return shortcuts;
    return shortcuts.filter(
      (s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.keys.join(' ').toLowerCase().includes(q)
    );
  }, [query, shortcuts]);

  if (!isOpen) return null;

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      id="modal-keyboard-shortcuts"
      ariaLabel="Keyboard Shortcut Cheat-Sheet & Command Palette"
      desktopVariant="modal"
      maxWidthClass="w-full max-w-none"
      isEvening={isEvening}
    >
      {/* Top Raycast/Linear Search & Spotlight Banner */}
      <div className="p-4 border-b border-white/[0.09] bg-black/30 space-y-3 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold tracking-tight">
                  Keyboard Shortcuts &amp; Command Bar
                </h2>
                <span className="px-2 py-0.5 rounded bg-white/[0.07] border border-white/[0.12] font-mono text-[10px] text-cyan-300">
                  Press ? or Cmd+K
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">
                Click any command row to trigger immediately or press its hotkey anywhere
              </p>
            </div>
          </div>

          <button
            id="btn-close-shortcuts-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 cursor-pointer"
            aria-label="Close Keyboard Shortcuts Modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Input + 4-Step Spotlight Tour Launcher */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="input-shortcut-command-search"
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter hotkeys or commands (Space, Cinema, Break, Stress, Smart Intake...)"
              className="w-full bg-slate-950/90 border border-white/[0.12] rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <button
            id="btn-launch-spotlight-from-cheatsheet"
            type="button"
            onClick={() => {
              soundEngine.playTactileClick('MODE_TOGGLE');
              onClose();
              handlers.onLaunchSpotlightTour();
            }}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-400 to-indigo-400 hover:from-cyan-300 hover:to-indigo-300 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm cursor-pointer shrink-0"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Launch 4-Step Spotlight Tour</span>
          </button>
        </div>
      </div>

      {/* Shortcut List */}
      <div className="p-4 overflow-y-auto space-y-2 flex-1">
        {filtered.map((item) => (
          <button
            key={item.id}
            id={item.id}
            type="button"
            onClick={() => {
              soundEngine.playTactileClick('UI_TAP');
              item.onExecute();
            }}
            className="w-full text-left p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-cyan-400/40 transition flex items-center justify-between gap-3 group cursor-pointer"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-950 border border-white/[0.08] flex items-center justify-center shrink-0 mt-0.5">
                {item.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-semibold text-slate-100 group-hover:text-cyan-200 transition">
                    {item.title}
                  </span>
                  <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-400">
                    {item.category}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  {item.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {item.keys.map((k) => (
                <kbd
                  key={k}
                  className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700/90 shadow-inner font-mono text-xs font-bold text-cyan-200"
                >
                  {k}
                </kbd>
              ))}
            </div>
          </button>
        ))}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-white/[0.08] bg-black/30 flex items-center justify-between text-[11px] font-mono text-slate-400 shrink-0">
        <span>
          Tip: On Mac use <strong className="text-slate-200">Cmd</strong>; on Linux/Windows use <strong className="text-slate-200">Ctrl</strong>.
        </span>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 rounded-lg bg-white/[0.07] hover:bg-white/[0.12] text-slate-200 cursor-pointer"
        >
          Esc to close
        </button>
      </div>
    </MobileBottomSheet>
  );
};
