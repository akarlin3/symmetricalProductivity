import React, { useCallback, useEffect, useRef, useState } from 'react';
import ReactDOM, { createPortal } from 'react-dom';
import {
  CornerUpLeft,
  FastForward,
  Pause,
  PictureInPicture2,
  Play,
  Sparkles,
  Tv,
  X,
} from 'lucide-react';
import { SymmetryState, TimerConsoleState } from '../types/symmetry';
import {
  computeShiftMetrics,
  getActiveBlockDurationsSeconds,
  getShrunkStartupPrompt,
} from '../state/defaultState';
import { triggerHaptic } from '../utils/haptics';

interface DocumentPictureInPictureOptions {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
  preferInitialWindowPlacement?: boolean;
}

interface DocumentPictureInPictureApi {
  requestWindow: (options?: DocumentPictureInPictureOptions) => Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPictureApi;
  }
}

export type MiniHudEngineMode = 'IDLE' | 'DOCUMENT_PIP' | 'VIDEO_STREAM_PIP';

export const AUTO_FLOAT_STORAGE_KEY = 'symmetry_auto_float_mini_hud_v1';

/**
 * Copies all <style> and <link rel="stylesheet"> nodes from document.head
 * into pipWin.document.head and applies the exact body className so Tailwind,
 * custom CSS variables, and JetBrains Mono render identically inside the OS window.
 */
export function syncStylesToPipWindow(pipWin: Window): void {
  const targetDoc = pipWin.document;
  targetDoc.title = 'Symmetry Mini HUD';
  targetDoc.documentElement.className = 'dark';

  // Clear existing cloned styles to avoid duplicates on re-sync
  targetDoc.head
    .querySelectorAll('[data-symmetry-pip-style="true"]')
    .forEach((el) => el.remove());

  // Copy all <style> and <link rel="stylesheet"> (and font preconnect) nodes from document.head
  const headNodes = document.head.querySelectorAll(
    'style, link[rel="stylesheet"], link[rel="preconnect"]'
  );
  headNodes.forEach((node) => {
    const clone = node.cloneNode(true) as HTMLElement;
    clone.setAttribute('data-symmetry-pip-style', 'true');
    targetDoc.head.appendChild(clone);
  });

  // Also sync any runtime CSSOM rules (e.g. injected via CSSStyleSheet.insertRule)
  try {
    const extraCssText: string[] = [];
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        const owner = sheet.ownerNode as HTMLElement | null;
        // If it's a <style> tag with empty textContent but active cssRules, serialize rules
        if (owner && owner.tagName === 'STYLE' && !owner.textContent?.trim() && sheet.cssRules) {
          const rulesText = Array.from(sheet.cssRules)
            .map((r) => r.cssText)
            .join('\n');
          if (rulesText) extraCssText.push(rulesText);
        }
      } catch {
        // Cross-origin stylesheet; already linked via <link rel="stylesheet"> clone above
      }
    });
    if (extraCssText.length > 0) {
      const runtimeStyle = targetDoc.createElement('style');
      runtimeStyle.setAttribute('data-symmetry-pip-style', 'true');
      runtimeStyle.textContent = extraCssText.join('\n');
      targetDoc.head.appendChild(runtimeStyle);
    }
  } catch {
    // Ignore CSSOM inspection errors
  }

  targetDoc.body.className =
    'bg-[#06080d] text-slate-100 m-0 overflow-hidden select-none';
}

function getTimerPhaseVisuals(
  timer: TimerConsoleState,
  startupSeconds = 300,
  momentumSeconds = 900
): {
  phaseKind: 'IGNITION_5M' | 'MOMENTUM_15M' | 'BREAK';
  phaseBadge: string;
  canvasPhaseLabel: string;
  accentHex: string;
  accentGlowHex: string;
  innerProgress: number;
  outerProgress: number;
} {
  if (timer.mode === 'WORK_20M') {
    const isIgnition = timer.workStage === 'IGNITION_5M';
    const totalStartup = Math.max(1, startupSeconds);
    const totalMomentum = Math.max(1, momentumSeconds);
    const startupMins = Math.round(totalStartup / 60);
    const momentumMins = Math.round(totalMomentum / 60);
    const innerProgress = isIgnition
      ? Math.min(1, Math.max(0, (totalStartup - timer.secondsLeft) / totalStartup))
      : 1;
    const outerProgress = isIgnition
      ? 0
      : Math.min(1, Math.max(0, (totalMomentum - timer.secondsLeft) / totalMomentum));

    if (isIgnition) {
      return {
        phaseKind: 'IGNITION_5M',
        phaseBadge: `${startupMins}m Startup`,
        canvasPhaseLabel: `${startupMins}M STARTUP`,
        accentHex: '#f59e0b', // Amber
        accentGlowHex: '#fbbf24',
        innerProgress,
        outerProgress,
      };
    }

    return {
      phaseKind: 'MOMENTUM_15M',
      phaseBadge: `${momentumMins}m Momentum`,
      canvasPhaseLabel: `${momentumMins}M MOMENTUM`,
      accentHex: '#22d3ee', // Cyan
      accentGlowHex: '#38bdf8',
      innerProgress: 1,
      outerProgress,
    };
  }

  const totalBreakSec =
    timer.mode === 'BREAK_L1'
      ? timer.l1DurationMinutes * 60
      : timer.mode === 'BREAK_L2'
      ? timer.l2DurationMinutes * 60
      : timer.mode === 'BREAK_L3'
      ? timer.l3DurationMinutes * 60
      : timer.stressDurationMinutes * 60;

  const breakProgress = Math.min(
    1,
    Math.max(0, (totalBreakSec - timer.secondsLeft) / Math.max(1, totalBreakSec))
  );

  const breakLabel =
    timer.mode === 'STRESS_RESET'
      ? '4-7-8 Reset'
      : timer.mode === 'BREAK_L1'
      ? `Break ${timer.l1DurationMinutes}m`
      : timer.mode === 'BREAK_L2'
      ? `Buffer ${timer.l2DurationMinutes}m`
      : `Reset ${timer.l3DurationMinutes}m`;

  return {
    phaseKind: 'BREAK',
    phaseBadge: breakLabel,
    canvasPhaseLabel:
      timer.mode === 'STRESS_RESET' ? '4-7-8 RESET' : 'BREAK RESET',
    accentHex: '#10b981', // Emerald
    accentGlowHex: '#34d399',
    innerProgress: breakProgress,
    outerProgress: breakProgress,
  };
}

function formatMMSS(secondsLeft: number): string {
  const clamped = Math.max(0, Math.floor(secondsLeft));
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Renders the offscreen 480x220 Canvas frame for Universal Video Stream PiP Fallback.
 */
function renderMiniHudToCanvas(
  canvas: HTMLCanvasElement,
  state: SymmetryState,
  durationPrefix: string
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { timer } = state;
  const activeDurations = getActiveBlockDurationsSeconds(state);
  const shrinkLevel = timer.startupShrinkLevel ?? 1;
  const displayedStartupPrompt = getShrunkStartupPrompt(
    timer.activeStartupPrompt,
    timer.activeTaskTitle,
    timer.activeTaskType,
    shrinkLevel
  );

  const W = canvas.width; // 480
  const H = canvas.height; // 220
  const visuals = getTimerPhaseVisuals(
    timer,
    activeDurations.startupSeconds,
    activeDurations.momentumSeconds
  );
  const mmss = formatMMSS(timer.secondsLeft);

  ctx.clearRect(0, 0, W, H);

  // Deep obsidian background
  ctx.fillStyle = '#06080d';
  ctx.fillRect(0, 0, W, H);

  // Subtle top ambient gradient
  const grad = ctx.createRadialGradient(W * 0.5, 0, 10, W * 0.5, 0, 260);
  if (visuals.phaseKind === 'IGNITION_5M') {
    grad.addColorStop(0, 'rgba(245, 158, 11, 0.16)');
  } else if (visuals.phaseKind === 'MOMENTUM_15M') {
    grad.addColorStop(0, 'rgba(34, 211, 238, 0.16)');
  } else {
    grad.addColorStop(0, 'rgba(16, 185, 129, 0.16)');
  }
  grad.addColorStop(1, 'rgba(6, 8, 13, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Outer card frame border
  ctx.strokeStyle =
    visuals.phaseKind === 'IGNITION_5M'
      ? 'rgba(245, 158, 11, 0.4)'
      : visuals.phaseKind === 'MOMENTUM_15M'
      ? 'rgba(34, 211, 238, 0.4)'
      : 'rgba(16, 185, 129, 0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(4, 4, W - 8, H - 8);

  // Dual-Ring Chronograph on the left
  const cx = 82;
  const cy = 110;
  const outerR = 56;
  const innerR = 40;
  const startAngle = -Math.PI / 2;

  // Outer ring background track
  ctx.beginPath();
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 8;
  ctx.stroke();

  // Inner ring background track
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 7;
  ctx.stroke();

  // Inner ring progress arc (5m Startup = Amber, or Break = Emerald)
  const innerEnd =
    startAngle + Math.max(0.02, visuals.innerProgress) * Math.PI * 2;
  ctx.beginPath();
  ctx.arc(cx, cy, innerR, startAngle, innerEnd);
  ctx.strokeStyle =
    visuals.phaseKind === 'BREAK' ? '#10b981' : '#f59e0b';
  ctx.lineWidth = 7;
  ctx.lineCap = 'round';
  ctx.stroke();

  // Outer ring progress arc (15m Momentum = Cyan, or Break = Emerald)
  if (visuals.outerProgress > 0 || visuals.phaseKind !== 'IGNITION_5M') {
    const outerEnd =
      startAngle + Math.max(0.02, visuals.outerProgress) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, startAngle, outerEnd);
    ctx.strokeStyle =
      visuals.phaseKind === 'BREAK' ? '#34d399' : '#22d3ee';
    ctx.lineWidth = 8;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Center indicator dot inside dual-ring
  ctx.beginPath();
  ctx.arc(cx, cy, 5, 0, Math.PI * 2);
  ctx.fillStyle = timer.isRunning ? visuals.accentGlowHex : '#64748b';
  ctx.fill();

  // Top Row: Phase Badge + [Xm | Xh XXm work left] Pill
  const rightX = 160;

  // Phase label pill
  ctx.fillStyle =
    visuals.phaseKind === 'IGNITION_5M'
      ? 'rgba(245, 158, 11, 0.18)'
      : visuals.phaseKind === 'MOMENTUM_15M'
      ? 'rgba(34, 211, 238, 0.18)'
      : 'rgba(16, 185, 129, 0.18)';
  ctx.fillRect(rightX, 20, 126, 24);
  ctx.strokeStyle = visuals.accentHex;
  ctx.lineWidth = 1;
  ctx.strokeRect(rightX, 20, 126, 24);

  ctx.font = '700 11px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = visuals.accentGlowHex;
  ctx.textBaseline = 'middle';
  ctx.fillText(visuals.canvasPhaseLabel, rightX + 10, 32);

  // Work left pill
  ctx.font = '700 11px "JetBrains Mono", ui-monospace, monospace';
  const pillText = durationPrefix;
  const pillWidth = Math.min(170, ctx.measureText(pillText).width + 16);
  const pillX = W - pillWidth - 16;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
  ctx.fillRect(pillX, 20, pillWidth, 24);
  ctx.strokeStyle = 'rgba(56, 189, 248, 0.35)';
  ctx.strokeRect(pillX, 20, pillWidth, 24);
  ctx.fillStyle = '#bae6fd';
  ctx.fillText(pillText, pillX + 8, 32);

  // Giant JetBrains Mono Countdown (MM:SS)
  ctx.font = '800 58px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(mmss, rightX, 112);

  // Live / Paused status tag right next to countdown
  ctx.font = '700 11px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = timer.isRunning ? visuals.accentGlowHex : '#94a3b8';
  ctx.fillText(timer.isRunning ? '● LIVE' : '❚❚ PAUSED', rightX + 195, 92);

  // Active Task Title (truncated)
  ctx.font = '600 13px "Inter", system-ui, sans-serif';
  ctx.fillStyle = '#e2e8f0';
  const maxCharsTitle = 38;
  const taskTitle =
    timer.activeTaskTitle.length > maxCharsTitle
      ? `${timer.activeTaskTitle.slice(0, maxCharsTitle - 1)}…`
      : timer.activeTaskTitle;
  ctx.fillText(taskTitle, rightX, 142);

  // Truncated 1-line 5m Startup Script
  ctx.font = '500 11px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = '#fde68a';
  const rawScript = `5m Step: ${displayedStartupPrompt}`;
  const maxCharsScript = 44;
  const scriptLine =
    rawScript.length > maxCharsScript
      ? `${rawScript.slice(0, maxCharsScript - 1)}…`
      : rawScript;
  ctx.fillText(scriptLine, rightX, 166);

  // Bottom hint bar for OS MediaSession controls
  ctx.font = '600 10px "JetBrains Mono", ui-monospace, monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText(
    'OS PiP Controls: Play/Pause Timer • Next Track (⏭) = Skip Phase',
    rightX,
    196
  );
}

/**
 * Compact Dual-Ring SVG Chronograph Progress Arc rendered inside the Document PiP Portal.
 * Amber for 5m Startup, Cyan for 15m Momentum, Emerald for Break.
 */
const MiniHudCompactDualRingSvg: React.FC<{
  timer: TimerConsoleState;
  startupSeconds?: number;
  momentumSeconds?: number;
}> = ({ timer, startupSeconds = 300, momentumSeconds = 900 }) => {
  const visuals = getTimerPhaseVisuals(timer, startupSeconds, momentumSeconds);
  const size = 54;
  const center = size / 2;
  const outerR = 23;
  const innerR = 16;
  const outerC = 2 * Math.PI * outerR;
  const innerC = 2 * Math.PI * innerR;

  const innerOffset = innerC * (1 - visuals.innerProgress);
  const outerOffset = outerC * (1 - visuals.outerProgress);

  const innerStroke =
    visuals.phaseKind === 'BREAK' ? '#10b981' : '#f59e0b';
  const outerStroke =
    visuals.phaseKind === 'BREAK' ? '#34d399' : '#22d3ee';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="shrink-0 overflow-visible"
      aria-label="Compact Dual-Ring Chronograph Progress Arc"
    >
      {/* Outer Momentum / Break Track */}
      <circle
        cx={center}
        cy={center}
        r={outerR}
        fill="none"
        stroke="rgba(255,255,255,0.09)"
        strokeWidth="4"
      />
      {/* Inner 5m Startup Track */}
      <circle
        cx={center}
        cy={center}
        r={innerR}
        fill="none"
        stroke="rgba(255,255,255,0.09)"
        strokeWidth="3.5"
      />

      {/* Inner 5m Startup Arc (Amber, or Emerald on Break) */}
      <circle
        cx={center}
        cy={center}
        r={innerR}
        fill="none"
        stroke={innerStroke}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeDasharray={innerC}
        strokeDashoffset={innerOffset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{
          transition: 'stroke-dashoffset 300ms ease, stroke 300ms ease',
          filter:
            visuals.phaseKind === 'IGNITION_5M'
              ? 'drop-shadow(0 0 4px rgba(245,158,11,0.55))'
              : undefined,
        }}
      />

      {/* Outer 15m Momentum / Break Arc (Cyan for 15m Momentum, Emerald for Break) */}
      <circle
        cx={center}
        cy={center}
        r={outerR}
        fill="none"
        stroke={outerStroke}
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={outerC}
        strokeDashoffset={outerOffset}
        transform={`rotate(-90 ${center} ${center})`}
        style={{
          transition: 'stroke-dashoffset 300ms ease, stroke 300ms ease',
          filter:
            visuals.phaseKind === 'MOMENTUM_15M'
              ? 'drop-shadow(0 0 5px rgba(34,211,238,0.55))'
              : visuals.phaseKind === 'BREAK'
              ? 'drop-shadow(0 0 5px rgba(16,185,129,0.55))'
              : undefined,
        }}
      />

      {/* Center Live Pulse Dot */}
      <circle
        cx={center}
        cy={center}
        r={2.8}
        fill={
          timer.isRunning ? visuals.accentGlowHex : 'rgba(148,163,184,0.6)'
        }
      />
    </svg>
  );
};

export interface ExternalMiniHudProps {
  state: SymmetryState;
  onToggleTimerRun: () => void;
  onFastForwardCurrentStage: () => void;
  onShrinkStartupStep: () => void;
  onNotify?: (message: string) => void;
  pipWindow: Window | null;
  setPipWindow: React.Dispatch<React.SetStateAction<Window | null>>;
  engineMode: MiniHudEngineMode;
  setEngineMode: React.Dispatch<React.SetStateAction<MiniHudEngineMode>>;
  autoFloatOnTabSwitch: boolean;
  onToggleAutoFloatOnTabSwitch: (next?: boolean) => void;
  onRequestPopOut: (options?: { forceVideoFallback?: boolean; fromVisibilityChange?: boolean }) => Promise<boolean>;
  onCloseMiniHud: () => Promise<void>;
  tabSwitchFloatPromptOpen: boolean;
  onDismissTabSwitchFloatPrompt: () => void;
}

export function useExternalMiniHudController({
  state,
  onToggleTimerRun,
  onFastForwardCurrentStage,
  onShrinkStartupStep,
  onNotify,
}: {
  state: SymmetryState;
  onToggleTimerRun: () => void;
  onFastForwardCurrentStage: () => void;
  onShrinkStartupStep: () => void;
  onNotify?: (message: string) => void;
}) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);
  const [engineMode, setEngineMode] = useState<MiniHudEngineMode>('IDLE');
  const [autoFloatOnTabSwitch, setAutoFloatOnTabSwitch] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(AUTO_FLOAT_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });
  const [tabSwitchFloatPromptOpen, setTabSwitchFloatPromptOpen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Keep latest callbacks in refs for MediaSession & PiP window listeners
  const callbacksRef = useRef({
    onToggleTimerRun,
    onFastForwardCurrentStage,
    onShrinkStartupStep,
    onNotify,
    state,
  });
  useEffect(() => {
    callbacksRef.current = {
      onToggleTimerRun,
      onFastForwardCurrentStage,
      onShrinkStartupStep,
      onNotify,
      state,
    };
  }, [onToggleTimerRun, onFastForwardCurrentStage, onShrinkStartupStep, onNotify, state]);

  const handleToggleAutoFloatOnTabSwitch = useCallback(
    (explicitNext?: boolean) => {
      setAutoFloatOnTabSwitch((prev) => {
        const next = typeof explicitNext === 'boolean' ? explicitNext : !prev;
        try {
          localStorage.setItem(AUTO_FLOAT_STORAGE_KEY, String(next));
        } catch {
          // Ignore storage error
        }
        callbacksRef.current.onNotify?.(
          next
            ? 'Enabled "Auto-float Mini HUD when switching tabs".'
            : 'Disabled "Auto-float Mini HUD when switching tabs".'
        );
        return next;
      });
    },
    []
  );

  // Continuously update the offscreen 480x220 canvas so Video Stream PiP stays live
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const draw = () => {
      if (!canvasRef.current) return;
      const metrics = computeShiftMetrics(callbacksRef.current.state);
      renderMiniHudToCanvas(
        canvasRef.current,
        callbacksRef.current.state,
        metrics.durationPrefix
      );
    };
    draw();
    if (engineMode !== 'VIDEO_STREAM_PIP') return;
    const id = window.setInterval(draw, 250);
    return () => window.clearInterval(id);
  }, [
    state.timer.secondsLeft,
    state.timer.isRunning,
    state.timer.mode,
    state.timer.workStage,
    state.timer.activeTaskTitle,
    state.timer.activeStartupPrompt,
    state.timer.startupShrinkLevel,
    state.timer.elasticMultiplier,
    state.discretionaryBlocksCompletedToday,
    state.baselineBlocks,
    engineMode,
  ]);

  // Wire navigator.mediaSession action handlers ('play', 'pause', 'nexttrack')
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) {
      return;
    }
    const ms = navigator.mediaSession;
    const metrics = computeShiftMetrics(state);
    const activeDurations = getActiveBlockDurationsSeconds(state);
    const visuals = getTimerPhaseVisuals(
      state.timer,
      activeDurations.startupSeconds,
      activeDurations.momentumSeconds
    );
    const displayedPrompt = getShrunkStartupPrompt(
      state.timer.activeStartupPrompt,
      state.timer.activeTaskTitle,
      state.timer.activeTaskType,
      state.timer.startupShrinkLevel ?? 1
    );

    try {
      if (typeof MediaMetadata !== 'undefined') {
        ms.metadata = new MediaMetadata({
          title: `${formatMMSS(state.timer.secondsLeft)} • ${visuals.phaseBadge}`,
          artist: state.timer.activeTaskTitle,
          album: `${metrics.durationPrefix} | ${displayedPrompt}`,
        });
      }
      ms.playbackState = state.timer.isRunning ? 'playing' : 'paused';
    } catch {
      // Ignore metadata errors on partial implementations
    }

    try {
      ms.setActionHandler('play', () => {
        if (!callbacksRef.current.state.timer.isRunning) {
          callbacksRef.current.onToggleTimerRun();
        }
        videoRef.current?.play().catch(() => {});
      });
      ms.setActionHandler('pause', () => {
        if (callbacksRef.current.state.timer.isRunning) {
          callbacksRef.current.onToggleTimerRun();
        }
      });
      ms.setActionHandler('nexttrack', () => {
        callbacksRef.current.onFastForwardCurrentStage();
      });
      ms.setActionHandler('previoustrack', () => {
        callbacksRef.current.onShrinkStartupStep();
      });
    } catch {
      // Ignore unsupported mediaSession actions
    }
  }, [
    state.timer.secondsLeft,
    state.timer.isRunning,
    state.timer.mode,
    state.timer.workStage,
    state.timer.activeTaskTitle,
    state.timer.activeStartupPrompt,
    state.timer.startupShrinkLevel,
    state,
  ]);

  const closeMiniHud = useCallback(async () => {
    if (typeof window === 'undefined') return;
    if (pipWindow && !pipWindow.closed) {
      try {
        pipWindow.close();
      } catch {
        // Ignore
      }
    }
    if (typeof document !== 'undefined' && document.pictureInPictureElement) {
      try {
        await document.exitPictureInPicture();
      } catch {
        // Ignore
      }
    }
    setPipWindow(null);
    setEngineMode('IDLE');
  }, [pipWindow]);

  const startCanvasVideoStreamPip = useCallback(async (): Promise<boolean> => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return false;
    }
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return false;

    const metrics = computeShiftMetrics(callbacksRef.current.state);
    renderMiniHudToCanvas(
      canvas,
      callbacksRef.current.state,
      metrics.durationPrefix
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anyCanvas = canvas as any;
    if (typeof anyCanvas.captureStream !== 'function') {
      return false;
    }

    if (!video.srcObject) {
      const stream: MediaStream = anyCanvas.captureStream(15);
      video.srcObject = stream;
    }

    await video.play();

    if (typeof video.requestPictureInPicture === 'function') {
      await video.requestPictureInPicture();
      setEngineMode('VIDEO_STREAM_PIP');
      setTabSwitchFloatPromptOpen(false);
      callbacksRef.current.onNotify?.(
        'Popped out OS-level Mini HUD via Universal Canvas Stream Video PiP (480×220).'
      );
      return true;
    }

    // Safari WebKit Presentation Mode fallback
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webkitVideo = video as any;
    if (typeof webkitVideo.webkitSetPresentationMode === 'function') {
      webkitVideo.webkitSetPresentationMode('picture-in-picture');
      setEngineMode('VIDEO_STREAM_PIP');
      setTabSwitchFloatPromptOpen(false);
      callbacksRef.current.onNotify?.(
        'Popped out OS-level Mini HUD via Safari WebKit Video PiP (480×220).'
      );
      return true;
    }

    return false;
  }, []);

  const requestPopOut = useCallback(
    async (options?: {
      forceVideoFallback?: boolean;
      fromVisibilityChange?: boolean;
    }): Promise<boolean> => {
      if (typeof window === 'undefined') return false;

      // 1. Primary Engine: Interactive React Portal via window.documentPictureInPicture
      const docPip = window.documentPictureInPicture;
      if (
        !options?.forceVideoFallback &&
        docPip &&
        typeof docPip.requestWindow === 'function'
      ) {
        try {
          const pipWin = await docPip.requestWindow({
            width: 300,
            height: 135,
          });
          syncStylesToPipWindow(pipWin);

          const handlePageHide = () => {
            setPipWindow(null);
            setEngineMode('IDLE');
          };
          pipWin.addEventListener('pagehide', handlePageHide);

          // Keyboard shortcuts directly inside the external OS window
          pipWin.addEventListener('keydown', (e: KeyboardEvent) => {
            if (e.code === 'Space' && !e.repeat) {
              e.preventDefault();
              callbacksRef.current.onToggleTimerRun();
            } else if (
              !e.metaKey &&
              !e.ctrlKey &&
              e.key.toLowerCase() === 's'
            ) {
              e.preventDefault();
              callbacksRef.current.onFastForwardCurrentStage();
            } else if (
              !e.metaKey &&
              !e.ctrlKey &&
              (e.key.toLowerCase() === 'p' || e.key === 'Escape')
            ) {
              e.preventDefault();
              window.focus();
              pipWin.close();
            }
          });

          setPipWindow(pipWin);
          setEngineMode('DOCUMENT_PIP');
          setTabSwitchFloatPromptOpen(false);
          callbacksRef.current.onNotify?.(
            'Popped out Always-on-Top OS Mini HUD (Document Picture-in-Picture 300×135).'
          );
          return true;
        } catch {
          // If Document PiP failed (e.g. lack of user activation on visibilitychange or unsupported context), try fallback
        }
      }

      // 2. Universal Fallback Engine: Canvas Stream Video PiP (captureStream(15) -> requestPictureInPicture)
      try {
        const videoOk = await startCanvasVideoStreamPip();
        if (videoOk) return true;
      } catch {
        // Video PiP also requires a user gesture in some browsers when triggered from visibilitychange
      }

      if (options?.fromVisibilityChange) {
        setTabSwitchFloatPromptOpen(true);
      } else {
        setTabSwitchFloatPromptOpen(true);
        callbacksRef.current.onNotify?.(
          'Browser requires direct gesture or PiP permission — use the 1-click Mini HUD bar.'
        );
      }
      return false;
    },
    [startCanvasVideoStreamPip]
  );

  const toggleMiniHud = useCallback(async () => {
    triggerHaptic([15]);
    const isCurrentlyOpen =
      (pipWindow && !pipWindow.closed) ||
      engineMode !== 'IDLE' ||
      (typeof document !== 'undefined' && Boolean(document.pictureInPictureElement));

    if (isCurrentlyOpen) {
      await closeMiniHud();
      callbacksRef.current.onNotify?.('Closed external OS Mini HUD.');
      return;
    }

    await requestPopOut();
  }, [pipWindow, engineMode, closeMiniHud, requestPopOut]);

  // Listen to video leavepictureinpicture event
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const onLeaveVideoPip = () => {
      setEngineMode((prev) => (prev === 'VIDEO_STREAM_PIP' ? 'IDLE' : prev));
    };
    video.addEventListener('leavepictureinpicture', onLeaveVideoPip);
    return () => {
      video.removeEventListener('leavepictureinpicture', onLeaveVideoPip);
    };
  }, []);

  // Requirement 3: Auto-float Mini HUD when switching tabs (visibilitychange + MediaSession enterpictureinpicture)
  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;

    // Register Chrome Automatic Picture-in-Picture MediaSession handler when enabled
    if (
      autoFloatOnTabSwitch &&
      typeof navigator !== 'undefined' &&
      'mediaSession' in navigator
    ) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (navigator.mediaSession as any).setActionHandler(
          'enterpictureinpicture',
          () => {
            void requestPopOut({ fromVisibilityChange: true });
          }
        );
      } catch {
        // Ignore if browser doesn't support 'enterpictureinpicture' action
      }
    }

    const handleVisibilityChange = () => {
      if (!autoFloatOnTabSwitch) return;
      if (document.visibilityState === 'hidden') {
        const alreadyOpen =
          (pipWindow && !pipWindow.closed) ||
          engineMode !== 'IDLE' ||
          Boolean(document.pictureInPictureElement);
        if (!alreadyOpen) {
          void requestPopOut({ fromVisibilityChange: true });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [autoFloatOnTabSwitch, pipWindow, engineMode, requestPopOut]);

  const isMiniHudOpen =
    Boolean(pipWindow && !pipWindow.closed) || engineMode !== 'IDLE';

  return {
    pipWindow,
    setPipWindow,
    engineMode,
    setEngineMode,
    isMiniHudOpen,
    autoFloatOnTabSwitch,
    onToggleAutoFloatOnTabSwitch: handleToggleAutoFloatOnTabSwitch,
    onRequestPopOut: requestPopOut,
    onToggleMiniHud: toggleMiniHud,
    onCloseMiniHud: closeMiniHud,
    tabSwitchFloatPromptOpen,
    onDismissTabSwitchFloatPrompt: () => setTabSwitchFloatPromptOpen(false),
    canvasRef,
    videoRef,
  };
}

/**
 * Dedicated ExternalMiniHud Component:
 * 1. Renders Interactive React Portal inside `pipWin.document.body` via `ReactDOM.createPortal`
 * 2. Hosts the offscreen `<canvas width="480" height="220">` + `<video muted playsInline>` for Universal Video Stream PiP
 * 3. Renders the 1-click Auto-Float bar when tab-switch auto-pop-out needs a user gesture
 */
export const ExternalMiniHud: React.FC<
  ExternalMiniHudProps & {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    videoRef: React.RefObject<HTMLVideoElement | null>;
  }
> = ({
  state,
  onToggleTimerRun,
  onFastForwardCurrentStage,
  onShrinkStartupStep,
  pipWindow,
  onRequestPopOut,
  onCloseMiniHud,
  tabSwitchFloatPromptOpen,
  onDismissTabSwitchFloatPrompt,
  canvasRef,
  videoRef,
}) => {
  const { timer } = state;
  const metrics = computeShiftMetrics(state);
  const activeDurations = getActiveBlockDurationsSeconds(state);
  const visuals = getTimerPhaseVisuals(
    timer,
    activeDurations.startupSeconds,
    activeDurations.momentumSeconds
  );
  const formattedCountdown = formatMMSS(timer.secondsLeft);
  const displayedStartupPrompt = getShrunkStartupPrompt(
    timer.activeStartupPrompt,
    timer.activeTaskTitle,
    timer.activeTaskType,
    timer.startupShrinkLevel ?? 1
  );

  const handleReturnToMainWindow = () => {
    triggerHaptic([10]);
    if (typeof window !== 'undefined') {
      window.focus();
    }
    void onCloseMiniHud();
  };

  const phaseBadgeClasses =
    visuals.phaseKind === 'IGNITION_5M'
      ? 'bg-amber-500/20 border-amber-400/60 text-amber-200'
      : visuals.phaseKind === 'MOMENTUM_15M'
      ? 'bg-cyan-500/20 border-cyan-400/60 text-cyan-200'
      : 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200';

  const portalNode =
    pipWindow && !pipWindow.closed
      ? (ReactDOM.createPortal || createPortal)(
          <div
            id="external-doc-pip-mini-hud"
            className="w-screen h-screen bg-[#06080d] text-slate-100 px-2.5 py-2 flex flex-col justify-between overflow-hidden select-none box-border font-mono"
          >
            {/* Top Row: Active Phase Badge + Live [Xm | Xh XXm work left] Pill */}
            <div className="flex items-center justify-between gap-1.5 min-w-0">
              <span
                id="pip-active-phase-badge"
                className={`px-2 py-0.5 rounded-full border text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 ${phaseBadgeClasses}`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    timer.isRunning
                      ? visuals.phaseKind === 'IGNITION_5M'
                        ? 'bg-amber-400 animate-ping'
                        : visuals.phaseKind === 'MOMENTUM_15M'
                        ? 'bg-cyan-400 animate-ping'
                        : 'bg-emerald-400 animate-ping'
                      : 'bg-slate-400'
                  }`}
                />
                <span>{visuals.phaseBadge}</span>
              </span>

              <span
                id="pip-work-left-pill"
                className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-400/40 text-[10px] font-bold text-sky-200 tracking-tight tabular-nums truncate"
                title="Duration-Only Remaining Work Countdown"
              >
                {metrics.durationPrefix}
              </span>
            </div>

            {/* Middle Row: Compact Dual-Ring SVG Chronograph + Giant Tabular Countdown + 1-Line 5m Startup Script */}
            <div className="flex items-center gap-2.5 min-w-0 my-0.5">
              <MiniHudCompactDualRingSvg
                timer={timer}
                startupSeconds={activeDurations.startupSeconds}
                momentumSeconds={activeDurations.momentumSeconds}
              />

              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <div className="flex items-baseline justify-between gap-1.5">
                  <span
                    id="pip-giant-countdown"
                    className="text-[28px] leading-none font-extrabold tracking-tight tabular-nums text-white"
                  >
                    {formattedCountdown}
                  </span>
                  <span className="text-[9px] uppercase tracking-wider text-slate-400 truncate">
                    {timer.activeTaskType}
                  </span>
                </div>

                {/* Truncated 1-Line 5m Startup Script */}
                <div
                  id="pip-startup-script-line"
                  className="text-[10px] text-amber-200/95 truncate mt-1"
                  title={`5m Startup Step: ${displayedStartupPrompt}`}
                >
                  <span className="text-amber-400 font-bold">5m: </span>
                  <span>{displayedStartupPrompt}</span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Interactive Controls Directly Inside Floating Window */}
            <div className="grid grid-cols-4 gap-1 pt-0.5">
              <button
                id="pip-btn-play-pause"
                type="button"
                onClick={() => {
                  triggerHaptic([12]);
                  onToggleTimerRun();
                }}
                className={`py-1 px-1.5 rounded-lg font-mono text-[10px] font-bold flex items-center justify-center gap-1 cursor-pointer ${
                  timer.isRunning
                    ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                    : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
                }`}
                title="Play/Pause Timer (Space)"
              >
                {timer.isRunning ? (
                  <>
                    <Pause className="w-2.5 h-2.5 fill-current shrink-0" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-2.5 h-2.5 fill-current shrink-0" />
                    <span>Play</span>
                  </>
                )}
              </button>

              <button
                id="pip-btn-skip-phase"
                type="button"
                onClick={() => {
                  triggerHaptic([12]);
                  onFastForwardCurrentStage();
                }}
                className="py-1 px-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.15] border border-cyan-400/40 text-cyan-200 font-mono text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                title="Skip/Complete Phase (S)"
              >
                <FastForward className="w-2.5 h-2.5 shrink-0" />
                <span>Skip</span>
              </button>

              <button
                id="pip-btn-shrink-step"
                type="button"
                onClick={() => {
                  triggerHaptic([10]);
                  onShrinkStartupStep();
                }}
                className="py-1 px-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/40 text-amber-200 font-mono text-[10px] font-bold flex items-center justify-center gap-0.5 cursor-pointer"
                title="Shrink Step: Reduce 5m Startup Script to a smaller micro-action"
              >
                <Sparkles className="w-2.5 h-2.5 shrink-0" />
                <span>Shrink</span>
              </button>

              <button
                id="pip-btn-return-main"
                type="button"
                onClick={handleReturnToMainWindow}
                className="py-1 px-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.14] border border-white/15 text-slate-200 font-mono text-[10px] font-semibold flex items-center justify-center gap-0.5 cursor-pointer"
                title="Return to Main Window"
              >
                <CornerUpLeft className="w-2.5 h-2.5 shrink-0" />
                <span>Return</span>
              </button>
            </div>
          </div>,
          pipWindow.document.body
        )
      : null;

  return (
    <>
      {portalNode}

      {/* Universal Fallback Engine: Offscreen 480x220 Canvas + Hidden Video Stream for OS Picture-in-Picture */}
      <div
        aria-hidden="true"
        className="fixed -left-[9999px] -top-[9999px] w-0 h-0 overflow-hidden pointer-events-none opacity-0"
      >
        <canvas
          ref={canvasRef}
          id="mini-hud-fallback-canvas"
          width={480}
          height={220}
        />
        <video
          ref={videoRef}
          id="mini-hud-fallback-video"
          muted
          playsInline
          width={480}
          height={220}
        />
      </div>

      {/* 1-Click Auto-Float Bar when switching tabs or when browser requests user activation */}
      {tabSwitchFloatPromptOpen && (
        <div
          id="mini-hud-one-click-float-bar"
          role="region"
          aria-label="Pop Out OS Mini HUD Prompt"
          className="fixed bottom-4 right-4 z-50 max-w-md rounded-2xl bg-[#06080d]/95 border border-cyan-400/60 shadow-[0_14px_40px_rgba(6,182,212,0.32)] backdrop-blur-2xl px-3.5 py-2.5 flex items-center justify-between gap-3 font-mono text-xs text-slate-100"
        >
          <div className="flex items-center gap-2 min-w-0">
            <PictureInPicture2 className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="min-w-0">
              <div className="font-bold text-cyan-200 truncate">
                Pop Out Always-on-Top OS Mini HUD
              </div>
              <div className="text-[10px] text-slate-400 truncate">
                {formattedCountdown} • {visuals.phaseBadge} • {metrics.durationPrefix}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              id="btn-one-click-pop-out-hud"
              type="button"
              onClick={() => {
                triggerHaptic([15]);
                void onRequestPopOut();
              }}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
              <span>Pop Out Now</span>
            </button>
            <button
              id="btn-one-click-video-pip-fallback"
              type="button"
              onClick={() => {
                triggerHaptic([12]);
                void onRequestPopOut({ forceVideoFallback: true });
              }}
              className="px-2 py-1.5 rounded-xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/15 text-slate-200 text-[10px] font-semibold flex items-center gap-1 cursor-pointer"
              title="Launch Universal Canvas Stream Video PiP (480x220)"
            >
              <Tv className="w-3 h-3 text-cyan-300" />
              <span>Video PiP</span>
            </button>
            <button
              type="button"
              onClick={onDismissTabSwitchFloatPrompt}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
              title="Dismiss prompt"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
