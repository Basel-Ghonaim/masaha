import type { AdminArea } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useEditAreaForm } from './useEditAreaForm';

const SHUJAIYYA: AdminArea = {
  id: 6,
  governorateId: 2,
  nameAr: 'الشجاعية',
  nameEn: 'Ash-Shuja’iyya',
  isActive: false,
};

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useEditAreaForm', () => {
  it('saves the area’s names as they stand, and never its Active flag', async () => {
    const onSaved = vi.fn();
    const requests = fakeTransport((request) =>
      request.method === 'get' ? ok([]) : ok(SHUJAIYYA),
    );
    const { result } = renderHook(() => useEditAreaForm({ area: SHUJAIYYA, onSaved }), {
      wrapper: queryWrapper(),
    });
    expect(result.current).not.toHaveProperty('active');

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
    expect(bodyOf(requests.find(({ method }) => method === 'patch'))).toEqual({
      nameAr: 'الشجاعية',
      nameEn: 'Ash-Shuja’iyya',
    });
  });

  it('puts a taken Arabic name on its field, in the governorate’s words', async () => {
    fakeTransport((request) =>
      request.method === 'get'
        ? ok([])
        : refused(409, { type: 'conflict', errors: { nameAr: ['not_unique'] } }),
    );
    const { result } = renderHook(() => useEditAreaForm({ area: SHUJAIYYA, onSaved: vi.fn() }), {
      wrapper: queryWrapper(),
    });

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.errors.nameAr).toBe(
        'Another area of this governorate has this Arabic name',
      );
    });
  });
});
