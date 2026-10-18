# 82. The users feature keeps several operations flat

**Status:** Open · **Date:** 2026-10-18

**Evidence:** architecture §3 asks for one folder per operation under a feature's `hooks/` and
`components/`. `features/users` keeps several operations flat at the top of both
(`useAccount`, `useChangePassword`, `useForcedPasswordChangeForm`, `useSignOutAction`, and their
components), and the new one-time password dialog is the first to take its own
`temporary-password/` folders. The older files are left alone: moving them is a drive-by
refactor, and nothing here depends on them living in folders.

**Resolves when:** the flat files move into per-operation folders, or the owner accepts the flat
shape for a capability this small.