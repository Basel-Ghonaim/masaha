# 37. Links between documents are checked by hand

**Status:** Open · **Date:** 2026-10-06

**Evidence:** the documents link each other by file and heading, and the capability documents add many such links ([documentation rules §8](../documentation.md#8-link-integrity)). A heading renamed, or a section moved, breaks every link to it without any check failing: nothing in CI reads the links of `docs/`, `CLAUDE.md` or the skills. The feature documents' effort checked them by hand, with a search for each anchor.

**Resolves when:** a link checker runs in CI over those files, files and headings both (a new dependency and a CI change, the owner's to approve); or the owner accepts the checks by hand.
