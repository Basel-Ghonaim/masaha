# ADR 0021 — Sign in where the action is

> **Status:** Accepted · **Date:** 2026-11-24

## Context
Some actions on the public site need an account: saving a space to one's favourites, reporting wrong information about it. A guest who presses one is asked to sign in. Until now that question was a dialog with two ways out, to the sign-in page or the register page; the action was held while the guest went there and came back.

The guests who press these actions are most often new to Masaha, without an account. The round trip sent exactly them away from the page they had chosen, through two or three pages, before the thing they asked for happened.

The sign-in and register pages also serve people who come to sign in on purpose: reception at the start of every shift, the owners, the admin, a bookmark. They land by role, and a page suits them.

## Decision
1. **An action that needs an account opens the sign-in over the page it was pressed on,** titled by that action. Signing in, registering, and asking for a link to reset a forgotten password happen there, without leaving the page.
2. **After signing in there, the user stays on the page and the action completes.** There is no landing by role: the user asked for the action, not for a destination. When the account must first change a temporary password, the action waits until it is changed.
3. **The overlay has no address of its own.** The sign-in, register and forgotten-password pages keep theirs, for direct visits and links, and land as before. The browser's Back closes the overlay and keeps the page.
4. **The reset link stays a page,** since it arrives by email, often on another device. A sign-in after the reset returns to the page where the action was pressed and completes it. A tab still waiting with the overlay open learns of the reset and offers the sign-in. A reset never signs in by itself.
5. **On a phone the overlay fills the screen,** with a close button; on a wider screen it is a dialog.
6. **The overlay is loaded when it first opens.** The public pages do not carry it, so they stay light on a weak connection ([ADR 0011](0011-one-web-app.md)).

## Alternatives
- **Keep the round trip through the pages.** Rejected: it sends away the guest who is most likely new.
- **Modal routes,** the auth pages drawn over the previous page when reached from inside the site. Rejected: a second way to render every auth page, a pattern found nowhere else in the app, and an address for a moment rather than a place.
- **The header's sign-in link opening the overlay too.** Rejected: it holds no action, and the people who use it land by role; an overlay that then navigates away is a page in disguise.
- **Signing in by itself after a reset.** Rejected: signing in the usual way after a reset is the recommended practice, and it would change the session and recovery design ([ADR 0003](0003-session-model.md), [ADR 0017](0017-recovery-session.md)).
- **The whole reset inside the overlay.** Not possible: the link is opened from an email.

## Consequences
- The landing after a sign-in has two cases: the pages land on a safe return path or by role; the overlay stays on its page.
- Google's sign-in appears in the overlay as well as on the pages.
- The design system gains an overlay that is a dialog on wide screens and a full-screen panel on a phone.
- The API, the session and the recovery do not change.
