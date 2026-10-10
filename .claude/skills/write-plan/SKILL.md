---
name: write-plan
description: Use when a Masaha Work Item's plan is written in plan mode, after start-work-item's reading, and when that plan is saved once the owner approves leaving plan mode.
---

# Write and save the plan

A runbook, not a source of truth: each step links to the section that owns its rule. If this file and a document disagree, the document wins.

1. In plan mode, write a complete plan with every decision taken ([workflow §2, Phases](../../../docs/development/workflow.md#phases), phase 2). Its sections, in this order:
   1. a short summary of what the item changes;
   2. the contract: scope, acceptance criteria, out of scope ([workflow §2](../../../docs/development/workflow.md#2-work-item));
   3. the reading done ([workflow §2, Reading before work](../../../docs/development/workflow.md#reading-before-work));
   4. the prompt's settled decisions, as they will be built;
   5. **Stronger decisions**: each decision of the prompt or of the documents, an ADR's included, within the item's scope, that the worker can make stronger, and each rule of the documents the item would contradict or weaken. Each one gets what, why, its cost and a recommendation. When there is none, say so ([workflow §2, Phases](../../../docs/development/workflow.md#phases));
   6. the related findings, each folded or not, with why and its cost ([workflow §4](../../../docs/development/workflow.md#4-scope-control));
   7. the files: the other layer's, under the licence the plan declares, and the files shared with the other worker, with the section each side owns ([workflow §9](../../../docs/development/workflow.md#9-parallel-work));
   8. **design issues**, for an item that builds or changes a screen: each mistake found in the design, with a better solution from the design system's components and tokens; built only once the reply approves them ([workflow §2, Phases](../../../docs/development/workflow.md#phases));
   9. each behaviour's lane, its test and the break it catches ([testing §1](../../../docs/development/testing.md#1-the-assignment-rule), [§3](../../../docs/development/testing.md#3-rules-that-bind-every-test));
   10. a *Review Focus* list: the inputs no planned test exercises;
   11. the commits ([workflow §3, Commits](../../../docs/development/workflow.md#commits));
   12. the verification: what phase 4 runs, and what it does not, with why ([workflow §2, Phases](../../../docs/development/workflow.md#phases));
   13. the decisions needed from the owner ([workflow §6](../../../docs/development/workflow.md#6-decision-authority)).
2. Leave plan mode with a short summary. The owner's approval of that exit means "save the plan", not "build it".
3. Save the plan, as approved, to the file the prompt names. Do this **before any branch is cut or any file of the repository is edited**.
4. **End the turn there.** Build nothing until the reply comes. Once the reply approves the plan, return to `start-work-item` to cut the branch.
