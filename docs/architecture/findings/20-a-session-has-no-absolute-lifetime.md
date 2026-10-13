# 20. A session has no absolute lifetime

**Status:** Resolved · **Date:** 2026-10-02

**Evidence:** every rotation gives the new refresh token 7 more days ([security.md](../../backend/security.md#tokens-and-cookies)). A session refreshed at least once a week therefore never ends by itself: only a logout, a password change, a reset or a suspension ends it. A stolen session that is used regularly lasts as long.

**Resolves when:** a family carries an absolute deadline (for example 30 days from sign-in, after which the person signs in again), or the open-ended session is accepted in security.md.

**Resolution (2026-10-13, #78):** a session lives at most 30 days from its sign-in. Each refresh token carries its family's deadline, set at sign-in and copied on each rotation; a refresh past it is refused and deletes the family, and a sign-in or a refresh deletes the user's rows past their deadline, as it does expired ones ([security › Tokens and cookies](../../backend/security.md#tokens-and-cookies)). The families alive at the migration got 30 days from it.
