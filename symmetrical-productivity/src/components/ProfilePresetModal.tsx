import React, { useEffect, useState } from 'react';
import {
  BaselineBlock,
  EveningCategoryCardConfig,
  ProfilePresetId,
  RoadmapTrackId,
  SymmetryState,
} from '../types/symmetry';
import {
  ApplyPresetOptions,
  buildCategoryCardsFromLegacyMaps,
  deleteCustomUserPreset,
  duplicatePresetAsCustom,
  exportPresetAsJson,
  getPresetById,
  getVisibleProfilePresets,
  ONBOARDING_COMPLETED_STORAGE_KEY,
  ProfilePresetDefinition,
  renameCustomUserPreset,
  saveCurrentSetupAsPreset,
  saveOrUpdateCustomPreset,
} from '../utils/presets';
import {
  formatRolloverHourLabel,
  getBaselineSlotTargetBlocks,
  getTotalBaselineFloorBlocks,
} from '../state/defaultState';
import {
  BookmarkPlus,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  Download,
  Edit3,
  Layers,
  Moon,
  Pencil,
  Plus,
  Sliders,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';

export interface ProfilePresetModalProps {
  isOpen: boolean;
  currentState?: SymmetryState;
  state?: SymmetryState;
  isFirstVisit?: boolean;
  architectModeUnlocked?: boolean;
  onLockArchitectMode?: () => void;
  onOpenConversationalArchitect?: () => void;
  onClose: () => void;
  onApplyPreset: (
    presetOrId: ProfilePresetId | ProfilePresetDefinition,
    options?: ApplyPresetOptions
  ) => void;
  onUpdateDayBoundaryPreferences?: (
    rolloverHour: number,
    shutdownTime: string
  ) => void;
}

export const ProfilePresetModal: React.FC<ProfilePresetModalProps> = ({
  isOpen,
  currentState: propCurrentState,
  state: propState,
  architectModeUnlocked = false,
  onOpenConversationalArchitect,
  onClose,
  onApplyPreset,
}) => {
  const currentState = (propCurrentState || propState)!;
  const [presetsList, setPresetsList] = useState<ProfilePresetDefinition[]>(() =>
    getVisibleProfilePresets(architectModeUnlocked)
  );
  const [keepActiveTasksAndLogs, setKeepActiveTasksAndLogs] = useState<boolean>(false);

  // Save current setup bar state
  const [saveSetupModalOpen, setSaveSetupModalOpen] = useState(false);
  const [newPresetTitle, setNewPresetTitle] = useState('');
  const [newPresetSubtitle, setNewPresetSubtitle] = useState('');
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Rename custom preset state
  const [renamingPresetId, setRenamingPresetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');

  // Customize / Edit in Builder single-screen visual form state
  const [builderPreset, setBuilderPreset] = useState<ProfilePresetDefinition | null>(
    null
  );
  const [builderTitle, setBuilderTitle] = useState('');
  const [builderCruiseBlocks, setBuilderCruiseBlocks] = useState(12);
  const [builderFloorItems, setBuilderFloorItems] = useState<BaselineBlock[]>([]);
  const [builderPrimaryProjectTitle, setBuilderPrimaryProjectTitle] = useState('');
  const [builderPrimaryProjectBlocks, setBuilderPrimaryProjectBlocks] = useState(8);
  const [builderPrimaryProjectStartup, setBuilderPrimaryProjectStartup] = useState('');
  const [builderEveningCards, setBuilderEveningCards] = useState<
    EveningCategoryCardConfig[]
  >([]);
  const [builderTrackNames, setBuilderTrackNames] = useState<
    Record<RoadmapTrackId, string>
  >({
    science: '',
    writing: '',
    personal: '',
    coding: '',
    music: '',
    culture: '',
  });
  const [builderShutdownTime, setBuilderShutdownTime] = useState('6:00 PM');
  const [builderRolloverHour, setBuilderRolloverHour] = useState(4);

  const refreshPresets = () => {
    setPresetsList(getVisibleProfilePresets(architectModeUnlocked));
  };

  useEffect(() => {
    if (isOpen) {
      refreshPresets();
      setBuilderPreset(null);
      setSaveSetupModalOpen(false);
      setStatusBanner(null);
    }
  }, [isOpen, architectModeUnlocked]);

  if (!isOpen) return null;

  const markOnboardingComplete = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ONBOARDING_COMPLETED_STORAGE_KEY, 'true');
    }
  };

  const handleLoadPresetDirect = (preset: ProfilePresetDefinition) => {
    markOnboardingComplete();
    onApplyPreset(preset, {
      keepActiveTasksAndLogs,
    });
    onClose();
  };

  const openBuilderForPreset = (preset: ProfilePresetDefinition) => {
    const resolved = getPresetById(preset.id);
    setBuilderPreset(resolved);
    setBuilderTitle(resolved.title);
    setBuilderCruiseBlocks(resolved.cruiseCeilingBlocks || 12);
    setBuilderFloorItems(JSON.parse(JSON.stringify(resolved.baselineBlocks)));
    setBuilderPrimaryProjectTitle(
      (resolved.projectQueue[0]?.title || 'First Priority Project').replace(/^1\.\s*/, '')
    );
    setBuilderPrimaryProjectBlocks(resolved.projectQueue[0]?.totalBlocks || 8);
    setBuilderPrimaryProjectStartup(
      resolved.projectQueue[0]?.startupStep || 'Open workspace and complete 5m starter step.'
    );
    const cards = resolved.categoryCards
      ? JSON.parse(JSON.stringify(resolved.categoryCards))
      : buildCategoryCardsFromLegacyMaps(
          resolved.fluidCategories,
          resolved.stickySlots
        );
    setBuilderEveningCards(cards);

    const nextTracks: Record<RoadmapTrackId, string> = {
      science: 'Major Track 1: Primary Vocation & Research',
      writing: 'Major Track 2: Writing & Authorship',
      personal: 'Legacy Core Track',
      coding: 'Sandbox Track 1: Engineering, Software & Tactile Craft',
      music: 'Sandbox Track 2: Music & Acoustic Practice',
      culture: 'Sandbox Track 3: Foreign Culture & Language',
    };
    for (const t of resolved.roadmapTracks) {
      nextTracks[t.id] = t.name;
    }
    setBuilderTrackNames(nextTracks);
    setBuilderShutdownTime(currentState.earlyEveningShutdownTime || '6:00 PM');
    setBuilderRolloverHour(currentState.logicalDayRolloverHour ?? 4);
  };

  const handleSaveCurrentSetup = () => {
    const created = saveCurrentSetupAsPreset(
      currentState,
      newPresetTitle.trim() || `${currentState.profileName || 'My Setup'} (Saved)`,
      newPresetSubtitle.trim() || undefined
    );
    refreshPresets();
    setSaveSetupModalOpen(false);
    setNewPresetTitle('');
    setNewPresetSubtitle('');
    setStatusBanner(`Saved "${created.title}" to Custom User Presets in localStorage.`);
  };

  const handleDuplicatePreset = (preset: ProfilePresetDefinition) => {
    const dup = duplicatePresetAsCustom(preset);
    refreshPresets();
    setStatusBanner(`Duplicated "${preset.title}" as "${dup.title}".`);
  };

  const handleExportPresetJson = (preset: ProfilePresetDefinition) => {
    const json = exportPresetAsJson(preset);
    if (typeof window !== 'undefined') {
      try {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${preset.id.toLowerCase()}-preset.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch {
        // Fallback to clipboard
      }
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(json).catch(() => {});
      }
    }
    setStatusBanner(`Exported JSON for "${preset.title}" (downloaded & copied to clipboard).`);
  };

  const handleDeleteCustomPreset = (preset: ProfilePresetDefinition) => {
    deleteCustomUserPreset(preset.id);
    refreshPresets();
    setStatusBanner(`Deleted custom preset "${preset.title}".`);
  };

  const handleCommitRename = (presetId: string) => {
    if (renameDraft.trim()) {
      renameCustomUserPreset(presetId, renameDraft.trim());
      refreshPresets();
    }
    setRenamingPresetId(null);
    setRenameDraft('');
  };

  const handleApplyFromBuilder = (alsoSaveAsCustomPreset: boolean) => {
    if (!builderPreset) return;
    markOnboardingComplete();

    const eveningOverrides: Record<
      string,
      { categoryName?: string; activeTitle?: string; startupPrompt?: string }
    > = {};
    for (const c of builderEveningCards) {
      eveningOverrides[c.id] = {
        categoryName: c.categoryName,
        activeTitle: c.activeTitle,
        startupPrompt: c.startupPrompt,
      };
    }

    if (alsoSaveAsCustomPreset) {
      const totalFloor = getTotalBaselineFloorBlocks(builderFloorItems);
      const customDef: ProfilePresetDefinition = {
        ...JSON.parse(JSON.stringify(builderPreset)),
        id: builderPreset.isCustomUserPreset
          ? builderPreset.id
          : `CUSTOM_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: builderTitle.trim() || `${builderPreset.title} (Custom)`,
        shortBadge: (builderTitle.trim() || builderPreset.title).slice(0, 28),
        subtitle: `${totalFloor}b Daily Baseline (${builderFloorItems.length} slots) • ${builderCruiseBlocks}b Cruise Ceiling`,
        isCustomUserPreset: true,
        cruiseCeilingBlocks: builderCruiseBlocks,
        baselineBlocks: builderFloorItems,
        categoryCards: builderEveningCards,
        roadmapTracks: builderPreset.roadmapTracks.map((t) => ({
          ...t,
          name: builderTrackNames[t.id] || t.name,
          archetypeRole: builderTrackNames[t.id] || t.archetypeRole,
        })),
      };
      if (customDef.projectQueue.length > 0 && builderPrimaryProjectTitle.trim()) {
        customDef.projectQueue[0] = {
          ...customDef.projectQueue[0],
          title: `1. ${builderPrimaryProjectTitle.trim().replace(/^1\.\s*/, '')}`,
          totalBlocks: builderPrimaryProjectBlocks,
          startupStep: builderPrimaryProjectStartup,
        };
      }
      saveOrUpdateCustomPreset(customDef);
      refreshPresets();
      onApplyPreset(customDef, {
        keepActiveTasksAndLogs,
        customFloorItems: builderFloorItems,
        customPrimaryProjectTitle: builderPrimaryProjectTitle,
        customPrimaryProjectBlocks: builderPrimaryProjectBlocks,
        customPrimaryProjectStartup: builderPrimaryProjectStartup,
        customTrackNames: builderTrackNames,
        customEveningCardNames: eveningOverrides,
        customShutdownTime: builderShutdownTime,
        customRolloverHour: builderRolloverHour,
        customCruiseCeiling: builderCruiseBlocks,
      });
    } else {
      onApplyPreset(builderPreset, {
        keepActiveTasksAndLogs,
        customFloorItems: builderFloorItems,
        customPrimaryProjectTitle: builderPrimaryProjectTitle,
        customPrimaryProjectBlocks: builderPrimaryProjectBlocks,
        customPrimaryProjectStartup: builderPrimaryProjectStartup,
        customTrackNames: builderTrackNames,
        customEveningCardNames: eveningOverrides,
        customShutdownTime: builderShutdownTime,
        customRolloverHour: builderRolloverHour,
        customCruiseCeiling: builderCruiseBlocks,
      });
    }

    onClose();
  };

  const totalBuilderFloorBlocks = getTotalBaselineFloorBlocks(builderFloorItems);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
      <div className="w-full max-w-none rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/70 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-teal-500/15 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Workflow Structure Presets & Custom Preset Manager
                </h2>
                {architectModeUnlocked && (
                  <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/40 text-[10px] font-mono uppercase tracking-wider text-amber-300">
                    Architect Mode Unlocked
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Choose a universal daily structure, save your current setup to localStorage, or customize every slot in the visual builder.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onOpenConversationalArchitect && (
              <button
                id="btn-preset-modal-customize-with-ai"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenConversationalArchitect();
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-slate-950 text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                title="Customize workflow, cadence, baseline, and evening slots via conversation (Cmd/Ctrl + Shift + K)"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Customize with AI</span>
              </button>
            )}
            {!builderPreset && (
              <button
                type="button"
                onClick={() => {
                  setNewPresetTitle(
                    `${currentState.profileName || 'Custom Setup'} (Saved)`
                  );
                  setSaveSetupModalOpen((prev) => !prev);
                }}
                className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/50 text-xs font-semibold text-teal-200 flex items-center gap-1.5 transition"
              >
                <BookmarkPlus className="w-3.5 h-3.5" />
                + Save Current Setup as Preset
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
              title="Close Preset Manager"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Status feedback banner */}
        {statusBanner && (
          <div className="px-5 py-2 bg-teal-950/60 border-b border-teal-500/30 flex items-center justify-between text-xs text-teal-200 shrink-0">
            <span>{statusBanner}</span>
            <button
              type="button"
              onClick={() => setStatusBanner(null)}
              className="text-teal-400 hover:text-teal-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Save Current Setup Drawer */}
        {saveSetupModalOpen && !builderPreset && (
          <div className="px-5 py-3.5 bg-slate-950/90 border-b border-teal-500/40 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-teal-300 flex items-center gap-1.5">
                <BookmarkPlus className="w-4 h-4" />
                Save Current Setup to Custom User Presets (`localStorage.customPresets`)
              </span>
              <button
                type="button"
                onClick={() => setSaveSetupModalOpen(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={newPresetTitle}
                  onChange={(e) => setNewPresetTitle(e.target.value)}
                  placeholder="Preset Name (e.g., My Fall Sprint Setup)"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-teal-400"
                />
              </div>
              <div className="sm:col-span-5">
                <input
                  type="text"
                  value={newPresetSubtitle}
                  onChange={(e) => setNewPresetSubtitle(e.target.value)}
                  placeholder="Optional subtitle (e.g., 4b Floor + Custom Evening Slots)"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-100 focus:outline-none focus:border-teal-400"
                />
              </div>
              <div className="sm:col-span-2">
                <button
                  type="button"
                  onClick={handleSaveCurrentSetup}
                  className="w-full px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs transition"
                >
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Global Preserve Active Tasks Checkbox Bar */}
        <div className="px-5 py-2.5 bg-slate-950/40 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <label className="inline-flex items-center gap-2 cursor-pointer select-none text-xs text-slate-200">
            <input
              type="checkbox"
              checked={keepActiveTasksAndLogs}
              onChange={(e) => setKeepActiveTasksAndLogs(e.target.checked)}
              className="rounded border-slate-700 bg-slate-900 text-teal-500 focus:ring-teal-500"
            />
            <span className="font-medium text-teal-200">
              Keep my current active tasks &amp; today&apos;s logged blocks
            </span>
            <span className="text-[11px] text-slate-400">
              (Switching templates won&apos;t wipe out your active Closed List or today&apos;s progress)
            </span>
          </label>
          {builderPreset && (
            <button
              type="button"
              onClick={() => setBuilderPreset(null)}
              className="text-xs text-teal-300 hover:text-teal-200 font-medium underline"
            >
              ← Back to All Preset Cards
            </button>
          )}
        </div>

        {/* Main Content Body: Either Preset Cards Grid OR Single-Screen Visual Builder */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {!builderPreset ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {presetsList.map((preset) => {
                  const isCurrent = currentState.profilePresetId === preset.id;
                  const totalFloorBlocks = getTotalBaselineFloorBlocks(
                    preset.baselineBlocks
                  );
                  const isRenaming = renamingPresetId === preset.id;

                  return (
                    <div
                      key={preset.id}
                      className={`p-4 rounded-xl border transition flex flex-col justify-between gap-3 ${
                        isCurrent
                          ? 'bg-teal-500/10 border-teal-500/60 shadow-lg shadow-teal-950/30'
                          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-teal-300 inline-block mb-1.5">
                              {preset.isCustomUserPreset
                                ? `CUSTOM PRESET • ${preset.shortBadge}`
                                : preset.shortBadge}
                            </span>

                            {isRenaming ? (
                              <div className="flex items-center gap-1.5 mt-1">
                                <input
                                  type="text"
                                  value={renameDraft}
                                  onChange={(e) => setRenameDraft(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCommitRename(preset.id);
                                    if (e.key === 'Escape') setRenamingPresetId(null);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-900 border border-teal-500 text-xs text-slate-100 flex-1"
                                  autoFocus
                                />
                                <button
                                  type="button"
                                  onClick={() => handleCommitRename(preset.id)}
                                  className="p-1 rounded bg-teal-500/20 text-teal-300"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setRenamingPresetId(null)}
                                  className="p-1 rounded bg-slate-800 text-slate-400"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-slate-100 truncate">
                                  {preset.title}
                                </h3>
                                {preset.isCustomUserPreset && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setRenamingPresetId(preset.id);
                                        setRenameDraft(preset.title);
                                      }}
                                      title="Rename Custom Preset"
                                      className="p-1 rounded text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition"
                                    >
                                      <Pencil className="w-3 h-3" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteCustomPreset(preset)}
                                      title="Delete Custom Preset"
                                      className="p-1 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}

                            <p className="text-xs text-teal-300/90 font-medium mt-0.5">
                              {preset.subtitle}
                            </p>
                          </div>

                          {isCurrent && (
                            <span className="px-2 py-0.5 rounded-full bg-teal-500/20 border border-teal-500/40 text-[10px] font-mono text-teal-300 flex items-center gap-1 shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                          {preset.description}
                        </p>

                        {/* Compact Structural Preview */}
                        <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-300">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-400 font-mono text-[10px]">
                              DAILY BASELINE ({totalFloorBlocks}b total):
                            </span>
                            <span className="font-mono text-[10px] text-teal-300">
                              Cruise Target: {preset.cruiseCeilingBlocks}b
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {preset.baselineBlocks.map((b) => (
                              <span
                                key={b.id}
                                className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300"
                              >
                                {b.title} ({getBaselineSlotTargetBlocks(b)}b)
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* 3 Action Buttons on Every Preset Card */}
                      <div className="pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleLoadPresetDirect(preset)}
                          className="flex-1 min-w-[115px] px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                          Load Preset
                        </button>

                        <button
                          type="button"
                          onClick={() => openBuilderForPreset(preset)}
                          className="flex-1 min-w-[155px] px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-xs flex items-center justify-center gap-1.5 transition"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-teal-400" />
                          Customize / Edit in Builder
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleDuplicatePreset(preset)}
                            title="Duplicate as Custom Preset"
                            className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-mono inline-flex items-center gap-1 transition"
                          >
                            <Copy className="w-3 h-3 text-teal-400" />
                            Duplicate
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExportPresetJson(preset)}
                            title="Export Preset JSON"
                            className="px-2 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 text-[11px] font-mono inline-flex items-center gap-1 transition"
                          >
                            <Download className="w-3 h-3 text-sky-400" />
                            Export JSON
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            /* Single-Screen Visual Builder Form inside the Modal */
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-slate-950/70 border border-teal-500/40 flex flex-wrap items-center justify-between gap-3">
                <div className="flex-1 min-w-[240px]">
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-teal-300 mb-1">
                    Preset Builder — Template Title &amp; Cruise Mode Ceiling
                  </label>
                  <input
                    type="text"
                    value={builderTitle}
                    onChange={(e) => setBuilderTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-sm font-bold text-slate-100 focus:outline-none focus:border-teal-400"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Cruise Target (Blocks)
                    </label>
                    <input
                      type="number"
                      min={4}
                      max={16}
                      value={builderCruiseBlocks}
                      onChange={(e) =>
                        setBuilderCruiseBlocks(
                          Math.max(4, Math.min(16, Number(e.target.value) || 12))
                        )
                      }
                      className="w-20 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-teal-300"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Shutdown Time
                    </label>
                    <input
                      type="text"
                      value={builderShutdownTime}
                      onChange={(e) => setBuilderShutdownTime(e.target.value)}
                      className="w-24 px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono text-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-mono uppercase text-slate-400 mb-1">
                      Day Rollover ({formatRolloverHourLabel(builderRolloverHour)})
                    </label>
                    <input
                      type="range"
                      min={0}
                      max={6}
                      step={1}
                      value={builderRolloverHour}
                      onChange={(e) => setBuilderRolloverHour(Number(e.target.value))}
                      className="w-24 accent-teal-400"
                    />
                  </div>
                </div>
              </div>

              {/* Section 1: Daily Baseline Slots Builder */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-mono uppercase tracking-wider text-teal-300 font-semibold flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      1. Daily Baseline Habits ({builderFloorItems.length} Slots •{' '}
                      {totalBuilderFloorBlocks} Blocks = {totalBuilderFloorBlocks * 20}m)
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Add, remove, or rename daily baseline habits and set block targets (1b–6b), Early Clearance, and Late-Night Blocker.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setBuilderFloorItems((prev) => [
                        ...prev,
                        {
                          id: `custom_floor_${Date.now()}_${prev.length + 1}`,
                          title: `Daily Habit ${prev.length + 1}`,
                          category: 'READING',
                          completed: false,
                          completedBlocks: 0,
                          targetBlocks: 1,
                          earlyClearanceEligible: false,
                          lateNightBlocker: false,
                          startupStep: 'Complete 5m starter action.',
                          trackId: 'science',
                          cognitiveDemand: 'DEEP_SYNTHESIS',
                        },
                      ])
                    }
                    className="px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/40 text-xs font-medium text-teal-200 flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Add Baseline Habit
                  </button>
                </div>

                <div className="space-y-2">
                  {builderFloorItems.map((item, idx) => {
                    const targetB = getBaselineSlotTargetBlocks(item);
                    return (
                      <div
                        key={item.id}
                        className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 grid grid-cols-1 sm:grid-cols-12 gap-2 items-center"
                      >
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            value={item.title}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBuilderFloorItems((prev) =>
                                prev.map((b, i) => (i === idx ? { ...b, title: val } : b))
                              );
                            }}
                            placeholder="Baseline Habit Name"
                            className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-100"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-center gap-1">
                          <span className="text-[10px] font-mono text-slate-400">Blocks:</span>
                          <select
                            value={targetB}
                            onChange={(e) => {
                              const nextTarget = Number(e.target.value) || 1;
                              setBuilderFloorItems((prev) =>
                                prev.map((b, i) =>
                                  i === idx ? { ...b, targetBlocks: nextTarget } : b
                                )
                              );
                            }}
                            className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs font-mono text-teal-300"
                          >
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <option key={n} value={n}>
                                {n}b ({n * 20}m)
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="sm:col-span-4">
                          <input
                            type="text"
                            value={item.startupStep}
                            onChange={(e) => {
                              const val = e.target.value;
                              setBuilderFloorItems((prev) =>
                                prev.map((b, i) =>
                                  i === idx ? { ...b, startupStep: val } : b
                                )
                              );
                            }}
                            placeholder="5m Startup Script..."
                            className="w-full px-2.5 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-300"
                          />
                        </div>
                        <div className="sm:col-span-2 flex items-center justify-end gap-1">
                          <button
                            type="button"
                            title="Toggle Early Clearance"
                            onClick={() =>
                              setBuilderFloorItems((prev) =>
                                prev.map((b, i) =>
                                  i === idx
                                    ? {
                                        ...b,
                                        earlyClearanceEligible: !b.earlyClearanceEligible,
                                      }
                                    : b
                                )
                              )
                            }
                            className={`px-1.5 py-1 rounded border text-[10px] font-mono ${
                              item.earlyClearanceEligible
                                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300'
                                : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}
                          >
                            EC
                          </button>
                          <button
                            type="button"
                            title="Toggle Late-Night Blocker"
                            onClick={() =>
                              setBuilderFloorItems((prev) =>
                                prev.map((b, i) =>
                                  i === idx
                                    ? { ...b, lateNightBlocker: !b.lateNightBlocker }
                                    : b
                                )
                              )
                            }
                            className={`px-1.5 py-1 rounded border text-[10px] font-mono ${
                              item.lateNightBlocker
                                ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}
                          >
                            LNB
                          </button>
                          {builderFloorItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setBuilderFloorItems((prev) =>
                                  prev.filter((_, i) => i !== idx)
                                )
                              }
                              className="p-1 rounded text-slate-500 hover:text-rose-400"
                              title="Remove Slot"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Primary Focus #1 Deliverable */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <h4 className="text-xs font-mono uppercase tracking-wider text-teal-300 font-semibold flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  2. Locked Focus #1 Deliverable
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
                      Primary Deliverable Title
                    </label>
                    <input
                      type="text"
                      value={builderPrimaryProjectTitle}
                      onChange={(e) => setBuilderPrimaryProjectTitle(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-100"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
                      Block Target (1b–12b)
                    </label>
                    <select
                      value={builderPrimaryProjectBlocks}
                      onChange={(e) =>
                        setBuilderPrimaryProjectBlocks(Number(e.target.value) || 8)
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs font-mono text-teal-300"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                        <option key={n} value={n}>
                          {n}b ({n * 20}m)
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-5">
                    <label className="block text-[10px] font-mono text-slate-400 mb-0.5">
                      5m Startup Script
                    </label>
                    <input
                      type="text"
                      value={builderPrimaryProjectStartup}
                      onChange={(e) => setBuilderPrimaryProjectStartup(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-xs text-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Section 3: Evening Recharge Categories & Roadmap Tracks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-indigo-300 font-semibold flex items-center gap-1.5">
                    <Moon className="w-3.5 h-3.5" />
                    3. Evening Recharge Categories (1–5)
                  </h4>
                  {builderEveningCards.map((card, idx) => (
                    <div
                      key={card.id}
                      className="grid grid-cols-2 gap-2 items-center bg-slate-900/70 p-2 rounded border border-slate-800"
                    >
                      <input
                        type="text"
                        value={card.categoryName}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBuilderEveningCards((prev) =>
                            prev.map((c, i) =>
                              i === idx ? { ...c, categoryName: val } : c
                            )
                          );
                        }}
                        placeholder="Category Name"
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-100"
                      />
                      <input
                        type="text"
                        value={card.activeTitle}
                        onChange={(e) => {
                          const val = e.target.value;
                          setBuilderEveningCards((prev) =>
                            prev.map((c, i) =>
                              i === idx ? { ...c, activeTitle: val } : c
                            )
                          );
                        }}
                        placeholder="Active Item Title"
                        className="px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-indigo-200"
                      />
                    </div>
                  ))}
                </div>

                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-teal-300 font-semibold flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5" />
                    4. Long-Term Roadmap Tracks (3 Core + 2 Sandbox)
                  </h4>
                  {(
                    [
                      { id: 'science', badge: 'Core Track 1' },
                      { id: 'writing', badge: 'Core Track 2' },
                      { id: 'personal', badge: 'Core Track 3' },
                      { id: 'coding', badge: 'Sandbox 1' },
                      { id: 'music', badge: 'Sandbox 2' },
                    ] as { id: RoadmapTrackId; badge: string }[]
                  ).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 bg-slate-900/70 p-2 rounded border border-slate-800"
                    >
                      <span className="text-[10px] font-mono text-slate-400 w-24 shrink-0">
                        {item.badge}:
                      </span>
                      <input
                        type="text"
                        value={builderTrackNames[item.id] || ''}
                        onChange={(e) =>
                          setBuilderTrackNames((prev) => ({
                            ...prev,
                            [item.id]: e.target.value,
                          }))
                        }
                        className="flex-1 px-2 py-1 rounded bg-slate-950 border border-slate-700 text-xs text-slate-100"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <span className="text-xs text-slate-400">
            Every slot, block count, 5m startup script, Evening card, and Roadmap rung is also directly editable inline on the main canvas.
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-xs font-medium text-slate-300 transition"
            >
              Close
            </button>
            {builderPreset && (
              <>
                <button
                  type="button"
                  onClick={() => handleApplyFromBuilder(true)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-teal-500/40 text-teal-200 font-semibold text-xs flex items-center gap-1.5 transition"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Save to Custom Presets &amp; Apply
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyFromBuilder(false)}
                  className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition shadow-lg shadow-teal-950/50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Apply Customized Setup
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
