# 21. A token replayed within the grace window starts its own branch

**Status:** Open · **Date:** 2026-10-02

**Evidence:** within 30 s of a rotation, each presentation of the rotated token gets a new token of the same family ([security.md](../../backend/security.md#tokens-and-cookies)), so two tabs refreshing together stay signed in. A copy presented within that window, say by an infostealer that replays the cookie at once, gets its own successor. From then on the thief and the owner each rotate their own branch and never present a token rotated more than 30 s ago, so reuse detection never fires; the family ends only by a logout, a password change or a reset. The owner decided to keep this for now (decision D5 of F-5a's review).

**Resolves when:** every presentation within the grace returns the same successor, derived deterministically from the presented token (for example an HMAC of it under a server key), so a replay within the window gains nothing (option B of that review).
