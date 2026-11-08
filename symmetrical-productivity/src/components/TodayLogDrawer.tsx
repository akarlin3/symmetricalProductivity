import React, { useState } from 'react';
import {
  Check,
  Clock,
  Edit3,
  ListChecks,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import {
  SymmetryState,
  TodayBlockLogCategory,
  TodayBlockLogEntry,
} from '../types/symmetry';
import { computeShiftMetrics, getLogicalDayKey } from '../state/defaultState';
import { triggerHaptic } from '../utils/haptics';
import { MobileBottomSheet } from './MobileBottomSheet';

interface TodayLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: SymmetryState;
  onReassignEntryCategory: (
    entryId: string,
    newCategory: TodayBlockLogCategory
  ) => void;
  onEditEntryTitle: (entryId: string, newTitle: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onAddManualBlock: (
    category: TodayBlockLogCategory,
    title: string,
    durationMinutes: number
  ) => void;
  isEveningTheme: boolean;
}

const CATEGORY_LABELS: Record<TodayBlockLogCategory, string> = {
  FLOOR_ANATOMY: 'Baseline Floor: Anatomy Cards',
  FLOOR_COMP: 'Baseline Floor: Comp Cards',
  FLOOR_READING: 'Baseline Floor: Reading / Equations',
  FLOOR_SYNTHESIS: 'Baseline Floor: Synthesis',
  PROJECT_FOCUS_1: 'Focus #1 Project',
  FLOW_EXTENSION: 'Flow Extension',
  EVENING_RECHARGE: 'Evening Recharge',
};

const WORK_REASSIGN_CATEGORIES: TodayBlockLogCategory[] = [
  'FLOOR_ANATOMY',
  'FLOOR_COMP',
  'FLOOR_READING',
  'FLOOR_SYNTHESIS',
  'PROJECT_FOCUS_1',
];

export const TodayLogDrawer: React.FC<TodayLogDrawerProps> = ({
  isOpen,
  onClose,
  state,
  onReassignEntryCategory,
  onEditEntryTitle,
  onDeleteEntry,
  onAddManualBlock,
  isEveningTheme,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [manualCategory, setManualCategory] =
    useState<TodayBlockLogCategory>('PROJECT_FOCUS_1');
  const [manualTitle, setManualTitle] = useState('');
  const [manualDuration, setManualDuration] = useState<number>(20);

  if (!isOpen) return null;

  const currentLogicalDay = state.logicalDayKey || getLogicalDayKey();
  const metrics = computeShiftMetrics(state);

  const todayEntries: TodayBlockLogEntry[] = (state.todayBlockLog || []).filter(
    (entry) => entry.logicalDate === currentLogicalDay
  );

  const handleStartEdit = (entry: TodayBlockLogEntry) => {
    setEditingId(entry.id);
    setEditingTitle(entry.title);
  };

  const handleSaveEdit = (entryId: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      onEditEntryTitle(entryId, trimmed);
    }
    setEditingId(null);
  };

  const getDefaultTitleForCategory = (cat: TodayBlockLogCategory): string => {
    if (cat === 'FLOOR_ANATOMY') return 'Anatomy Flashcards — Manual 20m Block';
    if (cat === 'FLOOR_COMP') return 'Comp Flashcards — Manual 20m Block';
    if (cat === 'FLOOR_READING') return 'Half-Chapter Reading / Equations';
    if (cat === 'FLOOR_SYNTHESIS') return 'Half-Chapter Synthesis';
    if (cat === 'PROJECT_FOCUS_1') {
      return state.projectQueue[0]?.title || 'Focus #1 Project Block';
    }
    if (cat === 'FLOW_EXTENSION') return 'Flow Extension (+20m Block)';
    return 'Evening Recharge Window';
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const resolvedTitle =
      manualTitle.trim() || getDefaultTitleForCategory(manualCategory);
    triggerHaptic([15]);
    onAddManualBlock(manualCategory, resolvedTitle, manualDuration);
    setManualTitle('');
    setManualFormOpen(false);
  };

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      id="today-log-drawer-backdrop"
      ariaLabel="Today's Block Log Drawer"
      desktopVariant="drawer"
      maxWidthClass="max-w-2xl"
      isEvening={isEveningTheme}
    >
      <div className="flex-1 flex flex-col justify-between overflow-y-auto p-4 sm:p-6">
        <div className="space-y-5">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold flex items-center gap-2 font-mono">
                <ListChecks
                  className={`w-5 h-5 ${
                    isEveningTheme ? 'text-amber-400' : 'text-cyan-400'
                  }`}
                />
                <span>Today&apos;s Block Log ({todayEntries.length} blocks)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5 font-mono">
                Logical Day: {currentLogicalDay} (4:00 AM Rollover) •{' '}
                {metrics.durationPrefix}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                id="btn-open-manual-block-form"
                type="button"
                onClick={() => {
                  triggerHaptic([10]);
                  setManualFormOpen((prev) => !prev);
                }}
                className={`px-3 py-1.5 rounded-xl font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer ${
                  isEveningTheme
                    ? 'bg-amber-400 hover:bg-amber-300 text-stone-950'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Manual Block</span>
              </button>

              <button
                id="btn-close-today-log-drawer"
                type="button"
                onClick={onClose}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                aria-label="Close Today's Log drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Retroactive "+ Manual Block" Form */}
          {manualFormOpen && (
            <form
              id="form-manual-block"
              onSubmit={handleManualSubmit}
              className="p-4 rounded-2xl bg-slate-950/90 border border-cyan-500/40 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider font-bold text-cyan-300">
                  Log Retroactive Block ({currentLogicalDay})
                </span>
                <button
                  type="button"
                  onClick={() => setManualFormOpen(false)}
                  className="text-xs font-mono text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Category
                  </label>
                  <select
                    id="select-manual-block-category"
                    value={manualCategory}
                    onChange={(e) =>
                      setManualCategory(e.target.value as TodayBlockLogCategory)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-100"
                  >
                    <option value="FLOOR_ANATOMY">
                      Baseline Floor: Anatomy Cards (20m)
                    </option>
                    <option value="FLOOR_COMP">
                      Baseline Floor: Comp Cards (20m)
                    </option>
                    <option value="FLOOR_READING">
                      Baseline Floor: Reading / Equations (20m)
                    </option>
                    <option value="FLOOR_SYNTHESIS">
                      Baseline Floor: Synthesis (20m)
                    </option>
                    <option value="PROJECT_FOCUS_1">
                      Focus #1 Project ({state.projectQueue[0]?.title || 'Primary'})
                    </option>
                    <option value="FLOW_EXTENSION">Flow Extension (20m)</option>
                    <option value="EVENING_RECHARGE">
                      Evening Recharge Window
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                    Duration (min)
                  </label>
                  <select
                    id="select-manual-block-duration"
                    value={manualDuration}
                    onChange={(e) => setManualDuration(Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-2 text-xs font-mono text-slate-100"
                  >
                    <option value={20}>20m Block</option>
                    <option value={5}>5m Step</option>
                    <option value={40}>40m Chained</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Title / Note (Optional)
                </label>
                <input
                  id="input-manual-block-title"
                  type="text"
                  value={manualTitle}
                  onChange={(e) => setManualTitle(e.target.value)}
                  placeholder={getDefaultTitleForCategory(manualCategory)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100"
                />
              </div>

              <div className="flex justify-end">
                <button
                  id="btn-submit-manual-block"
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                >
                  Save Retroactive Block
                </button>
              </div>
            </form>
          )}

          {/* Summary Strip */}
          <div className="grid grid-cols-3 gap-2.5 text-xs font-mono">
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">
                Shift Progress
              </span>
              <span className="text-sm font-bold text-slate-100">
                {metrics.totalCompletedBlocks} / {metrics.totalTargetBlocks} blks
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">
                Work Countdown
              </span>
              <span className="text-sm font-bold text-cyan-300">
                {metrics.remainingWorkFormatted}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800">
              <span className="text-[10px] uppercase text-slate-400 block">
                Logged Entries
              </span>
              <span className="text-sm font-bold text-emerald-300">
                {todayEntries.length} entries
              </span>
            </div>
          </div>

          {/* Entries List */}
          <div className="space-y-2.5" id="today-log-entries-list">
            {todayEntries.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center space-y-2">
                <Clock className="w-6 h-6 text-slate-500 mx-auto" />
                <p className="text-xs font-mono text-slate-400">
                  No blocks logged yet for logical day {currentLogicalDay} (since 4:00 AM).
                </p>
                <p className="text-[11px] text-slate-500">
                  Complete a 20m block or click &ldquo;+ Manual Block&rdquo; above to add an entry.
                </p>
              </div>
            ) : (
              todayEntries.map((entry, idx) => {
                const isEditing = editingId === entry.id;
                const isReassignableWork = WORK_REASSIGN_CATEGORIES.includes(
                  entry.category
                );

                return (
                  <div
                    key={entry.id}
                    id={`log-entry-${entry.id}`}
                    className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/90 space-y-2.5"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      {/* Title or Inline Edit Input */}
                      <div className="flex-1 min-w-[200px]">
                        <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                          <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-slate-300 font-bold">
                            #{idx + 1}
                          </span>
                          <span>{entry.durationMinutes}m</span>
                          <span>•</span>
                          <span className="uppercase">{entry.roadmapTrack}</span>
                          <span>•</span>
                          <span
                            className={
                              entry.stroke === 'OUTPUT'
                                ? 'text-emerald-300 font-bold'
                                : 'text-cyan-300 font-bold'
                            }
                          >
                            {entry.stroke}
                          </span>
                          <span>•</span>
                          <span>Logical Day {entry.logicalDate}</span>
                        </div>

                        {isEditing ? (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <input
                              id={`input-edit-title-${entry.id}`}
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveEdit(entry.id);
                                if (e.key === 'Escape') setEditingId(null);
                              }}
                              className="flex-1 bg-slate-900 border border-cyan-400/60 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none"
                              autoFocus
                            />
                            <button
                              id={`btn-save-title-${entry.id}`}
                              type="button"
                              onClick={() => handleSaveEdit(entry.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                              <span>Save</span>
                            </button>
                          </div>
                        ) : (
                          <div className="mt-1 flex items-center gap-2">
                            <span
                              id={`log-entry-title-${entry.id}`}
                              className="text-xs sm:text-sm font-semibold text-slate-100"
                            >
                              {entry.title}
                            </span>
                            <button
                              id={`btn-edit-title-${entry.id}`}
                              type="button"
                              onClick={() => handleStartEdit(entry)}
                              className="p-1 rounded-md bg-white/[0.04] hover:bg-white/[0.1] text-slate-400 hover:text-slate-200 cursor-pointer"
                              title="Edit Title / Note"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Delete Entry (Trash icon) */}
                      <button
                        id={`btn-delete-entry-${entry.id}`}
                        type="button"
                        onClick={() => {
                          triggerHaptic([15]);
                          onDeleteEntry(entry.id);
                        }}
                        className="p-1.5 rounded-lg bg-red-950/40 hover:bg-red-900/60 border border-red-800/40 text-red-300 cursor-pointer"
                        title="Delete entry and recalculate blocksCompleted, workLeft, and 4-Rung Input/Output"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Inline Reassign Category Dropdown */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/70">
                      <span className="text-[11px] font-mono text-slate-400">
                        Assigned Category:
                      </span>

                      {isReassignableWork ? (
                        <select
                          id={`select-reassign-category-${entry.id}`}
                          aria-label={`Reassign category for ${entry.title}`}
                          value={entry.category}
                          onChange={(e) => {
                            triggerHaptic([10]);
                            onReassignEntryCategory(
                              entry.id,
                              e.target.value as TodayBlockLogCategory
                            );
                          }}
                          className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs font-mono text-slate-200 cursor-pointer"
                        >
                          <option value="FLOOR_ANATOMY">
                            Baseline Floor (Anatomy Cards)
                          </option>
                          <option value="FLOOR_COMP">
                            Baseline Floor (Comp Cards)
                          </option>
                          <option value="FLOOR_READING">
                            Baseline Floor (Reading / Equations)
                          </option>
                          <option value="FLOOR_SYNTHESIS">
                            Baseline Floor (Synthesis)
                          </option>
                          <option value="PROJECT_FOCUS_1">
                            Focus #1 Project ({state.projectQueue[0]?.title || 'Primary'})
                          </option>
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] font-mono text-xs text-amber-200">
                          {CATEGORY_LABELS[entry.category]}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
          <span>
            Reassigning preserves 20m ceiling credit • Deleting recalculates workLeft &amp; 4-Rung Ledger
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </MobileBottomSheet>
  );
};
