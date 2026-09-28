import '@testing-library/jest-dom/vitest';
import 'vitest-axe/extend-expect';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

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
