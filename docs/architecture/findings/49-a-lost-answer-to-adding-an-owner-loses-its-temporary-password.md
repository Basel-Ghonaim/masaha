# 49. A lost answer to adding an owner loses its temporary password

**Status:** Open · **Date:** 2026-10-11

**Evidence:** `POST /admin/owners` answers a new account's temporary password once, in its answer only ([security › Passwords](../../backend/security.md#passwords)). When that answer is lost on the way back, the account and its link are already written. Sending the request again answers `ALREADY_OWNER`, and no request ever shows the password again. The new owner cannot sign in until the admin issues another temporary password, which the users item builds (`POST /admin/users/:userId/temporary-password`, [plan](../../plans/v1-mvp.md#planned-api-surface)). Until then, the admin's only way out is the forgotten password's email, sent to the owner's address.

**Resolves when:** the admin can issue a temporary password to an account, as the users item plans; or the creation carries an idempotency key whose retry answers the first result ([ADR 0015](../decisions/0015-idempotency-and-concurrency.md)), if the owner prefers it.
