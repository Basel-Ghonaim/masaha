# 13. Two documents still say "member" for the renamed customer

**Status:** Resolved · **Date:** 2026-09-29

**Evidence:** F-3b renamed `Member` to `Customer` and moved daily visitors to `Visit`. Two documents outside its scope still use the old terms:
- [conventions.md](../../backend/conventions.md) lists a `members` module and audits "member create/edit/deactivate";
- [testing.md](../../development/testing.md) names the E2E flow "owner checks a member in".

**Resolves when:** those documents use the glossary's terms (customers, visits, check-ins), for example when the front-desk slice creates its modules.

**Resolution (2026-09-30, A-1):**
- A-1 rewrote conventions.md around the new module list: `customers`, `visits`, and `subscriptions` with its check-ins. Its audit list uses the glossary's terms.
- testing.md's E2E flow is now "reception checks a visitor in".
- workflow.md's commit scopes no longer name `members` and `attendance`. They point to the module list.
