# 88. The upgrade confirm shows no front desks

**Status:** Resolved · **Date:** 2026-10-18

**Evidence:** after `EMAIL_HAS_ACCOUNT` the add-owner sheet shows the email's account before the upgrade:
its name, when it joined and its spaces, read from the admin's users list. The server answers
`EMAIL_HAS_ACCOUNT` only for an active account that is neither an admin nor an owner, so its owner spaces are
always none, and the row carries no reception links: a person who works a space's front desk reads
«لا مساحات», and the confirm cannot say what kind of account it is (#89's review, finding 10).

**Resolves when:** the users list's row carries the reception spaces (worker B's STAFF) and the confirm
shows them beside the owner spaces.

**Resolution (2026-10-19, #93):** the upgrade confirm lists the account's reception desks beside its spaces, from the users list's `receptionSpaces` (#90).
