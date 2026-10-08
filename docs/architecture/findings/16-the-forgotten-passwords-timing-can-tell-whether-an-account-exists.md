# 16. The forgotten password's timing can tell whether an account exists

**Status:** Open · **Date:** 2026-10-01

**Evidence:** `POST /auth/password/forgot` answers the same 202, with no body, for every email ([security.md](../../backend/security.md#passwords)). For an account that may sign in, though, it first stores a token and sends the email, which over SMTP takes seconds, and against a slow relay up to the sum of its phase timeouts (DNS, connection, greeting, and each quiet spell, 10 s each), while an unknown email answers at once. No work may run after a response is sent ([ADR 0014](../decisions/0014-deployment.md)), so the send cannot move after the answer, which is how the OWASP Forgot Password Cheat Sheet keeps the timing uniform. The rate limits (5 per address and email, 50 per address, every 15 minutes) slow a probe down, but do not stop it.

**Resolves when:** the timing is made uniform, for example by padding every answer to a fixed minimum, or the leak is accepted in security.md as a trade-off, as `EMAIL_TAKEN` on registration is.
