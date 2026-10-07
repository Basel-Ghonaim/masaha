# Project Overview

> **Status:** Active · **Last Updated:** 2026-10-07 · **Owner:** Basel Ghoneim
> **Authority:** What Masaha is, what is built today, what v1 is committed to, and what is explicitly not in v1. It names scope; it does not specify behaviour.

## What Masaha is

A bilingual (Arabic RTL / English), fully responsive web platform for coworking spaces in the Gaza Strip.

- **Users** (freelancers, students, remote workers) find a space: where it is, what it costs, what it offers, and whether it is available right now.
- **Space owners and their reception staff** run their space from a dashboard: the front desk, customers, subscriptions, payments, finance, announcements and the space's profile.
- **The admin** runs the platform: spaces, owner accounts, reports, users, lookup lists.

## Built

This section lists a capability only once it is merged and working. Each line links the capability's document, which says what it does.

- [Auth](../features/auth.md): register, sign in with a password or with Google, stay signed in across reloads, and reset a forgotten password by an email link.
- [Users](../features/users.md): the account menu, sign-out, and the change of a temporary password before any other page.
- [Space links](../features/space-links.md): the spaces a user works at and the space switcher; the admin's spaces list, on the API.
- [Lookups](../features/lookups.md): the admin's governorates and areas, and amenities; the public catalogue, on the API.
- [Spaces](../features/spaces.md): the admin's, on the API only: add, edit the profile and the facts (hours and shifts, prices, amenities, contacts), confirm them, hide, delete and restore.

## Committed scope — v1

### Roles
Global roles `USER` · `OWNER` · `ADMIN`. At a space, a user is `OWNER` or `RECEPTION` (front-desk staff added by the owner), and their permissions there come from that role ([ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md)).

### Accounts
- Register with name, email and password. Sign in with email and password, or with Google.
- Password reset by an email link. A user who lost access to their email contacts Masaha on WhatsApp, and the admin issues a temporary password.
- The rules are owned by [security.md](../backend/security.md).

### Public site
- Directory of spaces: the list **or** the map, one at a time, the list by default; search and filters (area, price, the amenities that tell spaces apart, student prices, open on Friday, verified, available now); sort, including nearest to me.
- Near me: the device's location, never sent to Masaha, with an area or a pin on the map as fallbacks ([the rule](../frontend/design-system/foundation.md#13-screens-to-design-32), under *Directory*). Home shows the nearest spaces when a location is in use, otherwise the spaces available now.
- Space page: photos, prices (display only), amenities, hours, contact, announcements, live status — available, full or closed now, never a seat count (verified spaces) — and "last updated" per fact.
- Verified / unverified spaces: every space is listed whether or not its owner has joined.
- "Are you the owner?": contact by email or WhatsApp (no in-app request).
- Report wrong information; the reporter sees the resolution note. Favourites.

### Dashboard — owner and reception
Who may do what at a space is decided in [ADR 0009](../architecture/decisions/0009-space-scoped-reception-role.md); the money rules in [ADR 0010](../architecture/decisions/0010-manual-payment-ledger.md); the derived values in [data-model.md](../architecture/data-model.md#derived-values-computed-not-stored).

- Front desk: check in and check out subscribers and visitors; a visit's charge at check-out; auto check-out; uncollected visits; setting the live status by hand for a set time.
- Customers: everyone on file, filtered by subscription type, status and payment.
- Subscriptions and packages: any multi-day arrangement, with optional limits and fixed or usage-based billing; packages defined by the owner; custom terms typed at the desk; ending a subscription early.
- Payments and debts: payments recorded by hand (cash or transfer), partial payments, balances and debts; voiding a payment (owner); each staff member's collections for the day.
- Finance and statistics (owner): income, debt, debtors and payers with a WhatsApp reminder link, collections per staff member, occupancy; CSV export, the first item to drop if time is short.
- Staff (owner): reception accounts, added and deactivated by the owner.
- Space profile (owner; Arabic required, English optional), prices and packages; confirming that a fact group is still correct.
- Announcements, including a closure notice; after a closure, the owner extends all active subscriptions by the closure days.
- Data reports about the space, resolved with an optional note. Audit log. Settings.

### Admin dashboard
- Spaces (add, edit, hide, delete and restore). Owner accounts (create or upgrade, link to spaces).
- Data reports (resolved with an optional note). Users (suspend, change role, issue a temporary password). Lookups (areas, amenities) in both languages. Audit log. Platform settings.

### Cross-cutting
- Arabic and English interface; RTL and LTR.
- Light and dark themes.
- Fully responsive: phone, tablet, desktop.

## Not in v1

Do not build these, even partially. The data model leaves room for some of them (see [ADR 0002](../architecture/decisions/0002-authorization-model.md) and [data-model.md](../architecture/data-model.md)), but no code for them exists in v1.

- Online payment. Printed invoices or receipts.
- Expenses and net profit. A point of sale (drinks).
- Staff payroll and shift scheduling.
- Consolidated finance across spaces.
- Automated notifications by email, SMS or WhatsApp (in-app only). The password-reset email is the only email Masaha sends; a debt reminder is a WhatsApp link that a staff member sends by hand.
- Phone verification and one-time codes (OTP) by SMS or WhatsApp. Deferred to future work: an SMS to Palestine costs about $0.41 per message and WhatsApp authentication templates are paid; a free, user-initiated WhatsApp recovery flow is the preferred later option.
- QR-code check-in.
- In-app claiming of a space by its owner.
- Seat booking.
- Reviews and ratings.
- Unified multi-space subscription, community features, mobile app.
- AI and machine-learning features.
