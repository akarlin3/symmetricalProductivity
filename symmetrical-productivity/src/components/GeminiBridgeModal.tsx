import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Activity,
  ArrowDownToLine,
  Check,
  ClipboardPaste,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  Share2,
  Sparkles,
  Upload,
  Wand2,
  X,
} from 'lucide-react';
import { BandwidthLevel, SymmetryState } from '../types/symmetry';
import {
  computeShiftMetrics,
  formatRolloverHourLabel,
  getLogicalDayKey,
} from '../state/defaultState';
import {
  compileFullGeminiPayload,
  formatLoadModeTitle,
  GeminiExportMode,
  MODE_A_COMMAND_PREFIX,
  MODE_B_PROMPT_PRESETS,
  parseGeminiResponseToState,
  resolveCurrentBandwidth,
} from '../utils/geminiExporter';
import { triggerHaptic } from '../utils/haptics';
import { AveryCorpEmblem } from './AveryCorpEmblem';

interface GeminiBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: SymmetryState;
  onApplyImportedState: (nextState: SymmetryState, summary: string) => void;
  onChangeBandwidth?: (bandwidth: BandwidthLevel) => void;
  onShowNotice: (msg: string) => void;
  isEveningTheme?: boolean;
}

type BridgeTabId = 'EXPORT' | 'IMPORT';

export const GeminiBridgeModal: React.FC<GeminiBridgeModalProps> = ({
  isOpen,
  onClose,
  state,
  onApplyImportedState,
  onChangeBandwidth,
  onShowNotice,
  isEveningTheme = false,
}) => {
  const [activeBridgeTab, setActiveBridgeTab] = useState<BridgeTabId>('EXPORT');
  const [selectedExportMode, setSelectedExportMode] =
    useState<GeminiExportMode>('MODE_A_SKILL_SYNC');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(
    MODE_B_PROMPT_PRESETS[0].id
  );
  const [customRecalibratePrompt, setCustomRecalibratePrompt] = useState<string>(
    MODE_B_PROMPT_PRESETS[0].prompt
  );
  const [copiedBanner, setCopiedBanner] = useState<string | null>(null);
  const [importText, setImportText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);

  const metrics = computeShiftMetrics(state);
  const rolloverHour = state.logicalDayRolloverHour ?? 4;
  const rolloverLabel = formatRolloverHourLabel(rolloverHour);
  const logicalDate =
    state.logicalDayKey || getLogicalDayKey(new Date(), rolloverHour);
  const currentBandwidth = resolveCurrentBandwidth(state);
  const loadModeLabel = formatLoadModeTitle(state.loadMode, state.cruisePlus);

  const todayLogEntries = (state.todayBlockLog || []).filter(
    (e) => !e.logicalDate || e.logicalDate === logicalDate
  );
  const loggedMinutes = Math.max(
    metrics.totalCompletedBlocks * 20,
    todayLogEntries.reduce((sum, e) => sum + (Number(e.durationMinutes) || 20), 0)
  );
  const liveCountdownBadge = `[${loggedMinutes}m logged | ${metrics.remainingWorkFormatted}]`;

  const compiledPayload = useMemo(() => {
    return compileFullGeminiPayload(state, selectedExportMode, {
      customPrompt: customRecalibratePrompt,
      bandwidth: currentBandwidth,
    });
  }, [state, selectedExportMode, customRecalibratePrompt, currentBandwidth]);

  // Live preview of detected sections when user pastes into the Reverse Bridge tab
  const liveImportInspection = useMemo(() => {
    const trimmed = importText.trim();
    if (!trimmed) return null;
    try {
      const result = parseGeminiResponseToState(trimmed, state);
      return {
        valid: true,
        changes: result.appliedChanges,
        previewState: result.nextState,
      };
    } catch (err) {
      return {
        valid: false,
        error: err instanceof Error ? err.message : 'Unrecognized format',
        changes: [] as string[],
      };
    }
  }, [importText, state]);

  useEffect(() => {
    if (!copiedBanner) return;
    const id = window.setTimeout(() => setCopiedBanner(null), 4000);
    return () => window.clearTimeout(id);
  }, [copiedBanner]);

  const copyTextToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback textarea copy
    }
    try {
      if (typeof document !== 'undefined') {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        return true;
      }
    } catch {
      return false;
    }
    return false;
  };

  const launchGeminiWebOrMobileShare = async (
    payload: string,
    toastMessage: string,
    preferNativeShareOnMobile = false
  ) => {
    triggerHaptic([15, 30]);
    await copyTextToClipboard(payload);
    setCopiedBanner(toastMessage);
    onShowNotice(toastMessage);

    const isMobileAndroidOrIos =
      typeof navigator !== 'undefined' &&
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');

    if (
      preferNativeShareOnMobile &&
      isMobileAndroidOrIos &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      try {
        await navigator.share({
          title: 'Symmetrical Productivity State',
          text: payload,
        });
        return;
      } catch {
        // User dismissed share sheet or share failed; fall back to opening Gemini web app
      }
    }

    if (typeof window !== 'undefined') {
      window.open('https://gemini.google.com/app', '_blank', 'noopener,noreferrer');
    }
  };

  // Mode A: 1-Click Copy + Launch `wl-balancer` Skill State
  const handleModeASyncSkill = async (launchBrowser: boolean) => {
    setSelectedExportMode('MODE_A_SKILL_SYNC');
    const payload = compileFullGeminiPayload(state, 'MODE_A_SKILL_SYNC', {
      bandwidth: currentBandwidth,
    });
    const msg =
      'Copied wl-balancer skill sync command + 3-Part state.md! Paste (Cmd+V) into Gemini.';
    if (launchBrowser) {
      await launchGeminiWebOrMobileShare(payload, msg, false);
    } else {
      triggerHaptic([12]);
      await copyTextToClipboard(payload);
      setCopiedBanner(msg);
      onShowNotice(msg);
    }
  };

  // Mode B: Ask Gemini to Recalibrate / Plan From Here
  const handleModeBRecalibrate = async (launchBrowser: boolean) => {
    setSelectedExportMode('MODE_B_RECALIBRATE');
    const payload = compileFullGeminiPayload(state, 'MODE_B_RECALIBRATE', {
      customPrompt: customRecalibratePrompt,
      bandwidth: currentBandwidth,
    });
    const msg = `Copied Recalibration Prompt ("${customRecalibratePrompt.slice(
      0,
      44
    )}...") + full state! Paste (Cmd+V) into Gemini.`;
    if (launchBrowser) {
      await launchGeminiWebOrMobileShare(payload, msg, false);
    } else {
      triggerHaptic([12]);
      await copyTextToClipboard(payload);
      setCopiedBanner(msg);
      onShowNotice(msg);
    }
  };

  // Mode C: Copy & Open Gemini (`gemini.google.com`) or Android Share
  const handleModeCCopyAndOpen = async (forceNativeShare = false) => {
    const modeToUse =
      selectedExportMode === 'MODE_D_JSON' ? 'MODE_C_COPY_OPEN' : selectedExportMode;
    const payload = compileFullGeminiPayload(state, modeToUse, {
      customPrompt: customRecalibratePrompt,
      bandwidth: currentBandwidth,
    });
    const msg = 'Copied full state! Paste (Cmd+V) into Gemini';

    if (
      forceNativeShare &&
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function'
    ) {
      triggerHaptic([15]);
      await copyTextToClipboard(payload);
      setCopiedBanner(msg);
      onShowNotice(msg);
      try {
        await navigator.share({
          title: 'Symmetrical Productivity State',
          text: payload,
        });
        return;
      } catch {
        // Fallback if share sheet canceled
      }
    }

    await launchGeminiWebOrMobileShare(payload, msg, true);
  };

  // Mode D: Download `state.md` or `symmetrical-export.json`
  const handleModeDDownload = (format: 'MARKDOWN' | 'JSON') => {
    triggerHaptic([12]);
    const isJson = format === 'JSON';
    const nextMode: GeminiExportMode = isJson ? 'MODE_D_JSON' : 'MODE_D_MARKDOWN';
    setSelectedExportMode(nextMode);

    const content = isJson
      ? compileFullGeminiPayload(state, 'MODE_D_JSON')
      : compileFullGeminiPayload(state, 'MODE_D_MARKDOWN', {
          bandwidth: currentBandwidth,
        });

    const filename = isJson ? 'symmetrical-export.json' : 'state.md';
    const mimeType = isJson
      ? 'application/json;charset=utf-8'
      : 'text/markdown;charset=utf-8';

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }

    const msg = isJson
      ? 'Downloaded symmetrical-export.json backup.'
      : 'Downloaded 3-Part state.md (ready for Gemini or NotebookLM).';
    setCopiedBanner(msg);
    onShowNotice(msg);
  };

  // Reverse Bridge: Parse & Apply pasted response from Gemini
  const handleParseAndApplyImport = () => {
    setImportError(null);
    try {
      const { nextState, appliedChanges } = parseGeminiResponseToState(
        importText,
        state
      );
      triggerHaptic([20, 40]);
      const summary = appliedChanges.join(' • ');
      onApplyImportedState(nextState, summary);
      onShowNotice(`Synced from Gemini: ${summary}`);
      onClose();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : 'Could not parse Gemini response. Paste state.md or a JSON block.';
      setImportError(message);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          id="gemini-bridge-modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
        >
          <motion.div
            id="gemini-bridge-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Export to Gemini & Bidirectional Sync Hub"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-5xl rounded-3xl border shadow-[0_25px_80px_-15px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[92vh] ${
              isEveningTheme
                ? 'bg-[#0c0a08]/95 border-amber-500/25 text-amber-50'
                : 'bg-slate-950/95 border-sky-500/30 text-slate-100'
            }`}
          >
            {/* Modal Header */}
            <div
              className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
                isEveningTheme
                  ? 'border-amber-500/15 bg-amber-950/20'
                  : 'border-white/10 bg-sky-950/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <AveryCorpEmblem
                  size={40}
                  variant="image"
                  cropMode="mark-only"
                  ariaLabel="AveryCorp Institute Sync with Gemini Seal"
                />
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight">
                      Export to Gemini &amp; Bidirectional Sync Hub
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono uppercase bg-sky-500/20 border border-sky-400/40 text-sky-200">
                      wl-balancer Bridge
                    </span>
                    <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/15 text-[10px] font-mono text-slate-300">
                      ⌘G
                    </kbd>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    100% lossless 3-Part <code className="text-sky-300">state.md</code> + JSON compiler and reverse state parser for Gemini web &amp; mobile.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Bandwidth Selector (`Sharp` / `Steady` / `Low`) */}
                <div className="flex items-center gap-1 bg-black/40 border border-white/10 rounded-xl p-1">
                  <span className="text-[10px] font-mono text-slate-400 px-1.5 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    <span>Bandwidth:</span>
                  </span>
                  {(['Sharp', 'Steady', 'Low'] as BandwidthLevel[]).map((bw) => {
                    const active = currentBandwidth === bw;
                    return (
                      <button
                        key={bw}
                        id={`btn-gemini-bandwidth-${bw.toLowerCase()}`}
                        type="button"
                        onClick={() => {
                          triggerHaptic([10]);
                          onChangeBandwidth?.(bw);
                        }}
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-semibold transition cursor-pointer ${
                          active
                            ? bw === 'Sharp'
                              ? 'bg-emerald-500 text-slate-950 font-bold'
                              : bw === 'Steady'
                              ? 'bg-sky-400 text-slate-950 font-bold'
                              : 'bg-amber-400 text-slate-950 font-bold'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {bw}
                      </button>
                    );
                  })}
                </div>

                <button
                  id="btn-close-gemini-bridge-modal"
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-300 cursor-pointer"
                  title="Close Sync Hub (Esc)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Live Header Telemetry Bar */}
            <div className="px-5 py-2.5 border-b border-white/10 bg-black/30 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-slate-300">
                  Logical Date ({rolloverLabel}): <strong className="text-sky-300">{logicalDate}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-slate-300">
                  Preset: <strong className="text-indigo-300">{state.profilePresetId || 'AVERY_DEFAULT'}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-slate-300">
                  Bandwidth: <strong className="text-emerald-300">{currentBandwidth}</strong>
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-slate-300">
                  Mode: <strong className="text-cyan-300">{loadModeLabel}</strong> ({metrics.totalTargetBlocks}b)
                </span>
                <span className="px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/10 text-slate-300">
                  Surge Streak: <strong className="text-amber-300">{state.surgeConsecutiveDays} / 2</strong>
                </span>
              </div>
              <div className="px-2.5 py-0.5 rounded-md bg-sky-500/15 border border-sky-400/35 text-sky-200 font-bold">
                {liveCountdownBadge}
              </div>
            </div>

            {/* Confirmation Toast Banner inside modal */}
            {copiedBanner && (
              <div
                id="gemini-bridge-toast-banner"
                className="px-5 py-2 bg-emerald-500/20 border-b border-emerald-400/40 text-emerald-200 text-xs font-mono flex items-center justify-between gap-2"
              >
                <span className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{copiedBanner}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setCopiedBanner(null)}
                  className="text-emerald-300 hover:text-white text-[11px] cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Segmented Modal Tab Bar: Export to Gemini vs. Paste from Gemini (Reverse Bridge) */}
            <div className="px-5 pt-3 border-b border-white/10 bg-slate-900/50 flex items-center gap-2">
              <button
                id="tab-gemini-bridge-export"
                type="button"
                onClick={() => setActiveBridgeTab('EXPORT')}
                className={`px-4 py-2 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                  activeBridgeTab === 'EXPORT'
                    ? 'border-sky-400 text-sky-200 bg-sky-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-sky-400" />
                <span>1. Export to Gemini (4 Modes)</span>
              </button>

              <button
                id="tab-gemini-bridge-import"
                type="button"
                onClick={() => setActiveBridgeTab('IMPORT')}
                className={`px-4 py-2 rounded-t-xl text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition cursor-pointer ${
                  activeBridgeTab === 'IMPORT'
                    ? 'border-emerald-400 text-emerald-200 bg-emerald-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <ClipboardPaste className="w-4 h-4 text-emerald-400" />
                <span>2. Paste from Gemini (Reverse Bridge)</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1">
              {activeBridgeTab === 'EXPORT' ? (
                <>
                  {/* 4 1-Click Export Mode Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {/* Mode A — Sync wl-balancer Skill State */}
                    <div
                      id="gemini-export-card-mode-a"
                      onClick={() => setSelectedExportMode('MODE_A_SKILL_SYNC')}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                        selectedExportMode === 'MODE_A_SKILL_SYNC'
                          ? 'bg-sky-950/35 border-sky-400/60 shadow-[0_0_25px_rgba(56,189,248,0.12)]'
                          : 'bg-slate-900/70 hover:bg-slate-900 border-white/10'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/40 text-sky-300 font-mono text-[10px] font-bold uppercase">
                            Mode A • 1-Click Copy + Launch
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            wl-balancer Skill
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">
                          Sync <code className="text-sky-300">wl-balancer</code> Skill State
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Prepends:{' '}
                          <code className="text-[11px] text-sky-200 bg-black/40 px-1.5 py-0.5 rounded">
                            &quot;{MODE_A_COMMAND_PREFIX}&quot;
                          </code>{' '}
                          followed by the full 3-Part <code className="text-sky-300">state.md</code> payload.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          id="btn-mode-a-copy-launch"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModeASyncSkill(true);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 shrink-0" />
                          <span>Sync wl-balancer &amp; Launch</span>
                          <ExternalLink className="w-3 h-3 shrink-0" />
                        </button>
                        <button
                          id="btn-mode-a-copy-only"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModeASyncSkill(false);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1 cursor-pointer"
                          title="Copy Mode A payload without opening a new tab"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* Mode B — Ask Gemini to Recalibrate / Plan From Here */}
                    <div
                      id="gemini-export-card-mode-b"
                      onClick={() => setSelectedExportMode('MODE_B_RECALIBRATE')}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                        selectedExportMode === 'MODE_B_RECALIBRATE'
                          ? 'bg-indigo-950/35 border-indigo-400/60 shadow-[0_0_25px_rgba(129,140,248,0.12)]'
                          : 'bg-slate-900/70 hover:bg-slate-900 border-white/10'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 font-mono text-[10px] font-bold uppercase">
                            Mode B • Prompt Selector + State
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            Triage &amp; Recalibrate
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">
                          Ask Gemini to Recalibrate / Plan From Here
                        </h3>

                        {/* Preset Selector Dropdown & Quick Pills */}
                        <div
                          className="space-y-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <select
                            id="select-mode-b-prompt-preset"
                            value={selectedPresetId}
                            onChange={(e) => {
                              const nextId = e.target.value;
                              setSelectedPresetId(nextId);
                              setSelectedExportMode('MODE_B_RECALIBRATE');
                              const found = MODE_B_PROMPT_PRESETS.find(
                                (p) => p.id === nextId
                              );
                              if (found) {
                                setCustomRecalibratePrompt(found.prompt);
                              }
                            }}
                            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-mono text-indigo-200 focus:outline-none focus:border-indigo-400"
                          >
                            {MODE_B_PROMPT_PRESETS.map((preset) => (
                              <option key={preset.id} value={preset.id}>
                                {preset.label}: &quot;{preset.prompt}&quot;
                              </option>
                            ))}
                          </select>

                          <input
                            id="input-mode-b-custom-prompt"
                            type="text"
                            value={customRecalibratePrompt}
                            onChange={(e) => {
                              setSelectedExportMode('MODE_B_RECALIBRATE');
                              setCustomRecalibratePrompt(e.target.value);
                            }}
                            placeholder="Customize recalibration prompt..."
                            className="w-full bg-slate-950/90 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs font-mono text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          id="btn-mode-b-copy-launch"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModeBRecalibrate(true);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-indigo-400 hover:bg-indigo-300 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Wand2 className="w-3.5 h-3.5 shrink-0" />
                          <span>Copy Prompt + State &amp; Ask Gemini</span>
                        </button>
                        <button
                          id="btn-mode-b-copy-only"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModeBRecalibrate(false);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </button>
                      </div>
                    </div>

                    {/* Mode C — Copy & Open Gemini (`gemini.google.com`) + Android Native Share */}
                    <div
                      id="gemini-export-card-mode-c"
                      onClick={() => setSelectedExportMode('MODE_C_COPY_OPEN')}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                        selectedExportMode === 'MODE_C_COPY_OPEN'
                          ? 'bg-emerald-950/35 border-emerald-400/60 shadow-[0_0_25px_rgba(52,211,153,0.12)]'
                          : 'bg-slate-900/70 hover:bg-slate-900 border-white/10'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 font-mono text-[10px] font-bold uppercase">
                            Mode C • Web &amp; Android Native Share
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            gemini.google.com
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">
                          Copy &amp; Open Gemini (<code className="text-emerald-300">gemini.google.com</code>)
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Copies the full compiled payload, confirms{' '}
                          <code className="text-[11px] text-emerald-200 bg-black/40 px-1 py-0.5 rounded">
                            &quot;Copied full state! Paste (Cmd+V) into Gemini&quot;
                          </code>
                          , and opens <code className="text-emerald-300">gemini.google.com/app</code> (or triggers Android <code className="text-emerald-300">navigator.share</code>).
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          id="btn-mode-c-copy-open-gemini"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModeCCopyAndOpen(false);
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                          <span>Copy &amp; Open Gemini</span>
                        </button>
                        <button
                          id="btn-mode-c-native-share"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModeCCopyAndOpen(true);
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-xs flex items-center gap-1 cursor-pointer"
                          title="Share directly to the native Gemini Android/mobile app via navigator.share"
                        >
                          <Share2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Share App</span>
                        </button>
                      </div>
                    </div>

                    {/* Mode D — Download state.md / symmetrical-export.json */}
                    <div
                      id="gemini-export-card-mode-d"
                      onClick={() => setSelectedExportMode('MODE_D_MARKDOWN')}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex flex-col justify-between gap-3 ${
                        selectedExportMode === 'MODE_D_MARKDOWN' ||
                        selectedExportMode === 'MODE_D_JSON'
                          ? 'bg-amber-950/35 border-amber-400/60 shadow-[0_0_25px_rgba(251,191,36,0.12)]'
                          : 'bg-slate-900/70 hover:bg-slate-900 border-white/10'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-[10px] font-bold uppercase">
                            Mode D • File &amp; NotebookLM Export
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            .md / .json
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-white">
                          Download <code className="text-amber-300">state.md</code> /{' '}
                          <code className="text-amber-300">symmetrical-export.json</code>
                        </h3>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Downloads the complete 3-Part Markdown file (ready to drop into a Gemini chat or NotebookLM source) or raw JSON backup.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        <button
                          id="btn-mode-d-download-md"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModeDDownload('MARKDOWN');
                          }}
                          className="flex-1 px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          <span>Download state.md</span>
                        </button>
                        <button
                          id="btn-mode-d-download-json"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModeDDownload('JSON');
                          }}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-200 font-mono text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileJson className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>symmetrical-export.json</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Live Compiled Payload Inspector */}
                  <div className="rounded-2xl border border-white/10 bg-slate-900/80 overflow-hidden">
                    <div className="px-4 py-2.5 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Download className="w-3.5 h-3.5 text-sky-400" />
                        <span className="text-xs font-mono font-bold text-slate-200">
                          Compiled Master Context Payload Preview ({selectedExportMode})
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          • {compiledPayload.split('\n').length} lines ({compiledPayload.length} chars)
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          id="btn-preview-copy-compiled-payload"
                          type="button"
                          onClick={async () => {
                            triggerHaptic([10]);
                            await copyTextToClipboard(compiledPayload);
                            const msg = 'Copied compiled payload to clipboard!';
                            setCopiedBanner(msg);
                            onShowNotice(msg);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-400/40 text-sky-200 font-mono text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          <span>Copy Preview</span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      id="textarea-gemini-compiled-preview"
                      readOnly
                      rows={11}
                      value={compiledPayload}
                      className="w-full p-3.5 bg-slate-950/90 text-slate-200 font-mono text-xs leading-relaxed focus:outline-none resize-y"
                    />
                  </div>
                </>
              ) : (
                /* Tab 2: Reverse Bridge ("Import Response from Gemini") */
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-emerald-200 flex items-center gap-2">
                        <ClipboardPaste className="w-4 h-4 text-emerald-400" />
                        <span>Reverse Bridge — Paste Response from Gemini</span>
                      </h3>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          id="btn-reverse-bridge-paste-clipboard"
                          type="button"
                          onClick={async () => {
                            try {
                              if (
                                typeof navigator !== 'undefined' &&
                                navigator.clipboard?.readText
                              ) {
                                const clip = await navigator.clipboard.readText();
                                if (clip) {
                                  setImportText(clip);
                                  setImportError(null);
                                }
                              }
                            } catch {
                              // User can Cmd+V manually into textarea
                            }
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/40 text-emerald-200 font-mono text-[11px] flex items-center gap-1 cursor-pointer"
                        >
                          <ClipboardPaste className="w-3 h-3" />
                          <span>Read Clipboard</span>
                        </button>
                        <button
                          id="btn-reverse-bridge-load-live-state"
                          type="button"
                          onClick={() => {
                            setImportText(
                              compileFullGeminiPayload(state, 'STATE_MD', {
                                bandwidth: currentBandwidth,
                              })
                            );
                            setImportError(null);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-mono text-[11px] cursor-pointer"
                        >
                          Load Current state.md to Edit
                        </button>
                        {importText && (
                          <button
                            type="button"
                            onClick={() => {
                              setImportText('');
                              setImportError(null);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 font-mono text-[11px] cursor-pointer"
                          >
                            Clear
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      Paste <strong>any response from Gemini</strong> below—either a full or partial{' '}
                      <code className="text-emerald-300">state.md</code> Markdown document, an updated{' '}
                      <strong>7-Day Master Pipeline Table</strong>, updated{' '}
                      <strong>Closed List #1–#3</strong> bullets, updated{' '}
                      <strong>Evening Recharge</strong> titles, or a raw{' '}
                      <code className="text-emerald-300">JSON</code> block—and click{' '}
                      <strong>Parse &amp; Apply to App</strong>.
                    </p>
                  </div>

                  <textarea
                    id="textarea-gemini-reverse-bridge-input"
                    rows={12}
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      setImportError(null);
                    }}
                    placeholder="Paste Gemini's response here (Markdown state.md, 7-Day Pipeline Table, Closed List items, or JSON block)..."
                    className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800 focus:border-emerald-400 text-slate-100 font-mono text-xs leading-relaxed focus:outline-none"
                  />

                  {/* Live Detection Preview */}
                  {liveImportInspection && (
                    <div
                      id="gemini-reverse-bridge-detection-preview"
                      className={`p-3.5 rounded-xl border font-mono text-xs ${
                        liveImportInspection.valid
                          ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                          : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                      }`}
                    >
                      {liveImportInspection.valid ? (
                        <div className="space-y-1">
                          <div className="font-bold flex items-center gap-1.5">
                            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Ready to Apply — Detected Updates:</span>
                          </div>
                          <ul className="list-disc list-inside text-[11px] text-emerald-100/90 space-y-0.5">
                            {liveImportInspection.changes.map((c, idx) => (
                              <li key={idx}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{liveImportInspection.error}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {importError && (
                    <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/50 text-red-200 font-mono text-xs">
                      {importError}
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2.5">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-mono text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      id="btn-parse-apply-gemini-response"
                      type="button"
                      disabled={!importText.trim()}
                      onClick={handleParseAndApplyImport}
                      className={`px-5 py-2.5 rounded-xl font-mono font-bold text-xs flex items-center gap-2 transition cursor-pointer ${
                        importText.trim()
                          ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 shadow-[0_0_20px_rgba(52,211,153,0.3)]'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Upload className="w-4 h-4" />
                      <span>Parse &amp; Apply to App</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
              <span>
                Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200">Cmd/Ctrl + G</kbd> to toggle Sync Hub anywhere
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setActiveBridgeTab(
                      activeBridgeTab === 'EXPORT' ? 'IMPORT' : 'EXPORT'
                    )
                  }
                  className="text-sky-300 hover:text-sky-200 flex items-center gap-1 cursor-pointer"
                >
                  <ArrowDownToLine className="w-3 h-3" />
                  <span>
                    {activeBridgeTab === 'EXPORT'
                      ? 'Switch to Paste from Gemini →'
                      : '← Back to 4 Export Modes'}
                  </span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
