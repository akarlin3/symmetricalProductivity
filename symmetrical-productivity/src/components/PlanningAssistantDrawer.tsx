import React, { useEffect, useRef, useState } from 'react';
import {
  Bot,
  CheckCircle2,
  Key,
  Send,
  Sparkles,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import {
  FixedEventType,
  LoadMode,
  SymmetryState,
  TabId,
} from '../types/symmetry';
import {
  computeShiftMetrics,
  generateSequentialChecklist,
} from '../state/defaultState';
import { triggerHaptic } from '../utils/haptics';
import {
  callGemini,
  getPersonalByokKey,
  hasActiveGeminiAccess,
  isProModeUnlocked,
  PRO_MODE_CHANGE_EVENT,
  setPersonalByokKey,
} from '../utils/geminiClient';
import { MobileBottomSheet } from './MobileBottomSheet';

export const GEMINI_API_KEY_STORAGE = 'symmetry_gemini_api_key_v1';

export interface AssistantStructuredResponse {
  reply: string;
  quickOptions: string[];
  statePatch?: Partial<SymmetryState>;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  quickOptions?: string[];
  appliedPatchSummary?: string;
  timestamp: string;
}

interface PlanningAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  state: SymmetryState;
  onApplyStatePatch: (patch: Partial<SymmetryState>, summary: string) => void;
  onSelectTab: (tab: TabId) => void;
  isEveningTheme: boolean;
}

/**
 * Local deterministic state-aware parser & partner response generator.
 * Used when no Gemini API key is configured or if the network request fails,
 * and also pre-computes exact state patches for common operational commands.
 */
function evaluateLocalPartnerCommand(
  prompt: string,
  state: SymmetryState
): AssistantStructuredResponse {
  const lower = prompt.toLowerCase().trim();
  const metrics = computeShiftMetrics(state);
  const now = Date.now();

  // 1. Stress / Fatigue Reset + Queue 5m Flashcards
  if (
    lower.includes('tired') ||
    lower.includes('stress') ||
    lower.includes('fatigue') ||
    lower.includes('overwhelmed') ||
    lower.includes('4-7-8') ||
    (lower.includes('option a') && lower.includes('stress reset'))
  ) {
    const patch: Partial<SymmetryState> = {
      timer: {
        ...state.timer,
        mode: 'STRESS_RESET',
        stressProtocol: 'BREATHING_478',
        stressDurationMinutes: 15,
        secondsLeft: 15 * 60,
        targetEndTimeMs: now + 15 * 60 * 1000,
        isRunning: true,
        queuedRecoveryFlashcard5m: true,
        recoveryFlashcardSecondsLeft: 300,
        recoveryFlashcardTargetEndTimeMs: null,
        recoveryFlashcardRunning: false,
      },
    };
    return {
      reply:
        'Heavy reading and writing suspended. Started a 15m 4-7-8 Stress / Fatigue Reset timer and queued a 5m Flashcard recovery ramp immediately after. Step away from the keyboard until the 15m timer clears.',
      quickOptions: [
        'Option A: Step today down one Load Mode tier',
        'Option B: Keep current Load Mode after 5m Flashcards',
        'Audit my 4-Rung Input/Output balance',
      ],
      statePatch: patch,
    };
  }

  // 2. Audit 4-Rung Input/Output balance
  if (
    lower.includes('audit') ||
    lower.includes('4-rung') ||
    lower.includes('input/output') ||
    lower.includes('balance') ||
    lower.includes('roadmap')
  ) {
    const totalIn = state.roadmapTracks.reduce(
      (acc, t) => acc + t.inputBlocksCredited,
      0
    );
    const totalOut = state.roadmapTracks.reduce(
      (acc, t) => acc + t.outputBlocksCredited,
      0
    );
    const combined = Math.max(1, totalIn + totalOut);
    const inPct = Math.round((totalIn / combined) * 100);
    const outPct = 100 - inPct;
    const coreSummary = state.roadmapTracks
      .filter((t) => !t.isSandbox)
      .map(
        (t) =>
          `${t.name}: In ${t.inputBlocksCredited}/${t.inputWeeklyTarget} | Out ${t.outputBlocksCredited}/${t.outputWeeklyTarget}`
      )
      .join(' • ');
    const deltaBlocks = Math.max(1, Math.round((totalIn - totalOut) / 2));

    return {
      reply: `4-Rung Symmetrical Audit: Global ratio is ${totalIn} Input blocks (${inPct}%) vs. ${totalOut} Output blocks (${outPct}%). Core Tracks: [${coreSummary}]. Sandbox Tracks (Coding/Hardware, Music) are marked "Flexible Pace / Coasting in Neutral" with zero quota pressure. To hit 50/50 symmetry, route your next ${deltaBlocks} discretionary blocks to Closed List Focus #1 (${state.projectQueue[0]?.title || 'Primary Project'}).`,
      quickOptions: [
        'Option A: Log +1 Output block on Closed List #1 now',
        'Option B: Launch 5m Startup on Half-Chapter Synthesis',
        'Recalibrate remainder of day',
      ],
    };
  }

  // 3. Log a 6pm show / evening outing / fixed event on Thursday or Today
  if (
    lower.includes('6pm') ||
    lower.includes('6:00') ||
    lower.includes('show') ||
    lower.includes('outing') ||
    lower.includes('thursday') ||
    lower.includes('lab') ||
    lower.includes('volunteer')
  ) {
    const isLab = lower.includes('lab');
    const isVolunteer = lower.includes('volunteer');
    const eventType: FixedEventType = isLab
      ? 'LAB_2H'
      : isVolunteer
      ? 'VOLUNTEER'
      : 'EVENING_OUTING_6PM';
    const eventLabel =
      eventType === 'LAB_2H'
        ? '09:00 AM – 11:00 AM Lab Shift (~2h)'
        : eventType === 'VOLUNTEER'
        ? '01:00 PM – 03:00 PM Volunteer Shift'
        : '6:00 PM Evening Outing';

    const targetDayIdx = lower.includes('thursday')
      ? 4
      : lower.includes('tomorrow')
      ? 2
      : 1;

    const updatedPipeline = state.pipelineDays.map((d) => {
      if (d.dayIndex !== targetDayIdx) return d;
      return {
        ...d,
        fixedEvent: eventType,
        fixedEventTimeLabel: eventLabel,
        loadMode:
          eventType === 'LAB_2H' ? ('TAPER' as LoadMode) : d.loadMode,
        baseTargetBlocks:
          eventType === 'LAB_2H' ? 8 : Math.min(d.baseTargetBlocks, 12),
      };
    });

    const patch: Partial<SymmetryState> = {
      ...(targetDayIdx === 1 ? { fixedEvent: eventType } : {}),
      pipelineDays: updatedPipeline,
    };

    return {
      reply: `Logged Fixed Event [${eventLabel}] on Day ${targetDayIdx}${
        targetDayIdx === 4 ? ' (Thursday)' : targetDayIdx === 1 ? ' (Today)' : ''
      }. Wall-clock anchor pill enabled for that shift while keeping the rest of the Focus Pipeline strictly duration-only.`,
      quickOptions: [
        'Option A: Cap that shift at Cruise (11 blocks) before 6:00 PM',
        'Option B: Step that shift down to Taper (8 blocks)',
        'Audit my 4-Rung Input/Output balance',
      ],
      statePatch: patch,
    };
  }

  // 4. Option A: Step down one Load Mode tier / Recalibrate Day
  if (
    lower.includes('step today down') ||
    lower.includes('option a: step') ||
    lower.includes('step down') ||
    lower.includes('taper') ||
    (lower.includes('recalibrate') && !lower.includes('option b'))
  ) {
    const nextMode: LoadMode =
      state.loadMode === 'SURGE' ? 'CRUISE' : 'TAPER';
    const nextBlocks = nextMode === 'CRUISE' ? 11 : 8;
    const patch: Partial<SymmetryState> = {
      loadMode: nextMode,
      cruisePlus: false,
      customModeBlockAdjustment: nextBlocks,
      pipelineDays: state.pipelineDays.map((d) =>
        d.isToday
          ? {
              ...d,
              loadMode: nextMode,
              cruisePlus: false,
              baseTargetBlocks: nextBlocks,
            }
          : d
      ),
    };
    const remBlocks = Math.max(0, nextBlocks - metrics.totalCompletedBlocks);
    return {
      reply: `Recalibrated today down one tier to ${nextMode} Mode (${nextBlocks} total blocks; ${remBlocks} blocks / ${remBlocks * 20}m work left). Flashcards remain spaced early/mid-shift and Closed List #1 retains 100% of remaining discretionary blocks.`,
      quickOptions: [
        'Option A: Bank remaining Flashcard blocks via Early Clearance',
        'Option B: Keep current sequence and start next 5m step',
      ],
      statePatch: patch,
    };
  }

  // 5. Option A: Bank Flashcards via Early Clearance
  if (lower.includes('early clearance') || lower.includes('bank remaining flashcard')) {
    const updatedBaseline = state.baselineBlocks.map((b) => {
      const isFc =
        b.category === 'FLASHCARDS_ANATOMY' || b.category === 'FLASHCARDS_COMP';
      if (!isFc || b.completed) return b;
      return { ...b, bankedViaEarlyClearance: true };
    });
    return {
      reply:
        'Early Clearance enabled. Unused Flashcard blocks are now banked as free time, reducing remaining shift duration without penalty.',
      quickOptions: [
        'Option A: Launch next Half-Chapter or Project 5m Startup',
        'Option B: Audit my 4-Rung Input/Output balance',
      ],
      statePatch: {
        earlyClearanceEnabled: true,
        baselineBlocks: updatedBaseline,
      },
    };
  }

  // 6. Option A: Log +1 Output block on Closed List #1
  if (lower.includes('log +1 output') || lower.includes('log +1 block')) {
    const p1 = state.projectQueue[0];
    const updatedQueue = state.projectQueue.map((p) =>
      p.slot === 1
        ? { ...p, completedBlocks: Math.min(p.totalBlocks, p.completedBlocks + 1) }
        : p
    );
    return {
      reply: `Logged +1 discretionary 20m block on Closed List #1 (${p1?.title || 'Primary Project'}) and credited +1 Output block to the 4-Rung Roadmap.`,
      quickOptions: [
        'Option A: Take a 5m Level 1 Micro-Reset',
        'Option B: Take a 15m Level 2 Task-Switch Buffer',
      ],
      statePatch: {
        discretionaryBlocksCompletedToday:
          state.discretionaryBlocksCompletedToday + 1,
        projectQueue: updatedQueue,
      },
    };
  }

  // 7. Default status + next-step partner triage
  const seq = generateSequentialChecklist(state);
  const nextWork = seq.find((s) => s.kind === 'WORK_BLOCK' && s.isCurrentNext);
  return {
    reply: `Current shift: ${state.loadMode}${state.cruisePlus ? '+' : ''} Mode (${metrics.totalCompletedBlocks}/${metrics.totalTargetBlocks} blocks complete, ${metrics.durationPrefix}). Next scheduled step: ${
      nextWork ? `${nextWork.title} — 5m Startup: "${nextWork.startupStep}"` : 'End-of-Shift Bridge [0m work left]'
    }. Choose Option A or Option B below, or issue a direct state command.`,
    quickOptions: [
      "I'm tired, give me a stress reset then queue flashcards",
      'Audit my 4-Rung Input/Output balance',
      'I have a 6pm show Thursday',
    ],
  };
}

export const PlanningAssistantDrawer: React.FC<PlanningAssistantDrawerProps> = ({
  isOpen,
  onClose,
  state,
  onApplyStatePatch,
  onSelectTab,
  isEveningTheme,
}) => {
  const [apiKey, setApiKey] = useState<string>(() => getPersonalByokKey());
  const [proActive, setProActive] = useState<boolean>(() => isProModeUnlocked());
  const [showKeyConfig, setShowKeyConfig] = useState(false);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      role: 'assistant',
      text: 'Planning Assistant (`wl-balancer`) ready. Live AppState is bound—ask to recalibrate your day, trigger a stress reset, schedule a fixed event, or audit your 4-Rung Input/Output balance.',
      quickOptions: [
        "I'm tired, give me a stress reset then queue flashcards",
        'Audit my 4-Rung Input/Output balance',
        'I have a 6pm show Thursday',
      ],
      timestamp: 'Ready',
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const syncProAndKey = () => {
      setProActive(isProModeUnlocked());
      setApiKey(getPersonalByokKey());
    };
    window.addEventListener(PRO_MODE_CHANGE_EVENT, syncProAndKey);
    return () => window.removeEventListener(PRO_MODE_CHANGE_EVENT, syncProAndKey);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSaveApiKey = (val: string) => {
    setApiKey(val);
    setPersonalByokKey(val);
  };

  const describeStatePatch = (patch?: Partial<SymmetryState>): string | undefined => {
    if (!patch || Object.keys(patch).length === 0) return undefined;
    const keys = Object.keys(patch);
    const parts: string[] = [];
    if (patch.loadMode) {
      parts.push(
        `LoadMode → ${patch.loadMode} (${patch.customModeBlockAdjustment ?? state.customModeBlockAdjustment} blks)`
      );
    }
    if (patch.timer) {
      parts.push(
        `Timer → ${patch.timer.mode}${
          patch.timer.queuedRecoveryFlashcard5m ? ' + 5m Flashcard Ramp Queued' : ''
        }`
      );
    }
    if (patch.fixedEvent) {
      parts.push(`FixedEvent → ${patch.fixedEvent}`);
    }
    if (patch.earlyClearanceEnabled !== undefined) {
      parts.push(`EarlyClearance → ${patch.earlyClearanceEnabled ? 'Banked' : 'Off'}`);
    }
    if (patch.pipelineDays && !patch.loadMode) {
      parts.push('Updated 7-Day Pipeline Table');
    }
    if (patch.projectQueue) {
      parts.push('Updated Closed List Project Queue');
    }
    return parts.length > 0 ? parts.join(' • ') : `Patched [${keys.join(', ')}]`;
  };

  const sendCommand = async (rawPrompt: string) => {
    const trimmed = rawPrompt.trim();
    if (!trimmed || isLoading) return;
    triggerHaptic([12]);

    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: trimmed,
      timestamp: 'Now',
    };
    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoading(true);

    let structuredResult: AssistantStructuredResponse | null = null;
    let resolvedSource: 'PRO_CLOUDFLARE' | 'BYOK_DIRECT' | 'LOCAL_FALLBACK' = 'LOCAL_FALLBACK';

    // Route through unified callGemini(payload) helper (Priority 1: Pro Mode, Priority 2: BYOK, Priority 3: Local Engine)
    if (hasActiveGeminiAccess()) {
      const systemInstruction = `You are the Symmetrical Productivity (wl-balancer) Planning Assistant.
Tone rules:
1. ZERO philosophical, religious, or preachy text. Never use terms like Halakha, Aggadah, Teshuvah, Chavruta, Hora'at Sha'ah, or family lore.
2. Keep all replies strictly concise, candid, zero-fluff, mechanical, and partner-oriented.
3. Always provide 2-3 actionable quickOptions (formatted as "Option A: ...", "Option B: ...", etc.).
4. When the user requests a state change (e.g. stress reset + queue flashcards, stepping down load mode, logging a fixed event like a 6pm show, banking flashcards via early clearance, or logging blocks), include a valid partial SymmetryState object in "statePatch".

Current live AppState JSON:
${JSON.stringify(state)}

Return ONLY valid JSON matching:
{
  "reply": "string",
  "quickOptions": ["Option A: ...", "Option B: ..."],
  "statePatch": { ...optional partial SymmetryState... }
}`;

      const geminiRes = await callGemini(
        {
          model: 'gemini-2.5-flash',
          systemInstruction: { parts: [{ text: systemInstruction }] },
          contents: [{ role: 'user', parts: [{ text: trimmed }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        },
        () => evaluateLocalPartnerCommand(trimmed, state)
      );

      resolvedSource = geminiRes.source;
      if (geminiRes.ok && geminiRes.text) {
        try {
          const parsed = JSON.parse(geminiRes.text) as AssistantStructuredResponse;
          if (parsed && typeof parsed.reply === 'string') {
            const localFallback = evaluateLocalPartnerCommand(trimmed, state);
            structuredResult = {
              reply: parsed.reply,
              quickOptions:
                Array.isArray(parsed.quickOptions) && parsed.quickOptions.length > 0
                  ? parsed.quickOptions
                  : localFallback.quickOptions,
              statePatch: parsed.statePatch || localFallback.statePatch,
            };
          }
        } catch {
          // Fallback to local state-aware engine below
        }
      }
    }

    if (!structuredResult) {
      structuredResult = evaluateLocalPartnerCommand(trimmed, state);
      resolvedSource = 'LOCAL_FALLBACK';
    }

    let appliedSummary: string | undefined;
    if (
      structuredResult.statePatch &&
      Object.keys(structuredResult.statePatch).length > 0
    ) {
      appliedSummary =
        describeStatePatch(structuredResult.statePatch) || 'Applied live statePatch';
      onApplyStatePatch(structuredResult.statePatch, appliedSummary);
      if (structuredResult.statePatch.timer?.mode === 'STRESS_RESET') {
        onSelectTab('PIPELINE');
      }
    }

    const assistantMsg: ChatMessage = {
      id: `a_${Date.now()}`,
      role: 'assistant',
      text: structuredResult.reply,
      quickOptions: structuredResult.quickOptions,
      appliedPatchSummary: appliedSummary,
      timestamp:
        resolvedSource === 'PRO_CLOUDFLARE'
          ? 'gemini-2.5-flash (PRO)'
          : resolvedSource === 'BYOK_DIRECT'
          ? 'gemini-2.5-flash (BYOK)'
          : 'Local State Engine',
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <MobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      id="planning-assistant-drawer"
      ariaLabel="Planning Assistant AI Side-Panel"
      desktopVariant="drawer"
      maxWidthClass="sm:w-96 max-w-none"
      isEvening={isEveningTheme}
    >
      <div className="flex-1 flex flex-col justify-between overflow-hidden">
        {/* Top Header */}
        <div className="p-4 border-b border-white/[0.08] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center border ${
                  isEveningTheme
                    ? 'bg-amber-500/15 border-amber-400/50 text-amber-300'
                    : 'bg-cyan-500/15 border-cyan-400/50 text-cyan-300'
                }`}
              >
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h2 className="text-sm font-bold font-mono tracking-tight">
                    Planning Assistant
                  </h2>
                  <span className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.1] font-mono text-[10px] text-cyan-300">
                    Cmd/Ctrl + /
                  </span>
                </div>
                <p className="text-[11px] font-mono text-slate-400">
                  gemini-2.5-flash • Direct AppState Mutation
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                id="btn-toggle-gemini-key"
                type="button"
                onClick={() => setShowKeyConfig(!showKeyConfig)}
                className={`px-2 py-1 rounded-lg border font-mono text-[10px] flex items-center gap-1 cursor-pointer ${
                  proActive || apiKey.trim()
                    ? 'bg-emerald-500/15 border-emerald-400/40 text-emerald-200'
                    : 'bg-white/[0.04] border-white/[0.1] text-slate-300'
                }`}
                title="Configure Gemini API Key (gemini-2.5-flash)"
              >
                <Key className="w-3 h-3" />
                <span>
                  {proActive
                    ? 'Pro Mode Active'
                    : apiKey.trim()
                    ? 'API Key Set'
                    : 'API Key'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setMessages((prev) => (prev.length > 0 ? [prev[0]] : []))
                }
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] text-slate-400 hover:text-slate-200 cursor-pointer"
                title="Clear conversation"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              <button
                id="btn-close-planning-assistant"
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Collapsible Gemini API Key Bar */}
          {showKeyConfig && (
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/[0.1] space-y-1.5">
              <label
                htmlFor="input-gemini-api-key"
                className="block text-[10px] font-mono uppercase text-slate-400"
              >
                Gemini API Key (Saved locally for `gemini-2.5-flash`; optional with built-in state engine)
              </label>
              <input
                id="input-gemini-api-key"
                type="password"
                value={apiKey}
                onChange={(e) => handleSaveApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-slate-950 border border-white/[0.12] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100"
              />
            </div>
          )}
        </div>

        {/* Message Stream */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 space-y-3.5"
        >
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col space-y-2 ${
                m.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              <div
                className={`max-w-[92%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed border ${
                  m.role === 'user'
                    ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-50 font-mono'
                    : 'bg-white/[0.04] border-white/[0.09] text-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1 text-[10px] font-mono text-slate-400">
                  <span className="uppercase font-bold">
                    {m.role === 'user' ? 'You' : 'Partner Engine'}
                  </span>
                  <span>{m.timestamp}</span>
                </div>
                <p>{m.text}</p>

                {m.appliedPatchSummary && (
                  <div className="mt-2 px-2.5 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-400/50 text-emerald-200 font-mono text-[10px] flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>statePatch Applied: {m.appliedPatchSummary}</span>
                  </div>
                )}
              </div>

              {/* Quick-Reply Option Chips */}
              {m.role === 'assistant' &&
                m.quickOptions &&
                m.quickOptions.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-w-[95%]">
                    {m.quickOptions.map((opt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => sendCommand(opt)}
                        className="px-2.5 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-400/40 text-cyan-200 font-mono text-[11px] text-left transition cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{opt}</span>
                      </button>
                    ))}
                  </div>
                )}
            </div>
          ))}

          {isLoading && (
            <div className="text-xs font-mono text-cyan-300 animate-pulse px-2">
              Evaluating AppState &amp; computing statePatch...
            </div>
          )}
        </div>

        {/* Bottom Command Input Form */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendCommand(inputPrompt);
          }}
          className="p-3.5 border-t border-white/[0.08] bg-black/40 space-y-2"
        >
          <div className="flex items-center gap-2">
            <input
              id="input-assistant-prompt"
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="e.g., I'm tired, give me a stress reset then queue flashcards..."
              className="flex-1 bg-slate-950 border border-white/[0.12] rounded-xl px-3 py-2 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-400"
            />
            <button
              id="btn-send-assistant-prompt"
              type="submit"
              disabled={!inputPrompt.trim() || isLoading}
              className="px-3.5 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Run</span>
            </button>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-cyan-400" />
              <span>Mutates live AppState via structured JSON statePatch</span>
            </span>
            <span>Shortcut: Cmd/Ctrl + /</span>
          </div>
        </form>
      </div>
    </MobileBottomSheet>
  );
};
