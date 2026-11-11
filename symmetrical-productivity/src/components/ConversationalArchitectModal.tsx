import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  BookmarkPlus,
  Check,
  CheckCircle2,
  ClipboardCopy,
  ClipboardPaste,
  Cpu,
  KeyRound,
  Loader2,
  RotateCcw,
  Send,
  ShieldAlert,
  Sparkles,
  Wand2,
  X,
} from 'lucide-react';
import { SymmetryState } from '../types/symmetry';
import {
  applyConfigPatchToState,
  ArchitectChatMessage,
  ArchitectExecutionTier,
  computeConfigDiffItems,
  ConfigDiffItem,
  filterConfigPatchBySelectedIds,
  generateConversationalSetupPromptForGemini,
  getImmediateArchitectAiTier,
  parseExternalArchitectJson,
  probeChromeBuiltInAiAvailability,
  runConversationalArchitectTurn,
  WorkspaceConfigPatch,
} from '../utils/configCompiler';
import {
  getPersonalByokKey,
  PRO_MODE_CHANGE_EVENT,
  setPersonalByokKey,
} from '../utils/geminiClient';
import { triggerHaptic } from '../utils/haptics';
import { soundEngine } from '../utils/soundEngine';

export interface ConversationalArchitectModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: SymmetryState;
  isEveningTheme?: boolean;
  onApplyCustomizedState: (
    nextState: SymmetryState,
    undoSummary: string,
    layoutOverride?: 'split' | 'widget' | 'full'
  ) => void;
  onTriggerUndo?: () => void;
  canUndo?: boolean;
}

const STARTER_EXAMPLE_PROMPTS: {
  id: string;
  badge: string;
  prompt: string;
}[] = [
  {
    id: 'starter_designer_adhd',
    badge: 'Freelance Designer • 15m + Minimal UI',
    prompt:
      "I'm a freelance designer with ADHD—keep daily admin to 1 block, give me shorter 15m blocks, rename Evening slots around sketching, cozy games, and anime, and hide clutter.",
  },
  {
    id: 'starter_engineer_builder',
    badge: 'Software Engineer • Low Overhead',
    prompt:
      "I'm a software engineer—keep PR/inbox triage to 1 block, use 25m deep blocks, enable Dual-Slot mode, and set Evening slots to guitar, sci-fi reading, and 3D printing.",
  },
  {
    id: 'starter_grad_student',
    badge: 'Grad Researcher • Recall + Writing',
    prompt:
      "I'm a grad researcher—set 20m blocks, shut down by 6:00 PM, use Gentle 40m evening check-ins, and set Evening channels around cooking, language audio, and cinema.",
  },
];

export const ConversationalArchitectModal: React.FC<
  ConversationalArchitectModalProps
> = ({
  isOpen,
  onClose,
  state,
  isEveningTheme = false,
  onApplyCustomizedState,
  onTriggerUndo,
  canUndo = false,
}) => {
  const [messages, setMessages] = useState<ArchitectChatMessage[]>([]);
  const [inputDraft, setInputDraft] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [chromeAiReady, setChromeAiReady] = useState(false);
  const [tierVersion, setTierVersion] = useState(0);

  // Per-message selected diff item IDs & custom preset name drafts
  const [selectedDiffIdsByMsg, setSelectedDiffIdsByMsg] = useState<
    Record<string, Record<string, boolean>>
  >({});
  const [presetNameByMsg, setPresetNameByMsg] = useState<Record<string, string>>(
    {}
  );

  // Optional inline API key & Gemini Chat copy/paste bridge drawers
  const [apiKeyPanelOpen, setApiKeyPanelOpen] = useState(false);
  const [byokDraft, setByokDraft] = useState(() => getPersonalByokKey());
  const [copiedGeminiPrompt, setCopiedGeminiPrompt] = useState(false);
  const [pasteBridgeOpen, setPasteBridgeOpen] = useState(false);
  const [pasteJsonDraft, setPasteJsonDraft] = useState('');
  const [pasteError, setPasteError] = useState<string | null>(null);

  const scrollBottomRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let active = true;
    probeChromeBuiltInAiAvailability().then((ready) => {
      if (active) setChromeAiReady(ready);
    });
    const onProChange = () => {
      setByokDraft(getPersonalByokKey());
      setTierVersion((v) => v + 1);
    };
    window.addEventListener(PRO_MODE_CHANGE_EVENT, onProChange);
    return () => {
      active = false;
      window.removeEventListener(PRO_MODE_CHANGE_EVENT, onProChange);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      const id = window.setTimeout(() => {
        textareaRef.current?.focus();
      }, 60);
      return () => window.clearTimeout(id);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, isGenerating]);

  const activeTier: ArchitectExecutionTier = useMemo(
    () => getImmediateArchitectAiTier(chromeAiReady),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chromeAiReady, tierVersion, isOpen]
  );

  if (!isOpen) return null;

  const tierMeta =
    activeTier === 'GEMINI_FLASH'
      ? {
          label: 'Tier 1 • Gemini 2.5 Flash (Structured JSON)',
          badgeClass:
            'bg-emerald-500/15 border-emerald-400/40 text-emerald-200',
        }
      : activeTier === 'CHROME_BUILTIN_AI'
      ? {
          label: 'Tier 2 • Chrome On-Device LanguageModel',
          badgeClass: 'bg-cyan-500/15 border-cyan-400/40 text-cyan-200',
        }
      : {
          label: 'Tier 3 • Local Intent Compiler (Offline Ready)',
          badgeClass: 'bg-amber-500/15 border-amber-400/40 text-amber-200',
        };

  const initializeSelectionMapForTurn = (
    msgId: string,
    patch: WorkspaceConfigPatch
  ) => {
    const diffs = computeConfigDiffItems(state, patch);
    const nextMap: Record<string, boolean> = {};
    for (const d of diffs) {
      nextMap[d.id] = true;
    }
    setSelectedDiffIdsByMsg((prev) => ({
      ...prev,
      [msgId]: nextMap,
    }));
    setPresetNameByMsg((prev) => ({
      ...prev,
      [msgId]:
        patch.presetMeta?.name ||
        `${state.profileName || 'Custom Setup'} (AI)`,
    }));
  };

  const handleSendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || isGenerating) return;
    triggerHaptic([12]);
    soundEngine.playTactileClick('UI_TAP');

    const userMsg: ArchitectChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestampIso: new Date().toISOString(),
    };

    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInputDraft('');
    setIsGenerating(true);

    try {
      const turnRes = await runConversationalArchitectTurn(
        trimmed,
        messages,
        state
      );
      const asstId = `asst_${Date.now()}`;
      const asstMsg: ArchitectChatMessage = {
        id: asstId,
        role: 'assistant',
        content: turnRes.reply,
        timestampIso: new Date().toISOString(),
        turnResponse: turnRes,
      };
      initializeSelectionMapForTurn(asstId, turnRes.configPatch);
      setMessages((prev) => [...prev, asstMsg]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPromptForGeminiChat = async () => {
    triggerHaptic([12]);
    soundEngine.playTactileClick('UI_TAP');
    const promptStr = generateConversationalSetupPromptForGemini(
      state,
      messages,
      inputDraft
    );
    try {
      await navigator.clipboard.writeText(promptStr);
      setCopiedGeminiPrompt(true);
      window.setTimeout(() => setCopiedGeminiPrompt(false), 2600);
    } catch {
      // Fallback: open paste drawer with instructions
    }
  };

  const handleImportPastedGeminiJson = () => {
    setPasteError(null);
    try {
      const turnRes = parseExternalArchitectJson(pasteJsonDraft, state);
      const asstId = `asst_ext_${Date.now()}`;
      const asstMsg: ArchitectChatMessage = {
        id: asstId,
        role: 'assistant',
        content: turnRes.reply,
        timestampIso: new Date().toISOString(),
        turnResponse: turnRes,
      };
      initializeSelectionMapForTurn(asstId, turnRes.configPatch);
      setMessages((prev) => [...prev, asstMsg]);
      setPasteJsonDraft('');
      setPasteBridgeOpen(false);
      triggerHaptic([15]);
    } catch {
      setPasteError(
        'Could not parse JSON block. Paste the ```json ... ``` response from Gemini Chat.'
      );
    }
  };

  const handleApplyTurnPatch = (
    msg: ArchitectChatMessage,
    saveAsPreset: boolean
  ) => {
    if (!msg.turnResponse) return;
    triggerHaptic([15, 25]);
    soundEngine.playTactileClick('MODE_TOGGLE');

    const diffItems = computeConfigDiffItems(state, msg.turnResponse.configPatch);
    const selectionMap = selectedDiffIdsByMsg[msg.id] || {};
    const checkedIds = new Set<string>(
      diffItems
        .filter((item) => selectionMap[item.id] !== false)
        .map((item) => item.id)
    );

    const filteredPatch = filterConfigPatchBySelectedIds(
      msg.turnResponse.configPatch,
      checkedIds
    );
    const customName = presetNameByMsg[msg.id]?.trim();

    const applied = applyConfigPatchToState(state, filteredPatch, {
      saveAsCustomPreset: saveAsPreset,
      customPresetNameOverride: saveAsPreset ? customName : undefined,
    });

    const summaryText =
      applied.appliedSummaryLines.slice(0, 3).join(', ') ||
      'Conversational Workspace Customization';

    onApplyCustomizedState(
      applied.nextState,
      summaryText,
      filteredPatch.schedulePrefs?.layoutMode
    );

    setMessages((prev) =>
      prev.map((m) =>
        m.id === msg.id ? { ...m, appliedDiffCount: checkedIds.size } : m
      )
    );
  };

  return (
    <div
      id="conversational-architect-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Conversational Setup & Live Workspace Architect"
      className="fixed inset-0 z-[65] bg-black/80 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.18 }}
        className={`w-full max-w-4xl max-h-[92vh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
          isEveningTheme
            ? 'bg-[#0b0907] border-amber-400/25 text-amber-50'
            : 'bg-[#080c14] border-white/10 text-slate-100'
        }`}
      >
        {/* Top Header */}
        <div className="px-5 py-3.5 border-b border-white/[0.07] bg-black/30 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-9 h-9 rounded-2xl border flex items-center justify-center shrink-0 ${
                isEveningTheme
                  ? 'bg-amber-500/15 border-amber-400/35 text-amber-300'
                  : 'bg-cyan-500/15 border-cyan-400/35 text-cyan-300'
              }`}
            >
              <Wand2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-sm sm:text-base font-bold tracking-tight text-white">
                  Customize Workspace with AI
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full border font-mono text-[10px] flex items-center gap-1 ${tierMeta.badgeClass}`}
                >
                  <Cpu className="w-3 h-3 shrink-0" />
                  <span>{tierMeta.label}</span>
                </span>
              </div>
              <p className="text-[11px] text-slate-400 truncate">
                Describe your work, attention pace, baseline habits, or evening hobbies — core mechanical guardrails stay 100% protected.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            <button
              id="btn-copy-architect-gemini-prompt"
              type="button"
              onClick={() => void handleCopyPromptForGeminiChat()}
              title="Copy structured prompt for Gemini web chat (compatible with Cmd/Ctrl+Shift+V clipboard sync)"
              className="px-2.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] font-mono text-[11px] text-slate-200 flex items-center gap-1.5 cursor-pointer transition"
            >
              {copiedGeminiPrompt ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">Copied for Gemini Chat</span>
                </>
              ) : (
                <>
                  <ClipboardCopy className="w-3.5 h-3.5 text-sky-400" />
                  <span>Copy Setup Prompt for Gemini Chat</span>
                </>
              )}
            </button>

            <button
              id="btn-toggle-paste-architect-json"
              type="button"
              onClick={() => setPasteBridgeOpen((p) => !p)}
              title="Paste JSON response from Gemini Chat"
              className={`px-2.5 py-1.5 rounded-xl border font-mono text-[11px] flex items-center gap-1 cursor-pointer transition ${
                pasteBridgeOpen
                  ? 'bg-sky-500/20 border-sky-400/40 text-sky-200'
                  : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-slate-300'
              }`}
            >
              <ClipboardPaste className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Paste JSON</span>
            </button>

            <button
              id="btn-toggle-architect-api-key"
              type="button"
              onClick={() => setApiKeyPanelOpen((p) => !p)}
              title="Configure Gemini API Key for live Gemini 2.5 Flash structured turns"
              className={`px-2.5 py-1.5 rounded-xl border font-mono text-[11px] flex items-center gap-1 cursor-pointer transition ${
                apiKeyPanelOpen
                  ? 'bg-emerald-500/20 border-emerald-400/40 text-emerald-200'
                  : 'bg-white/[0.04] hover:bg-white/[0.09] border-white/[0.08] text-slate-300'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">API Key</span>
            </button>

            <button
              id="btn-close-conversational-architect"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.10] border border-white/[0.07] text-slate-300 cursor-pointer"
              aria-label="Close Conversational Architect"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Optional Inline BYOK Gemini Key Bar */}
        <AnimatePresence>
          {apiKeyPanelOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-5 py-3 bg-slate-950/90 border-b border-white/[0.07] flex flex-wrap items-center gap-2 shrink-0"
            >
              <span className="text-[11px] font-mono text-slate-300">
                Gemini API Key (<code className="text-emerald-300">gemini-2.5-flash</code>):
              </span>
              <input
                type="password"
                value={byokDraft}
                onChange={(e) => setByokDraft(e.target.value)}
                placeholder="AIzaSy... (stored locally in browser)"
                className="flex-1 min-w-[220px] px-3 py-1.5 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-slate-100 focus:outline-none focus:border-emerald-400/50"
              />
              <button
                type="button"
                onClick={() => {
                  setPersonalByokKey(byokDraft);
                  setTierVersion((v) => v + 1);
                  setApiKeyPanelOpen(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-bold text-xs cursor-pointer"
              >
                Save Key
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Optional Paste Gemini Chat JSON Drawer */}
        <AnimatePresence>
          {pasteBridgeOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-5 py-3 bg-slate-950/90 border-b border-sky-500/30 space-y-2 shrink-0"
            >
              <div className="flex items-center justify-between text-xs font-mono text-sky-200">
                <span>
                  Paste JSON response from Gemini Chat (or press{' '}
                  <kbd className="px-1.5 py-0.5 rounded bg-white/10">Cmd/Ctrl+Shift+V</kbd>{' '}
                  anywhere in the app)
                </span>
                <button
                  type="button"
                  onClick={() => setPasteBridgeOpen(false)}
                  className="text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
              </div>
              <textarea
                rows={4}
                value={pasteJsonDraft}
                onChange={(e) => setPasteJsonDraft(e.target.value)}
                placeholder='Paste ```json { "reply": "...", "configPatch": { ... } } ``` here...'
                className="w-full rounded-xl bg-black/60 border border-white/10 p-2.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-sky-400/50"
              />
              {pasteError && (
                <div className="text-[11px] font-mono text-rose-300">
                  {pasteError}
                </div>
              )}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleImportPastedGeminiJson}
                  className="px-3.5 py-1.5 rounded-xl bg-sky-400 hover:bg-sky-300 text-slate-950 font-mono font-bold text-xs cursor-pointer"
                >
                  Preview Diff Card
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Conversation Timeline Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {messages.length === 0 && (
            <div className="p-4 sm:p-5 rounded-2xl bg-white/[0.025] border border-white/[0.06] space-y-3.5">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-300">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Start a Multi-Turn Workspace Setup Conversation</span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Tell the Architect about your role, preferred block cadence (
                <span className="font-mono text-slate-100">15m / 20m / 25m</span>),
                daily baseline floor (<span className="font-mono text-slate-100">0–8 blocks</span>),
                evening hobbies, Roadmap tracks, or UI labels. Every proposed change appears in a live{' '}
                <strong className="text-white">Diff Preview Card</strong> with per-item checkboxes and 1-tap{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[11px]">
                  Cmd/Ctrl+Z
                </kbd>{' '}
                Undo protection.
              </p>

              <div className="space-y-2 pt-1">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block">
                  Try an Example Prompt:
                </span>
                <div className="grid grid-cols-1 gap-2">
                  {STARTER_EXAMPLE_PROMPTS.map((item) => (
                    <button
                      key={item.id}
                      id={item.id}
                      type="button"
                      onClick={() => void handleSendPrompt(item.prompt)}
                      className="text-left p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/[0.07] hover:border-cyan-400/35 transition group cursor-pointer"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-300">
                          {item.badge}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-300 transition" />
                      </div>
                      <p className="text-xs text-slate-200 leading-snug">
                        &ldquo;{item.prompt}&rdquo;
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {messages.map((msg) => {
            if (msg.role === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[85%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-cyan-500/20 border border-cyan-400/35 text-xs sm:text-sm text-slate-100 leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              );
            }

            const turn = msg.turnResponse;
            const diffItems: ConfigDiffItem[] = turn
              ? computeConfigDiffItems(state, turn.configPatch)
              : [];
            const selectionMap = selectedDiffIdsByMsg[msg.id] || {};
            const checkedCount = diffItems.filter(
              (d) => selectionMap[d.id] !== false
            ).length;

            return (
              <div key={msg.id} className="space-y-3">
                <div className="p-4 rounded-2xl rounded-bl-sm bg-white/[0.035] border border-white/[0.08] space-y-3.5">
                  {/* 1. Concise Reply */}
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-xs sm:text-sm text-slate-100 leading-relaxed">
                      {msg.content}
                    </p>
                    {turn && (
                      <span className="px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/[0.08] font-mono text-[9px] text-slate-400 shrink-0">
                        {turn.executionTier === 'GEMINI_FLASH'
                          ? 'Gemini 2.5 Flash'
                          : turn.executionTier === 'CHROME_BUILTIN_AI'
                          ? 'Chrome AI'
                          : 'Local Compiler'}
                      </span>
                    )}
                  </div>

                  {/* Guardrail Invariant Explanations (if any rule clamped/routed a request) */}
                  {turn && turn.guardrailNotes.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-950/45 border border-amber-400/40 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono font-semibold text-amber-300">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>Core Mechanical Guardrails Enforced</span>
                      </div>
                      <ul className="space-y-1 text-xs text-amber-100/90 list-disc list-inside">
                        {turn.guardrailNotes.map((note, idx) => (
                          <li key={idx}>{note}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 2. Clickable Clarifying Option Chips */}
                  {turn && turn.clarifyingOptions.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
                        Refine or Choose Trade-Off:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {turn.clarifyingOptions.map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            disabled={isGenerating}
                            onClick={() => void handleSendPrompt(opt.prompt)}
                            className="px-3 py-1.5 rounded-full bg-cyan-500/12 hover:bg-cyan-500/25 border border-cyan-400/35 text-xs font-mono text-cyan-100 cursor-pointer transition disabled:opacity-50"
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 3. Live Visual Diff Preview Card */}
                  {diffItems.length > 0 && (
                    <div
                      data-testid="architect-diff-preview-card"
                      className="rounded-2xl bg-black/45 border border-white/[0.09] overflow-hidden"
                    >
                      <div className="px-3.5 py-2.5 bg-white/[0.03] border-b border-white/[0.07] flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-emerald-300">
                            Diff Preview ({checkedCount}/{diffItems.length} selected)
                          </span>
                          {typeof msg.appliedDiffCount === 'number' && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 font-mono text-[10px] text-emerald-200 flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Applied ({msg.appliedDiffCount})</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-mono">
                          <button
                            type="button"
                            onClick={() => {
                              const allSelected = checkedCount === diffItems.length;
                              const next: Record<string, boolean> = {};
                              for (const d of diffItems) {
                                next[d.id] = !allSelected;
                              }
                              setSelectedDiffIdsByMsg((prev) => ({
                                ...prev,
                                [msg.id]: next,
                              }));
                            }}
                            className="text-slate-300 hover:text-white underline cursor-pointer"
                          >
                            {checkedCount === diffItems.length
                              ? 'Uncheck All'
                              : 'Select All'}
                          </button>
                        </div>
                      </div>

                      <div className="divide-y divide-white/[0.06] max-h-64 overflow-y-auto">
                        {diffItems.map((item) => {
                          const isChecked = selectionMap[item.id] !== false;
                          return (
                            <label
                              key={item.id}
                              className={`px-3.5 py-2.5 flex items-start gap-3 cursor-pointer select-none transition ${
                                isChecked
                                  ? 'bg-transparent hover:bg-white/[0.025]'
                                  : 'bg-black/30 opacity-55'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setSelectedDiffIdsByMsg((prev) => ({
                                    ...prev,
                                    [msg.id]: {
                                      ...(prev[msg.id] || {}),
                                      [item.id]: checked,
                                    },
                                  }));
                                }}
                                className="mt-1 rounded border-slate-600 bg-slate-900 text-emerald-400 focus:ring-emerald-400"
                              />
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`px-1.5 py-0.5 rounded font-mono text-[9px] font-bold uppercase ${
                                      item.changeKind === 'ADDED'
                                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                                        : item.changeKind === 'RENAMED'
                                        ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                                        : 'bg-sky-500/20 text-sky-300 border border-sky-400/30'
                                    }`}
                                  >
                                    {item.changeKind}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-400">
                                    {item.sectionLabel}
                                  </span>
                                  <span className="text-xs font-semibold text-white">
                                    {item.label}
                                  </span>
                                </div>
                                <div className="text-[11px] font-mono flex flex-wrap items-center gap-1.5">
                                  <span className="text-slate-400 line-through">
                                    {item.beforeSummary}
                                  </span>
                                  <span className="text-slate-500">→</span>
                                  <span className="text-emerald-200">
                                    {item.afterSummary}
                                  </span>
                                </div>
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      {/* Apply Actions Bar */}
                      <div className="px-3.5 py-3 bg-white/[0.03] border-t border-white/[0.07] flex flex-wrap items-center justify-between gap-2.5">
                        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                          <input
                            type="text"
                            value={presetNameByMsg[msg.id] || ''}
                            onChange={(e) =>
                              setPresetNameByMsg((prev) => ({
                                ...prev,
                                [msg.id]: e.target.value,
                              }))
                            }
                            placeholder="Custom Preset Name..."
                            aria-label="Custom Preset Name"
                            className="w-full max-w-[240px] px-2.5 py-1.5 rounded-xl bg-black/50 border border-white/10 font-mono text-xs text-slate-100 focus:outline-none focus:border-emerald-400/50"
                          />
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            disabled={checkedCount === 0}
                            onClick={() => handleApplyTurnPatch(msg, false)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-400 hover:bg-emerald-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Apply Changes</span>
                          </button>

                          <button
                            type="button"
                            disabled={checkedCount === 0}
                            onClick={() => handleApplyTurnPatch(msg, true)}
                            className="px-3.5 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 disabled:opacity-40 border border-cyan-400/45 text-cyan-100 font-mono font-semibold text-xs flex items-center gap-1.5 cursor-pointer transition"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                            <span>Apply &amp; Save as Custom Preset</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.07] inline-flex items-center gap-2 text-xs font-mono text-cyan-200">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              <span>Compiling validated WorkspaceConfigPatch...</span>
            </div>
          )}

          <div ref={scrollBottomRef} />
        </div>

        {/* Bottom Composer + 1-Tap Undo Reminder */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void handleSendPrompt(inputDraft);
          }}
          className="px-5 py-3.5 border-t border-white/[0.07] bg-black/40 space-y-2 shrink-0"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={textareaRef}
              id="input-conversational-architect"
              rows={2}
              value={inputDraft}
              onChange={(e) => setInputDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSendPrompt(inputDraft);
                }
              }}
              placeholder='Describe your workflow or ask for a tweak (e.g., "Keep daily admin to 1 block, give me 15m blocks, rename Evening slots around sketching & cozy games")...'
              className="flex-1 rounded-2xl bg-white/[0.04] border border-white/[0.10] px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-cyan-400/60 resize-none"
            />
            <button
              id="btn-send-architect-turn"
              type="submit"
              disabled={!inputDraft.trim() || isGenerating}
              className="h-10 px-4 rounded-2xl bg-cyan-400 hover:bg-cyan-300 disabled:opacity-40 text-slate-950 font-mono font-bold text-xs flex items-center gap-1.5 cursor-pointer transition shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-slate-400">
            <span>
              Shortcut: <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200">Cmd/Ctrl + Shift + K</kbd> • Undo any customization in 1 tap with <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-slate-200">Cmd/Ctrl + Z</kbd>
            </span>

            {canUndo && onTriggerUndo && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic([12]);
                  onTriggerUndo();
                }}
                className="text-amber-300 hover:text-amber-200 inline-flex items-center gap-1 underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Revert Last Change (Cmd+Z)</span>
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};
