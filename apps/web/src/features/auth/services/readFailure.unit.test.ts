import { describe, expect, it } from 'vitest';
import { appError } from '../../../test/fakeSession';
import { readFailure } from './readFailure';

describe('readFailure', () => {
  it.each([
    ['network', 0],
    ['timeout', 0],
  ] as const)('reads %s, no answer, as offline', (type, status) => {
    expect(readFailure(appError(type, status))).toBe('offline');
  });

  it.each([
    ['server', 500],
    ['forbidden', 403],
    ['rate_limit', 429],
  ] as const)('reads an answer of %s as the general error', (type, status) => {
    expect(readFailure(appError(type, status))).toBe('error');
  });
});
