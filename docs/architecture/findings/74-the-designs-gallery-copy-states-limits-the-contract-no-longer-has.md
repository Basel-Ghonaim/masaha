# 74. The design's gallery copy states limits the contract no longer has

**Status:** Open · **Date:** 2026-10-17

**Evidence:** the design's gallery intro reads «حتى 10 صور · JPG أو PNG · حتى 5 ميغابايت» / "Up to 10 photos · JPG or PNG · up to 5 MB each" ([docs/design/prototype/Admin space edit.html](../../design/prototype/Admin%20space%20edit.html)), while the contract accepts JPEG, PNG **and WebP** and caps one photo at **4 MiB** ([api-contract §5 › Photos](../../api/api-contract.md#photos)). The ten is the same; the types and the size are not, and a screen built from the drawing would say a wrong limit to the admin who then cannot follow it.

The built section says the contract's own limits — «حتى 10 صور · JPEG أو PNG أو WebP · حتى 4 ميغابايت للصورة» — so the archive under `docs/design/` is the only place the old words remain. It is a frozen record of what was drawn, so the divergence cannot be closed by editing it ([documentation §4](../documentation.md#4-classes)); it is recorded here instead ([documentation §1](../documentation.md#1-one-home-per-fact): a divergence a reader cannot find is a finding).

**Resolves when:** the design archive is refreshed from the built screens, so what is drawn says what the contract requires.