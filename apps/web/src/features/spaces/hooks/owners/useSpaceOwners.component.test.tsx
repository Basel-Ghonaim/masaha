import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { useSpaceOwners } from './useSpaceOwners';

afterEach(() => {
  restoreTransport();
});

describe('useSpaceOwners', () => {
  it('names the space’s active owners from the managed space read', async () => {
    const requests = fakeTransport(() =>
      ok({
        id: 7,
        owners: [
          { id: 14, name: 'Ahmad' },
          { id: 16, name: 'Mona' },
        ],
      }),
    );
    const { result } = renderHook(() => useSpaceOwners(7), { wrapper: queryWrapper() });

    await waitFor(() => {
      expect(result.current).toEqual([
        { id: 14, name: 'Ahmad' },
        { id: 16, name: 'Mona' },
      ]);
    });
    expect(requests.map((request) => request.url)).toEqual(['/manage/spaces/7']);
  });

  it('names none while it loads or when the read fails', async () => {
    const requests = fakeTransport(() => refused(403, { type: 'forbidden' }));
    const { result } = renderHook(() => useSpaceOwners(7), { wrapper: queryWrapper() });

    expect(result.current).toEqual([]);
    await waitFor(() => {
      expect(requests).toHaveLength(1);
    });
    expect(result.current).toEqual([]);
  });
});
