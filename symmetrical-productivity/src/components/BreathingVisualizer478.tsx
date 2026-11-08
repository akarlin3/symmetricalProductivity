import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, Wind } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

interface BreathingVisualizer478Props {
  id?: string;
  isActiveContext: boolean;
  defaultExpanded?: boolean;
  variant?: 'slate' | 'evening';
  compact?: boolean;
}

export const BreathingVisualizer478: React.FC<BreathingVisualizer478Props> = ({
  id = 'breathing-478-visual-pacer',
  isActiveContext,
  defaultExpanded = true,
  variant = 'slate',
  compact = false,
}) => {
  const [manualToggle, setManualToggle] = useState<boolean | null>(null);
  const [cycleElapsedSec, setCycleElapsedSec] = useState(0);

  const isEnabled = manualToggle ?? defaultExpanded;
  const activeElapsedSec = isActiveContext && isEnabled ? cycleElapsedSec : 0;

  useEffect(() => {
    if (!isActiveContext || !isEnabled) {
      return;
    }
    const anchorMs = Date.now();
    const updateCycle = () => {
      const elapsed = ((Date.now() - anchorMs) / 1000) % 19;
      setCycleElapsedSec(elapsed);
    };
    const interval = window.setInterval(updateCycle, 50);
    return () => window.clearInterval(interval);
  }, [isActiveContext, isEnabled]);

  // 4s Inhale (0..4) -> 7s Hold (4..11) -> 8s Exhale (11..19)
  let phaseName: 'Inhale' | 'Hold' | 'Exhale' = 'Inhale';
  let phaseLabel = 'Inhale (4s)';
  let phaseSecLeft = Math.max(1, Math.ceil(4 - activeElapsedSec));
  let phaseProgressPct = (activeElapsedSec / 4) * 100;
  let circleScale = 0.52 + (activeElapsedSec / 4) * 0.48; // 0.52 -> 1.00

  if (activeElapsedSec >= 4 && activeElapsedSec < 11) {
    const holdElapsed = activeElapsedSec - 4;
    phaseName = 'Hold';
    phaseLabel = 'Hold (7s)';
    phaseSecLeft = Math.max(1, Math.ceil(11 - activeElapsedSec));
    phaseProgressPct = (holdElapsed / 7) * 100;
    // Gentle sinusoidal pulse during 7s Hold
    circleScale = 1.0 + Math.sin(holdElapsed * Math.PI * 1.2) * 0.045;
  } else if (activeElapsedSec >= 11) {
    const exhaleElapsed = activeElapsedSec - 11;
    phaseName = 'Exhale';
    phaseLabel = 'Exhale (8s)';
    phaseSecLeft = Math.max(1, Math.ceil(19 - activeElapsedSec));
    phaseProgressPct = (exhaleElapsed / 8) * 100;
    circleScale = 1.0 - (exhaleElapsed / 8) * 0.48; // 1.00 -> 0.52
  }

  const isEvening = variant === 'evening';
  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset =
    ringCircumference -
    (Math.min(100, Math.max(0, phaseProgressPct)) / 100) * ringCircumference;

  return (
    <div
      id={id}
      className={`rounded-2xl border transition-all duration-300 ${
        isEvening
          ? 'bg-stone-950/90 border-amber-700/50 text-amber-100'
          : 'bg-slate-900/90 border-amber-500/40 text-slate-100'
      } ${compact ? 'p-3.5' : 'p-4'}`}
    >
      {/* Header Row with Toggle Button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-mono">
          <Wind className="w-4 h-4 text-amber-400 shrink-0" />
          <span className="font-bold text-amber-300">
            4-7-8 Breathing Visualizer
          </span>
        </div>

        <div className="flex items-center gap-2">
          {isEnabled && (
            <span className="font-mono text-xs font-bold tabular-nums text-amber-200">
              {phaseLabel} — {phaseSecLeft}s
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              triggerHaptic([15]);
              setManualToggle(!isEnabled);
            }}
            className={`px-2.5 py-1 rounded-lg border font-mono text-[11px] flex items-center gap-1 transition cursor-pointer ${
              isEnabled
                ? 'bg-amber-500/20 border-amber-500/60 text-amber-200'
                : 'bg-stone-900 border-stone-700 text-stone-400 hover:text-stone-200'
            }`}
          >
            {isEnabled ? (
              <>
                <EyeOff className="w-3 h-3" />
                <span>Hide Pacer</span>
              </>
            ) : (
              <>
                <Eye className="w-3 h-3" />
                <span>Show 4-7-8 Pacer</span>
              </>
            )}
          </button>
        </div>
      </div>

      {isEnabled && (
        <div className="mt-3 space-y-3">
          {/* Animated Expanding / Pulsing / Contracting Circle */}
          <div className="relative flex items-center justify-center py-2">
            <div className="relative w-36 h-36 flex items-center justify-center">
              {/* Outer Ambient Halo */}
              <div
                className="absolute inset-2 rounded-full pointer-events-none"
                style={{
                  transform: `scale(${circleScale * 1.08})`,
                  transition: 'transform 80ms linear',
                  background:
                    phaseName === 'Inhale'
                      ? 'radial-gradient(circle, rgba(251, 191, 36, 0.22) 0%, rgba(251, 191, 36, 0) 72%)'
                      : phaseName === 'Hold'
                      ? 'radial-gradient(circle, rgba(245, 158, 11, 0.28) 0%, rgba(217, 119, 6, 0) 75%)'
                      : 'radial-gradient(circle, rgba(56, 189, 248, 0.16) 0%, rgba(56, 189, 248, 0) 72%)',
                }}
              />

              {/* SVG Guide Ring */}
              <svg
                className="w-36 h-36 -rotate-90 relative z-10"
                viewBox="0 0 128 128"
                aria-hidden="true"
              >
                <circle
                  cx="64"
                  cy="64"
                  r={ringRadius}
                  fill="none"
                  stroke="rgba(120, 113, 108, 0.22)"
                  strokeWidth="3"
                />
                <circle
                  cx="64"
                  cy="64"
                  r={ringRadius}
                  fill="none"
                  stroke={
                    phaseName === 'Inhale'
                      ? '#fbbf24'
                      : phaseName === 'Hold'
                      ? '#f59e0b'
                      : '#eab308'
                  }
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeDasharray={ringCircumference}
                  strokeDashoffset={strokeDashoffset}
                  style={{ transition: 'stroke-dashoffset 80ms linear' }}
                />
              </svg>

              {/* Expanding / Contracting Core Sphere */}
              <div
                className="absolute w-24 h-24 rounded-full border flex flex-col items-center justify-center text-center shadow-inner z-20"
                style={{
                  transform: `scale(${circleScale})`,
                  transition: 'transform 80ms linear',
                  backgroundColor:
                    phaseName === 'Inhale'
                      ? 'rgba(245, 158, 11, 0.22)'
                      : phaseName === 'Hold'
                      ? 'rgba(217, 119, 6, 0.30)'
                      : 'rgba(180, 83, 9, 0.16)',
                  borderColor:
                    phaseName === 'Hold'
                      ? 'rgba(251, 191, 36, 0.85)'
                      : 'rgba(245, 158, 11, 0.55)',
                }}
              >
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-amber-200">
                  {phaseName}
                </span>
                <span className="font-mono text-lg font-bold tabular-nums text-amber-50 leading-tight">
                  {phaseSecLeft}s
                </span>
              </div>
            </div>
          </div>

          {/* Linear Phase Progress Bar & 4s / 7s / 8s Legend */}
          <div className="space-y-1.5">
            <div className="w-full h-2 rounded-full bg-stone-950/90 border border-stone-800/80 overflow-hidden">
              <div
                className="h-full bg-amber-400"
                style={{
                  width: `${Math.min(100, Math.max(0, phaseProgressPct))}%`,
                  transition: 'width 80ms linear',
                }}
              />
            </div>
            <div className="grid grid-cols-3 text-[10px] font-mono text-stone-400">
              <span
                className={
                  phaseName === 'Inhale' ? 'text-amber-300 font-bold' : ''
                }
              >
                Inhale 4s (Expand)
              </span>
              <span
                className={`text-center ${
                  phaseName === 'Hold' ? 'text-amber-300 font-bold' : ''
                }`}
              >
                Hold 7s (Pulse)
              </span>
              <span
                className={`text-right ${
                  phaseName === 'Exhale' ? 'text-amber-300 font-bold' : ''
                }`}
              >
                Exhale 8s (Contract)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
