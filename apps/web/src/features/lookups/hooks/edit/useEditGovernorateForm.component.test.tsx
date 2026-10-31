import type { AdminGovernorate } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bodyOf, fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useEditGovernorateForm } from './useEditGovernorateForm';

const RAFAH: AdminGovernorate = { id: 3, nameAr: 'محافظة رفح', nameEn: 'Rafah', isActive: false };

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useEditGovernorateForm', () => {
  it('starts from the governorate as it stands, with no switch', () => {
    fakeTransport(() => ok([]));
    const { result } = renderHook(
      () => useEditGovernorateForm({ governorate: RAFAH, onSaved: vi.fn() }),
      { wrapper: queryWrapper() },
    );

    expect(result.current).not.toHaveProperty('active');
    expect(result.current).not.toHaveProperty('position');
  });

  it('saves its names, never its Active flag, and closes the sheet', async () => {
    const onSaved = vi.fn();
    const requests = fakeTransport((request) =>
      request.method === 'get' ? ok([]) : ok({ ...RAFAH, nameEn: 'Rafah Governorate' }),
    );
    const { result } = renderHook(() => useEditGovernorateForm({ governorate: RAFAH, onSaved }), {
      wrapper: queryWrapper(),
    });

    await act(async () => {
      await result.current
        .field('nameEn')
        .onChange({ target: { name: 'nameEn', value: 'Rafah Governorate' } });
    });
    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
    expect(bodyOf(requests.find(({ method }) => method === 'patch'))).toEqual({
      nameAr: 'محافظة رفح',
      nameEn: 'Rafah Governorate',
    });
  });
});
