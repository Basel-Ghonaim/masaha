# 168. A guest's intent does not survive a password recovery

**Status:** Resolved · **Date:** 2026-10-28 · **Resolved:** 2026-10-29

**Evidence:** a guest who presses an action that needs an account — the report of wrong information on a space's page, or the favourite's heart on a card or a page (#129) — is asked to sign in, and the action is held in memory only, never in the address (PAYMENTS_STEP10 S14): a link carrying it would let a crafted link act for a signed-in user. The site's sign-in, register and Google keep the page alive, so the held action runs once the session is established: the report's dialog opens, and the favourite is saved and said. A reload, or a password recovered by email (whose link opens a new page), loses it (AU-UX-001): back signed in, the user presses again.

**Resolves when:** the held action survives a new page without travelling in the address (a short-lived, same-origin store the session confirms), or the owner accepts pressing again as enough.

**Resolution (#132):** The held action is kept 15 minutes in the browser's storage and run only by the sign-in of the round trip it serves (D9.6): one in the tab that held it, or one that follows a password reset completed in this browser, which the reset page marks for 10 minutes. Any other sign-in — another tab's unrelated one, a later visit's — lets it go without running it, so it never fires into another account on a shared computer (the supervisor's decision on #132's review, R14-F3, 2026-11-01; [architecture §4](../../frontend/architecture.md#4-session-and-preferences)).
