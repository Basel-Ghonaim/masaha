import { describe, expect, it } from 'vitest';
import { classifyRouteError } from './classifyRouteError';

describe('classifyRouteError', () => {
  it.each([
    ['Chromium', 'Failed to fetch dynamically imported module: https://masaha.app/assets/x.js'],
    ['Firefox', 'error loading dynamically imported module: https://masaha.app/assets/x.js'],
    ['Safari', 'Importing a module script failed.'],
    ['Vite', 'Unable to preload CSS for /assets/x.css'],
  ])("is offline when a page's code could not be fetched (%s)", (_, message) => {
    expect(classifyRouteError(new TypeError(message), true)).toBe('offline');
  });

  it('is offline when the browser reports no connection, whatever the error', () => {
    expect(classifyRouteError(new Error('Something broke'), false)).toBe('offline');
  });

  it('is the general error for any other error while online', () => {
    expect(classifyRouteError(new Error('Something broke'), true)).toBe('error');
  });

  it('is the general error for a thrown value that is not an Error', () => {
    expect(classifyRouteError('Failed to fetch dynamically imported module', true)).toBe('error');
  });
});
