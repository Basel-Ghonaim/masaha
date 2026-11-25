import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubLocalStorage } from '../../../../test/fakeStorage';
import { dropReport, HOLD_MS, holdReport, takeReport } from './reportIntent';

const NAME = { text: 'Masaha Hub' };

afterEach(() => {
  dropReport();
  vi.unstubAllGlobals();
});

describe('the report a guest pressed', () => {
  it('is held for its space and taken once', () => {
    holdReport('masaha-hub', NAME);

    expect(takeReport('masaha-hub')).toBe(true);
    expect(takeReport('masaha-hub')).toBe(false);
  });

  it('is not taken for another space, and stays held for its own', () => {
    holdReport('masaha-hub', NAME);

    expect(takeReport('old-hub')).toBe(false);
    expect(takeReport('masaha-hub')).toBe(true);
  });

  it('is nothing to take once dropped, or when none was held', () => {
    expect(takeReport('masaha-hub')).toBe(false);
    holdReport('masaha-hub', NAME);
    dropReport();

    expect(takeReport('masaha-hub')).toBe(false);
  });

  it('lets go of it once its round trip is over: 15 minutes after it was held', () => {
    vi.useFakeTimers();
    try {
      expect(HOLD_MS).toBe(15 * 60 * 1000);
      holdReport('masaha-hub', NAME);
      vi.advanceTimersByTime(HOLD_MS - 1);
      expect(takeReport('masaha-hub')).toBe(true);

      holdReport('masaha-hub', NAME);
      vi.advanceTimersByTime(HOLD_MS);
      expect(takeReport('masaha-hub')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps the space’s name with it in the browser’s storage, for the reset link’s page', () => {
    const items = stubLocalStorage();

    holdReport('masaha-hub', { text: 'Masaha Hub', lang: 'en', dir: 'ltr' });

    expect(JSON.parse(items.get('masaha.heldIntent') ?? 'null')).toMatchObject({
      kind: 'report',
      slug: 'masaha-hub',
      name: { text: 'Masaha Hub', lang: 'en', dir: 'ltr' },
    });
  });
});
