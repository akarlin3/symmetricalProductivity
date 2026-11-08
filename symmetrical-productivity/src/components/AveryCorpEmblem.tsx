import React, { useRef, useState } from 'react';

export interface AveryCorpEmblemProps {
  /** Pixel diameter of the circular emblem container (default: 36) */
  size?: number;
  /** Render mode: 'image' uses /averycorp-emblem.jpeg; 'svg' renders the inline precision vector emblem */
  variant?: 'image' | 'svg';
  /** Crop mode for image variant: 'mark-only' zooms into the central interlocked rings & chains (scale-[1.65] -translate-y-[8%]), 'full-seal' shows the full circular seal */
  cropMode?: 'mark-only' | 'full-seal';
  /** When true (5m Startup or 15m Momentum timer active), adds subtle ambient gold/cyan radial glow and slow 60s orbital pulse */
  isTimerActive?: boolean;
  /** When true (Architect Mode unlocked), illuminates a crisp 1px metallic gold border & aura */
  architectUnlocked?: boolean;
  /** Enable floating high-resolution preview popover on hover or long-press */
  showPreviewPopover?: boolean;
  /** Optional click handler (e.g. 5-tap secret Architect Mode trigger) */
  onClick?: (e: React.MouseEvent<HTMLElement>) => void;
  /** Optional custom className on the outer wrapper */
  className?: string;
  /** Optional HTML id for testing/targeting */
  id?: string;
  /** Accessible label */
  ariaLabel?: string;
}

/**
 * High-precision inline SVG vector version of the AveryCorp Institute (Est. 2026) emblem:
 * - Deep navy circle (#121b2d)
 * - Outer gold chain-link border (#d4af37)
 * - Two crossed gold chain ellipses
 * - Two interlocked brushed-gunmetal Mobius bands
 * - Foreground polished gold ring
 */
export const AveryCorpVectorSvg: React.FC<{
  className?: string;
  isTimerActive?: boolean;
  includeOuterChain?: boolean;
}> = ({ className = 'w-full h-full', isTimerActive = false, includeOuterChain = true }) => {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="averyNavyBg" cx="50%" cy="45%" r="55%">
          <stop offset="0%" stopColor="#1b2842" />
          <stop offset="100%" stopColor="#121b2d" />
        </radialGradient>
        <linearGradient id="averyGoldPolished" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="35%" stopColor="#eab308" />
          <stop offset="70%" stopColor="#ca8a04" />
          <stop offset="100%" stopColor="#fde047" />
        </linearGradient>
        <linearGradient id="averyGunmetalLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="45%" stopColor="#475569" />
          <stop offset="80%" stopColor="#1e293b" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="averyGunmetalRight" x1="100%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0f172a" />
        </linearGradient>
      </defs>

      {/* Deep Navy Circle Base */}
      <circle cx="100" cy="100" r="96" fill="url(#averyNavyBg)" />

      {/* Outer Gold Chain-Link Perimeter */}
      {includeOuterChain && (
        <g
          className={isTimerActive ? 'origin-center animate-[spin_60s_linear_infinite]' : 'origin-center'}
        >
          <circle
            cx="100"
            cy="100"
            r="91"
            stroke="#d4af37"
            strokeWidth="3.2"
            strokeDasharray="6 3.5"
            strokeLinecap="round"
            opacity="0.92"
          />
          <circle
            cx="100"
            cy="100"
            r="88.5"
            stroke="#fef08a"
            strokeWidth="1"
            strokeDasharray="3 6.5"
            strokeLinecap="round"
            opacity="0.65"
          />
        </g>
      )}

      {/* Two Crossed Gold Chain Ellipses */}
      <g transform="rotate(-34 100 94)">
        <ellipse
          cx="100"
          cy="94"
          rx="68"
          ry="34"
          stroke="url(#averyGoldPolished)"
          strokeWidth="6"
          strokeDasharray="8 4.5"
          strokeLinecap="round"
        />
      </g>
      <g transform="rotate(34 100 94)">
        <ellipse
          cx="100"
          cy="94"
          rx="68"
          ry="34"
          stroke="url(#averyGoldPolished)"
          strokeWidth="6"
          strokeDasharray="8 4.5"
          strokeLinecap="round"
        />
      </g>

      {/* Two Interlocked Brushed-Gunmetal Mobius Bands */}
      <g transform="rotate(-18 88 92)">
        <ellipse
          cx="88"
          cy="92"
          rx="28"
          ry="48"
          stroke="url(#averyGunmetalLeft)"
          strokeWidth="13"
        />
        <ellipse
          cx="88"
          cy="92"
          rx="28"
          ry="48"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          opacity="0.45"
        />
      </g>

      <g transform="rotate(18 112 92)">
        <ellipse
          cx="112"
          cy="92"
          rx="28"
          ry="48"
          stroke="url(#averyGunmetalRight)"
          strokeWidth="13"
        />
        <ellipse
          cx="112"
          cy="92"
          rx="28"
          ry="48"
          stroke="#94a3b8"
          strokeWidth="1.5"
          opacity="0.4"
        />
      </g>

      {/* Foreground Polished Gold Ring */}
      <g transform="rotate(-24 108 106)">
        <ellipse
          cx="108"
          cy="106"
          rx="32"
          ry="44"
          stroke="#090d16"
          strokeWidth="14.5"
          opacity="0.55"
        />
        <ellipse
          cx="108"
          cy="106"
          rx="32"
          ry="44"
          stroke="url(#averyGoldPolished)"
          strokeWidth="11.5"
        />
        <ellipse
          cx="108"
          cy="106"
          rx="32"
          ry="44"
          stroke="#fef9c3"
          strokeWidth="1.4"
          opacity="0.7"
        />
      </g>
    </svg>
  );
};

export const AveryCorpEmblem: React.FC<AveryCorpEmblemProps> = ({
  size = 36,
  variant = 'image',
  cropMode = 'mark-only',
  isTimerActive = false,
  architectUnlocked = false,
  showPreviewPopover = false,
  onClick,
  className = '',
  id,
  ariaLabel = 'AveryCorp Institute Emblem',
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handleTouchStart = () => {
    if (!showPreviewPopover) return;
    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      setPopoverOpen(true);
    }, 520);
  };

  const handleTouchEnd = () => {
    clearLongPress();
  };

  const dimensionStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
  };

  const imgTransformClass =
    cropMode === 'mark-only'
      ? 'w-full h-full object-cover scale-[1.65] -translate-y-[8%]'
      : 'w-full h-full object-cover scale-[1.08]';

  const interactiveRingClasses = architectUnlocked
    ? 'ring-1 ring-amber-400/50 shadow-[0_0_15px_rgba(212,175,55,0.25)] border-amber-400/60'
    : 'border-amber-400/30 hover:border-amber-400/55 shadow-[inset_0_1px_0_0_rgba(255,251,235,0.16)]';

  const content = (
    <>
      {/* Subtle Ambient Gold/Cyan Radial Glow + 60s Orbital Pulse when Timer Active */}
      {isTimerActive && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1.5 rounded-full blur-md opacity-75 transition-opacity duration-500"
            style={{
              background:
                'radial-gradient(circle, rgba(212,175,55,0.42) 0%, rgba(56,189,248,0.28) 55%, rgba(18,27,45,0) 80%)',
            }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -inset-0.5 rounded-full border border-dashed border-amber-300/60 animate-[spin_60s_linear_infinite]"
          />
        </>
      )}

      <span
        style={dimensionStyle}
        className={`w-9 h-9 rounded-full overflow-hidden bg-[#121b2d] flex items-center justify-center relative aspect-square border transition-all duration-300 ${interactiveRingClasses} ${className}`}
      >
        {variant === 'svg' ? (
          <AveryCorpVectorSvg
            className="w-full h-full"
            isTimerActive={isTimerActive}
          />
        ) : (
          <img
            src="/averycorp-emblem.jpeg"
            alt="AveryCorp Institute Interlocked Rings & Chains Emblem"
            className={imgTransformClass}
            draggable={false}
          />
        )}
      </span>
    </>
  );

  return (
    <div
      className="relative inline-flex items-center justify-center shrink-0"
      onMouseEnter={() => {
        if (showPreviewPopover) setPopoverOpen(true);
      }}
      onMouseLeave={() => {
        if (showPreviewPopover) setPopoverOpen(false);
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {onClick ? (
        <button
          id={id}
          type="button"
          onClick={onClick}
          aria-label={ariaLabel}
          className="relative inline-flex items-center justify-center rounded-full cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/70"
        >
          {content}
        </button>
      ) : (
        <div
          id={id}
          role="img"
          aria-label={ariaLabel}
          className="relative inline-flex items-center justify-center rounded-full select-none"
        >
          {content}
        </div>
      )}

      {/* Floating High-Resolution Crest Preview Popover on Hover / Long-Press */}
      {showPreviewPopover && popoverOpen && (
        <div
          id="averycorp-emblem-preview-popover"
          role="tooltip"
          className="absolute left-0 top-full mt-2.5 z-50 w-64 p-3 rounded-2xl bg-[#0b111e]/95 backdrop-blur-2xl border border-amber-400/40 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(212,175,55,0.2)] text-left pointer-events-none animate-fadeIn"
        >
          <div className="w-full aspect-square rounded-full overflow-hidden bg-[#121b2d] border border-amber-400/50 shadow-inner flex items-center justify-center mx-auto">
            <img
              src="/averycorp-emblem.jpeg"
              alt="AveryCorp Institute Full Crest"
              className="w-full h-full object-cover scale-[1.08]"
            />
          </div>
          <div className="mt-2.5 text-center space-y-0.5">
            <div className="text-[11px] font-mono font-extrabold tracking-widest uppercase text-amber-200">
              AVERYCORP INSTITUTE
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              EST. 2026 • SYMMETRICAL ARCHITECTURE
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AveryCorpEmblem;
