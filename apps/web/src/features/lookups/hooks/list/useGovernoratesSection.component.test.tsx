import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useGovernoratesSection } from './useGovernoratesSection';

const GAZA: AdminGovernorateWithAreas = {
  id: 2,
  nameAr: 'محافظة غزة',
  nameEn: 'Gaza City',
  isActive: true,
  areas: [],
};

/** The hook, with the governorates answered by `answer`. */
function renderSection(answer: () => FakeAnswer | Promise<FakeAnswer>) {
  const requests = fakeTransport(answer);
  const rendered = renderHook(() => useGovernoratesSection(), { wrapper: queryWrapper() });
  return { ...rendered, requests };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useGovernoratesSection', () => {
  it('is loading until the governorates arrive, then holds them in order', async () => {
    const answer = deferred<FakeAnswer>();
    const { result } = renderSection(() => answer.promise);

    expect(result.current.status).toBe('loading');
    expect(result.current.loadingLabel).toBe('Loading');

    answer.resolve(ok([GAZA, { ...GAZA, id: 3, nameEn: 'Rafah' }]));
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(result.current.governorates.map(({ nameEn }) => nameEn)).toEqual(['Gaza City', 'Rafah']);
  });

  it('is empty when there are no governorates, with the words to say so', async () => {
    const { result } = renderSection(() => ok([]));

    await waitFor(() => {
      expect(result.current.status).toBe('empty');
    });
    expect(result.current.empty).toEqual({
      title: 'No governorates yet',
      description: 'Add the first governorate, then its areas.',
    });
  });

  it('fails with the refusal’s line, and its retry asks again', async () => {
    let calls = 0;
    const { result, requests } = renderSection(() => {
      calls += 1;
      return calls === 1 ? refused(403, { type: 'forbidden' }) : ok([GAZA]);
    });

    await waitFor(() => {
      expect(result.current.status).toBe('error');
    });
    expect(result.current.failure).toMatchObject({
      title: 'We couldn’t load the governorates',
      message: 'You don’t have permission to do this.',
      retryLabel: 'Try again',
    });

    act(() => {
      result.current.failure.retry();
    });
    await waitFor(() => {
      expect(result.current.status).toBe('ready');
    });
    expect(requests.map(({ url }) => url)).toEqual(['/admin/governorates', '/admin/governorates']);
  });
});
