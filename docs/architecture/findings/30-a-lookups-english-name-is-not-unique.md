# 30. A lookup's English name is not unique

**Status:** Accepted · **Date:** 2026-10-05 · **Accepted:** 2026-10-06

**Evidence:** the admin's lookups answer a duplicate name with 409 `not_unique` only where the database holds a unique key: a governorate's Arabic name, an area's Arabic name within its governorate, and an amenity's key, derived from its English name ([api-contract §5](../../api/api-contract.md#5-endpoints), S2a-1). A governorate's or an area's English name, and an amenity's Arabic name, may repeat another's. So may an amenity's English name once it is edited, since only the key it yielded when the amenity was added is unique. A check in the service alone would race without a constraint, and the item changed no schema.

**Resolves when:** a migration adds the missing unique keys (each English name as its Arabic one is keyed, and an amenity's Arabic name), and the endpoints answer them with `not_unique`; or the owner accepts the repeats.

**Resolution (2026-10-06, H-1):** the owner accepted the repeats. The lists are small, and the admin sees each one whole, so a repeated name is seen where it is made. No schema changes.
