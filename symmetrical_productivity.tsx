import React, { useState, useEffect } from 'react';
import {
  Shield,
  Flame,
  Zap,
  Moon,
  Sun,
  Play,
  Pause,
  FastForward,
  RotateCcw,
  Lock,
  Unlock,
  CheckCircle2,
  Circle,
  ArrowUpRight,
  Plus,
  Coffee,
  Music,
  BookOpen,
  Tv,
  Gamepad2,
  Wrench,
  Sparkles,
  AlertTriangle,
  Download,
  Upload,
  PenTool,
  Wind,
  Check,
  BatteryCharging,
  HeartHandshake,
  Trash2,
  Edit3,
  Sliders,
  RefreshCw,
  Info,
  X
} from 'lucide-react';

// ============================================================================
// GENERALIZED CONSUMER-READY DEFAULT STATE
// ============================================================================
const DEFAULT_STATE = {
  tier: 'TIER_1', // 'TIER_3' (7 blocks), 'TIER_1' (12 blocks), 'TIER_2' (15 blocks)
  completedBlocks: 4,
  consecutiveHeavyBlocks: 1, // 0, 1, or 2 (2 triggers mandatory Level 2 Buffer)
  watchmansRest: false, // Master toggle: On-Duty Governor vs Off-Duty Sanctuary
  stillnessWindowsUsed: 0, // Max 2 windows (40m total)
  sanctuaryContinuousMinutes: 0, // Tracks progress toward Mandatory 60m Micro-Break
  activeTaskLabel: 'System Architecture Proposal — Block 3 (Core Diagram & Specs)',
  activeIgnitionPrompt: 'Open the document, sketch 3 top-level section headers, and write 2 bullet lines (zero perfectionism).',
  bufferRituals: [
    'Coffee / Tea Ritual (Brew, step to a window, zero screens)',
    'Two-Song Instrument Loop (Play 1–2 familiar songs cold)',
    'Step Outside / 10-Minute Walk & Stretch'
  ],
  dailyFloor: [
    {
      id: 'df_1',
      title: 'Core Reading / Deep Study — Block 1 (Primary Text)',
      category: 'HEAVY',
      completed: true,
      ignition: 'Open the chapter and read the first 2 pages with a pen in hand.'
    },
    {
      id: 'df_2',
      title: 'Core Reading / Deep Study — Block 2 (Synthesis & Notes)',
      category: 'HEAVY',
      completed: true,
      ignition: 'Summarize 2 key concepts from today’s reading into your notes.'
    },
    {
      id: 'df_3',
      title: 'Spaced Repetition / Review Sprint #1 (Morning Warm-Up)',
      category: 'MECHANICAL',
      completed: true,
      ignition: 'Clear the first 15 review cards at a brisk 10-second reflex pace.'
    },
    {
      id: 'df_4',
      title: 'Admin & Inbox Triage Sprint (Bounded 20m Cap)',
      category: 'MECHANICAL',
      completed: true,
      ignition: 'Reply to the top 2 priority messages and close the inbox tab.'
    },
    {
      id: 'df_5',
      title: 'Spaced Repetition / Review Sprint #2 (Evening Wind-Down)',
      category: 'MECHANICAL',
      completed: false,
      isReviewQueue: true,
      ignition: 'Final mechanical review sprint — bank early if queue hits zero!'
    }
  ],
  closedList: [
    {
      id: 'cl_1',
      slot: 1,
      title: 'System Architecture & Technical Proposal',
      category: 'Deep Work',
      due: 'Primary Focus',
      completedBlocks: 2,
      totalBlocks: 6,
      hemingwayBridge: 'Start with the data-flow diagram captions before drafting section 2.',
      ignition: 'Create 4 section headers and drop in the architecture diagram.'
    },
    {
      id: 'cl_2',
      slot: 2,
      title: 'Feature Prototype & Unit Test Suite',
      category: 'Coding / Build',
      due: 'Due Friday',
      completedBlocks: 1,
      totalBlocks: 5,
      hemingwayBridge: 'Write the state schema validation test before wiring the UI form.',
      ignition: 'Open the test file and write 1 passing assertion.'
    },
    {
      id: 'cl_3',
      slot: 3,
      title: 'Quarterly Research Synthesis Deck',
      category: 'Writing',
      due: 'Due Next Tue',
      completedBlocks: 3,
      totalBlocks: 4,
      hemingwayBridge: 'Final proofread of slides 8–10 and export clean PDF.',
      ignition: 'Open slide 8 and verify the summary takeaways.'
    }
  ],
  openList: [
    {
      id: 'ol_1',
      title: 'Open-Source Documentation & Benchmark Release',
      category: 'Coding / Build',
      due: 'Standby Queue',
      completedBlocks: 0,
      totalBlocks: 6,
      hemingwayBridge: 'Set up clean README structure and installation quickstart.',
      ignition: 'Draft the 3-step installation snippet in README.md.'
    },
    {
      id: 'ol_2',
      title: 'Long-Form Essay: Human-Centric Systems Design',
      category: 'Writing',
      due: 'Creative Backlog',
      completedBlocks: 0,
      totalBlocks: 8,
      hemingwayBridge: 'Outline the three movements and core thesis statement.',
      ignition: 'Write 3 bullet points defining the central tension of Movement I.'
    },
    {
      id: 'ol_3',
      title: 'Portfolio & CV Refresh',
      category: 'Deep Work',
      due: 'Monthly Maintenance',
      completedBlocks: 0,
      totalBlocks: 4,
      hemingwayBridge: 'Add recent shipped project metrics to the top section.',
      ignition: 'Update 2 bullet points under recent projects.'
    }
  ],
  sanctuaryPillars: {
    pillar1: {
      id: 'p_1',
      number: 'Pillar 1',
      name: 'Music & Sound Sanctuary',
      type: 'FLUID',
      focus: 'Play an Instrument (Bass / Guitar / Piano) or Full Album Listening',
      prompt: 'Play 1 familiar song cold (zero DAW, zero metronome, zero drills) or put on track 1 of an album with eyes closed.'
    },
    pillar2: {
      id: 'p_2',
      number: 'Pillar 2',
      name: 'Maker & Tactile Craft Sanctuary',
      type: 'STICKY',
      focus: '3D Printing, Hardware Tinkering, or Tactile Craft',
      prompt: 'Isolate 1 single 5-minute physical prep, calibration, or assembly step with your hands.',
      ignitions: 1,
      maxIgnitions: 3,
      inProgress: false
    },
    pillar3: {
      id: 'p_3',
      number: 'Pillar 3',
      name: 'Literature, Story & Cinema Sanctuary',
      type: 'STICKY_TRIPLE',
      activeTrackKey: '3A',
      tracks: {
        '3A': {
          key: '3A',
          label: 'Track 3A — Fiction',
          title: 'Speculative / Literary Fiction Novel',
          prompt: 'Read or listen for the first 5 minutes at a relaxed pace to clear startup inertia and re-enter the story world.',
          ignitions: 2,
          maxIgnitions: 3,
          inProgress: false
        },
        '3B': {
          key: '3B',
          label: 'Track 3B — Nonfiction',
          title: 'History / Philosophy / Science Nonfiction',
          prompt: 'Open where you left off (or rewind 60s on audio) for a 5-minute curiosity on-ramp.',
          ignitions: 3,
          maxIgnitions: 3,
          inProgress: true
        },
        '3C': {
          key: '3C',
          label: 'Track 3C — Visual Media',
          title: 'Active Narrative Series or Cinema Queue',
          prompt: 'Put on the first 5 minutes of your active series or film away from your work monitor.',
          ignitions: 0,
          maxIgnitions: 3,
          inProgress: false
        }
      }
    },
    pillar4: {
      id: 'p_4',
      number: 'Pillar 4',
      name: 'Comfort Food Media Sanctuary',
      type: 'FLUID_SINGLE',
      activePick: 'Favorite Sitcom Rewatch',
      standbyOptions: [
        'Favorite Sitcom Rewatch',
        'Comedy / Improv Audio Podcast',
        'Classic Comfort Movie Rewatch',
        'Light Nature / Culinary Show'
      ],
      prompt: 'Put on the first 5 minutes of your single chosen comfort show away from your work desk — zero analysis required.'
    },
    pillar5: {
      id: 'p_5',
      number: 'Pillar 5',
      name: 'Systems, Strategy & RPG Gaming Sanctuary',
      type: 'STICKY',
      focus: 'Story RPG, Strategy Sim, or Tabletop Worldbuilding',
      prompt: 'Boot up your save file with 1 single 5-minute micro-objective (one camp conversation, inventory sort, or single turn).',
      ignitions: 1,
      maxIgnitions: 3,
      inProgress: false
    }
  }
};

const TIER_CONFIG = {
  TIER_3: {
    id: 'TIER_3',
    name: 'Tier 3: Recovery Floor',
    shortName: 'Tier 3: Recovery',
    blocks: 7,
    hours: '2h 20m Ceiling',
    desc: 'High-fatigue, heavy schedule, or post-crunch protection floor.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  },
  TIER_1: {
    id: 'TIER_1',
    name: 'Tier 1: Standard Cruise',
    shortName: 'Tier 1: Cruise',
    blocks: 12,
    hours: '4h 00m Ceiling',
    desc: 'Sustainable daily equilibrium: Daily Floor + Serialized Slot #1.',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40'
  },
  TIER_2: {
    id: 'TIER_2',
    name: "Tier 2: Emergency Surge (Hora'at Sha'ah)",
    shortName: 'Tier 2: Surge',
    blocks: 15,
    hours: '5h 00m Ceiling',
    desc: 'Temporary emergency ruling — strictly bounded, never SOP.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  }
};

export default function App() {
  // --------------------------------------------------------------------------
  // Persistent State Setup (Generalized Key)
  // --------------------------------------------------------------------------
  const [state, setState] = useState(() => {
    try {
      const saved = localStorage.getItem('symmetrical_productivity_general_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          ...DEFAULT_STATE,
          ...parsed,
          sanctuaryPillars: {
            ...DEFAULT_STATE.sanctuaryPillars,
            ...(parsed.sanctuaryPillars || {})
          }
        };
      }
    } catch (e) {
      console.error('Failed to read localStorage:', e);
    }
    return DEFAULT_STATE;
  });

  useEffect(() => {
    try {
      localStorage.setItem('symmetrical_productivity_general_v2', JSON.stringify(state));
    } catch (e) {
      console.error('Failed to write localStorage:', e);
    }
  }, [state]);

  // --------------------------------------------------------------------------
  // Interactive Timer & Circuit Breaker State
  // --------------------------------------------------------------------------
  // Modes: 'IDLE' | 'ON_DUTY_STAGE_1' (5m) | 'ON_DUTY_STAGE_2' (15m) |
  // 'LEVEL_1_RESET' (4m) | 'LEVEL_2_BUFFER' (12m) |
  // 'STILLNESS_WINDOW' (20m - Zero On-Ramp) | 'SANCTUARY_FLOW' (20m Pulse Check)
  const [timerMode, setTimerMode] = useState('IDLE');
  const [secondsLeft, setSecondsLeft] = useState(300);
  const [isRunning, setIsRunning] = useState(false);
  const [selectedRitualIdx, setSelectedRitualIdx] = useState(0);
  const [activeSanctuarySession, setActiveSanctuarySession] = useState(null);

  // Modals & Drawers
  const [showPhilosophyDrawer, setShowPhilosophyDrawer] = useState(false);
  const [showPulseCheckModal, setShowPulseCheckModal] = useState(false);
  const [showStillnessForkModal, setShowStillnessForkModal] = useState(false);
  const [showJsonModal, setShowJsonModal] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [toastMessage, setToastMessage] = useState(null);

  // Inline Editing & Creation States
  const [newFloorTitle, setNewFloorTitle] = useState('');
  const [newFloorCategory, setNewFloorCategory] = useState('HEAVY');
  const [newFloorIgnition, setNewFloorIgnition] = useState('');
  const [showAddFloorForm, setShowAddFloorForm] = useState(false);

  const [editingFloorId, setEditingFloorId] = useState(null);
  const [floorEditDraft, setFloorEditDraft] = useState({ title: '', category: 'HEAVY', ignition: '' });

  const [editingClosedId, setEditingClosedId] = useState(null);
  const [closedEditDraft, setClosedEditDraft] = useState({
    title: '',
    category: 'Deep Work',
    due: '',
    totalBlocks: 4,
    ignition: '',
    hemingwayBridge: ''
  });

  const [editingBridgeId, setEditingBridgeId] = useState(null);
  const [bridgeDraft, setBridgeDraft] = useState('');

  const [newBacklogTitle, setNewBacklogTitle] = useState('');
  const [newBacklogCategory, setNewBacklogCategory] = useState('Deep Work');
  const [newBacklogBlocks, setNewBacklogBlocks] = useState(4);
  const [newBacklogDue, setNewBacklogDue] = useState('Standby Queue');

  const [editingOpenId, setEditingOpenId] = useState(null);
  const [openEditDraft, setOpenEditDraft] = useState({ title: '', category: 'Deep Work', totalBlocks: 4, due: '' });

  // Sanctuary Customization States
  const [editingPillarKey, setEditingPillarKey] = useState(null);
  const [pillarEditDraft, setPillarEditDraft] = useState({ focus: '', prompt: '' });
  const [showComfortSwapper, setShowComfortSwapper] = useState(false);
  const [customComfortInput, setCustomComfortInput] = useState('');
  const [newRitualInput, setNewRitualInput] = useState('');
  const [showRitualEditor, setShowRitualEditor] = useState(false);

  const currentTier = TIER_CONFIG[state.tier] || TIER_CONFIG.TIER_1;
  const isAtTierCap = state.completedBlocks >= currentTier.blocks;

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 4200);
  };

  // --------------------------------------------------------------------------
  // Timer Countdown Engine
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          handleTimerZero();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, timerMode]);

  const handleTimerZero = () => {
    if (timerMode === 'ON_DUTY_STAGE_1') {
      // Seamless transition from 5m Low-Friction Ignition (Amber) -> 15m Flow Extension (Sapphire)
      setTimerMode('ON_DUTY_STAGE_2');
      setSecondsLeft(15 * 60);
      triggerToast('5-Minute Ignition complete! Seamlessly rolling into 15-Minute Flow Extension (Stage 2).');
    } else if (timerMode === 'ON_DUTY_STAGE_2') {
      setIsRunning(false);
      setTimerMode('IDLE');
      setSecondsLeft(300);
      completeOnDutyBlock('HEAVY');
    } else if (timerMode === 'LEVEL_1_RESET') {
      setIsRunning(false);
      setTimerMode('IDLE');
      setSecondsLeft(300);
      triggerToast('4-Minute Level 1 Micro-Reset complete. Ready for your next 5-minute ignition.');
    } else if (timerMode === 'LEVEL_2_BUFFER') {
      setIsRunning(false);
      setTimerMode('IDLE');
      setSecondsLeft(300);
      setState((prev) => ({ ...prev, consecutiveHeavyBlocks: 0 }));
      triggerToast('Level 2 Task-Switch Buffer complete! Heavy Focus Chain reset to 0/2.');
    } else if (timerMode === 'STILLNESS_WINDOW') {
      setIsRunning(false);
      setTimerMode('IDLE');
      setState((prev) => ({
        ...prev,
        stillnessWindowsUsed: Math.min(2, prev.stillnessWindowsUsed + 1)
      }));
      setShowStillnessForkModal(true);
    } else if (timerMode === 'SANCTUARY_FLOW') {
      setIsRunning(false);
      setState((prev) => ({
        ...prev,
        sanctuaryContinuousMinutes: prev.sanctuaryContinuousMinutes + 20
      }));
      setShowPulseCheckModal(true);
    }
  };

  // --------------------------------------------------------------------------
  // On-Duty Governor Actions
  // --------------------------------------------------------------------------
  const completeOnDutyBlock = (category = 'HEAVY') => {
    setState((prev) => {
      const nextCompleted = prev.completedBlocks + 1;
      const nextConsecutive =
        category === 'HEAVY' ? prev.consecutiveHeavyBlocks + 1 : 0;

      if (nextConsecutive >= 2) {
        setTimeout(() => {
          setTimerMode('LEVEL_2_BUFFER');
          setSecondsLeft(12 * 60);
          setIsRunning(false);
          triggerToast('2 Consecutive Heavy Blocks (40m) reached! Mandatory Level 2 Task-Switch Buffer queued.');
        }, 150);
      } else {
        triggerToast(`+1 Block Banked (${nextCompleted}/${TIER_CONFIG[prev.tier].blocks})!`);
      }

      return {
        ...prev,
        completedBlocks: nextCompleted,
        consecutiveHeavyBlocks: nextConsecutive
      };
    });
  };

  const adjustManualBlocks = (delta) => {
    setState((prev) => {
      const next = Math.max(0, prev.completedBlocks + delta);
      return { ...prev, completedBlocks: next };
    });
  };

  const startOnDutyIgnition = (taskTitle, ignitionPrompt) => {
    if (state.watchmansRest) {
      triggerToast("The Watchman's Rest is active. Exit Shutdown if you need to resume On-Duty blocks.");
      return;
    }
    if (state.consecutiveHeavyBlocks >= 2) {
      setTimerMode('LEVEL_2_BUFFER');
      setSecondsLeft(12 * 60);
      setIsRunning(true);
      triggerToast('Circuit Breaker: Complete your Level 2 Buffer before chaining a 3rd heavy block.');
      return;
    }
    setState((prev) => ({
      ...prev,
      activeTaskLabel: taskTitle || prev.activeTaskLabel,
      activeIgnitionPrompt: ignitionPrompt || prev.activeIgnitionPrompt
    }));
    setTimerMode('ON_DUTY_STAGE_1');
    setSecondsLeft(5 * 60);
    setIsRunning(true);
  };

  // --------------------------------------------------------------------------
  // Daily Recurring Floor CRUD
  // --------------------------------------------------------------------------
  const toggleFloorItem = (item) => {
    const markingDone = !item.completed;
    setState((prev) => {
      const updatedFloor = prev.dailyFloor.map((f) =>
        f.id === item.id ? { ...f, completed: markingDone } : f
      );
      const nextBlocks = markingDone
        ? prev.completedBlocks + 1
        : Math.max(0, prev.completedBlocks - 1);
      const nextConsecutive = markingDone
        ? item.category === 'HEAVY'
          ? prev.consecutiveHeavyBlocks + 1
          : 0
        : prev.consecutiveHeavyBlocks;

      return {
        ...prev,
        dailyFloor: updatedFloor,
        completedBlocks: nextBlocks,
        consecutiveHeavyBlocks: nextConsecutive
      };
    });

    if (markingDone) {
      if (item.category === 'MECHANICAL') {
        triggerToast('Mechanical sprint logged! Heavy Focus Chain reset to 0/2.');
      } else {
        triggerToast('Daily Floor block logged (+20m)!');
      }
    }
  };

  const handleAddFloorItem = (e) => {
    e.preventDefault();
    if (!newFloorTitle.trim()) return;
    const newItem = {
      id: 'df_' + Date.now(),
      title: newFloorTitle.trim(),
      category: newFloorCategory,
      completed: false,
      ignition:
        newFloorIgnition.trim() ||
        'Complete the first 5 minutes of low-friction setup.'
    };
    setState((prev) => ({
      ...prev,
      dailyFloor: [...prev.dailyFloor, newItem]
    }));
    setNewFloorTitle('');
    setNewFloorIgnition('');
    setShowAddFloorForm(false);
    triggerToast('Added recurring anchor to Daily Floor.');
  };

  const saveEditFloorItem = (id) => {
    if (!floorEditDraft.title.trim()) return;
    setState((prev) => ({
      ...prev,
      dailyFloor: prev.dailyFloor.map((f) =>
        f.id === id
          ? {
              ...f,
              title: floorEditDraft.title.trim(),
              category: floorEditDraft.category,
              ignition: floorEditDraft.ignition.trim() || f.ignition
            }
          : f
      )
    }));
    setEditingFloorId(null);
    triggerToast('Updated Daily Floor item.');
  };

  const deleteFloorItem = (id) => {
    setState((prev) => ({
      ...prev,
      dailyFloor: prev.dailyFloor.filter((f) => f.id !== id)
    }));
    triggerToast('Removed item from Daily Floor.');
  };

  const bankEarlyReviewZero = () => {
    const remaining = state.dailyFloor.filter((f) => !f.completed && f.category === 'MECHANICAL');
    if (remaining.length === 0) {
      triggerToast('All mechanical review sprints are already banked!');
      return;
    }
    setState((prev) => ({
      ...prev,
      dailyFloor: prev.dailyFloor.map((f) =>
        f.category === 'MECHANICAL' ? { ...f, completed: true } : f
      ),
      completedBlocks: prev.completedBlocks + remaining.length,
      consecutiveHeavyBlocks: 0
    }));
    triggerToast(`Early Clearance Rule: Banked ${remaining.length} mechanical sprint(s) immediately!`);
  };

  // --------------------------------------------------------------------------
  // Closed List & Open List CRUD
  // --------------------------------------------------------------------------
  const addBlockToClosedItem = (itemId) => {
    setState((prev) => {
      const updatedClosed = prev.closedList.map((item) =>
        item.id === itemId
          ? {
              ...item,
              completedBlocks: Math.min(item.totalBlocks, item.completedBlocks + 1)
            }
          : item
      );
      const nextConsecutive = prev.consecutiveHeavyBlocks + 1;
      if (nextConsecutive >= 2) {
        setTimeout(() => {
          setTimerMode('LEVEL_2_BUFFER');
          setSecondsLeft(12 * 60);
          setIsRunning(false);
        }, 150);
      }
      return {
        ...prev,
        closedList: updatedClosed,
        completedBlocks: prev.completedBlocks + 1,
        consecutiveHeavyBlocks: nextConsecutive
      };
    });
    triggerToast('Logged +1 Project Block (20m) on Closed List deliverable!');
  };

  const completeClosedItem = (itemId) => {
    const target = state.closedList.find((i) => i.id === itemId);
    setState((prev) => ({
      ...prev,
      closedList: prev.closedList
        .filter((i) => i.id !== itemId)
        .map((item, idx) => ({ ...item, slot: idx + 1 }))
    }));
    triggerToast(
      `Deliverable "${target?.title}" completed! Closed List slot unlocked (${state.closedList.length - 1}/3 used).`
    );
  };

  const saveEditClosedItem = (id) => {
    if (!closedEditDraft.title.trim()) return;
    setState((prev) => ({
      ...prev,
      closedList: prev.closedList.map((item) =>
        item.id === id
          ? {
              ...item,
              title: closedEditDraft.title.trim(),
              category: closedEditDraft.category,
              due: closedEditDraft.due.trim() || 'Active',
              totalBlocks: Math.max(1, Number(closedEditDraft.totalBlocks) || 4),
              ignition: closedEditDraft.ignition.trim() || item.ignition,
              hemingwayBridge: closedEditDraft.hemingwayBridge.trim() || item.hemingwayBridge
            }
          : item
      )
    }));
    setEditingClosedId(null);
    triggerToast('Updated Closed List deliverable.');
  };

  const demoteClosedToOpen = (item) => {
    setState((prev) => ({
      ...prev,
      closedList: prev.closedList
        .filter((i) => i.id !== item.id)
        .map((c, idx) => ({ ...c, slot: idx + 1 })),
      openList: [{ ...item, id: 'ol_' + Date.now() }, ...prev.openList]
    }));
    triggerToast(`Moved "${item.title}" to Open List standby backlog.`);
  };

  const saveHemingwayBridge = (itemId) => {
    setState((prev) => ({
      ...prev,
      closedList: prev.closedList.map((item) =>
        item.id === itemId ? { ...item, hemingwayBridge: bridgeDraft } : item
      )
    }));
    setEditingBridgeId(null);
    triggerToast("Hemingway Bridge saved for tomorrow's self.");
  };

  const promoteFromOpenList = (openItem) => {
    if (state.closedList.length >= 3) {
      triggerToast('Closed List is strictly capped at 3 slots! Complete or demote an active item first.');
      return;
    }
    setState((prev) => ({
      ...prev,
      closedList: [
        ...prev.closedList,
        {
          ...openItem,
          id: 'cl_' + Date.now(),
          slot: prev.closedList.length + 1
        }
      ],
      openList: prev.openList.filter((i) => i.id !== openItem.id)
    }));
    triggerToast(`Promoted "${openItem.title}" to Closed List Slot #${state.closedList.length + 1}!`);
  };

  const addNewOpenListItem = (e) => {
    e.preventDefault();
    if (!newBacklogTitle.trim()) return;
    const newItem = {
      id: 'ol_' + Date.now(),
      title: newBacklogTitle.trim(),
      category: newBacklogCategory,
      due: newBacklogDue.trim() || 'Backlog Queue',
      completedBlocks: 0,
      totalBlocks: Math.max(1, Number(newBacklogBlocks) || 4),
      hemingwayBridge: 'Define first 5-minute low-friction setup step.',
      ignition: 'Complete 5 minutes of skeleton setup with zero perfectionism.'
    };
    setState((prev) => ({
      ...prev,
      openList: [newItem, ...prev.openList]
    }));
    setNewBacklogTitle('');
    triggerToast('Added deliverable to Open List standby backlog.');
  };

  const saveEditOpenItem = (id) => {
    if (!openEditDraft.title.trim()) return;
    setState((prev) => ({
      ...prev,
      openList: prev.openList.map((item) =>
        item.id === id
          ? {
              ...item,
              title: openEditDraft.title.trim(),
              category: openEditDraft.category,
              totalBlocks: Math.max(1, Number(openEditDraft.totalBlocks) || 4),
              due: openEditDraft.due.trim() || 'Backlog'
            }
          : item
      )
    }));
    setEditingOpenId(null);
    triggerToast('Updated Open List item.');
  };

  const deleteOpenItem = (id) => {
    setState((prev) => ({
      ...prev,
      openList: prev.openList.filter((i) => i.id !== id)
    }));
    triggerToast('Deleted item from Open List.');
  };

  // --------------------------------------------------------------------------
  // Off-Duty Sanctuary Actions & Customization
  // --------------------------------------------------------------------------
  const startStillnessWindow = (presetLabel) => {
    if (state.stillnessWindowsUsed >= 2) {
      triggerToast('Two-Window (40m) Stillness Cap reached! Choose Fork A (Sleep) or Fork B (5m Pillar Ignition).');
      setShowStillnessForkModal(true);
      return;
    }
    setState((prev) => ({ ...prev, watchmansRest: true }));
    setActiveSanctuarySession({
      name: `Option 0: Bounded Stillness (${presetLabel})`,
      prompt: 'Zero 5-minute on-ramp required. Close your eyes and rest in silence — zero screens or text feeds.'
    });
    setTimerMode('STILLNESS_WINDOW');
    setSecondsLeft(20 * 60);
    setIsRunning(true);
    triggerToast(`Instant 20m Bounded Stillness Window started (${presetLabel}).`);
  };

  const launchSanctuaryPillar = (sessionObj) => {
    setState((prev) => ({ ...prev, watchmansRest: true }));
    setActiveSanctuarySession(sessionObj);
    setTimerMode('SANCTUARY_FLOW');
    setSecondsLeft(20 * 60);
    setIsRunning(true);
    triggerToast(`Launched ${sessionObj.name} (5m On-Ramp -> 20m Pulse Check active).`);
  };

  const cycleStickyShield = (pillarKey, trackKey = null) => {
    setState((prev) => {
      const pillars = { ...prev.sanctuaryPillars };
      if (pillarKey === 'pillar3' && trackKey) {
        const track = pillars.pillar3.tracks[trackKey];
        let nextIgnitions = track.ignitions + 1;
        let nextInProgress = track.inProgress;
        if (track.inProgress) {
          nextIgnitions = 0;
          nextInProgress = false;
        } else if (nextIgnitions >= track.maxIgnitions) {
          nextIgnitions = track.maxIgnitions;
          nextInProgress = true;
        }
        pillars.pillar3 = {
          ...pillars.pillar3,
          tracks: {
            ...pillars.pillar3.tracks,
            [trackKey]: {
              ...track,
              ignitions: nextIgnitions,
              inProgress: nextInProgress
            }
          }
        };
      } else {
        const p = pillars[pillarKey];
        let nextIgnitions = p.ignitions + 1;
        let nextInProgress = p.inProgress;
        if (p.inProgress) {
          nextIgnitions = 0;
          nextInProgress = false;
        } else if (nextIgnitions >= p.maxIgnitions) {
          nextIgnitions = p.maxIgnitions;
          nextInProgress = true;
        }
        pillars[pillarKey] = {
          ...p,
          ignitions: nextIgnitions,
          inProgress: nextInProgress
        };
      }
      return { ...prev, sanctuaryPillars: pillars };
    });
    triggerToast('Updated Sticky Onboarding Shield status!');
  };

  const savePillarEdit = (key) => {
    setState((prev) => {
      const pillars = { ...prev.sanctuaryPillars };
      if (key.startsWith('3')) {
        const track = pillars.pillar3.tracks[key];
        pillars.pillar3 = {
          ...pillars.pillar3,
          tracks: {
            ...pillars.pillar3.tracks,
            [key]: {
              ...track,
              title: pillarEditDraft.focus.trim() || track.title,
              prompt: pillarEditDraft.prompt.trim() || track.prompt
            }
          }
        };
      } else if (key === 'pillar4') {
        pillars.pillar4 = {
          ...pillars.pillar4,
          activePick: pillarEditDraft.focus.trim() || pillars.pillar4.activePick,
          prompt: pillarEditDraft.prompt.trim() || pillars.pillar4.prompt
        };
      } else {
        pillars[key] = {
          ...pillars[key],
          focus: pillarEditDraft.focus.trim() || pillars[key].focus,
          prompt: pillarEditDraft.prompt.trim() || pillars[key].prompt
        };
      }
      return { ...prev, sanctuaryPillars: pillars };
    });
    setEditingPillarKey(null);
    triggerToast('Saved custom Sanctuary Pillar settings.');
  };

  const selectComfortPick = (pickName) => {
    setState((prev) => ({
      ...prev,
      sanctuaryPillars: {
        ...prev.sanctuaryPillars,
        pillar4: {
          ...prev.sanctuaryPillars.pillar4,
          activePick: pickName
        }
      }
    }));
    setShowComfortSwapper(false);
    triggerToast(`Locked in "${pickName}" as your single Comfort Food pick.`);
  };

  const addCustomComfortPick = (e) => {
    e.preventDefault();
    if (!customComfortInput.trim()) return;
    const clean = customComfortInput.trim();
    setState((prev) => {
      const existing = prev.sanctuaryPillars.pillar4.standbyOptions;
      const updatedOptions = existing.includes(clean) ? existing : [clean, ...existing];
      return {
        ...prev,
        sanctuaryPillars: {
          ...prev.sanctuaryPillars,
          pillar4: {
            ...prev.sanctuaryPillars.pillar4,
            activePick: clean,
            standbyOptions: updatedOptions
          }
        }
      };
    });
    setCustomComfortInput('');
    setShowComfortSwapper(false);
    triggerToast(`Added & locked in "${clean}" as your active Comfort Food pick.`);
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`;
  };

  const p3 = state.sanctuaryPillars.pillar3;
  const activeP3Track = p3.tracks[p3.activeTrackKey] || p3.tracks['3A'];

  // ==========================================================================
  // RENDER UI
  // ==========================================================================
  return (
    <div
      className={`min-h-screen transition-colors duration-700 font-sans selection:bg-amber-500/30 ${
        state.watchmansRest
          ? 'bg-[#080c14] text-slate-100'
          : 'bg-[#0c1017] text-slate-100'
      }`}
    >
      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 max-w-md bg-slate-900/95 border border-amber-500/40 text-amber-200 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-3 backdrop-blur-md">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* ====================================================================
          TOP NAVIGATION & DAILY CAPACITY GOVERNOR BAR
         ==================================================================== */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0c1017]/90 backdrop-blur-xl">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3.5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Brand & Subtitle */}
            <div className="flex items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-500 ${
                      state.watchmansRest
                        ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]'
                        : state.tier === 'TIER_2'
                        ? 'bg-amber-400 shadow-[0_0_12px_#fbbf24]'
                        : 'bg-sky-400 shadow-[0_0_12px_#38bdf8]'
                    }`}
                  />
                  <h1 className="text-lg sm:text-xl font-bold tracking-wider uppercase bg-gradient-to-r from-slate-100 via-slate-200 to-slate-400 bg-clip-text text-transparent">
                    Symmetrical Productivity
                  </h1>
                  <span className="hidden sm:inline-block text-[11px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-slate-800/90 text-slate-400 border border-slate-700/70">
                    Diptych Governor
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  <span className="text-amber-300/90 font-medium">On-Duty Governor</span> (Bounded Capacity Ceiling) &amp;{' '}
                  <span className="text-emerald-300/90 font-medium">Off-Duty Sanctuary</span> (The Uncalculated Chord)
                </p>
              </div>

              {/* Utility Buttons (Philosophy Guide, Export/Import JSON, Reset Demo Data) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowPhilosophyDrawer(!showPhilosophyDrawer)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border flex items-center gap-1.5 transition ${
                    showPhilosophyDrawer
                      ? 'bg-amber-500/20 text-amber-200 border-amber-500/40'
                      : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border-slate-700/80'
                  }`}
                  title="Philosophy & How It Works"
                >
                  <Info className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Philosophy &amp; Guide</span>
                </button>
                <button
                  onClick={() => {
                    setJsonInput(JSON.stringify(state, null, 2));
                    setShowJsonModal(true);
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/80 flex items-center gap-1 transition"
                  title="Export or Import JSON State"
                >
                  <Download className="w-3.5 h-3.5 text-sky-400" />
                  <span className="hidden xl:inline">Export/Import JSON</span>
                </button>
                <button
                  onClick={() => {
                    setState(DEFAULT_STATE);
                    setTimerMode('IDLE');
                    setIsRunning(false);
                    setSecondsLeft(300);
                    triggerToast('Reset to clean default starter data.');
                  }}
                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 hover:text-rose-200 text-slate-400 border border-slate-700/80 flex items-center gap-1 transition"
                  title="Reset Demo Data"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="hidden xl:inline">Reset Demo</span>
                </button>
              </div>
            </div>

            {/* 3-Tier Selector + Watchman's Rest Switch */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
                {Object.values(TIER_CONFIG).map((t) => {
                  const active = state.tier === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setState((prev) => ({ ...prev, tier: t.id }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                        active
                          ? t.id === 'TIER_2'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                            : t.id === 'TIER_3'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                            : 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <span>{t.shortName}</span>
                      <span className="hidden sm:inline opacity-80">({t.blocks}b)</span>
                    </button>
                  );
                })}
              </div>

              {/* Master Toggle: Enter Watchman's Rest (Hard Shutdown) */}
              <button
                onClick={() => {
                  const nextRest = !state.watchmansRest;
                  setState((prev) => ({ ...prev, watchmansRest: nextRest }));
                  if (nextRest) {
                    setIsRunning(false);
                    setTimerMode('IDLE');
                    triggerToast("The Watchman's Rest activated. On-Duty board locked; Sanctuary illuminated.");
                  } else {
                    triggerToast('On-Duty Governor unlocked and active.');
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all flex items-center gap-2 border shadow-lg ${
                  state.watchmansRest
                    ? 'bg-gradient-to-r from-emerald-600/30 to-violet-600/30 text-emerald-200 border-emerald-400/50 shadow-emerald-950/50'
                    : 'bg-slate-800/90 hover:bg-slate-700 text-amber-200 border-amber-500/30'
                }`}
              >
                {state.watchmansRest ? (
                  <>
                    <Moon className="w-4 h-4 text-emerald-300" />
                    <span>WATCHMAN&apos;S REST: ACTIVE (OFF-DUTY)</span>
                  </>
                ) : (
                  <>
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>ENTER WATCHMAN&apos;S REST (HARD SHUTDOWN)</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Segmented Daily Capacity Meter + Manual Block Adjusters */}
          <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                Daily Ceiling ({currentTier.hours}):
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded border ${currentTier.badgeColor}`}>
                {state.completedBlocks} / {currentTier.blocks} Blocks (
                {Math.floor((state.completedBlocks * 20) / 60)}h {(state.completedBlocks * 20) % 60}m)
              </span>

              {/* Quick +1 / -1 Manual Block Adjusters */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => adjustManualBlocks(-1)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[11px] font-mono transition"
                  title="Subtract 1 Block (-20m)"
                >
                  -1 Block
                </button>
                <button
                  onClick={() => adjustManualBlocks(1)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-[11px] font-mono transition"
                  title="Log +1 Manual Work-Like Block (+20m)"
                >
                  +1 Manual Block
                </button>
              </div>

              {isAtTierCap && !state.watchmansRest && (
                <span className="text-xs text-amber-300 font-medium flex items-center gap-1 animate-pulse">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Daily Ceiling Reached — Flip Watchman&apos;s Rest!
                </span>
              )}
            </div>

            {/* Segmented Visual Bar */}
            <div className="flex items-center gap-1 flex-1 max-w-xl">
              {Array.from({ length: currentTier.blocks }).map((_, idx) => {
                const filled = idx < state.completedBlocks;
                return (
                  <button
                    key={idx}
                    onClick={() =>
                      setState((prev) => ({
                        ...prev,
                        completedBlocks: idx + 1 === prev.completedBlocks ? idx : idx + 1
                      }))
                    }
                    title={`Block ${idx + 1} of ${currentTier.blocks} (20m each)`}
                    className={`h-2.5 flex-1 rounded-sm transition-all ${
                      filled
                        ? state.tier === 'TIER_2'
                          ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                          : state.tier === 'TIER_3'
                          ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.5)]'
                          : 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.5)]'
                        : 'bg-slate-800 hover:bg-slate-700'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Tier 2 Emergency Surge Warning Banner */}
          {state.tier === 'TIER_2' && !state.watchmansRest && (
            <div className="mt-3 px-3.5 py-2 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-center justify-between gap-3 text-xs text-amber-200/90">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong className="font-semibold text-amber-300">
                    Movement III — Hora&apos;at Sha&apos;ah (Emergency Surge Override):
                  </strong>{' '}
                  &ldquo;Emergency suspension only — never standard operating procedure. Take the survival armor off at the front door when finished.&rdquo;
                </span>
              </div>
              <button
                onClick={() => setState((prev) => ({ ...prev, tier: 'TIER_1' }))}
                className="text-[11px] underline whitespace-nowrap text-amber-300 hover:text-amber-100"
              >
                Return to Cruise (12b)
              </button>
            </div>
          )}

          {/* Watchman's Rest Coda Quote Banner */}
          {state.watchmansRest && (
            <div className="mt-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-950/50 via-slate-900/80 to-violet-950/50 border border-emerald-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-emerald-200">
              <div className="flex items-center gap-2.5">
                <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="italic">
                  &ldquo;No single hand is meant to hold up the sky forever; to lay down the tools at the end of the watch is not to abandon the house, but to trust the shelter that was built.&rdquo; — Coda: The Watchman&apos;s Rest
                </span>
              </div>
              <span className="text-[11px] font-mono uppercase text-emerald-300/80 shrink-0">
                On-Duty Board Locked
              </span>
            </div>
          )}

          {/* Collapsible Philosophy & How It Works Guide Drawer */}
          {showPhilosophyDrawer && (
            <div className="mt-3 p-4 rounded-xl bg-slate-900/95 border border-slate-700/80 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-amber-400" />
                  <span>The Three Movements of Symmetrical Productivity</span>
                </h3>
                <button
                  onClick={() => setShowPhilosophyDrawer(false)}
                  className="text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                  <h4 className="font-bold text-amber-300 mb-1">
                    Movement I: Structure in Service of Meaning
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    Without order, chaos destroys; without chaos, order stagnates; without memory and curiosity, beauty and art, neither matters. The 20-minute micro-blocks, Tier ceilings, and 3-slot Closed List prevent chaos from splintering the day while ensuring the scaffolding never crowds out art and rest.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                  <h4 className="font-bold text-sky-300 mb-1">
                    Movement II: Unsentimental Moral Optimism
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    &ldquo;It is not your duty to finish the work, neither are you at liberty to neglect it.&rdquo; When a schedule slips or a day goes sideways, practice immediate return in the very next breath — zero self-flagellation or all-or-nothing defeatism.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/70 border border-slate-800">
                  <h4 className="font-bold text-rose-300 mb-1">
                    Movement III: Emergency Suspension vs. Self-Extraction
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    Surge Mode is strictly a temporary emergency override (<em>Hora&apos;at Sha&apos;ah</em>), never standard operating procedure. Treating your nervous system like hardware is a temporary concession to necessity, never a badge of honor.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/70 border border-emerald-500/30">
                  <h4 className="font-bold text-emerald-300 mb-1">
                    Coda: The Watchman&apos;s Rest
                  </h4>
                  <p className="text-slate-300 leading-relaxed">
                    When you reach your daily block ceiling, flip the Hard Shutdown switch. Step across the threshold into Bounded Stillness (Option 0) or your 5 Sanctuary Pillars, governed by a gentle 20-Minute Pulse Check so leisure never mutates into stealth work.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ====================================================================
          MAIN WORKSPACE: CENTERPIECE INSTRUMENT + DIPTYCH PANELS
         ==================================================================== */}
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* ==================================================================
            CENTERPIECE: TWO-STAGE IGNITION & CIRCUIT BREAKER INSTRUMENT
           ================================================================== */}
        <section
          className={`rounded-2xl border p-5 sm:p-6 transition-all duration-500 shadow-2xl ${
            timerMode === 'ON_DUTY_STAGE_1'
              ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/50'
              : timerMode === 'ON_DUTY_STAGE_2'
              ? 'bg-gradient-to-br from-sky-950/40 via-slate-900 to-slate-900 border-sky-500/50'
              : timerMode === 'LEVEL_2_BUFFER' || timerMode === 'LEVEL_1_RESET'
              ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-slate-900 border-emerald-500/50'
              : state.watchmansRest
              ? 'bg-gradient-to-br from-violet-950/30 via-slate-900 to-emerald-950/20 border-violet-500/40'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            {/* Left Column: Active Focus & Stage Indicator (5 cols) */}
            <div className="lg:col-span-5 space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[11px] font-mono uppercase tracking-widest px-2.5 py-1 rounded-md border ${
                    timerMode === 'ON_DUTY_STAGE_1'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : timerMode === 'ON_DUTY_STAGE_2'
                      ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      : timerMode === 'LEVEL_2_BUFFER' || timerMode === 'LEVEL_1_RESET'
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : state.watchmansRest
                      ? 'bg-violet-500/20 text-violet-300 border-violet-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  {timerMode === 'ON_DUTY_STAGE_1' && 'STAGE 1 (0:00–5:00): 5-MINUTE LOW-FRICTION IGNITION'}
                  {timerMode === 'ON_DUTY_STAGE_2' && 'STAGE 2 (5:00–20:00): 15-MINUTE FLOW EXTENSION'}
                  {timerMode === 'LEVEL_1_RESET' && 'CIRCUIT BREAKER: LEVEL 1 MICRO-RESET (4M)'}
                  {timerMode === 'LEVEL_2_BUFFER' && 'CIRCUIT BREAKER: LEVEL 2 TASK-SWITCH BUFFER (12M)'}
                  {timerMode === 'STILLNESS_WINDOW' && 'OPTION 0: BOUNDED STILLNESS WINDOW (20M — ZERO ON-RAMP)'}
                  {timerMode === 'SANCTUARY_FLOW' && 'SANCTUARY SESSION: 20M PULSE CHECK GUARDRAIL'}
                  {timerMode === 'IDLE' &&
                    (state.watchmansRest
                      ? 'OFF-DUTY SANCTUARY INSTRUMENT READY'
                      : 'TWO-STAGE IGNITION INSTRUMENT READY')}
                </span>
              </div>

              {!state.watchmansRest ? (
                <>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-100 leading-snug">
                    {timerMode === 'LEVEL_2_BUFFER'
                      ? state.bufferRituals[selectedRitualIdx] || state.bufferRituals[0]
                      : timerMode === 'LEVEL_1_RESET'
                      ? '4-Minute Hardware Reset: Refill water, look 20+ ft out a window, stretch'
                      : state.activeTaskLabel}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300/90 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <strong className="text-amber-300">5-Minute Micro-Objective:</strong>{' '}
                    {timerMode === 'LEVEL_2_BUFFER' || timerMode === 'LEVEL_1_RESET'
                      ? 'Step completely away from your work screen so your visual and verbal working memory can reset.'
                      : state.activeIgnitionPrompt}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg sm:text-xl font-bold text-emerald-200 leading-snug">
                    {activeSanctuarySession
                      ? activeSanctuarySession.name
                      : "The Watchman's Rest — Launch Option 0 Stillness or a 5-Pillar On-Ramp"}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300 bg-slate-950/60 p-3 rounded-xl border border-slate-800/80">
                    <strong className="text-emerald-300">Sanctuary Pacing Rule:</strong>{' '}
                    {activeSanctuarySession
                      ? activeSanctuarySession.prompt
                      : 'Option 0 requires zero 5-minute on-ramp. All 5 Pillars use a 5-Minute Ignition On-Ramp followed by a 20-Minute Pulse Check.'}
                  </p>
                </>
              )}
            </div>

            {/* Center Column: Tactile Ring Clock & Controls (4 cols) */}
            <div
              className={`lg:col-span-4 flex flex-col items-center justify-center bg-slate-950/80 border-2 rounded-2xl p-4 sm:p-5 shadow-inner transition-all ${
                timerMode === 'ON_DUTY_STAGE_1'
                  ? 'border-amber-500/60 shadow-[0_0_25px_rgba(245,158,11,0.15)]'
                  : timerMode === 'ON_DUTY_STAGE_2'
                  ? 'border-sky-500/60 shadow-[0_0_25px_rgba(56,189,248,0.15)]'
                  : timerMode === 'LEVEL_2_BUFFER' || timerMode === 'LEVEL_1_RESET'
                  ? 'border-emerald-500/60'
                  : 'border-slate-800/90'
              }`}
            >
              <div
                className={`text-4xl sm:text-5xl font-mono font-bold tracking-tight mb-3 ${
                  timerMode === 'ON_DUTY_STAGE_1'
                    ? 'text-amber-400'
                    : timerMode === 'ON_DUTY_STAGE_2'
                    ? 'text-sky-400'
                    : timerMode === 'LEVEL_2_BUFFER' || timerMode === 'LEVEL_1_RESET'
                    ? 'text-emerald-400'
                    : state.watchmansRest
                    ? 'text-violet-300'
                    : 'text-slate-100'
                }`}
              >
                {formatTime(secondsLeft)}
              </div>

              {/* Two-Stage Visual Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4 flex">
                <div
                  className={`h-full transition-all duration-300 ${
                    timerMode === 'ON_DUTY_STAGE_1'
                      ? 'bg-amber-400 w-1/4'
                      : timerMode === 'ON_DUTY_STAGE_2'
                      ? 'bg-sky-400 w-full'
                      : isRunning
                      ? 'bg-emerald-400 w-2/3'
                      : 'bg-slate-600 w-0'
                  }`}
                />
              </div>

              {/* Primary Timer Controls */}
              <div className="flex flex-wrap items-center justify-center gap-2">
                {timerMode === 'IDLE' && !state.watchmansRest && (
                  <button
                    onClick={() =>
                      startOnDutyIgnition(state.activeTaskLabel, state.activeIgnitionPrompt)
                    }
                    className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
                  >
                    <Flame className="w-4 h-4 fill-current" />
                    <span>Launch 5m Ignition (Stage 1)</span>
                  </button>
                )}

                {timerMode === 'IDLE' && state.watchmansRest && (
                  <button
                    onClick={() =>
                      launchSanctuaryPillar(
                        activeSanctuarySession || {
                          name: state.sanctuaryPillars.pillar1.name,
                          prompt: state.sanctuaryPillars.pillar1.prompt
                        }
                      )
                    }
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Start 5m Sanctuary Ignition</span>
                  </button>
                )}

                {timerMode !== 'IDLE' && (
                  <>
                    <button
                      onClick={() => setIsRunning(!isRunning)}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
                    >
                      {isRunning ? (
                        <>
                          <Pause className="w-3.5 h-3.5 text-amber-400" />
                          <span>Pause</span>
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Resume</span>
                        </>
                      )}
                    </button>

                    {/* Instant Sim Transition Button */}
                    <button
                      onClick={handleTimerZero}
                      className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                      title="Simulate stage transition immediately"
                    >
                      <FastForward className="w-3.5 h-3.5" />
                      <span>
                        {timerMode === 'ON_DUTY_STAGE_1'
                          ? 'Sim -> Stage 2 (15m Flow)'
                          : timerMode === 'ON_DUTY_STAGE_2'
                          ? 'Sim -> Complete Block'
                          : timerMode === 'SANCTUARY_FLOW'
                          ? 'Sim -> 20m Pulse Check'
                          : 'Sim -> Finish Timer'}
                      </span>
                    </button>

                    <button
                      onClick={() => {
                        setIsRunning(false);
                        setTimerMode('IDLE');
                        setSecondsLeft(300);
                      }}
                      className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700"
                      title="Reset Timer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Right Column: Heavy Focus Chain & Customizable Circuit Breakers (3 cols) */}
            <div className="lg:col-span-3 space-y-2.5 bg-slate-950/50 p-4 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  Heavy Focus Chain
                </span>
                <span
                  className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
                    state.consecutiveHeavyBlocks >= 2
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {state.consecutiveHeavyBlocks} / 2 Blocks
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[0, 1].map((slot) => (
                  <div
                    key={slot}
                    className={`h-2 rounded-full transition-all ${
                      state.consecutiveHeavyBlocks > slot
                        ? state.consecutiveHeavyBlocks >= 2
                          ? 'bg-amber-400 shadow-[0_0_8px_#fbbf24]'
                          : 'bg-sky-400'
                        : 'bg-slate-800'
                    }`}
                  />
                ))}
              </div>

              {/* Ritual Selector for Level 2 Buffer */}
              <div className="pt-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Active Buffer Ritual:</span>
                  <button
                    onClick={() => setShowRitualEditor(!showRitualEditor)}
                    className="text-[10px] text-sky-400 hover:underline"
                  >
                    {showRitualEditor ? 'Done' : 'Customize Rituals'}
                  </button>
                </div>

                <select
                  value={selectedRitualIdx}
                  onChange={(e) => setSelectedRitualIdx(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none"
                >
                  {state.bufferRituals.map((r, i) => (
                    <option key={i} value={i}>
                      {r}
                    </option>
                  ))}
                </select>

                {showRitualEditor && (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (!newRitualInput.trim()) return;
                      setState((prev) => ({
                        ...prev,
                        bufferRituals: [...prev.bufferRituals, newRitualInput.trim()]
                      }));
                      setSelectedRitualIdx(state.bufferRituals.length);
                      setNewRitualInput('');
                      triggerToast('Added custom Level 2 Buffer ritual.');
                    }}
                    className="flex gap-1 pt-1"
                  >
                    <input
                      type="text"
                      value={newRitualInput}
                      onChange={(e) => setNewRitualInput(e.target.value)}
                      placeholder="Add custom buffer ritual..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-100"
                    />
                    <button
                      type="submit"
                      className="px-2 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-[10px]"
                    >
                      Add
                    </button>
                  </form>
                )}

                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => {
                      setTimerMode('LEVEL_1_RESET');
                      setSecondsLeft(4 * 60);
                      setIsRunning(true);
                      triggerToast('Started Level 1 Micro-Reset (4m): Water, stretch, window look.');
                    }}
                    className="py-1.5 px-2 rounded-lg bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-medium flex items-center justify-center gap-1 transition"
                  >
                    <RefreshCw className="w-3 h-3 text-sky-400" />
                    <span>Level 1 (4m)</span>
                  </button>

                  <button
                    onClick={() => {
                      setTimerMode('LEVEL_2_BUFFER');
                      setSecondsLeft(12 * 60);
                      setIsRunning(true);
                      triggerToast('Started Level 2 Task-Switch Buffer (12m).');
                    }}
                    className="py-1.5 px-2 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-[11px] font-medium flex items-center justify-center gap-1 transition"
                  >
                    <Coffee className="w-3 h-3" />
                    <span>Level 2 (12m)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================
            THE DIPTYCH: ON-DUTY GOVERNOR (LEFT) & OFF-DUTY SANCTUARY (RIGHT)
           ================================================================== */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ================================================================
              LEFT PANEL: ON-DUTY GOVERNOR (SERIALIZED PIPELINE)
             ================================================================ */}
          <div
            className={`lg:col-span-7 space-y-6 transition-all duration-500 ${
              state.watchmansRest
                ? 'opacity-35 pointer-events-none select-none blur-[1px]'
                : 'opacity-100'
            }`}
          >
            {/* SECTION A: DAILY RECURRING FLOOR */}
            <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                      Section A: Daily Recurring Floor
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">
                      {state.dailyFloor.filter((f) => f.completed).length} / {state.dailyFloor.length} Done
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Foundational study, review, and mechanical anchors. Sandwich heavy blocks with mechanical sprints.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={bankEarlyReviewZero}
                    className="px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition"
                    title="Bank remaining mechanical review sprints if your queue hits 0 early"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Queue Hit 0 &rarr; Bank Sprints</span>
                  </button>
                  <button
                    onClick={() => setShowAddFloorForm(!showAddFloorForm)}
                    className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-amber-400" />
                    <span>Add Habit</span>
                  </button>
                </div>
              </div>

              {/* Add Daily Floor Habit Form */}
              {showAddFloorForm && (
                <form
                  onSubmit={handleAddFloorItem}
                  className="mb-4 p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <input
                      type="text"
                      value={newFloorTitle}
                      onChange={(e) => setNewFloorTitle(e.target.value)}
                      placeholder="Recurring block title (e.g., Core Reading Block 1)..."
                      className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                    />
                    <select
                      value={newFloorCategory}
                      onChange={(e) => setNewFloorCategory(e.target.value)}
                      className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200"
                    >
                      <option value="HEAVY">Heavy Focus (Counts on 2-Block Chain)</option>
                      <option value="MECHANICAL">Mechanical Palate Cleanser (Resets Chain)</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newFloorIgnition}
                      onChange={(e) => setNewFloorIgnition(e.target.value)}
                      placeholder="5-Minute Low-Friction Ignition prompt..."
                      className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs"
                    >
                      Save Habit
                    </button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {state.dailyFloor.map((item) => (
                  <div
                    key={item.id}
                    className={`rounded-xl border px-3.5 py-2.5 transition ${
                      item.completed
                        ? 'bg-slate-950/40 border-slate-800/50 text-slate-500'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 text-slate-200'
                    }`}
                  >
                    {editingFloorId === item.id ? (
                      <div className="space-y-2">
                        <div className="flex flex-col sm:flex-row gap-2">
                          <input
                            type="text"
                            value={floorEditDraft.title}
                            onChange={(e) =>
                              setFloorEditDraft({ ...floorEditDraft, title: e.target.value })
                            }
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100"
                          />
                          <select
                            value={floorEditDraft.category}
                            onChange={(e) =>
                              setFloorEditDraft({ ...floorEditDraft, category: e.target.value })
                            }
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                          >
                            <option value="HEAVY">Heavy Focus</option>
                            <option value="MECHANICAL">Mechanical Palate Cleanser</option>
                          </select>
                        </div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={floorEditDraft.ignition}
                            onChange={(e) =>
                              setFloorEditDraft({ ...floorEditDraft, ignition: e.target.value })
                            }
                            placeholder="5m Ignition prompt..."
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100"
                          />
                          <button
                            onClick={() => saveEditFloorItem(item.id)}
                            className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingFloorId(null)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-3">
                        <button
                          onClick={() => toggleFloorItem(item)}
                          className="flex items-center gap-3 text-left flex-1"
                        >
                          {item.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-slate-500 shrink-0" />
                          )}
                          <div>
                            <span
                              className={`text-xs sm:text-sm font-medium ${
                                item.completed ? 'line-through' : ''
                              }`}
                            >
                              {item.title}
                            </span>
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span
                                className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                                  item.category === 'HEAVY'
                                    ? 'bg-amber-500/10 text-amber-300/80'
                                    : 'bg-sky-500/10 text-sky-300/80'
                                }`}
                              >
                                {item.category === 'HEAVY'
                                  ? 'HEAVY FOCUS (20m)'
                                  : 'MECHANICAL PALATE CLEANSER (20m)'}
                              </span>
                              <span className="text-[11px] text-slate-400 truncate max-w-md">
                                5m: {item.ignition}
                              </span>
                            </div>
                          </div>
                        </button>

                        <div className="flex items-center gap-1 shrink-0">
                          {!item.completed && (
                            <button
                              onClick={() => startOnDutyIgnition(item.title, item.ignition)}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium flex items-center gap-1 transition"
                            >
                              <Flame className="w-3 h-3 text-amber-400" />
                              <span className="hidden sm:inline">Launch 5m</span>
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingFloorId(item.id);
                              setFloorEditDraft({
                                title: item.title,
                                category: item.category,
                                ignition: item.ignition
                              });
                            }}
                            className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                            title="Edit Floor Item"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => deleteFloorItem(item.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-300"
                            title="Delete Floor Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>

            {/* SECTION B: THE CLOSED LIST (STRICTLY CAPPED AT 3 ACTIVE DELIVERABLES) */}
            <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                      Section B: The Closed List (Active Deliverables)
                    </h3>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                      {state.closedList.length} / 3 Slots Used
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Serialization Rule: Slot #1 is your Primary Serialized Focus. Complete an item to unlock promotion from the Open List.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {[1, 2, 3].map((slotNum) => {
                  const item = state.closedList[slotNum - 1];
                  if (!item) {
                    return (
                      <div
                        key={slotNum}
                        className="rounded-xl border border-dashed border-emerald-500/40 bg-emerald-950/10 p-4 flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">
                            #{slotNum}
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-emerald-300">
                              Closed List Slot #{slotNum} Unlocked &amp; Available
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Promote a standby deliverable from Section C (The Open List) below.
                            </p>
                          </div>
                        </div>
                        <Unlock className="w-4 h-4 text-emerald-400 shrink-0" />
                      </div>
                    );
                  }

                  const isSlot1 = slotNum === 1;
                  const pct = Math.round((item.completedBlocks / item.totalBlocks) * 100);

                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 transition-all ${
                        isSlot1
                          ? 'bg-gradient-to-r from-amber-950/25 via-slate-900 to-slate-900 border-amber-500/50 shadow-lg'
                          : 'bg-slate-950/60 border-slate-800/90'
                      }`}
                    >
                      {editingClosedId === item.id ? (
                        <div className="space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                            <input
                              type="text"
                              value={closedEditDraft.title}
                              onChange={(e) =>
                                setClosedEditDraft({ ...closedEditDraft, title: e.target.value })
                              }
                              placeholder="Deliverable Title"
                              className="sm:col-span-2 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                            />
                            <select
                              value={closedEditDraft.category}
                              onChange={(e) =>
                                setClosedEditDraft({ ...closedEditDraft, category: e.target.value })
                              }
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-200"
                            >
                              <option value="Deep Work">Deep Work</option>
                              <option value="Coding / Build">Coding / Build</option>
                              <option value="Writing">Writing</option>
                            </select>
                            <input
                              type="number"
                              min={1}
                              max={30}
                              value={closedEditDraft.totalBlocks}
                              onChange={(e) =>
                                setClosedEditDraft({
                                  ...closedEditDraft,
                                  totalBlocks: e.target.value
                                })
                              }
                              placeholder="Total Blocks"
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                            />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              value={closedEditDraft.due}
                              onChange={(e) =>
                                setClosedEditDraft({ ...closedEditDraft, due: e.target.value })
                              }
                              placeholder="Target Date / Milestone Label"
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                            />
                            <input
                              type="text"
                              value={closedEditDraft.ignition}
                              onChange={(e) =>
                                setClosedEditDraft({ ...closedEditDraft, ignition: e.target.value })
                              }
                              placeholder="5-Minute Ignition Micro-Step"
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                            />
                          </div>
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => saveEditClosedItem(item.id)}
                              className="px-3 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                            >
                              Save Changes
                            </button>
                            <button
                              onClick={() => setEditingClosedId(null)}
                              className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span
                                  className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded font-bold ${
                                    isSlot1
                                      ? 'bg-amber-400 text-slate-950'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {isSlot1 ? 'PRIMARY SERIALIZED FOCUS #1' : `SLOT #${slotNum}`}
                                </span>
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                                  {item.category || 'Deep Work'}
                                </span>
                                <h4 className="text-sm font-bold text-slate-100">{item.title}</h4>
                                <span className="text-[11px] font-mono text-slate-400">
                                  ({item.due})
                                </span>
                              </div>

                              {/* Block Progress Bar */}
                              <div className="flex items-center gap-2 pt-1">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: item.totalBlocks }).map((_, bIdx) => (
                                    <span
                                      key={bIdx}
                                      className={`w-3.5 h-2 rounded-xs ${
                                        bIdx < item.completedBlocks
                                          ? isSlot1
                                            ? 'bg-amber-400'
                                            : 'bg-sky-400'
                                          : 'bg-slate-800'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs font-mono text-slate-300">
                                  {item.completedBlocks}/{item.totalBlocks} blocks ({pct}%)
                                </span>
                              </div>
                            </div>

                            {/* Deliverable Actions */}
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                onClick={() => startOnDutyIgnition(item.title, item.ignition)}
                                className="px-2.5 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <Flame className="w-3.5 h-3.5" />
                                <span>Launch 5m Ignition</span>
                              </button>

                              <button
                                onClick={() => addBlockToClosedItem(item.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition"
                              >
                                +1 Block
                              </button>

                              <button
                                onClick={() => completeClosedItem(item.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-medium flex items-center gap-1 transition"
                                title="Complete Deliverable & Unlock Slot"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Complete</span>
                              </button>

                              <button
                                onClick={() => {
                                  setEditingClosedId(item.id);
                                  setClosedEditDraft({
                                    title: item.title,
                                    category: item.category || 'Deep Work',
                                    due: item.due,
                                    totalBlocks: item.totalBlocks,
                                    ignition: item.ignition,
                                    hemingwayBridge: item.hemingwayBridge
                                  });
                                }}
                                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200"
                                title="Edit Deliverable"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                onClick={() => demoteClosedToOpen(item)}
                                className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 text-[10px] font-mono"
                                title="Park back on Open List to free slot"
                              >
                                Demote
                              </button>
                            </div>
                          </div>

                          {/* Hemingway Bridge Input */}
                          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                            {editingBridgeId === item.id ? (
                              <div className="flex items-center gap-2 w-full">
                                <input
                                  type="text"
                                  value={bridgeDraft}
                                  onChange={(e) => setBridgeDraft(e.target.value)}
                                  placeholder="Next step for tomorrow's self..."
                                  className="flex-1 bg-slate-900 border border-amber-500/50 rounded-lg px-2.5 py-1 text-xs text-slate-100 focus:outline-none"
                                />
                                <button
                                  onClick={() => saveHemingwayBridge(item.id)}
                                  className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 font-semibold text-xs"
                                >
                                  Save Bridge
                                </button>
                              </div>
                            ) : (
                              <>
                                <p className="text-slate-400 italic truncate">
                                  <strong className="text-slate-300 not-italic font-medium">
                                    Hemingway Bridge:
                                  </strong>{' '}
                                  &ldquo;{item.hemingwayBridge}&rdquo;
                                </p>
                                <button
                                  onClick={() => {
                                    setEditingBridgeId(item.id);
                                    setBridgeDraft(item.hemingwayBridge);
                                  }}
                                  className="text-slate-400 hover:text-amber-300 flex items-center gap-1 shrink-0"
                                >
                                  <PenTool className="w-3 h-3" />
                                  <span className="text-[11px]">Edit Bridge</span>
                                </button>
                              </>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* SECTION C: THE OPEN LIST (STANDBY BACKLOG — LOCKED WHEN CLOSED LIST IS 3/3) */}
            <section className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  {state.closedList.length >= 3 ? (
                    <Lock className="w-4 h-4 text-rose-400" />
                  ) : (
                    <Unlock className="w-4 h-4 text-emerald-400" />
                  )}
                  <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                    Section C: The Open List (Standby Backlog)
                  </h3>
                  <span
                    className={`text-xs font-mono px-2 py-0.5 rounded border ${
                      state.closedList.length >= 3
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {state.closedList.length >= 3
                      ? 'LOCKED (Closed List Full 3/3)'
                      : `UNLOCKED (${3 - state.closedList.length} Slot Open)`}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                {state.openList.map((item) => {
                  const canPromote = state.closedList.length < 3;
                  return (
                    <div
                      key={item.id}
                      className="rounded-xl bg-slate-950/70 border border-slate-800/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      {editingOpenId === item.id ? (
                        <div className="flex flex-wrap items-center gap-2 w-full">
                          <input
                            type="text"
                            value={openEditDraft.title}
                            onChange={(e) =>
                              setOpenEditDraft({ ...openEditDraft, title: e.target.value })
                            }
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-100"
                          />
                          <select
                            value={openEditDraft.category}
                            onChange={(e) =>
                              setOpenEditDraft({ ...openEditDraft, category: e.target.value })
                            }
                            className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200"
                          >
                            <option value="Deep Work">Deep Work</option>
                            <option value="Coding / Build">Coding / Build</option>
                            <option value="Writing">Writing</option>
                          </select>
                          <input
                            type="number"
                            min={1}
                            max={30}
                            value={openEditDraft.totalBlocks}
                            onChange={(e) =>
                              setOpenEditDraft({ ...openEditDraft, totalBlocks: e.target.value })
                            }
                            className="w-16 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-100"
                          />
                          <button
                            onClick={() => saveEditOpenItem(item.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                {item.category || 'Deep Work'}
                              </span>
                              <span className="text-xs sm:text-sm font-semibold text-slate-200">
                                {item.title}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                [{item.completedBlocks}/{item.totalBlocks} blocks • {item.due}]
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {item.hemingwayBridge}
                            </p>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              onClick={() => promoteFromOpenList(item)}
                              disabled={!canPromote}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                                canPromote
                                  ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 cursor-pointer'
                                  : 'bg-slate-800/60 text-slate-500 border border-slate-800 cursor-not-allowed'
                              }`}
                            >
                              <ArrowUpRight className="w-3.5 h-3.5" />
                              <span>
                                {canPromote ? 'Promote to Closed List' : 'Locked (3/3 Full)'}
                              </span>
                            </button>
                            <button
                              onClick={() => {
                                setEditingOpenId(item.id);
                                setOpenEditDraft({
                                  title: item.title,
                                  category: item.category || 'Deep Work',
                                  totalBlocks: item.totalBlocks,
                                  due: item.due
                                });
                              }}
                              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => deleteOpenItem(item.id)}
                              className="p-1.5 rounded-lg hover:bg-rose-950/60 text-slate-500 hover:text-rose-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add New Backlog Item Form */}
              <form
                onSubmit={addNewOpenListItem}
                className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-800/80"
              >
                <input
                  type="text"
                  value={newBacklogTitle}
                  onChange={(e) => setNewBacklogTitle(e.target.value)}
                  placeholder="Capture new project to Open List (protects Closed List focus)..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500/50"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select
                    value={newBacklogCategory}
                    onChange={(e) => setNewBacklogCategory(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300"
                  >
                    <option value="Deep Work">Deep Work</option>
                    <option value="Coding / Build">Coding / Build</option>
                    <option value="Writing">Writing</option>
                  </select>
                  <select
                    value={newBacklogBlocks}
                    onChange={(e) => setNewBacklogBlocks(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-300"
                  >
                    <option value={2}>2 Blocks (40m)</option>
                    <option value={4}>4 Blocks (1h 20m)</option>
                    <option value={6}>6 Blocks (2h 00m)</option>
                    <option value={8}>8 Blocks (2h 40m)</option>
                    <option value={10}>10 Blocks (3h 20m)</option>
                  </select>
                  <button
                    type="submit"
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add to Backlog</span>
                  </button>
                </div>
              </form>
            </section>
          </div>

          {/* ================================================================
              RIGHT PANEL: THE 5-PILLAR SANCTUARY MENU (THE UNCALCULATED CHORD)
             ================================================================ */}
          <div
            className={`lg:col-span-5 space-y-6 transition-all duration-500 ${
              state.watchmansRest
                ? 'ring-2 ring-emerald-500/50 rounded-2xl shadow-[0_0_40px_rgba(16,185,129,0.12)]'
                : ''
            }`}
          >
            <section className="rounded-2xl bg-gradient-to-b from-slate-900/95 via-slate-900/95 to-emerald-950/20 border border-slate-800 p-5 shadow-xl space-y-4">
              {/* Sanctuary Header + Pacing Guardrails */}
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-base font-bold text-slate-100 uppercase tracking-wide">
                      Off-Duty Sanctuary (The Uncalculated Chord)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    5m Ignition &rarr; 20m Pulse Check &rarr; Mandatory 60m Micro-Break.
                  </p>
                </div>

                <div className="flex items-center gap-1.5">
                  <span
                    className={`text-[10px] font-mono px-2 py-1 rounded border ${
                      state.sanctuaryContinuousMinutes >= 60
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 animate-pulse'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                    title="Mandatory 5–10m screen-off micro-break every 60 minutes of continuous hobby activity"
                  >
                    60m Guardrail: {state.sanctuaryContinuousMinutes}/60m
                  </span>
                  <button
                    onClick={() => setShowPulseCheckModal(true)}
                    className="px-2.5 py-1 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 border border-violet-500/40 text-xs font-semibold transition"
                  >
                    20m Pulse Check
                  </button>
                </div>
              </div>

              {state.sanctuaryContinuousMinutes >= 60 && (
                <div className="p-3 rounded-xl bg-amber-950/50 border border-amber-500/40 flex items-center justify-between gap-2 text-xs text-amber-200">
                  <span>
                    <strong>Mandatory 60-Minute Micro-Break Reached:</strong> Step away from screens/instruments for 5–10 minutes to prevent hyperfocus fatigue.
                  </span>
                  <button
                    onClick={() =>
                      setState((prev) => ({ ...prev, sanctuaryContinuousMinutes: 0 }))
                    }
                    className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 font-bold text-[11px] shrink-0"
                  >
                    Log 5m Break
                  </button>
                </div>
              )}

              {/* OPTION 0: BOUNDED "DO NOTHING" STILLNESS WINDOW (ZERO 5M ON-RAMP) */}
              <div className="rounded-xl bg-slate-950/80 border border-emerald-500/30 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Wind className="w-4 h-4 text-emerald-400" />
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-emerald-200">
                        Option 0: Bounded &ldquo;Do Nothing&rdquo; Stillness (20m)
                      </h4>
                      <span className="text-[10px] font-mono text-emerald-400/90">
                        ZERO 5-MINUTE ON-RAMP REQUIRED • INSTANT REST
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {state.stillnessWindowsUsed} / 2 Windows
                    </span>
                    {state.stillnessWindowsUsed > 0 && (
                      <button
                        onClick={() =>
                          setState((prev) => ({ ...prev, stillnessWindowsUsed: 0 }))
                        }
                        className="text-[10px] text-slate-400 hover:text-slate-200 underline"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  Pure decompression with eyes closed, deep breathing, or physical rest — strictly zero screens or text feeds. Capped at 2 windows (40m) before choosing Sleep (Fork A) or a Pillar (Fork B).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    'Eyes Closed & Silence (20m)',
                    '4-7-8 Deep Breathing (20m)',
                    'Physical Rest & Stretch (20m)'
                  ].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => startStillnessWindow(preset)}
                      className="px-2.5 py-2 rounded-lg bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-200 border border-emerald-500/30 text-[11px] font-medium text-center transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              {/* PILLAR 1: MUSIC & SOUND SANCTUARY [FLUID] */}
              <div className="rounded-xl bg-slate-950/75 border border-slate-800/90 p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <Music className="w-5 h-5 text-violet-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          Pillar 1
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          FLUID — ROTATE ANYTIME
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">
                        {state.sanctuaryPillars.pillar1.name}
                      </h4>
                      <p className="text-xs text-slate-300 font-medium">
                        {state.sanctuaryPillars.pillar1.focus}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setEditingPillarKey('pillar1');
                      setPillarEditDraft({
                        focus: state.sanctuaryPillars.pillar1.focus,
                        prompt: state.sanctuaryPillars.pillar1.prompt
                      });
                    }}
                    className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    title="Customize Pillar 1"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {editingPillarKey === 'pillar1' ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={pillarEditDraft.focus}
                      onChange={(e) =>
                        setPillarEditDraft({ ...pillarEditDraft, focus: e.target.value })
                      }
                      placeholder="Active Instrument / Album Focus"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      value={pillarEditDraft.prompt}
                      onChange={(e) =>
                        setPillarEditDraft({ ...pillarEditDraft, prompt: e.target.value })
                      }
                      placeholder="5-Minute Ignition On-Ramp"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => savePillarEdit('pillar1')}
                        className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPillarKey(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-300/90 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      <strong className="text-violet-300">5m On-Ramp:</strong>{' '}
                      {state.sanctuaryPillars.pillar1.prompt}
                    </p>
                    <div className="flex justify-end">
                      <button
                        onClick={() =>
                          launchSanctuaryPillar({
                            name: state.sanctuaryPillars.pillar1.name,
                            prompt: state.sanctuaryPillars.pillar1.prompt
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Launch 5m Ignition</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* PILLAR 2: MAKER & TACTILE CRAFT SANCTUARY [STICKY — 0/3 IGNITIONS] */}
              <div className="rounded-xl bg-slate-950/75 border border-slate-800/90 p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <Wrench className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          Pillar 2
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          STICKY — HANDS-ON
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">
                        {state.sanctuaryPillars.pillar2.name}
                      </h4>
                      <p className="text-xs text-slate-300 font-medium">
                        {state.sanctuaryPillars.pillar2.focus}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cycleStickyShield('pillar2')}
                      className={`px-2 py-1 rounded-lg border text-xs font-mono flex items-center gap-1 transition ${
                        state.sanctuaryPillars.pillar2.inProgress
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700'
                      }`}
                      title="Click to log a 5-Minute Onboarding Ignition (3 ignitions unlocks In Progress)"
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {state.sanctuaryPillars.pillar2.inProgress
                          ? 'In Progress'
                          : `${state.sanctuaryPillars.pillar2.ignitions}/3 Ignitions`}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingPillarKey('pillar2');
                        setPillarEditDraft({
                          focus: state.sanctuaryPillars.pillar2.focus,
                          prompt: state.sanctuaryPillars.pillar2.prompt
                        });
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {editingPillarKey === 'pillar2' ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={pillarEditDraft.focus}
                      onChange={(e) =>
                        setPillarEditDraft({ ...pillarEditDraft, focus: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      value={pillarEditDraft.prompt}
                      onChange={(e) =>
                        setPillarEditDraft({ ...pillarEditDraft, prompt: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => savePillarEdit('pillar2')}
                        className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPillarKey(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-300/90 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      <strong className="text-amber-300">5m On-Ramp:</strong>{' '}
                      {state.sanctuaryPillars.pillar2.prompt}
                    </p>
                    <div className="flex justify-end">
                      <button
                        onClick={() =>
                          launchSanctuaryPillar({
                            name: `${state.sanctuaryPillars.pillar2.name}: ${state.sanctuaryPillars.pillar2.focus}`,
                            prompt: state.sanctuaryPillars.pillar2.prompt
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Launch 5m Ignition</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* PILLAR 3: LITERATURE, STORY & CINEMA SANCTUARY [TRIPLE-TRACK 3A / 3B / 3C] */}
              <div className="rounded-xl bg-slate-950/75 border border-slate-800/90 p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <BookOpen className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          Pillar 3
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          STICKY — TRIPLE-TRACK (3A / 3B / 3C)
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">{p3.name}</h4>
                    </div>
                  </div>

                  {/* Sticky Shield for Active Track */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cycleStickyShield('pillar3', activeP3Track.key)}
                      className={`px-2 py-1 rounded-lg border text-xs font-mono flex items-center gap-1 transition ${
                        activeP3Track.inProgress
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {activeP3Track.inProgress
                          ? 'In Progress'
                          : `${activeP3Track.ignitions}/3 Ignitions`}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingPillarKey(activeP3Track.key);
                        setPillarEditDraft({
                          focus: activeP3Track.title,
                          prompt: activeP3Track.prompt
                        });
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                      title="Edit Active Track"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Triple-Track Tabs (3A Fiction, 3B Nonfiction, 3C Visual Media) */}
                <div className="grid grid-cols-3 gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  {Object.values(p3.tracks).map((tr) => {
                    const isSelected = p3.activeTrackKey === tr.key;
                    return (
                      <button
                        key={tr.key}
                        onClick={() =>
                          setState((prev) => ({
                            ...prev,
                            sanctuaryPillars: {
                              ...prev.sanctuaryPillars,
                              pillar3: {
                                ...prev.sanctuaryPillars.pillar3,
                                activeTrackKey: tr.key
                              }
                            }
                          }))
                        }
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold transition text-center truncate ${
                          isSelected
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {tr.label}
                      </button>
                    );
                  })}
                </div>

                {editingPillarKey === activeP3Track.key ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={pillarEditDraft.focus}
                      onChange={(e) =>
                        setPillarEditDraft({ ...pillarEditDraft, focus: e.target.value })
                      }
                      placeholder="Book / Series / Film Title"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      value={pillarEditDraft.prompt}
                      onChange={(e) =>
                        setPillarEditDraft({ ...pillarEditDraft, prompt: e.target.value })
                      }
                      placeholder="5-Minute Ignition On-Ramp"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => savePillarEdit(activeP3Track.key)}
                        className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-xs"
                      >
                        Save Track
                      </button>
                      <button
                        onClick={() => setEditingPillarKey(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60 space-y-1">
                      <div className="text-xs font-bold text-emerald-300">
                        {activeP3Track.label}: {activeP3Track.title}
                      </div>
                      <p className="text-xs text-slate-300/90">
                        <strong className="text-slate-200">5m On-Ramp:</strong>{' '}
                        {activeP3Track.prompt}
                      </p>
                    </div>
                    <div className="flex justify-end">
                      <button
                        onClick={() =>
                          launchSanctuaryPillar({
                            name: `${activeP3Track.label}: ${activeP3Track.title}`,
                            prompt: activeP3Track.prompt
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Launch {activeP3Track.key} Ignition</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* PILLAR 4: COMFORT FOOD MEDIA SANCTUARY [SINGLE EXPLICITLY PICKED ITEM] */}
              <div className="rounded-xl bg-slate-950/75 border border-slate-800/90 p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <Tv className="w-5 h-5 text-sky-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          Pillar 4
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30">
                          FLUID — SINGLE EXPLICIT PICK
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">
                        {state.sanctuaryPillars.pillar4.name}
                      </h4>
                      <p className="text-xs text-sky-300 font-semibold">
                        Active Pick: {state.sanctuaryPillars.pillar4.activePick}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowComfortSwapper(!showComfortSwapper)}
                    className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-sky-300 border border-slate-700 text-[11px] font-medium flex items-center gap-1 transition"
                  >
                    <Sliders className="w-3 h-3" />
                    <span>Swap Pick</span>
                  </button>
                </div>

                {/* Hidden Standby Swapper (Prevents Choice Paralysis) */}
                {showComfortSwapper && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 space-y-2">
                    <p className="text-[11px] text-slate-400">
                      Only 1 Comfort Pick is displayed at a time to eliminate off-duty choice paralysis:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {state.sanctuaryPillars.pillar4.standbyOptions.map((opt) => (
                        <button
                          key={opt}
                          onClick={() => selectComfortPick(opt)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
                            state.sanctuaryPillars.pillar4.activePick === opt
                              ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                    <form onSubmit={addCustomComfortPick} className="flex gap-1.5 pt-1">
                      <input
                        type="text"
                        value={customComfortInput}
                        onChange={(e) => setCustomComfortInput(e.target.value)}
                        placeholder="Or enter a new single comfort show/podcast..."
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-100"
                      />
                      <button
                        type="submit"
                        className="px-3 py-1 rounded-lg bg-sky-500 text-slate-950 font-bold text-xs"
                      >
                        Set Pick
                      </button>
                    </form>
                  </div>
                )}

                <p className="text-xs text-slate-300/90 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                  <strong className="text-sky-300">5m On-Ramp:</strong> Put on the first 5 minutes of{' '}
                  <em>{state.sanctuaryPillars.pillar4.activePick}</em> away from your work monitor — zero analysis required.
                </p>

                <div className="flex justify-end">
                  <button
                    onClick={() =>
                      launchSanctuaryPillar({
                        name: `Comfort Pick: ${state.sanctuaryPillars.pillar4.activePick}`,
                        prompt: `Put on the first 5 minutes of ${state.sanctuaryPillars.pillar4.activePick} away from your work monitor.`
                      })
                    }
                    className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Launch Comfort Pick</span>
                  </button>
                </div>
              </div>

              {/* PILLAR 5: SYSTEMS, STRATEGY & RPG GAMING SANCTUARY [STICKY — 0/3 IGNITIONS] */}
              <div className="rounded-xl bg-slate-950/75 border border-slate-800/90 p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                      <Gamepad2 className="w-5 h-5 text-rose-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase text-slate-400">
                          Pillar 5
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          STICKY — SYSTEMS &amp; RPG
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-slate-100">
                        {state.sanctuaryPillars.pillar5.name}
                      </h4>
                      <p className="text-xs text-slate-300 font-medium">
                        {state.sanctuaryPillars.pillar5.focus}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => cycleStickyShield('pillar5')}
                      className={`px-2 py-1 rounded-lg border text-xs font-mono flex items-center gap-1 transition ${
                        state.sanctuaryPillars.pillar5.inProgress
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-700'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5 text-amber-400" />
                      <span>
                        {state.sanctuaryPillars.pillar5.inProgress
                          ? 'In Progress'
                          : `${state.sanctuaryPillars.pillar5.ignitions}/3 Ignitions`}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setEditingPillarKey('pillar5');
                        setPillarEditDraft({
                          focus: state.sanctuaryPillars.pillar5.focus,
                          prompt: state.sanctuaryPillars.pillar5.prompt
                        });
                      }}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {editingPillarKey === 'pillar5' ? (
                  <div className="space-y-2 pt-1">
                    <input
                      type="text"
                      value={pillarEditDraft.focus}
                      onChange={(e) =>
                        setPillarEditDraft({ ...pillarEditDraft, focus: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />
                    <input
                      type="text"
                      value={pillarEditDraft.prompt}
                      onChange={(e) =>
                        setPillarEditDraft({ ...pillarEditDraft, prompt: e.target.value })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100"
                    />
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => savePillarEdit('pillar5')}
                        className="px-3 py-1 rounded bg-emerald-500 text-slate-950 font-bold text-xs"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingPillarKey(null)}
                        className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-slate-300/90 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/60">
                      <strong className="text-rose-300">5m On-Ramp:</strong>{' '}
                      {state.sanctuaryPillars.pillar5.prompt}
                    </p>
                    <div className="flex justify-end">
                      <button
                        onClick={() =>
                          launchSanctuaryPillar({
                            name: `${state.sanctuaryPillars.pillar5.name}: ${state.sanctuaryPillars.pillar5.focus}`,
                            prompt: state.sanctuaryPillars.pillar5.prompt
                          })
                        }
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Launch 5m Ignition</span>
                      </button>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ====================================================================
          OPTION 0 STILLNESS FORK MODAL (FORK A: SLEEP vs FORK B: PILLAR)
         ==================================================================== */}
      {showStillnessForkModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl bg-slate-900 border border-emerald-500/50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-300">
              <Wind className="w-6 h-6" />
              <h3 className="text-lg font-bold">
                Option 0 Stillness Window Complete ({state.stillnessWindowsUsed}/2 Windows Used)
              </h3>
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              Your 20-minute zero-screen stillness window is complete. So decompression never drifts into screen paralysis, choose your intentional next fork:
            </p>
            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowStillnessForkModal(false);
                  triggerToast("Fork A selected: Enjoy a guilt-free night's rest.");
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs sm:text-sm transition"
              >
                [Fork A: Head Straight to Sleep (The Watchman&apos;s Rest)]
              </button>
              <button
                onClick={() => {
                  setShowStillnessForkModal(false);
                  launchSanctuaryPillar({
                    name: `${activeP3Track.label}: ${activeP3Track.title}`,
                    prompt: activeP3Track.prompt
                  });
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition"
              >
                [Fork B: Launch a 5-Minute Sanctuary Pillar Ignition]
              </button>
              {state.stillnessWindowsUsed < 2 && (
                <button
                  onClick={() => {
                    setShowStillnessForkModal(false);
                    startStillnessWindow('2nd Window (40m Cap)');
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
                >
                  [Run 2nd 20m Stillness Window (2/2 Max)]
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          20-MINUTE SANCTUARY PULSE CHECK MODAL
         ==================================================================== */}
      {showPulseCheckModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-lg w-full rounded-2xl bg-slate-900 border border-emerald-500/50 p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 text-emerald-300">
              <HeartHandshake className="w-6 h-6" />
              <h3 className="text-lg font-bold">20-Minute Sanctuary Pulse Check</h3>
            </div>

            <p className="text-sm text-slate-200 leading-relaxed">
              You have spent 20 minutes in{' '}
              <strong className="text-emerald-300">
                {activeSanctuarySession?.name || 'Sanctuary Mode'}
              </strong>
              . Under Movement I (Structure in Service of Meaning):
            </p>

            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs sm:text-sm text-amber-200 italic">
              &ldquo;Is this activity genuinely feeding and restoring you right now, or is it turning into work-like strain, perfectionism, or numbing friction?&rdquo;
            </div>

            <div className="space-y-2 pt-2">
              <button
                onClick={() => {
                  setShowPulseCheckModal(false);
                  setSecondsLeft(20 * 60);
                  setIsRunning(true);
                  triggerToast('Still Restorative! Continuing for another 20m window.');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm transition"
              >
                [Still Restorative — Keep Going (+20m)]
              </button>

              <button
                onClick={() => {
                  setShowPulseCheckModal(false);
                  launchSanctuaryPillar({
                    name: `Comfort Pick: ${state.sanctuaryPillars.pillar4.activePick}`,
                    prompt: state.sanctuaryPillars.pillar4.prompt
                  });
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-semibold text-xs sm:text-sm transition"
              >
                [Switch Pillar — Pivot to Effortless Comfort Pick or Music]
              </button>

              <button
                onClick={() => {
                  setShowPulseCheckModal(false);
                  setIsRunning(false);
                  setTimerMode('IDLE');
                  triggerToast('Sanctuary session closed cleanly.');
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-violet-950/60 hover:bg-violet-900/60 text-violet-200 border border-violet-500/40 font-semibold text-xs sm:text-sm transition"
              >
                [Close Session &amp; Head to Sleep]
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          STATE JSON EXPORT / IMPORT MODAL
         ==================================================================== */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-2xl w-full rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Download className="w-4 h-4 text-sky-400" />
                <span>Export / Import Symmetrical Productivity JSON</span>
              </h3>
              <button
                onClick={() => setShowJsonModal(false)}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Close
              </button>
            </div>

            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              rows={12}
              className="w-full font-mono text-xs bg-slate-950 border border-slate-800 rounded-xl p-3 text-emerald-300 focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  navigator.clipboard?.writeText(jsonInput);
                  triggerToast('Copied JSON state to clipboard!');
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Copy JSON
              </button>
              <button
                onClick={() => {
                  try {
                    const parsed = JSON.parse(jsonInput);
                    setState({ ...DEFAULT_STATE, ...parsed });
                    setShowJsonModal(false);
                    triggerToast('Imported custom JSON state successfully!');
                  } catch (err) {
                    triggerToast('Invalid JSON syntax — please check formatting.');
                  }
                }}
                className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import &amp; Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}