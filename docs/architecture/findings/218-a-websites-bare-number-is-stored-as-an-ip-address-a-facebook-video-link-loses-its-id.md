# 218. A website's bare number is stored as an IP address; a Facebook video link loses its id

**Status:** Open · **Date:** 2026-11-10

**Evidence:** two contact rules of `packages/shared/src/spaces/contacts.ts` that predate #140 (since #48), left unchanged there because #140 keeps the existing types' rules as they were:
- A website reads its value as a URL (`linkOf`), and a URL reads a host made of one number as an IPv4 address: `123` is stored as `https://0.0.0.123`, `599123456` as `https://35.181.230.0`. #140 refuses such a number for «وسيلة أخرى», whose numbers take the phone rule; a website still takes it.
- A network's link keeps its path only, its query dropped, so `facebook.com/watch?v=…` is stored as `https://www.facebook.com/watch`, an address with no video, which opens Facebook's video home. #140 refuses a YouTube link that names no channel; Facebook keeps any path.

**Resolves when:** a website refuses a host that is an IP address, and a Facebook link that names no page (`/watch`, a video) is refused or keeps what names it, each with its test.
