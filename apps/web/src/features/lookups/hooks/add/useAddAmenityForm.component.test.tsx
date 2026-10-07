import type { AdminAmenity } from '@masaha/shared/lookups';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { useAmenitiesQuery } from '../list/useAmenitiesQuery';
import { useAddAmenityForm } from './useAddAmenityForm';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const DRINKS: AdminAmenity = {
  id: 5,
  key: 'hot_drinks',
  nameAr: 'مشروبات ساخنة',
  nameEn: 'Hot drinks',
  icon: 'coffee',
  isActive: true,
  isFilterable: true,
};

/** The form beside the list it adds to, the server answering the list with [] and a write with `write`. */
async function renderForm(write: (request: Request) => FakeAnswer | Promise<FakeAnswer>) {
  const onSaved = vi.fn();
  const requests = fakeTransport((request) => (request.method === 'get' ? ok([]) : write(request)));
  const rendered = renderHook(
    () => ({ list: useAmenitiesQuery(), form: useAddAmenityForm({ onSaved }) }),
    { wrapper: queryWrapper() },
  );
  await waitFor(() => {
    expect(rendered.result.current.list.isSuccess).toBe(true);
  });
  return { ...rendered, requests, onSaved };
}

/** Types both names, as the user would. */
async function typeNames(
  form: ReturnType<typeof useAddAmenityForm>,
  nameAr: string,
  nameEn: string,
) {
  await act(async () => {
    await form.field('nameAr').onChange({ target: { name: 'nameAr', value: nameAr } });
    await form.field('nameEn').onChange({ target: { name: 'nameEn', value: nameEn } });
  });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('useAddAmenityForm', () => {
  it('starts with no icon chosen, in the filters, and with no Active switch', async () => {
    const { result } = await renderForm(() => ok(DRINKS, 201));

    expect(result.current.form.icon.value).toBe('');
    expect(result.current.form.filter.checked).toBe(true);
    expect(result.current.form.active).toBeUndefined();
  });

  it('asks for an icon, and sends nothing until one is chosen', async () => {
    const { result, requests } = await renderForm(() => ok(DRINKS, 201));
    await typeNames(result.current.form, 'مشروبات ساخنة', 'Hot drinks');

    await act(async () => {
      result.current.form.submit();
      await Promise.resolve();
    });

    await waitFor(() => {
      expect(result.current.form.errors.icon).toBe('Choose an icon');
    });
    expect(requests.filter(({ method }) => method === 'post')).toHaveLength(0);

    act(() => {
      result.current.form.icon.choose('coffee');
    });
    await waitFor(() => {
      expect(result.current.form.errors.icon).toBeUndefined();
    });
  });

  it('adds the amenity with its names, icon and filter flag, and closes the sheet once the list is fetched again', async () => {
    const listHeld = deferred<FakeAnswer>();
    let lists = 0;
    const onSaved = vi.fn();
    const requests = fakeTransport((request) => {
      if (request.method !== 'get') return ok(DRINKS, 201);
      lists += 1;
      return lists === 1 ? ok([]) : listHeld.promise;
    });
    const { result } = renderHook(
      () => ({ list: useAmenitiesQuery(), form: useAddAmenityForm({ onSaved }) }),
      { wrapper: queryWrapper() },
    );
    await waitFor(() => {
      expect(result.current.list.isSuccess).toBe(true);
    });
    await typeNames(result.current.form, 'مشروبات ساخنة', 'Hot drinks');

    act(() => {
      result.current.form.icon.choose('coffee');
      result.current.form.filter.toggle(false);
    });
    act(() => {
      result.current.form.submit();
    });

    await waitFor(() => {
      expect(lists).toBe(2);
    });
    expect(bodyOf(requests.find(({ method }) => method === 'post'))).toEqual({
      nameAr: 'مشروبات ساخنة',
      nameEn: 'Hot drinks',
      icon: 'coffee',
      isFilterable: false,
    });
    expect(onSaved).not.toHaveBeenCalled();

    listHeld.resolve(ok([DRINKS]));
    await waitFor(() => {
      expect(onSaved).toHaveBeenCalledOnce();
    });
  });

  it.each([
    {
      answer: refused(409, { type: 'conflict', errors: { nameEn: ['not_unique'] } }),
      line: 'Another amenity has this English name',
    },
    {
      answer: refused(422, { type: 'validation', errors: { nameEn: ['invalid_format'] } }),
      line: 'Use Latin letters or digits in the English name',
    },
  ])('puts the server’s $line on the English name', async ({ answer, line }) => {
    const { result, onSaved } = await renderForm(() => answer);
    await typeNames(result.current.form, 'مشروبات ساخنة', 'مشروبات');
    act(() => {
      result.current.form.icon.choose('coffee');
    });

    act(() => {
      result.current.form.submit();
    });

    await waitFor(() => {
      expect(result.current.form.errors.nameEn).toBe(line);
    });
    expect(result.current.form.failure).toBeNull();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
