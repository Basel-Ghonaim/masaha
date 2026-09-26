# Findings

> **Status:** Active · **Owner:** Basel Ghoneim
> **Authority:** Recorded divergences between the intended design and reality. A finding records a problem; it does not schedule work. An ADR records a decision; an Issue (when the owner creates one) tracks a task.

Each entry: number, title, status (`Open` / `Resolved` / `Accepted`), date, evidence, and what would resolve it. Numbers are never reused.

## 1. Overlays: the scrim has no token, and floating content shares the dropdown layer

**Status:** Open · **Date:** 2026-09-26

**Evidence:**
1. `tokens/tailwind.css` resets Tailwind's `--color-*` so only the semantic roles exist. That also removes `black`, so shadcn's overlay class `bg-black/50` generates nothing. No semantic role covers the Dialog and Sheet overlay, the dimming scrim behind a modal.
2. Foundation §5 gives the z-index layers values but does not say which components use them. Tooltip, Popover and Select are portalled to `<body>` like menus. They use the `dropdown` layer (`--z-dropdown`, above `modal`), so one opened from a dialog appears over it.

**Resolves when:**
1. When Dialog and Sheet are built, a component token for the scrim is added. For example, `--overlay-scrim`, resolved per theme in `semantic.css` and written into foundation §4 first. The overlays bind that token.
2. Tooltip, Popover and Select bind `--z-dropdown` when they are built.
