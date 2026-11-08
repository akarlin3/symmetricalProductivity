import React from 'react';
import { Undo2, X } from 'lucide-react';
import { triggerHaptic } from '../utils/haptics';

export interface UndoToastState {
  id: string;
  label: string;
  expiresAtMs: number;
}

interface UndoToastProps {
  toast: UndoToastState | null;
  secondsRemaining: number;
  onUndo: () => void;
  onDismiss: () => void;
  isEveningTheme: boolean;
}

export const UndoToast: React.FC<UndoToastProps> = ({
  toast,
  secondsRemaining,
  onUndo,
  onDismiss,
  isEveningTheme,
}) => {
  if (!toast) return null;

  return (
    <div
      id="floating-undo-toast"
      role="status"
      aria-live="polite"
      className="fixed bottom-16 sm:bottom-5 right-3 sm:right-6 z-50 w-[calc(100vw-1.5rem)] sm:w-auto animate-tab-enter"
    >
      <div
        className={`px-4 py-3 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center justify-between gap-3 font-mono text-xs ${
          isEveningTheme
            ? 'bg-[#140f0b]/90 border-amber-400/50 text-amber-100 shadow-amber-950/60'
            : 'bg-[#090f1d]/90 border-cyan-400/50 text-slate-100 shadow-cyan-950/60'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isEveningTheme
                ? 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
            }`}
          />
          <span className="truncate font-semibold" id="undo-toast-message">
            [{toast.label}]
          </span>
          <span
            className={`text-[10px] tabular-nums shrink-0 ${
              isEveningTheme ? 'text-amber-300/80' : 'text-cyan-300/80'
            }`}
          >
            ({secondsRemaining}s)
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-slate-500 hidden sm:inline">—</span>
          <button
            id="btn-undo-toast-action"
            type="button"
            onClick={() => {
              triggerHaptic([15, 30]);
              onUndo();
            }}
            className={`px-2.5 py-1 rounded-xl font-mono font-bold text-xs flex items-center gap-1 cursor-pointer transition ${
              isEveningTheme
                ? 'bg-amber-400 hover:bg-amber-300 text-stone-950'
                : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
            }`}
            title="Restore previous state (Cmd+Z / Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>[Undo]</span>
            <kbd className="hidden md:inline px-1 py-0.5 rounded bg-black/20 text-[9px]">
              ⌘Z
            </kbd>
          </button>

          <button
            id="btn-undo-toast-dismiss"
            type="button"
            onClick={onDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 cursor-pointer"
            aria-label="Dismiss undo toast"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
