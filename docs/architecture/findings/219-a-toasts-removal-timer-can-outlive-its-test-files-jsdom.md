# 219. A toast's removal timer can outlive its test file's jsdom

**Status:** Open · **Date:** 2026-11-12

**Evidence:** CI's first `test:component` run on #143 (run 43036550165, attempt 1, head `29a25054`) passed all 2083 tests, then failed on one unhandled error: `ReferenceError: window is not defined`, from sonner's removal timer (`Timeout._onTimeout` → `dispatchSetState`), attributed to `apps/web/src/features/spaces/hooks/delete/useDeleteSpace.component.test.tsx`. Its `afterEach` dismisses the toasts, as every test file that shows one does; sonner removes a dismissed toast after a short timer, and that timer fired once the file's jsdom was gone. The file and `useDeleteSpace` were unchanged by #143. The re-run passed; the error was not seen in the local runs, nor in the logs of CI's last fifteen failed runs.

**Resolves when:** a test file that shows toasts leaves no toast timer running once its environment is torn down (the shared test setup removing the toasts, or waiting out their removal, rather than only dismissing them), and CI has run the component lane repeatedly without the error; or the owner accepts it.
