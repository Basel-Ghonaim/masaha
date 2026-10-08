# Workflow

> **Status:** Active · **Last Updated:** 2026-10-08 · **Owner:** Basel Ghoneim
> **Authority:** How work is executed on Masaha: task classes, a Work Item's phases, the Git lifecycle, scope control, the Definition of Done, decision authority, stop rules and the AI tooling. Code-design rules are owned by [engineering-principles.md](engineering-principles.md); where a behaviour is tested is owned by [testing.md](testing.md).

Masaha is built by **one developer (the owner)** with AI assistants. The workflow keeps the discipline of a team process — reviewable units, a clean history, gated decisions — without ceremony a solo project does not need.

The procedures every Work Item repeats are packaged as Claude Code skills in [`.claude/skills/`](../../.claude/skills/): runbooks that link to this document, which wins if they disagree.

## 1. Task classes

| Class | Examples | Branch + PR? |
|---|---|---|
| **Conversation / Analysis / Planning** | discussing a design, reviewing options, drafting a plan | No |
| **Trivial** | typo, copy fix, dependency patch, one-line config | Yes (PR can be merged immediately) |
| **Substantial** | a feature, an endpoint, a refactor, a new document | Yes |

A change is **trivial** only if all four hold: no design decision, no new behaviour or contract, small, obviously correct. **When in doubt, it is substantial.**

## 2. Work Item

**One Work Item = one branch = one PR = the owner's review = merge.**

**Issues are optional.** An Issue is created only when the owner decides one is useful (for example, to track something larger than one PR, or to record a bug for later). An AI never creates an Issue on its own.

Without an Issue, the Work Item's **contract lives in the PR description**:
- **Scope** — what this change does.
- **Acceptance criteria** — a checklist.
- **Out of scope** — what it deliberately does not do.

### Phases

A substantial item runs these seven phases, in order; a trivial one (§1) goes straight to its PR. The skills in [`.claude/skills/`](../../.claude/skills/) walk through them.

1. **Before the prompt** (the owner, with an analyst). The task is explained, its open decisions settled, and the related findings to fold chosen (§4). The prompt carries the task in brief, what to read, the settled decisions, the folded findings, the boundaries with the other worker (§9), and where to save the plan and the report. The prompt names those folders; no document or skill does.
2. **Plan,** in plan mode: a complete plan with every decision taken. It contains:
   - the contract (scope, acceptance criteria, out of scope);
   - a **Stronger decisions** section: any decision of the prompt or of the documents, an ADR's included, within the item's scope, that the worker can make stronger, each with its reason, its cost and a recommendation;
   - the related findings, each folded or not (§4);
   - the files, the other layer's included (§9);
   - each test with the break it catches ([testing §3](testing.md#3-rules-that-bind-every-test)), and a *Review Focus* list: the inputs no planned test exercises;
   - the commits (§3) and the verification (phase 4);
   - the decisions it needs from the owner (§6).

   **Saving it.** Plan mode cannot write files, so the worker leaves it with a short summary. The owner's approval of that exit means "save the plan", not "build it". The worker writes the plan to the file the prompt names, before any branch is cut or file edited, and **stops** until the reply comes.
3. **Implement** the approved plan. Every new test is seen failing first ([testing §3](testing.md#3-rules-that-bind-every-test)).
4. **Verify locally, before any push.** Every lane, once, one at a time, on the head; `build` and `check:build`; a real run (the browser for the web, real requests for the API). Servers started for the run are stopped afterwards and their ports checked free ([setup › Running a second folder](setup.md#running-a-second-folder)). **The exception:** a change with no code (documents and skills only) runs `format:check` and the link check by hand ([documentation rules §8](../architecture/documentation.md#8-link-integrity)), and nothing else. Anything not run is said, with why.
5. **Pull request:** push, open it (§3), and wait for CI to pass on the pushed head and for GitHub to show `CLEAN`.
6. **Report,** only after phase 5. It is saved to the file the prompt names and summarised in the conversation. It gives:
   - the head and the commits;
   - what was run and what was not;
   - the breaks made;
   - the problems met and how they were solved;
   - **anything that behaved unexpectedly,** even unsolved;
   - the early conflict check (§9, [*Conflicts*](#conflicts));
   - any departure from the prompt, with its reason.
7. **Review.** The owner and the analyst read the report and the branch. A separate review conversation opens when the PR:
   - touches more than about 25 files;
   - touches authorization or security, a transaction, or the schema;
   - adds a dependency;
   - or changes CI or the build checks.

   Otherwise the analyst reviews it. Fixes stay in the worker's conversation (§3, *Commits*; §9).

### Reading before work

A Work Item reads what its task needs: never the whole set, never less than the essentials. In this order:

1. **Always:** CLAUDE.md, this workflow, the [map](../README.md), and the open findings' titles and *Resolves when* lines (§4).
2. **The capability's document first,** when the task changes a capability that has one, and only the sections it or the prompt links. A capability without a document yet (not at its stable core) is worked on from the prompt and the platform documents.
3. **Every other document whose *read it when* line in the map matches the task.** The map owns when each document is read.

Skipping a document the task needs is a defect, as reading the whole set is.

## 3. Git lifecycle

`main` is always working. Work happens on short-lived branches cut from the latest `main`.

**Branch → Implement → Self-review and verify locally → Push → PR → CI and `CLEAN` → Report → Owner review → Merge → Delete branch**, as the [phases](#phases) describe.

### Formats

| Artifact | Format | Example |
|---|---|---|
| Branch | `<type>/<short-kebab>` · with an Issue: `<type>/<issue#>-<short-kebab>` | `feat/space-directory-filters`, `fix/42-checkout-timezone` |
| Commit | `<type>(<scope>): <description>` — imperative, lowercase, no period, ≤ 50 chars; the body explains *why* | `feat(attendance): add manual check-in` |
| PR title | same as the main commit | |

**Types:** `feat` · `fix` · `docs` · `refactor` · `test` · `style` · `chore`.
**Scopes:** the capability or area: a backend module or frontend feature ([backend conventions §7](../backend/conventions.md#7-modules), [frontend architecture §3](../frontend/architecture.md#3-capabilities-features)), or an area (`design-system`, `i18n`, `api`, `db`, `docs`, …).

### PR description

```
## Summary
## Scope / Acceptance criteria / Out of scope   (when there is no Issue)
## Change type
## Evidence — what was run (lint, typecheck, which test lanes) and what was NOT run
## Screenshots — for UI changes: RTL and LTR, light and dark, phone and desktop
## Definition of Done checklist
Closes #n   (only when an Issue exists)
```

### PR assignee and labels
- Every PR is assigned to the owner: `gh pr create --assignee @me`.
- Every PR carries **one type label** (`feat`, `fix`, `chore`, `docs`, `refactor`, `test`) and **one or more area labels** (`area:web`, `area:api`, `area:design-system`, `area:docs`, `area:ci`).
- A label that does not exist yet is created with `gh label create`, with a short description and a sensible colour.

### Commits
- **One commit = one complete, working unit of change** that can be described in one sentence (for example, "add the icon wrapper with RTL mirroring").
- A unit's code, its tests and the documents that describe it go in the **same** commit. Not one commit per file or per layer (no separate "add tests" or "add docs" commit for the same unit), and not one commit for the whole branch. A typical Work Item has 3–6 commits.
- Lint and typecheck run on each commit; the lanes run once, on the head ([phase 4](#phases)).
- Stage **by path**; never `git add -A` or `git add .`. Run `git status` before each commit.
- **Review fixes** on an unmerged PR fold into the commits they correct (fixup and autosquash), never into fix commits, and are reported in ONE "Review fixes" comment, with no replies in threads.
- **No tool attribution** in any commit, PR, Issue or document.

## 4. Scope control

- Touch only the files the Work Item requires.
- No drive-by refactoring or reformatting.
- Unrelated problems found along the way are **recorded** in [findings](../architecture/findings.md), not fixed.
- **Related findings.** At the start of a Work Item, read the open findings' titles and their *Resolves when* lines, not the whole file, and open in full only those that touch the item. The plan lists them under *Related findings*: for each, whether to fold it into this item, why, and its cost. The owner decides; a folded finding is resolved in the same PR, with its status changed and a resolution line.
- Anything on the *Not in v1* list in [overview.md](../project/overview.md) is out of scope, always.

## 5. Definition of Done and Accepted

**Done** (the author's bar, AI or human):
- [ ] Acceptance criteria met, scope kept.
- [ ] Lint and typecheck clean; build passes.
- [ ] Tests added in the **owning lane** ([testing.md](testing.md)) and passing.
- [ ] No hardcoded user-facing text; both catalogues (ar, en) updated.
- [ ] UI checked in RTL and LTR, light and dark, phone and desktop.
- [ ] Authorization enforced on the server for any protected action.
- [ ] Triggered documentation updated **in the same PR** (§7), including any **deferred document** whose trigger this PR meets.
- [ ] Each fact has one home: no duplication, links rather than copies, and nothing claimed that is not built ([documentation rules](../architecture/documentation.md)).
- [ ] Every claim in the PR description names the test or command that proves it ([testing §3](testing.md#3-rules-that-bind-every-test)).
- [ ] Atomic history, pushed, PR description complete.

**Accepted** = the owner reviewed and merged. An AI only ever reaches *Done*.

## 6. Decision authority

| AI alone | AI proposes, owner approves | Owner only |
|---|---|---|
| Implementing inside the agreed Work Item · commits · drafting the PR description · recording findings · analysis | The Work Item contract · architectural decisions · scope changes · new dependencies · changes to authoritative documents · schema changes | Merge · creating Issues · deleting branches · changing v1 scope |

**Default to escalating.** If you wonder whether it is architectural, it is.

## 7. Documentation update triggers

Update in the **same PR** as the code:

| Change | Update |
|---|---|
| An endpoint, payload or error code | [api-contract.md](../api/api-contract.md) |
| A model, relation or index | [data-model.md](../architecture/data-model.md) |
| A shared mechanism (session, i18n, errors, design system) | its owning document |
| A capability's behaviour, decisions or code map | its document in `docs/features/`, written with the capability's first stable core ([documentation rules §5](../architecture/documentation.md#5-capability-documents)) |
| A decision meeting the ADR threshold | a new ADR in [decisions/](../architecture/decisions/) |
| A feature becomes built | the *Built* section of [overview.md](../project/overview.md) |

Pure refactors that change no behaviour need no documentation update.

**Deferred documents.** Some documents are committed but not yet written because what they describe does not exist yet. Their triggers are listed in the [documentation map](../README.md#deferred-documents). A PR that meets a trigger writes that document; the PR is not *Done* without it. Remove the row from the map once the document exists.

**ADR threshold:** long-term impact, hard to reverse, affects several parts, and a real choice between alternatives; and no document naturally owns the decision ([documentation rules §7](../architecture/documentation.md#7-adrs)). Format: *Context · Decision · Alternatives · Consequences*. The project stays in a foundation phase, so an ADR may be revised in place with a `> **Revised:** <date> — <what>` line.

## 8. Stop rules

| You find | You do |
|---|---|
| An observation or divergence | Record a finding and continue |
| An architectural choice | Stop and propose |
| Separable work | Propose it as a new Work Item |
| Something blocking the contract | Stop and escalate |
| A behaviour no test lane can own | Stop and raise it |
| A failure whose cause you have not found | Find the root cause before changing code; after three failed fixes, stop and escalate |
| Anything unclear | Record, never absorb |

## 9. Parallel work

The owner may run two AI workers at the same time. These rules keep them from colliding. **Who works on what at a given moment is never recorded** in a document: it changes too often.

- **Two workers, one layer each:**
  - **worker A** works in the main folder and builds the web;
  - **worker B** works in one long-lived git worktree, `masaha-b`, and builds the API, with the schema, the migrations and the seed;
  - one Work Item is one fresh conversation, for either worker. Fixes and rebases for the same PR stay in its conversation; a new conversation is for a new Work Item.
- **A narrow licence in the other layer,** declared in the plan and approved. For A, for example, a field in a shared schema or a small fix in the API that the screen needs. For B, what breaks in the web when a shared type changes, and the catalogue entries of the error codes it adds ([localisation › Catalogues](../frontend/localisation.md#catalogues)). **A never writes a migration; B never builds a page.**
- **The contract is the API worker's.** `packages/shared` and the [API contract](../api/api-contract.md) are the contract between the two layers; a change the web needs there is declared in A's plan.
- **Two items in flight never work in the same layer.** The build map may change shape to keep it so ([v1-mvp › Ordering notes](../plans/v1-mvp.md#ordering-notes)).
- **Worker B's branches:** between items, its worktree is detached at `origin/main`. Each item cuts its own branch with `git switch --no-track -c <branch> origin/main`. `--no-track` means a plain `git push` can never target `main`. The first push is `git push -u origin <branch>`.
- **Files:**
  - every Work Item's prompt names the other worker's files;
  - a file both items need is declared in the plan first and edited minimally, and each side keeps to its own section.
- **Dependencies:** either worker may add one, declared in its plan (§6), but never both at once. A conflict in `package-lock.json` is never merged by hand: after the rebase, `npm install` regenerates it.
- **Databases:** the API test lane empties every table before each file ([setup › The API test lane](setup.md#the-api-test-lane)), so two workers never share a database. All live in the shared container ([setup › Database](setup.md#database)), and each folder points at its own through its `apps/api/.env`:
  - worker A uses `masaha_dev` and `masaha_test`;
  - worker B uses `masaha_b_dev` and `masaha_b_test`;
  - any other worktree whose item changes the schema gets databases of its own.
- **Merging:**
  - one PR is merged at a time;
  - a PR is rebased on `main` only when GitHub shows a conflict, which is resolved by keeping both sides;
  - a PR that is clean, and whose CI ran after `main`'s last change, is left ready for review.
- **After each merge, in the main folder:** `git pull`. After a schema change, also regenerate the Prisma client and apply the new migrations to `masaha_dev` ([setup › Database](setup.md#database)). Without this step, the dev database once fell seven migrations behind the code merged from worktrees.
- **After worker B's PR merges:** its worktree goes back to detached `origin/main`, and the owner deletes the merged local branch ([§6](#6-decision-authority)). If that merge, or any merge since, changed the schema, regenerate the Prisma client in the worktree and apply the migrations to `masaha_b_dev`.

### Conflicts

- **Early.** At each report, the worker checks its pushed head against every other open PR's head with `git merge-tree --write-tree` ([phase 6](#phases)), and the analyst reads the result. A conflict found then decides the merge order: the branch that merges second takes its rebase with its last push, not as a round of its own after it.
- **The fast path,** an exception to [phase 4](#phases). A conflict only in documents is resolved by a rebase that keeps both sides, `format:check` alone, and one push, with no lanes: CI runs them. Its target is ten minutes. A conflict in code adds lint and typecheck.
- **Apart by design.** Each layer appends to its own part of a capability document's *Decisions* and *History* ([documentation rules §5](../architecture/documentation.md#5-capability-documents)), and each prompt gives its worker its own range of finding numbers.

## 10. AI tooling

The owner works with AI assistants in Claude Code. Their plugins are tools, not dependencies of the
project: nothing in the repository needs them, and the rules they help apply are owned by the
documents ([testing §3](testing.md#3-rules-that-bind-every-test), [§5](#5-definition-of-done-and-accepted),
[§8](#8-stop-rules)).

- **Superpowers** is optional and local: it is enabled per folder in the untracked
  `.claude/settings.local.json`, never in the tracked `.claude/settings.json`.
- **Precedence:** a plugin's skills rank below the project's skills
  ([`.claude/skills/`](../../.claude/skills/)); the rest of the order is CLAUDE.md's
  [*Decision precedence*](../../CLAUDE.md#decision-precedence). A session with no prompt follows this
  section too.
- **Used:**
  - `test-driven-development`, with its `writing-good-tests.md`: how
    [testing §3](testing.md#3-rules-that-bind-every-test)'s rules 5–7 are met (seen failing, name the
    break, make the break), each test in its owning lane.
  - `systematic-debugging`: for any failure or flake, the root cause first (§8). Diagnostic logs are
    removed before a commit.
  - `verification-before-completion`: every claim names the test or command that proves it (§5).
  - `receiving-code-review`, adapted: each item of a fixes list is verified against the code, and
    pushed back with reasons when it is wrong. The fixes follow [§3, Commits](#commits).
  - `writing-plans`, in part, inside `start-work-item`'s plan mode: the file map, the interfaces
    between tasks, no placeholders, and a *Review Focus* list. Not its header, its saved plan files,
    full code in the plan, a commit per step, or its execution handoff.
- **Not used:**
  - `brainstorming`: the analysis round and the Work Item's prompt settle the decisions (§6).
  - `executing-plans` and `subagent-driven-development`: they decide conflicts and carry on, against
    §8, and exceed the prompts' subagent caps.
  - `dispatching-parallel-agents`: each prompt caps its subagents.
  - `requesting-code-review`: the review is an independent gate, never the author's own subagent.
  - `using-git-worktrees`: the folders are fixed (§9).
  - `finishing-a-development-branch`: merging and deleting branches are the owner's (§6);
    `open-pr` opens the pull request.
  - `writing-skills` and `diagnosing-superpowers`: only the owner invokes them.
- **Review sessions** use no plugin skill. They may read `writing-good-tests.md`'s mutation check as
  a lens on the tests.
