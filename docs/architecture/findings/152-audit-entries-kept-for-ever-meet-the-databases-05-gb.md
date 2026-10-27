# 152. Audit entries kept for ever meet the database's 0.5 GB

**Status:** Open · **Date:** 2026-10-27

**Evidence:** the audit log is never deleted, and v1 keeps it for ever, with no retention job (the owner's decision 10; [data-model › Operations](../data-model.md#operations), *AuditLog*). Every desk action writes an entry ([conventions §6](../../backend/conventions.md#6-audit)): a visit's check-in and check-out, a subscriber's, each payment. A busy space writes about 36,000 entries a year; at about twenty busy spaces the table grows by about 730,000 entries a year, about 200 MB with its two indexes. The database's free tier stops writes at 0.5 GB ([ADR 0014](../decisions/0014-deployment.md)), which the other tables share: the audit table alone could bring it near the limit in about two years, and every write of the platform would then fail, not only the audit's. The audit reader (#128) reads these entries; it does not change how many are kept. Recorded at the owner's approval of FINANCE_AUDIT's plan (§13 Q10), so a retention rule is decided before the limit, not at it.

**Resolves when:** a retention rule is decided and built — for example, the desk's entries (visits, check-ins, payments) older than two years summarised or dropped, the platform's and the money's decisions kept — or the database's limit is raised and the cost accepted, and either is stated in the data model.
