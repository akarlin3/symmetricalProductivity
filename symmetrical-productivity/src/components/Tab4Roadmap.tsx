import React from 'react';
import { Layers, Plus } from 'lucide-react';
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
    <div className="space-y-5 animate-tab-enter pb-8">
      {/* Top Hero Ledger Card: 50% Input / 50% Output Symmetrical Ledger with Instrument Serif Header */}
      <section
        aria-labelledby="roadmap-ledger-heading"
        className="p-6 rounded-3xl bento-hero-border space-y-4"
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-cyan-300 font-bold">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span>4-RUNG ROADMAP • 50% INPUT / 50% OUTPUT LEDGER</span>
            </div>
            <h2
              id="roadmap-ledger-heading"
              className="font-serif text-3xl sm:text-4xl text-white tracking-normal mt-1"
            >
              Long-Term Symmetrical Input &amp; Output Ledger
            </h2>
            <p className="text-xs text-slate-300/85 mt-0.5">
              Auto-credits Daily Core Baseline &amp; Media to Input (50%) and Project Blocks to Output (50%).
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono tabular-nums text-xs">
            <span className="px-3 py-1.5 rounded-xl bg-cyan-500/15 border border-cyan-400/50 text-cyan-200 font-bold">
              Input: {totalInputBlocks} blks ({inputSharePct}%)
            </span>
            <span className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 font-bold">
              Output: {totalOutputBlocks} blks ({outputSharePct}%)
            </span>
          </div>
        </div>

        {/* Dual 50/50 Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-slate-300">
            <span>INPUT LEDGER (Baseline Floor + 3A/3B/3C Media) — Target 50%</span>
            <span>OUTPUT LEDGER (Locked Project #1 + Synthesis/Build) — Target 50%</span>
          </div>
          <div className="w-full h-3.5 rounded-full bg-black/50 border border-white/[0.1] overflow-hidden flex p-0.5 gap-0.5">
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

      {/* 3 Core Tracks + 2 Zero-Quota Sandbox Tracks Across Rungs 1-4 */}
      <div className="grid grid-cols-1 gap-4">
        {state.roadmapTracks.map((track) => {
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

          return (
            <section
              key={track.id}
              id={`roadmap-track-${track.id}`}
              className="p-5 sm:p-6 rounded-3xl bento-surface space-y-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase border ${
                      track.isSandbox
                        ? 'bg-white/[0.04] border-white/[0.12] text-slate-300'
                        : 'bg-cyan-500/15 border-cyan-400/45 text-cyan-200'
                    }`}
                  >
                    {track.categoryLabel}
                  </span>

                  <h3 className="font-serif text-2xl sm:text-3xl text-white">
                    {track.name}
                  </h3>

                  {/* Rule 9: Zero-Quota Sandbox Tracks marked as "Flexible Pace / Coasting in Neutral" during inactive weeks with zero warnings */}
                  {track.isSandbox && (
                    <span
                      id={`sandbox-status-${track.id}`}
                      className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] font-semibold border ${
                        isCoastingSandbox
                          ? 'bg-white/[0.04] border-white/[0.1] text-slate-300'
                          : 'bg-emerald-500/15 border-emerald-400/45 text-emerald-200'
                      }`}
                    >
                      {isCoastingSandbox
                        ? 'Flexible Pace / Coasting in Neutral'
                        : 'Active Sandbox Session'}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono tabular-nums text-xs">
                  {track.isSandbox ? (
                    <>
                      <span className="text-slate-400">
                        Zero-Quota • In: {track.inputBlocksCredited} | Out:{' '}
                        {track.outputBlocksCredited}
                      </span>
                      <button
                        type="button"
                        onClick={() => onToggleSandboxActiveWeek(track.id)}
                        className="px-2.5 py-1 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.1] text-slate-200 text-[11px] cursor-pointer"
                      >
                        {track.activeThisWeek
                          ? 'Set Coasting in Neutral'
                          : 'Mark Active This Week'}
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="px-2.5 py-1 rounded-xl bg-black/40 border border-white/[0.08] text-cyan-200">
                        Input (50%): {track.inputBlocksCredited}/{track.inputWeeklyTarget} ({inputPct}%)
                      </span>
                      <span className="px-2.5 py-1 rounded-xl bg-black/40 border border-white/[0.08] text-emerald-200">
                        Output (50%): {track.outputBlocksCredited}/{track.outputWeeklyTarget} ({outputPct}%)
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Rungs 1 -> 4 Horizontal Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                      className="p-4 rounded-2xl bg-black/30 border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)] flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono text-[10px] font-bold uppercase border ${
                              isOutput
                                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                                : 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200'
                            }`}
                          >
                            Rung {rung.rungNumber} • {rung.ledgerType}
                          </span>
                          <span className="font-mono tabular-nums text-xs font-bold text-white">
                            {rung.completedBlocks}/{rung.targetBlocks}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-white">
                          {rung.label}
                        </h4>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {rung.description}
                        </p>
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
                          className="w-full py-1.5 px-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] font-mono text-[11px] text-slate-200 flex items-center justify-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Credit +1 {rung.ledgerType} Block</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Persistent Completed Deliverables Ledger Archive */}
      <section
        id="roadmap-completed-deliverables-archive"
        aria-labelledby="completed-deliverables-heading"
        className="p-5 sm:p-6 rounded-3xl bento-surface space-y-3"
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300 font-bold">
              PERSISTENT OUTPUT ARCHIVE • COMPLETED DELIVERABLES LOG
            </span>
            <h3
              id="completed-deliverables-heading"
              className="font-serif text-2xl text-white mt-0.5"
            >
              Completed Deliverables Ledger Archive ({state.completedDeliverablesLog?.length || 0})
            </h3>
          </div>
        </div>

        {state.completedDeliverablesLog && state.completedDeliverablesLog.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {state.completedDeliverablesLog.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-2xl bg-black/35 border border-emerald-500/30 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-white truncate">
                    {item.title}
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Date: {item.date || item.completedDate} • Track: {item.trackId.toUpperCase()}
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 border border-emerald-400/40 font-mono text-xs font-bold text-emerald-200 shrink-0">
                  {item.blockCount ?? item.blocksCompleted}/{item.totalBlocks} blks
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs font-mono text-slate-400">
            No deliverables archived yet. Click &ldquo;Complete Deliverable&rdquo; on Locked Focus #1 to archive it here, credit the 4-Rung Output bar, and promote the next item from openListBacklog.
          </p>
        )}
      </section>
    </div>
  );
};
