import type { AdminAmenity } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { bodyOf, fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useAmenitiesQuery } from '../list/useAmenitiesQuery';
import { useEditAmenityForm } from './useEditAmenityForm';

const INTERNET: AdminAmenity = {
  id: 4,
  key: 'internet',
  nameAr: 'إنترنت',
  nameEn: 'Internet',
  icon: 'sun',
  isActive: true,
  isFilterable: false,
};

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useEditAmenityForm', () => {
  it('starts from the amenity as it stands: its icon chosen, its filter and Active switches', () => {
    fakeTransport(() => ok([]));
    const { result } = renderHook(
      () => useEditAmenityForm({ amenity: INTERNET, onSaved: vi.fn() }),
      { wrapper: queryWrapper() },
    );

    expect(result.current.icon).toMatchObject({ label: 'Icon', value: 'sun', disabled: false });
    expect(result.current.icon.options).toEqual([
      { value: 'wifi', label: 'Wi-Fi' },
      { value: 'zap', label: 'Lightning' },
      { value: 'sun', label: 'Sun' },
      { value: 'plug-zap', label: 'Power plug' },
      { value: 'coffee', label: 'Coffee cup' },
      { value: 'users', label: 'People' },
      { value: 'presentation', label: 'Presentation board' },
      { value: 'graduation-cap', label: 'Graduation cap' },
    ]);
    expect(result.current.filter).toMatchObject({
      label: 'In filters',
      hint: 'Offered in the directory’s filter.',
      checked: false,
    });
    expect(result.current.active).toMatchObject({ label: 'Active', checked: true });
  });

  it('saves its names, icon and both flags, and closes the sheet once the list is fetched again', async () => {
    const onSaved = vi.fn();
    const listHeld = deferred<FakeAnswer>();
    let lists = 0;
    const requests = fakeTransport((request) => {
      if (request.method !== 'get') {
        return ok({ ...INTERNET, icon: 'coffee', isFilterable: true, isActive: false });
      }
      lists += 1;
      return lists === 1 ? ok([INTERNET]) : listHeld.promise;
    });
    // The form, beside the list it changes, as the section shows them.
    const { result } = renderHook(
      () => ({
        list: useAmenitiesQuery(),
        form: useEditAmenityForm({ amenity: INTERNET, onSaved }),
      }),
      { wrapper: queryWrapper() },
    );
    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true);
    });

    act(() => {
      result.current.form.icon.choose('coffee');
      result.current.form.filter.toggle(true);
      result.current.form.active?.toggle(false);
    });
    expect(result.current.form.icon.value).toBe('coffee');
    act(() => {
      result.current.form.submit();
    });

    await waitFor(() => {
      expect(lists).toBe(2);
    });
    expect(bodyOf(requests.find(({ method }) => method === 'patch'))).toEqual({
      nameAr: 'إنترنت',
      nameEn: 'Internet',
      icon: 'coffee',
      isFilterable: true,
      isActive: false,
    });
    expect(result.current.form.isPending).toBe(true);
    expect(onSaved).not.toHaveBeenCalled();

    listHeld.resolve(ok([]));
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
  });

  it('chooses no icon outside the shared set', () => {
    fakeTransport(() => ok([]));
    const { result } = renderHook(
      () => useEditAmenityForm({ amenity: INTERNET, onSaved: vi.fn() }),
      { wrapper: queryWrapper() },
    );

    act(() => {
      result.current.icon.choose('moon');
    });

    expect(result.current.icon.value).toBe('sun');
  });
});
