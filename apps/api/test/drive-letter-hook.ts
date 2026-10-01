import { registerHooks } from 'node:module';

// Loaded into every test worker by vitest.config.ts. Its twin is apps/web/test/driveLetterHook.ts;
// a change to one is made to both.
//
// On Windows, a Vitest started from a lowercase drive (c:\…, as npm does from such a working
// directory) loads its runtime from file:///c:/…, while Vite resolves the test files' `vitest` import
// through the native realpath to file:///C:/…. Node caches modules by URL, so the worker would hold
// two Vitests and the test files would see no runner (docs/architecture/findings.md, finding 9).
// Uppercasing the drive letter gives both spellings one URL. Elsewhere no URL has a drive letter.
//
// Remove this hook, and its twin, when Vitest's own guard compares paths case-insensitively or
// loads one instance whatever the launch spelling. Vitest 5.0.3 does not.
registerHooks({
  resolve(specifier, context, nextResolve) {
    const result = nextResolve(specifier, context);
    const url = result.url.replace(
      /^file:\/\/\/([a-z]):/,
      (_, drive: string) => `file:///${drive.toUpperCase()}:`,
    );
    return url === result.url ? result : { ...result, url };
  },
});
