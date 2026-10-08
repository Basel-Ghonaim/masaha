# 22. The reset email's words live outside the web's copy catalogue

**Status:** Open · **Date:** 2026-10-02

**Evidence:** every user-facing string goes through the copy catalogue, in both languages (CLAUDE.md). The reset email is sent by the API, which has no catalogue, so its words live in `apps/api/src/modules/auth/email/resetEmail.copy.ts`, in both languages held to one shape and checked by a unit test. A change to the product's wording can miss them, and the catalogue's own parity test does not see them.

**Resolves when:** the email's words move into a catalogue both apps read (for example in `packages/shared`), or this second place is accepted in localisation.md.
