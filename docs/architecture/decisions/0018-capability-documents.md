# ADR 0018 — Capability documents own each capability's application of the platform

> **Status:** Accepted · **Date:** 2026-10-06

## Context
The documents were organised by layer: the frontend architecture, the backend conventions, security, the API contract, the data model. Each capability that was built added its own detail to several of them: how its flows run, why it decided what it did, where its code sits, and a line in each header's list of what is built. A worker changing one capability had to read most of the set to find what concerned it, and the same fact often lived in two or three documents, which drift apart.

The rules for placing a fact were four bullets on the map, and the rest was practice. Nothing told a worker whether a fact belonged to the layer or to the capability.

## Decision
1. **A capability layer of documents,** one per capability, across its backend module, its shared contract and its web feature, owns what is specific to that capability: what it does, its boundary, its flows, its decisions with their reasons, and where its code starts. It is written when the capability first has a stable core, and updated with every change to it.
2. **One question places every fact:** a shared mechanism stays in its platform document; a capability's application of it belongs to the capability's document, which links the mechanism and never restates it. Security rules, routing, the contract and the data model keep their platform homes.

The rules themselves are owned by the [documentation rules](../documentation.md).

## Alternatives
- **Keep the documents by layer,** and add each capability's detail where its layer is. Rejected: it is the duplication and the reading cost this decision removes.
- **One document per capability and per layer.** Rejected: a change to a capability usually crosses all three layers, so the split would return.
- **Capability decisions as ADRs.** Rejected: they would be many, small and short-lived, and the ADRs would stop marking the choices that shape the system.

## Consequences
- A worker reads one document first, then only what it links.
- Platform documents shrink to their mechanisms and rules, with one example each, and their headers stop listing what each capability built.
- Every capability PR updates one more document, and a broken link between documents is easier to make; links are checked by hand until a checker exists.
- Records keep their text: a record repeats a fact as of its date, not as a second home.
- A capability's decisions no longer need ADRs: the [rules](../documentation.md#7-adrs) add the clause "no ADR when a document naturally owns the decision".
