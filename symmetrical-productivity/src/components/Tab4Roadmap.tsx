import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers, Plus, X } from 'lucide-react';
import { LayoutMode, RoadmapRung, RoadmapTrack, SymmetryState, TrackId } from '../types/symmetry';
import { InlineEditableText } from './InlineEditableText';
import { triggerHaptic } from '../utils/haptics';

interface Tab4RoadmapProps {
  state: SymmetryState;
  layoutMode?: LayoutMode;
  onIncrementRungBlock: (trackId: TrackId, rungNumber: 1 | 2 | 3 | 4) => void;
  onToggleSandboxActiveWeek: (trackId: TrackId) => void;
  onUpdateRoadmapTrack?: (trackId: TrackId, patch: Partial<RoadmapTrack>) => void;
  onUpdateRoadmapRung?: (
    trackId: TrackId,
    rungNumber: 1 | 2 | 3 | 4,
    patch: Partial<RoadmapRung>
  ) => void;
  onToggleTrackSandboxType?: (trackId: TrackId) => void;
}

export const Tab4Roadmap: React.FC<Tab4RoadmapProps> = ({
  state,
  onIncrementRungBlock,
  onToggleSandboxActiveWeek,
  onUpdateRoadmapTrack,
  onUpdateRoadmapRung,
  onToggleTrackSandboxType,
}) => {
  // Track expansion: default all tracks to expanded in the 5-column full-width grid, with individual toggle support
  const [collapsedTracks, setCollapsedTracks] = useState<Record<string, boolean>>({});
  const [showArchiveDrawer, setShowArchiveDrawer] = useState(false);

  const toggleTrackRungs = (trackId: TrackId) => {
    setCollapsedTracks((prev) => ({
      ...prev,
      [trackId]: !prev[trackId],
    }));
  };

  // Compute global Input (50%) and Output (50%) ledger totals across all 5 tracks
  const totalInputBlocks = state.roadmapTracks.reduce(
    (sum, t) => sum + t.inputBlocksCredited,
    0
  );
  const totalOutputBlocks = state.roadmapTracks.reduce(
    (sum, t) => sum + t.outputBlocksCredited,
    0
  );
  const combinedBlocks = Math.max(1, totalInputBlocks + totalOutputBlocks);
  const inputSharePct = Math.round((totalInputBlocks / combinedBlocks) * 100);
  const outputSharePct = 100 - inputSharePct;

  return (
    <div className="w-full max-w-none space-y-5 animate-tab-enter pb-10">
      {/* Top Hero Ledger Card: 50% Input / 50% Output Symmetrical Ledger with Cormorant Garamond Header */}
      <section
        aria-labelledby="roadmap-ledger-heading"
        className="w-full p-6 sm:p-8 rounded-3xl bento-hero-border border border-white/[0.05] space-y-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-white/[0.05] text-[10px] font-mono uppercase tracking-widest text-cyan-200">
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>4-Rung Roadmap • 50/50 Ledger • Inline Editable</span>
            </span>
            <h2
              id="roadmap-ledger-heading"
              className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-white"
            >
              Long-Term Input &amp; Output Horizon
            </h2>
            <p className="text-xs text-slate-400">
              Auto-credits Daily Core Baseline &amp; Media to Input (50%) and Project Blocks to Output (50%). Click any Track title, subtitle, Rung horizon, or milestone bullet to edit inline.
            </p>
          </div>

          <div className="flex items-center gap-4 font-mono tabular-nums text-xs text-slate-300">
            <span>
              Input: <strong className="text-cyan-200 font-normal">{totalInputBlocks} blks ({inputSharePct}%)</strong>
            </span>
            <span className="text-slate-700">•</span>
            <span>
              Output: <strong className="text-emerald-200 font-normal">{totalOutputBlocks} blks ({outputSharePct}%)</strong>
            </span>
          </div>
        </div>

        {/* Dual 50/50 Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>Input Ledger (Baseline Floor + 3A/3B/3C Media) — Target 50%</span>
            <span>Output Ledger (Locked Project #1 + Synthesis/Build) — Target 50%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-black/50 border border-white/[0.05] overflow-hidden flex p-0.5 gap-0.5">
            <div
              className="h-full rounded-l-full bg-gradient-to-r from-cyan-500 to-sky-400 transition-all"
              style={{ width: `${inputSharePct}%` }}
              title={`Input: ${inputSharePct}%`}
            />
            <div
              className="h-full rounded-r-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all"
              style={{ width: `${outputSharePct}%` }}
              title={`Output: ${outputSharePct}%`}
            />
          </div>
        </div>
      </section>

      {/* 5 Tracks Full-Width Multi-Column Grid (Core Tracks + Zero-Quota Sandbox Tracks) */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3.5 w-full items-start">
        {state.roadmapTracks.map((track) => {
          const isSelected = !collapsedTracks[track.id];
          const isCoastingSandbox = track.isSandbox && !track.activeThisWeek;
          const inputPct =
            track.inputWeeklyTarget > 0
              ? Math.min(
                  100,
                  Math.round((track.inputBlocksCredited / track.inputWeeklyTarget) * 100)
                )
              : 100;
          const outputPct =
            track.outputWeeklyTarget > 0
              ? Math.min(
                  100,
                  Math.round((track.outputBlocksCredited / track.outputWeeklyTarget) * 100)
                )
              : 100;

          // Single status pill per track card (Rule 9 preserves sandbox status ID)
          const singleStatusText = track.isSandbox
            ? isCoastingSandbox
              ? 'Flexible Pace / Coasting in Neutral'
              : 'Active Sandbox Session'
            : track.categoryLabel;

          return (
            <section
              key={track.id}
              id={`roadmap-track-${track.id}`}
              className={`p-5 rounded-3xl bento-surface border transition-all space-y-4 ${
                isSelected
                  ? 'border-cyan-400/25 shadow-[0_18px_45px_-20px_rgba(6,182,212,0.18)]'
                  : 'border-white/[0.05] hover:border-white/[0.1]'
              }`}
            >
              {/* Clean Track Overview Header */}
              <div className="flex flex-col justify-between gap-3.5">
                <div className="text-left min-w-0 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span
                      id={track.isSandbox ? `sandbox-status-${track.id}` : undefined}
                      className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider border ${
                        track.isSandbox
                          ? isCoastingSandbox
                            ? 'bg-white/[0.03] border-white/[0.05] text-slate-300'
                            : 'bg-emerald-500/12 border-emerald-400/30 text-emerald-200'
                          : 'bg-cyan-500/10 border-white/[0.05] text-cyan-200'
                      }`}
                    >
                      {singleStatusText}
                    </span>

                    {/* Inline Toggle between Core Track & Zero-Quota Sandbox */}
                    {onToggleTrackSandboxType && (
                      <button
                        id={`btn-toggle-track-type-${track.id}`}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          triggerHaptic([10]);
                          onToggleTrackSandboxType(track.id);
                        }}
                        title="Toggle between Core Track (Weekly Quota) and Zero-Quota Sandbox Track"
                        className={`px-2 py-0.5 rounded-full font-mono text-[10px] border cursor-pointer transition ${
                          track.isSandbox
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-200'
                            : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-cyan-500/30 text-cyan-200'
                        }`}
                      >
                        {track.isSandbox ? 'Zero-Quota Sandbox ⇄ Core' : 'Core Track ⇄ Sandbox'}
                      </button>
                    )}
                  </div>

                  {/* Inline Editable Track Subtitle / Role */}
                  <div className="text-[11px] font-mono text-slate-400">
                    <InlineEditableText
                      id={`inline-track-subtitle-${track.id}`}
                      value={track.archetypeRole || track.categoryLabel}
                      onSave={(nextSubtitle) =>
                        onUpdateRoadmapTrack?.(track.id, {
                          archetypeRole: nextSubtitle,
                        })
                      }
                      textClassName="text-[11px] font-mono text-slate-400"
                      inputClassName="text-[11px] font-mono w-full"
                      ariaLabel={`Edit subtitle for ${track.name}`}
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <h3
                      onClick={() => toggleTrackRungs(track.id)}
                      className="font-serif text-xl sm:text-2xl font-medium tracking-tight text-white hover:text-cyan-100 transition cursor-pointer min-w-0"
                    >
                      <InlineEditableText
                        id={`inline-track-title-${track.id}`}
                        value={track.name}
                        onSave={(nextName) =>
                          onUpdateRoadmapTrack?.(track.id, { name: nextName })
                        }
                        textClassName="font-serif text-xl sm:text-2xl font-medium tracking-tight text-white"
                        inputClassName="text-base font-serif w-full"
                        ariaLabel={`Edit track title for ${track.name}`}
                      />
                    </h3>
                    <button
                      type="button"
                      onClick={() => toggleTrackRungs(track.id)}
                      aria-label={`Toggle rungs for ${track.name}`}
                      className="p-1 text-slate-400 hover:text-cyan-300 cursor-pointer shrink-0"
                    >
                      {isSelected ? (
                        <ChevronDown className="w-4 h-4 text-cyan-300 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Dual Input / Output Progress Bars & Controls */}
                <div className="flex flex-col gap-3 w-full">
                  <div className="space-y-2">
                    {/* Input Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                        <span>Input (50%)</span>
                        <span className="text-cyan-200">
                          {track.isSandbox
                            ? `${track.inputBlocksCredited} blks`
                            : `${track.inputBlocksCredited}/${track.inputWeeklyTarget} (${inputPct}%)`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/50 overflow-hidden">
                        <div
                          className="h-full bg-cyan-400/80 transition-all"
                          style={{ width: `${inputPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Output Bar */}
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono tabular-nums text-slate-400">
                        <span>Output (50%)</span>
                        <span className="text-emerald-200">
                          {track.isSandbox
                            ? `${track.outputBlocksCredited} blks`
                            : `${track.outputBlocksCredited}/${track.outputWeeklyTarget} (${outputPct}%)`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-black/50 overflow-hidden">
                        <div
                          className="h-full bg-emerald-400/80 transition-all"
                          style={{ width: `${outputPct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {track.isSandbox && (
                      <button
                        type="button"
                        onClick={() => onToggleSandboxActiveWeek(track.id)}
                        className="px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] text-slate-200 font-mono text-[10px] cursor-pointer transition"
                      >
                        {track.activeThisWeek ? 'Set Coasting' : 'Set Active'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleTrackRungs(track.id)}
                      className={`px-2.5 py-1 rounded-full font-mono text-[10px] border cursor-pointer transition ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-400/35 text-cyan-200'
                          : 'bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.05] text-slate-300'
                      }`}
                    >
                      {isSelected ? 'Viewing Rungs 1–4' : 'Inspect Rungs'}
                    </button>
                  </div>
                </div>
              </div>

              {/* 4-Rung Milestone Details across the column */}
              {isSelected && (
                <div className="pt-3 border-t border-white/[0.05] grid grid-cols-1 gap-3">
                  {track.rungs.map((rung) => {
                    const pct =
                      rung.targetBlocks > 0
                        ? Math.min(
                            100,
                            Math.round((rung.completedBlocks / rung.targetBlocks) * 100)
                          )
                        : 100;
                    const isOutput = rung.ledgerType === 'OUTPUT';
                    const milestones =
                      rung.milestones && rung.milestones.length > 0
                        ? rung.milestones
                        : [rung.description];

                    return (
                      <div
                        key={rung.rungNumber}
                        className="p-3.5 rounded-2xl bg-black/25 border border-white/[0.05] flex flex-col justify-between space-y-2.5"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateRoadmapRung?.(track.id, rung.rungNumber, {
                                  ledgerType: isOutput ? 'INPUT' : 'OUTPUT',
                                })
                              }
                              title="Click to toggle Rung ledger between INPUT and OUTPUT"
                              className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase border cursor-pointer transition ${
                                isOutput
                                  ? 'bg-emerald-500/10 hover:bg-emerald-500/20 border-white/[0.05] text-emerald-200'
                                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 border-white/[0.05] text-cyan-200'
                              }`}
                            >
                              Rung {rung.rungNumber} • {rung.ledgerType}
                            </button>
                            <span className="font-mono font-light tabular-nums text-xs text-white flex items-center gap-0.5">
                              <span>{rung.completedBlocks}/</span>
                              <InlineEditableText
                                id={`inline-rung-target-${track.id}-${rung.rungNumber}`}
                                value={String(rung.targetBlocks)}
                                onSave={(val) => {
                                  const parsed = parseInt(val.replace(/[^0-9]/g, ''), 10);
                                  if (!Number.isNaN(parsed) && parsed >= 0) {
                                    onUpdateRoadmapRung?.(track.id, rung.rungNumber, {
                                      targetBlocks: parsed,
                                    });
                                  }
                                }}
                                textClassName="font-mono text-xs text-white"
                                inputClassName="w-10 text-xs font-mono text-center"
                                showPencilOnHover={false}
                                ariaLabel={`Edit target blocks for Rung ${rung.rungNumber}`}
                              />
                            </span>
                          </div>

                          {/* Inline Editable Rung Time Horizon / Label */}
                          <h4 className="font-serif text-base font-medium tracking-tight text-white">
                            <InlineEditableText
                              id={`inline-rung-label-${track.id}-${rung.rungNumber}`}
                              value={rung.label}
                              onSave={(nextLabel) =>
                                onUpdateRoadmapRung?.(track.id, rung.rungNumber, {
                                  label: nextLabel,
                                })
                              }
                              textClassName="font-serif text-base font-medium tracking-tight text-white"
                              inputClassName="text-xs font-mono w-full"
                              ariaLabel={`Edit Rung ${rung.rungNumber} time horizon label`}
                            />
                          </h4>

                          {/* Inline Editable Milestone Bullets (Edit, Add, Remove) */}
                          <ul className="space-y-1.5 pt-0.5">
                            {milestones.map((bullet, bIdx) => (
                              <li
                                key={`${rung.rungNumber}_m_${bIdx}`}
                                className="text-[11px] text-slate-300 leading-relaxed flex items-start justify-between gap-1.5 group/bullet"
                              >
                                <span className="text-cyan-400 font-mono mt-0.5">•</span>
                                <div className="flex-1 min-w-0">
                                  <InlineEditableText
                                    id={`inline-rung-milestone-${track.id}-${rung.rungNumber}-${bIdx}`}
                                    value={bullet}
                                    onSave={(nextBullet) => {
                                      const updated = milestones.map((m, i) =>
                                        i === bIdx ? nextBullet : m
                                      );
                                      onUpdateRoadmapRung?.(track.id, rung.rungNumber, {
                                        milestones: updated,
                                        description: updated[0] || nextBullet,
                                      });
                                    }}
                                    textClassName="text-[11px] text-slate-300 leading-relaxed"
                                    inputClassName="text-[11px] font-mono w-full"
                                    ariaLabel={`Edit milestone bullet ${bIdx + 1} for Rung ${rung.rungNumber}`}
                                  />
                                </div>
                                {milestones.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = milestones.filter(
                                        (_, i) => i !== bIdx
                                      );
                                      onUpdateRoadmapRung?.(track.id, rung.rungNumber, {
                                        milestones: updated,
                                        description: updated[0] || rung.description,
                                      });
                                    }}
                                    title="Remove milestone bullet"
                                    className="opacity-60 group-hover/bullet:opacity-100 p-0.5 text-slate-500 hover:text-rose-300 cursor-pointer shrink-0"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </li>
                            ))}
                          </ul>

                          <button
                            id={`btn-add-rung-milestone-${track.id}-${rung.rungNumber}`}
                            type="button"
                            onClick={() => {
                              const nextBullets = [
                                ...milestones,
                                `${rung.ledgerType === 'OUTPUT' ? 'Output' : 'Input'} milestone ${
                                  milestones.length + 1
                                }`,
                              ];
                              onUpdateRoadmapRung?.(track.id, rung.rungNumber, {
                                milestones: nextBullets,
                                description: nextBullets[0] || rung.description,
                              });
                            }}
                            className="inline-flex items-center gap-1 text-[10px] font-mono text-cyan-300/80 hover:text-cyan-200 cursor-pointer pt-0.5"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            <span>+ Add Milestone</span>
                          </button>
                        </div>

                        <div className="space-y-2 pt-1">
                          <div className="w-full h-1.5 rounded-full bg-black/60 overflow-hidden">
                            <div
                              className={`h-full transition-all ${
                                isOutput ? 'bg-emerald-400' : 'bg-cyan-400'
                              }`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              onIncrementRungBlock(track.id, rung.rungNumber)
                            }
                            className="w-full py-1.5 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] font-mono text-[11px] text-slate-200 flex items-center justify-center gap-1 cursor-pointer transition"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Credit +1 {rung.ledgerType}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Persistent Completed Deliverables Ledger Archive (Collapsible Accordion) */}
      <section
        id="roadmap-completed-deliverables-archive"
        aria-labelledby="completed-deliverables-heading"
        className="w-full p-6 sm:p-8 rounded-3xl bento-surface border border-white/[0.05] space-y-4"
      >
        <button
          type="button"
          onClick={() => setShowArchiveDrawer((prev) => !prev)}
          aria-expanded={showArchiveDrawer}
          className="w-full flex items-center justify-between gap-3 text-left cursor-pointer"
        >
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300">
              Persistent Output Archive
            </span>
            <h3
              id="completed-deliverables-heading"
              className="font-serif text-2xl font-medium tracking-tight text-white mt-0.5"
            >
              Completed Deliverables Ledger ({state.completedDeliverablesLog?.length || 0})
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-white/[0.03] border border-white/[0.05] font-mono text-xs text-slate-300 flex items-center gap-1.5">
            <span>{showArchiveDrawer ? 'Hide Archive' : 'Expand Archive'}</span>
            {showArchiveDrawer ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronRight className="w-3.5 h-3.5" />
            )}
          </span>
        </button>

        {showArchiveDrawer && (
          <div className="pt-3 border-t border-white/[0.05]">
            {state.completedDeliverablesLog &&
            state.completedDeliverablesLog.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {state.completedDeliverablesLog.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-2xl bg-black/30 border border-white/[0.05] flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-serif text-lg font-medium text-white truncate">
                        {item.title}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        {item.date || item.completedDate} • {item.trackId.toUpperCase()}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-white/[0.05] font-mono tabular-nums text-xs text-emerald-200 shrink-0">
                      {item.blockCount ?? item.blocksCompleted}/{item.totalBlocks} blks
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs font-mono text-slate-400">
                No deliverables archived yet. Complete Locked Focus #1 to archive it here and credit the 4-Rung Output bar.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

