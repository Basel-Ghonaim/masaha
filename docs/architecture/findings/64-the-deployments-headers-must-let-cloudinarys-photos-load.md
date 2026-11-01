# 64. The deployment's headers must let Cloudinary's photos load

**Status:** Resolved · **Date:** 2026-10-13 · **Resolved:** 2026-11-01

**Evidence:** online, a space's photos are delivered by Cloudinary, from `https://res.cloudinary.com/<cloud_name>/image/upload/…` ([conventions §12](../../backend/conventions.md#12-environments)): every card's cover, the map's selected card, a space's gallery and the admin's editor load them as images from that host. Locally they come from the API, at the web's own origin, so nothing in development shows the difference. No header restricts this today: the web's pages carry no Content-Security-Policy. A future CSP whose `img-src` does not allow Cloudinary's host would leave every photo blank online, each card falling back to the space's mark, without any test failing. [Finding 33](33-the-deployments-headers-must-let-googles-sign-in-work.md) and [finding 46](46-the-deployments-headers-must-let-the-maps-tiles-load.md) record the same for Google's sign-in and the map's tiles.

**Resolves when:** the deployment's headers are written ([ADR 0014](../decisions/0014-deployment.md)) with a CSP whose `img-src` allows `https://res.cloudinary.com`, beside findings 33 and 46.

**To the deployment item** (the owner's F1, 2026-10-29).

**Resolution (#133):** the web's Content-Security-Policy in `vercel.json` allows `https://res.cloudinary.com` in `img-src`, beside the site's own origin for the local storage's files ([setup › The deployment](../../development/setup.md#the-deployment)). A Cloudinary photo itself is seen only online: the runbook's first checks open a space's gallery there.
