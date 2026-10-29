# 204. A CSV built in the browser keeps a value that reads as a formula

**Status:** Open · **Date:** 2026-10-29

**Evidence:** `csvOf` (`apps/web/src/shared/lib/csv/csvOf.ts`, #132) writes each value as RFC 4180 says, quoting a comma, a quote or a line break, and nothing more. A value that starts with `=`, `+`, `-` or `@`, such as a customer's name or a payment's note typed at the desk, opens in Excel or LibreOffice as a formula: the owner's finance exports carry text that reception or a customer typed. The plan's design for the CSV (D3.9) names RFC 4180 only, so the executor of lane L built it as designed and left the point open.

**Resolves when:** the owner decides whether the exports neutralise such a value (for example, a leading `'` or a tab before `=`, `+`, `-`, `@`, as OWASP's CSV-injection guidance suggests) and `csvOf` follows that rule with its test, or the risk is accepted with the owner's line.
