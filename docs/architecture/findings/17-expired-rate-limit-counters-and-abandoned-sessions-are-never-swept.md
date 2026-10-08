# 17. Expired rate-limit counters and abandoned sessions are never swept

**Status:** Open · **Date:** 2026-10-01 · **Corrected:** 2026-10-02

**Evidence:**
- **Rate limits.** The `rate_limits` table ([security.md](../../backend/security.md#rate-limits-fixed-window)) keeps a row per key, and a key's window starts over on its next hit. A key never hit again keeps its expired row for good. The rows are small, but the table grows with every address and account that ever made a request, against Neon's 0.5 GB free tier ([ADR 0014](../decisions/0014-deployment.md)).
- **Refresh tokens.** Every rotation inserts a row, and the rotated one stays until it expires, 7 days later, because reuse detection needs it. A user's expired rows are deleted when they sign in, change their password, or refresh, so a live session keeps about its last 7 days of rows. The rows of a session nobody uses again stay until that user signs in or refreshes again, possibly never.
- **Reset tokens.** A reset deletes the user's reset tokens in its transaction, and a delivered link deletes the older ones. A link never used and never replaced stays after it expires.
- **Recovery sessions.** One is opened by every request for a reset link, whether or not the address has an account, and a new request in the same browser ends the last. A recovery whose browser never comes back stays after it expires, unless its link ends first and takes it along.

**Resolves when:** a timed job (the scheduler port, [conventions §12](../../backend/conventions.md#12-environments)) deletes expired counters and expired tokens, or a measurement shows the growth does not matter within v1.
