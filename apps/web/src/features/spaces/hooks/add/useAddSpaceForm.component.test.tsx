import type { AdminSpace } from '@masaha/shared/spaces';
import { api, createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
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
import { startPreferences } from '../../../../test/startPreferences';
import type { ProfileValues } from '../../types/ProfileValues';
import { useAddSpaceForm } from './useAddSpaceForm';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

/** The space the server creates: only what the toast and the tests read matters. */
const CREATED = { id: 7, slug: 'focus-hub', nameEn: 'Focus Hub', nameAr: null } as AdminSpace;

/** The toast whose title reads `text`. */
const toastTitled = (text: string) =>
  screen.findByText(
    (_content, element) =>
      element?.hasAttribute('data-title') === true && element.textContent === text,
  );

/**
 * The form's hook alone, as the add page holds it: the admin's list is not mounted there. The server
 * answers the list with `list` and the creation with `create`.
 */
function renderForm(
  create: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ok(CREATED, 201),
  list: () => FakeAnswer | Promise<FakeAnswer> = () => ok([]),
) {
  const requests = fakeTransport((request) =>
    request.method === 'get' ? list() : create(request),
  );
  render(<Toaster label="Notifications" closeLabel="Close notification" />);
  const client = createQueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const onCreated = vi.fn();
  const rendered = renderHook(() => ({ form: useAddSpaceForm({ onCreated }) }), { wrapper });
  return { ...rendered, requests, onCreated, client };
}

type Rendered = ReturnType<typeof renderForm>['result'];

/** Types `value` into the form's text field `name`. */
async function type(result: Rendered, name: Exclude<keyof ProfileValues, 'areaId'>, value: string) {
  await act(async () => {
    await result.current.form.field(name).onChange({ target: { name, value } });
  });
}

/** Fills what the contract requires: the English name, the area, the Arabic address and the pin. */
async function fillRequired(result: Rendered, coordinates = '31.5205, 34.4535') {
  await type(result, 'nameEn', 'Focus Hub');
  act(() => {
    result.current.form.area.onValueChange(11);
  });
  await type(result, 'addressAr', 'شارع النصر');
  await type(result, 'location', coordinates);
}

function submit(result: Rendered) {
  act(() => {
    result.current.form.submit();
  });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('useAddSpaceForm', () => {
  it('sends the profile with its blank optional fields left out and the pin read from its coordinates', async () => {
    const { result, requests } = renderForm();
    await fillRequired(result);
    await type(result, 'nameAr', '   ');
    await type(result, 'landmarkEn', 'Near the junction');

    submit(result);

    await waitFor(() => {
      expect(requests.filter(({ method }) => method === 'post')).toHaveLength(1);
    });
    const post = requests.find(({ method }) => method === 'post');
    expect(post).toMatchObject({ url: '/admin/spaces' });
    expect(bodyOf(post)).toEqual({
      nameEn: 'Focus Hub',
      areaId: 11,
      addressAr: 'شارع النصر',
      landmarkEn: 'Near the junction',
      location: { lat: 31.5205, lng: 34.4535 },
    });
  });

  it('once created, fetches the admin’s list it left and waits for it, says so by name, then hands over', async () => {
    const listAgain = deferred<FakeAnswer>();
    let lists = 0;
    const { result, onCreated, client } = renderForm(undefined, () =>
      ++lists === 1 ? ok([]) : listAgain.promise,
    );
    // The list the admin came from, in the cache but not mounted: the add page shows no list.
    await act(() =>
      client.query({
        queryKey: ['admin', 'space-links', 'spaces'],
        queryFn: () => api.get('/admin/spaces'),
      }),
    );
    expect(lists).toBe(1);
    await fillRequired(result);

    submit(result);

    await waitFor(() => {
      expect(lists).toBe(2);
    });
    expect(result.current.form.isPending).toBe(true);
    expect(onCreated).not.toHaveBeenCalled();

    await act(async () => {
      listAgain.resolve(ok([]));
      await listAgain.promise;
    });
    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });
    expect(await toastTitled('Focus Hub added')).toBeInTheDocument();
  });

  it('places the pin from the map, and sends it as its coordinates read, to five decimals', async () => {
    const { result, requests } = renderForm();
    await fillRequired(result, '');
    expect(result.current.form.map.value).toBeNull();

    act(() => {
      result.current.form.map.onChange({ lat: 31.520512345, lng: 34.4535 });
    });
    expect(result.current.form.map.value).toEqual({ lat: 31.52051, lng: 34.4535 });
    submit(result);

    await waitFor(() => {
      expect(requests.some(({ method }) => method === 'post')).toBe(true);
    });
    expect(bodyOf(requests.find(({ method }) => method === 'post'))).toMatchObject({
      location: { lat: 31.52051, lng: 34.4535 },
    });
  });

  it('clears the pin’s refusal once the map places it', async () => {
    const { result } = renderForm();
    await fillRequired(result, '');
    submit(result);
    await waitFor(() => {
      expect(result.current.form.errors.location).toBeDefined();
    });

    act(() => {
      result.current.form.map.onChange({ lat: 31.5, lng: 34.45 });
    });

    await waitFor(() => {
      expect(result.current.form.errors.location).toBeUndefined();
    });
  });

  it('moves the pin to coordinates typed or pasted in their field', async () => {
    const { result } = renderForm();

    await type(result, 'location', '31.3, 34.3');

    expect(result.current.form.map.value).toEqual({ lat: 31.3, lng: 34.3 });
  });

  it.each([
    ['', 'Place the pin on the map, or enter its coordinates'],
    ['31.52', 'Enter the coordinates as the latitude, then the longitude'],
    ['32.08, 34.78', 'This point is outside the Gaza Strip'],
  ])('refuses the coordinates %j on their field, and sends nothing', async (coordinates, line) => {
    const { result, requests } = renderForm();
    await fillRequired(result, coordinates);

    submit(result);

    await waitFor(() => {
      expect(result.current.form.errors.location).toBe(line);
    });
    expect(requests.some(({ method }) => method === 'post')).toBe(false);
  });

  it('asks for what the contract requires, in the form’s own words', async () => {
    const { result } = renderForm();

    submit(result);

    await waitFor(() => {
      expect(result.current.form.errors).toEqual({
        nameEn: 'Enter the English name',
        areaId: 'Choose the area',
        addressAr: 'Enter the Arabic address',
        location: 'Place the pin on the map, or enter its coordinates',
      });
    });
  });

  it('puts the server’s field errors on their fields', async () => {
    const { result } = renderForm(() =>
      refused(422, {
        type: 'validation',
        errors: { nameEn: ['invalid_format'], areaId: ['invalid_choice'] },
      }),
    );
    await fillRequired(result);

    submit(result);

    await waitFor(() => {
      expect(result.current.form.errors).toEqual({
        nameEn: 'Use Latin letters or digits in the English name',
        areaId: 'This area is no longer available. Choose another.',
      });
    });
    expect(result.current.form.failure).toBeNull();
  });

  it('says plainly when another creation took the name’s address at the same moment (409)', async () => {
    const { result, onCreated } = renderForm(() => refused(409, { type: 'conflict' }));
    await fillRequired(result);

    submit(result);

    await waitFor(() => {
      expect(result.current.form.failure).toMatchObject({
        kind: 'refused',
        title: 'Couldn’t add the space',
        message: 'Another space with this name was added at the same moment. Add it again.',
      });
    });
    expect(onCreated).not.toHaveBeenCalled();
  });

  it('holds the submit while too many attempts count down (429)', async () => {
    const { result } = renderForm(() =>
      refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }),
    );
    await fillRequired(result);

    submit(result);

    await waitFor(() => {
      expect(result.current.form.blocked).toBe(true);
    });
    expect(result.current.form.failure).toMatchObject({ kind: 'rateLimit' });
  });
});
