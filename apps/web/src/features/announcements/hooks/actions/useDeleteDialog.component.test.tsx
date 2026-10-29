import type { ManagedAnnouncement } from '@masaha/shared/announcements';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import {
  announcement,
  announcementsPage,
  announcementsSummary,
  closure,
} from '../../../../test/announcement';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { findToast } from '../../../../test/findToast';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { AnnouncementsList } from '../../components/list/AnnouncementsList';

const LIST = '/manage/spaces/7/announcements';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (line: string | null) => line?.replace(/[⁦-⁩]/g, '');

function renderList(
  rows: ManagedAnnouncement[],
  write: () => FakeAnswer = () => ({ status: 204 }),
  path = '/p',
) {
  const requests = fakeTransport((request) => {
    if (request.method === 'get') {
      return request.url === `${LIST}/summary`
        ? ok(announcementsSummary())
        : announcementsPage(rows);
    }
    return write();
  });
  const client = createQueryClient();
  const invalidated = vi.spyOn(client, 'invalidateQueries');
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AnnouncementsList spaceId={7} owner />
      </MemoryRouter>
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  const writes = () =>
    requests
      .filter(({ method }) => method !== 'get')
      .map(({ method, url }) => `${String(method)} ${String(url)}`);
  return { writes, invalidated };
}

/** The scopes read again, by their keys. */
const keysOf = (invalidated: MockInstance<QueryClient['invalidateQueries']>) =>
  invalidated.mock.calls.map(([filters]) => filters?.queryKey);

/** Opens the delete dialog of the card at `index`. */
async function openDelete(user: ReturnType<typeof userEvent.setup>, index = 0) {
  const list = await screen.findByRole('region', { name: 'Announcements' });
  const card = (await within(list).findAllByRole('listitem'))[index];
  if (card === undefined) throw new Error('No card');
  await user.click(within(card).getByRole('button', { name: /^More actions/ }));
  await user.click(await screen.findByRole('menuitem', { name: 'Delete…' }));
  return screen.findByRole('alertdialog');
}

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T09:00:00.000Z'));
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useDeleteDialog', () => {
  it.each([
    [
      'a running closure',
      closure(),
      'Delete the announcement “Temporary closure · 20 October 08:00 – 22 October 18:00”?',
      'It leaves the space’s page, and the status is automatic again at once. It can’t be brought back.',
    ],
    [
      'a running announcement',
      announcement(),
      'Delete the announcement “General · 21 October 08:00–18:00”?',
      'It leaves the space’s page at once. It can’t be brought back.',
    ],
    [
      'an upcoming one',
      announcement({ state: 'UPCOMING' }),
      'Delete the announcement “General · 21 October 08:00–18:00”?',
      'Visitors won’t see it. It can’t be brought back.',
    ],
    [
      'an ended one',
      announcement({ state: 'ENDED' }),
      'Delete the announcement “General · 21 October 08:00–18:00”?',
      'It leaves this list. It can’t be brought back.',
    ],
  ])('names %s and says its true consequence', async (_, row, title, text) => {
    const user = userEvent.setup();
    renderList([row]);

    const dialog = await openDelete(user);
    expect(heard(within(dialog).getByRole('heading').textContent)).toBe(title);
    expect(within(dialog).getByText(text)).toBeInTheDocument();
  });

  it('sends the delete once, with no key, and says it is done', async () => {
    const user = userEvent.setup();
    const { writes, invalidated } = renderList([announcement()]);

    const dialog = await openDelete(user);
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    await findToast('Announcement deleted');
    expect(writes()).toEqual([`delete ${LIST}/5`]);
    expect(keysOf(invalidated)).toContainEqual(['space', 7]);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('words a closure extended meanwhile, keeps the dialog, and reads the list again', async () => {
    const user = userEvent.setup();
    const { writes, invalidated } = renderList([closure()], () =>
      refused(409, { type: 'conflict', code: 'CLOSURE_EXTENDED' }),
    );

    const dialog = await openDelete(user);
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'Subscriptions were extended for this closure: it is not deleted, and its type, start and later end stay as they are.',
    );
    expect(writes()).toEqual([`delete ${LIST}/9`]);
    expect(keysOf(invalidated)).toContainEqual(['space', 7]);
  });
});
