# 226. A ghost control inside a hovered table row has no hover of its own

**Status:** Open · **Date:** 2026-11-14

**Evidence:** a table's row hovers with the `hover` fill, and keeps it while one of its menus is open
(`apps/web/src/shared/design-system/components/data/Table/Table.tsx`, `hover:bg-hover
has-data-open:bg-hover`); a ghost button hovers, and marks its open menu, with the same fill
(`apps/web/src/shared/design-system/components/actions/Button/Button.tsx`, `hover:bg-hover …
aria-expanded:bg-hover`). So the rows' «⋯» — `StaffActionsMenu.tsx` (the staff list's column),
`CustomerMenu.tsx` and `SpaceActionsMenu.tsx` — show nothing of their own when the pointer reaches them, or once
their menu is open: the row and the button take one fill, in both themes. It was the same under the earlier
identity (accent on accent), so #144 did not cause it; its review found it (R1-F4).

**Resolves when:** the owner decides how a ghost control inside a hovered row is seen — for example, the ink's
wash (`hover-on-muted`) over the row's hover — and the layer draws it so.
