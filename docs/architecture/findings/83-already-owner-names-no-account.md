# 83. ALREADY_OWNER names no account

**Status:** Resolved · **Date:** 2026-10-18 · **Resolved:** 2026-10-29

**Evidence:** when an admin adds an owner for an email that already owns a space, the server answers
`ALREADY_OWNER` with no account id, so the add form can only say «هذا البريد لمالك مسبقًا — اربطه
بالمساحة من صفّه في القائمة» and cannot open the link dialog for that owner as the design's
«اربطه بالمساحة» does (`?link=<user>&space=<id>`). The wording is accepted for now.

**Resolves when:** the 409 carries the owner's id (a contract change, worker B), or the owner
accepts the wording.

**Resolution (#132):** `ALREADY_OWNER` carries `details.userId`, and the add sheet links that owner (D0.1, D1.7, D6.5): «هذا البريد لمالك مسبقًا.» under the email, and «اربطه بالمساحة», which opens the link dialog for that owner and the chosen space.
