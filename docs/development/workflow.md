# Workflow

> **Status:** Active · **Last Updated:** 2026-09-26 · **Owner:** Basel Ghoneim
> **Authority:** How work is executed on Masaha: task classes, the Git lifecycle, scope control, the Definition of Done, decision authority and stop rules. Code-design rules are owned by [engineering-principles.md](engineering-principles.md); where a behaviour is tested is owned by [testing.md](testing.md).

Masaha is built by **one developer (the owner)** with AI assistants. The workflow keeps the discipline of a team process — reviewable units, a clean history, gated decisions — without ceremony a solo project does not need.

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
**Scopes:** the capability or area (`auth`, `spaces`, `members`, `attendance`, `occupancy`, `design-system`, `i18n`, `api`, `db`, …).

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

### Commit habits
- Commit at each coherent checkpoint as you go.
- Stage **by path**; never `git add -A` or `git add .`. Run `git status` before each commit.
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
| A decision meeting the ADR threshold | a new ADR in [decisions/](../architecture/decisions/) |
| A feature becomes built | the *Built* section of [overview.md](../project/overview.md) |

Pure refactors that change no behaviour need no documentation update.

**Deferred documents.** Some documents are committed but not yet written because what they describe does not exist yet. Their triggers are listed in the [documentation map](../README.md#deferred-documents). A PR that meets a trigger writes that document; the PR is not *Done* without it. Remove the row from the map once the document exists.

**ADR threshold:** long-term impact, hard to reverse, affects several parts, and a real choice between alternatives. Format: *Context · Decision · Alternatives · Consequences*. The project stays in a foundation phase, so an ADR may be revised in place with a `> **Revised:** <date> — <what>` line.

## 8. Stop rules

| You find | You do |
|---|---|
| An observation or divergence | Record a finding and continue |
| An architectural choice | Stop and propose |
| Separable work | Propose it as a new Work Item |
| Something blocking the contract | Stop and escalate |
| A behaviour no test lane can own | Stop and raise it |
| Anything unclear | Record, never absorb |
