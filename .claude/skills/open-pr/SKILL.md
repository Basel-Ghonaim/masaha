---
name: open-pr
description: Use when a Masaha Work Item's implementation is finished and its pull request is about to be opened, again after each round of review fixes on that pull request, and when it conflicts with main.
---

# Open a pull request

A runbook, not a source of truth: each step links to the section that owns its rule. If this file and a document disagree, the document wins.

1. Self-review against the Definition of Done ([workflow §5](../../../docs/development/workflow.md#5-definition-of-done-and-accepted)) and the scope ([workflow §4](../../../docs/development/workflow.md#4-scope-control)).
2. Truth check:
   - every comment and every document sentence states what holds now ([CLAUDE.md, "Claim only what is true"](../../../CLAUDE.md#non-negotiable-rules-every-task));
   - code and test names carry no roadmap notes ([engineering principles §8](../../../docs/development/engineering-principles.md#8-comments)).
3. Run `git fetch origin`. Rebase on `origin/main` only as [workflow §9](../../../docs/development/workflow.md#9-parallel-work) says: when GitHub shows a conflict.
   - A conflict takes the fast path when it applies ([workflow §9, Conflicts](../../../docs/development/workflow.md#conflicts)).
   - A conflict in `package-lock.json` is regenerated, never merged by hand ([workflow §9, Dependencies](../../../docs/development/workflow.md#9-parallel-work)). If `package-lock.json` changed, install again ([setup, Install](../../../docs/development/setup.md#install)).
4. Verify locally, before any push: phase 4 ([workflow §2, Phases](../../../docs/development/workflow.md#phases)), with its exception for a change with no code. For Evidence ([workflow §3, PR description](../../../docs/development/workflow.md#pr-description)), record:
   - the counts;
   - which tests were seen failing first ([testing §3](../../../docs/development/testing.md#3-rules-that-bind-every-test));
   - what was NOT run, with why.
5. UI changes: take screenshots in RTL and LTR, light and dark, phone and desktop ([workflow §5](../../../docs/development/workflow.md#5-definition-of-done-and-accepted)). Save them in the folder the prompt names, and never commit them.
6. Push, then run `gh pr create --assignee @me`:
   - one type label and the area labels ([workflow §3, PR assignee and labels](../../../docs/development/workflow.md#pr-assignee-and-labels));
   - the description template ([workflow §3, PR description](../../../docs/development/workflow.md#pr-description));
   - no tool attribution anywhere ([workflow §3, Commits](../../../docs/development/workflow.md#commits)).
7. Wait for CI to pass on the pushed head and for GitHub to show `CLEAN` ([workflow §2, Phases](../../../docs/development/workflow.md#phases), phase 5). Then follow `final-report`.
8. After review fixes:
   - fold the fixes into their commits, and report them as [workflow §3, Commits](../../../docs/development/workflow.md#commits) says;
   - repeat step 4, push with `git push --force-with-lease` (the pull request is open, so step 6 does not run again), then step 7;
   - update the PR description to the final state ([workflow §5](../../../docs/development/workflow.md#5-definition-of-done-and-accepted)).
9. Stop. Never merge, and never create an Issue ([workflow §6](../../../docs/development/workflow.md#6-decision-authority), [workflow §2](../../../docs/development/workflow.md#2-work-item)).
