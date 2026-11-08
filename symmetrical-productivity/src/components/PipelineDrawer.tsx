import React from 'react';
import { AlertTriangle, Calendar, CheckCircle2, X } from 'lucide-react';
import { FixedEventType, LoadMode, PipelineDay, SymmetryState } from '../types/symmetry';

interface PipelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: SymmetryState;
  onUpdateDay: (dayIndex: number, patch: Partial<PipelineDay>) => void;
}

export const PipelineDrawer: React.FC<PipelineDrawerProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateDay,
}) => {
  if (!isOpen) return null;

  const handleModeChange = (day: PipelineDay, newMode: LoadMode) => {
    // Enforce max 2 consecutive Surge days across the 7-day table
    if (newMode === 'SURGE') {
      const idx = state.pipelineDays.findIndex((d) => d.dayIndex === day.dayIndex);
      const prev1 = state.pipelineDays[idx - 1]?.loadMode === 'SURGE';
      const prev2 = state.pipelineDays[idx - 2]?.loadMode === 'SURGE';
      const next1 = state.pipelineDays[idx + 1]?.loadMode === 'SURGE';
      const next2 = state.pipelineDays[idx + 2]?.loadMode === 'SURGE';
      if ((prev1 && prev2) || (prev1 && next1) || (next1 && next2)) {
        return; // Blocked by 2-consecutive-day Surge circuit breaker
      }
    }

    const defaultBlocks =
      newMode === 'CRUISE' ? 12 : newMode === 'SURGE' ? 14 : 8;
    const defaultEvent: FixedEventType =
      newMode === 'TAPER' && day.fixedEvent === 'NONE' ? 'LAB_2H' : day.fixedEvent;

    onUpdateDay(day.dayIndex, {
      loadMode: newMode,
      baseTargetBlocks: defaultBlocks,
      fixedEvent: defaultEvent,
      fixedEventTimeLabel:
        defaultEvent === 'LAB_2H'
          ? '09:00 AM – 11:00 AM Lab Shift (~2h)'
          : day.fixedEventTimeLabel,
    });
  };

  return (
    <div
      id="pipeline-drawer-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end"
    >
      <div className="w-full max-w-3xl bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-y-auto p-4 sm:p-6">
        <div className="space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-400" />
                <span>7-Day Pipeline Table</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Load Mode Schedule, Fixed Event Anchors, and Flow Extension Quota Deductions
              </p>
            </div>
            <button
              id="btn-close-pipeline-drawer"
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Circuit Breaker Rule Notice */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-start gap-3 text-xs text-slate-300">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-slate-100">
                7-Day Load Mode Circuit Breakers Active
              </div>
              <p className="text-slate-400">
                Surge Mode (14–15 blocks) is hard-capped at <strong>max 2 consecutive days</strong> and enforces a mandatory 60–120m Mid-Day Reset after 7 blocks. Logging 2–3 Flow Extension blocks automatically deducts 1–2 project blocks from Day 2 (Tomorrow).
              </p>
            </div>
          </div>

          {/* 7-Day Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono uppercase text-[11px]">
                  <th className="py-2.5 px-3">Day</th>
                  <th className="py-2.5 px-3">Load Mode</th>
                  <th className="py-2.5 px-3">Net Target</th>
                  <th className="py-2.5 px-3">Fixed Event (Wall-Clock)</th>
                  <th className="py-2.5 px-3">Morning Anchor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {state.pipelineDays.map((day) => {
                  const netTarget = Math.max(
                    7,
                    day.baseTargetBlocks - day.deductedBlocksFromExtension
                  );
                  return (
                    <tr
                      key={day.dayIndex}
                      className={
                        day.isToday
                          ? 'bg-sky-950/25 text-slate-100'
                          : 'bg-slate-900/60 text-slate-300'
                      }
                    >
                      <td className="py-3 px-3 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>{day.dayLabel}</span>
                          {day.isToday && (
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono text-[10px]">
                              ACTIVE
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                          {(['CRUISE', 'SURGE', 'TAPER'] as LoadMode[]).map((m) => (
                            <button
                              key={m}
                              type="button"
                              onClick={() => handleModeChange(day, m)}
                              className={`px-2 py-1 rounded-md font-mono text-[11px] transition cursor-pointer ${
                                day.loadMode === m
                                  ? m === 'SURGE'
                                    ? 'bg-amber-600 text-slate-950 font-bold'
                                    : m === 'TAPER'
                                    ? 'bg-emerald-600 text-slate-950 font-bold'
                                    : 'bg-sky-500 text-slate-950 font-bold'
                                  : 'text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              {m}
                            </button>
                          ))}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        <span className="font-bold text-slate-100">
                          {netTarget} blks
                        </span>{' '}
                        <span className="text-slate-400">
                          ({Math.floor((netTarget * 20) / 60)}h{' '}
                          {String((netTarget * 20) % 60).padStart(2, '0')}m)
                        </span>
                        {day.deductedBlocksFromExtension > 0 && (
                          <div className="text-[11px] text-amber-300 mt-0.5">
                            -{day.deductedBlocksFromExtension} blk Flow Ext deduction
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <select
                          aria-label={`Fixed event for ${day.dayLabel}`}
                          value={day.fixedEvent}
                          onChange={(e) =>
                            onUpdateDay(day.dayIndex, {
                              fixedEvent: e.target.value as FixedEventType,
                            })
                          }
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 font-mono"
                        >
                          <option value="NONE">None (Duration-Only)</option>
                          <option value="LAB_2H">Lab (~2h Fixed Event)</option>
                          <option value="VOLUNTEER">Volunteer Shift</option>
                          <option value="EVENING_OUTING_6PM">6:00 PM Evening Outing</option>
                        </select>
                      </td>
                      <td className="py-3 px-3">
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateDay(day.dayIndex, {
                              earlyMorningAnchor: !day.earlyMorningAnchor,
                            })
                          }
                          className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] flex items-center gap-1.5 cursor-pointer ${
                            day.earlyMorningAnchor
                              ? 'bg-amber-950/70 border-amber-700 text-amber-200'
                              : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {day.earlyMorningAnchor ? 'Early Lab/Anchor' : 'Zero Early Anchor'}
                          </span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            Day 2 (Tomorrow) Early Anchor Status:{' '}
            <strong className="text-slate-200">
              {state.pipelineDays[1]?.earlyMorningAnchor
                ? 'Early Event Logged (Blocks Flow Extension)'
                : 'Clear (Permits Flow Extension)'}
            </strong>
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
    </div>
  );
};
