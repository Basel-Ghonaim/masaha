# 38. The findings are one file

**Status:** Resolved · **Date:** 2026-10-06

**Evidence:** this file is the largest document in `docs/` (about 7,600 words, 37 entries before this one), and a reader looking for one finding opens all of them. One file per finding would let a capability document link a finding that reads alone. Splitting it moves a record with many inbound links, from the documents, the plans and the code's comments, so it was kept out of the feature documents' effort.

**Resolves when:** each finding moves to a file of its own in one folder, with every inbound link repointed in the same PR; or the owner accepts one file.

**Resolution (2026-10-08, #52):** each finding is a file of its own in this folder, named after its heading's anchor, and the [index](README.md) lists them by status. Every inbound link, from the documents, the records and the code's comments, was repointed in the same PR.
