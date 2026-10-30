import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { appError } from '../../../test/fakeSession';
import { startPreferences } from '../../../test/startPreferences';
import { useLoadFailure } from './useLoadFailure';

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useLoadFailure', () => {
  it('says offline in its own words when no answer came back', () => {
    const lost = appError('network', 0);
    const { result } = renderHook(() => useLoadFailure(lost, () => undefined));

    expect(result.current).toMatchObject({
      offline: true,
      title: 'No internet connection',
      message: 'The data will appear when you’re back online.',
      retryLabel: 'Try again',
    });
  });

  it('says the overview could not load on any other failure', () => {
    const refused = appError('forbidden', 403);
    const { result } = renderHook(() => useLoadFailure(refused, () => undefined));

    expect(result.current.offline).toBe(false);
    expect(result.current.title).toBe('Couldn’t load the overview');
  });
});
