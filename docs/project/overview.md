# Project Overview

> **Status:** Active · **Last Updated:** 2026-09-26 · **Owner:** Basel Ghoneim
> **Authority:** What Masaha is, what is built today, what v1 is committed to, and what is explicitly not in v1. It names scope; it does not specify behaviour.

## What Masaha is

A bilingual (Arabic RTL / English), fully responsive web platform for coworking spaces in the Gaza Strip.

- **Users** (freelancers, students, remote workers) find a space: where it is, what it costs, what it offers, and how many seats are free right now.
- **Space owners** run their space from a dashboard: profile, members, daily attendance, announcements, occupancy reports.
- **The admin** runs the platform: spaces, owner accounts, reports, users, lookup lists.

## Built

Nothing yet. This section lists a capability only once it is merged and working.

## Committed scope — v1

### Roles
`USER` · `OWNER` · `ADMIN`. The receptionist uses the owner's account; the audit log records every action.

### Public site
- Directory of spaces: list and map, search and filters (area, price, amenities, verified, available now).
- Space page: photos, prices (display only), amenities, hours, contact, announcements, live available seats (verified spaces), "last updated" per fact.
- Verified / unverified spaces: every space is listed whether or not its owner has joined.
- "Are you the owner?": contact by email or WhatsApp (no in-app request).
- Report wrong information. Favourites.

### Owner dashboard
- Space profile (Arabic required, English optional).
- Members: name, phone, membership type, start and end dates — no amounts.
- Manual attendance: check in a member or a daily visitor; check out; auto check-out.
- Announcements. Occupancy reports. Reports about the space's data.

### Admin dashboard
- Spaces (add, edit, hide). Owner accounts (create or upgrade, link to spaces).
- Data reports. Users (suspend, change role). Lookups (areas, amenities) in both languages. Audit log. Platform settings.

### Cross-cutting
- Arabic and English interface; RTL and LTR.
- Light and dark themes.
- Fully responsive: phone, tablet, desktop.

## Not in v1

Do not build these, even partially. The data model leaves room for some of them (see [ADR 0002](../architecture/decisions/0002-authorization-model.md) and [data-model.md](../architecture/data-model.md)), but no code for them exists in v1.

- Payments, dues, receipts, revenue reports.
- QR-code check-in.
- In-app claiming of a space by its owner.
- Seat booking.
- Reviews and ratings.
- Separate staff (receptionist) accounts.
- Unified multi-space subscription, community features, mobile app.
- SMS or email notifications (in-app only).
