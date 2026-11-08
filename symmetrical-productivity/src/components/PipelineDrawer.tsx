import React, { useState } from 'react';
import { AlertTriangle, Calendar, CheckCircle2, RefreshCw, X } from 'lucide-react';
import {
  FixedEventType,
  LoadMode,
  PipelineDay,
  SmartIntakePlanResult,
  SymmetryState,
} from '../types/symmetry';
import { SmartIntakeBar } from './SmartIntakeBar';
import { triggerHaptic } from '../utils/haptics';

interface InteractivePipelineTableProps {
  state: SymmetryState;
  onUpdateDay: (dayIndex: number, patch: Partial<PipelineDay>) => void;
  compact?: boolean;
}

export const InteractivePipelineTable: React.FC<InteractivePipelineTableProps> = ({
  state,
  onUpdateDay,
  compact = false,
}) => {
  const [breakerNotice, setBreakerNotice] = useState<string | null>(null);

  const isSurgeBlockedForDay = (dayIndex: number): boolean => {
    const idx = state.pipelineDays.findIndex((d) => d.dayIndex === dayIndex);
    if (idx < 0) return false;
    const prev1 = state.pipelineDays[idx - 1]?.loadMode === 'SURGE';
    const prev2 = state.pipelineDays[idx - 2]?.loadMode === 'SURGE';
    const next1 = state.pipelineDays[idx + 1]?.loadMode === 'SURGE';
    const next2 = state.pipelineDays[idx + 2]?.loadMode === 'SURGE';
    return (prev1 && prev2) || (prev1 && next1) || (next1 && next2);
  };

  const applyModeToDay = (day: PipelineDay, newMode: LoadMode) => {
    if (newMode === 'SURGE' && isSurgeBlockedForDay(day.dayIndex)) {
      setBreakerNotice(
        `Circuit Breaker: Blocked Surge on ${day.dayLabel} (max 2 consecutive Surge days allowed).`
      );
      return;
    }
    setBreakerNotice(null);

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
          : defaultEvent === 'EVENING_OUTING_6PM'
          ? `${state.earlyEveningShutdownTime || '6:00 PM'} Early Shutdown`
          : day.fixedEventTimeLabel,
    });
  };

  const handleCycleDayMode = (day: PipelineDay) => {
    triggerHaptic([10]);
    const surgeBlocked = isSurgeBlockedForDay(day.dayIndex);
    let nextMode: LoadMode;
    if (day.loadMode === 'CRUISE') {
      if (surgeBlocked) {
        nextMode = 'TAPER';
        setBreakerNotice(
          `Skipped Surge on ${day.dayLabel} → Cycled to TAPER (previous 2 days already set to Surge).`
        );
      } else {
        nextMode = 'SURGE';
        setBreakerNotice(null);
      }
    } else if (day.loadMode === 'SURGE') {
      nextMode = 'TAPER';
      setBreakerNotice(null);
    } else {
      nextMode = 'CRUISE';
      setBreakerNotice(null);
    }
    applyModeToDay(day, nextMode);
  };

  const handleToggleEventChip = (
    day: PipelineDay,
    targetEvent: 'LAB_2H' | 'EVENING_OUTING_6PM'
  ) => {
    triggerHaptic([10]);
    const nextEvent: FixedEventType =
      day.fixedEvent === targetEvent ? 'NONE' : targetEvent;
    onUpdateDay(day.dayIndex, {
      fixedEvent: nextEvent,
      fixedEventTimeLabel:
        nextEvent === 'LAB_2H'
          ? '09:00 AM – 11:00 AM Lab Shift (~2h)'
          : nextEvent === 'EVENING_OUTING_6PM'
          ? `${state.earlyEveningShutdownTime || '6:00 PM'} Early Shutdown`
          : undefined,
      earlyMorningAnchor:
        nextEvent === 'LAB_2H' ? true : day.earlyMorningAnchor,
    });
  };

  return (
    <div className="space-y-2.5">
      {breakerNotice && (
        <div
          id="pipeline-surge-breaker-notice"
          className="px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-200 font-mono text-[11px] flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{breakerNotice}</span>
          </span>
          <button
            type="button"
            onClick={() => setBreakerNotice(null)}
            className="text-amber-300 hover:text-amber-100 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-slate-800/90 bg-slate-950/60">
        <table
          id={compact ? 'inline-7day-pipeline-table' : 'drawer-7day-pipeline-table'}
          className="w-full text-left border-collapse text-xs"
        >
          <thead>
            <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono uppercase text-[10px]">
              <th className="py-2.5 px-3">Day (Click to Cycle Mode)</th>
              <th className="py-2.5 px-3">Load Mode</th>
              <th className="py-2.5 px-3">Net Target &amp; Project Blocks</th>
              <th className="py-2.5 px-3">
                Anchor Chips (2h Lab / {state.earlyEveningShutdownTime || '6:00 PM'} Shutdown)
              </th>
              <th className="py-2.5 px-3">Morning Anchor / Bridge</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/80">
            {state.pipelineDays.map((day) => {
              const netTarget = Math.max(
                7,
                day.baseTargetBlocks - day.deductedBlocksFromExtension
              );
              const surgeBlocked = isSurgeBlockedForDay(day.dayIndex);
              const isLabActive = day.fixedEvent === 'LAB_2H';
              const isEarlyShutdownActive = day.fixedEvent === 'EVENING_OUTING_6PM';

              return (
                <tr
                  key={day.dayIndex}
                  id={`pipeline-day-row-${day.dayIndex}`}
                  onClick={() => handleCycleDayMode(day)}
                  className={`transition cursor-pointer ${
                    day.isToday
                      ? 'bg-sky-950/30 hover:bg-sky-950/45 text-slate-100'
                      : 'bg-slate-900/50 hover:bg-slate-800/50 text-slate-300'
                  }`}
                  title="Click row to cycle Load Mode (Cruise → Surge → Taper)"
                >
                  <td className="py-2.5 px-3 font-medium">
                    <div className="flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 text-cyan-400/80 shrink-0" />
                      <span>{day.dayLabel}</span>
                      {day.isToday && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono text-[10px]">
                          ACTIVE
                        </span>
                      )}
                    </div>
                  </td>
                  <td
                    className="py-2.5 px-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="inline-flex items-center gap-1 rounded-lg bg-slate-950 p-0.5 border border-slate-800">
                      {(['CRUISE', 'SURGE', 'TAPER'] as LoadMode[]).map((m) => {
                        const blocked =
                          m === 'SURGE' && surgeBlocked && day.loadMode !== 'SURGE';
                        return (
                          <button
                            key={m}
                            id={`btn-day-${day.dayIndex}-mode-${m.toLowerCase()}`}
                            type="button"
                            disabled={blocked}
                            onClick={() => applyModeToDay(day, m)}
                            className={`px-2 py-1 rounded-md font-mono text-[10px] transition cursor-pointer ${
                              day.loadMode === m
                                ? m === 'SURGE'
                                  ? 'bg-amber-500 text-slate-950 font-bold'
                                  : m === 'TAPER'
                                  ? 'bg-emerald-500 text-slate-950 font-bold'
                                  : 'bg-sky-400 text-slate-950 font-bold'
                                : blocked
                                ? 'text-red-400/45 line-through cursor-not-allowed'
                                : 'text-slate-400 hover:text-slate-200'
                            }`}
                            title={
                              blocked
                                ? 'Blocked: Previous 2 days are already set to Surge'
                                : `Set ${day.dayLabel} to ${m}`
                            }
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                    {surgeBlocked && day.loadMode !== 'SURGE' && (
                      <div className="text-[10px] font-mono text-amber-300/90 mt-0.5">
                        2d Surge Cap Active
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono">
                    <div>
                      <span className="font-bold text-slate-100">
                        {netTarget} blks
                      </span>{' '}
                      <span className="text-slate-400">
                        ({Math.floor((netTarget * 20) / 60)}h{' '}
                        {String((netTarget * 20) % 60).padStart(2, '0')}m)
                      </span>
                    </div>
                    {day.projectBlocksSummary && (
                      <div className="text-[11px] text-cyan-300 mt-0.5">
                        {day.projectBlocksSummary}
                      </div>
                    )}
                    {day.deliverablesCompleted && (
                      <div className="text-[10px] text-emerald-300 mt-0.5">
                        {day.deliverablesCompleted}
                      </div>
                    )}
                    {day.deductedBlocksFromExtension > 0 && (
                      <div className="text-[10px] text-amber-300 mt-0.5">
                        -{day.deductedBlocksFromExtension} blk Flow Ext deduction
                      </div>
                    )}
                  </td>
                  <td
                    className="py-2.5 px-3"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        id={`chip-day-${day.dayIndex}-2h-lab`}
                        type="button"
                        onClick={() => handleToggleEventChip(day, 'LAB_2H')}
                        className={`px-2 py-1 rounded-lg border font-mono text-[10px] font-semibold transition cursor-pointer ${
                          isLabActive
                            ? 'bg-emerald-500/25 border-emerald-400 text-emerald-200'
                            : 'bg-slate-950 hover:bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        2h Lab
                      </button>
                      <button
                        id={`chip-day-${day.dayIndex}-6pm-shutdown`}
                        type="button"
                        onClick={() =>
                          handleToggleEventChip(day, 'EVENING_OUTING_6PM')
                        }
                        className={`px-2 py-1 rounded-lg border font-mono text-[10px] font-semibold transition cursor-pointer ${
                          isEarlyShutdownActive
                            ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                            : 'bg-slate-950 hover:bg-slate-900 border-slate-700 text-slate-300'
                        }`}
                      >
                        {state.earlyEveningShutdownTime || '6:00 PM'} Early Shutdown
                      </button>
                    </div>
                    {day.fixedEventTimeLabel && (
                      <div className="text-[10px] font-mono text-amber-200/80 mt-1">
                        {day.fixedEventTimeLabel}
                      </div>
                    )}
                  </td>
                  <td
                    className="py-2.5 px-3 space-y-1"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateDay(day.dayIndex, {
                          earlyMorningAnchor: !day.earlyMorningAnchor,
                        })
                      }
                      className={`px-2 py-1 rounded-lg border font-mono text-[10px] flex items-center gap-1 cursor-pointer ${
                        day.earlyMorningAnchor
                          ? 'bg-amber-950/70 border-amber-700 text-amber-200'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <CheckCircle2 className="w-3 h-3" />
                      <span>
                        {day.earlyMorningAnchor ? 'Early Lab/Anchor' : 'Zero Early Anchor'}
                      </span>
                    </button>
                    {day.eveningBridge && (
                      <div className="text-[10px] font-mono text-slate-400">
                        {day.eveningBridge}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

interface PipelineDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: SymmetryState;
  onUpdateDay: (dayIndex: number, patch: Partial<PipelineDay>) => void;
  smartIntakeText: string;
  onChangeSmartIntakeText: (val: string) => void;
  smartIntakePreview: SmartIntakePlanResult | null;
  onSetSmartIntakePreview: (plan: SmartIntakePlanResult | null) => void;
  onApplySmartIntakePlan: (plan: SmartIntakePlanResult) => void;
  onOpenStateModal: () => void;
  apiKeyVersion: number;
}

export const PipelineDrawer: React.FC<PipelineDrawerProps> = ({
  isOpen,
  onClose,
  state,
  onUpdateDay,
  smartIntakeText,
  onChangeSmartIntakeText,
  smartIntakePreview,
  onSetSmartIntakePreview,
  onApplySmartIntakePlan,
  onOpenStateModal,
  apiKeyVersion,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="pipeline-drawer-backdrop"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex justify-end"
    >
      <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 h-full flex flex-col justify-between overflow-y-auto p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-400" />
                <span>Interactive 7-Day Master Pipeline Table</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any day row to cycle Load Mode (Cruise / Surge / Taper), toggle 2h Lab or 6:00 PM Early Shutdown chips, and enforce the 2-day Surge circuit breaker.
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

          {/* Smart Intake & Week Planner Bar at top of 7-Day Pipeline View */}
          <SmartIntakeBar
            state={state}
            contextVariant="DRAWER_7DAY"
            inputText={smartIntakeText}
            onChangeInputText={onChangeSmartIntakeText}
            previewPlan={smartIntakePreview}
            onSetPreviewPlan={onSetSmartIntakePreview}
            onApplyPlan={onApplySmartIntakePlan}
            onOpenSettingsModal={onOpenStateModal}
            apiKeyVersion={apiKeyVersion}
          />

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

          <InteractivePipelineTable state={state} onUpdateDay={onUpdateDay} />
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
