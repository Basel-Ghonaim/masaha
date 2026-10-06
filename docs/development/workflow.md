# Workflow

> **Status:** Active · **Last Updated:** 2026-10-06 · **Owner:** Basel Ghoneim
> **Authority:** How work is executed on Masaha: task classes, the Git lifecycle, scope control, the Definition of Done, decision authority, stop rules and the AI tooling. Code-design rules are owned by [engineering-principles.md](engineering-principles.md); where a behaviour is tested is owned by [testing.md](testing.md).

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

For a substantial item, agree the contract **before** implementing: agree → design → decompose → write the contract → implement.

## 3. Git lifecycle

`main` is always working. Work happens on short-lived branches cut from the latest `main`.

**Branch → Implement → Self-review → Push → PR → Owner review → Merge → Delete branch**

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
- Every commit builds and passes lint, typecheck and tests.
- Stage **by path**; never `git add -A` or `git add .`. Run `git status` before each commit.
- **Review fixes** on an unmerged PR fold into the commits they correct (fixup and autosquash), never into fix commits, and are reported in ONE "Review fixes" comment, with no replies in threads.
- **No tool attribution** in any commit, PR, Issue or document.

## 4. Scope control

- Touch only the files the Work Item requires.
- No drive-by refactoring or reformatting.
- Unrelated problems found along the way are **recorded** in [findings](../architecture/findings.md), not fixed.
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

- **Two workers:**
  - **worker A** works in the main folder and carries the critical path;
  - **worker B** works in one long-lived git worktree, `masaha-b`, and carries items that neither block nor wait for worker A;
  - one Work Item is one fresh conversation, for either worker. Fixes and rebases for the same PR stay in its conversation; a new conversation is for a new Work Item.
- **Worker B's branches:** between items, its worktree is detached at `origin/main`. Each item cuts its own branch with `git switch --no-track -c <branch> origin/main`. `--no-track` means a plain `git push` can never target `main`. The first push is `git push -u origin <branch>`.
- **Files:**
  - every Work Item's prompt names the other worker's files;
  - a file both items need is declared in the plan first and edited minimally, and each side keeps to its own section;
  - new dependencies on both sides at once are avoided, because `package-lock.json` would conflict.
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
