import React, { useState } from 'react';
import {
  BaselineBlock,
  ProfilePresetId,
  SymmetryState,
  TrackId,
} from '../types/symmetry';
import {
  CustomArchitectureDraft,
  getDefaultCustomArchitectureDraft,
  getVisibleProfilePresets,
} from '../state/profilePresets';
import { formatRolloverHourLabel } from '../state/defaultState';
import {
  Sparkles,
  CheckCircle2,
  Lock,
  Layers,
  Sliders,
  Moon,
  Compass,
  Clock,
  ArrowRight,
  ArrowLeft,
  RotateCcw,
  X,
} from 'lucide-react';

interface OnboardingWizardModalProps {
  isOpen: boolean;
  isFirstVisit: boolean;
  state: SymmetryState;
  architectModeUnlocked?: boolean;
  onLockArchitectMode?: () => void;
  onClose: () => void;
  onApplyPreset: (
    presetId: ProfilePresetId,
    options?: {
      logicalDayRolloverHour?: number;
      earlyEveningShutdownTime?: string;
      customDraft?: CustomArchitectureDraft;
    }
  ) => void;
  onUpdateDayBoundaryPreferences: (
    logicalDayRolloverHour: number,
    earlyEveningShutdownTime: string
  ) => void;
}

const ROLLOVER_HOUR_OPTIONS = [0, 1, 2, 3, 4, 5, 6];
const SHUTDOWN_TIME_OPTIONS = [
  '5:00 PM',
  '5:30 PM',
  '6:00 PM',
  '6:30 PM',
  '7:00 PM',
  '7:30 PM',
  '8:00 PM',
];

export const OnboardingWizardModal: React.FC<OnboardingWizardModalProps> = ({
  isOpen,
  isFirstVisit,
  state,
  architectModeUnlocked = false,
  onLockArchitectMode,
  onClose,
  onApplyPreset,
  onUpdateDayBoundaryPreferences,
}) => {
  const defaultSelectedPreset: ProfilePresetId = architectModeUnlocked
    ? state.profilePresetId || 'AVERY_DEFAULT'
    : state.profilePresetId && state.profilePresetId !== 'AVERY_DEFAULT'
    ? state.profilePresetId
    : 'ACADEMIC_RESEARCHER';

  const [selectedPreset, setSelectedPreset] = useState<ProfilePresetId>(
    defaultSelectedPreset
  );
  const [customStep, setCustomStep] = useState<1 | 2 | 3>(1);
  const [customDraft, setCustomDraft] = useState<CustomArchitectureDraft>(() =>
    getDefaultCustomArchitectureDraft()
  );
  const [rolloverHour, setRolloverHour] = useState<number>(
    state.logicalDayRolloverHour ?? 4
  );
  const [shutdownTime, setShutdownTime] = useState<string>(
    state.earlyEveningShutdownTime || '6:00 PM'
  );

  if (!isOpen) return null;

  const isEveningTheme = Boolean(state.recharge?.endOfShiftLocked);
  const visiblePresets = getVisibleProfilePresets(architectModeUnlocked);
  const activeProfileDisplayName =
    !architectModeUnlocked && state.profilePresetId === 'AVERY_DEFAULT'
      ? 'Academic & Grad Researcher'
      : state.profileName ||
        (architectModeUnlocked ? 'Avery Default' : 'Academic & Grad Researcher');

  const handleSelectPresetCard = (presetId: ProfilePresetId) => {
    setSelectedPreset(presetId);
    if (presetId === 'BLANK_CUSTOM') {
      setCustomStep(1);
    }
  };

  const handleOneClickApply = (presetId: ProfilePresetId) => {
    onApplyPreset(presetId, {
      logicalDayRolloverHour: rolloverHour,
      earlyEveningShutdownTime: shutdownTime,
      customDraft: presetId === 'BLANK_CUSTOM' ? customDraft : undefined,
    });
  };

  const handleRolloverChange = (hour: number) => {
    setRolloverHour(hour);
    onUpdateDayBoundaryPreferences(hour, shutdownTime);
  };

  const handleShutdownTimeChange = (time: string) => {
    setShutdownTime(time);
    onUpdateDayBoundaryPreferences(rolloverHour, time);
  };

  const updateBaselineDraftBlock = (
    idx: number,
    patch: Partial<{
      title: string;
      category: BaselineBlock['category'];
      startupStep: string;
      trackId: TrackId;
    }>
  ) => {
    setCustomDraft((prev) => ({
      ...prev,
      baselineBlocks: prev.baselineBlocks.map((b, i) =>
        i === idx ? { ...b, ...patch } : b
      ),
    }));
  };

  const updateTrackDraft = (
    idx: number,
    patch: Partial<CustomArchitectureDraft['tracks'][number]>
  ) => {
    setCustomDraft((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t, i) => (i === idx ? { ...t, ...patch } : t)),
    }));
  };

  const updateTrackRungDraft = (
    trackIdx: number,
    rungIdx: 0 | 1 | 2 | 3,
    value: string
  ) => {
    setCustomDraft((prev) => ({
      ...prev,
      tracks: prev.tracks.map((t, i) => {
        if (i !== trackIdx) return t;
        const nextRungs: [string, string, string, string] = [...t.rungs] as [
          string,
          string,
          string,
          string,
        ];
        nextRungs[rungIdx] = value;
        return { ...t, rungs: nextRungs };
      }),
    }));
  };

  return (
    <div
      id="modal-onboarding-wizard"
      role="dialog"
      aria-modal="true"
      aria-label="Profile Archetype & Onboarding Wizard"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto"
    >
      <div
        className={`w-full max-w-5xl rounded-2xl border shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col ${
          isEveningTheme
            ? 'bg-stone-950 border-stone-800 text-stone-100'
            : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        {/* Top Modal Header */}
        <div
          className={`px-5 py-4 border-b flex flex-wrap items-center justify-between gap-3 ${
            isEveningTheme
              ? 'bg-stone-900/90 border-stone-800'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-white">
                  Profile Archetype &amp; Onboarding Wizard
                </h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                  30-Second Setup
                </span>
                {isFirstVisit && (
                  <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                    First-Visit Configuration
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Pick a 1-Click Starter Template or configure a Blank Custom Architecture. Capacity ceilings, 5m startup timers, and 20m/60m pacing rules stay locked.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 border border-slate-700">
              Active: <strong className="text-amber-300">{activeProfileDisplayName}</strong>
            </span>
            <button
              id="btn-close-onboarding-wizard"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
              title="Close Onboarding Wizard"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
          {/* Universal Day-Boundary & Pacing Preferences Strip */}
          <div
            id="wizard-day-boundary-bar"
            className={`rounded-xl border p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 ${
              isEveningTheme
                ? 'bg-stone-900/70 border-stone-800'
                : 'bg-slate-50 border-slate-200'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <Clock
                className={`w-4 h-4 mt-0.5 shrink-0 ${
                  isEveningTheme ? 'text-amber-400' : 'text-indigo-600'
                }`}
              />
              <div>
                <div className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-2">
                  <span>Universal Day-Boundary &amp; Pacing Preferences</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      isEveningTheme
                        ? 'bg-stone-800 text-stone-300'
                        : 'bg-indigo-100 text-indigo-800'
                    }`}
                  >
                    Live Sync
                  </span>
                </div>
                <p
                  className={`text-[11px] mt-0.5 ${
                    isEveningTheme ? 'text-stone-400' : 'text-slate-600'
                  }`}
                >
                  Customize when the logical shift day rolls over (late-night sessions stay on the active shift) and the default Evening Outing shutdown anchor.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold">
                <span
                  className={isEveningTheme ? 'text-stone-300' : 'text-slate-700'}
                >
                  Logical Day Rollover Hour:
                </span>
                <select
                  id="wizard-select-rollover-hour"
                  value={rolloverHour}
                  onChange={(e) => handleRolloverChange(Number(e.target.value))}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border focus:outline-none ${
                    isEveningTheme
                      ? 'bg-stone-950 border-stone-700 text-amber-300'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {ROLLOVER_HOUR_OPTIONS.map((hr) => (
                    <option key={hr} value={hr}>
                      {formatRolloverHourLabel(hr)}
                      {hr === 4 ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 text-xs font-semibold">
                <span
                  className={isEveningTheme ? 'text-stone-300' : 'text-slate-700'}
                >
                  Early Evening Shutdown:
                </span>
                <select
                  id="wizard-select-shutdown-time"
                  value={shutdownTime}
                  onChange={(e) => handleShutdownTimeChange(e.target.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold border focus:outline-none ${
                    isEveningTheme
                      ? 'bg-stone-950 border-stone-700 text-amber-300'
                      : 'bg-white border-slate-300 text-slate-900'
                  }`}
                >
                  {SHUTDOWN_TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                      {t === '6:00 PM' ? ' (Default)' : ''}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          {/* Starter Archetypes + Blank Custom Architecture */}
          <div>
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <div className="text-xs font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-amber-500" />
                <span>
                  1. Choose a 1-Click Starter Archetype Template (or Blank Custom Architecture)
                </span>
              </div>
              <span
                className={`text-[11px] font-mono ${
                  isEveningTheme ? 'text-stone-400' : 'text-slate-500'
                }`}
              >
                Pre-populates Baseline Floor • Task Weights • Break Options • 5 Evening Categories • 4-Rung Tracks
              </span>
            </div>

            <div className={`grid grid-cols-1 md:grid-cols-2 ${architectModeUnlocked ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-3`}>
              {visiblePresets.map((preset) => {
                const isSelected = selectedPreset === preset.id;
                const isActiveInState = state.profilePresetId === preset.id;
                const isCustom = preset.id === 'BLANK_CUSTOM';

                return (
                  <div
                    key={preset.id}
                    id={`card-preset-${preset.id}`}
                    onClick={() => handleSelectPresetCard(preset.id)}
                    className={`rounded-xl border p-3.5 flex flex-col justify-between transition-all cursor-pointer ${
                      isSelected
                        ? isEveningTheme
                          ? 'bg-amber-950/30 border-amber-500 ring-2 ring-amber-500/30'
                          : 'bg-indigo-50/70 border-indigo-600 ring-2 ring-indigo-500/20'
                        : isEveningTheme
                        ? 'bg-stone-900/60 border-stone-800 hover:border-stone-700'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                            isCustom
                              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/30'
                              : isEveningTheme
                              ? 'bg-stone-800 text-stone-300'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Preset {preset.number} • {preset.badge}
                        </span>
                        {isActiveInState && (
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-500 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        )}
                      </div>

                      <h3 className="text-sm font-extrabold leading-snug mb-1.5">
                        {preset.title}
                      </h3>

                      <p
                        className={`text-[11px] leading-relaxed mb-2.5 ${
                          isEveningTheme ? 'text-stone-300' : 'text-slate-600'
                        }`}
                      >
                        {preset.description}
                      </p>

                      <div
                        className={`space-y-1 text-[11px] rounded-lg p-2.5 border mb-3 ${
                          isEveningTheme
                            ? 'bg-stone-950/70 border-stone-800/90 text-stone-300'
                            : 'bg-slate-50 border-slate-200/80 text-slate-700'
                        }`}
                      >
                        <div>
                          <span className="font-bold">Floor:</span> {preset.floorSummary}
                        </div>
                        <div>
                          <span className="font-bold">Weights:</span> {preset.weightsSummary}
                        </div>
                        <div>
                          <span className="font-bold">Evening:</span> {preset.eveningSummary}
                        </div>
                        <div>
                          <span className="font-bold">4-Rung Tracks:</span>{' '}
                          {preset.tracksSummary}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {!isCustom ? (
                        <button
                          id={`btn-apply-preset-${preset.id}`}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOneClickApply(preset.id);
                          }}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 ${
                            preset.id === 'AVERY_DEFAULT'
                              ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                              : isEveningTheme
                              ? 'bg-stone-800 hover:bg-stone-700 text-stone-100 border border-stone-700'
                              : 'bg-slate-900 hover:bg-slate-800 text-white'
                          }`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            {preset.id === 'AVERY_DEFAULT'
                              ? '1-Click Restore Avery Default'
                              : `1-Click Apply ${preset.title}`}
                          </span>
                        </button>
                      ) : (
                        <button
                          id="btn-select-preset-BLANK_CUSTOM"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPreset('BLANK_CUSTOM');
                            setCustomStep(1);
                          }}
                          className={`w-full py-2 px-3 rounded-lg text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 ${
                            selectedPreset === 'BLANK_CUSTOM'
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              : isEveningTheme
                              ? 'bg-stone-800 hover:bg-stone-700 text-amber-300 border border-amber-500/40'
                              : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300'
                          }`}
                        >
                          <Sliders className="w-3.5 h-3.5" />
                          <span>
                            {selectedPreset === 'BLANK_CUSTOM'
                              ? 'Custom Builder Open Below'
                              : 'Configure Step-by-Step Below'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Blank Custom Architecture Step-by-Step Builder */}
          {selectedPreset === 'BLANK_CUSTOM' && (
            <div
              id="custom-architecture-builder"
              className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${
                isEveningTheme
                  ? 'bg-stone-900/90 border-amber-500/40'
                  : 'bg-indigo-50/40 border-indigo-200'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 border-slate-200 dark:border-stone-800">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-indigo-600 text-white font-bold">
                      Preset {architectModeUnlocked ? '5' : '4'} • Blank Custom Architecture
                    </span>
                    <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-bold">
                      <Lock className="w-3.5 h-3.5" /> Capacity Ceilings, 5m Ignition &amp; 20m/60m Pacing Locked
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-extrabold mt-1">
                    Step-by-Step Custom Architecture Builder
                  </h3>
                </div>

                {/* Step Tabs */}
                <div className="flex items-center gap-1.5">
                  <button
                    id="btn-custom-step-1"
                    type="button"
                    onClick={() => setCustomStep(1)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      customStep === 1
                        ? 'bg-indigo-600 text-white'
                        : isEveningTheme
                        ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    1. Floor &amp; Weights
                  </button>
                  <button
                    id="btn-custom-step-2"
                    type="button"
                    onClick={() => setCustomStep(2)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      customStep === 2
                        ? 'bg-indigo-600 text-white'
                        : isEveningTheme
                        ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    2. 5 Evening Categories
                  </button>
                  <button
                    id="btn-custom-step-3"
                    type="button"
                    onClick={() => setCustomStep(3)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                      customStep === 3
                        ? 'bg-indigo-600 text-white'
                        : isEveningTheme
                        ? 'bg-stone-800 text-stone-300 hover:bg-stone-700'
                        : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    3. 5 Long-Term Tracks
                  </button>
                </div>
              </div>

              {/* STEP 1: Daily Baseline Blocks & Deliverable Weights */}
              {customStep === 1 && (
                <div id="custom-step-1-panel" className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">
                        Custom Profile Name
                      </label>
                      <input
                        id="input-custom-profile-name"
                        type="text"
                        value={customDraft.profileName}
                        onChange={(e) =>
                          setCustomDraft((prev) => ({
                            ...prev,
                            profileName: e.target.value,
                          }))
                        }
                        className={`w-full px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                          isEveningTheme
                            ? 'bg-stone-950 border-stone-700 text-stone-100'
                            : 'bg-white border-slate-300 text-slate-900'
                        }`}
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">
                        Daily Baseline Floor Size
                      </label>
                      <div className="flex gap-2">
                        <button
                          id="btn-custom-floor-6"
                          type="button"
                          onClick={() =>
                            setCustomDraft((prev) => ({ ...prev, floorCount: 6 }))
                          }
                          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold border ${
                            customDraft.floorCount === 6
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : isEveningTheme
                              ? 'bg-stone-950 border-stone-700 text-stone-300'
                              : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        >
                          6-Block Floor (2h)
                        </button>
                        <button
                          id="btn-custom-floor-7"
                          type="button"
                          onClick={() =>
                            setCustomDraft((prev) => ({ ...prev, floorCount: 7 }))
                          }
                          className={`flex-1 py-1.5 px-2.5 rounded-lg text-xs font-bold border ${
                            customDraft.floorCount === 7
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : isEveningTheme
                              ? 'bg-stone-950 border-stone-700 text-stone-300'
                              : 'bg-white border-slate-300 text-slate-700'
                          }`}
                        >
                          7-Block Floor (2h 20m)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider mb-1">
                        Deliverable Weights (8b Heavy / 4b Medium)
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          id="input-custom-heavy-weight-label"
                          type="text"
                          value={customDraft.taskWeights.heavyLabel}
                          onChange={(e) =>
                            setCustomDraft((prev) => ({
                              ...prev,
                              taskWeights: {
                                ...prev.taskWeights,
                                heavyLabel: e.target.value,
                              },
                            }))
                          }
                          placeholder="Heavy (8b) Label"
                          className={`px-2 py-1.5 rounded-lg text-xs border ${
                            isEveningTheme
                              ? 'bg-stone-950 border-stone-700 text-stone-100'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                        <input
                          id="input-custom-medium-weight-label"
                          type="text"
                          value={customDraft.taskWeights.mediumLabel}
                          onChange={(e) =>
                            setCustomDraft((prev) => ({
                              ...prev,
                              taskWeights: {
                                ...prev.taskWeights,
                                mediumLabel: e.target.value,
                              },
                            }))
                          }
                          placeholder="Medium (4b) Label"
                          className={`px-2 py-1.5 rounded-lg text-xs border ${
                            isEveningTheme
                              ? 'bg-stone-950 border-stone-700 text-stone-100'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Baseline Floor Block Naming */}
                  <div>
                    <div className="text-xs font-extrabold uppercase tracking-wider mb-2">
                      Daily Baseline Floor Blocks ({customDraft.floorCount} Blocks • 20m each: 5m Ignition + 15m Momentum)
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                      {customDraft.baselineBlocks
                        .slice(0, customDraft.floorCount)
                        .map((blk, idx) => (
                          <div
                            key={idx}
                            className={`p-2.5 rounded-xl border space-y-1.5 ${
                              isEveningTheme
                                ? 'bg-stone-950/80 border-stone-800'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                                Block #{idx + 1}
                              </span>
                              <select
                                value={blk.category}
                                onChange={(e) =>
                                  updateBaselineDraftBlock(idx, {
                                    category: e.target
                                      .value as BaselineBlock['category'],
                                  })
                                }
                                className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                                  isEveningTheme
                                    ? 'bg-stone-900 border-stone-700 text-stone-200'
                                    : 'bg-slate-50 border-slate-300 text-slate-800'
                                }`}
                              >
                                <option value="FLASHCARDS_ANATOMY">
                                  Recall / Triage (Group A)
                                </option>
                                <option value="FLASHCARDS_COMP">
                                  Spaced Review (Group A)
                                </option>
                                <option value="READING">
                                  Deep Reading / Core (Group B)
                                </option>
                                <option value="SYNTHESIS">
                                  Synthesis / Notes (Group B)
                                </option>
                              </select>
                            </div>
                            <input
                              id={`input-custom-baseline-title-${idx}`}
                              type="text"
                              value={blk.title}
                              onChange={(e) =>
                                updateBaselineDraftBlock(idx, {
                                  title: e.target.value,
                                })
                              }
                              placeholder={`Baseline Block #${idx + 1} Title`}
                              className={`w-full px-2.5 py-1 rounded text-xs font-bold border ${
                                isEveningTheme
                                  ? 'bg-stone-900 border-stone-700 text-stone-100'
                                  : 'bg-slate-50 border-slate-300 text-slate-900'
                              }`}
                            />
                            <input
                              id={`input-custom-baseline-startup-${idx}`}
                              type="text"
                              value={blk.startupStep}
                              onChange={(e) =>
                                updateBaselineDraftBlock(idx, {
                                  startupStep: e.target.value,
                                })
                              }
                              placeholder="5m Startup Step Action"
                              className={`w-full px-2.5 py-1 rounded text-[11px] border ${
                                isEveningTheme
                                  ? 'bg-stone-900 border-stone-800 text-stone-300'
                                  : 'bg-white border-slate-200 text-slate-600'
                              }`}
                            />
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: 5 Evening Recharge Categories */}
              {customStep === 2 && (
                <div id="custom-step-2-panel" className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Moon className="w-4 h-4 text-amber-500" />
                    <span>
                      Configure the 5 Evening Recharge Categories (5m Startup Step &rarr; 20m/40m Check-In &rarr; 60m Physical Break)
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Cat 1: Music [Fluid] */}
                    <div
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        isEveningTheme
                          ? 'bg-stone-950/80 border-stone-800'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-bold text-amber-500 uppercase">
                        Category 1 [Fluid] • Music / Instrument
                      </div>
                      <input
                        id="input-custom-cat1-title"
                        type="text"
                        value={customDraft.fluidCategories.CAT1_MUSIC.activeTitle}
                        onChange={(e) =>
                          setCustomDraft((prev) => ({
                            ...prev,
                            fluidCategories: {
                              ...prev.fluidCategories,
                              CAT1_MUSIC: {
                                ...prev.fluidCategories.CAT1_MUSIC,
                                activeTitle: e.target.value,
                                label: `1. ${e.target.value}`,
                              },
                            },
                          }))
                        }
                        placeholder="Category 1 Title"
                        className={`w-full px-2.5 py-1 rounded text-xs font-bold border ${
                          isEveningTheme
                            ? 'bg-stone-900 border-stone-700 text-stone-100'
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                      <input
                        id="input-custom-cat1-startup"
                        type="text"
                        value={customDraft.fluidCategories.CAT1_MUSIC.startupStep}
                        onChange={(e) =>
                          setCustomDraft((prev) => ({
                            ...prev,
                            fluidCategories: {
                              ...prev.fluidCategories,
                              CAT1_MUSIC: {
                                ...prev.fluidCategories.CAT1_MUSIC,
                                startupStep: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="5m Startup Step"
                        className={`w-full px-2.5 py-1 rounded text-[11px] border ${
                          isEveningTheme
                            ? 'bg-stone-900 border-stone-800 text-stone-300'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      />
                    </div>

                    {/* Cat 2: Maker / Hardware [Sticky] */}
                    <div
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        isEveningTheme
                          ? 'bg-stone-950/80 border-stone-800'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-bold text-amber-500 uppercase">
                        Category 2 [Sticky X/3] • Maker / Hardware
                      </div>
                      <input
                        id="input-custom-cat2-title"
                        type="text"
                        value={customDraft.stickyCategories.CAT2_MAKER.activeTitle}
                        onChange={(e) =>
                          setCustomDraft((prev) => ({
                            ...prev,
                            stickyCategories: {
                              ...prev.stickyCategories,
                              CAT2_MAKER: {
                                ...prev.stickyCategories.CAT2_MAKER,
                                activeTitle: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="Active Maker Project Title"
                        className={`w-full px-2.5 py-1 rounded text-xs font-bold border ${
                          isEveningTheme
                            ? 'bg-stone-900 border-stone-700 text-stone-100'
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                      <input
                        id="input-custom-cat2-startup"
                        type="text"
                        value={customDraft.stickyCategories.CAT2_MAKER.startupStep}
                        onChange={(e) =>
                          setCustomDraft((prev) => ({
                            ...prev,
                            stickyCategories: {
                              ...prev.stickyCategories,
                              CAT2_MAKER: {
                                ...prev.stickyCategories.CAT2_MAKER,
                                startupStep: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="5m Startup Step"
                        className={`w-full px-2.5 py-1 rounded text-[11px] border ${
                          isEveningTheme
                            ? 'bg-stone-900 border-stone-800 text-stone-300'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      />
                    </div>

                    {/* Cat 3: Media [Sticky Triple-Track] */}
                    <div
                      className={`p-3 rounded-xl border space-y-2 md:col-span-2 ${
                        isEveningTheme
                          ? 'bg-stone-950/80 border-stone-800'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-bold text-amber-500 uppercase">
                        Category 3 [Sticky Triple-Track X/3] • 3A Fiction, 3B Nonfiction &amp; 3C Video
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <div>
                          <label className="block text-[10px] font-mono font-bold mb-1">
                            3A Fiction Title
                          </label>
                          <input
                            id="input-custom-cat3a-title"
                            type="text"
                            value={
                              customDraft.stickyCategories['3A_FICTION'].activeTitle
                            }
                            onChange={(e) =>
                              setCustomDraft((prev) => ({
                                ...prev,
                                stickyCategories: {
                                  ...prev.stickyCategories,
                                  '3A_FICTION': {
                                    ...prev.stickyCategories['3A_FICTION'],
                                    activeTitle: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={`w-full px-2.5 py-1 rounded text-xs font-bold border ${
                              isEveningTheme
                                ? 'bg-stone-900 border-stone-700 text-stone-100'
                                : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono font-bold mb-1">
                            3B Nonfiction Title
                          </label>
                          <input
                            id="input-custom-cat3b-title"
                            type="text"
                            value={
                              customDraft.stickyCategories['3B_NONFICTION']
                                .activeTitle
                            }
                            onChange={(e) =>
                              setCustomDraft((prev) => ({
                                ...prev,
                                stickyCategories: {
                                  ...prev.stickyCategories,
                                  '3B_NONFICTION': {
                                    ...prev.stickyCategories['3B_NONFICTION'],
                                    activeTitle: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={`w-full px-2.5 py-1 rounded text-xs font-bold border ${
                              isEveningTheme
                                ? 'bg-stone-900 border-stone-700 text-stone-100'
                                : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-mono font-bold mb-1">
                            3C Video Series Title
                          </label>
                          <input
                            id="input-custom-cat3c-title"
                            type="text"
                            value={
                              customDraft.stickyCategories['3C_VIDEO'].activeTitle
                            }
                            onChange={(e) =>
                              setCustomDraft((prev) => ({
                                ...prev,
                                stickyCategories: {
                                  ...prev.stickyCategories,
                                  '3C_VIDEO': {
                                    ...prev.stickyCategories['3C_VIDEO'],
                                    activeTitle: e.target.value,
                                  },
                                },
                              }))
                            }
                            className={`w-full px-2.5 py-1 rounded text-xs font-bold border ${
                              isEveningTheme
                                ? 'bg-stone-900 border-stone-700 text-stone-100'
                                : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cat 4: Comfort Show [Fluid] */}
                    <div
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        isEveningTheme
                          ? 'bg-stone-950/80 border-stone-800'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-bold text-amber-500 uppercase">
                        Category 4 [Fluid] • Off-Monitor Comfort Show
                      </div>
                      <input
                        id="input-custom-cat4-title"
                        type="text"
                        value={customDraft.fluidCategories.CAT4_COMFORT.activeTitle}
                        onChange={(e) =>
                          setCustomDraft((prev) => ({
                            ...prev,
                            fluidCategories: {
                              ...prev.fluidCategories,
                              CAT4_COMFORT: {
                                ...prev.fluidCategories.CAT4_COMFORT,
                                activeTitle: e.target.value,
                                label: `4. ${e.target.value}`,
                              },
                            },
                          }))
                        }
                        placeholder="Comfort Show Title"
                        className={`w-full px-2.5 py-1 rounded text-xs font-bold border ${
                          isEveningTheme
                            ? 'bg-stone-900 border-stone-700 text-stone-100'
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                      <input
                        id="input-custom-cat4-startup"
                        type="text"
                        value={customDraft.fluidCategories.CAT4_COMFORT.startupStep}
                        onChange={(e) =>
                          setCustomDraft((prev) => ({
                            ...prev,
                            fluidCategories: {
                              ...prev.fluidCategories,
                              CAT4_COMFORT: {
                                ...prev.fluidCategories.CAT4_COMFORT,
                                startupStep: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="5m Startup Step"
                        className={`w-full px-2.5 py-1 rounded text-[11px] border ${
                          isEveningTheme
                            ? 'bg-stone-900 border-stone-800 text-stone-300'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      />
                    </div>

                    {/* Cat 5: Gaming [Sticky] */}
                    <div
                      className={`p-3 rounded-xl border space-y-1.5 ${
                        isEveningTheme
                          ? 'bg-stone-950/80 border-stone-800'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="text-[11px] font-mono font-bold text-amber-500 uppercase">
                        Category 5 [Sticky X/3] • Gaming
                      </div>
                      <input
                        id="input-custom-cat5-title"
                        type="text"
                        value={customDraft.stickyCategories.CAT5_GAMING.activeTitle}
                        onChange={(e) =>
                          setCustomDraft((prev) => ({
                            ...prev,
                            stickyCategories: {
                              ...prev.stickyCategories,
                              CAT5_GAMING: {
                                ...prev.stickyCategories.CAT5_GAMING,
                                activeTitle: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="Active Game Title"
                        className={`w-full px-2.5 py-1 rounded text-xs font-bold border ${
                          isEveningTheme
                            ? 'bg-stone-900 border-stone-700 text-stone-100'
                            : 'bg-slate-50 border-slate-300 text-slate-900'
                        }`}
                      />
                      <input
                        id="input-custom-cat5-startup"
                        type="text"
                        value={customDraft.stickyCategories.CAT5_GAMING.startupStep}
                        onChange={(e) =>
                          setCustomDraft((prev) => ({
                            ...prev,
                            stickyCategories: {
                              ...prev.stickyCategories,
                              CAT5_GAMING: {
                                ...prev.stickyCategories.CAT5_GAMING,
                                startupStep: e.target.value,
                              },
                            },
                          }))
                        }
                        placeholder="5m Micro-Objective Startup Step"
                        className={`w-full px-2.5 py-1 rounded text-[11px] border ${
                          isEveningTheme
                            ? 'bg-stone-900 border-stone-800 text-stone-300'
                            : 'bg-white border-slate-200 text-slate-600'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: 5 Long-Term 4-Rung Tracks */}
              {customStep === 3 && (
                <div id="custom-step-3-panel" className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    <Compass className="w-4 h-4 text-emerald-500" />
                    <span>
                      Configure the 5 Long-Term 4-Rung Tracks (3 Core Tracks + 2 Zero-Quota Sandbox Tracks)
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {customDraft.tracks.map((trk, tIdx) => (
                      <div
                        key={trk.id}
                        className={`p-3 rounded-xl border space-y-2 ${
                          isEveningTheme
                            ? 'bg-stone-950/80 border-stone-800'
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                              trk.isSandbox
                                ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {trk.isSandbox
                              ? `Zero-Quota Sandbox Track #${tIdx + 1}`
                              : `Core Track #${tIdx + 1} (50% Input / 50% Output)`}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            id={`input-custom-track-name-${trk.id}`}
                            type="text"
                            value={trk.name}
                            onChange={(e) =>
                              updateTrackDraft(tIdx, { name: e.target.value })
                            }
                            placeholder="Track Name"
                            className={`px-2.5 py-1 rounded text-xs font-bold border ${
                              isEveningTheme
                                ? 'bg-stone-900 border-stone-700 text-stone-100'
                                : 'bg-slate-50 border-slate-300 text-slate-900'
                            }`}
                          />
                          <input
                            id={`input-custom-track-role-${trk.id}`}
                            type="text"
                            value={trk.archetypeRole}
                            onChange={(e) =>
                              updateTrackDraft(tIdx, {
                                archetypeRole: e.target.value,
                              })
                            }
                            placeholder="Archetype Role Label (e.g., Researcher)"
                            className={`px-2.5 py-1 rounded text-xs border ${
                              isEveningTheme
                                ? 'bg-stone-900 border-stone-700 text-stone-200'
                                : 'bg-white border-slate-300 text-slate-800'
                            }`}
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-1.5">
                          {([0, 1, 2, 3] as const).map((rIdx) => (
                            <input
                              key={rIdx}
                              id={`input-custom-track-${trk.id}-rung-${rIdx + 1}`}
                              type="text"
                              value={trk.rungs[rIdx]}
                              onChange={(e) =>
                                updateTrackRungDraft(tIdx, rIdx, e.target.value)
                              }
                              placeholder={`Rung ${rIdx + 1}`}
                              className={`px-2 py-1 rounded text-[11px] border ${
                                isEveningTheme
                                  ? 'bg-stone-900 border-stone-800 text-stone-300'
                                  : 'bg-slate-50 border-slate-200 text-slate-700'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step Footer Navigation + Apply Custom Button */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-stone-800">
                <div className="flex items-center gap-2">
                  {customStep > 1 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCustomStep((s) => (s === 3 ? 2 : 1))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                        isEveningTheme
                          ? 'bg-stone-800 text-stone-200 hover:bg-stone-700'
                          : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" /> Previous Step
                    </button>
                  )}
                  {customStep < 3 && (
                    <button
                      type="button"
                      onClick={() =>
                        setCustomStep((s) => (s === 1 ? 2 : 3))
                      }
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center gap-1"
                    >
                      Next Step <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  id="btn-apply-preset-BLANK_CUSTOM"
                  type="button"
                  onClick={() => handleOneClickApply('BLANK_CUSTOM')}
                  className="px-4 py-2 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Apply Custom Architecture</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Modal Footer */}
        <div
          className={`px-5 py-3 border-t flex flex-wrap items-center justify-between gap-3 ${
            isEveningTheme
              ? 'bg-stone-900/90 border-stone-800 text-stone-400'
              : 'bg-slate-50 border-slate-200 text-slate-600'
          }`}
        >
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <Lock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            <span>
              Locked State-Machine: 5m Ignition &rarr; 15m Momentum • Max 3 Active Queue (#1 Locked) • Cruise 11–13b / Surge 14–15b (max 2d)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {architectModeUnlocked && (
              <>
                <button
                  id="btn-footer-restore-avery-default"
                  type="button"
                  onClick={() => handleOneClickApply('AVERY_DEFAULT')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                    isEveningTheme
                      ? 'bg-stone-800 hover:bg-stone-700 text-amber-300 border-stone-700'
                      : 'bg-white hover:bg-slate-100 text-slate-800 border-slate-300'
                  }`}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Avery Default</span>
                </button>
                {onLockArchitectMode && (
                  <button
                    id="btn-wizard-lock-architect-mode"
                    type="button"
                    onClick={onLockArchitectMode}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 border ${
                      isEveningTheme
                        ? 'bg-stone-900 hover:bg-stone-800 text-stone-300 border-stone-700'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                    }`}
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Lock Architect Mode</span>
                  </button>
                )}
              </>
            )}
            <button
              id="btn-dismiss-onboarding-wizard"
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white"
            >
              Keep Current Setup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
