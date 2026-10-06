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
import type { LookupFormView } from '../../types/LookupFormView';
import { useGovernoratesQuery } from '../list/useGovernoratesQuery';
import { useAddGovernorateForm } from './useAddGovernorateForm';

/**
 * The form beside the list it adds to, as on the page, its writes answered by `write`. `onSaved`
 * records how many times the list had been fetched when the sheet was closed.
 */
function renderForm(write: () => FakeAnswer) {
  const requests = fakeTransport((request) => (request.method === 'get' ? ok([]) : write()));
  const lists = () => requests.filter(({ method }) => method === 'get').length;
  const onSaved = vi.fn(() => lists());
  const { result } = renderHook(
    () => {
      useGovernoratesQuery();
      return useAddGovernorateForm({ onSaved });
    },
    { wrapper: queryWrapper() },
  );
  return { result, requests, onSaved };
}

/** Types `value` into the field `name`, as the input would. */
async function type(form: () => LookupFormView, name: 'nameAr' | 'nameEn', value: string) {
  await act(async () => {
    await form().field(name).onChange({ target: { name, value } });
  });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useAddGovernorateForm', () => {
  it('adds the governorate with its two names only, and closes once the list is fetched again', async () => {
    const { result, requests, onSaved } = renderForm(() =>
      ok({ id: 9, nameAr: 'محافظة جديدة', nameEn: 'New', isActive: true }, 201),
    );
    const form = () => result.current;

    expect(form().active).toBeUndefined();
    await type(form, 'nameAr', 'محافظة جديدة');
    await type(form, 'nameEn', 'New');
    act(() => {
      form().submit();
    });

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
    expect(onSaved).toHaveReturnedWith(2);
    expect(requests.map(({ method }) => method)).toEqual(['get', 'post', 'get']);
    expect(bodyOf(requests[1])).toEqual({ nameAr: 'محافظة جديدة', nameEn: 'New' });
  });

  it('names each empty field with its own line, and sends nothing', async () => {
    const { result, requests, onSaved } = renderForm(() => ok({}));

    act(() => {
      result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.errors).toEqual({
        nameAr: 'Enter the Arabic name',
        nameEn: 'Enter the English name',
      });
    });
    expect(requests.filter(({ method }) => method !== 'get')).toHaveLength(0);
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('puts a taken Arabic name on its field, with the form’s own line, and stays open', async () => {
    const { result, onSaved } = renderForm(() =>
      refused(409, { type: 'conflict', errors: { nameAr: ['not_unique'] } }),
    );
    const form = () => result.current;
    await type(form, 'nameAr', 'محافظة غزة');
    await type(form, 'nameEn', 'Gaza City');

    act(() => {
      form().submit();
    });

    await waitFor(() => {
      expect(form().errors.nameAr).toBe('Another governorate has this Arabic name');
    });
    expect(form().failure).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });

  it('shows any other refusal as the form’s failure, titled as a save', async () => {
    const { result } = renderForm(() => refused(403, { type: 'forbidden' }));
    const form = () => result.current;
    await type(form, 'nameAr', 'محافظة جديدة');
    await type(form, 'nameEn', 'New');

    act(() => {
      form().submit();
    });

    await waitFor(() => {
      expect(form().failure).toMatchObject({
        kind: 'refused',
        title: 'We couldn’t save',
        message: 'You don’t have permission to do this.',
      });
    });
  });
});
