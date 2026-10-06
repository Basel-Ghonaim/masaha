import '@testing-library/jest-dom/vitest';
import 'vitest-axe/extend-expect';
import { cleanup, configure } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library waits 1 s by default for what a test finds, and under a full run Vite's first
// transform of a lazily imported page or shell can take longer (finding 28). 3 s holds under load
// and stays below Vitest's 5 s test timeout, so an element that never appears still fails with
// Testing Library's message and the screen it searched, not with a bare timeout.
configure({ asyncUtilTimeout: 3_000 });

// jsdom has no layout, no pointer capture and no ResizeObserver, and Radix's Select and positioned
// popups (Tooltip) call them. These stand-ins do nothing; they only let the components run.
Element.prototype.scrollIntoView = () => undefined;
Element.prototype.hasPointerCapture = () => false;
Element.prototype.releasePointerCapture = () => undefined;
globalThis.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// jsdom parses its default stylesheet on the first getComputedStyle, which getByRole reaches through
// every accessible-name check. Each test file gets a fresh jsdom, so without this the parse would
// land in the file's first test and count against that test's timeout: on a busy machine it alone
// pushed a test past 5 s. It is the environment's start-up, so it is paid here, before any test.
getComputedStyle(document.documentElement);

afterEach(() => {
  cleanup();
});
