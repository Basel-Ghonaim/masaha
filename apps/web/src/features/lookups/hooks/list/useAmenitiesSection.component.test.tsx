import type { AdminAmenity } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useAmenitiesSection } from './useAmenitiesSection';

const INTERNET: AdminAmenity = {
  id: 4,
  key: 'internet',
  nameAr: 'إنترنت',
  nameEn: 'Internet',
  icon: 'wifi',
  isActive: true,
  isFilterable: false,
};

/** The hook, with the amenities answered by `answer`. */
function renderSection(answer: () => FakeAnswer | Promise<FakeAnswer>) {
  const requests = fakeTransport(answer);
  const rendered = renderHook(() => useAmenitiesSection(), { wrapper: queryWrapper() });
  return { ...rendered, requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useAmenitiesSection', () => {
  it('is loading until the amenities arrive, then holds them in order, retired ones included', async () => {
    const answer = deferred<FakeAnswer>();
    const { result } = renderSection(() => answer.promise);

    expect(result.current.status).toBe('loading');
    expect(result.current.loadingLabel).toBe('Loading');

    answer.resolve(ok([INTERNET, { ...INTERNET, id: 5, nameEn: 'Hot drinks', isActive: false }]));
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.amenities.map(({ nameEn }) => nameEn)).toEqual([
      'Internet',
      'Hot drinks',
    ]);
    expect(result.current.title).toBe('Amenities');
  });

  it('is empty when there are no amenities, with the words to say so', async () => {
    const { result } = renderSection(() => ok([]));

    await waitFor(() => {
      expect(result.current.status).toBe('empty');
    });
    expect(result.current.empty).toEqual({
      title: 'No amenities yet',
      description: 'Add the first amenity.',
    });
  });

  it('fails with the refusal’s line and its reference, and its retry asks again', async () => {
    let calls = 0;
    const { result, requests } = renderSection(() => {
      calls += 1;
      return calls === 1 ? refused(403, { type: 'forbidden' }) : ok([INTERNET]);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.failure).toMatchObject({
      title: 'We couldn’t load the amenities',
      message: 'You don’t have permission to do this.',
      reference: expect.stringContaining('req-1') as string,
      retryLabel: 'Try again',
      blocked: false,
    });

    act(() => {
      result.current.failure.retry();
    });
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(requests.map(({ url }) => url)).toEqual(['/admin/amenities', '/admin/amenities']);
  });

  it('holds its retry while it waits out too many requests', async () => {
    const { result } = renderSection(() =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.failure).toMatchObject({
      message: 'Too many attempts. Try again in ⁦0:30⁩.',
      blocked: true,
    });
  });
});
