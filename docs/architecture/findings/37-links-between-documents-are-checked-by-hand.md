# 37. Links between documents are checked by hand

**Status:** Resolved · **Date:** 2026-10-06

**Evidence:** the documents link each other by file and heading, and the capability documents add many such links ([documentation rules §8](../documentation.md#8-link-integrity)). A heading renamed, or a section moved, breaks every link to it without any check failing: nothing in CI reads the links of `docs/`, `CLAUDE.md` or the skills. The feature documents' effort checked them by hand, with a search for each anchor.

**Resolves when:** a link checker runs in CI over those files, files and headings both (a new dependency and a CI change, the owner's to approve); or the owner accepts the checks by hand.

**Resolution (2026-10-10, M4):** `npm run check:links` runs in CI as its own check, with no new dependency. It reads every Markdown file (except `node_modules`, `dist`, `.design-sync/` and `docs/design/prototype/`) and checks each relative link and image path against the repository's real files, case included, and each anchor against GitHub's slug of the file's headings; it also checks each `docs/….md` path cited in a source file under `apps/` and `packages/`. Fenced and inline code and external links are skipped. When it was written it found no broken link in 1,815 checked. Its limit: a heading cited in a comment as `docs/x.md › heading` is not checked ([documentation rules §8](../documentation.md#8-link-integrity)).
