# 231. Signing in over a page switches the page to the account's language

**Status:** Open · **Date:** 2026-11-25

**Evidence:** a sign-in makes the account's language the interface's (`apps/web/src/app/session.ts`, `onSessionEstablished` with `source: 'signIn'`, [architecture §4](../../frontend/architecture.md#4-session-and-preferences)). On the pages the user then lands somewhere new, so the switch reads as part of arriving. Over a page ([ADR 0021](../decisions/0021-sign-in-where-the-action-is.md), #157) the guest stays on the page they were reading: in WI-C2's Chrome pass (2026-11-25), a guest reading «Pal Hub» in English who signed in with the demo owner, whose account is Arabic, saw the same page turn Arabic under the closing overlay, and the favourite's toast and the report's dialog came in Arabic. The rule predates #157; the overlay makes it more visible.

**Resolves when:** the owner decides whether a sign-in over a page keeps the language the guest was reading (and, if it does, whether the account's language is offered instead), and the session's wiring follows.
