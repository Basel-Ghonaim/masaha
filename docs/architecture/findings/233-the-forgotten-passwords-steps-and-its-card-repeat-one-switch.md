# 233. The forgotten password's steps and its card repeat one switch

**Status:** Open · **Date:** 2026-11-25

**Evidence:** `features/auth`'s `ForgotPasswordSteps` (#157), the forgotten password's steps without a card for the sign-in over a page, switches over the same five steps as `ForgotPasswordCard` (loading, unreachable, request, sent, link open) and keeps the same "enter the email again" state, each rendering the same parts (`ForgotPasswordForm`, `LinkSentLines`, `LinkOpen`, the recovery's failure). WI-C2's plan said nothing would be forked; the parts are shared, but the switch is written twice, so a new step or a change to one would have to be made in both.

**Resolves when:** `ForgotPasswordCard` is built on `ForgotPasswordSteps` (the card adding its frame, its titles and its foot), as WI-C3 rebuilds the pages on the overlay's form, and one switch remains.
