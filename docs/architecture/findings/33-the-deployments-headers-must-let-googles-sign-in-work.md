# 33. The deployment's headers must let Google's sign-in work

**Status:** Open · **Date:** 2026-10-06

**Evidence:** Google sign-in on the web (F-5b3b) loads Google Identity Services' script from `https://accounts.google.com/gsi/client`, which draws its button in a frame from `accounts.google.com`, adds its own styles, and opens Google's window as a popup that answers the page. No header restricts this today: the web's pages carry no Content-Security-Policy and no Cross-Origin-Opener-Policy (the API's Helmet headers cover only the API's answers). A future CSP that does not allow Google's script, frames, styles and connections, or a `Cross-Origin-Opener-Policy: same-origin` on the web's pages, would break the sign-in without any test failing.

**Resolves when:** the deployment's headers are written ([ADR 0014](../decisions/0014-deployment.md)) with a CSP that allows `https://accounts.google.com/gsi/client` (script), `https://accounts.google.com/gsi/` (frame, connect, style), and a COOP of `same-origin-allow-popups` or none on the web's pages, as Google's own guidance lists them.
