import type { PresentPerson, SpaceOccupancyNow } from '@masaha/shared/occupancy';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../test/fakeTransport';
import { stubScreenWidth } from '../../../test/screenWidth';
import { startPreferences } from '../../../test/startPreferences';
import { PresentList } from './PresentList';

const NOW: SpaceOccupancyNow = {
  status: 'AVAILABLE',
  capacity: 40,
  present: 3,
  override: null,
  people: [
    {
      kind: 'VISIT',
      id: 12,
      name: 'Omar',
      audience: 'GENERAL',
      since: '2026-07-01T07:00:00.000Z',
      chargeNowAgorot: 500,
    },
    { kind: 'CHECK_IN', id: 3, customerId: 4, name: 'Sara', since: '2026-07-01T08:30:00.000Z' },
    {
      kind: 'VISIT',
      id: 13,
      name: 'Layla',
      audience: 'GENERAL',
      since: '2026-07-01T09:00:00.000Z',
      chargeNowAgorot: null,
    },
  ],
};

/** What the desk adds: a subscriber's plan, by their check-in, and the way to a customer's file. */
const PEOPLE = {
  plan: (person: PresentPerson) => (person.kind === 'CHECK_IN' ? '10 days' : null),
  fileLink: (customerId: number) => `/file/${String(customerId)}`,
};

/** The row's action, as the desk sets it: named by the person. */
const action = (person: PresentPerson) => (
  <button type="button" aria-label={`Check out ${person.name}`}>
    Check out
  </button>
);

function renderList(answer: SpaceOccupancyNow) {
  fakeTransport(() => ok(answer));
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <main>
          <PresentList spaceId={7} action={action} people={PEOPLE} />
        </main>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('PresentList', () => {
  it('is one section named by its h2 with «3 / 40»; the table named «People present»; each row’s action named by the person; axe-clean at 1440', async () => {
    stubScreenWidth(1440);
    renderList(NOW);

    const heading = await screen.findByRole('heading', { level: 2, name: 'Present now 3 / 40' });
    const section = screen.getByRole('region', { name: 'Present now 3 / 40' });
    expect(section).toContainElement(heading);
    const table = await within(section).findByRole('table', { name: 'People present' });
    expect(within(table).getAllByRole('row')).toHaveLength(4);
    for (const name of ['Omar', 'Sara', 'Layla']) {
      expect(within(table).getByRole('button', { name: `Check out ${name}` })).toBeInTheDocument();
    }
    expect(screen.getByText('1 subscriber · 2 visits')).toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('draws a card per person below 768 px, in a list of the same name; axe-clean at 390', async () => {
    stubScreenWidth(390);
    renderList(NOW);

    expect(await screen.findByRole('button', { name: 'Check out Sara' })).toBeInTheDocument();
    const list = screen.getByRole('list', { name: 'People present' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(3);
    expect(screen.queryByRole('table')).toBeNull();
    expect(within(list).getByRole('button', { name: 'Check out Sara' })).toBeInTheDocument();
    expect(await axe(document.body)).toHaveNoViolations();
  });

  it('links a subscriber’s name to their file, names their plan, and shows the time alone', async () => {
    stubScreenWidth(1440);
    renderList(NOW);

    const table = await screen.findByRole('table', { name: 'People present' });
    expect(await within(table).findByRole('link', { name: 'Sara' })).toHaveAttribute(
      'href',
      '/file/4',
    );
    // A visit has no customer the state now names: its name is not a link.
    expect(within(table).queryByRole('link', { name: 'Omar' })).toBeNull();
    const sara = within(table).getByRole('link', { name: 'Sara' }).closest('tr') as HTMLElement;
    expect(within(sara).getByText('10 days')).toBeVisible();
    expect(within(sara).queryByText('Subscription')).toBeNull();
    const omar = within(table).getByText('Omar').closest('tr') as HTMLElement;
    expect(within(omar).getByText('Visit')).toBeVisible();
    expect(within(omar).getByRole('cell', { name: '10:00' })).toBeVisible();
    // The actions' header is named for a reader alone.
    expect(
      within(table).getByRole('columnheader', { name: 'Actions' }).firstElementChild,
    ).toHaveClass('sr-only');
  });

  it('says a student’s visit «Visit · student»', async () => {
    stubScreenWidth(390);
    renderList({
      ...NOW,
      people: NOW.people.map((person) =>
        person.kind === 'VISIT' && person.name === 'Layla'
          ? { ...person, audience: 'STUDENT' as const }
          : person,
      ),
    });

    const list = await screen.findByRole('list', { name: 'People present' });
    const layla = (await within(list).findByText('Layla')).closest('li') as HTMLElement;
    expect(within(layla).getByText('Visit · student')).toBeVisible();
    const omar = within(list).getByText('Omar').closest('li') as HTMLElement;
    expect(within(omar).getByText('Visit')).toBeVisible();
  });

  it('counts the people present alone for a space with no capacity', async () => {
    stubScreenWidth(1440);
    renderList({ ...NOW, capacity: null, status: null });

    expect(
      await screen.findByRole('heading', { level: 2, name: 'Present now 3' }),
    ).toBeInTheDocument();
  });

  it('moves the focus to the next row’s action when the focused person leaves, and to the heading when no one is left', async () => {
    stubScreenWidth(1440);
    let people = NOW.people;
    fakeTransport(() => ok({ ...NOW, present: people.length, people }));
    const client = createQueryClient();
    render(
      <QueryClientProvider client={client}>
        <MemoryRouter>
          <main>
            <PresentList spaceId={7} action={action} people={PEOPLE} />
          </main>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    const omar = await screen.findByRole('button', { name: 'Check out Omar' });
    act(() => {
      omar.focus();
    });
    people = NOW.people.filter(({ name }) => name !== 'Omar');
    await act(async () => {
      await client.refetchQueries();
    });
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Check out Sara' })).toHaveFocus();
    });

    people = [];
    await act(async () => {
      await client.refetchQueries();
    });
    await waitFor(() => {
      expect(screen.getByRole('heading', { level: 2, name: 'Present now 0 / 40' })).toHaveFocus();
    });
  });
});
