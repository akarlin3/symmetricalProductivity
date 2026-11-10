import React from 'react';
import { BaselineBlock, BreakOptionsConfig, RoadmapTrackId } from '../types/symmetry';
import {
  getBaselineSlotTargetBlocks,
  isBaselineSlotEarlyClearanceEligible,
  isBaselineSlotLateNightBlocked,
} from '../state/defaultState';
import { Check, Moon, Sparkles, Trash2, X } from 'lucide-react';

export interface InlineBaselineSlotEditorProps {
  block: BaselineBlock;
  canDelete: boolean;
  onUpdate: (updates: Partial<BaselineBlock>) => void;
  onDelete: () => void;
  onClose?: () => void;
}

export const InlineSlotEditor: React.FC<InlineBaselineSlotEditorProps> = ({
  block,
  canDelete,
  onUpdate,
  onDelete,
  onClose,
}) => {
  const targetBlocks = getBaselineSlotTargetBlocks(block);
  const earlyClearance = isBaselineSlotEarlyClearanceEligible(block);
  const lateNightBlocker = isBaselineSlotLateNightBlocked(block);

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-2 p-2.5 rounded-lg bg-slate-950/95 border border-teal-500/40 space-y-2 text-xs shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 font-semibold">
          Inline Baseline Slot Editor
        </span>
        <div className="flex items-center gap-1">
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              title="Delete Baseline Slot"
              className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 hover:bg-rose-500/25 text-[10px] font-medium inline-flex items-center gap-1 transition"
            >
              <Trash2 className="w-3 h-3" />
              Delete
            </button>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-2 py-0.5 rounded bg-teal-500/20 border border-teal-500/40 text-teal-200 hover:bg-teal-500/30 text-[10px] font-medium inline-flex items-center gap-1 transition"
            >
              <Check className="w-3 h-3" />
              Done
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
        <div className="sm:col-span-6">
          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
            Habit / Slot Label
          </label>
          <input
            type="text"
            value={block.title}
            onChange={(e) => onUpdate({ title: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-teal-400"
          />
        </div>

        <div className="sm:col-span-6">
          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
            Block Target (1b–6b)
          </label>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onUpdate({ targetBlocks: n })}
                className={`px-2 py-1 rounded text-[11px] font-mono font-semibold border transition ${
                  targetBlocks === n
                    ? 'bg-teal-500/25 border-teal-400 text-teal-200'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                {n}b
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
          5m Startup Script
        </label>
        <input
          type="text"
          value={block.startupStep}
          onChange={(e) => onUpdate({ startupStep: e.target.value })}
          onKeyDown={(e) => e.stopPropagation()}
          placeholder="Concrete 5-minute starter action..."
          className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
        <div className="sm:col-span-8">
          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
            Optional Launch URL / Deep Link (remnote://, anki://, https://)
          </label>
          <input
            type="text"
            value={block.launchUrl || ''}
            onChange={(e) => onUpdate({ launchUrl: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            placeholder="https://... or remnote:// / anki://"
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-teal-400"
          />
        </div>
        <div className="sm:col-span-4 pt-3">
          <label className="inline-flex items-center gap-1.5 text-[10px] font-mono text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(block.autoLaunchUrl)}
              onChange={(e) => onUpdate({ autoLaunchUrl: e.target.checked })}
              className="accent-teal-400"
            />
            <span>Auto-open on Start</span>
          </label>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              const nextVal = !earlyClearance;
              onUpdate({
                earlyClearanceEligible: nextVal,
                supportsEarlyClearance: nextVal,
                category:
                  nextVal && block.category !== 'FLASHCARDS_ANATOMY'
                    ? 'FLASHCARDS_COMP'
                    : block.category,
              });
            }}
            className={`px-2 py-1 rounded border text-[10px] font-mono inline-flex items-center gap-1 transition ${
              earlyClearance
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            Early Clearance: {earlyClearance ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => {
              const nextVal = !lateNightBlocker;
              onUpdate({
                lateNightBlocker: nextVal,
              });
            }}
            className={`px-2 py-1 rounded border text-[10px] font-mono inline-flex items-center gap-1 transition ${
              lateNightBlocker
                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3 h-3" />
            Late-Night Blocker: {lateNightBlocker ? 'ON' : 'OFF'}
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-[10px] font-mono text-slate-500">Track:</span>
          <select
            value={block.trackId}
            onChange={(e) => onUpdate({ trackId: e.target.value as RoadmapTrackId })}
            className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-700 text-[10px] font-mono text-slate-200"
          >
            <option value="science">Major 1: Primary Vocation</option>
            <option value="writing">Major 2: Writing &amp; Authorship</option>
            <option value="coding">Sandbox 1: Engineering &amp; Craft</option>
            <option value="music">Sandbox 2: Music &amp; Acoustic</option>
            <option value="culture">Sandbox 3: Culture &amp; Language</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export interface InlineBreakOptionsEditorProps {
  pillType: 'L1' | 'L2' | 'STRESS';
  breakOptions: BreakOptionsConfig;
  onUpdateBreakOptions: (updates: Partial<BreakOptionsConfig>) => void;
  onClose: () => void;
}

export const InlineBreakOptionsEditor: React.FC<InlineBreakOptionsEditorProps> = ({
  pillType,
  breakOptions,
  onUpdateBreakOptions,
  onClose,
}) => {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-2 p-2.5 rounded-lg bg-slate-950/95 border border-teal-500/40 space-y-2 text-xs shadow-lg"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-teal-300 font-semibold">
          {pillType === 'L1'
            ? 'Edit Micro-Reset (5m) Recovery Prompt'
            : pillType === 'L2'
            ? 'Edit Switch Buffer (15m) Recovery Options'
            : 'Edit Stress / Fatigue Reset Options'}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {pillType === 'L1' && (
        <div>
          <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
            5m Micro-Reset Options Label
          </label>
          <input
            type="text"
            value={breakOptions.l1Label}
            onChange={(e) => onUpdateBreakOptions({ l1Label: e.target.value })}
            onKeyDown={(e) => e.stopPropagation()}
            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-teal-400"
          />
        </div>
      )}

      {pillType === 'L2' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
              Buffer Option 1
            </label>
            <input
              type="text"
              value={breakOptions.l2EspressoLabel}
              onChange={(e) =>
                onUpdateBreakOptions({ l2EspressoLabel: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-teal-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
              Buffer Option 2
            </label>
            <input
              type="text"
              value={breakOptions.l2MusicLabel}
              onChange={(e) => onUpdateBreakOptions({ l2MusicLabel: e.target.value })}
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-teal-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
              Buffer Option 3
            </label>
            <input
              type="text"
              value={breakOptions.l2PhysicalLabel}
              onChange={(e) =>
                onUpdateBreakOptions({ l2PhysicalLabel: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-teal-400"
            />
          </div>
        </div>
      )}

      {pillType === 'STRESS' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
              Stress Option 1
            </label>
            <input
              type="text"
              value={breakOptions.stressBreathingLabel}
              onChange={(e) =>
                onUpdateBreakOptions({ stressBreathingLabel: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-teal-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
              Stress Option 2
            </label>
            <input
              type="text"
              value={breakOptions.stressEspressoLabel}
              onChange={(e) =>
                onUpdateBreakOptions({ stressEspressoLabel: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-teal-400"
            />
          </div>
          <div>
            <label className="block text-[10px] font-mono uppercase text-slate-400 mb-0.5">
              Stress Option 3
            </label>
            <input
              type="text"
              value={breakOptions.stressBootsLabel}
              onChange={(e) =>
                onUpdateBreakOptions({ stressBootsLabel: e.target.value })
              }
              onKeyDown={(e) => e.stopPropagation()}
              className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-teal-400"
            />
          </div>
        </div>
      )}
    </div>
  );
};
