import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  GitBranch,
  Lock,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Unlock,
  Upload,
  X,
} from 'lucide-react';
import { LiveTelemetryConfig, SymmetryState } from '../types/symmetry';
import {
  LiveCalendarTelemetryClassification,
  classifyCalendarInputForSevenDays,
  normalizeLiveTelemetryConfig,
  pollLiveCalendarFeed,
} from '../utils/calendarImporter';
import {
  GithubActivityDetection,
  pollGithubActivityTelemetry,
} from '../utils/githubTelemetry';
import { triggerHaptic } from '../utils/haptics';

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: SymmetryState;
  architectModeUnlocked?: boolean;
  onUpdateTelemetryConfig: (patch: Partial<LiveTelemetryConfig>) => void;
  onApplyCalendarTelemetryState: (nextState: SymmetryState, summary: string) => void;
  onDetectedGithubActivity?: (detection: GithubActivityDetection) => void;
  onAutoCreditGithubDetection?: (detection: GithubActivityDetection) => void;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  isOpen,
  onClose,
  state,
  architectModeUnlocked = false,
  onUpdateTelemetryConfig,
  onApplyCalendarTelemetryState,
  onDetectedGithubActivity,
  onAutoCreditGithubDetection,
}) => {
  const normalizedCfg = normalizeLiveTelemetryConfig(
    state.liveTelemetryConfig,
    architectModeUnlocked
  );

  const [icsFeedUrl, setIcsFeedUrl] = useState(normalizedCfg.icsFeedUrl ?? '');
  const [pollIntervalMinutes, setPollIntervalMinutes] = useState<number>(
    normalizedCfg.pollIntervalMinutes || 15
  );
  const [useProxyFallback, setUseProxyFallback] = useState(true);
  const [manualFallbackOpen, setManualFallbackOpen] = useState(false);
  const [manualText, setManualText] = useState('');

  const [githubUsername, setGithubUsername] = useState(
    normalizedCfg.githubUsername ?? ''
  );
  const [githubToken, setGithubToken] = useState(
    normalizedCfg.githubToken ?? ''
  );
  const [githubAutoCreditEnabled, setGithubAutoCreditEnabled] = useState(
    Boolean(normalizedCfg.githubAutoCreditEnabled)
  );

  const [pollingCalendar, setPollingCalendar] = useState(false);
  const [pollingGithub, setPollingGithub] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [classificationPreview, setClassificationPreview] =
    useState<LiveCalendarTelemetryClassification | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const cfg = normalizeLiveTelemetryConfig(
      state.liveTelemetryConfig,
      architectModeUnlocked
    );
    setIcsFeedUrl(cfg.icsFeedUrl ?? '');
    setPollIntervalMinutes(cfg.pollIntervalMinutes || 15);
    setGithubUsername(cfg.githubUsername ?? '');
    setGithubToken(cfg.githubToken ?? '');
    setGithubAutoCreditEnabled(Boolean(cfg.githubAutoCreditEnabled));
    setErrorMessage(null);
    setStatusMessage(null);
  }, [isOpen, state.liveTelemetryConfig, architectModeUnlocked]);

  if (!isOpen) return null;

  const handleSaveTelemetryConfig = () => {
    triggerHaptic([10]);
    onUpdateTelemetryConfig({
      icsFeedUrl: icsFeedUrl.trim(),
      pollIntervalMinutes,
      githubUsername: githubUsername.trim(),
      githubToken: githubToken.trim(),
      githubAutoCreditEnabled,
    });
    setStatusMessage('Saved Live Telemetry settings.');
    setErrorMessage(null);
  };

  const handlePollCalendarNow = async () => {
    const trimmedUrl = icsFeedUrl.trim();
    if (!trimmedUrl) {
      setErrorMessage(
        'Enter a Calendar .ics URL first, or expand Manual Paste / .ics Upload below.'
      );
      setManualFallbackOpen(true);
      return;
    }

    triggerHaptic([12]);
    setPollingCalendar(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const candidateState: SymmetryState = {
      ...state,
      liveTelemetryConfig: {
        ...normalizedCfg,
        icsFeedUrl: trimmedUrl,
        pollIntervalMinutes,
        githubUsername: githubUsername.trim(),
        githubToken: githubToken.trim(),
        githubAutoCreditEnabled,
      },
    };

    const res = await pollLiveCalendarFeed(candidateState, {
      force: true,
      allowCorsProxyFallback: useProxyFallback,
    });

    setPollingCalendar(false);

    if (!res.ok || !res.classification) {
      setErrorMessage(
        res.error ||
          'Unable to poll .ics feed directly. Paste .ics content or upload a file below.'
      );
      setManualFallbackOpen(true);
      return;
    }

    setClassificationPreview(res.classification);
    onApplyCalendarTelemetryState(
      res.classification.nextState,
      `Synced ${res.classification.preview.eventsFound} calendar event(s) (${res.classification.taperDaysCount} Taper/Lab day(s), ${res.classification.earlyShutdownDaysCount} Early Shutdown badge(s))`
    );
    setStatusMessage(
      `Live .ics feed synced${
        res.usedCorsFallback ? ' (via CORS fallback)' : ''
      } • ${res.classification.preview.eventsFound} event(s) classified across 7 logical days.`
    );
  };

  const handlePreviewManualInput = (raw: string) => {
    setManualText(raw);
    if (!raw.trim()) {
      setClassificationPreview(null);
      return;
    }
    const result = classifyCalendarInputForSevenDays(raw, state);
    setClassificationPreview(result);
    setErrorMessage(null);
  };

  const handleUploadIcsFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const content = await file.text();
      setManualFallbackOpen(true);
      handlePreviewManualInput(content);
      setStatusMessage(`Loaded ${file.name} — review 7-day anchor preview below.`);
    } catch {
      setErrorMessage('Could not read uploaded .ics file.');
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyPreview = () => {
    if (!classificationPreview) return;
    triggerHaptic([15]);
    const nextWithSettings: SymmetryState = {
      ...classificationPreview.nextState,
      liveTelemetryConfig: {
        ...normalizeLiveTelemetryConfig(
          classificationPreview.nextState.liveTelemetryConfig,
          architectModeUnlocked
        ),
        icsFeedUrl: icsFeedUrl.trim(),
        pollIntervalMinutes,
        githubUsername: githubUsername.trim(),
        githubToken: githubToken.trim(),
        githubAutoCreditEnabled,
      },
    };
    onApplyCalendarTelemetryState(
      nextWithSettings,
      `Applied 7-day calendar anchors (${classificationPreview.taperDaysCount} Taper/Lab, ${classificationPreview.earlyShutdownDaysCount} Early Shutdown)`
    );
    setStatusMessage('Applied 7-day calendar anchors to Focus Pipeline.');
  };

  const handlePollGithubNow = async () => {
    const cleanUser = githubUsername.trim();
    if (!cleanUser) {
      setErrorMessage('Enter a GitHub username to poll repository events.');
      return;
    }

    triggerHaptic([12]);
    setPollingGithub(true);
    setErrorMessage(null);
    setStatusMessage(null);

    const candidateState: SymmetryState = {
      ...state,
      liveTelemetryConfig: {
        ...normalizedCfg,
        icsFeedUrl: icsFeedUrl.trim(),
        pollIntervalMinutes,
        githubUsername: cleanUser,
        githubToken: githubToken.trim(),
        githubAutoCreditEnabled,
      },
    };

    onUpdateTelemetryConfig({
      icsFeedUrl: icsFeedUrl.trim(),
      pollIntervalMinutes,
      githubUsername: cleanUser,
      githubToken: githubToken.trim(),
      githubAutoCreditEnabled,
    });

    const res = await pollGithubActivityTelemetry(candidateState, {
      force: true,
      architectModeUnlocked,
    });

    setPollingGithub(false);

    if (!res.ok) {
      setErrorMessage(res.error || 'Failed to poll GitHub events API.');
      return;
    }

    if (res.syncedAtIso) {
      onUpdateTelemetryConfig({ lastGithubSyncAt: res.syncedAtIso });
    }

    if (!res.detection) {
      setStatusMessage(
        `GitHub synced (@${cleanUser}) — no uncredited Push / PR / Release events since 4:00 AM rollover.`
      );
      return;
    }

    if (githubAutoCreditEnabled && onAutoCreditGithubDetection) {
      onAutoCreditGithubDetection(res.detection);
      setStatusMessage(
        `Auto-credited 1 Output / Ambition Drip block from ${res.detection.primaryRepo} (${res.detection.totalActivityUnits} commits/releases) → ${res.detection.mapping.displayLabel}.`
      );
    } else {
      onDetectedGithubActivity?.(res.detection);
      setStatusMessage(res.detection.bannerMessage);
    }
  };

  const tomorrowLocked = Boolean(
    classificationPreview?.hasMorningAnchorTomorrow ??
      (state.hasMorningAnchorTomorrow || state.pipelineDays[1]?.earlyMorningAnchor)
  );

  return (
    <AnimatePresence>
      <div
        id="modal-live-telemetry-sync"
        role="dialog"
        aria-modal="true"
        aria-label="Live External Telemetry Bridges"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 8 }}
          transition={{ duration: 0.18 }}
          className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#070a11]/95 border border-white/[0.08] shadow-2xl p-6 space-y-5 text-slate-100"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/[0.06] pb-4">
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-teal-300">
                TRACK 5 • LIVE EXTERNAL TELEMETRY BRIDGES (4:00 AM ROLLOVER)
              </span>
              <h2 className="font-serif text-2xl sm:text-3xl font-medium text-white mt-0.5">
                Calendar Auto-Anchors &amp; GitHub Output Auto-Credit
              </h2>
            </div>
            <button
              id="btn-close-calendar-sync-modal"
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.07] flex items-center justify-center text-slate-300 cursor-pointer"
              aria-label="Close Live Telemetry Modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status / Error Banners */}
          {statusMessage && (
            <div className="p-3 rounded-2xl bg-emerald-950/45 border border-emerald-400/35 text-xs text-emerald-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-2xl bg-amber-950/45 border border-amber-400/35 text-xs text-amber-100 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Section 1: Live Calendar .ics Feed Poller */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-teal-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-teal-200 font-semibold">
                  1. Live Calendar .ics Polling &amp; 7-Day Anchor Classifier
                </span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded-full border font-mono text-[10px] flex items-center gap-1 ${
                  tomorrowLocked
                    ? 'bg-amber-500/15 border-amber-400/40 text-amber-200'
                    : 'bg-emerald-500/15 border-emerald-400/35 text-emerald-200'
                }`}
              >
                {tomorrowLocked ? (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Tomorrow &lt;10:00 AM Anchor: Flow Extension Locked</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-3 h-3" />
                    <span>Tomorrow &lt;10:00 AM Anchor: Clear</span>
                  </>
                )}
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Polls on app load, <code className="font-mono text-slate-300">window.focus</code>{' '}
              (throttled to {pollIntervalMinutes}m), and via 1-click sync. Shifts{' '}
              <code className="font-mono text-teal-200">&gt;= 90m</code> set Fixed Anchors and
              recommend <code className="font-mono text-teal-200">TAPER_LAB (8b)</code>; evening
              events <code className="font-mono text-amber-200">17:30–21:00</code> attach{' '}
              <code className="font-mono text-amber-200">Early Shutdown (6:00 PM)</code>; next-morning
              events <code className="font-mono text-cyan-200">&lt; 10:00 AM</code> lock tonight&apos;s
              Flow Extension gate.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_130px] gap-2">
              <input
                id="input-live-ics-feed-url"
                type="url"
                value={icsFeedUrl}
                onChange={(e) => setIcsFeedUrl(e.target.value)}
                placeholder="https://calendar.google.com/calendar/ical/.../basic.ics or webcal://..."
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/[0.09] text-xs font-mono text-slate-100"
              />
              <select
                id="select-telemetry-poll-interval"
                value={pollIntervalMinutes}
                onChange={(e) => setPollIntervalMinutes(Number(e.target.value) || 15)}
                className="px-2.5 py-2 rounded-xl bg-slate-950 border border-white/[0.09] text-xs font-mono text-slate-200"
                aria-label="Telemetry poll interval in minutes"
              >
                <option value={15}>Every 15m</option>
                <option value={30}>Every 30m</option>
                <option value={60}>Every 60m</option>
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="inline-flex items-center gap-2 text-[11px] font-mono text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useProxyFallback}
                  onChange={(e) => setUseProxyFallback(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-teal-400"
                />
                <span>Allow CORS proxy fallback if direct .ics fetch is blocked</span>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                {normalizedCfg.lastCalendarSyncAt && (
                  <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      Last sync:{' '}
                      {new Date(normalizedCfg.lastCalendarSyncAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </span>
                )}
                <button
                  id="btn-poll-live-calendar-now"
                  type="button"
                  disabled={pollingCalendar}
                  onClick={() => void handlePollCalendarNow()}
                  className="px-3.5 py-1.5 rounded-full bg-teal-400 hover:bg-teal-300 text-slate-950 font-mono font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${pollingCalendar ? 'animate-spin' : ''}`}
                  />
                  <span>{pollingCalendar ? 'Syncing .ics...' : 'Sync .ics Feed Now'}</span>
                </button>
              </div>
            </div>

            {/* Progressive-disclosure manual .ics paste / file upload fallback */}
            <div className="pt-2 border-t border-white/[0.05]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  id="btn-toggle-manual-ics-fallback"
                  type="button"
                  onClick={() => setManualFallbackOpen((prev) => !prev)}
                  className="text-[11px] font-mono text-slate-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <span>Fallback: Upload .ics File or Paste Schedule Text</span>
                  {manualFallbackOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ics,text/calendar,text/plain"
                  className="hidden"
                  onChange={(e) => void handleUploadIcsFile(e)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] font-mono text-[11px] text-slate-200 flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-3 h-3 text-teal-300" />
                  <span>Upload .ics</span>
                </button>
              </div>

              {manualFallbackOpen && (
                <div className="mt-2.5 space-y-2">
                  <textarea
                    id="textarea-manual-ics-fallback"
                    rows={4}
                    value={manualText}
                    onChange={(e) => handlePreviewManualInput(e.target.value)}
                    placeholder={
                      'Paste raw BEGIN:VCALENDAR (.ics) content or plain schedule lines:\nFri 9:00 AM - 11:00 AM Clinical Lab Shift\nSat 6:30 PM Evening Outing'
                    }
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-white/[0.08] font-mono text-xs text-slate-200"
                  />
                </div>
              )}
            </div>

            {/* 7-Day Anchor Classification Preview */}
            {classificationPreview && (
              <div className="p-3 rounded-xl bg-slate-950/90 border border-teal-500/30 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-mono text-teal-200 font-semibold">
                    7-Day Classification ({classificationPreview.preview.eventsFound} events •{' '}
                    {classificationPreview.taperDaysCount} TAPER_LAB •{' '}
                    {classificationPreview.earlyShutdownDaysCount} Early Shutdown)
                  </span>
                  <button
                    id="btn-apply-calendar-classification"
                    type="button"
                    onClick={handleApplyPreview}
                    className="px-3 py-1 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-mono font-semibold text-[11px] cursor-pointer"
                  >
                    Apply to 7-Day Pipeline
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {classificationPreview.preview.dayPreviews.map((dp) => (
                    <div
                      key={dp.dayIndex}
                      className="px-2.5 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.05] flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono"
                    >
                      <span className="text-slate-200">{dp.dayLabel}</span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {dp.suggestTaperLab && (
                          <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/35 text-[10px] text-cyan-200">
                            TAPER_LAB (8b)
                          </span>
                        )}
                        {dp.earlyShutdownBadge && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 text-[10px] text-amber-200">
                            Early Shutdown (6:00 PM)
                          </span>
                        )}
                        {dp.earlyMorningAnchor && (
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/15 border border-indigo-400/35 text-[10px] text-indigo-200">
                            &lt;10:00 AM Anchor
                          </span>
                        )}
                        {!dp.suggestTaperLab &&
                          !dp.earlyShutdownBadge &&
                          !dp.earlyMorningAnchor && (
                            <span className="text-[10px] text-slate-500">Clear</span>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 2: Live GitHub Activity Auto-Credit Bridge */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <GitBranch className="w-4 h-4 text-violet-400" />
                <span className="text-xs font-mono uppercase tracking-wider text-violet-200 font-semibold">
                  2. Live GitHub Activity Auto-Credit Bridge
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-white/[0.04] border border-white/[0.08] font-mono text-[10px] text-slate-300">
                {normalizedCfg.creditedGithubEventIds.length} event IDs logged
              </span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Detects <code className="font-mono text-slate-200">PushEvent</code>, merged/closed{' '}
              <code className="font-mono text-slate-200">PullRequestEvent</code>, and{' '}
              <code className="font-mono text-slate-200">ReleaseEvent</code> since the{' '}
              <code className="font-mono text-cyan-200">4:00 AM</code> logical day rollover,
              routing scientific/research repos to{' '}
              <code className="font-mono text-cyan-200">Major Track 1 (1B_INDEPENDENT)</code> and
              software/tooling repos to{' '}
              <code className="font-mono text-violet-200">Minor Track 1 (SANDBOX_1)</code>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  GitHub Username
                </label>
                <input
                  id="input-github-telemetry-username"
                  type="text"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="GitHub username (e.g. octocat)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/[0.09] text-xs font-mono text-slate-100"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                  Personal Token (Optional — Private Repos / Rate Limit)
                </label>
                <input
                  id="input-github-telemetry-token"
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="ghp_... or github_pat_... (local-only)"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/[0.09] text-xs font-mono text-slate-100"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <label className="inline-flex items-center gap-2 text-xs font-mono text-slate-200 cursor-pointer">
                <input
                  id="checkbox-github-auto-credit"
                  type="checkbox"
                  checked={githubAutoCreditEnabled}
                  onChange={(e) => setGithubAutoCreditEnabled(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-violet-400"
                />
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Auto-credit 1 Ambition Drip / Output block automatically</span>
                </span>
              </label>

              <button
                id="btn-poll-github-telemetry-now"
                type="button"
                disabled={pollingGithub}
                onClick={() => void handlePollGithubNow()}
                className="px-3.5 py-1.5 rounded-full bg-violet-400 hover:bg-violet-300 text-slate-950 font-mono font-semibold text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${pollingGithub ? 'animate-spin' : ''}`}
                />
                <span>{pollingGithub ? 'Checking GitHub...' : 'Sync GitHub Events'}</span>
              </button>
            </div>
          </div>

          {/* Footer Save / Close */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/[0.06]">
            <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Tokens stay in local device storage; stripped from public shares.</span>
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/[0.08] font-mono text-xs text-slate-200 cursor-pointer"
              >
                Close
              </button>
              <button
                id="btn-save-live-telemetry-config"
                type="button"
                onClick={handleSaveTelemetryConfig}
                className="px-4 py-2 rounded-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-mono font-semibold text-xs cursor-pointer"
              >
                Save Telemetry Config
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
