# ADR 0022 — The berry on the main action

> **Status:** Accepted · **Date:** 2026-11-24

## Context
[ADR 0019](0019-ink-and-spark-brand.md) gave the brand two roles: an ink for actions, links and structure, and a berry spark for what matters now, never on an action. Built across the site, it kept the pages clear, but the berry became almost invisible: two dots in the logo and a few selected states. Design rounds on the public pages kept reading as grey and empty, and the owner found the identity missing from the screens people see first.

Making the berry the site's main colour was considered and rejected. The directory's first information is the live state of each space, shown in the status colours, and a berry everywhere would compete with it. The dashboard is a daily tool of dense tables. And a wide berry ground behind running text cannot pass contrast at the spark's own step.

## Decision
1. **The main action takes the berry.** One main action per screen — the action the screen exists for — is drawn in the berry: a step darker than the spark in the light theme, so white text passes AA, and the spark's lighter step with dark text in the dark theme.
2. **The ink keeps everything else it has.** Secondary actions, links (underlined in running text), checked and active controls, focus and structure stay in the ink. A destructive action stays red.
3. **Content and work surfaces stay neutral.** Cards, tables, lists, forms and the dashboard's screens are ink on paper; the status colours keep their meaning alone.
4. **A few brand surfaces carry the berry-to-plum scale,** from the berry to its darkest step: large areas whose purpose is the identity — such as the home page's opening, the sign-in's brand area, the footer — never behind data or a form's fields. Text on them passes AA.
5. **The dashboard is quieter than the public pages:** there, the berry marks the selected item and the main action only.
6. **ADR 0019's spark keeps its other roles** (what matters now: the selected tint, an edge, a mark), and its measured criteria stay the tests a berry must pass: contrast on its grounds, and its distance from the destructive red, with and without simulated colour blindness — now applied to the main action's steps too.

## Alternatives
- **Keep ADR 0019 as it is,** the berry never on an action. Rejected: the identity stays invisible where people first meet the product.
- **The berry as the main colour of the site,** grounds, headings, links and actions. Rejected: it competes with the status colours, tires a daily tool, and fails contrast as a ground for running text.
- **The berry on every primary-styled control,** links and checked controls included. Rejected: a berry link beside a berry button blurs which is the action, and checked controls are state, not action.
- **The spark's own step on the action,** with white text. Rejected: 4.11 : 1, below AA.

## Consequences
- Every screen's main action changes colour at once, in both themes; secondary actions and links do not.
- The design system gains a role for the main action of its own, apart from the ink's role for links and controls.
- Each screen is designed with one main action; a screen that seems to need two shows one as secondary.
- The brand surfaces are designed page by page, starting with the sign-in and the home page.
- The logo, the browser's icons and the e-mails are unchanged.
