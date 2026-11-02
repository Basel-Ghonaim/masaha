# 33. The deployment's headers must let Google's sign-in work

**Status:** Resolved · **Date:** 2026-10-06 · **Resolved:** 2026-11-01

**Evidence:** Google sign-in on the web (F-5b3b) loads Google Identity Services' script from `https://accounts.google.com/gsi/client`, which draws its button in a frame from `accounts.google.com`, adds its own styles, and opens Google's window as a popup that answers the page. No header restricts this today: the web's pages carry no Content-Security-Policy and no Cross-Origin-Opener-Policy (the API's Helmet headers cover only the API's answers). A future CSP that does not allow Google's script, frames, styles and connections, or a `Cross-Origin-Opener-Policy: same-origin` on the web's pages, would break the sign-in without any test failing.

**Resolves when:** the deployment's headers are written ([ADR 0014](../decisions/0014-deployment.md)) with a CSP that allows `https://accounts.google.com/gsi/client` (script), `https://accounts.google.com/gsi/` (frame, connect, style), and a COOP of `same-origin-allow-popups` or none on the web's pages, as Google's own guidance lists them.

**To the deployment item** (the owner's F1, 2026-10-29).

**Resolution (#133):** `vercel.json`'s headers on the web's pages ([setup › The deployment](../../development/setup.md#the-deployment)): the Content-Security-Policy allows `https://accounts.google.com/gsi/client` in `script-src`, `https://accounts.google.com/gsi/` in `frame-src` and `connect-src`, and `https://accounts.google.com/gsi/style` in `style-src`, as Google's guidance lists them, and `Cross-Origin-Opener-Policy` is `same-origin-allow-popups`. A web unit test fails when that rule loses the COOP; the local production-shaped run drew the button with no CSP violation.
