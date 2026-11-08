import React, { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  Check,
  ChevronDown,
  ChevronUp,
  Cpu,
  KeyRound,
  Loader2,
  Mic,
  MicOff,
  Sparkles,
  Terminal,
  X,
} from 'lucide-react';
import { SmartIntakePlanResult, SymmetryState } from '../types/symmetry';
import {
  generateSmartIntakePlan,
  getEffectiveGeminiApiKey,
} from '../utils/smartIntakePlanner';
import { triggerHaptic } from '../utils/haptics';

interface SmartIntakeBarProps {
  state: SymmetryState;
  contextVariant: 'FOCUS_PIPELINE' | 'DRAWER_7DAY';
  inputText: string;
  onChangeInputText: (val: string) => void;
  previewPlan: SmartIntakePlanResult | null;
  onSetPreviewPlan: (plan: SmartIntakePlanResult | null) => void;
  onApplyPlan: (plan: SmartIntakePlanResult) => void;
  onOpenSettingsModal?: () => void;
  apiKeyVersion?: number;
}

export const SmartIntakeBar: React.FC<SmartIntakeBarProps> = ({
  state,
  contextVariant,
  inputText,
  onChangeInputText,
  previewPlan,
  onSetPreviewPlan,
  onApplyPlan,
  onOpenSettingsModal,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [isListeningVoice, setIsListeningVoice] = useState(false);
  const [voiceStatusMsg, setVoiceStatusMsg] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const [showFull7DayDiff, setShowFull7DayDiff] = useState(
    contextVariant === 'DRAWER_7DAY'
  );

  const hasApiKey = Boolean(getEffectiveGeminiApiKey());

  // Global Cmd/Ctrl + J shortcut to focus the active Smart Intake input bar
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'j') {
        // If drawer is open, prefer focusing the drawer bar; otherwise focus pipeline bar
        const drawerBackdrop = document.getElementById('pipeline-drawer-backdrop');
        const isDrawerVisible = Boolean(drawerBackdrop);
        if (
          (isDrawerVisible && contextVariant === 'DRAWER_7DAY') ||
          (!isDrawerVisible && contextVariant === 'FOCUS_PIPELINE')
        ) {
          e.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [contextVariant]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isParsing) return;

    triggerHaptic([10]);
    setIsParsing(true);
    try {
      const result = await generateSmartIntakePlan(trimmed, state);
      onSetPreviewPlan(result);
    } finally {
      setIsParsing(false);
    }
  };

  const handleToggleVoiceDictation = () => {
    triggerHaptic([15]);
    if (typeof window === 'undefined') return;

    if (isListeningVoice && recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      setIsListeningVoice(false);
      setVoiceStatusMsg('Dictation stopped.');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const win = window as any;
    const SpeechRecognitionCtor =
      win.SpeechRecognition || win.webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setVoiceStatusMsg(
        'SpeechRecognition API unavailable in this browser context — type directly into Smart Intake.'
      );
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListeningVoice(true);
        setVoiceStatusMsg('Listening for voice brain-dump...');
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = async (event: any) => {
        const transcript = event?.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          const combined = inputText.trim()
            ? `${inputText.trim()} ${transcript.trim()}`
            : transcript.trim();
          onChangeInputText(combined);
          setVoiceStatusMsg(`Captured: "${transcript.trim()}"`);
          setIsParsing(true);
          try {
            const result = await generateSmartIntakePlan(combined, state);
            onSetPreviewPlan(result);
          } finally {
            setIsParsing(false);
          }
        }
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        setIsListeningVoice(false);
        setVoiceStatusMsg(
          `Voice dictation notice: ${event?.error || 'microphone permission needed'}`
        );
      };

      recognition.onend = () => {
        setIsListeningVoice(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListeningVoice(false);
      setVoiceStatusMsg('Could not start SpeechRecognition.');
    }
  };

  const quickCommands = [
    {
      label: '+paper Draft 8b',
      value: '+paper Draft 8b',
    },
    {
      label: '+lab Tue 2h',
      value: '+lab Tue 2h',
    },
    {
      label: 'Full Brain-Dump Example',
      value:
        'Lab Tue 2h, theater Thu 6pm shutdown, finish 8-block AI paper by Fri, Journal Club slide deck 4b',
    },
  ];

  const barIdPrefix =
    contextVariant === 'FOCUS_PIPELINE' ? 'pipeline-intake' : 'drawer-intake';

  return (
    <section
      id={`${barIdPrefix}-bar`}
      aria-label="Smart Intake and Week Planner"
      className="rounded-2xl bento-surface p-3.5 sm:p-4 space-y-3 border border-cyan-500/25"
    >
      {/* Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-400/40 text-cyan-200 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-300" />
            <span>SMART INTAKE &amp; WEEK PLANNER</span>
          </span>

          <span
            className={`px-2 py-0.5 rounded-md border font-mono text-[10px] flex items-center gap-1 ${
              hasApiKey
                ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                : 'bg-white/[0.04] border-white/[0.1] text-slate-300'
            }`}
            title={
              hasApiKey
                ? 'Gemini 2.5 Flash structured JSON output active'
                : 'No Gemini API key set — fast local regex/keyword parser active'
            }
          >
            {hasApiKey ? (
              <>
                <Cpu className="w-3 h-3 text-emerald-300" />
                <span>gemini-2.5-flash</span>
              </>
            ) : (
              <>
                <Terminal className="w-3 h-3 text-amber-300" />
                <span>Offline Regex Parser</span>
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {quickCommands.map((qc) => (
            <button
              key={qc.label}
              type="button"
              onClick={() => {
                onChangeInputText(qc.value);
                inputRef.current?.focus();
              }}
              className="hidden md:inline-flex px-2 py-0.5 rounded-md bg-white/[0.03] hover:bg-white/[0.08] border border-white/[0.08] font-mono text-[10px] text-slate-300 cursor-pointer transition"
            >
              {qc.label}
            </button>
          ))}

          {onOpenSettingsModal && (
            <button
              id={`${barIdPrefix}-btn-api-key`}
              type="button"
              onClick={onOpenSettingsModal}
              className="px-2 py-0.5 rounded-md bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.1] font-mono text-[10px] text-cyan-200 flex items-center gap-1 cursor-pointer"
              title="Configure geminiApiKey in Settings / State Sync modal"
            >
              <KeyRound className="w-3 h-3 text-cyan-300" />
              <span>{hasApiKey ? 'API Key Set' : 'Set API Key'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Command Input Form + Voice Dictation Microphone Button */}
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <div
          onClick={() => inputRef.current?.focus()}
          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-950/90 border border-white/[0.12] focus-within:border-cyan-400/70 transition cursor-text"
        >
          <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            ref={inputRef}
            id={`${barIdPrefix}-input`}
            type="text"
            value={inputText}
            onChange={(e) => onChangeInputText(e.target.value)}
            placeholder="Brain-dump tasks, labs, or 6 PM outings (e.g., 'Lab Tue 2h, theater Thu 6pm shutdown, finish 8-block AI paper by Fri')..."
            className="w-full bg-transparent text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 font-mono focus:outline-none"
          />
          {inputText && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChangeInputText('');
              }}
              className="text-slate-500 hover:text-slate-300 cursor-pointer"
              title="Clear intake input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] text-[10px] font-mono text-slate-400 shrink-0">
            ⌘J
          </kbd>
        </div>

        <button
          id={
            contextVariant === 'FOCUS_PIPELINE'
              ? 'btn-voice-dictation-intake'
              : `${barIdPrefix}-voice-btn`
          }
          type="button"
          onClick={handleToggleVoiceDictation}
          aria-label="Voice Dictation Intake (SpeechRecognition)"
          title="Speak brain-dump directly into Smart Intake Parser (SpeechRecognition / webkitSpeechRecognition)"
          className={`px-3 py-2 rounded-xl border font-mono text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0 ${
            isListeningVoice
              ? 'bg-rose-500/25 border-rose-400 text-rose-200 animate-pulse'
              : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.12] text-cyan-200'
          }`}
        >
          {isListeningVoice ? (
            <>
              <MicOff className="w-3.5 h-3.5 text-rose-300" />
              <span>Listening...</span>
            </>
          ) : (
            <>
              <Mic className="w-3.5 h-3.5 text-cyan-300" />
              <span>Dictate</span>
            </>
          )}
        </button>

        <button
          id={`${barIdPrefix}-submit`}
          type="submit"
          disabled={!inputText.trim() || isParsing}
          className="px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0 shadow-md shadow-cyan-500/20"
        >
          {isParsing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Parsing...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Parse Week Plan</span>
            </>
          )}
        </button>
      </form>

      {voiceStatusMsg && (
        <div
          id="smart-intake-voice-status"
          className="text-[11px] font-mono text-cyan-300/90 flex items-center justify-between"
        >
          <span>{voiceStatusMsg}</span>
          <button
            type="button"
            onClick={() => setVoiceStatusMsg(null)}
            className="text-slate-400 hover:text-slate-200 underline text-[10px] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Diff Preview Pill / Card with 1-Click "Apply to Pipeline" & "Cancel" */}
      {previewPlan && (
        <div
          id={`${barIdPrefix}-diff-preview`}
          className="p-3.5 rounded-2xl bg-slate-950/95 border border-cyan-400/50 space-y-3 shadow-xl"
        >
          {/* Top Diff Summary Pill Row + Action Buttons */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-white/[0.08]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/50 text-cyan-200 font-mono text-[10px] font-bold uppercase">
                DIFF PREVIEW ({previewPlan.source === 'GEMINI_2_5_FLASH' ? 'GEMINI 2.5 FLASH' : 'LOCAL PARSER'})
              </span>

              <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.12] font-mono text-[11px] text-slate-200">
                Today Mode:{' '}
                <strong className="text-cyan-300">{state.loadMode}</strong> →{' '}
                <strong className="text-emerald-300">{previewPlan.todayLoadMode}</strong>
              </span>

              <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.12] font-mono text-[11px] text-slate-200">
                Fixed Events: <strong>{previewPlan.fixedEvents.length}</strong>
              </span>

              <span className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.12] font-mono text-[11px] text-slate-200">
                Closed List: <strong>{previewPlan.closedListUpdates.length}/3</strong>
              </span>

              {previewPlan.openListBacklog.length > 0 && (
                <span className="px-2 py-0.5 rounded-md bg-amber-500/15 border border-amber-400/40 font-mono text-[11px] text-amber-200">
                  Backlog: <strong>+{previewPlan.openListBacklog.length}</strong>
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                id={`${barIdPrefix}-btn-apply`}
                type="button"
                onClick={() => {
                  triggerHaptic([20]);
                  onApplyPlan(previewPlan);
                }}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply to Pipeline</span>
              </button>

              <button
                id={`${barIdPrefix}-btn-cancel`}
                type="button"
                onClick={() => {
                  triggerHaptic([10]);
                  onSetPreviewPlan(null);
                }}
                className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.12] text-slate-300 font-mono font-semibold text-xs flex items-center gap-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          </div>

          {/* Inline Option A / Option B Triage Prompt when adding deliverables exceeds 3-item Closed List cap or forces Surge */}
          {(previewPlan.openListBacklog.length > 0 ||
            previewPlan.todayLoadMode === 'SURGE' ||
            state.projectQueue.length >= 3) && (
            <div
              id={`${barIdPrefix}-triage-options`}
              className="p-3 rounded-xl bg-amber-950/35 border border-amber-400/50 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-amber-200">
                  Option A / Option B Capacity Triage (Closed List Cap / Surge Check)
                </span>
                <span className="text-[10px] font-mono text-amber-200/80">
                  Choose how to route new intake deliverables:
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <button
                  id={`${barIdPrefix}-btn-option-a`}
                  type="button"
                  onClick={() => {
                    triggerHaptic([20]);
                    onApplyPlan({
                      ...previewPlan,
                      todayLoadMode: 'SURGE',
                    });
                  }}
                  className="p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/55 text-left transition cursor-pointer"
                >
                  <div className="text-xs font-mono font-bold text-amber-100">
                    Option A (Hard Deadline): Promote to Closed List &amp; schedule Surge blocks
                  </div>
                  <div className="text-[11px] text-amber-100/80 mt-0.5">
                    Promote new deliverable into Active Focus #1, shift overflow to Open List backlog, and step today to Surge Mode (14 blocks).
                  </div>
                </button>
                <button
                  id={`${barIdPrefix}-btn-option-b`}
                  type="button"
                  onClick={() => {
                    triggerHaptic([15]);
                    const mapTrack = (
                      t: SymmetryState['projectQueue'][number]['trackId']
                    ): SmartIntakePlanResult['closedListUpdates'][number]['roadmapTrack'] =>
                      t === 'science'
                        ? 'SCIENCE'
                        : t === 'writing'
                        ? 'WRITING'
                        : t === 'personal'
                        ? 'HOME'
                        : t === 'coding'
                        ? 'CODING_MAKER'
                        : 'MUSIC';
                    const preservedClosed = state.projectQueue.map((p) => ({
                      title: p.title,
                      blocksTotal: p.totalBlocks,
                      roadmapTrack: mapTrack(p.trackId),
                      startupStep5m: p.startupStep,
                    }));
                    const newlyAddedToDemote = previewPlan.closedListUpdates.filter(
                      (u) =>
                        !state.projectQueue.some(
                          (existing) =>
                            existing.title.toLowerCase() === u.title.toLowerCase()
                        )
                    );
                    onApplyPlan({
                      ...previewPlan,
                      todayLoadMode:
                        state.loadMode === 'TAPER' ? 'TAPER_LAB' : 'CRUISE',
                      closedListUpdates:
                        preservedClosed.length > 0
                          ? preservedClosed
                          : previewPlan.closedListUpdates,
                      openListBacklog: [
                        ...newlyAddedToDemote,
                        ...previewPlan.openListBacklog,
                      ],
                    });
                  }}
                  className="p-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-400/55 text-left transition cursor-pointer"
                >
                  <div className="text-xs font-mono font-bold text-cyan-100">
                    Option B (Soft / Flexible): Demote to Open List backlog to preserve Cruise Mode
                  </div>
                  <div className="text-[11px] text-cyan-100/80 mt-0.5">
                    Keep current Closed List 1–3 locked, stage new deliverable in the Open List backlog, and preserve Cruise Mode (12 blocks).
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Fixed Events + Closed List Updates Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs font-mono">
            {/* Fixed Events Column */}
            <div className="lg:col-span-4 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-1.5">
              <div className="text-[10px] uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1">
                <Calendar className="w-3 h-3 text-amber-400" />
                <span>Fixed Events ({previewPlan.fixedEvents.length})</span>
              </div>
              {previewPlan.fixedEvents.length === 0 ? (
                <div className="text-[11px] text-slate-500">
                  No wall-clock events (Duration-Only mode preserved).
                </div>
              ) : (
                <div className="space-y-1">
                  {previewPlan.fixedEvents.map((ev, idx) => (
                    <div
                      key={idx}
                      className="p-1.5 rounded-lg bg-black/40 border border-white/[0.06] flex items-center justify-between gap-1.5"
                    >
                      <div className="truncate">
                        <span className="text-amber-300 font-bold">{ev.day}:</span>{' '}
                        <span className="text-slate-200">{ev.title}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-slate-300">
                          {ev.durationMinutes}m
                        </span>
                        {ev.earlyShutdown6PM && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 border border-amber-400/50 text-[10px] text-amber-200 font-bold">
                            6PM Lock
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Closed List Updates (Max 3) + Open List Backlog */}
            <div className="lg:col-span-8 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.07] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-bold">
                  Closed List Queue Updates (Max 3 Active • 100% Lock to #1)
                </span>
                <button
                  type="button"
                  onClick={() => setShowFull7DayDiff(!showFull7DayDiff)}
                  className="text-[10px] text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer"
                >
                  <span>{showFull7DayDiff ? 'Hide' : 'Show'} 7-Day Table</span>
                  {showFull7DayDiff ? (
                    <ChevronUp className="w-3 h-3" />
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              </div>

              <div className="space-y-1.5">
                {previewPlan.closedListUpdates.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-black/40 border border-white/[0.07] flex flex-col sm:flex-row sm:items-center justify-between gap-1.5"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            idx === 0
                              ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/50'
                              : 'bg-white/[0.06] text-slate-300'
                          }`}
                        >
                          #{idx + 1}
                        </span>
                        <span className="text-slate-100 font-bold truncate">
                          {item.title}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/30 text-[10px] text-cyan-200">
                          {item.blocksTotal}b
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] text-slate-300">
                          {item.roadmapTrack}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-200/90 truncate">
                        5m Startup: “{item.startupStep5m}”
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {previewPlan.openListBacklog.length > 0 && (
                <div className="pt-1.5 border-t border-white/[0.06] flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="text-slate-400 font-semibold">
                    Open List Backlog (Demoted):
                  </span>
                  {previewPlan.openListBacklog.map((b, idx) => {
                    const label =
                      typeof b === 'string'
                        ? b
                        : `${b.title} (${b.blocksTotal}b • ${b.roadmapTrack})`;
                    return (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded bg-white/[0.04] border border-white/[0.08] text-slate-300"
                      >
                        {label}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 7-Day Pipeline Preview Table */}
          {showFull7DayDiff && (
            <div className="overflow-x-auto rounded-xl border border-white/[0.08]">
              <table className="w-full text-left border-collapse text-[11px] font-mono">
                <thead>
                  <tr className="bg-black/60 text-slate-400 border-b border-white/[0.08] uppercase text-[10px]">
                    <th className="py-1.5 px-2.5">Day</th>
                    <th className="py-1.5 px-2.5">Mode &amp; Anchors</th>
                    <th className="py-1.5 px-2.5">Project Blocks</th>
                    <th className="py-1.5 px-2.5">Deliverables Completed</th>
                    <th className="py-1.5 px-2.5">Evening Bridge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {previewPlan.sevenDayPipeline.map((row, idx) => (
                    <tr
                      key={idx}
                      className={idx === 0 ? 'bg-cyan-950/25 text-slate-100' : 'text-slate-300'}
                    >
                      <td className="py-1.5 px-2.5 font-bold whitespace-nowrap">
                        {row.day}
                      </td>
                      <td className="py-1.5 px-2.5">{row.modeAndAnchors}</td>
                      <td className="py-1.5 px-2.5 text-cyan-200">{row.projectBlocks}</td>
                      <td className="py-1.5 px-2.5 text-emerald-300">
                        {row.deliverablesCompleted}
                      </td>
                      <td className="py-1.5 px-2.5 text-amber-200/90">
                        {row.eveningBridge}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
