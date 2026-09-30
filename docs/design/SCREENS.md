# The 32 screens → prototype files and screenshots

The screen list is owned by `docs/frontend/design-system/foundation.md` §13. This table only says **where each screen lives in this archive**. Board sections are the folders under `screens/` (see `INDEX.md` for every frame).

## Public site (8)

| # | Screen | Prototype page | Board sections |
|---|---|---|---|
| 1 | Home | `Home.html` | 01, 02, 06, 11, 12, 14 |
| 2 | Directory (list / map, near me, filters) | `Directory.html` | 01, 03, 11, 12 |
| 3 | Space details | `Space details.html` | 01, 04, 05, 11, 12, 14 |
| 4 | About / Contact | `About.html` | 10, 11 |
| 5 | Sign in (+ Google) | `Sign in.html`, `Sign in - board.html` | 06, 11 |
| 6 | Register | `Register.html` | 05, 07, 11, 12, 13 |
| 7 | Forgot / reset password (+ the reset email) | `Forgot password.html`, `Reset password.html`, `Reset email.html` | 08, 09, 11, 13 |
| 8 | 404 / error / offline | `Error.html` | 10, 11 |

## My account (3)

| # | Screen | Prototype page | Board sections |
|---|---|---|---|
| 9 | Profile & settings (+ forced password change) | `Settings.html`, `Change password.html` | 17, 18 |
| 10 | Favourites | `Favorites.html` | 15, 19 |
| 11 | My reports | `Reports.html` | 16, 19 |

## Owner and reception dashboard (13)

| # | Screen | Who | Prototype page | Board sections |
|---|---|---|---|---|
| 12 | Overview | O | `Owner overview.html` | 29, 31 |
| 13 | Front desk (check in, check out, override, uncollected) | O + R | `Desk.html` | 20, 21, 22, 23, 24, 25, 31, 50, 51, 52 |
| 14 | Customers | O + R | `Customers.html` | 24, 26, 31, 50, 52 |
| 15 | Customer details (subscriptions, statement, payments) | O + R | `Customer file.html` | 27, 31, 41, 50, 51, 52 |
| 16 | New / renew subscription (sheet) | O + R | `Desk.html?dialog=sheet…` | 24 |
| 17 | Payments (owner: all + void · reception: «دفعاتي اليوم») | O + R | `Payments.html`, `My payments.html` | 28, 32, 50, 52 |
| 18 | Announcements (+ closure extension, owner only) | O + R | `Announcements.html` | 38, 41 |
| 19 | Finance & statistics | O | `Finance.html` | 33, 35, 50, 51, 52 |
| 20 | Space profile | O | `Owner space profile.html` | 30, 34, 36, 49 |
| 21 | Prices & packages | O | `Packages.html` | 34, 50 |
| 22 | Staff | O | `Staff.html` | 37, 50 |
| 23 | Data reports | O | `Data reports.html` | 39 |
| 24 | Settings | O | `Owner settings.html` | 40 |

## Admin (8)

| # | Screen | Prototype page | Board sections |
|---|---|---|---|
| 25 | Overview | `Admin overview.html` | 42, 50 |
| 26 | Spaces (+ add / edit an unverified space) | `Admin spaces.html`, `Admin space edit.html` | 43, 49, 50, 51, 52 |
| 27 | Space owners | `Admin owners.html` | 44 |
| 28 | Data reports (all spaces) | `Admin reports.html` | 45 |
| 29 | Users (+ temporary password) | `Admin users.html` | 46, 50 |
| 30 | Lookups (areas, amenities) | `Admin lookups.html` | 47, 49, 50 |
| 31 | Audit log | `Admin audit.html` | 48 |
| 32 | Platform settings | `Admin settings.html` | 48 |

## Also in the archive

- `Wordmark.html`: the three wordmark options; **option A (plain word, «م» favicon) was chosen**.
- `prototype/BRIEF.md`: the product brief the designs were made against (roles, scope, product rules, sample data).
