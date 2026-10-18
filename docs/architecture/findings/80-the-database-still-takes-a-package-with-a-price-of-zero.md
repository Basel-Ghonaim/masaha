# 80. The database still takes a package with a price of zero

**Status:** Open · **Date:** 2026-10-18

**Evidence:** a package's price is above zero (the owner's decision, 2026-10-13; [packages › Decisions](../../features/packages.md#api-decisions)), and the API refuses zero in its shared schema (`priceAgorot` from 1, `@masaha/shared/packages`). The database's `packages_price_check` (`apps/api/prisma/migrations/20260929120200_front_desk/migration.sql`) still checks `price_agorot >= 0`, so a write that does not pass through the API (the seed, a script, a later module) can store a free package. A space's prices moved to `> 0` in a migration of their own (`20261012144622_space_price_above_zero`).

**Resolves when:** a migration of the front desk's steps changes `packages_price_check` to `price_agorot > 0`, with its test in `apps/api/src/db/`, as the space prices' did.