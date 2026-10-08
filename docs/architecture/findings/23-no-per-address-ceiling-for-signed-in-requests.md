# 23. No per-address ceiling for signed-in requests

**Status:** Open · **Date:** 2026-10-02

**Evidence:** a request with a valid access token counts by its user, 300 every 15 minutes ([security.md](../../backend/security.md#rate-limits-fixed-window)). Registrations are bounded (20 an hour per address), but each account still brings its own bucket, so one address holding many accounts multiplies its allowance. Online, that spends the free tier's CPU and database hours ([ADR 0014](../decisions/0014-deployment.md)).

**Resolves when:** F-7 sizes a per-address ceiling for signed-in requests against the deployment's real limits, or records why it is not needed.
