# ADR 0005 — Design system: one layer, shadcn/ui and Tailwind on a tiered token structure

> **Status:** Accepted · **Date:** 2026-09-26

## Context
Quick Tweets has a strong design-system *structure*: tiered tokens (primitive → semantic → component), themes as a complete resolution of semantic keys at one root, a script axis for Arabic typography, a component contract (no built-in words, logical properties, variant model, accessibility baseline) and a closed layer with one public surface. Its *values* and its hand-written CSS Modules components do not fit Masaha, and hand-writing every component again would cost too much time. Screens will be designed in Claude Design, which can import a design system from the code repository.

## Decision
- **Keep the structure, change the tools and values.** The design system is **one layer in one place**: `apps/web/src/shared/design-system/`.
- **Tailwind CSS v4** for styling; **shadcn/ui** as the source of components, copied into the layer and adapted to the contract; **Radix** primitives for behaviour; **Lucide** icons through one wrapper.
- Tokens as CSS variables in tiers; semantic role names follow shadcn's convention plus Masaha's status roles.
- Themes via `data-theme` on `<html>` set by a pre-paint script; key parity checked by a test.
- Pages and features use Tailwind only for layout; colour, type and shape come from the layer. Enforced by lint rules.
- Visual values are chosen in Claude Design, then written into the foundation document and the token files.

The operative rules are owned by [design-system/foundation.md](../../frontend/design-system/foundation.md).

## Alternatives
- **Reuse Quick Tweets' design system as-is** — rejected: its values do not fit, and it is written in CSS Modules.
- **shadcn/ui with its defaults, no structure** — rejected: it would scatter styling and lose theme discipline.
- **A full component library (MUI, Mantine)** — rejected: heavier, harder to bend to the token structure and to RTL rules.

## Consequences
- One place to change any visual decision; light and dark apply everywhere automatically.
- Each copied shadcn component needs an adaptation pass (words as props, logical properties, icon mirroring, semantic roles).
- The design system in code becomes the one Claude Design uses, so what is designed is what is built.
