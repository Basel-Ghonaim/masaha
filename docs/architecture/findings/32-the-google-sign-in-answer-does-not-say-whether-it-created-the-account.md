# 32. The Google sign-in answer does not say whether it created the account

**Status:** Open · **Date:** 2026-10-06

**Evidence:** `POST /auth/google` answers `Session & { linked }` ([api-contract §5](../../api/api-contract.md#5-endpoints)): `linked` says it has just joined Google to an existing account, but nothing says it has just created one. So the web welcomes an account registered by email ("Welcome Sara, your account is ready", [design 05-auth-flow](../../design/SCREENS.md)) and cannot welcome one Google creates; F-5b3b changed no API and shows no welcome there.

**Resolves when:** the answer says the account was created (a `created` flag beside `linked`) and the Google sign-in welcomes it as registration does; or the owner accepts no welcome after a first Google sign-in.
