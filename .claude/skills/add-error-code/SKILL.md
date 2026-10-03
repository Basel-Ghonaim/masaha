---
name: add-error-code
description: Use when a Masaha change adds a new domain error code, an API error code defined in packages/shared.
---

# Add a domain error code

A runbook, not a source of truth: each step links to the section that owns its rule. If this file and a document disagree, the document wins.

1. Follow the four steps of *Adding a domain error code* in [backend conventions §4](../../../docs/backend/conventions.md#4-errors), in their order. The third one adds the code's line to [api-contract §6](../../../docs/api/api-contract.md#6-domain-error-codes-initial).
2. In the PR description, list each new code with its English and Arabic text, and mark the Arabic as needing the owner's approval ([localisation, Catalogues](../../../docs/frontend/localisation.md#catalogues)).
