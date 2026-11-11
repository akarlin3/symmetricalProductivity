import React, { useCallback, useEffect, useRef, useState } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DEFAULT_SYMMETRY_STATE } from '../state/defaultState';
import { SymmetryState } from '../types/symmetry';
import { ConversationalArchitectModal } from '../components/ConversationalArchitectModal';
import { getStartupStepDurationMinutes } from '../utils/configCompiler';
import * as geminiClient from '../utils/geminiClient';

vi.mock('../utils/geminiClient', async () => {
  const actual = await vi.importActual<typeof import('../utils/geminiClient')>(
    '../utils/geminiClient'
  );
  return {
    ...actual,
    hasActiveGeminiAccess: vi.fn(() => true),
    callGemini: vi.fn(),
  };
});

function cloneState(s: SymmetryState): SymmetryState {
  return JSON.parse(JSON.stringify(s)) as SymmetryState;
}

interface HarnessProps {
  initialState: SymmetryState;
  onStateChange: (state: SymmetryState) => void;
}

/**
 * Stateful store harness replicating App.tsx's Undo ring buffer (`undoStackRef`)
 * and global `Ctrl+Z` / `Meta+Z` keyboard shortcut rollback.
 */
const WorkspaceArchitectUndoHarness: React.FC<HarnessProps> = ({
  initialState,
  onStateChange,
}) => {
  const [state, setState] = useState<SymmetryState>(() =>
    cloneState(initialState)
  );
  const undoStackRef = useRef<SymmetryState[]>([]);
  const [undoDepth, setUndoDepth] = useState(0);

  useEffect(() => {
    onStateChange(state);
  }, [state, onStateChange]);

  const handleTriggerUndo = useCallback(() => {
    const [latestSnapshot, ...rest] = undoStackRef.current;
    if (!latestSnapshot) return;
    undoStackRef.current = rest;
    setState(latestSnapshot);
    setUndoDepth(rest.length);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.shiftKey &&
        e.key.toLowerCase() === 'z'
      ) {
        if (undoStackRef.current.length > 0) {
          e.preventDefault();
          handleTriggerUndo();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleTriggerUndo]);

  return (
    <ConversationalArchitectModal
      isOpen={true}
      onClose={() => {}}
      state={state}
      canUndo={undoDepth > 0}
      onTriggerUndo={handleTriggerUndo}
      onApplyCustomizedState={(nextState) => {
        setState((prev) => {
          const snapshotPrev = cloneState(prev);
          const nextStack = [
            snapshotPrev,
            ...undoStackRef.current.slice(0, 9),
          ];
          undoStackRef.current = nextStack;
          setUndoDepth(nextStack.length);
          return nextState;
        });
      }}
    />
  );
};

const MIXED_SMOKE_AI_PAYLOAD = {
  reply:
    'Updated rollover to 3:00 AM, switched to the Compact Widget layout, and configured Oil Painting and Sci-Fi evening channels while enforcing core mechanical guardrails.',
  clarifyingOptions: [
    {
      id: 'opt_strict',
      label: 'Option A: Keep Strict Focus #1 Lock',
      prompt: 'Keep Strict Focus #1 Lock.',
    },
    {
      id: 'opt_dual',
      label: 'Option B: Enable Dual-Slot Mode',
      prompt: 'Enable Dual-Slot mode.',
    },
  ],
  guardrailNotes: [],
  configPatch: {
    schedulePrefs: {
      logicalDayRolloverHour: 3,
      layoutMode: 'widget',
    },
    startupStepMinutes: 0,
    closedListMax: 10,
    maxConsecutiveSurgeDays: 5,
    eveningCategories: [
      {
        slotNumber: 1,
        name: 'Oil Painting',
        mode: 'fluid',
        activeTitle: 'Oil Painting Canvas Study',
        startupStep5m: 'Open palette and lay 5m base wash away from monitor.',
      },
      {
        slotNumber: 2,
        name: 'Sci-Fi',
        mode: 'sticky',
        activeTitle: 'Hard Sci-Fi Paperback',
        startupStep5m: 'Read 5m away from desk screen.',
      },
      {
        slotNumber: 3,
        name: 'Family Dinner',
        mode: 'fluid',
        activeTitle: 'Family Dinner',
        startupStep5m: 'Gather at dining table.',
      },
    ],
  },
};

describe('ConversationalArchitectModal — Diff Preview, Guardrail Pushback & Cmd/Ctrl+Z Rollback', () => {
  beforeEach(() => {
    vi.mocked(geminiClient.hasActiveGeminiAccess).mockReturnValue(true);
    vi.mocked(geminiClient.callGemini).mockResolvedValue({
      ok: true,
      source: 'BYOK_DIRECT',
      text: JSON.stringify(MIXED_SMOKE_AI_PAYLOAD),
    });
  });

  it('renders staged valid diffs + guardrail pushback banner, applies clamped state, and reverts 100% identically on Ctrl+Z / Meta+Z', async () => {
    const user = userEvent.setup();

    const initialSnapshot: SymmetryState = {
      ...cloneState(DEFAULT_SYMMETRY_STATE),
      uiLayoutMode: 'full',
      logicalDayRolloverHour: 4,
    };

    let liveStoreState: SymmetryState = cloneState(initialSnapshot);

    render(
      <WorkspaceArchitectUndoHarness
        initialState={initialSnapshot}
        onStateChange={(s) => {
          liveStoreState = s;
        }}
      />
    );

    // 1. Submit natural-language customization prompt
    const promptInput = screen.getByPlaceholderText(
      /Describe your workflow or ask for a tweak/i
    );
    await user.type(
      promptInput,
      'Rollover at 3am, widget layout, 0m startup, 10 active projects, 5 surge days, and evening Oil Painting, Sci-Fi, plus Family Dinner'
    );
    const sendButton = screen.getByRole('button', { name: /Send/i });
    await user.click(sendButton);

    // 2. Assert Guardrail Pushback Banner renders with clamped violation notes
    await waitFor(() => {
      expect(
        screen.getByText(/Core Mechanical Guardrails Enforced/i)
      ).toBeInTheDocument();
    });
    expect(screen.getByText(/Startup Step Guardrail/i)).toBeInTheDocument();
    expect(screen.getByText(/Closed List Guardrail/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Surge Circuit Breaker Guardrail/i)
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Evening Menu Guardrail: "Family Dinner" was not added as a timed\/gamified Evening Recharge hobby card/i
      )
    ).toBeInTheDocument();

    // 3. Assert Diff Preview Card renders valid staged changes & excludes gamified "Family Dinner" hobby channel
    const diffCard = screen.getByTestId('architect-diff-preview-card');
    expect(diffCard).toBeInTheDocument();
    expect(within(diffCard).getByText(/3:00 AM/i)).toBeInTheDocument();
    expect(
      within(diffCard).getByText(/Compact Minimal Widget/i)
    ).toBeInTheDocument();
    expect(
      within(diffCard).getByText(/Channel 1: Oil Painting/i)
    ).toBeInTheDocument();
    expect(
      within(diffCard).getByText(/Channel 2: Sci-Fi/i)
    ).toBeInTheDocument();
    expect(
      within(diffCard).queryByText(/Channel 3: Family Dinner/i)
    ).not.toBeInTheDocument();

    // 4. Click "Apply Changes" and assert store state updates ONLY with valid clamped fields
    const applyButton = within(diffCard).getByRole('button', {
      name: /^Apply Changes$/i,
    });
    await user.click(applyButton);

    await waitFor(() => {
      expect(liveStoreState.logicalDayRolloverHour).toBe(3);
    });
    expect(liveStoreState.uiLayoutMode).toBe('widget');
    expect(getStartupStepDurationMinutes(liveStoreState)).toBeGreaterThanOrEqual(
      3
    );
    expect(liveStoreState.projectQueue.length).toBeLessThanOrEqual(3);
    expect(liveStoreState.surgeConsecutiveDays).toBeLessThanOrEqual(2);

    const appliedCardNames = (liveStoreState.recharge.categoryCards || []).map(
      (c) => c.categoryName
    );
    expect(appliedCardNames).toContain('Oil Painting');
    expect(appliedCardNames).toContain('Sci-Fi');
    expect(appliedCardNames).not.toContain('Family Dinner');
    expect(liveStoreState.fixedEvent).toBe('EVENING_OUTING_6PM');

    // 5. Fire Ctrl+Z and assert store state deeply equals exact initial snapshot
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    await waitFor(() => {
      expect(liveStoreState).toEqual(initialSnapshot);
    });

    // 6. Re-apply and verify Meta+Z (macOS Cmd+Z) also restores exact initial snapshot
    await user.click(applyButton);
    await waitFor(() => {
      expect(liveStoreState.logicalDayRolloverHour).toBe(3);
    });

    fireEvent.keyDown(window, { key: 'z', metaKey: true });
    await waitFor(() => {
      expect(liveStoreState).toEqual(initialSnapshot);
    });
  });

  it('respects per-item Diff Preview checkboxes when skipping individual changes', async () => {
    const user = userEvent.setup();
    const initialSnapshot: SymmetryState = {
      ...cloneState(DEFAULT_SYMMETRY_STATE),
      uiLayoutMode: 'full',
      logicalDayRolloverHour: 4,
    };

    let liveStoreState: SymmetryState = cloneState(initialSnapshot);

    render(
      <WorkspaceArchitectUndoHarness
        initialState={initialSnapshot}
        onStateChange={(s) => {
          liveStoreState = s;
        }}
      />
    );

    const promptInput = screen.getByPlaceholderText(
      /Describe your workflow or ask for a tweak/i
    );
    await user.type(promptInput, 'Set 3am rollover and widget layout');
    await user.click(screen.getByRole('button', { name: /Send/i }));

    const diffCard = await screen.findByTestId('architect-diff-preview-card');

    // Uncheck "Workspace Layout Density" so only rollover & remaining checked diffs apply
    const layoutRowLabel = within(diffCard)
      .getByText(/Workspace Layout Density/i)
      .closest('label');
    expect(layoutRowLabel).not.toBeNull();
    const layoutCheckbox = within(layoutRowLabel!).getByRole('checkbox');
    await user.click(layoutCheckbox);
    expect(layoutCheckbox).not.toBeChecked();

    await user.click(
      within(diffCard).getByRole('button', { name: /^Apply Changes$/i })
    );

    await waitFor(() => {
      expect(liveStoreState.logicalDayRolloverHour).toBe(3);
    });
    // Unchecked layoutMode stayed at initial 'full'
    expect(liveStoreState.uiLayoutMode).toBe('full');
  });
});
