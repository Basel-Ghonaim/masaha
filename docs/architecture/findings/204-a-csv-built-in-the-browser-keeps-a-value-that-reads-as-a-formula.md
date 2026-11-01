# 204. A CSV built in the browser keeps a value that reads as a formula

**Status:** Resolved · **Date:** 2026-10-29 · **Resolved:** 2026-11-01

**Evidence:** `csvOf` (`apps/web/src/shared/lib/csv/csvOf.ts`, #132) writes each value as RFC 4180 says, quoting a comma, a quote or a line break, and nothing more. A value that starts with `=`, `+`, `-` or `@`, such as a customer's name or a payment's note typed at the desk, opens in Excel or LibreOffice as a formula: the owner's finance exports carry text that reception or a customer typed. The plan's design for the CSV (D3.9) names RFC 4180 only, so the executor of lane L built it as designed and left the point open.

**Resolves when:** the owner decides whether the exports neutralise such a value (for example, a leading `'` or a tab before `=`, `+`, `-`, `@`, as OWASP's CSV-injection guidance suggests) and `csvOf` follows that rule with its test, or the risk is accepted with the owner's line.

**Resolution (#132):** The owner's rule (2026-11-01): a text value that starts with `=`, `+`, `-`, `@`, a tab or a CR is written after a `'` (OWASP), so a spreadsheet opens it as text; a number stays a number. `csvOf` follows it for every export, which also keeps a phone's `+970…` as text.
