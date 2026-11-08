import React from 'react';
import { Maximize2, Minimize2, PictureInPicture2 } from 'lucide-react';
import { TimerConsoleState } from '../types/symmetry';

interface DualRingTimerSvgProps {
  timer: TimerConsoleState;
  isEveningTheme?: boolean;
  formattedTime: string;
  stageBadgeText: string;
  durationPrefix?: string;
  onToggleRun?: () => void;
  onOpenMiniHudPip?: () => void;
  isMiniHudOpen?: boolean;
  autoFloatOnTabSwitch?: boolean;
  onToggleAutoFloatOnTabSwitch?: () => void;
  cinemaFocusMode?: boolean;
  onToggleCinemaFocusMode?: () => void;
  startupSeconds?: number;
  momentumSeconds?: number;
}

export const DualRingTimerSvg: React.FC<DualRingTimerSvgProps> = ({
  timer,
  isEveningTheme = false,
  formattedTime,
  stageBadgeText,
  durationPrefix,
  onToggleRun,
  onOpenMiniHudPip,
  isMiniHudOpen = false,
  autoFloatOnTabSwitch = false,
  onToggleAutoFloatOnTabSwitch,
  cinemaFocusMode = false,
  onToggleCinemaFocusMode,
  startupSeconds,
  momentumSeconds,
}) => {
  const size = 280;
  const center = size / 2;
  const outerRadius = 116;
  const innerRadius = 92;

  const outerCircumference = 2 * Math.PI * outerRadius;
  const innerCircumference = 2 * Math.PI * innerRadius;

  const mult = timer.elasticMultiplier ?? 1.0;
  const totalStartupSec =
    startupSeconds ?? (mult === 0.5 ? 180 : 300);
  const totalMomentumSec =
    momentumSeconds ?? (mult === 0.5 ? 420 : mult === 2.0 ? 2100 : 900);
  const startupMinsLabel = Math.round(totalStartupSec / 60);
  const momentumMinsLabel = Math.round(totalMomentumSec / 60);

  // Compute progress (0..1) for Inner Ring (Startup Step) and Outer Ring (Momentum)
  let innerProgress = 0;
  let outerProgress = 0;

  if (timer.mode === 'WORK_20M') {
    if (timer.workStage === 'IGNITION_5M') {
      const elapsedStartup = Math.max(
        0,
        Math.min(totalStartupSec, totalStartupSec - timer.secondsLeft)
      );
      innerProgress = Math.max(0.03, elapsedStartup / totalStartupSec);
      outerProgress = 0;
    } else {
      innerProgress = 1;
      const elapsedMomentum = Math.max(
        0,
        Math.min(totalMomentumSec, totalMomentumSec - timer.secondsLeft)
      );
      outerProgress = Math.max(0.03, elapsedMomentum / totalMomentumSec);
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
    const ratio = totalBreakSec > 0 ? Math.max(0.03, elapsed / totalBreakSec) : 0.03;
    innerProgress = ratio;
    outerProgress = ratio;
  }

  const outerDashoffset = outerCircumference * (1 - outerProgress);
  const innerDashoffset = innerCircumference * (1 - innerProgress);

  // Active stage determination
  const activeIsInner =
    timer.mode === 'WORK_20M' && timer.workStage === 'IGNITION_5M';
  const activeProgress = activeIsInner ? innerProgress : outerProgress;
  const illuminatedTickCount = Math.max(1, Math.round(activeProgress * 60));

  const tipAngleRad = (activeProgress * 360 - 90) * (Math.PI / 180);
  const tipRadius = activeIsInner ? innerRadius : outerRadius;
  const tipX = center + tipRadius * Math.cos(tipAngleRad);
  const tipY = center + tipRadius * Math.sin(tipAngleRad);

  const isWarmGlow = isEveningTheme || timer.mode === 'STRESS_RESET';

  const compactPhaseLabel =
    timer.mode === 'WORK_20M'
      ? timer.workStage === 'IGNITION_5M'
        ? `${startupMinsLabel}M STARTUP (${mult}x)`
        : `${momentumMinsLabel}M MOMENTUM (${mult}x)`
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
      className="flex flex-col items-center justify-center space-y-3.5"
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
        {/* Top-Right Floating Cinema Focus Mode Expand Button */}
        {onToggleCinemaFocusMode && (
          <button
            id="btn-cinema-focus-dial-toggle"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleCinemaFocusMode();
            }}
            aria-label="Toggle Cinema Focus Mode (F)"
            title="Toggle Cinema Focus Mode (Press F) — Dims surrounding Bento cards while keeping Chronograph, 5m Startup Script, and remaining work pill in sharp focus"
            className={`absolute -top-1 -right-1 z-30 px-2 py-1 rounded-xl border font-mono text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all duration-300 ${
              cinemaFocusMode
                ? 'bg-cyan-400 text-slate-950 border-cyan-300 shadow-[0_0_18px_rgba(56,189,248,0.5)]'
                : 'bg-white/[0.04] hover:bg-white/[0.1] border-white/[0.1] text-slate-300 hover:text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
            }`}
          >
            {cinemaFocusMode ? (
              <Minimize2 className="w-3 h-3 shrink-0" />
            ) : (
              <Maximize2 className="w-3 h-3 shrink-0" />
            )}
            <span className="hidden sm:inline">Focus</span>
            <kbd
              className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                cinemaFocusMode
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-black/40 text-slate-400'
              }`}
            >
              F
            </kbd>
          </button>
        )}

        {/* Radial Ambient Glow Behind 280x280 Chronograph Ring */}
        <div
          aria-hidden="true"
          className="absolute -inset-6 rounded-full pointer-events-none blur-2xl animate-aura transition-all duration-700"
          style={{
            background:
              activeIsInner || isWarmGlow
                ? 'radial-gradient(circle, rgba(245, 158, 11, 0.28) 0%, rgba(234, 88, 12, 0.14) 45%, rgba(6, 8, 13, 0) 75%)'
                : 'radial-gradient(circle, rgba(56, 189, 248, 0.28) 0%, rgba(99, 102, 241, 0.16) 48%, rgba(6, 8, 13, 0) 76%)',
          }}
        />

        {/* Specular Chronograph Bezel Disc Underlay */}
        <div
          aria-hidden="true"
          className={`absolute inset-2 rounded-full backdrop-blur-2xl transition-colors duration-500 ${
            isWarmGlow
              ? 'bg-gradient-to-b from-amber-500/[0.06] to-black/60 border border-amber-500/20 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.14),0_20px_50px_rgba(0,0,0,0.8)]'
              : 'bg-gradient-to-b from-white/[0.045] to-black/60 border border-white/[0.09] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12),0_20px_50px_rgba(0,0,0,0.85)]'
          }`}
        />

        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="relative z-10 overflow-visible select-none"
          role="img"
          aria-label={`Precision chronograph timer: ${stageBadgeText}, ${formattedTime} remaining`}
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
                stopColor={isWarmGlow ? '#fdba74' : '#38bdf8'}
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

            {/* Primary SVG <filter id="glow"> Drop-Shadow for Active Progress Arc */}
            <filter id="glow" x="-35%" y="-35%" width="170%" height="170%">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feDropShadow
                dx="0"
                dy="0"
                stdDeviation="3"
                floodColor={activeIsInner || isWarmGlow ? '#f59e0b' : '#38bdf8'}
                floodOpacity="0.65"
                result="dropGlow"
              />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="dropGlow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Alias for backwards compatibility */}
            <filter id="ringGlowFilter" x="-30%" y="-30%" width="160%" height="160%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* 60 Subtle Radial Chronograph Tick Marks that Illuminate Sequentially */}
          {Array.from({ length: 60 }).map((_, idx) => {
            const angle = (idx * 6 - 90) * (Math.PI / 180);
            const isMajor5 = idx % 5 === 0;
            const isQuarter15 = idx % 15 === 0;
            const isIlluminated = idx < illuminatedTickCount;

            const rInner = outerRadius + (isQuarter15 ? 8 : isMajor5 ? 9 : 10.5);
            const rOuter = outerRadius + (isQuarter15 ? 16.5 : isMajor5 ? 14.5 : 13.5);

            const litStroke =
              activeIsInner || isWarmGlow
                ? isMajor5
                  ? '#fbbf24'
                  : 'rgba(245, 158, 11, 0.82)'
                : isMajor5
                ? '#38bdf8'
                : 'rgba(56, 189, 248, 0.82)';

            const unlitStroke = isWarmGlow
              ? isMajor5
                ? 'rgba(251, 191, 36, 0.24)'
                : 'rgba(168, 162, 158, 0.11)'
              : isMajor5
              ? 'rgba(148, 163, 184, 0.26)'
              : 'rgba(148, 163, 184, 0.10)';

            return (
              <line
                key={idx}
                className="chronograph-tick"
                data-illuminated={isIlluminated ? 'true' : 'false'}
                x1={center + rInner * Math.cos(angle)}
                y1={center + rInner * Math.sin(angle)}
                x2={center + rOuter * Math.cos(angle)}
                y2={center + rOuter * Math.sin(angle)}
                stroke={isIlluminated ? litStroke : unlitStroke}
                strokeWidth={isQuarter15 ? 2.1 : isMajor5 ? 1.5 : 1}
                strokeLinecap="round"
                style={{
                  transition: 'stroke 240ms ease, opacity 240ms ease',
                }}
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
                ? 'rgba(120, 53, 15, 0.30)'
                : 'rgba(30, 41, 59, 0.65)'
            }
            strokeWidth="9"
          />

          {/* INNER RING TRACK (5m Startup Step Track) */}
          <circle
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke={
              isWarmGlow
                ? 'rgba(146, 64, 14, 0.25)'
                : 'rgba(51, 65, 85, 0.45)'
            }
            strokeWidth="7"
          />

          {/* INNER RING PROGRESS ARC (5m Startup Step — Warm Amber) */}
          <circle
            id="svg-inner-startup-arc"
            cx={center}
            cy={center}
            r={innerRadius}
            fill="none"
            stroke="url(#innerStartupAmberGrad)"
            strokeWidth="7.5"
            strokeLinecap="round"
            strokeDasharray={innerCircumference}
            strokeDashoffset={innerDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            filter={activeIsInner ? 'url(#glow)' : 'url(#ringGlowFilter)'}
            style={{
              transition: 'stroke-dashoffset 320ms cubic-bezier(0.22, 1, 0.36, 1)',
              opacity:
                timer.mode === 'WORK_20M' && timer.workStage === 'MOMENTUM_15M'
                  ? 0.82
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
            strokeWidth="9.5"
            strokeLinecap="round"
            strokeDasharray={outerCircumference}
            strokeDashoffset={outerDashoffset}
            transform={`rotate(-90 ${center} ${center})`}
            filter={!activeIsInner ? 'url(#glow)' : 'url(#ringGlowFilter)'}
            style={{
              transition: 'stroke-dashoffset 320ms cubic-bezier(0.22, 1, 0.36, 1)',
              opacity: outerProgress > 0 ? 1 : 0.16,
            }}
          />

          {/* Active Arc Tip Precision Indicator Jewel */}
          <circle
            cx={tipX}
            cy={tipY}
            r={activeIsInner ? 5.2 : 6.2}
            fill={activeIsInner ? '#fef3c7' : isWarmGlow ? '#ffedd5' : '#e0f2fe'}
            stroke={activeIsInner ? '#f59e0b' : isWarmGlow ? '#ea580c' : '#38bdf8'}
            strokeWidth="2.2"
            filter="url(#glow)"
            style={{
              transition: 'cx 320ms cubic-bezier(0.22, 1, 0.36, 1), cy 320ms cubic-bezier(0.22, 1, 0.36, 1)',
            }}
          />
        </svg>

        {/* Center Readout Overlay */}
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center px-6 text-center pointer-events-none">
          <span
            className={`px-2.5 py-0.5 rounded-full border font-mono text-[10px] uppercase tracking-widest font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)] ${
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
            className={`text-5xl font-mono font-extrabold tracking-tight tabular-nums my-2 leading-none drop-shadow-sm ${
              isWarmGlow ? 'text-amber-50' : 'text-white'
            }`}
          >
            {formattedTime}
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider">
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                timer.isRunning
                  ? activeIsInner || isWarmGlow
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-cyan-400 animate-ping'
                  : 'bg-slate-500'
              }`}
            />
            <span className={isWarmGlow ? 'text-amber-200/80' : 'text-slate-300'}>
              {timer.isRunning
                ? 'CHRONOGRAPH LIVE'
                : `CHAIN ${timer.chainedBlocksCount}/2 • READY`}
            </span>
          </div>

          {durationPrefix && (
            <span className="mt-1.5 px-2 py-0.5 rounded-md bg-black/55 border border-white/[0.09] font-mono text-[10px] tracking-tight tabular-nums text-cyan-200 font-semibold">
              {durationPrefix}
            </span>
          )}
        </div>
      </div>

      {/* Ring Legend Pills + Mini HUD (PiP) + Cinema Focus Mode Pill */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 text-[10px] font-mono">
        <span
          className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
            timer.mode === 'WORK_20M' && timer.workStage === 'IGNITION_5M'
              ? 'bg-amber-500/15 border-amber-400/50 text-amber-200 font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
              : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block shadow-[0_0_6px_#f59e0b]" />
          <span>
            Inner: {startupMinsLabel}m Startup{' '}
            {timer.mode === 'WORK_20M' && timer.workStage === 'MOMENTUM_15M'
              ? '(Done)'
              : '(IGNITION_5M)'}
          </span>
        </span>

        <span
          className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 ${
            timer.mode === 'WORK_20M' && timer.workStage === 'MOMENTUM_15M'
              ? 'bg-cyan-500/15 border-cyan-400/50 text-cyan-200 font-bold shadow-[inset_0_1px_0_0_rgba(255,255,255,0.12)]'
              : 'bg-white/[0.03] border-white/[0.08] text-slate-400'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full inline-block ${
              isWarmGlow
                ? 'bg-orange-400 shadow-[0_0_6px_#fb923c]'
                : 'bg-cyan-400 shadow-[0_0_6px_#22d3ee]'
            }`}
          />
          <span>Outer: {momentumMinsLabel}m Momentum ({mult}x)</span>
        </span>

        {onOpenMiniHudPip && (
          <button
            id="btn-mini-hud-pip"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenMiniHudPip();
            }}
            className={`px-2.5 py-1 rounded-full border flex items-center gap-1.5 cursor-pointer transition ${
              isMiniHudOpen
                ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-bold shadow-[0_0_12px_rgba(34,211,238,0.35)]'
                : 'bg-cyan-500/15 hover:bg-cyan-500/25 border-cyan-400/50 text-cyan-200 font-bold'
            }`}
            title="Pop out OS-level Always-on-Top Mini HUD (300x135 Document Picture-in-Picture or 480x220 Canvas Stream Video PiP) [Hotkey: P]"
          >
            <PictureInPicture2 className="w-3 h-3 shrink-0" />
            <span>{isMiniHudOpen ? 'Close Mini HUD' : 'Pop Out Mini HUD'}</span>
            <kbd
              className={`px-1 py-0.2 rounded text-[9px] font-mono ${
                isMiniHudOpen
                  ? 'bg-slate-950/20 text-slate-950'
                  : 'bg-black/40 text-cyan-300'
              }`}
            >
              P
            </kbd>
          </button>
        )}
      </div>

      {/* Mini HUD Auto-Pop-Out Convenience Toggle */}
      {onToggleAutoFloatOnTabSwitch && (
        <div
          id="mini-hud-auto-float-menu"
          className="flex items-center justify-center"
        >
          <label
            onClick={(e) => e.stopPropagation()}
            className="px-2.5 py-1 rounded-xl bg-white/[0.025] hover:bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-slate-300 flex items-center gap-2 cursor-pointer select-none transition"
            title="Automatically pop out the OS-level Mini HUD (or show a 1-click float bar) when switching away from this tab"
          >
            <input
              id="toggle-auto-float-mini-hud"
              type="checkbox"
              checked={autoFloatOnTabSwitch}
              onChange={() => onToggleAutoFloatOnTabSwitch()}
              className="rounded border-slate-600 bg-slate-900 text-cyan-400 focus:ring-cyan-400 cursor-pointer"
            />
            <span>Auto-float Mini HUD when switching tabs</span>
          </label>
        </div>
      )}
    </div>
  );
};
