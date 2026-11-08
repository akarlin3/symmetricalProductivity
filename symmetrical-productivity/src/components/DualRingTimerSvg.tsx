import React from 'react';
import { TimerConsoleState } from '../types/symmetry';

interface DualRingTimerSvgProps {
  timer: TimerConsoleState;
  isEveningTheme?: boolean;
  formattedTime: string;
  stageBadgeText: string;
}

export const DualRingTimerSvg: React.FC<DualRingTimerSvgProps> = ({
  timer,
  isEveningTheme = false,
  formattedTime,
  stageBadgeText,
}) => {
  const size = 268;
  const center = size / 2;
  const outerRadius = 114;
  const innerRadius = 90;

  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  // Compute progress (0..1) for Inner Ring (5m Startup Step) and Outer Ring (15m Momentum)
  let innerProgress = 0;
  let outerProgress = 0;

  if (timer.mode === 'WORK_20M') {
    if (timer.workStage === 'IGNITION_5M') {
      const elapsed5m = Math.max(0, Math.min(300, 300 - timer.secondsLeft));
      // Show a crisp 4% starter arc at 05:00 so the inner amber arc is immediately visible, then sweep to 100%
      innerProgress = Math.max(0.04, elapsed5m / 300);
      outerProgress = 0;
    } else {
      // MOMENTUM_15M: Inner 5m ring is locked at 100% complete; Outer 15m ring sweeps from 0% -> 100%
      innerProgress = 1;
      const elapsed15m = Math.max(0, Math.min(900, 900 - timer.secondsLeft));
      outerProgress = Math.max(0.03, elapsed15m / 900);
    }
  } else {
    const totalBreakSec =
      timer.mode === 'BREAK_L1'
        ? timer.l1DurationMinutes * 60
        : timer.mode === 'BREAK_L2'
        ? timer.l2DurationMinutes * 60
        : timer.mode === 'BREAK_L3'
        ? timer.l3DurationMinutes * 60
        : timer.stressDurationMinutes * 60;
    const elapsed = Math.max(0, Math.min(totalBreakSec, totalBreakSec - timer.secondsLeft));
    const ratio = totalBreakSec > 0 ? Math.max(0.04, elapsed / totalBreakSec) : 0.04;
    innerProgress = ratio;
    outerProgress = ratio;
  }

  const outerDashoffset = outerCircumference * (1 - outerProgress);
  const innerDashoffset = innerCircumference * (1 - innerProgress);

  // Compute endpoint coordinates for the active arc tip marker
  const activeIsInner =
    timer.mode === 'WORK_20M' && timer.workStage === 'IGNITION_5M';
  const tipAngleRad =
    ((activeIsInner ? innerProgress : outerProgress) * 360 - 90) * (Math.PI / 180);
  const tipRadius = activeIsInner ? innerRadius : outerRadius;
  const tipX = center + tipRadius * Math.cos(tipAngleRad);
  const tipY = center + tipRadius * Math.sin(tipAngleRad);

  return (
    <div
      id="dual-ring-svg-timer"
      className="flex flex-col items-center justify-center space-y-3"
    >
      <div className="relative flex items-center justify-center">
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="overflow-visible select-none"
          role="img"
          aria-label={`Dual-ring timer: ${stageBadgeText}, ${formattedTime} remaining`}
        >
          <defs>
            {/* Inner 5m Startup Amber Gradient */}
            <linearGradient id="innerStartupAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Outer 15m Momentum Cyan/Indigo Gradient (or Warm Terracotta in Evening mode) */}
            <linearGradient id="outerMomentumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor={
                  timer.mode === 'STRESS_RESET' || isEveningTheme
                    ? '#fb923c'
                    : '#22d3ee'
                }
              />
              <stop
                offset="100%"
                stopColor={
                  timer.mode === 'STRESS_RESET' || isEveningTheme
                    ? '#ea580c'
                    : '#6366f1'
                }
              />
            </linearGradient>
          </defs>

          {/* Subtle 12-hour / 5-minute perimeter tick marks */}
          {Array.from({ length: 12 }).map((_, idx) => {
            const angle = (idx * 30 - 90) * (Math.PI / 180);
            const r1 = outerRadius + 8;
            const r2 = outerRadius + 12;
            return (
              <line
                key={idx}
                x1={center + r1 * Math.cos(angle)}
                y1={center + r1 * Math.sin(angle)}
                x2={center + r2 * Math.cos(angle)}
                y2={center + r2 * Math.sin(angle)}
                stroke={
                  isEveningTheme
                    ? 'rgba(168, 162, 158, 0.25)'
                    : 'rgba(148, 163, 184, 0.25)'
                }
                strokeWidth={idx % 3 === 0 ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}

          {/* OUTER RING TRACK (15m Momentum / Primary Break Track) */}
          <circle
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke={
              isEveningTheme
                ? 'rgba(68, 64, 60, 0.55)'
                : 'rgba(30, 41, 59, 0.85)'
            }
            strokeWidth="10"
          />

          {/* INNER RING TRACK (5m Startup Step Track) */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke={
              isEveningTheme
                ? 'rgba(120, 53, 15, 0.35)'
                : 'rgba(51, 65, 85, 0.65)'
            }
            strokeWidth="8"
          />

          {/* INNER RING PROGRESS ARC (5m Startup Step — Warm Amber) */}
          <circle
            id="svg-inner-startup-arc"
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke="url(#innerStartupAmberGrad)"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={innerCircumference}
            strokeDashoffset={innerDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{
              transition: 'stroke-dashoffset 320ms cubic-bezier(0.22, 1, 0.36, 1)',
              opacity:
                timer.mode === 'WORK_20M' && timer.workStage === 'MOMENTUM_15M'
                  ? 0.85
                  : 1,
            }}
          />

          {/* OUTER RING PROGRESS ARC (15m Momentum Step — Cyan/Indigo) */}
          <circle
            id="svg-outer-momentum-arc"
            cx={center}
            cy={center}
            r={outerRadius}
            fill="none"
            stroke="url(#outerMomentumGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={outerCircumference}
            strokeDashoffset={outerDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            style={{
              transition: 'stroke-dashoffset 320ms cubic-bezier(0.22, 1, 0.36, 1)',
              opacity: outerProgress > 0 ? 1 : 0.15,
            }}
          />

          {/* Active Arc Tip Indicator Node */}
          <circle
            cx={tipX}
            cy={tipY}
            r={activeIsInner ? 5 : 6}
            fill={activeIsInner ? '#fde68a' : '#a5f3fc'}
            stroke={activeIsInner ? '#d97706' : '#0284c7'}
            strokeWidth="2"
            style={{
              transition: 'cx 320ms cubic-bezier(0.22, 1, 0.36, 1), cy 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </svg>

        {/* Center Readout Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
          <span
            className={`px-2 py-0.5 rounded-md border font-mono text-[10px] uppercase tracking-wider font-semibold ${
              timer.mode === 'WORK_20M' && timer.workStage === 'IGNITION_5M'
                ? 'bg-amber-950/90 border-amber-500/60 text-amber-300'
                : timer.mode === 'STRESS_RESET' || isEveningTheme
                ? 'bg-stone-900/90 border-amber-600/60 text-amber-200'
                : 'bg-slate-900/90 border-cyan-500/50 text-cyan-300'
            }`}
          >
            {timer.mode === 'WORK_20M'
              ? timer.workStage === 'IGNITION_5M'
                ? 'INNER RING • 5M STARTUP'
                : 'OUTER RING • 15M MOMENTUM'
              : timer.mode.replace('_', ' ')}
          </span>

          <div
            id="main-timer-digits"
            className={`text-4xl sm:text-5xl font-mono font-bold tabular-nums tracking-tight my-1.5 ${
              isEveningTheme ? 'text-amber-50' : 'text-slate-100'
            }`}
          >
            {formattedTime}
          </div>

          <span
            className={`text-[11px] font-mono ${
              isEveningTheme ? 'text-stone-400' : 'text-slate-400'
            }`}
          >
            {timer.isRunning ? 'RUNNING' : 'PAUSED / READY'}
          </span>
        </div>
      </div>

      {/* Ring Legend Pills */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-mono">
        <span
          className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
            timer.mode === 'WORK_20M' && timer.workStage === 'IGNITION_5M'
              ? 'bg-amber-950/70 border-amber-500/70 text-amber-200 font-bold'
              : 'bg-slate-900/70 border-slate-800 text-slate-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span>
            Inner Arc: 5m Startup{' '}
            {timer.mode === 'WORK_20M' && timer.workStage === 'MOMENTUM_15M'
              ? '(100% Complete)'
              : '(IGNITION_5M)'}
          </span>
        </span>

        <span
          className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
            timer.mode === 'WORK_20M' && timer.workStage === 'MOMENTUM_15M'
              ? 'bg-cyan-950/70 border-cyan-500/70 text-cyan-200 font-bold'
              : 'bg-slate-900/70 border-slate-800 text-slate-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block" />
          <span>Outer Arc: 15m Momentum (MOMENTUM_15M)</span>
        </span>
      </div>
    </div>
  );
};
