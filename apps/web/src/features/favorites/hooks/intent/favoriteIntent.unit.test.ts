import { afterEach, describe, expect, it, vi } from 'vitest';
import { dropFavorite, HOLD_MS, holdFavorite, takeFavorite } from './favoriteIntent';

afterEach(() => {
  dropFavorite();
});

describe('the favourite a guest pressed', () => {
  it('is held and taken once', () => {
    holdFavorite({ spaceId: 7, name: { text: 'Masaha Hub' } });

    expect(takeFavorite()).toEqual({ spaceId: 7, name: { text: 'Masaha Hub' } });
    expect(takeFavorite()).toBeNull();
  });

  it('is nothing to take once dropped, or when none was held', () => {
    expect(takeFavorite()).toBeNull();
    holdFavorite({ spaceId: 7, name: { text: 'Masaha Hub' } });
    dropFavorite();

    expect(takeFavorite()).toBeNull();
  });

  it('lets go of it once its round trip is over: 15 minutes after it was held', () => {
    vi.useFakeTimers();
    try {
      expect(HOLD_MS).toBe(15 * 60 * 1000);
      holdFavorite({ spaceId: 7, name: { text: 'Masaha Hub' } });
      vi.advanceTimersByTime(HOLD_MS - 1);
      holdFavorite({ spaceId: 8, name: { text: 'Old Hub' } });
      vi.advanceTimersByTime(HOLD_MS - 1);
      expect(takeFavorite()).toEqual({ spaceId: 8, name: { text: 'Old Hub' } });

      holdFavorite({ spaceId: 7, name: { text: 'Masaha Hub' } });
      vi.advanceTimersByTime(HOLD_MS);
      expect(takeFavorite()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
