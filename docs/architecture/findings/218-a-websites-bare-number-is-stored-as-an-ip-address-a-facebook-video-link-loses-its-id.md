# 218. A website's bare number is stored as an IP address; a Facebook video link loses its id

**Status:** Resolved · **Date:** 2026-11-10

**Evidence:** two contact rules of `packages/shared/src/spaces/contacts.ts` that predate #140 (since #48), left unchanged there because #140 keeps the existing types' rules as they were:
- A website reads its value as a URL (`linkOf`), and a URL reads a host made of one number as an IPv4 address: `123` is stored as `https://0.0.0.123`, `599123456` as `https://35.181.230.0`. #140 refuses such a number for «وسيلة أخرى», whose numbers take the phone rule; a website still takes it.
- A network's link keeps its path only, its query dropped, so `facebook.com/watch?v=…` is stored as `https://www.facebook.com/watch`, an address with no video, which opens Facebook's video home. #140 refuses a YouTube link that names no channel; Facebook keeps any path.

**Resolves when:** a website refuses a host that is an IP address, and a Facebook link that names no page (`/watch`, a video) is refused or keeps what names it, each with its test.

**Resolution (2026-11-15, #149):** a link's host must be a domain with a top-level domain, so a bare number, an IP address, `localhost` or a bare word is refused; a Facebook link must name a page or a profile (a username, `profile.php?id=…`, `/people/<name>/<id>`), so `/watch`, a video, a reel, a post, a group, an event, a photo, a share and a search are refused, and a handle that names one of those sections too. `contacts.unit.test.ts` lists each; the contacts' Sheet refuses `http://10.0.0.1` and `facebook.com/watch?v=1` on their rows and sends nothing; the API answers `invalid_format` for them. Stored contacts are left as they are: one the rules now refuse is refused when its space's contacts are next saved.
