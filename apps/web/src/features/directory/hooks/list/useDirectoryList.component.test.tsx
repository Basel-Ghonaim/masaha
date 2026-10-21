import type { DirectorySpace } from '@masaha/shared/directory';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation, useNavigate } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useDirectoryList } from './useDirectoryList';

const space = (id: number): DirectorySpace => ({
  id,
  slug: `space-${String(id)}`,
  nameEn: `Space ${String(id)}`,
  nameAr: null,
  area: { id: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  days: null,
  cover: null,
  liveStatus: 'AVAILABLE',
});

/** A page of the list, as the server answers it. */
function page(spaces: DirectorySpace[], { current = 1, total = 1, records = spaces.length } = {}) {
  return {
    status: 200,
    data: {
      success: true,
      data: spaces,
      meta: {
        currentPage: current,
        limit: 20,
        totalPages: total,
        totalRecords: records,
        hasNextPage: current < total,
        hasPreviousPage: current > 1,
      },
    },
  } satisfies FakeAnswer;
}

/** The list at `path`, the fake server answering each request with `answer`. */
function renderList(path: string, answer: Parameters<typeof fakeTransport>[0]) {
  const requests = fakeTransport(answer);
  const Query = queryWrapper();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Query>
      <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
    </Query>
  );
  const rendered = renderHook(
    () => ({ list: useDirectoryList(), search: useLocation().search, navigate: useNavigate() }),
    { wrapper },
  );
  return { ...rendered, requests };
}

beforeEach(() => {
  startPreferences('ar');
});

afterEach(() => {
  restoreTransport();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useDirectoryList', () => {
  it('shows skeletons while the first page loads, then the cards', async () => {
    const { result } = renderList('/spaces', () => page([space(1), space(2)]));

    expect(result.current.list.results.state).toBe('loading');
    expect(result.current.list.count).toBe('');
    await waitFor(() => {
      expect(result.current.list.results.state).toBe('ready');
    });
    expect(result.current.list.results.cards.map((card) => card.slug)).toEqual([
      'space-1',
      'space-2',
    ]);
    expect(result.current.list.pagination).toBeNull();
  });

  it('a failure says so with its reference, and «إعادة المحاولة» asks again', async () => {
    const { result, requests } = renderList('/spaces', (_request, index) =>
      index === 0 ? refused(404, { type: 'not_found' }) : page([space(1)]),
    );

    await waitFor(() => {
      expect(result.current.list.results.state).toBe('failed');
    });
    const failure = result.current.list.results.failure;
    expect(failure?.title).toBe('تعذّر تحميل المساحات');
    expect(failure?.reference).toContain('req-1');
    expect(failure?.retry.label).toBe('إعادة المحاولة');

    act(() => {
      failure?.retry.run();
    });
    await waitFor(() => {
      expect(result.current.list.results.state).toBe('ready');
    });
    expect(requests).toHaveLength(2);
  });

  it('no connection says so, not a server’s failure', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { result } = renderList('/spaces', () => ({ failure: 'ERR_NETWORK' }));

    // The transport tries a GET twice more, after 1 s and 2 s, before it gives up.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    await waitFor(() => {
      expect(result.current.list.results.state).toBe('failed');
    });
    expect(result.current.list.results.failure?.line).toBe(
      'لا يوجد اتصال. تحقّق من الإنترنت وحاول مرة أخرى.',
    );
    expect(result.current.list.results.failure?.reference).toBeNull();
  });

  it('tells an empty directory from no match; only no match offers clearing the filters', async () => {
    const empty = renderList('/spaces', () => page([]));
    await waitFor(() => {
      expect(empty.result.current.list.results.state).toBe('empty');
    });
    expect(empty.result.current.list.results.empty).toEqual({
      title: 'لا توجد مساحات في الدليل بعد',
      text: 'نضيف المساحات تباعًا؛ عد قريبًا.',
    });
    empty.unmount();
    restoreTransport();

    const none = renderList('/spaces?verified=1&q=Focus', () => page([]));
    await waitFor(() => {
      expect(none.result.current.list.results.state).toBe('noMatch');
    });
    expect(none.result.current.list.results.noMatch.clear.label).toBe('مسح الفلاتر');
    act(() => {
      none.result.current.list.results.noMatch.clear.run();
    });
    expect(none.result.current.search).toBe('');
  });

  it('keeps the cards while the next page loads, marked busy', async () => {
    let release: (answer: FakeAnswer) => void = () => undefined;
    const { result } = renderList('/spaces', (request) =>
      (request.params as { page?: number }).page === 2
        ? new Promise<FakeAnswer>((resolve) => {
            release = resolve;
          })
        : page([space(1)], { total: 2, records: 21 }),
    );
    await waitFor(() => {
      expect(result.current.list.results.state).toBe('ready');
    });

    expect(result.current.list.results.busy).toBe(false);
    expect(result.current.list.pagination?.next.search).toBe('?page=2');

    act(() => {
      void result.current.navigate('/spaces?page=2');
    });
    await waitFor(() => {
      expect(result.current.list.results.busy).toBe(true);
    });
    expect(result.current.list.results.state).toBe('ready');
    expect(result.current.list.results.cards.map((card) => card.slug)).toEqual(['space-1']);

    act(() => {
      release(page([space(21)], { current: 2, total: 2, records: 21 }));
    });
    await waitFor(() => {
      expect(result.current.list.results.cards.map((card) => card.slug)).toEqual(['space-21']);
    });
    expect(result.current.list.results.busy).toBe(false);
    expect(result.current.list.page).toBe(2);
  });

  it('a page past the last shows the last', async () => {
    const { result } = renderList('/spaces?page=5', (request) => {
      const asked = (request.params as { page?: number }).page ?? 1;
      return asked === 5
        ? page([], { current: 5, total: 2, records: 21 })
        : page([space(21)], { current: 2, total: 2, records: 21 });
    });

    await waitFor(() => {
      expect(result.current.search).toBe('?page=2');
    });
    await waitFor(() => {
      expect(result.current.list.results.state).toBe('ready');
    });
    expect(result.current.list.page).toBe(2);
  });

  it('counts the Strip’s spaces, or the matching ones once a filter or a search narrows them', async () => {
    const all = renderList('/spaces', () => page([space(1)], { total: 2, records: 21 }));
    await waitFor(() => {
      expect(all.result.current.list.count).toBe('21 مساحة في قطاع غزة');
    });
    all.unmount();
    restoreTransport();

    const narrowed = renderList('/spaces?area=2', () => page([space(1), space(2)]));
    await waitFor(() => {
      expect(narrowed.result.current.list.count).toBe('مساحتان مطابقتان');
    });
  });
});
