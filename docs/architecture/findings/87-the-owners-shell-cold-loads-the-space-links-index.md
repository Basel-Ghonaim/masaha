# 87. The owners shell cold-loads the whole space-links index

**Status:** Resolved · **Date:** 2026-10-18

**Evidence:** the owner's shell loads the whole `space-links` index, so
`routes.component.test.tsx` › "lists the owner's eleven pages" cold-loads in about 2.5 s against
its 3 s limit (#88's review, nit 1). The test stays green on this PR's head.

**Resolves when:** the test's budget or the shell's imports leave a margin.

**Resolution (2026-10-29, #132):** the route tests pay the shells' and pages' first load before their waits ([testing §3](../../development/testing.md#3-rules-that-bind-every-test), rule 8), so the 3 s budget is left to the page's own work.
