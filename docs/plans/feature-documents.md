# Plan — Feature documents

> **Status:** Active · **Class:** Plan — it orders work and holds that work's rationale; it describes nothing as built · **Last Updated:** 2026-10-06 · **Owner:** Basel Ghoneim
> **Authority:** The effort that gives Masaha one document per capability under `docs/features/` and leaves every fact with one home: the owner's decisions and their reasons, the capability map, the duplication ledger, the decisions to record, the execution steps and their checks, the review gate. The lasting documentation rules will be owned by `architecture/documentation.md`, which the effort writes; *how* work runs is owned by [workflow.md](../development/workflow.md). This plan only orders the work.

## 1. Context, goal and non-goals

**Context.** Five capabilities have merged, reviewed slices (§3). What each one does, why, and where its code sits is spread across the platform documents: [frontend architecture](../frontend/architecture.md), [security](../backend/security.md), the [backend conventions](../backend/conventions.md), the [shared package](../architecture/shared-package.md), the [overview](../project/overview.md)'s *Built* list and the status lines in the documents' headers. The same fact often lives in two or three of them, and a worker changing one capability has to read most of the set to find it.

**Goal.** A worker changing a capability reads **one document first**, its capability's, and then only the sections it links. Every fact has **one home**: a mechanism in its platform document, a capability's application of it in that capability's document.

**Finished when** the exit criteria (§9) hold.

**Non-goals.**
- No code changes, and no change to what any rule says: facts move or are deleted as duplicates, never reworded into new rules.
- Records are not rewritten: the plans in this folder, [findings](../architecture/findings.md) and the [ADRs](../architecture/decisions/) keep their text; only a link whose target moves is repointed (decision 9).
- No document for `sessions`, `platform-settings`, `space-settings`, the page groups or the dashboard shell (decision 2).
- Not adopted: live status in an issue tracker, a version number per document, "constitutional documents", an onboarding document for agents (decision 6).

## 2. The decisions

The owner decided these before this plan (2026-10-06). The strategy document will own the lasting rules; this section records why, so the execution can be judged against it.

1. **The ownership boundary is one question: "Is this a shared mechanism, or a capability-specific application of one?"** A mechanism stays in its platform document. An application belongs to its capability's document, which links the mechanism and never restates it.
   *Why:* without one test, a fact such as how Google sign-in links an existing account can sit equally well in security, the conventions, the frontend architecture or the capability, and today it sits in several. One question gives every fact one answer, and keeps the set from being organised both by layer and by capability.
2. **Five capabilities are documented now:** `auth` (email sign-in, registration, Google, forgot and reset password, the recovery session's flow), `users` (the account, the forced password change, the account menu, sign-out), `space-links` (my spaces, the switcher, the admin's composed spaces list, the links loader), `lookups` (the admin's lookups screen, the public catalogue) and `spaces` (the admin's create, list, edit, hide, delete and restore; no web section yet). **Not documented:** `sessions`, a platform mechanism ([architecture §4](../frontend/architecture.md#4-session-and-preferences), [security.md](../backend/security.md)); `platform-settings` and `space-settings`, mentioned where `spaces` uses them, their documents arriving with their screens; the page groups and the dashboard shell, which are composition ([architecture §2](../frontend/architecture.md#2-page-groups)).
   *Why:* each of the five has a merged, reviewed slice with settled decisions (decision 5). The session is used by every capability and owned by none. The two settings modules have no screen, so a document would describe almost nothing. The shells compose capabilities rather than being one.
3. **One document per capability, across the API module, `packages/shared` and the web feature, named after the backend module** (`lookups.md`, `space-links.md`). A web feature serving two audiences over one module is a section of that module's document.
   *Why:* the module is the backend's unit of ownership ([ADR 0012](../architecture/decisions/0012-modular-monolith-backend.md)), and the same name already runs through the shared package ([shared-package.md › Structure](../architecture/shared-package.md#structure)) and the web's capabilities ([architecture §3](../frontend/architecture.md#3-capabilities-features)). A change to a capability usually crosses all three layers, so a document per layer would bring back the split this effort removes.
4. **One template:** a header (status, class, authority, scope, last updated, owner); what it does; who uses it; the responsibility boundary; how it composes the platform (links only); behaviour and flows; **decisions**, each with its reason, date and PR; a code map of **folders and entry points only**, never a file list; open findings (links); history (PRs). **A section appears only when its code exists.** At most about **1,200 words** a document.
   *Why:* one shape tells a reader where to look in any of them. A file list goes stale with every PR, so the map stops at folders and entry points. The word limit keeps the document short enough to be read whole, which is the point of reading it first.
5. **The stable-core rule.** A capability's document is created in the PR in which the capability first has a stable core, its first merged, reviewed slice with settled decisions. Every later PR that changes its behaviour, decisions or code map updates it in the same PR, adding a section when a new layer arrives.
   *Why:* a document written before the decisions settle is speculation, and one written long after is archaeology. Tying it to the same PR is the rule [workflow §7](../development/workflow.md#7-documentation-update-triggers) already applies to every other document.
6. **The rules live in one new short document, `architecture/documentation.md`** (about 1,500 words at most), which the map points to. It holds: the boundary question; a *single owner per kind of fact* table (fact → owner → linked by); a *what each category owns and must not contain* table; the document **classes** (Contract, Description, Record, Plan, Commitment), briefly, with the rule that a declared class must be true; "a section appears only when its code exists"; rules and intent, not inventories; the ADR rule's new clause, **no ADR when a document naturally owns the decision**; link integrity (a move updates every link in the same PR); and one entry point (the map guides, it never enumerates files). **Not adopted:** live status in an issue tracker, a version number per document, constitutional documents, an onboarding document for agents.
   *Why:* today the rules are four bullets at the top of the [map](../README.md#rules-for-this-set), and the rest are implied by practice. A worker deciding where a fact goes needs them written once and short. The ideas come from an earlier project of the owner's; the four left out serve a team and a tracker that Masaha does not have.
7. **ADR 0018** records the governance decision: a capability layer that owns capability-specific applications. Short, decision-level, no file names.
   *Why:* it moves the home of every capability decision and changes the ADR rule, which is long-term, affects every document, and was a real choice against keeping capability facts in the platform documents ([workflow §7, ADR threshold](../development/workflow.md#7-documentation-update-triggers)).
8. **Security stays whole.** Every rule whose reason is security stays in [security.md](../backend/security.md). A capability's document owns its flow, its experience and its other decisions, and links security.md.
   *Why:* a security review reads one document. Spreading the rules by capability would hide how they fit together, and the threat model is the platform's, not a capability's.
9. **Records are exempt from moves.** Plans, [findings.md](../architecture/findings.md) and the ADRs record what happened or was decided at a date. Capability documents link them; they are not rewritten, and only a link whose target moves is repointed.
   *Why:* rewriting a record changes history. A record that repeats a fact repeats it as of its date, which is not a second home.
10. **The long *Built:* status lines** in the headers of the contract documents (for example [frontend architecture](../frontend/architecture.md)) are cut to the platform. What a capability built is its document's.
    *Why:* each line grows with every PR, repeats the overview's *Built* list, and makes a rule document carry a changelog.
11. **Links are checked by hand** in this effort, and a finding records the need for a link checker.
    *Why:* a checker is a new dependency and a CI change, a separate decision ([workflow §6](../development/workflow.md#6-decision-authority)); this effort must not wait for it.
12. **One file per finding is deferred.** A finding records it; [findings.md](../architecture/findings.md) is the largest document in the set.
    *Why:* splitting it is a move of a record with many inbound links, separable from this effort ([workflow §8](../development/workflow.md#8-stop-rules)).
13. **The triggers.** [Workflow §7](../development/workflow.md#7-documentation-update-triggers) gains the capability-document row (decision 5). The [Definition of Done](../development/workflow.md#5-definition-of-done-and-accepted) gains one documentation check: a single home, no duplication, links rather than copies, nothing claimed that is not built. The `start-work-item` skill reads the capability's document first. CLAUDE.md's list of authoritative documents gains the strategy and `docs/features/`.
    *Why:* a rule no trigger enforces decays within a few PRs; these four are the places every Work Item already passes through.

## 3. The capability map

At `main` 5a17db5. Folders and entry points only; each capability's document will own its own map.

| Capability | API module (its routers) | `packages/shared` | Web feature (mounted by) | PRs |
|---|---|---|---|---|
| `auth` | `apps/api/src/modules/auth/`, `index.ts`; the email and Google ports inside it (router at `/auth`). It uses `users`, `sessions` and `space-links` | `src/auth/` | `apps/web/src/features/auth/`, `index.ts` (`pages/site/auth/`, in the focus shell) | #25, #31, #35, #38, #40, #42, #45 |
| `users` | `apps/api/src/modules/users/`, `index.ts` (the `me` router at `/me`). Google account resolution lives here; `auth` calls it | `src/users/` | `apps/web/src/features/users/`, `index.ts` (the site shell, the dashboard's top bar, the change-password page) | #25, #31, #34, #35, #38, #39, #42, #45 |
| `space-links` | `apps/api/src/modules/space-links/`, `index.ts`; `admin-spaces/` (the `me` router at `/manage/spaces`, an admin router inside `/admin`, the links loader on `/admin/spaces/:spaceId`) | `src/space-links/` | `apps/web/src/features/space-links/`, `index.ts` (the dashboard shell); dashboard-only | #25, #34, #36, #39, #44 |
| `lookups` | `apps/api/src/modules/lookups/`, `index.ts` (public at `/lookups`, an admin router inside `/admin`) | `src/lookups/` | `apps/web/src/features/lookups/`, `index.ts` (`pages/dashboard/admin/`); only the admin's audience is built | #27, #34, #36, #41, #43, #44, #45 |
| `spaces` | `apps/api/src/modules/spaces/`, `index.ts` (an admin router inside `/admin`). It uses `lookups`, `platform-settings` and `space-settings` | `src/spaces/` | none yet | #36, #44 |

Not documented (decision 2): `sessions`, `platform-settings` and `space-settings` (API modules with no router), the `shared/*` platform of the web, and the page groups.

## 4. The duplication ledger

**How to read it.** Each row is one fact that today has two homes, or is a capability's application living in a platform document. *Lives now* links the section. **Kind:** **M** is a mechanism, **A** a capability's application, **D** a plain duplicate. *Fate* names the one home the fact ends in; `f/<cap>` is `features/<cap>.md` and its template section. *Left behind* is what stays in the old place.

Every section of the documents below was read. A section without rows states its facts once, and they stay. The rows are as of `main` 5a17db5; the execution re-reads each row's section before moving it (§6).

### The effect

| Document | Words now | Leave (estimate) | Rows |
|---|---|---|---|
| [frontend/architecture.md](../frontend/architecture.md) | 6,127 | ~750 | 24 |
| [backend/conventions.md](../backend/conventions.md) | 5,086 | ~550 | 9 |
| [backend/security.md](../backend/security.md) | 3,098 | ~400 | 12 |
| [api/api-contract.md](../api/api-contract.md) | 3,939 | ~240 | 9 |
| [architecture/data-model.md](../architecture/data-model.md) | 3,873 | ~85 | 6 |
| [project/overview.md](../project/overview.md) | 915 | ~90 (and ~50 of links added) | 1 |
| [frontend/design-system/foundation.md](../frontend/design-system/foundation.md) | 6,624 | ~90 | 2 |
| [frontend/localisation.md](../frontend/localisation.md) | 1,277 | ~40 | 2 |
| [architecture/system-overview.md](../architecture/system-overview.md) | 833 | ~40 | 2 |
| [development/setup.md](../development/setup.md) · [glossary.md](../project/glossary.md) | 2,317 · 782 | ~40 · ~8 | 1 · 1 |
| [architecture/shared-package.md](../architecture/shared-package.md) | 521 | 0 | 0 |
| **Total** | | **~2,300** | **69** |

The five capability documents take what leaves, at most 1,200 words each. The rest is deleted as a duplicate: the other home already holds it.

### frontend/architecture.md (24)

| # | Fact | Lives now | Kind | Fate | Left behind |
|---|---|---|---|---|---|
| FA-1 | The header's *Built* lists capability builds: auth, users, their pages, the switcher, the lookups screen | header | A | each `f/<cap>` › History (decision 10) | platform items only |
| FA-2 | The focus shell's built pages are listed under the tree | [The layout tree](../frontend/architecture.md#the-layout-tree) | D | delete (FA-3 and the header hold it) | layout names |
| FA-3 | "Built so far": the auth pages and the admin's lookups page | [The two groups](../frontend/architecture.md#the-two-groups) | A | `f/auth`, `f/users`, `f/lookups` › Code map | platform part |
| FA-4 | `rememberSpace` stated twice | [The two groups](../frontend/architecture.md#the-two-groups) | D | merge into [Landing and guards](../frontend/architecture.md#landing-and-guards) | — |
| FA-5 | The theme toggle sets the opposite of the theme shown | [The two groups](../frontend/architecture.md#the-two-groups) | D | merge into [§4](../frontend/architecture.md#4-session-and-preferences) | link |
| FA-6 | The switcher only navigates; the selected space is `:spaceId` | [The two groups](../frontend/architecture.md#the-two-groups) | M+A | rule stays; the switcher's clause → `f/space-links` › Responsibility boundary | rule |
| FA-7 | The failed guards restated in prose after the guard table | [Landing and guards](../frontend/architecture.md#landing-and-guards) | D | delete; the table stays | — |
| FA-8 | The forced change: "the server refuses every other endpoint" | [Landing and guards](../frontend/architecture.md#landing-and-guards) | D | security's [Passwords](../backend/security.md#passwords); the gate stays here (Q1) | link |
| FA-9 | A reset link carries its token in the fragment | [Landing and guards](../frontend/architecture.md#landing-and-guards) | D | security's [Passwords](../backend/security.md#passwords); "no guard on `/reset-password`" stays | link |
| FA-10 | Built: the switcher in `features/space-links`, placed in the sidebar's header | [Landing and guards](../frontend/architecture.md#landing-and-guards) | A | `f/space-links` › Code map, History | placement only |
| FA-11 | The switcher's behaviour: name and area, opens with more than one link, skeleton, retry | [Landing and guards](../frontend/architecture.md#landing-and-guards) | A | `f/space-links` › Behaviour and flows | link |
| FA-12 | The capability table's per-capability descriptions | [§3](../frontend/architecture.md#3-capabilities-features) | A | each `f/<cap>` › What it does | name, audience, link |
| FA-13 | The data layer is `AuthRepository { login, register, google }` (it omits the recovery repository) | [Capability layout](../frontend/architecture.md#capability-layout) | A | `f/auth` › Code map | the generic rule (Q4) |
| FA-14 | Which hooks call `establishSession`, and which toasts each fires | [React Query in a feature](../frontend/architecture.md#react-query-in-a-feature) | A | `f/auth`, `f/users` › How it composes | the rule, one example (Q4) |
| FA-15 | A sign-in clears no cache | [React Query in a feature](../frontend/architecture.md#react-query-in-a-feature) | D | merge into [§4](../frontend/architecture.md#4-session-and-preferences) | — |
| FA-16 | Tests layer by layer | [React Query in a feature](../frontend/architecture.md#react-query-in-a-feature) | D | testing's [A feature, layer by layer](../development/testing.md#a-feature-layer-by-layer) | link |
| FA-17 | The recovery's position is held by TanStack Query, never in storage | [Where state lives](../frontend/architecture.md#where-state-lives) | A | `f/auth` › Behaviour and flows | the rule |
| FA-18 | The export lists of auth, users and lookups (space-links missing) | [What a feature exports](../frontend/architecture.md#what-a-feature-exports) | A | each `f/<cap>` › Code map | the rule |
| FA-19 | Google's button only with `VITE_GOOGLE_CLIENT_ID` | [What a feature exports](../frontend/architecture.md#what-a-feature-exports) | A | `f/auth` › Behaviour and flows (setup keeps the variable) | — |
| FA-20 | Register sends the interface language | [Forms](../frontend/architecture.md#forms) | A | `f/auth` › How it composes | — |
| FA-21 | Sign-in, register and Google belong to `features/auth` and call `establishSession` | [§4](../frontend/architecture.md#4-session-and-preferences) | D | delete (FA-14) | — |
| FA-22 | `features/users` records who started the password change | [§4](../frontend/architecture.md#4-session-and-preferences) | A | `f/users` › Behaviour and flows | `passwordChanged` stays |
| FA-23 | "`features/auth`: sign-in, register, password forms and their error wording" (stale) | [§4](../frontend/architecture.md#4-session-and-preferences) | A | delete; `f/auth` › What it does | — |
| FA-24 | The admin's lookups as the `['admin', …]` example | [§7](../frontend/architecture.md#7-server-state) | M | stays as the example (Q4); detail → `f/lookups` | — |

Single home, no rows: §1, the route map, the lazy loading and status states, the guard table, the landing order and the last space, the dashboard-only rule, §5, §6 and §7's mechanism.

### backend/security.md (12)

The rules whose reason is security stay (decision 8). These include the token, link, recovery-cookie and binding rules, the identical answer, the limits, the email caps, the Google linking rule, `EMAIL_TAKEN` and the password policy.

| # | Fact | Lives now | Kind | Fate | Left behind |
|---|---|---|---|---|---|
| SE-1 | The header's *Built*: sign-in methods, reset, change, the links loader | header | A | `f/auth`, `f/users`, `f/space-links` › History | platform items |
| SE-2 | Registration asks a name, an email and a password | [Sign-in methods](../backend/security.md#sign-in-methods) | A | `f/auth` › What it does | — |
| SE-3 | The web says the linked account's password was removed | [Sign-in methods](../backend/security.md#sign-in-methods) | A | `f/auth` › Behaviour and flows | — |
| SE-4 | Two racing first Google sign-ins make one account | [Sign-in methods](../backend/security.md#sign-in-methods) | A | `f/auth` › Decisions (#31) | — |
| SE-5 | A new account takes Google's name, else the email's local part | [Sign-in methods](../backend/security.md#sign-in-methods) | A | `f/auth` › Behaviour and flows | — |
| SE-6 | No `GOOGLE_CLIENT_ID`: 503, and production refuses to start | [Sign-in methods](../backend/security.md#sign-in-methods) | A | `f/auth` › Behaviour and flows; setup keeps how to set it | — |
| SE-7 | The reset email is the only email Masaha sends | [Passwords](../backend/security.md#passwords) | D | overview's [Not in v1](../project/overview.md#not-in-v1) | — |
| SE-8 | The recovery's steps and what its answer carries | [Passwords](../backend/security.md#passwords) | A | `f/auth` › Behaviour and flows | the identical answer |
| SE-9 | Why a link binds on another device, and why the page names the account | [Passwords](../backend/security.md#passwords) | A | `f/auth` › Decisions | the binding rule |
| SE-10 | One Gmail sender, `nodemailer`, the reasoning about domains | [Passwords](../backend/security.md#passwords) | A | `f/auth` › Decisions | log mode refused, caps |
| SE-11 | The email is bilingual, and its words live in `auth` | [Passwords](../backend/security.md#passwords) | A | `f/auth` › Behaviour and flows | no greeting by name |
| SE-12 | "The space-management slice settles which uploads"; a note on F-5a | [HTTP hardening](../backend/security.md#http-hardening) | D | the [foundation plan, A-3](foundation.md#a-3--cross-cutting-decisions--docscross-cutting) and Git | the rule |

Single home, no rows: [Tokens and cookies](../backend/security.md#tokens-and-cookies), [Authorization](../backend/security.md#authorization) (but see Q2), [Rate limits](../backend/security.md#rate-limits-fixed-window).

### backend/conventions.md (9)

| # | Fact | Lives now | Kind | Fate | Left behind |
|---|---|---|---|---|---|
| CO-1 | The header's *Built*: each module's contents | header | A | each `f/<cap>` › History | platform items, `sessions`, the two settings modules |
| CO-2 | The audit list by capability | [§6](../backend/conventions.md#6-audit) | A | Q3 | — |
| CO-3 | The modules table's *Holds* column | [The modules](../backend/conventions.md#the-modules) | M | stays as a one-phrase index | a link to each `f/<cap>` |
| CO-4 | How `spaces` copies the defaults when it creates a space | [New-space defaults](../backend/conventions.md#new-space-defaults) | A | `f/spaces` › How it composes; the invariant stays in [data-model](../architecture/data-model.md#checked-by-the-service) | the platform half |
| CO-5 | The fields of `space-settings` | [`space-settings`](../backend/conventions.md#space-settings) | D | the schema, via [data-model › Spaces](../architecture/data-model.md#spaces) | link |
| CO-6 | How the admin's spaces list is composed (verified ids first) | [Composed reads](../backend/conventions.md#composed-reads) | A | `f/space-links` › How it composes | the placement line |
| CO-7 | "Verified" on the write side | [Composed reads](../backend/conventions.md#composed-reads) | A | Q2 | "`spaces` never imports `space-links`" |
| CO-8 | The email port's Gmail detail | [§12](../backend/conventions.md#12-environments) | D | `f/auth` › Decisions (SE-10) | the port row |
| CO-9 | bcrypt outside transactions; the compare-and-set | [Concurrency](../backend/conventions.md#concurrency) | D | security's [Passwords](../backend/security.md#passwords) | the session lock |

### api/api-contract.md (9)

The contract keeps every endpoint, payload, status and code; §6 matches the code. Only prose that is not contract leaves.

| # | Fact | Lives now | Kind | Fate | Left behind |
|---|---|---|---|---|---|
| AC-1 | Why lookups are not paginated ("tens of rows, shown grouped") | [§4](../api/api-contract.md#4-pagination) | A | `f/lookups` › Decisions | the exception |
| AC-2 | The Google linking narrative | [Session](../api/api-contract.md#session) | D | security's [Sign-in methods](../backend/security.md#sign-in-methods) | the outcome, `linked` |
| AC-3 | The recovery's narrative: a request opens it, the cookie finds it | [The forgotten password](../api/api-contract.md#the-forgotten-password) | A | `f/auth` › Behaviour and flows | link |
| AC-4 | The position's numbers: 60 seconds, 3 resends, one hour | [The forgotten password](../api/api-contract.md#the-forgotten-password) | D | security's [Passwords](../backend/security.md#passwords) | the fields |
| AC-5 | "A link opened on another device" | [The forgotten password](../api/api-contract.md#the-forgotten-password) | D | `f/auth` › Decisions (SE-9) | — |
| AC-6 | The sign-in and password-change limits (10, 50) and the change's narrative | [Session](../api/api-contract.md#session), [Me](../api/api-contract.md#me) | D | security's [Rate limits](../backend/security.md#rate-limits-fixed-window), [Passwords](../backend/security.md#passwords) | the 429 status |
| AC-7 | Why a hidden space stays in my spaces | [Managed spaces](../api/api-contract.md#managed-spaces) | A | `f/space-links` › Decisions | the behaviour |
| AC-8 | Why the admin edits only an unverified space | [Spaces (the admin)](../api/api-contract.md#spaces-the-admin) | A | Q2 | the 403 |
| AC-9 | The create copies the defaults; nothing is written if they cannot be read | [Spaces (the admin)](../api/api-contract.md#spaces-the-admin) | A | `f/spaces` › Behaviour and flows | link |

### architecture/data-model.md (6)

The data model keeps every entity, relation, derived value and constraint. Only reasons owned elsewhere, and its own repeats, leave.

| # | Fact | Lives now | Kind | Fate | Left behind |
|---|---|---|---|---|---|
| DM-1 | `RefreshToken`'s family, explained | [Users and sessions](../architecture/data-model.md#users-and-sessions) | D | security's [Tokens and cookies](../backend/security.md#tokens-and-cookies) | the entity |
| DM-2 | Why `PasswordRecovery` names the account only if it may sign in | [Users and sessions](../architecture/data-model.md#users-and-sessions) | D | security's [Passwords](../backend/security.md#passwords) | what it stores |
| DM-3 | A `RateLimit` key's digest is not anonymous | [Users and sessions](../architecture/data-model.md#users-and-sessions) | D | security's [Rate limits](../backend/security.md#rate-limits-fixed-window) | — |
| DM-4 | Why a Google-only user has no password | [Users and sessions](../architecture/data-model.md#users-and-sessions) | D | security's [Sign-in methods](../backend/security.md#sign-in-methods) | the fact |
| DM-5 | Why Internet and stable power are not filters | [Lookups](../architecture/data-model.md#lookups) | A | `f/lookups` › Decisions | the flag |
| DM-6 | "An active OWNER link makes a space verified", stated twice | [Spaces](../architecture/data-model.md#spaces) | D | [Derived values](../architecture/data-model.md#derived-values-computed-not-stored) | — |

### The other documents (9)

| # | Fact | Lives now | Kind | Fate | Left behind |
|---|---|---|---|---|---|
| OV-1 | *Built* lists authentication only, in a paragraph | overview's [Built](../project/overview.md#built) | A | Q5 | — |
| LO-1 | "The account's language wins once the session restores" (false) | localisation's [Languages and resolution](../frontend/localisation.md#languages-and-resolution) | D | architecture's [§4](../frontend/architecture.md#4-session-and-preferences), which is right | link |
| LO-2 | The space name's language rule | localisation's [Content in two languages](../frontend/localisation.md#content-in-two-languages) | D | data-model's [Conventions](../architecture/data-model.md#conventions) | the display marking |
| SO-1 | The refresh's server steps (auth, sessions, users, space-links' links) | system-overview's [§2](../architecture/system-overview.md#2-one-request-end-to-end-restoring-the-session) | A | `f/auth`, `f/space-links` | the trace line, with links (an overview by class) |
| SO-2 | The restore's outcomes | system-overview's [§2](../architecture/system-overview.md#2-one-request-end-to-end-restoring-the-session) | D | architecture's [§4](../frontend/architecture.md#4-session-and-preferences) | link |
| DS-1 | The shells' contents (account menu, switcher) | foundation's [§9](../frontend/design-system/foundation.md#9-responsive-layout) | D | architecture's [The two groups](../frontend/architecture.md#the-two-groups) | the layout forms |
| DS-2 | The persisted preference keys | foundation's [§6](../frontend/design-system/foundation.md#6-theming) | D | localisation's [Before first paint](../frontend/localisation.md#before-first-paint) | link |
| ST-1 | The seed's values, the `/health` shape | setup's [The seed](../development/setup.md#the-seed), [The API](../development/setup.md#the-api) | D | data-model's [Operations](../architecture/data-model.md#operations), the [API contract](../api/api-contract.md#1-conventions) | what is seeded |
| GL-1 | The stale thresholds, 30 and 60 days | [glossary](../project/glossary.md) | D | data-model's [Operations](../architecture/data-model.md#operations) | the term |

No restatement of an endpoint shape or an entity's fields was found outside the contract and the data model beyond the rows above. [Shared-package](../architecture/shared-package.md), [testing](../development/testing.md) and [engineering-principles](../development/engineering-principles.md) state their facts once.

### Claims the code contradicts

The inventories found these. Each is corrected in the step that touches its section, or recorded as a finding (Q7):

1. Localisation says the account's language wins on a restore; only a sign-in sets it (`apps/web/src/app/session.ts`) — LO-1.
2. Architecture §4 describes `features/auth` as sign-in, register and password forms — FA-23.
3. The layout tree nests the dashboard's layouts under a `DashboardLayout` route. In the code, `AdminLayout` and `SpaceLayout` each render it (`apps/web/src/pages/dashboard/routes.tsx`).
4. *What a feature exports* omits `space-links`, and *Capability layout* omits the recovery repository — FA-13, FA-18.
5. Architecture §5 says no error state is built. The status states and the form failure show the request id.
6. The route table omits `/change-password`.
7. Conventions §6 omits `space.restored`, and links temporary passwords to the wrong section of security.
8. Security says `/me` is exempt from the pending change, but `/me` does not exist. The public routes never check the claim.
9. Data-model and conventions name the contact settings as keys of the typed catalogue. The catalogue (`apps/api/src/modules/platform-settings/`) holds only `newSpaceDefaults` and the two thresholds; the seed writes the contact keys outside it.
10. Overview's *Built* lists only authentication (OV-1).
11. Engineering-principles' naming example is `SpaceDto`, which the shared package's R7 forbids.
12. Conventions §10 says the space joins the log fields with the first space route. The space routes exist, and the log carries only the user and role.
13. Setup says real spaces are entered through the admin's screens. Only the API exists.
14. Conventions §2 says no parameter exists only for tests. The users service takes a `passwords` parameter that only its unit test passes (near [finding 31](../architecture/findings.md#31-the-backend-documents-still-call-for-injecting-a-repository-only-tests-pass)).
15. Conventions §9's composed read omits that a governorate filter is resolved to areas first, by `lookups` (CO-6).

## 5. The decisions index

The decisions each capability document records, from the merged PRs' descriptions and reviews. A source marked † is the Work Item's prompt or plan reply (outside the repository), confirmed by the PR and the code cited.

**Status at `main` 5a17db5:**
- **true:** the code cited holds it;
- **changed:** what replaced it is recorded, never the old form;
- **obsolete:** not recorded.

The execution re-checks every status at its own `main`.

Decisions already owned by another document stay there; the capability document links them. These are:
- security's: AU1, AU3–AU5 and US1–US2;
- the API contract's payload facts.

### `auth`

| # | Decision | Reason | PR | Status at `main` |
|---|---|---|---|---|
| AU1 | Google links an account automatically only for a Gmail address or a matching `hd`; otherwise `GOOGLE_LINK_NOT_ALLOWED`. Linking removes the password and ends the sessions | only that provider proves the inbox | #25 | true, `modules/users/users.service.ts`; stays in [security](../backend/security.md#sign-in-methods) |
| AU2 | Two racing first Google sign-ins make one account | a CI race answered 401 | #31 | true, `users.service.ts` (Google resolution) |
| AU3 | Registrations counted per address before hashing; failed Google sign-ins under their own limit | hashing is costly; junk tokens must not lock out | #25 | true, `modules/auth/auth.limits.ts`; stays in security |
| AU4 | The reset email greets no one by name, against the design | registration proves no inbox | #25 | true, `modules/auth/email/`; stays in security |
| AU5 | Email caps per inbox, per requester (checked first) and a global ceiling | a refused requester never spends the ceiling | #25 | true, `auth/email/cappedEmailSender.ts`; stays in security |
| AU6 | The recovery is a session the server holds, behind an `HttpOnly` cookie; its row lives in `sessions` | the browser holds no credential; a reload keeps the step | #38† | true, `modules/sessions/recoveryCookie.ts`; the decision is [ADR 0017](../architecture/decisions/0017-recovery-session.md) (a record, linked) |
| AU7 | Asking for a link answers the same for every address | it reveals no account | #38† | true, `modules/auth/auth.service.ts`; ADR 0017 |
| AU8 | Another link is asked for without an email, a bounded number of times | — | #38† | true, `sessions/sessions.service.ts`; numbers in security |
| AU9 | The reset refuses a token in its body | the browser never holds the link | #38† | true, `packages/shared/src/auth/requests.ts` |
| AU10 | Checking a link in a browser with no recovery opens one there | most open the email on another device | #38† | true per the contract; re-checked in the auth step |
| AU11 | A reset ends every session and every bound recovery; an unbound one stays | the reset reveals nothing about the address | #38† | per security; re-checked in the auth step |
| AU12 | The recovery pages read their step from the server; nothing in storage; a failed read offers a retry | a reload or another tab keeps the step | #40† | true, `features/auth/hooks/queryKeys.ts` |
| AU13 | `/forgot-password` for guests; `/reset-password` unguarded and exempt from the change gate | the token must never enter `next` | #40 | true, `pages/site/routes.tsx`, `shared/routing/guards/PasswordChangeGate.tsx` |
| AU14 | Only the check holds the reset token, in memory, dropped on any answer | no copy after a verdict | #40 | true, `hooks/reset-password/useCheckResetLink.ts` |
| AU15 | After a reset, this browser's session is refreshed once: a 401 ends it | the reset may have been another account's | #40 | true, `hooks/reset-password/useResetPassword.ts` |
| AU16 | The resend countdown is an m:ss clock | no plural mechanism needed | #40 | true; the clock is a `shared/forms` service |
| AU17 | `RequireGuest` alone lands the user after sign-in, register and Google; the hooks take no callback | the landing had two owners | #35 | true, `hooks/sign-in/useSignIn.ts`, `guards/RequireGuest.tsx` |
| AU18 | Sign-in and register hold the session in the mutation's own callback | the page may be gone before the answer | #35 | true, `useSignIn.ts` |
| AU19 | Google's official button and script, only on sign-in and register, in the interface's language, redrawn on theme, language or width | Google ignores the button's locale | #42 | true, `features/auth/services/googleIdentity.ts` |
| AU20 | No Google client id: no button, no divider, no script | — | #42 | true, `hooks/google-sign-in/useGoogleButton.ts` |
| AU21 | Google's failures in their own area above the button; closing its window shows nothing | both failure areas alike | #42† | re-checked in the auth step |
| AU22 | A "linked" toast and a welcome toast, each fired by its hook after the session changes | — | #42 | true, `useGoogleSignIn.ts`, `useRegister.ts` |
| AU23 | Mutations carrying credentials keep nothing in the cache | passwords never stay ([finding 34](../architecture/findings.md#34-passwords-stay-in-the-mutation-cache-after-a-sign-in-a-registration-or-a-password-change)) | #45 | true, the four auth mutations |

Obsolete, not recorded: keeping the "Forgot password?" link while it led to a 404 (#35), since the page was built in #40.

### `users`

| # | Decision | Reason | PR | Status at `main` |
|---|---|---|---|---|
| US1 | The change counts wrong current passwords per user; skips the current password only when claim and account both say a change is pending; writes compare-and-set | — | #25 | true, `modules/users/users.service.ts`; stays in security |
| US2 | A Google-only account sets its first password through the reset email | it proves the inbox | #25 | true, `users.service.ts`; stays in security |
| US3 | `users` owns `User`; the session's user extends it | a lower level must not read a higher one's types | #34 | true, `packages/shared/src/users/` |
| US4 | The account menu belongs to `users`, prepared by one hook | the account is this capability's | #35 | true, `features/users/index.ts` |
| US5 | The forced-change form is `users`', because `/me/password` is | the endpoint's owner | #38† | true, `features/users/index.ts` |
| US6 | Sign-out is one action, also offered alone; the change page's header shows the wordmark and sign-out only | screen 18 | #38 | true, `hooks/useSignOutAction.ts` |
| US7 | Sign-out ends the session only once the server agrees; a failure keeps it | only the server's verdict ends a session | #33, #35 | re-checked in the users step |
| US8 | A compact account menu in the dashboard's top bar | the design draws it | #39† | true, `features/users/index.ts` |
| US9 | The menus link to the dashboard for an admin or a user with active links | — | #39† | true, `hooks/useAccount.ts` |
| US10 | A "password saved" toast after the forced change | — | #42 | true, `hooks/useChangePassword.ts` |
| US11 | The change keeps no password in the cache | finding 34 | #45 | true, `useChangePassword.ts` |

The account settings page (`GET` and `PATCH /me`) is not built (#36). It is not a decision of this capability yet, and is not recorded. The forced-change gate and its guard: see Q1.

### `space-links`

| # | Decision | Reason | PR | Status at `main` |
|---|---|---|---|---|
| SL1 | My spaces: any signed-in user, the active links with the role at each, oldest first | no `:spaceId`, so no space middleware | #36† | true, `apps/api/src/app.ts`, `space-links.repository.ts` |
| SL2 | A hidden space is listed; a deleted one is not | an owner still manages a hidden space | #36† | true, `space-links.service.ts` |
| SL3 | Names in both languages with the area's; a retired area still names its spaces | — | #36 | true, `modules/lookups/lookups.service.ts` |
| SL4 | The list is composed from three modules, one query each | the module levels | #36 | true, `space-links.service.ts` |
| SL5 | A link to a deleted space counts for nothing, in the session's links too; deleting writes nothing in the links | the delete stays reversible | #44† | **changed** from #36, which left [finding 18](../architecture/findings.md#18-whether-a-link-to-a-deleted-space-still-counts) open; true now, `space-links.service.ts` |
| SL6 | The web reads under `['me','spaces']` | the key scopes | #36 | true, `features/space-links/hooks/queryKeys.ts` |
| SL7 | `space-links` is dashboard-only | — | #39† | true, `apps/web/scripts/dashboardOnly.ts` |
| SL8 | The switcher lives in this capability: name and area, the other spaces, navigation on a choice, skeleton, retry | — | #39† | true, `features/space-links/index.ts` |
| SL9 | An English-only name shows marked `lang="en"` in the Arabic interface | the space name's language rule | #44 | true, `services/choiceOf.ts` |
| SL10 | The admin's spaces list is composed here: the verified and governorate filters resolve to ids first, then `spaces` filters and pages; each row carries owners, stale groups, last update | full pages, right totals | #44 | true, `modules/space-links/admin-spaces/` |
| SL11 | The list's states are lowercase, like its filter | one vocabulary | #44 | true, `packages/shared/src/space-links/requests.ts` |
| SL12 | The links loader without its refusal runs on the admin's space routes and gives no links for a deleted space | `can()` reads whether a space is verified | #44 | true, `app.ts` |

`RequireSpaceRole`, the landing order and the last space: see Q1. Their code is `shared/routing`, and the landing rule's helper changed from `safeReturnUrl` to `returnUrlOf` in #39.

### `lookups`

| # | Decision | Reason | PR | Status at `main` |
|---|---|---|---|---|
| LK1 | The amenity icon keys live in `packages/shared`; the design system does not import them | a client–server contract | #27 | true, `packages/shared/src/lookups/` |
| LK2 | The admin's guard is mounted once on `/admin`; the lookups services call no `can()` | a new router cannot forget it | #41† | true, `app.ts` |
| LK3 | The lists are not paginated | tens of rows, shown whole | #41† | true |
| LK4 | An order is the whole list of a scope, in one transaction, exact or 409, safe to repeat | — | #41† | true, `modules/lookups/exactOrder.ts` |
| LK5 | Hide and restore are `isActive` in the same edit; hiding a governorate leaves its areas alone | — | #41† | true, `lookupChange.ts` |
| LK6 | No new domain codes: a duplicate is 409 `not_unique` on the field | the existing keys suffice | #41† | true |
| LK7 | Duplicate English names are allowed | small lists, seen whole ([finding 30](../architecture/findings.md#30-a-lookups-english-name-is-not-unique), accepted) | #45 | true |
| LK8 | An amenity's key derives from its English name at creation and never changes | — | #41† | true, `modules/lookups/amenities/` |
| LK9 | A new row is placed last | — | #41† | true, `listOrder.ts` |
| LK10 | The web exports one section that owns its query, states and actions | pages compose sections | #43† | true, `features/lookups/index.ts` |
| LK11 | The admin's keys start `['admin','lookups',…]` | the admin sees hidden rows | #43 | true, `hooks/queryKeys.ts` |
| LK12 | A write stays pending until the list is fetched again; nothing optimistic | — | #43† | true |
| LK13 | A pending order holds every arrow of its list | — | #43 | true, `hooks/mutationKeys.ts` |
| LK14 | A row's failure shows in its card until the next action there; a 409 on an order refetches; no toasts | — | #43, #45 | true |
| LK15 | The public catalogue: active governorates with their active areas, and active amenities, in order, unpaginated | a bounded catalogue | #44† | true, `app.ts` |

Not recorded:
- the key-to-icon map in `features/lookups` (#27), which is not built ([finding 10](../architecture/findings.md#10-the-seeded-amenity-icon-keys-have-no-icons-in-the-design-system-yet));
- the amenities tab (#43's next item), which is planned, not built.

### `spaces`

| # | Decision | Reason | PR | Status at `main` |
|---|---|---|---|---|
| SP1 | The English name is required, the Arabic optional | most spaces are known by an English name | #44† | true, `packages/shared/src/spaces/requests.ts` |
| SP2 | The slug comes from the English name with the smallest free suffix, deleted spaces counted, and never changes | a slug is never reused | #44† | true, `modules/spaces/slug.ts` |
| SP3 | The location is required and inside the Gaza Strip's box, with a margin | spaces at the edges must pass | #44† | true, `packages/shared/src/spaces/gazaStrip.ts` |
| SP4 | Hide, unhide, delete and restore apply to any space, are audited and safe to repeat; a restore keeps `isHidden` | — | #44† | true, `modules/spaces/space/space.service.ts` |
| SP5 | Stale is computed on the server per fact group, from the platform's thresholds; photos count in none | one rule | #44† | true, `modules/spaces/staleness.ts` |
| SP6 | The profile is editable only while unverified; one service serves the admin and the owner, and `can()` decides | — | #44† | true, `spaces/profile/profile.service.ts`, `packages/shared/src/auth/can.ts` (Q2) |
| SP7 | A new space is unverified, with its settings copied from the defaults in the same transaction | — | #44 | re-checked in the spaces step |
| SP8 | The landmark is an optional pair of languages | the owner's answer | #44† | true, `requests.ts` |
| SP9 | Descriptions keep their line breaks | the create form needs it | #44† | true, `requests.ts` |
| SP10 | "Last update" is the latest of the five group dates | — | #44† | true, `staleness.ts` |

## 6. The execution

**One Work Item,** `docs/feature-documents`, run after the owner approves this plan and answers §10. Its prompt names the files it touches. No other worker edits a document while it runs.

**The rules for every step:**
- **No orphan facts.** Each capability step writes the capability's document and makes its ledger rows' moves out of the platform documents in the **same commit**. No commit leaves a fact in two places or in none.
- **Re-check first.** Before moving a row, the step re-reads the row's section at the current `main`, and re-checks each decision's status in the code.
- **What is recorded.** A decision not true that day is recorded as changed, or not at all.

### Steps and commits

| Step | Commit | What it does | Its checks |
|---|---|---|---|
| X-1 | `docs(architecture): add the documentation rules` | `architecture/documentation.md` (decision 6); ADR 0018 (decision 7); the map: its *Rules for this set* reduced to a link, the strategy's and ADR 0018's entries, a `features/` entry (Q8); two findings: a link checker (decision 11) and one file per finding (decision 12) | the strategy ≤ 1,500 words; the ADR names no file and states one decision; every new link resolves |
| X-2 | `docs(workflow): add capability document triggers` | workflow [§7](../development/workflow.md#7-documentation-update-triggers): the capability row; [§5](../development/workflow.md#5-definition-of-done-and-accepted): the documentation check; `start-work-item`: read the capability's document first; CLAUDE.md: the strategy and `docs/features/` among the authoritative documents | the skill still only links (it owns no fact); CLAUDE.md stays a pointer |
| X-3 | `docs(lookups): add the lookups document` | `features/lookups.md`; rows AC-1, DM-5, FA-24 (per Q4), the lookups parts of FA-1, FA-3, FA-12, FA-18 and CO-1 | the steps' checks below |
| X-4 | `docs(spaces): add the spaces document` | `features/spaces.md`, **no web section**; rows CO-4, AC-8, AC-9, CO-7 (per Q2), the spaces part of CO-1; the overview's scope line (Q6) | the steps' checks |
| X-5 | `docs(space-links): add the space-links document` | `features/space-links.md`; rows FA-6, FA-10, FA-11, CO-6, AC-7, SO-1 (its half), the space-links parts of FA-1, FA-12, FA-18, SE-1, CO-1 | the steps' checks |
| X-6 | `docs(users): add the users document` | `features/users.md`; rows FA-8, FA-22, the users parts of FA-1, FA-3, FA-12, FA-14, FA-18, SE-1, CO-1 | the steps' checks |
| X-7 | `docs(auth): add the auth document` | `features/auth.md`; rows FA-9, FA-13, FA-17, FA-19 to FA-21, FA-23, SE-2 to SE-11, CO-8, AC-2 to AC-6, SO-1 (its half), the auth parts of FA-1, FA-3, FA-12, FA-14, FA-18, SE-1, CO-1 | the steps' checks |
| X-8 | `docs: cut the built lines to the platform` | what is left of the *Built* lines in the headers (decision 10); overview's *Built* (Q5); the plain duplicates no capability step owns: FA-2, FA-4, FA-5, FA-7, FA-15, FA-16, SE-12, CO-5, CO-9, DM-1 to DM-4, DM-6, LO-1, LO-2, SO-2, DS-1, DS-2, ST-1, GL-1; CO-2, CO-3 per Q3 | every header states only the platform; nothing in a header is a changelog |
| X-9 | — | the verification pass (below); its fixes fold into the step commit they correct | the exit criteria (§9) |

**Why this order.**
- **Governance first,** so every capability document is written against the rules.
- **Lookups first among the capabilities.** It is small and serves two audiences, which tests the template. `spaces` then tests "a section only when its code exists".
- **`space-links` before `users` and `auth`,** which link it for the session's links and the landing.
- **`auth` last.** It has the most rows and the most decisions, and by then the template is settled.

**The claims the code contradicts** (§4) are corrected in the step that touches their section (Q7).

### Each capability step's checks

- **Every ledger row named for the step is applied.** The old place is a link or is gone, and a search for the fact's key words across `docs/` finds it in one home only.
- **The document follows the template (decision 4).** A section is absent when its code is: no web section for `spaces`, and no public section for `lookups` until the site uses it.
- **At most about 1,200 words.**
- **The code map names folders and entry points only.**
- **Every decision gives its reason, date and PR, and its status was checked in the code that day.**
- **Every link in the touched documents resolves,** to its file and its heading.
- **The map lists the new document (Q8),** and the document declares its class, Description.

### The verification pass (X-9)

- **Links.** Every relative link in `docs/`, `CLAUDE.md` and the skills resolves to a file and a heading. They are checked by hand, with a search for each link's anchor (decision 11).
- **Residual duplication.** The key words of every ledger row are searched across `docs/`, and each row's fact is found in one home.
- **Size and class.** Each capability document's word count is ≤ 1,200, and the strategy's ≤ 1,500. Each document's declared class is true.
- **Lanes.** `npm run format:check` and `npm run lint` pass. CI runs every lane.

## 7. The review gate

The execution's PR is reviewed by an independent session, never the author's own subagent ([workflow §10](../development/workflow.md#10-ai-tooling)). It is judged on these axes:

1. **No duplication across all documents.** No fact has two homes, records excepted (decision 9).
2. **Every claim is true against the code,** and above all every decision's status.
3. **Nothing is lost in a move.** Each ledger row ends with one home, and no fact disappeared without a row.
4. **Links resolve,** including those into moved sections from records and skills.
5. **The word limits hold:** about 1,200 a capability document, about 1,500 the strategy.
6. **The classes are true:** a capability document describes what is built, and the strategy states rules.
7. **Scope:** no code changed; only the files the prompt names; no rule reworded into a new one.

**Budget:** one review session, at most two read-only subagents (duplication; claims against the code), about 300,000 tokens, and one round of fixes folded into their commits.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| A fact is lost in a move | One ledger row per fact; the move and the capability document in one commit; review axis 3 |
| A capability document passes 1,200 words (`auth` has 23 decisions) | A decision is one line with its PR; flows link security rather than restate it; if still over, the owner decides before the document is split |
| The documents change between this plan and the execution | The ledger is as of 5a17db5; each step re-reads its rows' sections; an item merged meanwhile (the amenities tab, for example) is added to the step it belongs to |
| A heading anchor breaks, so a link fails silently | Every link checked by hand in each step and in X-9; the finding for a checker (decision 11) |
| A decision is recorded as current when it is not | Status re-checked in the code in each step; the review's axis 2 |
| A prompt-only decision cannot be checked by a reader | Cited by its PR and the code that shows it (§5's †), never by a path outside the repository |
| The examples left in platform rules grow back into duplication | Q4's rule, written into the strategy; review axis 1 |
| The execution's size: this plan's inventories alone took about 400,000 tokens | Capability steps need no inventory, only re-reads. The cap: at most two read-only subagents and about 500,000 tokens. If it is passed, the item stops after X-5 and the rest becomes a second Work Item |

## 9. Exit criteria

- [ ] `architecture/documentation.md` and ADR 0018 exist; the map points to both and to `docs/features/`.
- [ ] Workflow §5 and §7, `start-work-item` and CLAUDE.md carry the triggers of decision 13.
- [ ] `features/auth.md`, `users.md`, `space-links.md`, `lookups.md` and `spaces.md` exist, each in the template, ≤ about 1,200 words, with sections only where code exists.
- [ ] Every ledger row (§4) is applied, and each fact has one home; records are unchanged except for repointed links.
- [ ] Every decision of §5 marked true or changed is in its document with its reason, date and PR, and true at that day's `main`.
- [ ] The headers' *Built* lines name only the platform.
- [ ] Each claim of §4's list is corrected or recorded as a finding (Q7).
- [ ] The two findings of decisions 11 and 12 are recorded.
- [ ] Every link resolves; `format:check` and lint pass; CI is green.
- [ ] The independent review (§7) passed, and the owner merged.
- [ ] This plan moves to `plans/historical/`.

## 10. Open questions for the owner

The inventories found these boundary cases, which the decisions do not settle.

**Q1. The routing pieces that serve one capability.** These are the password-change gate and its guard (users), `RequireSpaceRole`, and the landing order with the last space (space-links). Their code is in `shared/routing`, and [architecture §2](../frontend/architecture.md#landing-and-guards) describes them.
- (a) They stay in architecture §2, and the capability documents link them.
- (b) They move to `f/users` and `f/space-links`.

*Recommendation: (a).* They guard or route every page, and a capability "knows no routes" ([architecture §3](../frontend/architecture.md#what-a-feature-exports)). The capability's document describes its flow up to the gate, then links.

**Q2. "The admin edits a space only while it is unverified."** The rule is stated in conventions' [Composed reads](../backend/conventions.md#composed-reads), the [API contract](../api/api-contract.md#spaces-the-admin) and the [data model](../architecture/data-model.md#spaces), and enforced by `can()`.
- (a) It goes to security's [Authorization](../backend/security.md#authorization), because its reason is who may act (decision 8).
- (b) It goes to `f/spaces` › Decisions, linking [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md).

*Recommendation: (a).* It is an authorization rule, and security owns authorization. `f/spaces` links it, and the contract keeps the 403.

**Q3. The audit list by capability** ([conventions §6](../backend/conventions.md#6-audit)).
- (a) It stays in the conventions, as cross-cutting policy.
- (b) Each line moves to its capability's document.

*Recommendation: (a).* The admin's privacy allowlist reads the list whole. Split by capability, the list of sensitive actions would have no single home. Each capability document links it.

**Q4. Capability examples inside platform rules.** For example, the admin's lookups as the `['admin', …]` key scope, or `useSignIn` as a hook.
- (a) A rule keeps **one** short example that names the capability without describing it, and the enumerations move.
- (b) Platform documents name no capability.

*Recommendation: (a).* An example makes a rule readable. What duplicates is an enumeration or a description, and those move. The strategy states this rule.

**Q5. The overview's *Built* section.** The workflow's trigger makes it the product's record of what is built.
- (a) One line per capability, linking its document, with `spaces` marked "the admin's, on the API only".
- (b) Leave the paragraph, and add the four missing capabilities.

*Recommendation: (a).* The overview names scope. The detail is the capability's, and a list of links cannot drift.

**Q6. Deleting and restoring a space are built** (#44), but the v1 scope says "add, edit, hide" ([overview › Admin dashboard](../project/overview.md#admin-dashboard)).
- (a) The scope line gains "delete and restore", in X-4.
- (b) It is left to a separate scope decision.

*Recommendation: (a).* The merge of #44 was the owner's decision, so the line only records it. Scope stays the owner's to approve, in this plan.

**Q7. The fifteen claims the code contradicts** (§4).
- (a) Correct each in the step that touches its section. Record a finding where the code may be the one to change: claims 9, 12 and 14.
- (b) Record all fifteen as findings, and leave the documents.

*Recommendation: (a).* The code is the source of truth, and correcting a document in scope is allowed. A finding where the code might change keeps that decision open.

**Q8. How the map lists `docs/features/`.**
- (a) One entry for the folder, and a line per capability document.
- (b) The folder alone.

*Recommendation: (a).* The documents are the first thing a worker reads, and their number is bounded by the modules. The strategy's rule against enumeration targets inventories of files, not the documents the map exists to find.
