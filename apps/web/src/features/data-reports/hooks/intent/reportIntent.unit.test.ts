import { afterEach, describe, expect, it, vi } from 'vitest';
import { dropReport, HOLD_MS, holdReport, takeReport } from './reportIntent';

afterEach(() => {
  dropReport();
});

describe('the report a guest pressed', () => {
  it('is held for its space and taken once', () => {
    holdReport('masaha-hub');

    expect(takeReport('masaha-hub')).toBe(true);
    expect(takeReport('masaha-hub')).toBe(false);
  });

  it('is not taken for another space, and stays held for its own', () => {
    holdReport('masaha-hub');

    expect(takeReport('old-hub')).toBe(false);
    expect(takeReport('masaha-hub')).toBe(true);
  });

  it('is nothing to take once dropped, or when none was held', () => {
    expect(takeReport('masaha-hub')).toBe(false);
    holdReport('masaha-hub');
    dropReport();

    expect(takeReport('masaha-hub')).toBe(false);
  });

  it('lets go of it once its round trip is over: 15 minutes after it was held', () => {
    vi.useFakeTimers();
    try {
      expect(HOLD_MS).toBe(15 * 60 * 1000);
      holdReport('masaha-hub');
      vi.advanceTimersByTime(HOLD_MS - 1);
      expect(takeReport('masaha-hub')).toBe(true);

      holdReport('masaha-hub');
      vi.advanceTimersByTime(HOLD_MS);
      expect(takeReport('masaha-hub')).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
