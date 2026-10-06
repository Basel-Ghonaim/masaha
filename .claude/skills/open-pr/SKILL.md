---
name: open-pr
description: Use when a Masaha Work Item's implementation is finished and its pull request is about to be opened, and again after each round of review fixes on that pull request.
---

# Open a pull request

A runbook, not a source of truth: each step links to the section that owns its rule. If this file and a document disagree, the document wins.

1. Self-review against the Definition of Done ([workflow §5](../../../docs/development/workflow.md#5-definition-of-done-and-accepted)) and the scope ([workflow §4](../../../docs/development/workflow.md#4-scope-control)).
2. Truth check:
   - every comment and every document sentence states what holds now ([CLAUDE.md, "Claim only what is true"](../../../CLAUDE.md#non-negotiable-rules-every-task));
   - code and test names carry no roadmap notes ([engineering principles §8](../../../docs/development/engineering-principles.md#8-comments)).
3. Run `git fetch origin`. Rebase on `origin/main` only as [workflow §9](../../../docs/development/workflow.md#9-parallel-work) says: when GitHub shows a conflict. If `package-lock.json` changed, install again ([setup, Install](../../../docs/development/setup.md#install)).
4. Run every lane ([setup, Commands](../../../docs/development/setup.md#commands)). Record the counts, which tests were seen failing first ([testing §3](../../../docs/development/testing.md#3-rules-that-bind-every-test)), and what was NOT run, for Evidence ([workflow §3, PR description](../../../docs/development/workflow.md#pr-description)).
5. UI changes: take screenshots in RTL and LTR, light and dark, phone and desktop ([workflow §5](../../../docs/development/workflow.md#5-definition-of-done-and-accepted)). Save them in the folder the prompt names.
6. Push, then run `gh pr create --assignee @me`:
   - one type label and the area labels ([workflow §3, PR assignee and labels](../../../docs/development/workflow.md#pr-assignee-and-labels));
   - the description template ([workflow §3, PR description](../../../docs/development/workflow.md#pr-description));
   - no tool attribution anywhere ([workflow §3, Commits](../../../docs/development/workflow.md#commits)).
7. After review fixes, update the PR description to the final state ([workflow §5](../../../docs/development/workflow.md#5-definition-of-done-and-accepted)). Fold and report the fixes as [workflow §3, Commits](../../../docs/development/workflow.md#commits) says.
8. Stop. Never merge, and never create an Issue ([workflow §6](../../../docs/development/workflow.md#6-decision-authority), [workflow §2](../../../docs/development/workflow.md#2-work-item)).
