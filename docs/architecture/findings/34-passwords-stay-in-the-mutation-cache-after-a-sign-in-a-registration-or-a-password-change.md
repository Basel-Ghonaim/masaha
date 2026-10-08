# 34. Passwords stay in the mutation cache after a sign-in, a registration or a password change

**Status:** Resolved · **Date:** 2026-10-06

**Evidence:** TanStack Query keeps a mutation's variables, and a refusal's error keeps the request that carried them (its cause's `config.data`), for the mutation's `gcTime`, five minutes by default, after it has no observer. `useSignIn`, `useRegister` and `useResetPassword` (`features/auth`, the last found by H-1's review) and `useChangePassword` (`features/users`) send a password as their variables and set no `gcTime`, so the password stays in the page's memory for five minutes after the form has gone, and a sign-in clears no cache ([architecture §3](../../frontend/architecture.md#react-query-in-a-feature)). `useCheckResetLink` and, since F-5b3b, `useGoogleSignIn` set `gcTime: 0` for the same reason.

**Resolves when:** each of the four sets `gcTime: 0`, with a test that the cache holds no password once the mutation is answered and its page has gone.

**Resolution (2026-10-06, H-1):** `useSignIn`, `useRegister`, `useResetPassword` and `useChangePassword` set `gcTime: 0`, each saying why, as `useGoogleSignIn` does. Each hook's test of a page that unmounts before the answer proves that the mutation cache is empty once the answer has arrived (`useResetPassword`'s is new); the four failed without `gcTime: 0`, the mutation still in the cache.
