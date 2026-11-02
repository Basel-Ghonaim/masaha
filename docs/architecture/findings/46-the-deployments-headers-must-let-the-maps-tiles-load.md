# 46. The deployment's headers must let the map's tiles load

**Status:** Resolved · **Date:** 2026-10-10 · **Resolved:** 2026-11-01

**Evidence:** the admin's add-space page (S2b-3b) shows a map from `shared/map`, which loads OpenStreetMap's standard tiles as images from `https://tile.openstreetmap.org/{z}/{x}/{y}.png` and links its attribution to `https://www.openstreetmap.org/copyright` ([architecture §6](../../frontend/architecture.md#6-map)). No header restricts this today: the web's pages carry no Content-Security-Policy. A future CSP whose `img-src` does not allow the tile server would leave every map blank, its "the map didn't load" line showing, without any test failing. [Finding 33](33-the-deployments-headers-must-let-googles-sign-in-work.md) records the same for Google's sign-in.

**2026-10-21, #105:** the site's Directory now shows the same tiles on its map («خريطة»), so a blank map would reach every visitor, not only the admin.

**Resolves when:** the deployment's headers are written ([ADR 0014](../decisions/0014-deployment.md)) with a CSP whose `img-src` allows `https://tile.openstreetmap.org`, beside finding 33's rules for Google.

**To the deployment item** (the owner's F1, 2026-10-29).

**Resolution (#133):** the web's Content-Security-Policy in `vercel.json` allows `https://tile.openstreetmap.org` in `img-src`, and `data:` for Leaflet's own icons, which its stylesheet carries inline; `Referrer-Policy: strict-origin-when-cross-origin` keeps the referrer OpenStreetMap's tile policy asks for ([setup › The deployment](../../development/setup.md#the-deployment)). The local production-shaped run loaded the directory's and the admin's maps with no CSP violation.
