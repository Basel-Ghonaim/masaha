---
name: final-report
description: Use when a Masaha Work Item's pull request has passed CI on its pushed head and GitHub shows it CLEAN, to write and save the report; and again after each round of review fixes.
---

# Write and save the report

A runbook, not a source of truth: each step links to the section that owns its rule. If this file and a document disagree, the document wins.

1. Check that the time has come ([workflow §2, Phases](../../../docs/development/workflow.md#phases), phase 5):
   - CI passed on the pushed head: `gh pr checks <n>`, and the run's head SHA is the branch's;
   - GitHub shows `CLEAN`: `gh pr view <n> --json mergeStateStatus`.

   If either fails, it has not come: go back to `open-pr`.
2. Run the early conflict check ([workflow §9, Conflicts](../../../docs/development/workflow.md#conflicts)):
   - list the other open pull requests with `gh pr list --state open`;
   - fetch each head, and run `git merge-tree --write-tree <this head> <its head>`;
   - note each result: clean, or the files in conflict.
3. Write the report with these sections, in this order ([workflow §2, Phases](../../../docs/development/workflow.md#phases), phase 6):
   1. the pull request and its head (the SHA);
   2. the commits;
   3. what was run, with the counts per lane, and what was not, with why;
   4. the breaks made, and the tests seen failing first ([testing §3](../../../docs/development/testing.md#3-rules-that-bind-every-test));
   5. the problems met, and how each was solved;
   6. **anything that behaved unexpectedly, even unsolved**;
   7. the early conflict check: each open pull request and its result;
   8. each departure from the prompt, with its reason.
4. Save the report to the file the prompt names, and summarise it in the conversation.
5. After a round of review fixes, add a section for that round, in the same order, and summarise it.
6. Stop. Never merge, and never create an Issue ([workflow §6](../../../docs/development/workflow.md#6-decision-authority)).
