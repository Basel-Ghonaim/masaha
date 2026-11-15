# ADR 0020 — The design archive and the prototype live in their own repository

> **Status:** Accepted · **Date:** 2026-11-15

## Context
The design archive came into this repository as a frozen record: the screens made in Claude Design, their screenshots and the clickable prototype. It became the living design instead: reviews take it apart, the owner decides, and the decisions are applied to the prototype, which is what a feature is built from.

Here, every prototype change cost a pull request, the full CI and a production deploy on merge, and the design worker worked inside the production repository. Design work now moves page by page, each new idea a variant of the same page chosen by the owner, so prototype changes become more frequent, not less.

## Decision
- **The design archive and the prototype move to a public repository of their own, with their history.** Nothing of them stays here.
- **This repository stays the one home of product facts:** the scope, the glossary, the product rules, the copy and the design system. The prototype's workers read it and never edit it; the prototype holds only its own working documents.
- **A design reaches production only as a Work Item here.** The owner chooses a variant there, with its reasons recorded there; a Work Item here builds it with the design system. A change the design asks of the design system is made, and decided, here.
- **This repository links the prototype by URL.** A document that cites a file of it links that file in the other repository.

## Alternatives
- **Keep the prototype here.** Rejected: the cost above, paid on every design change.
- **A copy there, the original frozen here.** Rejected: two homes for the same design, edited twice or drifting apart.
- **A submodule.** Rejected: it keeps both costs, adds a third, and gains nothing for a prototype that production never imports.

## Consequences
- Prototype work runs no CI here and deploys nothing.
- A link to the design is a URL, which the repository's link check does not verify; a file cited from here is not renamed there without a pull request here.
- The archive leaves this repository's tree but stays in its history.
- A Work Item that builds a screen reads two repositories.
