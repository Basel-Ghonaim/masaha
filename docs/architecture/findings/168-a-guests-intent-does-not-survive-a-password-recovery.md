# 168. A guest's intent does not survive a password recovery

**Status:** Open · **Date:** 2026-10-28

**Evidence:** a guest who presses an action that needs an account — the report of wrong information on a space's page, or the favourite's heart on a card or a page (#129) — is asked to sign in, and the action is held in memory only, never in the address (PAYMENTS_STEP10 S14): a link carrying it would let a crafted link act for a signed-in user. The site's sign-in, register and Google keep the page alive, so the held action runs once the session is established: the report's dialog opens, and the favourite is saved and said. A reload, or a password recovered by email (whose link opens a new page), loses it (AU-UX-001): back signed in, the user presses again.

**Resolves when:** the held action survives a new page without travelling in the address (a short-lived, same-origin store the session confirms), or the owner accepts pressing again as enough.
