# 73. The gallery's per-tile progress has no component in the layer

**Status:** Open · **Date:** 2026-10-17

**Evidence:** the design draws a photo's upload as a `.upload-bar` with `role="progressbar"` and an inline `style={{ width }}` ([docs/design/prototype/masaha/profile-b.jsx](../../design/prototype/masaha/profile-b.jsx)), and that class and style are outside the layer: `foundation.md` §3 keeps every colour, font and CSS in `shared/design-system/`, and `check:classes` fails a class outside it. The layer's [component inventory](../../frontend/design-system/foundation.md#12-component-inventory) has no progress component, and adding shadcn's `Progress` would bring `@radix-ui/react-progress`, a dependency the owner has ruled out for this work.

The gallery therefore shows the layer's `Spinner` with the percentage as text beside it — «جارٍ الرفع 45٪» / "Uploading 45%" — where the `Spinner` is the `role="status"`, which is accessible, honest about what is happening, and not the bar the design drew ([spaces › Web decisions](../../features/spaces.md#web-decisions)).

**Resolves when:** the layer gains a progress component, or a token pair a bar may be built from, or the owner accepts the spinner and the design archive is updated to draw it.