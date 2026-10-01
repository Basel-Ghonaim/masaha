# ADR 0014 — Deployment: one origin on free tiers, adapted to the architecture

> **Status:** Accepted · **Date:** 2026-10-01
> Free-tier terms and limits checked on 2026-10-01 against the providers' official pages.

## Context
The graduation defence runs on the local environment: the database in Docker and the development servers. It works offline, which matters with Gaza's power and internet cuts.

The project also needs a public deployment as a portfolio showcase. It must cost nothing, use no purchased domain, and behave like the real product.

The session model ([ADR 0003](0003-session-model.md)) needs the web and the API on one origin: the refresh cookie is `SameSite=Strict`, and the web reads the session-hint cookie. One origin is also what [ADR 0011](0011-one-web-app.md) assumes.

## Decision
1. **One origin on Vercel, the database on Neon.** Vercel serves the static web at `/` and the same Express application as a function under `/api`, on its free subdomain (`masaha.vercel.app`, or the nearest available name). Neon hosts PostgreSQL. Both run in Frankfurt, the region nearest to Gaza that both offer.
2. **The deployment adapts to the architecture, never the reverse.** It changes only:
   - the implementations of the infrastructure ports ([ADR 0012](0012-modular-monolith-backend.md)): storage, email, the scheduler and the clock;
   - configuration;
   - one thin entry.

   The same composition root assembles the application everywhere: a long-running server locally, a function on Vercel. No module, rule or API contract changes for the deployment.
3. **Development runs from one origin too.** Each app has a fixed port of its own, and the web's development server forwards `/api` to the API. Cookies therefore behave locally exactly as they do online.
4. **Every free-tier difference is listed below**, so none is lost when the project moves to a paid host with its own domain.

The operative rules are owned by the [backend conventions §12](../../backend/conventions.md#12-environments) and [security.md](../../backend/security.md).

### Deviations to revisit
Each item gives the free-tier choice, then what a paid setup with its own domain would change.

- **Address:** `masaha.vercel.app` → the project's own domain. Update the OAuth origins and the allowed CORS origin, and re-check the cookie settings.
- **Scheduler:** there is no long-running process, and Vercel's free cron runs at most once a day, at any time within its hour.
  - The scheduler port's job runs through an internal, secret-protected endpoint, which an external free cron calls every few minutes.
  - A paid setup would use an in-process or platform scheduler, at full precision.
  - A check-out always records its cut-off time, so a late run never corrupts data.
- **Files:** functions have no persistent disk, and a request or a response is limited to 4.5 MB.
  - Photos go to free object storage through the storage port, resized on the client or uploaded directly.
  - Large responses, such as exports, must stay under the limit.
  - A paid setup would use a paid bucket with a CDN.
- **Email:** without a domain, no domain-verified provider is possible, so the reset email uses a single verified sender, or Gmail SMTP. A paid setup would use a domain-verified provider with SPF and DKIM.
- **Rate limiting:** function instances share no memory, so the limits are stored in PostgreSQL. On a single server they could stay in memory, or move to a dedicated store.
- **Database:**
  - a pooled connection for the application and a direct one for migrations;
  - the free tier's limits: 0.5 GB of storage (beyond it, writes are blocked) and 100 compute-hours a month (beyond them, the database is suspended until the next month);
  - the free tier offers PostgreSQL 18, the major of [ADR 0001](0001-monorepo-and-stack.md).
- **Logs:** the free tier keeps them for one hour. A paid setup would use a log drain or a logging service.
- **Cold starts:** the first request after an idle period is slower, because the function starts and the database wakes from scale-to-zero (after five idle minutes). A paid setup would use always-on instances.
- **Usage terms:** Vercel's free plan is for non-commercial personal projects, and exceeding an allowance pauses that feature for the rest of a 30-day period. Real, paying spaces mean a paid plan.

## Alternatives
- **The web on Vercel and the API on Render's free tier, behind a proxy.** Rejected:
  - the free server sleeps after about 15 minutes, and the next request then takes 30–60 s;
  - keeping it awake with pings works against the provider's terms.
- **An Oracle Cloud always-free VM.** Rejected:
  - it needs a credit card, and sign-ups are often refused;
  - HTTPS needs a domain;
  - one developer would have to operate a server.
- **Separate origins for the web and the API.** Rejected: the session's cookies would not reach the API.

## Consequences
- One application with two entries. What runs locally is what runs online.
- **No work runs after a response is sent**, in every environment: a function may be frozen as soon as it answers.
- **Revisit this decision** when the project is used commercially or gets its own domain, and then work through the deviations above.
