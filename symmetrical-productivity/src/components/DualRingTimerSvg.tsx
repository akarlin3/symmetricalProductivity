import React from 'react';
import { TimerConsoleState } from '../types/symmetry';

interface DualRingTimerSvgProps {
  timer: TimerConsoleState;
  isEveningTheme?: boolean;
  formattedTime: string;
  stageBadgeText: string;
  onToggleRun?: () => void;
}

export const DualRingTimerSvg: React.FC<DualRingTimerSvgProps> = ({
  timer,
  isEveningTheme = false,
  formattedTime,
  stageBadgeText,
  onToggleRun,
}) => {
  const size = 280;
  const center = size / 2;
  const outerRadius = 122;
  const innerRadius = 96;

  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  // Compute progress (0..1) for Inner Ring (5m Startup Step) and Outer Ring (15m Momentum)
  let innerProgress = 0;
  let outerProgress = 0;

  if (timer.mode === 'WORK_20M') {
    if (timer.workStage === 'IGNITION_5M') {
      const elapsed5m = Math.max(0, Math.min(300, 300 - timer.secondsLeft));
      innerProgress = Math.max(0.04, elapsed5m / 300);
      outerProgress = 0;
    } else {
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

  const isWarmGlow = isEveningTheme || timer.mode === 'STRESS_RESET';

  const compactPhaseLabel =
    timer.mode === 'WORK_20M'
      ? timer.workStage === 'IGNITION_5M'
        ? '5M STARTUP'
        : '15M MOMENTUM'
      : timer.mode === 'BREAK_L1'
      ? `${timer.l1DurationMinutes}M MICRO-RESET`
      : timer.mode === 'BREAK_L2'
      ? `${timer.l2DurationMinutes}M BUFFER`
      : timer.mode === 'BREAK_L3'
      ? `${timer.l3DurationMinutes}M MID-DAY RESET`
      : `${timer.stressDurationMinutes}M STRESS RESET`;

  return (
    <div
      id="dual-ring-svg-timer"
      className="flex flex-col items-center justify-center space-y-3"
    >
      <div
        onClick={onToggleRun}
        role={onToggleRun ? 'button' : undefined}
        tabIndex={onToggleRun ? 0 : undefined}
        onKeyDown={(e) => {
          if (onToggleRun && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggleRun();
          }
        }}
        className={`relative flex items-center justify-center w-[280px] h-[280px] ${
          onToggleRun ? 'cursor-pointer group' : ''
        }`}
        title={onToggleRun ? 'Click or press Space to toggle timer' : undefined}
      >
        {/* Radial Ambient Glow Behind 280x280 Ring */}
        <div
          aria-hidden="true"
          className="absolute -inset-6 rounded-full pointer-events-none blur-2xl animate-aura transition-all duration-700"
          style={{
            background: isWarmGlow
              ? 'radial-gradient(circle, rgba(245, 158, 11, 0.30) 0%, rgba(234, 88, 12, 0.16) 45%, rgba(10, 8, 7, 0) 75%)'
              : 'radial-gradient(circle, rgba(6, 182, 212, 0.28) 0%, rgba(99, 102, 241, 0.16) 48%, rgba(6, 9, 17, 0) 76%)',
          }}
        />

        {/* Subtle Glassmorphic Disc Underlay */}
        <div
          aria-hidden="true"
          className={`absolute inset-3 rounded-full backdrop-blur-xl transition-colors duration-500 ${
            isWarmGlow
              ? 'bg-amber-950/[0.18] border border-amber-500/20 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.12)]'
              : 'bg-white/[0.025] border border-white/[0.07] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.08)]'
          }`}
        />

        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="relative z-10 overflow-visible select-none"
          role="img"
          aria-label={`Dual-ring timer: ${stageBadgeText}, ${formattedTime} remaining`}
        >
          <defs>
            {/* Inner 5m Startup Amber Gradient */}
            <linearGradient id="innerStartupAmberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde68a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#d97706" />
            </linearGradient>

            {/* Outer 15m Momentum Cyan/Indigo Gradient (or Warm Terracotta in Evening mode) */}
            <linearGradient id="outerMomentumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor={isWarmGlow ? '#fdba74' : '#22d3ee'}
              />
              <stop
                offset="55%"
                stopColor={isWarmGlow ? '#f97316' : '#06b6d4'}
              />
              <stop
                offset="100%"
                stopColor={isWarmGlow ? '#c2410c' : '#6366f1'}
              />
            </linearGradient>

            <filter id="ringGlowFilter" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 24 Perimeter Precision Tick Marks */}
          {Array.from({ length: 24 }).map((_, idx) => {
            const angle = (idx * 15 - 90) * (Math.PI / 180);
            const isMajor = idx % 2 === 0;
            const r1 = outerRadius + (isMajor ? 7 : 8.5);
            const r2 = outerRadius + (isMajor ? 12.5 : 11);
            return (
              <line
                key={idx}
                x1={center + r1 * Math.cos(angle)}
                y1={center + r1 * Math.sin(angle)}
                x2={center + r2 * Math.cos(angle)}
                y2={center + r2 * Math.sin(angle)}
                stroke={
                  isWarmGlow
                    ? isMajor
                      ? 'rgba(251, 191, 36, 0.36)'
                      : 'rgba(168, 162, 158, 0.16)'
                    : isMajor
                    ? 'rgba(56, 189, 248, 0.35)'
                    : 'rgba(148, 163, 184, 0.15)'
                }
                strokeWidth={idx % 6 === 0 ? 2 : 1.2}
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
              isWarmGlow
                ? 'rgba(120, 53, 15, 0.35)'
                : 'rgba(30, 41, 59, 0.78)'
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
              isWarmGlow
                ? 'rgba(146, 64, 14, 0.28)'
                : 'rgba(51, 65, 85, 0.55)'
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
            filter="url(#ringGlowFilter)"
            style={{
              transition: 'stroke-dashoffset 320ms cubic-bezier(0.22, 1, 0.36, 1)',
              opacity:
                timer.mode === 'WORK_20M' && timer.workStage === 'MOMENTUM_15M'
                  ? 0.88
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
            filter="url(#ringGlowFilter)"
            style={{
              transition: 'stroke-dashoffset 320ms cubic-bezier(0.22, 1, 0.36, 1)',
              opacity: outerProgress > 0 ? 1 : 0.16,
            }}
          />

          {/* Active Arc Tip Indicator Node */}
          <circle
            cx={tipX}
            cy={tipY}
            r={activeIsInner ? 5.5 : 6.5}
            fill={activeIsInner ? '#fef3c7' : isWarmGlow ? '#ffedd5' : '#cffafe'}
            stroke={activeIsInner ? '#d97706' : isWarmGlow ? '#ea580c' : '#0284c7'}
            strokeWidth="2.2"
            style={{
              transition: 'cx 320ms cubic-bezier(0.22, 1, 0.36, 1), cy 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </svg>

        {/* Center Readout Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
          <span
            className={`px-2.5 py-0.5 rounded-full border font-mono text-[10px] uppercase tracking-widest font-bold shadow-sm ${
              timer.mode === 'WORK_20M' && timer.workStage === 'IGNITION_5M'
                ? 'bg-amber-500/15 border-amber-400/50 text-amber-200'
                : isWarmGlow
                ? 'bg-orange-500/15 border-amber-500/50 text-amber-200'
                : 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200'
            }`}
          >
            {compactPhaseLabel}
          </span>

          <div
            id="main-timer-digits"
            className={`text-5xl font-mono font-extrabold tabular-nums tracking-tighter my-2 leading-none drop-shadow-sm ${
              isWarmGlow ? 'text-amber-50' : 'text-white'
            }`}
          >
            {formattedTime}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                timer.isRunning
                  ? isWarmGlow
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-cyan-400 animate-ping'
                  : 'bg-slate-500'
              }`}
            />
            <span className={isWarmGlow ? 'text-amber-200/80' : 'text-slate-300'}>
              {timer.isRunning
                ? 'LIVE COUNTDOWN'
                : `CHAIN ${timer.chainedBlocksCount}/2 • READY`}
            </span>
          </div>
        </div>
      </div>

      {/* Ring Legend Pills */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono">
        <span
          className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
            timer.mode === 'WORK_20M' && timer.workStage === 'IGNITION_5M'
              ? 'bg-amber-500/15 border-amber-400/50 text-amber-200 font-bold'
              : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
          <span>
            Inner: 5m Startup{' '}
            {timer.mode === 'WORK_20M' && timer.workStage === 'MOMENTUM_15M'
              ? '(Done)'
              : '(IGNITION_5M)'}
          </span>
        </span>

        <span
          className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
            timer.mode === 'WORK_20M' && timer.workStage === 'MOMENTUM_15M'
              ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200 font-bold'
              : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              isWarmGlow ? 'bg-orange-400' : 'bg-cyan-400'
            }`}
          />
          <span>Outer: 15m Momentum</span>
        </span>
      </div>
    </div>
  );
};
