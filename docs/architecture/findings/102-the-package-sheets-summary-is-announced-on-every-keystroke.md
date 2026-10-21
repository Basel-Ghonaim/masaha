# 102. The package sheet's summary is announced on every keystroke

**Status:** Open · **Date:** 2026-10-20

**Evidence:** the package sheet's summary box is one polite live region (`aria-live="polite"` in `apps/web/src/features/packages/components/sheet/PackageSheet.tsx`), and it holds the package's name beside its terms and its price. As the owner types the name, a screen reader reads the whole box again at each pause: the name, the terms and the price. The plan asked for the live region on the summary, so the sheet follows it; the review of #98 found the cost.

**Resolves when:** the live region holds only what the owner does not type (the terms and the price), or the box is read once the typing settles.
