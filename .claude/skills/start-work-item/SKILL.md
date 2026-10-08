---
name: start-work-item
description: Use at the very start of a Masaha Work Item conversation, before any planning. Checks the worker's folder and git state, reads the bootstrap documents, plans in plan mode, then cuts the branch.
---

# Start a Work Item

A runbook, not a source of truth: each step links to the section that owns its rule. If this file and a document disagree, the document wins.

1. Identify the worker and its folder: worker A in the main folder, worker B in the `masaha-b` worktree ([workflow §9](../../../docs/development/workflow.md#9-parallel-work)).
2. Run `git fetch origin`. Check that the tree is clean and `HEAD` is at `origin/main`, detached for worker B ([workflow §9](../../../docs/development/workflow.md#9-parallel-work)). If a check fails, stop and report ([workflow §8](../../../docs/development/workflow.md#8-stop-rules)).
3. Read what the task needs, in the order [workflow §2, Reading before work](../../../docs/development/workflow.md#reading-before-work) gives.
4. Plan in plan mode, then save the plan and stop, with `write-plan` ([workflow §2, Phases](../../../docs/development/workflow.md#phases), phase 2).
5. Once the reply approves the plan, cut the branch from the latest `main` ([workflow §3](../../../docs/development/workflow.md#3-git-lifecycle)):
   - worker A: `git switch -c <branch> origin/main`;
   - worker B: `git switch --no-track -c <branch> origin/main` ([workflow §9](../../../docs/development/workflow.md#9-parallel-work)).
6. Keep to the size cap the prompt names (subagents, workflows).
