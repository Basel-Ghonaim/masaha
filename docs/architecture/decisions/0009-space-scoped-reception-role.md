# ADR 0009 — Space-scoped staff: the Reception role

> **Status:** Accepted · **Date:** 2026-09-29
> Partly supersedes [ADR 0002](0002-authorization-model.md): its rule 2 (one `SpaceManager.role` value) and rule 7 (the receptionist uses the owner's account).
> **Revised:** 2026-10-11 — rule 2's `OWNER` follows the active owner links both ways, each change ending the person's sessions; a link that leaves the role as it is ends none. The admin's role change offers `USER` or `ADMIN` only.
> **Revised:** 2026-10-18 — rule 4: the owner creates new accounts only; an email that already has an account is refused, never linked (a typed email can be wrong: a stranger would reach the desk). A person at two spaces' desks waits for a proof they give in person ([finding 84](../findings/84-a-person-cannot-work-at-two-spaces-front-desks.md)). #90
> **Revised:** 2026-10-19 — rule 5: reception types a price by hand only where the space's settings allow it, off by default; every hand-typed price, the owner's included, carries a reason. #92
> **Revised:** 2026-10-20 — rule 5: the owner alone writes off a visit's unpaid rest that will not be collected, with a reason, and may undo it (K6). #100

## Context
ADR 0002 deferred a receptionist role: the front desk was to use the owner's account, with the audit log recording every action. Reviewing the screen designs (2026-09-29) showed that this no longer holds. Payments are now recorded at the desk ([ADR 0010](0010-manual-payment-ledger.md)), so the owner needs to know who received each payment (shift handover, collections per staff member), and front-desk staff must not see finance, void payments or edit the space. ADR 0002 left room for this: a new `SpaceManager.role` value and new rows in the permission table.

## Decision
1. **Roles at a space.** `SpaceManager.role` is `OWNER | RECEPTION`. A user's permissions at a space come **only** from the role of their active link to that space; `can()` never reads the global role for a space check.
2. **The global role** stays `USER | OWNER | ADMIN`. `OWNER` is a label kept in sync with the links: set when a user's first `OWNER` link is created, back to `USER` when the last one is removed. Reception staff are global `USER`s. `ADMIN` stays platform-only.
3. **Verified** means at least one `OWNER` link. A `RECEPTION` link never verifies a space.
4. **The owner adds reception staff** by name and email:
   - a new email creates an account with a temporary password, shown once to hand over, that must be changed at first sign-in;
   - an email that already has an account is refused: no existing account is linked by an owner.

   The owner can deactivate a reception link: the person's access to the space ends and their sessions are revoked. The link is kept, because payments and audit entries name who did what. The account rules are owned by [security.md](../../backend/security.md).
5. **Permissions.** The owner can do everything reception can:

   | Action | Reception | Owner |
   |---|---|---|
   | Check in / check out | ✓ | ✓ |
   | See present / capacity (a warning at check-in when full) | ✓ | ✓ |
   | New customer; subscription from a package, or a custom one (its price typed by hand: the row below) | ✓ | ✓ |
   | Type a price by hand (a custom subscription's, or a visit's charge with no rate), with a reason | where the space allows it | ✓ |
   | Receive a payment, settle a debt, renew | ✓ | ✓ |
   | Collections today (shift handover) | own | all staff |
   | Announcements (including a closure notice); manual state override | ✓ | ✓ |
   | Extend all active subscriptions after a closure | – | ✓ |
   | Void a payment (with a reason) | – | ✓ |
   | Write off a visit's unpaid rest that will not be collected, with a reason; undo it | – | ✓ |
   | Finance and statistics | – | ✓ |
   | Space profile, prices, packages | – | ✓ |
   | Staff, data reports, settings, audit log | – | ✓ |

6. **One dashboard.** It opens to the `ADMIN` and to any user with an active link. Navigation follows the user's role at the space selected in the space switcher.
7. **Admin privacy extends to the new records.** As with members and attendance (ADR 0002 rule 4), the admin sees no customers, visits, subscriptions, payments or finance.

## Alternatives
- **Keep the shared owner account** (ADR 0002 rule 7) — rejected: collections per staff member need to know who recorded each payment, and a shared password gives the desk the owner's full rights.
- **A global `RECEPTION` role** — rejected: it duplicates the link's role, and cannot express one person holding different roles at two spaces.
- **Global roles `USER | ADMIN` only**, with the owner purely space-scoped — rejected for v1: the cleanest model, but it rewrites the admin's owner-account flow for no v1 gain. Decision 1 gives the same guarantee by never reading the global role for space checks.
- **A staff table separate from `SpaceManager`** — rejected: two links for one idea.

## Consequences
- `can()` gains the `RECEPTION` rows (F-3b). Its tests cover six actors: USER, reception of this space, reception of another space, owner of another space, owner of this space, ADMIN.
- The token's role alone cannot guard the dashboard for reception staff: the refresh response carries the user's active space links (space and role), and every space-scoped request checks the link in the database, as ADR 0002 rule 6 already requires.
- Audit entries about a space's customers, visits, subscriptions and payments are visible to that space's owner; the admin's audit view excludes them (ADR 0002's consequence, extended).
