# 65. The forgotten password's wait is an estimate, not a measurement

**Status:** Open · **Date:** 2026-10-13

**Evidence:** an answer to a request for a reset link that sends no email waits between 1.5 and 3 seconds, about as long as a real send takes ([security › Passwords](../../backend/security.md#passwords), [finding 16](16-the-forgotten-passwords-timing-can-tell-whether-an-account-exists.md)). Those bounds were meant to come from real sends timed through the SMTP relay, but no send was timed: the worktree that built it had the SMTP keys with empty values, and the owner chose the documented estimate (Gmail's SMTPS: DNS, TCP, TLS, AUTH, MAIL, RCPT and DATA, about seven round trips, plus Google's processing). Even a local measurement would travel over a development machine's connection; online, the API sends from Vercel's data centre, likely much faster ([ADR 0014](../decisions/0014-deployment.md)). Bounds slower than the deployment's real sends would make an unknown address answer *later* than a known one: the reverse tell.

**Resolves when:** the send is timed on the deployment, and `NO_SEND_WAIT` (the auth module) is set from that measurement.
