# 130. The dashboard's shells have no skip link

**Status:** Open · **Date:** 2026-10-21

**Evidence:** SH-018 ([the design's changes](../../design/CHANGES.md)) puts a «تخطَّ إلى المحتوى» link first in every shell, leading to `main`. The site's shell has it, and moves the focus to its `main` when another page opens (#101). The dashboard's shells (`pages/dashboard/shell/`, the admin's and the space's under `DashboardLayout`) have neither: a keyboard user crosses the sidebar's links on every page, and a page change leaves the focus on the link that opened it. PUBLIC built it on the site only, its scope.

**2026-10-21, #103:** the site's focus shell (`FocusLayout`: sign-in, a new account, the password pages) lacks both too. Leaving it once signed in now moves the focus to the site's `main`, but within it a keyboard user starts at its header, and a move between its pages leaves the focus on the removed link; the same fix applies to it.

**2026-10-21, #105:** the site's shell tells a first load from a navigation by its arrival only (`useMainFocus`: a pop is a load). Returning from the focus shell by the browser's Back is a pop, so the focus stays nowhere, the form that held it gone; and a first load that a guard redirects with `replace` before the site's shell mounts (`/login` opened while signed in) moves the focus on what is, for the visitor, a first load. Telling a load from Back needs the history's index; the same fix belongs with the focus shell's (#103's review, item 8).

**Resolves when:** a dashboard item adds the skip link and the focus on a page change to `DashboardLayout`, and the focus shell (`FocusLayout`) gains them too.
