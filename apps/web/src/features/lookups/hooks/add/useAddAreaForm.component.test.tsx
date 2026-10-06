import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useAddAreaForm } from './useAddAreaForm';

/** The form for a new area of governorate 2, its writes answered by `write`. */
function renderForm(write: () => FakeAnswer) {
  const onSaved = vi.fn();
  const requests = fakeTransport((request) => (request.method === 'get' ? ok([]) : write()));
  const { result } = renderHook(() => useAddAreaForm({ governorateId: 2, onSaved }), {
    wrapper: queryWrapper(),
  });
  const form = () => result.current;
  const fill = async () => {
    await act(async () => {
      await form()
        .field('nameAr')
        .onChange({ target: { name: 'nameAr', value: 'الدرج' } });
      await form()
        .field('nameEn')
        .onChange({ target: { name: 'nameEn', value: 'Ad-Daraj' } });
    });
  };
  return { form, fill, requests, onSaved };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useAddAreaForm', () => {
  it('adds the area to its governorate with its two names, and closes the sheet', async () => {
    const { form, fill, requests, onSaved } = renderForm(() =>
      ok({ id: 10, governorateId: 2, nameAr: 'الدرج', nameEn: 'Ad-Daraj', isActive: true }, 201),
    );
    expect(form().active).toBeUndefined();
    await fill();

    act(() => {
      form().submit();
    });

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
    expect(bodyOf(requests[0])).toEqual({ governorateId: 2, nameAr: 'الدرج', nameEn: 'Ad-Daraj' });
  });

  it('puts a taken Arabic name on its field, in the governorate’s words', async () => {
    const { form, fill } = renderForm(() =>
      refused(409, { type: 'conflict', errors: { nameAr: ['not_unique'] } }),
    );
    await fill();

    act(() => {
      form().submit();
    });

    await waitFor(() => {
      expect(form().errors.nameAr).toBe('Another area of this governorate has this Arabic name');
    });
  });
});
