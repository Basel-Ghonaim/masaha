# 20. A session has no absolute lifetime

**Status:** Open · **Date:** 2026-10-02

**Evidence:** every rotation gives the new refresh token 7 more days ([security.md](../../backend/security.md#tokens-and-cookies)). A session refreshed at least once a week therefore never ends by itself: only a logout, a password change, a reset or a suspension ends it. A stolen session that is used regularly lasts as long.

**Resolves when:** a family carries an absolute deadline (for example 30 days from sign-in, after which the person signs in again), or the open-ended session is accepted in security.md.
