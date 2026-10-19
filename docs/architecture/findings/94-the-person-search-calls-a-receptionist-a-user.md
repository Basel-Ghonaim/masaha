# 94. The person search calls a receptionist a user

**Status:** Open · **Date:** 2026-10-19

**Evidence:** the link dialog opened from a space's editor offers people by name or email, each saying
what it is from its row's global role and owner spaces: «مالك · {spaces}», «مالك» or «مستخدم». Since #90,
`AdminUserRow.receptionSpaces` tells a person who works another space's front desk apart, but the option
reads «مستخدم» all the same. Linking them as an owner here is allowed (`RECEPTION_LINK_ACTIVE` refuses only a
link at the same space), their reception link elsewhere stays, and the dialog never says so (#91's review,
finding 7). The same gap as [finding 88](88-the-upgrade-confirm-shows-no-front-desks.md), in the upgrade
confirm.

**Resolves when:** the person option, and the line before the act, name the front desks a person works at,
as the users page will word a row with its reception spaces.
