import React from 'react';
import { ArrowUpRight, CheckCircle2, Layers, Plus } from 'lucide-react';
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
    <div className="space-y-6">
      {/* Top Summary Card: 50% Input / 50% Output Symmetrical Ledger */}
      <section
        aria-labelledby="roadmap-ledger-heading"
        className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="roadmap-ledger-heading"
              className="text-sm font-bold uppercase tracking-wider font-mono text-slate-200 flex items-center gap-2"
            >
              <Layers className="w-4 h-4 text-sky-400" />
              <span>4-Rung Roadmap (50% Input + 50% Output Tracker)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Auto-credits Daily Core Baseline &amp; Media to Input (50%) and Project Blocks to Output (50%).
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="px-2.5 py-1 rounded-lg bg-sky-950 border border-sky-700/60 text-sky-300">
              Input: {totalInputBlocks} blks ({inputSharePct}%)
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-700/60 text-emerald-300">
              Output: {totalOutputBlocks} blks ({outputSharePct}%)
            </span>
          </div>
        </div>

        {/* Dual 50/50 Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-[11px] font-mono text-slate-400">
            <span>INPUT LEDGER (Baseline Floor + 3A/3B/3C Media) — Target 50%</span>
            <span>OUTPUT LEDGER (Locked Project #1 + Synthesis/Build) — Target 50%</span>
          </div>
          <div className="w-full h-3 rounded-full bg-slate-950 border border-slate-800 overflow-hidden flex">
            <div
              className="h-full bg-sky-500 transition-all"
              style={{ width: `${inputSharePct}%` }}
              title={`Input: ${inputSharePct}%`}
            />
            <div
              className="h-full bg-emerald-500 transition-all"
              style={{ width: `${outputSharePct}%` }}
              title={`Output: ${outputSharePct}%`}
            />
          </div>
        </div>
      </section>

      {/* 3 Core Tracks + 2 Zero-Quota Sandbox Tracks Across Rungs 1-4 */}
      <div className="space-y-4">
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
              className={`p-5 rounded-2xl border transition space-y-4 ${
                track.isSandbox
                  ? 'bg-slate-900/60 border-slate-800/90'
                  : 'bg-slate-900/95 border-slate-800'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase ${
                      track.isSandbox
                        ? 'bg-slate-800 border border-slate-700 text-slate-300'
                        : 'bg-sky-950 border border-sky-700/60 text-sky-300'
                    }`}
                  >
                    {track.categoryLabel}
                  </span>
                  <h3 className="text-base font-bold text-slate-100">
                    {track.name}
                  </h3>

                  {/* Rule 9: Mark Sandbox Tracks as "Flexible Pace / Coasting in Neutral" during inactive weeks with zero warnings */}
                  {track.isSandbox && (
                    <span
                      id={`sandbox-status-${track.id}`}
                      className="px-2.5 py-0.5 rounded-full bg-emerald-950/60 border border-emerald-700/50 text-emerald-200 font-mono text-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>
                        {isCoastingSandbox
                          ? 'Flexible Pace / Coasting in Neutral'
                          : 'Active Sandbox Session (Zero Quota)'}
                      </span>
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                  {track.isSandbox && (
                    <button
                      type="button"
                      onClick={() => onToggleSandboxActiveWeek(track.id)}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                    >
                      {track.activeThisWeek
                        ? 'Set Coasting in Neutral'
                        : 'Mark Active This Week'}
                    </button>
                  )}
                  <span className="text-sky-300">
                    Input (50%):{' '}
                    <strong>
                      {track.inputBlocksCredited}
                      {track.inputWeeklyTarget > 0
                        ? ` / ${track.inputWeeklyTarget} blks (${inputPct}%)`
                        : ' blks (Zero Quota)'}
                    </strong>
                  </span>
                  <span className="text-emerald-300">
                    Output (50%):{' '}
                    <strong>
                      {track.outputBlocksCredited}
                      {track.outputWeeklyTarget > 0
                        ? ` / ${track.outputWeeklyTarget} blks (${outputPct}%)`
                        : ' blks (Zero Quota)'}
                    </strong>
                  </span>
                </div>
              </div>

              {/* Track Input & Output Progress Bars */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Input Credit (50% Weight)</span>
                    <span className="text-sky-300">{track.inputBlocksCredited} blocks</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-sky-500 transition-all"
                      style={{ width: `${inputPct}%` }}
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-400">
                    <span>Output Credit (50% Weight)</span>
                    <span className="text-emerald-300">
                      {track.outputBlocksCredited} blocks
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all"
                      style={{ width: `${outputPct}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* 4 Rungs Grid (Rung 1 to Rung 4) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {track.rungs.map((rung) => {
                  const rungPct = Math.min(
                    100,
                    Math.round((rung.completedBlocks / rung.targetBlocks) * 100)
                  );
                  return (
                    <div
                      key={rung.rungNumber}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between space-y-2.5"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span
                            className={`px-1.5 py-0.5 rounded font-mono text-[10px] font-bold ${
                              rung.ledgerType === 'INPUT'
                                ? 'bg-sky-950 border border-sky-700/60 text-sky-300'
                                : 'bg-emerald-950 border border-emerald-700/60 text-emerald-300'
                            }`}
                          >
                            {rung.ledgerType} (50%)
                          </span>
                          <span className="font-mono text-xs text-slate-300 font-bold">
                            {rung.completedBlocks} / {rung.targetBlocks}
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-100">
                          {rung.label}
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          {rung.description}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className={`h-full transition-all ${
                              rung.ledgerType === 'INPUT'
                                ? 'bg-sky-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${rungPct}%` }}
                          />
                        </div>
                        <button
                          id={`btn-rung-credit-${track.id}-${rung.rungNumber}`}
                          type="button"
                          onClick={() =>
                            onIncrementRungBlock(track.id, rung.rungNumber)
                          }
                          className="w-full py-1 px-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-300 font-mono text-[11px] flex items-center justify-center gap-1 cursor-pointer"
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
    </div>
  );
};
