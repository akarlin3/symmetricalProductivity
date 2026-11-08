import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Layers, Plus } from 'lucide-react';
import { SymmetryState, TrackId } from '../types/symmetry';

interface Tab4RoadmapProps {
  state: SymmetryState;
  onIncrementRungBlock: (trackId: TrackId, rungNumber: 1 | 2 | 3 | 4) => void;
  onToggleSandboxActiveWeek: (trackId: TrackId) => void;
}

export const Tab4Roadmap: React.FC<Tab4RoadmapProps> = ({
  state,
  onIncrementRungBlock,
  onToggleSandboxActiveWeek,
}) => {
  // Progressive disclosure: only expand the 4-Rung milestone details for the single track currently selected
  const [selectedTrackId, setSelectedTrackId] = useState<TrackId>(
    state.roadmapTracks[0]?.id || 'science'
  );
  const [showArchiveDrawer, setShowArchiveDrawer] = useState(false);

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
    <div className="max-w-5xl mx-auto space-y-6 sm:space-y-8 animate-tab-enter pb-10">
      {/* Top Hero Ledger Card: 50% Input / 50% Output Symmetrical Ledger with Cormorant Garamond Header */}
      <section
        aria-labelledby="roadmap-ledger-heading"
        className="p-8 sm:p-10 rounded-3xl bento-hero-border border border-white/[0.05] space-y-5"
      >
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-white/[0.05] text-[10px] font-mono uppercase tracking-widest text-cyan-200">
              <Layers className="w-3 h-3 text-cyan-400" />
              <span>4-Rung Roadmap • 50/50 Ledger</span>
            </span>
            <h2
              id="roadmap-ledger-heading"
              className="font-serif text-3xl sm:text-4xl font-medium tracking-tight text-white"
            >
              Long-Term Input &amp; Output Horizon
            </h2>
            <p className="text-xs text-slate-400">
              Auto-credits Daily Core Baseline &amp; Media to Input (50%) and Project Blocks to Output (50%). Select any track below to inspect its 4-Rung milestones.
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

      {/* 5 Tracks Overview (3 Core Tracks + 2 Zero-Quota Sandbox Tracks) — Only Selected Track Expands 4-Rung Milestones */}
      <div className="grid grid-cols-1 gap-6">
        {state.roadmapTracks.map((track) => {
          const isSelected = selectedTrackId === track.id;
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
              className={`p-6 sm:p-8 rounded-3xl bento-surface border transition-all space-y-5 ${
                isSelected
                  ? 'border-cyan-400/25 shadow-[0_18px_45px_-20px_rgba(6,182,212,0.18)]'
                  : 'border-white/[0.05] hover:border-white/[0.1]'
              }`}
            >
              {/* Clean Track Overview Row (Always Visible) */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                <button
                  type="button"
                  onClick={() => setSelectedTrackId(track.id)}
                  aria-expanded={isSelected}
                  className="text-left flex-1 min-w-0 space-y-1.5 cursor-pointer group"
                >
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      id={track.isSandbox ? `sandbox-status-${track.id}` : undefined}
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase tracking-wider border ${
                        track.isSandbox
                          ? isCoastingSandbox
                            ? 'bg-white/[0.03] border-white/[0.05] text-slate-300'
                            : 'bg-emerald-500/12 border-emerald-400/30 text-emerald-200'
                          : 'bg-cyan-500/10 border-white/[0.05] text-cyan-200'
                      }`}
                    >
                      {singleStatusText}
                    </span>
                    {track.archetypeRole && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {track.archetypeRole}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2.5">
                    <h3 className="font-serif text-2xl sm:text-3xl font-medium tracking-tight text-white group-hover:text-cyan-100 transition">
                      {track.name}
                    </h3>
                    {isSelected ? (
                      <ChevronDown className="w-4 h-4 text-cyan-300 shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-slate-300 shrink-0" />
                    )}
                  </div>
                </button>

                {/* Dual Input / Output Progress Bars & Controls */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:w-[440px] shrink-0">
                  <div className="flex-1 space-y-2">
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

                  <div className="flex items-center gap-2 shrink-0">
                    {track.isSandbox && (
                      <button
                        type="button"
                        onClick={() => onToggleSandboxActiveWeek(track.id)}
                        className="px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.05] text-slate-200 font-mono text-[11px] cursor-pointer transition"
                      >
                        {track.activeThisWeek ? 'Set Coasting' : 'Set Active'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setSelectedTrackId(track.id)}
                      className={`px-3.5 py-1.5 rounded-full font-mono text-[11px] border cursor-pointer transition ${
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

              {/* Progressive Disclosure: 4-Rung Milestone Details (Expanded ONLY for Selected Track) */}
              {isSelected && (
                <div className="pt-4 border-t border-white/[0.05] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {track.rungs.map((rung) => {
                    const pct =
                      rung.targetBlocks > 0
                        ? Math.min(
                            100,
                            Math.round((rung.completedBlocks / rung.targetBlocks) * 100)
                          )
                        : 100;
                    const isOutput = rung.ledgerType === 'OUTPUT';

                    return (
                      <div
                        key={rung.rungNumber}
                        className="p-4 rounded-2xl bg-black/25 border border-white/[0.05] flex flex-col justify-between space-y-3"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-full font-mono text-[10px] uppercase border ${
                                isOutput
                                  ? 'bg-emerald-500/10 border-white/[0.05] text-emerald-200'
                                  : 'bg-cyan-500/10 border-white/[0.05] text-cyan-200'
                              }`}
                            >
                              Rung {rung.rungNumber} • {rung.ledgerType}
                            </span>
                            <span className="font-mono font-light tabular-nums text-xs text-white">
                              {rung.completedBlocks}/{rung.targetBlocks}
                            </span>
                          </div>

                          <h4 className="font-serif text-lg font-medium tracking-tight text-white">
                            {rung.label}
                          </h4>
                          <p className="text-[11px] text-slate-400 leading-relaxed">
                            {rung.description}
                          </p>
                        </div>

                        <div className="space-y-2.5 pt-1">
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
        className="p-6 sm:p-8 rounded-3xl bento-surface border border-white/[0.05] space-y-4"
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
