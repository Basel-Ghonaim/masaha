import type { AdminSpace } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Toaster,
  toast,
} from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { startPreferences } from '../../../../test/startPreferences';
import type { AmenitiesField } from '../../types/AmenitiesField';
import type { AreaField } from '../../types/AreaField';
import { SpaceEditor } from './SpaceEditor';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

// 10:00 in Gaza.
const NOW = new Date('2026-10-13T07:00:00Z');

/** A space just added: unverified, shown, its profile dated three days ago, its facts missing. */
const SPACE: AdminSpace = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: 'فوكس هب',
  descriptionAr: null,
  descriptionEn: null,
  areaId: 11,
  addressAr: 'شارع النصر',
  addressEn: null,
  landmarkAr: 'قرب المفترق',
  landmarkEn: null,
  location: { lat: 31.5195, lng: 34.447 },
  isHidden: false,
  isVerified: false,
  updatedAt: {
    profile: '2026-10-10T08:00:00Z',
    hours: null,
    prices: null,
    amenities: null,
    contacts: null,
  },
  staleGroups: [],
  missingGroups: ['hours', 'prices', 'amenities', 'contacts'],
  hours: null,
  prices: [],
  amenityIds: [],
  ownAmenities: [],
  contacts: [],
};

/** The space as the server holds it after the next write: dated now. */
const savedNow = (space: AdminSpace): AdminSpace => ({
  ...space,
  updatedAt: { ...space.updatedAt, profile: NOW.toISOString() },
});

// The page fills the area field from another capability; this one stands in for it.
const areaField: AreaField = ({ value, onValueChange, disabled, ref }) => (
  <Select
    value={value === null ? '' : String(value)}
    onValueChange={(option) => {
      onValueChange(Number(option));
    }}
    disabled={disabled}
  >
    <SelectTrigger ref={ref}>
      <SelectValue placeholder="Choose" />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="11">Al-Rimal</SelectItem>
    </SelectContent>
  </Select>
);

// The page fills the amenities' checklist from another capability; this one stands in for it, with
// two amenities, 1 and 3, to tick.
const amenitiesField: AmenitiesField = ({ label, value, onValueChange, disabled }) => (
  <fieldset aria-label={label}>
    {[1, 3].map((id) => (
      <label key={id}>
        <input
          type="checkbox"
          checked={value.includes(id)}
          disabled={disabled}
          onChange={(event) => {
            onValueChange(
              event.target.checked ? [...value, id] : value.filter((other) => other !== id),
            );
          }}
        />
        {`Amenity ${String(id)}`}
      </label>
    ))}
  </fieldset>
);

/**
 * The editor of space 7 at `/spaces/7`, beside another page, `/elsewhere`. The server answers the
 * space's read with `read` (the space as it is) and every write with `write`.
 */
function renderEditor({
  read = () => ok(SPACE),
  write = () => ok(savedNow(SPACE)),
}: {
  read?: () => FakeAnswer | Promise<FakeAnswer>;
  write?: (request: Request) => FakeAnswer | Promise<FakeAnswer>;
} = {}) {
  const requests = fakeTransport((request) => (request.method === 'get' ? read() : write(request)));
  const router = createMemoryRouter(
    [
      {
        path: '/spaces/7',
        element: (
          <SpaceEditor
            spaceId={7}
            areaField={areaField}
            areaName={(areaId) => `Area ${String(areaId)}`}
            amenitiesField={amenitiesField}
            amenityNames={(ids) => ids.map((id) => `Amenity ${String(id)}`).join(', ')}
            amenitiesListLink="/lookups?tab=amenities"
            publicLink={(slug) => `/spaces/${slug}`}
          />
        ),
      },
      { path: '/elsewhere', element: <p>Elsewhere</p> },
    ],
    { initialEntries: ['/spaces/7'] },
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Toaster label="Notifications" closeLabel="Close notification" />
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
  const writes = () => requests.filter((request) => request.method !== 'get');
  return { requests, writes, router };
}

/** The section whose title is `name`. */
const section = (name: string) =>
  screen.getByRole('heading', { level: 2, name }).closest('[data-slot=card]') as HTMLElement;

let observer: ReturnType<typeof fakeIntersectionObserver>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  startPreferences('en');
  observer = fakeIntersectionObserver();
});

afterEach(() => {
  restoreTransport();
  // The toasts' store outlives a test's render.
  act(() => {
    toast.dismiss();
  });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the space editor', () => {
  it('shows it is loading, then the space’s sections', async () => {
    renderEditor();

    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { level: 2, name: 'The space' })).toBeInTheDocument();
  });

  it('says the space could not be loaded, and loads it again on "Try again"', async () => {
    const user = userEvent.setup();
    let fail = true;
    renderEditor({ read: () => (fail ? refused(403, { type: 'forbidden' }) : ok(SPACE)) });

    expect(await screen.findByText('We couldn’t load the space')).toBeInTheDocument();
    fail = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));

    expect(await screen.findByRole('heading', { level: 2, name: 'The space' })).toBeInTheDocument();
  });

  it('shows the 404 for a space that does not exist or was deleted', async () => {
    renderEditor({ read: () => refused(404, { type: 'not_found' }) });

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
  });

  it('shows the 404 once a save finds the space deleted, and leaving no longer asks', async () => {
    const user = userEvent.setup();
    let deleted = false;
    const { router } = renderEditor({
      read: () => (deleted ? refused(404, { type: 'not_found' }) : ok(SPACE)),
      write: () => {
        deleted = true;
        return refused(404, { type: 'not_found' });
      },
    });
    await user.type(await screen.findByRole('textbox', { name: 'Name in English' }), ' Gaza');

    await user.click(within(section('The space')).getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('heading', { name: 'Page not found' })).toBeInTheDocument();
    await act(() => router.navigate('/elsewhere'));
    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
  });

  it('shows an unverified space’s state, whether it is hidden, and that each section saves alone', async () => {
    renderEditor({ read: () => ok({ ...SPACE, isHidden: true }) });

    expect(await screen.findByText('You’re editing an unverified space')).toBeInTheDocument();
    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('heads a space with missing groups with the five, a drawn section’s line a link to it', async () => {
    renderEditor();

    const checklist = await screen.findByRole('region', { name: 'Still missing' });
    expect(
      within(checklist)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual([
      'The spaceDone',
      'Opening hoursNot added yet',
      'PricesNot added yet',
      'AmenitiesNot added yet',
      'ContactsNot added yet',
    ]);
    expect(within(checklist).getByRole('link', { name: 'The space' })).toHaveAttribute(
      'href',
      '/spaces/7#profile',
    );
    expect(within(checklist).queryByRole('link', { name: 'Opening hours' })).toBeNull();
  });

  it('lists its sections in a navigation, the one in view marked', async () => {
    renderEditor();

    const navigation = await screen.findByRole('navigation', { name: 'Profile sections' });
    expect(
      within(navigation)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(['The space', 'Amenities', 'Contacts']);
    act(() => {
      observer.intersect(['amenities', 'contacts']);
    });
    expect(within(navigation).getByRole('link', { name: 'Amenities' })).toHaveAttribute(
      'aria-current',
      'location',
    );
  });

  it('moves to a section from its chip or its checklist line, with unsaved changes and no question', async () => {
    const user = userEvent.setup();
    const { router } = renderEditor();
    await user.type(await screen.findByRole('textbox', { name: 'Name in English' }), ' Gaza');
    const navigation = screen.getByRole('navigation', { name: 'Profile sections' });

    await user.click(within(navigation).getByRole('link', { name: 'Contacts' }));

    expect(router.state.location).toMatchObject({ pathname: '/spaces/7', hash: '#contacts' });
    expect(within(navigation).getByRole('link', { name: 'Contacts' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    await user.click(
      within(screen.getByRole('region', { name: 'Still missing' })).getByRole('link', {
        name: 'Amenities',
      }),
    );
    expect(router.state.location.hash).toBe('#amenities');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });
});

describe('a section of the editor', () => {
  it('shows its date, and the confirmation while it is unchanged', async () => {
    renderEditor();

    const profile = await waitFor(() => section('The space'));
    expect(profile).toHaveTextContent('Updated 3 days ago');
    expect(within(profile).getByRole('button', { name: 'Still correct' })).toBeInTheDocument();
    expect(within(profile).queryByText('Out of date')).toBeNull();
  });

  it('shows a group never saved as not added yet, with Save only', async () => {
    renderEditor();

    const amenities = await waitFor(() => section('Amenities'));
    expect(amenities).toHaveTextContent('Not added yet');
    expect(within(amenities).getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(within(amenities).queryByRole('button', { name: 'Still correct' })).toBeNull();
  });

  it('marks its group out of date once it is stale', async () => {
    renderEditor({ read: () => ok({ ...SPACE, staleGroups: ['profile'] }) });

    expect(await screen.findByText('Out of date')).toBeInTheDocument();
  });

  it('says it has unsaved changes and offers to discard them; discarded, the confirmation is back', async () => {
    const user = userEvent.setup();
    renderEditor();
    const name = await screen.findByRole('textbox', { name: 'Name in English' });

    await user.type(name, ' Gaza');

    const profile = section('The space');
    expect(within(profile).getByText('Unsaved changes')).toBeInTheDocument();
    expect(within(profile).queryByRole('button', { name: 'Still correct' })).toBeNull();
    await user.click(within(profile).getByRole('button', { name: 'Discard changes' }));
    expect(name).toHaveValue('Focus Hub');
    expect(within(profile).queryByText('Unsaved changes')).toBeNull();
    expect(within(profile).getByRole('button', { name: 'Still correct' })).toBeInTheDocument();
  });

  it('shows a save’s answer: its toast, and the date it gave', async () => {
    const user = userEvent.setup();
    renderEditor({ write: () => ok(savedNow({ ...SPACE, nameEn: 'Focus Hub Gaza' })) });

    await user.type(await screen.findByRole('textbox', { name: 'Name in English' }), ' Gaza');
    await user.click(within(section('The space')).getByRole('button', { name: 'Save' }));

    await findToast('The space saved');
    expect(section('The space')).toHaveTextContent('Updated today');
  });

  it('puts the server’s refusal on its field, and focuses it', async () => {
    const user = userEvent.setup();
    renderEditor({
      write: () => refused(422, { type: 'validation', errors: { nameEn: ['invalid_format'] } }),
    });
    const name = await screen.findByRole('textbox', { name: 'Name in English' });

    await user.type(name, ' Gaza');
    await user.click(within(section('The space')).getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Use Latin letters or digits in the English name'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(name).toHaveFocus();
    });
  });

  it('holds the confirmation and Save while a wait counts down, saying why', async () => {
    const user = userEvent.setup();
    renderEditor({ write: () => refused(429, { type: 'rate_limit' }, { 'retry-after': '30' }) });
    const profile = await waitFor(() => section('The space'));

    await user.click(within(profile).getByRole('button', { name: 'Still correct' }));

    expect(await within(profile).findByText(/Try again in/)).toBeInTheDocument();
    expect(within(profile).getByRole('button', { name: 'Still correct' })).toBeDisabled();
    expect(within(profile).getByRole('button', { name: 'Save' })).toBeDisabled();
  });
});

describe('the amenities section', () => {
  it('shows the list’s checklist, the way to the list itself, and the space’s own amenities', async () => {
    renderEditor({
      read: () => ok({ ...SPACE, ownAmenities: [{ nameAr: 'خزائن', nameEn: null }] }),
    });
    const amenities = await waitFor(() => section('Amenities'));

    expect(
      within(amenities).getByRole('group', { name: 'The list’s amenities' }),
    ).toBeInTheDocument();
    expect(
      within(amenities).getByRole('link', { name: 'Manage the amenities list' }),
    ).toHaveAttribute('href', '/lookups?tab=amenities');
    expect(within(amenities).getByRole('textbox', { name: 'Name in Arabic' })).toHaveValue('خزائن');
    expect(
      within(amenities).getByRole('button', { name: 'Remove extra amenity 1' }),
    ).toBeInTheDocument();
  });

  it('shows why it adds no more of its own at twenty', async () => {
    renderEditor({
      read: () =>
        ok({
          ...SPACE,
          ownAmenities: Array.from({ length: 20 }, (_, index) => ({
            nameAr: `مرفق ${String(index + 1)}`,
            nameEn: null,
          })),
        }),
    });
    const amenities = await waitFor(() => section('Amenities'));

    expect(within(amenities).getByRole('button', { name: 'Add an extra amenity' })).toBeDisabled();
    expect(within(amenities).getByText('Up to 20 extra amenities')).toBeInTheDocument();
  });
});

describe('the contacts section', () => {
  it('shows each contact’s type, its value with the form it is stored in, and a phone’s carrier', async () => {
    renderEditor({
      read: () => ok({ ...SPACE, contacts: [{ type: 'PHONE', value: '+970599123456' }] }),
    });
    const contacts = await waitFor(() => section('Contacts'));

    expect(within(contacts).getByRole('combobox', { name: 'Type' })).toHaveTextContent('Phone');
    const value = within(contacts).getByRole('textbox', { name: 'Value' });
    expect(value).toHaveValue('+970599123456');
    expect(value).toHaveAccessibleDescription(/Stored as .\+970599123456./);
    expect(within(contacts).getByText('Jawwal')).toBeInTheDocument();
  });
});

describe('a verified space', () => {
  it('shows its values to read, with the way to its public page, and nothing to save', async () => {
    renderEditor({
      read: () =>
        ok({
          ...SPACE,
          isVerified: true,
          amenityIds: [1, 3],
          ownAmenities: [{ nameAr: 'غرفة صلاة', nameEn: null }],
          contacts: [{ type: 'PHONE', value: '+970569123456' }],
        }),
    });

    expect(await screen.findByText('Edited by its owner')).toBeInTheDocument();
    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'View on the site' })).toHaveAttribute(
      'href',
      '/spaces/focus-hub',
    );
    const profile = section('The space');
    expect(within(profile).getByText('Focus Hub')).toHaveAttribute('lang', 'en');
    expect(within(profile).getByText('Area 11')).toBeInTheDocument();
    expect(within(profile).getByText('31.51950, 34.44700')).toBeInTheDocument();
    const amenities = section('Amenities');
    expect(within(amenities).getByText('Amenity 1, Amenity 3')).toBeInTheDocument();
    expect(within(amenities).getByText('غرفة صلاة')).toHaveAttribute('lang', 'ar');
    const contacts = section('Contacts');
    expect(within(contacts).getByText('+970569123456')).toHaveAttribute('dir', 'ltr');
    expect(within(contacts).getByText('Ooredoo')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Still missing' })).toBeNull();
  });
});

describe('leaving the editor', () => {
  it('asks first while a section has unsaved changes, naming it; Stay, which has the focus, keeps the page', async () => {
    const user = userEvent.setup();
    const { router } = renderEditor();
    await user.type(await screen.findByRole('textbox', { name: 'Name in English' }), ' Gaza');

    await act(() => router.navigate('/elsewhere'));

    const dialog = await screen.findByRole('alertdialog', { name: 'Leave with unsaved changes?' });
    expect(dialog).toHaveTextContent('Unsaved changes in The space will be lost.');
    expect(within(dialog).getByRole('button', { name: 'Stay' })).toHaveFocus();
    await user.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(router.state.location.pathname).toBe('/spaces/7');
    expect(screen.getByRole('textbox', { name: 'Name in English' })).toHaveValue('Focus Hub Gaza');
  });

  it('keeps the page on Escape, and leaves on "Leave"', async () => {
    const user = userEvent.setup();
    const { router } = renderEditor();
    await user.type(await screen.findByRole('textbox', { name: 'Name in English' }), ' Gaza');
    await act(() => router.navigate('/elsewhere'));
    await screen.findByRole('alertdialog');

    await user.keyboard('{Escape}');
    expect(router.state.location.pathname).toBe('/spaces/7');
    await act(() => router.navigate('/elsewhere'));
    await user.click(await screen.findByRole('button', { name: 'Leave' }));

    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
  });
});
