import type { ExtensionPreview, ManagedAnnouncement } from '@masaha/shared/announcements';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { announcementsPage, announcementsSummary, closure } from '../../../../test/announcement';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { findToast } from '../../../../test/findToast';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { AnnouncementsList } from '../../components/list/AnnouncementsList';
import { ExtensionDialog } from '../../components/extension/ExtensionDialog';

const PATH = '/manage/spaces/7/announcements/9/extend-subscriptions';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

const PREVIEW: ExtensionPreview = {
  firstDay: '2026-10-20',
  lastDay: '2026-10-21',
  proposedDays: 2,
  subscriptions: 4,
  applied: null,
};

const APPLIED = {
  days: 3,
  subscriptions: 4,
  appliedAt: '2026-10-21T08:00:00.000Z',
  appliedBy: { id: 1, name: 'Sara' },
};

/** The dialog, opened on the running closure; its preview and its extension answered as given. */
function renderDialog({
  preview = () => ok(PREVIEW),
  extend = () => ok({ ...APPLIED, days: 3, announcementId: 9 }, 201),
}: {
  preview?: () => FakeAnswer | Promise<FakeAnswer>;
  extend?: () => FakeAnswer | Promise<FakeAnswer>;
} = {}) {
  const requests = fakeTransport((request) => (request.method === 'get' ? preview() : extend()));
  const onClose = vi.fn();
  const client = createQueryClient();
  const invalidated = vi.spyOn(client, 'invalidateQueries');
  function Opened() {
    const [open, setOpen] = useState(true);
    return open ? (
      <ExtensionDialog
        spaceId={7}
        closure={closure()}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        returnFocus={vi.fn()}
      />
    ) : null;
  }
  const view = render(
    <QueryClientProvider client={client}>
      <Opened />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  const posts = () => requests.filter(({ method }) => method === 'post');
  return { ...view, requests, posts, onClose, invalidated };
}

/** The scopes read again, by their keys. */
const keysOf = (invalidated: MockInstance<QueryClient['invalidateQueries']>) =>
  invalidated.mock.calls.map(([filters]) => filters?.queryKey);

const keyOf = (request: { headers: { get: (name: string) => unknown } } | undefined) =>
  request?.headers.get('Idempotency-Key');

/** The days field, once the preview has answered. */
const daysField = () => screen.findByRole('textbox', { name: 'Number of days' });

/** The closures' list of `rows`, as `owner` or reception, the extension answered as given. */
function renderList(rows: ManagedAnnouncement[], owner: boolean, extend?: () => FakeAnswer) {
  const requests = fakeTransport((request) => {
    if (request.url === PATH)
      return request.method === 'get' ? ok(PREVIEW) : (extend?.() ?? ok({}));
    return request.url?.endsWith('/summary') === true
      ? ok(announcementsSummary())
      : announcementsPage(rows);
  });
  const client = createQueryClient();
  const invalidated = vi.spyOn(client, 'invalidateQueries');
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AnnouncementsList spaceId={7} owner={owner} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return { ...view, requests, invalidated };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useExtensionDialog', () => {
  it('reads the preview on opening, prefills its days, and sends the days typed with one key', async () => {
    const user = userEvent.setup();
    const { requests, posts, onClose } = renderDialog();

    const days = await daysField();
    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      `get ${PATH}`,
    ]);
    expect(days).toHaveValue('2');
    expect(screen.getByText('The extension moves 4 subscriptions.')).toBeInTheDocument();
    expect(
      screen.getByText(heard('The closure’s days: 2 days (20 October – 21 October)')),
    ).toBeInTheDocument();

    await user.clear(days);
    await user.type(days, '٣');
    await user.click(screen.getByRole('button', { name: 'Extend 4 subscriptions' }));
    await findToast('Subscriptions extended');
    expect(screen.getByText('4 subscriptions · 3 days')).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
    expect(posts()).toHaveLength(1);
    expect(bodyOf(posts()[0])).toEqual({ days: 3 });
    expect(keyOf(posts()[0])).toEqual(expect.any(String));
  });

  it('keeps its key across the transport’s re-sends and «Try again»; a new opening is a new key', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let lost = true;
    const first = renderDialog({
      extend: () =>
        lost ? { failure: 'ERR_NETWORK' } : ok({ ...APPLIED, days: 2, announcementId: 9 }, 201),
    });

    await daysField();
    await user.click(screen.getByRole('button', { name: 'Extend 4 subscriptions' }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No answer came back. Try again — they won’t be extended twice.',
    );
    expect(first.posts().length).toBeGreaterThan(1);
    expect(screen.getByRole('textbox', { name: 'Number of days' })).toHaveValue('2');

    lost = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await findToast('Subscriptions extended');
    const key = keyOf(first.posts()[0]);
    expect(new Set(first.posts().map(keyOf))).toEqual(new Set([key]));
    first.unmount();
    act(() => {
      toast.dismiss();
    });

    const second = renderDialog();
    await daysField();
    await user.click(screen.getByRole('button', { name: 'Extend 4 subscriptions' }));
    await findToast('Subscriptions extended');
    expect(keyOf(second.posts()[0])).not.toBe(key);
  });

  it('keeps a failure in the dialog with the days typed; one extended meanwhile is worded and read again', async () => {
    const user = userEvent.setup();
    let answer = refused(409, { type: 'conflict', code: 'ANNOUNCEMENT_NOT_STARTED' });
    const { invalidated } = renderDialog({ extend: () => answer });

    const days = await daysField();
    await user.clear(days);
    await user.type(days, '5');
    await user.click(screen.getByRole('button', { name: 'Extend 4 subscriptions' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This announcement has not started yet.',
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(days).toHaveValue('5');

    answer = refused(409, { type: 'conflict', code: 'CLOSURE_ALREADY_EXTENDED' });
    invalidated.mockClear();
    await user.click(screen.getByRole('button', { name: 'Extend 4 subscriptions' }));
    expect(
      await screen.findByText("This closure's subscriptions were already extended."),
    ).toBeInTheDocument();
    expect(keysOf(invalidated)).toEqual([['space', 7]]);
  });

  it('refuses days outside 1–365 before sending anything', async () => {
    const user = userEvent.setup();
    const { posts } = renderDialog();

    const days = await daysField();
    await user.clear(days);
    await user.type(days, '400');
    await user.click(screen.getByRole('button', { name: 'Extend 4 subscriptions' }));
    expect(await screen.findByText('Between 1 and 365 days')).toBeInTheDocument();
    expect(posts()).toHaveLength(0);
  });

  it('offers no extension for a closure that covered none, nor one extended meanwhile', async () => {
    const none = renderDialog({ preview: () => ok({ ...PREVIEW, subscriptions: 0 }) });
    expect(
      await screen.findByText(
        'This closure covered no subscription, so there is nothing to extend.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Extend/ })).toBeNull();
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument();
    none.unmount();

    renderDialog({ preview: () => ok({ ...PREVIEW, applied: APPLIED }) });
    expect(
      await screen.findByText(
        'This closure’s subscriptions were already extended: 4 subscriptions · 3 days.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Extend/ })).toBeNull();
  });

  it('offers the owner «Extend subscriptions» on a started closure; reception reads its line instead', async () => {
    const owner = renderList([closure()], true);
    expect(await screen.findByRole('button', { name: 'Extend subscriptions' })).toBeInTheDocument();
    expect(owner.requests.some(({ url }) => url === PATH)).toBe(false);
    owner.unmount();

    renderList([closure()], false);
    expect(
      await screen.findByText('The owner extends subscriptions once the closure has started.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Extend subscriptions' })).toBeNull();
  });

  it('words a 403, shown by mistake, as no longer open, and reads the user’s spaces again', async () => {
    const user = userEvent.setup();
    const { invalidated } = renderDialog({ extend: () => refused(403, { type: 'forbidden' }) });

    await daysField();
    await user.click(screen.getByRole('button', { name: 'Extend 4 subscriptions' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This is no longer open to you at this space.',
    );
    expect(keysOf(invalidated)).toEqual([['me']]);
  });

  it('says the extension on its card once applied: how many, how many days, by whom, when', async () => {
    renderList([closure({ extension: APPLIED })], false);
    const list = await screen.findByRole('region', { name: 'Announcements' });
    expect(
      await within(list).findByText(heard('Extended 4 subscriptions · 3 days · Sara · 21 October')),
    ).toBeInTheDocument();
  });
});
