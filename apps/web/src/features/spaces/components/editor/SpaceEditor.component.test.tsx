import type { AdminSpace } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Toaster,
} from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { startPreferences } from '../../../../test/startPreferences';
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

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  startPreferences('en');
  fakeIntersectionObserver();
});

afterEach(() => {
  restoreTransport();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the space editor', () => {
  it('says it is loading, then shows the space’s sections', async () => {
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

  it('says an unverified space is edited here, with its state and whether it is hidden', async () => {
    renderEditor({ read: () => ok({ ...SPACE, isHidden: true }) });

    expect(await screen.findByText('You’re editing an unverified space')).toBeInTheDocument();
    expect(screen.getByText('Unverified')).toBeInTheDocument();
    expect(screen.getByText('Hidden')).toBeInTheDocument();
  });

  it('heads a space with missing groups with the five, a built section’s line leading to it', async () => {
    renderEditor();

    const checklist = await screen.findByRole('region', { name: 'Still missing' });
    const items = within(checklist).getAllByRole('listitem');
    expect(items.map((item) => item.textContent)).toEqual([
      'The spaceDone',
      'Opening hoursNot added yet',
      'PricesNot added yet',
      'AmenitiesNot added yet',
      'ContactsNot added yet',
    ]);
    expect(within(checklist).getByRole('link', { name: 'The space' })).toHaveAttribute(
      'href',
      '#profile',
    );
    expect(within(checklist).queryByRole('link', { name: 'Opening hours' })).toBeNull();
  });

  it('shows no checklist once no group is missing', async () => {
    renderEditor({ read: () => ok({ ...SPACE, missingGroups: [] }) });

    await screen.findByRole('heading', { level: 2, name: 'The space' });
    expect(screen.queryByRole('region', { name: 'Still missing' })).toBeNull();
  });

  it('lists its sections in a navigation, the first marked as the one in view', async () => {
    renderEditor();

    const navigation = await screen.findByRole('navigation', { name: 'Profile sections' });
    const link = within(navigation).getByRole('link', { name: 'The space' });
    expect(link).toHaveAttribute('href', '#profile');
    expect(link).toHaveAttribute('aria-current', 'location');
  });
});

describe('a section of the editor', () => {
  it('dates its group, and offers to confirm it while it is unchanged', async () => {
    renderEditor();

    const profile = await waitFor(() => section('The space'));
    expect(profile).toHaveTextContent('Updated 3 days ago');
    expect(within(profile).getByRole('button', { name: 'Still correct' })).toBeInTheDocument();
    expect(within(profile).queryByText('Out of date')).toBeNull();
  });

  it('marks its group out of date once it is stale', async () => {
    renderEditor({ read: () => ok({ ...SPACE, staleGroups: ['profile'] }) });

    expect(await screen.findByText('Out of date')).toBeInTheDocument();
  });

  it('says it has unsaved changes, and discards them, while a confirmation waits', async () => {
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
  });

  it('sends only the fields that changed, a cleared one as null, then shows the space’s answer', async () => {
    const user = userEvent.setup();
    const { writes } = renderEditor({
      write: () => ok(savedNow({ ...SPACE, nameEn: 'Focus Hub Gaza', landmarkAr: null })),
    });
    const name = await screen.findByRole('textbox', { name: 'Name in English' });

    await user.type(name, ' Gaza');
    await user.clear(screen.getByRole('textbox', { name: 'Landmark in Arabic' }));
    await user.click(within(section('The space')).getByRole('button', { name: 'Save' }));

    await findToast('The space saved');
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toMatchObject({ method: 'patch', url: '/admin/spaces/7' });
    expect(bodyOf(writes()[0])).toEqual({ nameEn: 'Focus Hub Gaza', landmarkAr: null });
    expect(section('The space')).toHaveTextContent('Updated today');
    expect(within(section('The space')).queryByText('Unsaved changes')).toBeNull();
  });

  it('sends nothing for a section that changed nothing, and says how to renew its date', async () => {
    const user = userEvent.setup();
    const { writes } = renderEditor();
    await screen.findByRole('heading', { level: 2, name: 'The space' });

    await user.click(within(section('The space')).getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Nothing changed. To renew its date, choose “Still correct”.'),
    ).toBeInTheDocument();
    expect(writes()).toHaveLength(0);
  });

  it('confirms its group unchanged, dated by the answer', async () => {
    const user = userEvent.setup();
    const { writes } = renderEditor();
    await screen.findByRole('heading', { level: 2, name: 'The space' });

    await user.click(within(section('The space')).getByRole('button', { name: 'Still correct' }));

    await findToast('The space confirmed as still correct');
    expect(writes()[0]).toMatchObject({ method: 'post', url: '/admin/spaces/7/profile/confirm' });
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

  it('turns the page read-only once a save finds the space verified meanwhile', async () => {
    const user = userEvent.setup();
    let verified = false;
    renderEditor({
      read: () => ok({ ...SPACE, isVerified: verified }),
      write: () => {
        verified = true;
        return refused(403, { type: 'forbidden' });
      },
    });
    const name = await screen.findByRole('textbox', { name: 'Name in English' });

    await user.type(name, ' Gaza');
    await user.click(within(section('The space')).getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Edited by its owner')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});

describe('a verified space', () => {
  it('shows its values to read, with the way to its public page, and nothing to save', async () => {
    renderEditor({ read: () => ok({ ...SPACE, isVerified: true }) });

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
    expect(screen.queryByRole('textbox')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull();
    expect(screen.queryByRole('region', { name: 'Still missing' })).toBeNull();
  });
});

describe('leaving the editor', () => {
  it('asks first while a section has unsaved changes, naming it, and stays on "Stay"', async () => {
    const user = userEvent.setup();
    const { router } = renderEditor();
    await user.type(await screen.findByRole('textbox', { name: 'Name in English' }), ' Gaza');

    await act(() => router.navigate('/elsewhere'));

    const dialog = await screen.findByRole('alertdialog', { name: 'Leave with unsaved changes?' });
    expect(dialog).toHaveTextContent('Unsaved changes in The space will be lost.');
    await user.click(within(dialog).getByRole('button', { name: 'Stay' }));
    expect(router.state.location.pathname).toBe('/spaces/7');
    expect(screen.getByRole('textbox', { name: 'Name in English' })).toHaveValue('Focus Hub Gaza');
  });

  it('leaves on "Leave"', async () => {
    const user = userEvent.setup();
    const { router } = renderEditor();
    await user.type(await screen.findByRole('textbox', { name: 'Name in English' }), ' Gaza');

    await act(() => router.navigate('/elsewhere'));
    await user.click(await screen.findByRole('button', { name: 'Leave' }));

    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
  });

  it('never asks for a move within the page, to a section', async () => {
    const user = userEvent.setup();
    const { router } = renderEditor();
    await user.type(await screen.findByRole('textbox', { name: 'Name in English' }), ' Gaza');

    await act(() => router.navigate('/spaces/7#profile'));

    expect(router.state.location.hash).toBe('#profile');
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('leaves without asking once nothing is unsaved', async () => {
    const { router } = renderEditor();
    await screen.findByRole('heading', { level: 2, name: 'The space' });

    await act(() => router.navigate('/elsewhere'));

    expect(await screen.findByText('Elsewhere')).toBeInTheDocument();
  });

  it('asks the browser before the tab closes or reloads, only while a section is unsaved', async () => {
    const user = userEvent.setup();
    renderEditor();
    const name = await screen.findByRole('textbox', { name: 'Name in English' });
    const unload = () => {
      const event = new Event('beforeunload', { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(unload()).toBe(false);

    await user.type(name, ' Gaza');

    expect(unload()).toBe(true);
  });
});
