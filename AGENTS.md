# Project Rules: Symmetrical Productivity (SymmetryManager)

## Tone & Copywriting Constraints
1. ZERO philosophical, religious, or preachy text. Never use terms like Halakha, Aggadah, Teshuvah, Chavruta, Hora'at Sha'ah, or family lore in the UI, code comments, or notifications.
2. Keep all labels strictly functional, concise, and mechanical (e.g., "Focus Pipeline", "5m Startup Step", "End-of-Shift Lock", "Flow Extension", "Evening Recharge Menu", "Long-Term Roadmap").
3. Never gamify or list social/family time or live events on the Evening Recharge Menu.

## Hard State-Machine Rules
1. Duration-Only Display: Never show wall-clock timestamps in the Focus Pipeline unless a Fixed Event (Lab, Volunteer shift, or 6:00 PM Evening Outing) is logged. Display only block durations and remaining work countdown (`[40m | 3h 00m work left]` -> `[0m work left]`).
2. Two-Stage 20m Work Blocks: Every 20m block starts with a 5-minute Startup Step timer (`IGNITION_5M`) that automatically rolls into the 15-minute Momentum timer (`MOMENTUM_15M`).
3. Daily Core Baseline (7 Blocks): 4 Flashcard blocks (1 Anatomy + 3 Comp, 250-card cap) + 3 Half-Chapter blocks (2 reading/equations + 1 synthesis). Include an "Early Clearance" toggle for flashcards that banks unused blocks as free time, and block flashcards from being scheduled as the final block of the night.
4. Active Project Lock (Closed List): Max 3 items in the active queue. Lock 100% of discretionary project blocks to Item #1 until marked complete (2-page paper = 8 blocks; slide deck = 4 blocks).
5. Load Modes & Circuit Breakers:
   - Cruise Mode: 11–12 total blocks (up to 13 for Cruise+).
   - Surge Mode: 14–15 total blocks. Hard cap of max 2 consecutive Surge days; enforce a mandatory 60–120m Mid-Day Reset after 7 blocks.
   - Taper / Lab Mode: 7–9 desk blocks + Fixed Event (~2h Lab).
6. Break & Stress Triage Routing:
   - Same-task break: 3–5m Micro-Reset (max 2 chained 20m blocks [40m] before a mandatory 10–15m break).
   - Task-switch break: 10–15m Buffer (Espresso, 5m cold song on bass/guitar, or 15m TENS/Normatec).
   - Stress / Fatigue Reset Button: Suspends heavy reading/writing, runs a 15–20m physical reset timer (4-7-8 breathing visual pace, espresso, or compression boots), then queues a 5m Flashcard block.
7. End-of-Shift Lock & Flow Extension:
   - At `0m work left`, lock the work checklist and switch the theme to the Evening Recharge Menu.
   - Flow Extension Button: Only enabled if tomorrow has zero early morning events/labs, the active task is not flashcards, and weekly extensions used < 2. Prompt a single neutral confirmation ("Confirm this is genuine creative flow and not deadline stress"), run an open count-up timer with 20m check-in chimes and a 60m micro-break, and automatically deduct 1–2 project blocks from tomorrow's target for every 2–3 extension blocks logged.
8. Evening Recharge Menu & Pacing:
   - Option 0 (Rest / Stillness): 20m silent timer with zero startup step and no scrolling. Cap at 2 consecutive windows (40m), then prompt a Fork Check: "Go to Sleep" vs. "Start One 5m Activity".
   - 5 Categories:
     1. Music [Fluid]: 5m cold song play (no DAW/drills).
     2. Maker / Hardware [Sticky]: 5m K1C 3D printer diagnostic/build step.
     3. Media [Sticky Triple-Track]: Parallel tabs for 3A Fiction ("Soul Music" at 1.75x–2.25x), 3B Nonfiction ("The American Way of Killing"), and 3C Video ("Widow's Bay").
     4. Comfort Show [Fluid]: 5m episode start ("It's Always Sunny in Philadelphia") away from work monitor.
     5. Gaming [Sticky]: 5m micro-objective ("Baldur's Gate 3").
   - Pacing: 5m Startup Step -> 20m & 40m Check-In prompt ("Keep going, switch, or rest?") -> Mandatory 5–10m physical break at 60m.
   - Sticky Swap Counter: Track `[X / 3]` 5m starts on Sticky items (Categories 2, 3A/3B/3C, 5) before unlocking backlog promotion, or allow immediate swap at any 20m Check-In.
9. 4-Rung Roadmap (Input + Output Tracker):
   - 3 Core Tracks (Science/Clinical, Writing/Literature, Personal/Home) + 2 Zero-Quota Sandbox Tracks (Coding/Hardware, Music) across Rungs 1–4.
   - Auto-credit Baseline Floor & Media to Input (50%) and Project Blocks to Output (50%). Mark Sandbox Tracks as "Flexible Pace / Coasting in Neutral" during inactive weeks with zero warnings.
