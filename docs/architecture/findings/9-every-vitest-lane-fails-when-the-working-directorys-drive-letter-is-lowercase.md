# 9. Every Vitest lane fails when the working directory's drive letter is lowercase

**Status:** Resolved · **Date:** 2026-09-28

**Evidence:** during WI-9, `test:unit` and `test:component` twice failed every file before any test ran. The unit lane reported `TypeError: Cannot read properties of undefined (reading 'config')` at the file's first `describe`. The component lane reported `Vitest failed to find the current suite`.

The cause is the case of the drive letter in the working directory:
- From `c:\Users\…\masaha` (lowercase), `npm run test:unit -w @masaha/api` fails every file. `test:component` fails all 38 files.
- From `C:\Users\…\masaha`, the same commands pass.
- `lint` and `typecheck` pass either way.

Vitest itself prints the root as `C:/…`, while npm reports the working directory as `c:\…`. The likely mechanism is that the runner and the test files load `vitest` through the two spellings of the path. They then get two module instances, and the test file's `describe` finds no runner state. That mechanism is inferred, not traced.

Shells opened by an editor can start in a lowercase `c:\`, as this session's did at times. So a red lane there may not mean a regression, the harm finding 6 described. CI runs on Linux and is not affected.

**Resolves when:** the lanes pass whatever the drive letter's case. For example, the Vitest configs could normalise the root, or a Vitest release could fix it upstream. Until then, [setup.md](../../development/setup.md#commands) says to run the test lanes from a path with an uppercase drive letter.

**Resolution (2026-10-01, `fix/vitest-drive-letter`):**
- The mechanism, traced: the working directory does not matter; the path Vitest is started from does. npm puts `<cwd>\node_modules\.bin` on `PATH`, so from `c:\…` the worker loads Vitest's runtime from `file:///c:/…`. Vite resolves the test files' `vitest` import through the native realpath, which writes the drive letter in upper case: `file:///C:/…`. Node caches modules by URL, so the worker holds two Vitests, and the test files' `describe` finds no runner. Vitest's own guard against a second instance compares the paths case-sensitively, so it misses this. Normalising the root could not have fixed it.
- Each workspace's Vitest config loads a resolve hook into its test workers. The hook uppercases the drive letter of every `file:` URL, so both spellings are one module: [`apps/web/test/driveLetterHook.ts`](../../../apps/web/test/driveLetterHook.ts) and its twin [`apps/api/test/drive-letter-hook.ts`](../../../apps/api/test/drive-letter-hook.ts). On Linux no URL has a drive letter, so in CI the hook loads and changes nothing.
- All the lanes of both workspaces pass from `c:\…` and from `C:\…`, and the *Windows* note is gone from setup.md. No CI guard is possible, because CI runs on Linux; a regression makes every file fail, which shows on the first run.
- **Remove the hooks** when Vitest's guard compares paths case-insensitively, or Vitest loads one instance whatever the spelling it was started from. Vitest 5.0.3, the latest when checked, does neither.
