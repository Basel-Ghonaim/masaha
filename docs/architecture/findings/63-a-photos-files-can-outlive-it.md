# 63. A photo's files can outlive it

**Status:** Open · **Date:** 2026-10-13

**Evidence:** a space's photo is stored before the transaction that writes its row, and removed after the transaction that deletes it, since nothing reaches the network inside a transaction and nothing runs after the answer ([ADR 0014](../decisions/0014-deployment.md); [spaces › Photos](../../features/spaces.md#behaviour-and-flows)). A refused or failed upload removes its files before answering, and so does a removal, but three cases leave files that no row names:
- the process dies, or the function is frozen at its time limit, between the store and the commit;
- Cloudinary keeps a file after its answer timed out, so the upload, believing nothing was stored, removes nothing it knows of;
- removing a file fails (the store is down): the request still succeeds, and the API logs the files' keys with `[storage:orphan]` where it survives to write the line.

Nothing reclaims them: v1 has no reclamation job. Each costs storage on Cloudinary's free plan; none is ever served, since no answer names its key.

**Resolves when:** a timed job (the scheduler port, [conventions §12](../../backend/conventions.md#12-environments)) lists the store's objects under `masaha/<NODE_ENV>/spaces/` and deletes those whose key no row holds and that are older than an hour, or a measurement shows the files left behind do not matter against the free plan's storage.
