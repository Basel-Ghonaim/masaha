# 46. The deployment's headers must let the map's tiles load

**Status:** Open · **Date:** 2026-10-10

**Evidence:** the admin's add-space page (S2b-3b) shows a map from `shared/map`, which loads OpenStreetMap's standard tiles as images from `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and links its attribution to `https://www.openstreetmap.org/copyright` ([architecture §6](../../frontend/architecture.md#6-map)). No header restricts this today: the web's pages carry no Content-Security-Policy. A future CSP whose `img-src` does not allow the tile server would leave every map blank, its "the map didn't load" line showing, without any test failing. [Finding 33](33-the-deployments-headers-must-let-googles-sign-in-work.md) records the same for Google's sign-in.

**Resolves when:** the deployment's headers are written ([ADR 0014](../decisions/0014-deployment.md)) with a CSP whose `img-src` allows `https://tile.openstreetmap.org`, beside finding 33's rules for Google.
