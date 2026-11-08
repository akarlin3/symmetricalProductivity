import React, { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Keyboard,
  Lock,
  Moon,
  Sparkles,
  Volume2,
  X,
} from 'lucide-react';
import { TabId } from '../types/symmetry';
import { MobileBottomSheet } from './MobileBottomSheet';
import { soundEngine } from '../utils/soundEngine';

interface SpotlightTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcutsModal: () => void;
  onSelectTab: (tab: TabId) => void;
  isEvening: boolean;
}

interface SpotlightStep {
  stepNumber: 1 | 2 | 3 | 4;
  badge: string;
  title: string;
  subtitle: string;
  targetElementId: string;
  targetTab: TabId;
  accentColor: string;
  icon: React.ReactNode;
  highlights: string[];
  interactiveDemoLabel: string;
  visualPreview: React.ReactNode;
}

export const SpotlightTourModal: React.FC<SpotlightTourModalProps> = ({
  isOpen,
  onClose,
  onOpenShortcutsModal,
  onSelectTab,
  isEvening,
}) => {
  const [stepIdx, setStepIdx] = useState<number>(0);

  const steps: SpotlightStep[] = [
    {
      stepNumber: 1,
      badge: 'STEP 1 OF 4 • CAPACITY GOVERNOR',
      title: 'Duration-Only Countdown & Load Modes',
      subtitle:
        'Replaces rigid wall-clock schedules with a live work-remaining countdown and 3 self-governing Load Modes.',
      targetElementId: 'bento-shift-gauge',
      targetTab: 'PIPELINE',
      accentColor: 'from-cyan-500/20 to-indigo-500/20 border-cyan-400/50',
      icon: <Clock className="w-5 h-5 text-cyan-300" />,
      highlights: [
        'Every block displays a live Duration-Only Countdown ([20m | 3h 40m work left] down to [0m work left]).',
        'Cruise (11–12 blocks / 3h 40m–4h) is your sustainable daily default.',
        'Surge (14–15 blocks) is hard-capped at max 2 consecutive days and enforces a mandatory 60–120m Mid-Day Reset after Block 7.',
        'Taper (7–9 blocks) automatically protects days with 2h Lab shifts, Volunteer shifts, or Pre-Exam Taper.',
      ],
      interactiveDemoLabel: 'Focus Shift Gauge & Load Modes in Tab 1',
      visualPreview: (
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/30 space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 font-bold">
              [20m | 3h 40m work left]
            </span>
            <span className="text-[11px] text-emerald-300">
              Surge Streak: 0 / 2 (Circuit Breaker Armed)
            </span>
          </div>
          <div className="grid grid-cols-3 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-cyan-500/15 border border-cyan-400/40 text-cyan-100">
              <div className="font-bold">CRUISE</div>
              <div className="text-[10px] text-cyan-200/80">11–12 blks (Default)</div>
            </div>
            <div className="p-2 rounded-lg bg-amber-500/15 border border-amber-400/40 text-amber-100">
              <div className="font-bold">SURGE</div>
              <div className="text-[10px] text-amber-200/80">14–15 blks (Max 2d)</div>
            </div>
            <div className="p-2 rounded-lg bg-emerald-500/15 border border-emerald-400/40 text-emerald-100">
              <div className="font-bold">TAPER</div>
              <div className="text-[10px] text-emerald-200/80">7–9 blks (Lab/Exam)</div>
            </div>
          </div>
        </div>
      ),
    },
    {
      stepNumber: 2,
      badge: 'STEP 2 OF 4 • FRICTIONLESS IGNITION',
      title: '5m Startup -> 15m Momentum Dial',
      subtitle:
        'Eliminates task-initiation resistance by splitting every 20m block into a 5m Startup Step that seamlessly rolls into a 15m Momentum Block.',
      targetElementId: 'bento-timer-hud',
      targetTab: 'PIPELINE',
      accentColor: 'from-emerald-500/20 to-cyan-500/20 border-emerald-400/50',
      icon: <Flame className="w-5 h-5 text-emerald-300" />,
      highlights: [
        'Stage 1 (5m Startup Step): Zero outcome pressure. Permission to stop at 5:00 if resistance remains high.',
        'Stage 2 (15m Momentum Block): Auto-transitions from 5m Startup to complete the full 20m block.',
        'Max 2 Chained Blocks (40m) before enforcing a 10–15m Level 2 Task-Switch Buffer.',
        'Procedural Web Audio Soundscape (Warm Brown Noise, Soft Rain, or 40Hz Binaural Focus Drone) fades in over 2s on timer start.',
      ],
      interactiveDemoLabel: 'Jump to 20m Ring Dial & Soundscape HUD',
      visualPreview: (
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-emerald-500/30 space-y-2.5 font-mono text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/50 text-emerald-200 font-bold">
              STAGE 1: 05:00 STARTUP
            </span>
            <span className="text-slate-400">→</span>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 font-bold">
              STAGE 2: 15:00 MOMENTUM
            </span>
          </div>
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Auto-Fade Soundscape: Warm Brown / Soft Rain / 40Hz Gamma</span>
            </span>
            <span className="text-cyan-300">Swipe Right on Hero Card to Start</span>
          </div>
        </div>
      ),
    },
    {
      stepNumber: 3,
      badge: 'STEP 3 OF 4 • ZERO CONTEXT-SWITCHING',
      title: 'Serialized Focus #1 Lock (Closed List 1–3)',
      subtitle:
        'After clearing your Daily Baseline Floor, 100% of remaining discretionary blocks route exclusively to Closed List Item #1.',
      targetElementId: 'bento-closed-list',
      targetTab: 'PIPELINE',
      accentColor: 'from-amber-500/20 to-indigo-500/20 border-amber-400/50',
      icon: <Lock className="w-5 h-5 text-amber-300" />,
      highlights: [
        'Closed List holds at most 3 active deliverables (weighted at 8 blocks for a 2-Page Paper or 4 blocks for a Slide Deck).',
        'Item #1 is UNLOCKED and receives 100% of discretionary blocks.',
        'Items #2 and #3 remain strictly LOCKED until Item #1 reaches 100% completion—preventing fragmented progress across 3 projects at once.',
        'When Item #1 finishes, it archives to the 4-Rung Output Ledger and Item #2 automatically promotes to Focus #1.',
      ],
      interactiveDemoLabel: 'Inspect Closed List 1–3 Lock in Tab 1',
      visualPreview: (
        <div className="p-3.5 rounded-xl bg-slate-950/90 border border-amber-500/30 space-y-2 font-mono text-xs">
          <div className="p-2.5 rounded-lg bg-cyan-500/15 border border-cyan-400/50 flex items-center justify-between">
            <span className="font-bold text-cyan-100">
              #1 Primary Focus Deliverable (UNLOCKED)
            </span>
            <span className="text-cyan-300 font-bold">[3 / 8 blks]</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-center justify-between text-slate-400">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span>#2 Secondary Deliverable (LOCKED until #1 finishes)</span>
            </span>
            <span>[0 / 4 blks]</span>
          </div>
        </div>
      ),
    },
    {
      stepNumber: 4,
      badge: 'STEP 4 OF 4 • OFF-DUTY RECHARGE',
      title: 'Option 0 & The 5-Category Evening Recharge Menu',
      subtitle:
        'When the shift hits [0m work left], On-Duty work locks out and the interface shifts to warm terracotta/amber for guilt-free recovery.',
      targetElementId: 'option-0-stillness-banner',
      targetTab: 'RECHARGE',
      accentColor: 'from-[#d96b43]/25 to-amber-500/20 border-amber-400/50',
      icon: <Moon className="w-5 h-5 text-amber-300" />,
      highlights: [
        'Option 0 (Rest / Stillness): 20m silent decompression window. Capped at 2 consecutive windows (40m) before triggering a gentle Fork Check ("Go to Sleep" vs. "Start One 5m Activity").',
        'Fluid Categories (Cat 1 Music & Cat 4 Comfort Show): Zero tracking overhead—launch a 5m cold song or off-monitor episode.',
        'Sticky Categories (Cat 2 Maker, Cat 3A/3B/3C Media Triple-Track, Cat 5 Gaming): Use the [X / 3] 5m-Start Rule to protect momentum on rich hobbies before rotating.',
      ],
      interactiveDemoLabel: 'Explore Evening Recharge Menu (Tab 2)',
      visualPreview: (
        <div className="p-3.5 rounded-xl bg-[#140e0b] border border-amber-500/40 space-y-2 font-mono text-xs text-amber-100">
          <div className="flex items-center justify-between">
            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-amber-200 font-bold">
              [0m work left — Hard Shutdown]
            </span>
            <span className="text-amber-300">Option 0 Stillness: [0 / 2] (40m Cap)</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-2 rounded-lg bg-white/[0.04] border border-amber-500/25">
              1. Music &amp; 4. Comfort: <strong>[Fluid]</strong>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.04] border border-amber-500/25">
              2. Maker, 3. Media, 5. Gaming: <strong>[X / 3] Sticky</strong>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const current = steps[stepIdx] || steps[0];

  const handleJumpToElement = () => {
    soundEngine.playTactileClick('MODE_TOGGLE');
    onSelectTab(current.targetTab);
    onClose();
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        const el = document.getElementById(current.targetElementId);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('ring-2', 'ring-cyan-400');
          window.setTimeout(() => {
            el.classList.remove('ring-2', 'ring-cyan-400');
          }, 2200);
        }
      }, 120);
    }
  };

  if (!isOpen) return null;

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      id="modal-spotlight-tour"
      ariaLabel="How Symmetrical Works — 4-Step Interactive Spotlight Tour"
      desktopVariant="modal"
      maxWidthClass="max-w-2xl"
      isEvening={isEvening}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/[0.09] flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-bold tracking-tight">
                How Symmetrical Works (4-Step Spotlight)
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/40 font-mono text-[10px] text-cyan-300 font-bold">
                Step {current.stepNumber} / 4
              </span>
            </div>
            <p className="text-[11px] font-mono text-slate-400">
              Interactive tour of the Capacity Governor, 5m-&gt;15m Dial, Focus #1 Lock &amp; Evening Recharge
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            id="btn-open-shortcuts-from-tour"
            type="button"
            onClick={() => {
              soundEngine.playTactileClick('UI_TAP');
              onClose();
              onOpenShortcutsModal();
            }}
            className="px-2.5 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
            title="Open Keyboard Shortcut Cheat-Sheet (?)"
          >
            <Keyboard className="w-3.5 h-3.5 text-cyan-300" />
            <span>Hotkeys (?)</span>
          </button>

          <button
            id="btn-close-spotlight-tour"
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-300 cursor-pointer"
            aria-label="Close Spotlight Tour"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Step Progress Pips */}
      <div className="px-5 pt-3.5 flex items-center gap-2 shrink-0">
        {steps.map((s, idx) => (
          <button
            key={s.stepNumber}
            id={`btn-spotlight-step-${s.stepNumber}`}
            type="button"
            onClick={() => {
              soundEngine.playTactileClick('UI_TAP');
              setStepIdx(idx);
            }}
            className={`flex-1 h-2 rounded-full transition-all cursor-pointer ${
              idx === stepIdx
                ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                : idx < stepIdx
                ? 'bg-emerald-400/70'
                : 'bg-white/[0.12]'
            }`}
            title={`Go to Step ${s.stepNumber}: ${s.title}`}
          />
        ))}
      </div>

      {/* Step Body */}
      <div className="p-5 overflow-y-auto space-y-4 flex-1">
        <div
          className={`p-4 rounded-2xl bg-gradient-to-br ${current.accentColor} border space-y-2`}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest font-bold text-cyan-200">
              {current.badge}
            </span>
            {current.icon}
          </div>
          <h3
            id="spotlight-step-title"
            className="text-base sm:text-lg font-bold text-white"
          >
            {current.title}
          </h3>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
            {current.subtitle}
          </p>
        </div>

        {/* Visual Diagram Preview */}
        {current.visualPreview}

        {/* Bullet Mechanics */}
        <div className="space-y-2">
          {current.highlights.map((bullet, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-white/[0.03] border border-white/[0.07] flex items-start gap-2.5 text-xs text-slate-200"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>{bullet}</span>
            </div>
          ))}
        </div>

        {/* Spotlight Jump Button */}
        <div className="pt-1 flex justify-end">
          <button
            id="btn-spotlight-highlight-live-element"
            type="button"
            onClick={handleJumpToElement}
            className="px-3.5 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-cyan-400/40 text-cyan-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
            <span>{current.interactiveDemoLabel}</span>
          </button>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="px-5 py-3.5 border-t border-white/[0.08] bg-black/30 flex items-center justify-between gap-2 shrink-0">
        <button
          id="btn-spotlight-prev"
          type="button"
          disabled={stepIdx === 0}
          onClick={() => {
            soundEngine.playTactileClick('UI_TAP');
            setStepIdx((i) => Math.max(0, i - 1));
          }}
          className="px-3.5 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] disabled:opacity-35 border border-white/[0.1] font-mono text-xs text-slate-200 flex items-center gap-1.5 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </button>

        <span className="text-xs font-mono text-slate-400">
          Step {stepIdx + 1} of {steps.length}
        </span>

        {stepIdx < steps.length - 1 ? (
          <button
            id="btn-spotlight-next"
            type="button"
            onClick={() => {
              soundEngine.playTactileClick('UI_TAP');
              setStepIdx((i) => Math.min(steps.length - 1, i + 1));
            }}
            className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <span>Next Step</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            id="btn-spotlight-finish"
            type="button"
            onClick={() => {
              soundEngine.playTactileClick('BLOCK_COMPLETE');
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Finish Tour</span>
          </button>
        )}
      </div>
    </MobileBottomSheet>
  );
};
