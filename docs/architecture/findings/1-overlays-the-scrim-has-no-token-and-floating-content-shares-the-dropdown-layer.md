# 1. Overlays: the scrim has no token, and floating content shares the dropdown layer

**Status:** Resolved · **Date:** 2026-09-26

**Evidence:**
1. `tokens/tailwind.css` resets Tailwind's `--color-*` so only the semantic roles exist. That also removes `black`, so shadcn's overlay class `bg-black/50` generates nothing. No semantic role covers the Dialog and Sheet overlay, the dimming scrim behind a modal.
2. Foundation §5 gives the z-index layers values but does not say which components use them. Tooltip, Popover and Select are portalled to `<body>` like menus. They use the `dropdown` layer (`--z-dropdown`, above `modal`), so one opened from a dialog appears over it.

**Resolves when:**
1. When Dialog and Sheet are built, a component token for the scrim is added. For example, `--overlay-scrim`, resolved per theme in `semantic.css` and written into foundation §4 first. The overlays bind that token.
2. Tooltip, Popover and Select bind `--z-dropdown` when they are built. *Select and Tooltip do (2026-09-27); Popover remains.*

*Item 1 done (2026-09-27):* `--overlay-scrim` is a component token in foundation §4 (light `n-950` at 50%, dark at 70%), resolved per theme in `semantic.css`. Dialog and AlertDialog bind it on `--z-overlay`, with their content on `--z-modal`.

**Resolution (2026-09-27):** both items settled in WI-7.
1. Dialog, AlertDialog and Sheet bind `--overlay-scrim` on `--z-overlay`, and their content on `--z-modal`.
2. DropdownMenu, like Select and Tooltip, binds `--z-dropdown`. For Popover, which comes with WI-8, this is now a standing rule rather than open work: foundation §11 maps `z-50` to the named layer for each kind of overlay, and `bg-black/*` to the scrim token. *Popover, built in WI-8 (2026-09-28), binds `--z-dropdown`.*
