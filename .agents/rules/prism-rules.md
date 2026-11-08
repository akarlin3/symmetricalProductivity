# Symmetrical Productivity — Strict State-Machine Rules
1. Tone: 100% mechanical, concise, and functional. ZERO philosophical, religious, or family lore references.
2. Folder Structure: All work happens inside `symmetrical-productivity/`. Clean up duplicate root `.tsx` files once merged into `symmetrical-productivity/src/`.
3. Timers: Never use raw `setInterval` decrements alone. Always compute remaining time using `Date.now()` target timestamps (`endTime - Date.now()`) so timers never drift when the browser tab or Android screen is locked/backgrounded.
4. Core Mechanics:
   - Duration-only header (`[40m | 3h 00m work left]` -> `[0m work left]`), zero wall-clock times unless a fixed event is logged.
   - 20m work blocks = 5m Startup Step (`IGNITION_5M`) auto-rolling into 15m Momentum (`MOMENTUM_15M`).
   - 7-Block Daily Baseline: 1 Anatomy card block + 3 Comp card blocks (with Early Clearance toggle & late-night blocker) + 2 reading blocks + 1 synthesis block.
   - Closed List: Max 3 active items, 100% locked to Focus #1 until done.
   - Load Modes: Cruise (11-12, Cruise+ 13), Surge (14-15, max 2 consecutive days, mandatory 60-120m reset at block 7), Taper/Lab (7-9 + fixed event).
   - Breaks & Reset: Level 1 (3-5m), Level 2 (10-15m after 2 chained blocks or task switch), Level 3 (60-120m), plus "Stress / Fatigue Reset" (15-20m breathing/TENS -> queues 5m Flashcard block).
   - End-of-Shift & Evening Recharge: Locks at `0m work left`. Flow Extension checks 3 gates (no morning anchor tomorrow, not flashcards, <2 used this week), prompts 1 neutral confirmation, runs open timer with 20m check-ins & 60m break, and deducts 1-2 blocks from tomorrow's target per 2-3 extra blocks.
   - Evening Menu: Option 0 Stillness (20m, 2-window/40m cap -> Sleep vs. 5m Activity fork) + 5 Categories (1: Music [Fluid], 2: K1C Maker [Sticky], 3A/3B/3C: Triple-Track Media [Sticky], 4: Comfort Show [Fluid], 5: BG3 Gaming [Sticky]) with `[X / 3]` Sticky try counters, 20m/40m check-ins, and 60m mandatory break.
