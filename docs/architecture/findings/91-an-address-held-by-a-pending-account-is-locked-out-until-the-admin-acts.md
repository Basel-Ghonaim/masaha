# 91. An address held by a pending account is locked out until the admin acts

**Status:** Open · **Date:** 2026-10-18

**Evidence:** an owner may create reception accounts for any free address (10 an hour), and the admin creates owners the same way. While such an account's temporary password is pending (and an expired one stays pending), its address cannot register (`EMAIL_TAKEN`), reset (no email while pending) or sign in with Google (`GOOGLE_LINK_NOT_ALLOWED`) ([security › Passwords](../../backend/security.md#passwords), #90). Before #90 the holder of an address someone else registered could take it back by a reset or a Google link; that path is now closed on purpose, and nothing frees the address but the admin. Found in #90's review.

**Resolves when:** the owner decides whether an expired pending account frees its address, or the admin gets a way to free one.
