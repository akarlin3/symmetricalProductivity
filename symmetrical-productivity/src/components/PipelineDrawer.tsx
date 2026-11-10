import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  FileUp,
  Link2,
  RefreshCw,
  Upload,
  X,
} from 'lucide-react';
import {
  FixedEventType,
  LoadMode,
  PipelineDay,
  SmartIntakePlanResult,
  SymmetryState,
} from '../types/symmetry';
import { SmartIntakeBar } from './SmartIntakeBar';
import { triggerHaptic } from '../utils/haptics';
import { MobileBottomSheet } from './MobileBottomSheet';
import {
  fetchIcsFeedText,
  parseCalendarScheduleToAnchors,
} from '../utils/calendarAnchorImporter';

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
  const [importerOpen, setImporterOpen] = useState(false);
  const [calendarRawInput, setCalendarRawInput] = useState('');
  const [feedUrlInput, setFeedUrlInput] = useState('');
  const [feedLoading, setFeedLoading] = useState(false);
  const [importerStatusMsg, setImporterStatusMsg] = useState<string | null>(null);

  const shutdownTimeLabel = state.earlyEveningShutdownTime || '6:00 PM';

  const anchorPreview = useMemo(
    () =>
      parseCalendarScheduleToAnchors(
        calendarRawInput,
        state.pipelineDays,
        state.logicalDayKey,
        shutdownTimeLabel
      ),
    [calendarRawInput, state.pipelineDays, state.logicalDayKey, shutdownTimeLabel]
  );

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
          ? `${shutdownTimeLabel} Early Shutdown`
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
    if (targetEvent === 'EVENING_OUTING_6PM') {
      const currentlyActive =
        day.fixedEvent === 'EVENING_OUTING_6PM' || Boolean(day.earlyEveningShutdownBadge);
      const nextActive = !currentlyActive;
      onUpdateDay(day.dayIndex, {
        fixedEvent:
          day.fixedEvent === 'LAB_2H' || day.fixedEvent === 'VOLUNTEER'
            ? day.fixedEvent
            : nextActive
            ? 'EVENING_OUTING_6PM'
            : 'NONE',
        earlyEveningShutdownBadge: nextActive,
        fixedEventTimeLabel: nextActive
          ? day.fixedEvent === 'LAB_2H' && day.fixedEventTimeLabel
            ? `${day.fixedEventTimeLabel} • Early Shutdown (${shutdownTimeLabel})`
            : `Early Shutdown (${shutdownTimeLabel})`
          : day.fixedEvent === 'LAB_2H'
          ? '09:00 AM – 11:00 AM Lab Shift (~2h)'
          : undefined,
      });
      return;
    }

    const nextEvent: FixedEventType =
      day.fixedEvent === targetEvent ? 'NONE' : targetEvent;
    onUpdateDay(day.dayIndex, {
      fixedEvent: nextEvent,
      fixedEventTimeLabel:
        nextEvent === 'LAB_2H'
          ? '09:00 AM – 11:00 AM Lab Shift (~2h)'
          : day.earlyEveningShutdownBadge
          ? `Early Shutdown (${shutdownTimeLabel})`
          : undefined,
      earlyMorningAnchor:
        nextEvent === 'LAB_2H' ? true : day.earlyMorningAnchor,
    });
  };

  const handleUploadIcsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      setCalendarRawInput(content);
      setImporterStatusMsg(`Loaded "${file.name}" — review detected 7-day anchors below.`);
    } catch {
      setImporterStatusMsg(`Could not read "${file.name}".`);
    }
    e.target.value = '';
  };

  const handleFetchIcsUrl = async () => {
    if (!feedUrlInput.trim() || feedLoading) return;
    setFeedLoading(true);
    setImporterStatusMsg(null);
    try {
      const icsText = await fetchIcsFeedText(feedUrlInput);
      setCalendarRawInput(icsText);
      setImporterStatusMsg('Fetched .ics calendar feed — review detected anchors below.');
    } catch (err) {
      setImporterStatusMsg(
        err instanceof Error ? err.message : 'Unable to fetch .ics feed.'
      );
    } finally {
      setFeedLoading(false);
    }
  };

  const handleApplyDetectedAnchors = () => {
    if (anchorPreview.eventsFound === 0) return;
    triggerHaptic([15]);
    let appliedCount = 0;
    for (const dp of anchorPreview.dayPreviews) {
      if (dp.matchedEvents.length === 0) continue;
      appliedCount += 1;
      const patch: Partial<PipelineDay> = {
        earlyEveningShutdownBadge: dp.earlyShutdownBadge,
        earlyMorningAnchor: dp.earlyMorningAnchor,
      };
      if (dp.suggestTaperLab) {
        patch.loadMode = 'TAPER';
        patch.baseTargetBlocks = dp.suggestedTargetBlocks ?? 8;
        patch.fixedEvent = dp.suggestedFixedEvent ?? 'LAB_2H';
        patch.fixedEventTimeLabel = dp.suggestedFixedEventTimeLabel;
        patch.modeAndAnchors = `TAPER_LAB (${dp.suggestedFixedEventTimeLabel || 'Fixed Anchor >=90m'}${
          dp.earlyShutdownBadge ? ` • Early Shutdown ${shutdownTimeLabel}` : ''
        })`;
      } else if (dp.earlyShutdownBadge) {
        patch.fixedEvent = 'EVENING_OUTING_6PM';
        patch.fixedEventTimeLabel =
          dp.suggestedFixedEventTimeLabel || `Early Shutdown (${shutdownTimeLabel})`;
        patch.eveningBridge = `Early Shutdown (${shutdownTimeLabel})`;
      }
      onUpdateDay(dp.dayIndex, patch);
    }
    setImporterStatusMsg(
      `Applied ${anchorPreview.eventsFound} calendar event(s) across ${appliedCount} day(s) in the 7-Day Pipeline.`
    );
  };

  return (
    <div className="space-y-2.5">
      {/* Toolbar Header with Calendar .ics & Schedule Text Anchor Importer Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] font-mono text-slate-400">
          7-Day Load Modes &amp; Fixed Event Anchors
        </span>
        <button
          id="btn-open-calendar-anchor-importer"
          type="button"
          onClick={() => {
            triggerHaptic([10]);
            setImporterOpen((prev) => !prev);
          }}
          className={`px-3 py-1 rounded-full border font-mono text-[11px] flex items-center gap-1.5 transition cursor-pointer ${
            importerOpen
              ? 'bg-sky-500/20 border-sky-400/50 text-sky-100'
              : 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-sky-300'
          }`}
        >
          <Upload className="w-3 h-3" />
          <span>{importerOpen ? 'Close Calendar Importer' : 'Import Calendar / Anchors'}</span>
        </button>
      </div>

      {/* Inline Calendar .ics & Schedule Text Anchor Importer Panel */}
      {importerOpen && (
        <div
          id="calendar-anchor-importer-panel"
          className="p-3.5 rounded-2xl bg-slate-950/90 border border-sky-500/35 space-y-3 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono font-bold text-sky-200 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-sky-400" />
                <span>Calendar `.ics` &amp; Schedule Text Anchor Importer (Next 7 Days)</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Flags any &gt;=90m lab/class/shift as a Fixed Anchor (suggesting <code className="text-emerald-300">TAPER_LAB</code>) and attaches <code className="text-amber-300">Early Shutdown ({shutdownTimeLabel})</code> to evening events starting 5:30 PM – 9:00 PM.
              </p>
            </div>

            <label className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 font-mono text-[11px] text-slate-200 flex items-center gap-1.5 cursor-pointer shrink-0">
              <FileUp className="w-3.5 h-3.5 text-sky-400" />
              <span>Upload `.ics` File</span>
              <input
                id="input-upload-ics-file"
                type="file"
                accept=".ics,text/calendar"
                onChange={(e) => void handleUploadIcsFile(e)}
                className="hidden"
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1.5">
              <Link2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input
                id="input-ics-feed-url"
                type="url"
                value={feedUrlInput}
                onChange={(e) => setFeedUrlInput(e.target.value)}
                placeholder="Optional: Paste .ics feed URL (https://... or webcal://...)"
                className="flex-1 bg-transparent font-mono text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
              />
            </div>
            <button
              id="btn-fetch-ics-feed"
              type="button"
              disabled={!feedUrlInput.trim() || feedLoading}
              onClick={() => void handleFetchIcsUrl()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-45 border border-slate-700 font-mono text-[11px] text-sky-200 cursor-pointer shrink-0"
            >
              {feedLoading ? 'Fetching...' : 'Load .ics URL'}
            </button>
          </div>

          <textarea
            id="textarea-calendar-schedule-input"
            rows={3}
            value={calendarRawInput}
            onChange={(e) => setCalendarRawInput(e.target.value)}
            placeholder={`Paste schedule text or raw VCALENDAR (.ics) content, e.g.:\nWed 9:00 AM - 11:00 AM Lab Shift\nFri 6:15 PM - 8:30 PM Evening Outing`}
            className="w-full rounded-xl bg-slate-900/90 border border-slate-800 p-2.5 font-mono text-[11px] text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-sky-400"
          />

          {importerStatusMsg && (
            <div className="px-2.5 py-1.5 rounded-lg bg-sky-950/50 border border-sky-500/30 font-mono text-[11px] text-sky-200">
              {importerStatusMsg}
            </div>
          )}

          {anchorPreview.eventsFound > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {anchorPreview.dayPreviews
                  .filter((dp) => dp.matchedEvents.length > 0)
                  .map((dp) => (
                    <div
                      key={dp.dayIndex}
                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1 font-mono text-[10px]"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <span className="font-bold text-slate-100">{dp.dayLabel}</span>
                        <div className="flex items-center gap-1">
                          {dp.suggestTaperLab && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/40 text-emerald-200">
                              Suggest TAPER_LAB (8b)
                            </span>
                          )}
                          {dp.earlyShutdownBadge && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/40 text-amber-200">
                              Early Shutdown ({shutdownTimeLabel})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-slate-400">
                        {dp.matchedEvents
                          .map(
                            (ev) =>
                              `${ev.timeRangeLabel} ${ev.summary} (${ev.durationMinutes}m)`
                          )
                          .join(' • ')}
                      </div>
                    </div>
                  ))}
              </div>

              <div className="flex items-center justify-between gap-2 pt-1">
                <span className="font-mono text-[11px] text-emerald-300">
                  Detected {anchorPreview.eventsFound} event(s) across {anchorPreview.daysAffected} day(s)
                </span>
                <button
                  id="btn-apply-calendar-anchors"
                  type="button"
                  onClick={handleApplyDetectedAnchors}
                  className="px-3.5 py-1.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                >
                  Apply Detected 7-Day Anchors
                </button>
              </div>
            </div>
          ) : (
            calendarRawInput.trim().length > 0 &&
            anchorPreview.warnings.length > 0 && (
              <div className="text-[11px] font-mono text-amber-300/90">
                {anchorPreview.warnings[0]}
              </div>
            )
          )}
        </div>
      )}

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
                Anchor Chips (&gt;=90m Lab / Early Shutdown {shutdownTimeLabel})
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
              const isLabActive =
                day.fixedEvent === 'LAB_2H' || day.fixedEvent === 'VOLUNTEER';
              const isEarlyShutdownActive =
                day.fixedEvent === 'EVENING_OUTING_6PM' ||
                Boolean(day.earlyEveningShutdownBadge);

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
                    <div className="flex flex-wrap items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 text-cyan-400/80 shrink-0" />
                      <span>{day.dayLabel}</span>
                      {day.isToday && (
                        <span className="px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono text-[10px]">
                          ACTIVE
                        </span>
                      )}
                      {isEarlyShutdownActive && (
                        <span
                          id={`badge-day-${day.dayIndex}-early-shutdown`}
                          className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/45 text-amber-200 font-mono text-[10px] inline-flex items-center gap-1"
                        >
                          <Clock className="w-2.5 h-2.5 text-amber-300" />
                          <span>Early Shutdown ({shutdownTimeLabel})</span>
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
                        Early Shutdown ({shutdownTimeLabel})
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
  onUnlockArchitectMode?: (source: string) => void;
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
  onUnlockArchitectMode,
  apiKeyVersion,
}) => {
  if (!isOpen) return null;

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      id="pipeline-drawer-backdrop"
      ariaLabel="Interactive 7-Day Master Pipeline Drawer"
      desktopVariant="drawer"
      maxWidthClass="w-full max-w-none"
    >
      <div className="flex-1 flex flex-col justify-between overflow-y-auto p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-sky-400" />
                <span>Interactive 7-Day Master Pipeline Table</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any day row to cycle Load Mode (Cruise / Surge / Taper), import `.ics` or schedule text anchors, and enforce the 2-day Surge circuit breaker.
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
            onUnlockArchitectMode={onUnlockArchitectMode}
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
    </MobileBottomSheet>
  );
};
