# Masaha · مساحة

**Coworking spaces in the Gaza Strip — find one, run one.**

[![CI](https://github.com/Basel-Ghonaim/masaha/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/Basel-Ghonaim/masaha/actions/workflows/ci.yml)
![Node 24](https://img.shields.io/badge/Node-24-3c873a?logo=node.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&logoColor=white)
![License: proprietary](https://img.shields.io/badge/license-proprietary-lightgrey)

A bilingual (Arabic RTL / English) web platform for the coworking spaces of the Gaza Strip. One
public directory with live availability, and one role-based dashboard for space owners, their
reception staff and the platform admin.

<div dir="rtl" lang="ar">

منصّة ثنائية اللغة (عربية من اليمين إلى اليسار / إنجليزية) لمساحات العمل المشترك في قطاع غزة:
دليل عام يعرض الحالة المباشرة، ولوحة تحكّم واحدة لأصحاب المساحات وموظفي الاستقبال ومدير المنصّة.

</div>

## The problem, and the idea

Students, freelancers and remote workers in Gaza depend on coworking spaces for power and internet.
But the information about those spaces is scattered across social posts and word of mouth, and it
goes stale fast: is it full right now, what does a day cost, is it open on Friday. Masaha answers all
of it in one place — a real directory, in Arabic and English, with filters, a map, "near me", and a
live status pulled from the space itself. Owners get a dashboard to run the space day to day.

<div dir="rtl" lang="ar">

يعتمد الطلاب والمستقلّون والعاملون عن بُعد في غزة على مساحات العمل المشترك من أجل الكهرباء
والإنترنت. لكن معلومات هذه المساحات متفرّقة بين منشورات التواصل الاجتماعي والسماع، وتتقادم سريعًا:
هل هي ممتلئة الآن؟ كم يكلّف اليوم؟ هل تفتح يوم الجمعة؟ يجيب مساحة عن ذلك كله في مكان واحد — دليل
حقيقي بالعربية والإنجليزية، مع الفلاتر والخريطة و«القريب منّي»، والحالة المباشرة مأخوذة من
المساحة نفسها. ويحصل أصحاب المساحات على لوحة تحكّم لإدارة مساحتهم يومًا بيوم.

</div>

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/readme/hero-dark.webp">
    <img src="docs/assets/readme/hero-light.webp" alt="Masaha's home page in Arabic and light theme on a desktop beside the same page in English and dark theme on a phone" width="900">
  </picture>
</p>

## What it offers, by audience

**Visitors.** The directory in a list or on a map, one at a time; search and filters by area, price,
the amenities that tell spaces apart, student prices, open on Friday, verified, and available now;
sorting, including nearest to me. "Near me" uses the device's location, and that location is never
sent to Masaha — an area or a pin on the map stand in for it. The space page carries photos, prices
(display only), amenities, hours, contact, announcements, and the live status — available, full or
closed now, a state and never a count. Every space is listed whether or not its owner has joined.
Report wrong information, save favourites, and if you own a space, reach Masaha by email or WhatsApp.

<div dir="rtl" lang="ar">

**الزوار.** الدليل على شكل قائمة أو خريطة. بحث وفلاتر بحسب المنطقة والسعر والمرافق المميّزة وأسعار
الطلاب والفتح يوم الجمعة والموثّق والمتاح الآن، وترتيب يشمل «الأقرب إليّ». يستخدم «القريب منّي» موقع
الجهاز، ولا يُرسل هذا الموقع إلى مساحة أبدًا — تكفي منطقة أو نقطة على الخريطة. وتعرض صفحة المساحة
الصور والأسعار (للعرض فقط) والمرافق وساعات العمل والتواصل والإعلانات والحالة المباشرة: متاح أو
ممتلئ أو مغلق الآن، حالة لا عدد. وتظهر كل المساحات سواء انضمّ صاحبها أم لا. أبلغ عن معلومة خاطئة،
واحفظ مساحاتك المفضّلة، وإن كنت صاحب مساحة فتواصل مع مساحة بالبريد أو واتساب.

</div>

**Owners and reception.** One dashboard to run the space: the front desk (check in and check out
subscribers and visitors, charge a visit at check-out, auto check-out, and the uncollected visits);
customers filtered by subscription type, status and payment; subscriptions and packages with optional
limits and fixed or usage-based billing; payments and debts recorded by hand, with partial payments,
balances and voids; finance and statistics; reception accounts managed by the owner; the space profile,
prices and packages; announcements, including a closure notice that extends every active subscription
by the closure days; data reports and an audit log.

<div dir="rtl" lang="ar">

**الأصحاب والاستقبال.** لوحة واحدة لإدارة المساحة: مكتب الاستقبال (تسجيل حضور وخروج المشتركين
والزوّار، واحتساب الزيارة عند الخروج، والخروج التلقائي، والزيارات غير المحصّلة)؛ الزبائن مع الفلترة
بحسب نوع الاشتراك والحالة والدفع؛ الاشتراكات والباقات بحدود اختيارية وفوترة ثابتة أو بحسب الاستخدام؛
الدفعات والديون مسجّلة يدويًا مع الدفعات الجزئية والأرصدة وإلغاء الدفعة؛ المالية والإحصاءات؛ حسابات
الاستقبال التي يضيفها الصاحب؛ ملفّ المساحة والأسعار والباقات؛ الإعلانات، ومنها إعلان الإغلاق الذي
يمدّد كل اشتراك فعّال بأيام الإغلاق؛ البلاغات وسجلّ التدقيق.

</div>

**The admin.** The platform: spaces (add, edit, hide, delete and restore), owner accounts linked to
spaces, data reports resolved with a note, users and their roles, the bilingual lookup lists of areas
and amenities, the audit log and the platform settings.

<div dir="rtl" lang="ar">

**المدير.** المنصّة: المساحات (إضافة وتعديل وإخفاء وحذف واسترجاع)، وحسابات الأصحاب مربوطة
بالمساحات، والبلاغات مع ملاحظة الحلّ، والمستخدمون وأدوارهم، وقوائم المناطق والمرافق بكلا اللغتين،
وسجلّ التدقيق وإعدادات المنصّة.

</div>

## Screens

The public site, in Arabic: the directory as a list and as a map, and a space page with the live status.

| List | Map |
|:--:|:--:|
| ![The directory as a list, in Arabic, light theme](docs/assets/readme/directory-light.webp) | ![The directory as a map with real OpenStreetMap tiles and pins on Gaza areas](docs/assets/readme/directory-map.webp) |
| The directory, as a list | The same directory, on the map |

| Home (light) | Home (dark) |
|:--:|:--:|
| ![Masaha's home page, Arabic, light theme](docs/assets/readme/home-light.webp) | ![Masaha's home page, Arabic, dark theme](docs/assets/readme/home-dark.webp) |
| Home, light theme | Home, dark theme |

| Space page | Owner's overview |
|:--:|:--:|
| ![A space page with prices, amenities and live status](docs/assets/readme/space-light.webp) | ![The owner's dashboard overview](docs/assets/readme/owner-light.webp) |
| A space page | The owner's overview |

| Front desk | Home on a phone |
|:--:|:--:|
| ![The front desk: check in, check out and uncollected visits](docs/assets/readme/desk-light.webp) | ![Masaha's home page on a phone](docs/assets/readme/home-phone.webp) |
| The front desk | The same home, on a phone |

From the running build — the sign-in and register screens, and the admin's dashboard:

| Sign in | Register |
|:--:|:--:|
| ![The sign-in screen](docs/assets/readme/app-signin.webp) | ![The register screen](docs/assets/readme/app-register.webp) |
| Sign in | Register |

| Spaces | Lookups |
|:--:|:--:|
| ![The admin's spaces list with its filters](docs/assets/readme/app-spaces.webp) | ![The admin's lookups: areas and amenities](docs/assets/readme/app-lookups.webp) |
| The admin's spaces list | The admin's lookups |

<details>
<summary>More of the admin's dashboard, and the phone</summary>

| Row actions | Delete, with an undo |
|:--:|:--:|
| ![The actions menu on a space row](docs/assets/readme/app-spaces-menu.webp) | ![The delete confirmation dialog](docs/assets/readme/app-spaces-dialog.webp) |
| Row actions | Delete, with an undo |

| Hidden, with a toast | Amenities |
|:--:|:--:|
| ![A toast confirming a space was hidden](docs/assets/readme/app-spaces-toast.webp) | ![The amenities tab of the admin's lookups](docs/assets/readme/app-lookups-amenities.webp) |
| Hidden, with a toast | The amenities tab |

| Spaces, on a phone |
|:--:|
| ![The admin's spaces list on a phone](docs/assets/readme/app-spaces-phone.webp) |
| The admin's spaces list, on a phone |

</details>

<sub>Screens from Masaha's product design and its running build.</sub>

## Bilingual, both directions, accessible

The whole interface exists in Arabic and English — the customer-facing screens with an Arabic
paragraph under each English one here, the interface itself through one typed copy catalogue with no
user-facing string in a component. Arabic is right-to-left, English left-to-right, and the layouts use
logical directions only, so one component serves both; a repository check fails on any physical
direction class. Fonts, contrast and focus are part of the design system, and accessibility is tested
with `axe` in the component lane.

![Switching the language flips the direction from Arabic to English, then the theme to dark](docs/assets/readme/masaha.gif)

## Tech stack

- **Web** (`apps/web`) — React 19, TypeScript, Vite; Tailwind CSS v4 and Radix primitives on a tiered
  design-token structure; TanStack Query for server state, React Router, Zustand, React Hook Form with
  Zod. One single-page application serves both the public site and the dashboard
  ([ADR 0011](docs/architecture/decisions/0011-one-web-app.md)).
- **API** (`apps/api`) — Node 24 and Express 5, a modular monolith with modules in levels, each built
  from routes → controller → service → repository; Prisma over PostgreSQL; Zod for validation,
  `jose` for tokens, `bcrypt` for passwords, `helmet` and `pino` for hardening and logs.
- **Shared** (`packages/shared`) — the web–API contract in code: the request schemas the server
  verifies and the types both sides use, so a payload is described once.
- **Tooling** — an npm-workspaces monorepo; ESLint with zone boundaries, Prettier, Vitest, Supertest
  and Testing Library; GitHub Actions for CI.

The whole choice is recorded in
[ADR 0001 — monorepo and stack](docs/architecture/decisions/0001-monorepo-and-stack.md).

## Architecture at a glance

```mermaid
flowchart LR
  B["Browser"] --> W["apps/web — React SPA<br/>public site + dashboard, one app"]
  W -->|"/api/v1, same origin"| A["apps/api — Express modular monolith<br/>modules in levels, layered"]
  A --> D[("PostgreSQL<br/>through Prisma")]
  S["packages/shared — request schemas<br/>and the contract's types"] -.-> W
  S -.-> A
```

The web and the API share one origin, so the session cookies travel by themselves; locally, Vite's
dev server forwards `/api` to the API. The map of the parts, and one request traced end to end, are in
[`docs/architecture/system-overview.md`](docs/architecture/system-overview.md).

## Engineering quality

- **Authorization lives on the server** and is tested per role: hiding a control is never the guard.
  What a user may do at a space comes from a space-scoped role
  ([ADR 0009](docs/architecture/decisions/0009-space-scoped-reception-role.md)).
- **Decisions are recorded** as Architectural Decision Records, one per decision, in
  [`docs/architecture/decisions/`](docs/architecture/decisions/) — the *why* behind the stack, the
  session, the data and the design system.
- **Four test lanes** — unit, component, API integration and the shared package — with each behaviour
  proven where it belongs, and a test seen failing before it passes
  ([`docs/development/testing.md`](docs/development/testing.md)).
- **CI checks every pull request**: lint, format, typecheck, the test lanes, the class checks and the
  build ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)).
- **One design system, one layer** (`apps/web/src/shared/design-system/`): semantic tokens only, no
  colour, font or CSS outside it, and a check that fails on arbitrary values
  ([`foundation.md`](docs/frontend/design-system/foundation.md)).
- **The site stays light**: a build check fails if the dashboard's code reaches the public site's
  first download, or if the development-only showcase reaches the build.

## Run it locally

Prerequisites: **Node 24** (the version in `.nvmrc`) and **Docker Desktop**. Then, from the root:

```bash
npm ci                                   # installs every workspace and generates the Prisma client
cp apps/api/.env.example apps/api/.env   # then set JWT_SECRET, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD
npm run db:up                            # PostgreSQL in Docker, on host port 5433
npm run db:migrate && npm run db:seed    # schema + the lookups, the admin and the settings
npm run dev                              # web on http://localhost:5320, forwarding /api to the API
```

The full walkthrough — the API on its own, the environment variables, the test lanes and what CI runs
— is in [`docs/development/setup.md`](docs/development/setup.md).

## Repository structure

```
apps/web/         the SPA: the public site and the dashboard, one React app
apps/api/         the API: an Express modular monolith over PostgreSQL through Prisma
packages/shared/  the web–API contract in code: request schemas and types
docs/             the map, the decisions, the capability documents and the plans
.github/          CI: lint, format, typecheck, the test lanes and the build checks
```

## Documentation

The documentation is a set of documents with one owner per fact, starting from the
[documentation map](docs/README.md):

- [The map](docs/README.md) — every document, what it owns and when to read it.
- [Architectural decisions](docs/architecture/decisions/) — the ADRs.
- [Capability documents](docs/features/) — one per capability: its flows, decisions and code map.
- [The v1 plan](docs/plans/v1-mvp.md) — phases, sequence and risks.

## Author

**Basel Ghoneim** — the idea, the plan and the code.

- Email: [baselghonaim@gmail.com](mailto:baselghonaim@gmail.com)
- LinkedIn: [basel-ghonaim](https://www.linkedin.com/in/basel-ghonaim)
- GitHub: [@Basel-Ghonaim](https://github.com/Basel-Ghonaim)

## Rights

© 2026 Basel Ghoneim. All rights reserved.
