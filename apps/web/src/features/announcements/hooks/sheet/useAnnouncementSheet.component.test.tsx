import type { Announcement } from '@masaha/shared/announcements';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { announcement, announcementPostedNow } from '../../../../test/announcement';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { findToast } from '../../../../test/findToast';
import { deferred } from '../../../../test/fakeSession';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { AnnouncementSheet } from '../../components/sheet/AnnouncementSheet';
import type { SheetEntry } from '../../types/SheetEntry';

const POSTED: Announcement = announcement({ id: 8, state: 'UPCOMING' });

function renderSheet(
  answer: () => FakeAnswer | Promise<FakeAnswer> = () => ok(POSTED, 201),
  entry: SheetEntry = { mode: 'new' },
) {
  const requests = fakeTransport(answer);
  const onClose = vi.fn();
  const showTab = vi.fn();
  const client = createQueryClient();
  const invalidated = vi.spyOn(client, 'invalidateQueries');
  // The list unmounts the sheet once it is closed, as here.
  function Opened() {
    const [open, setOpen] = useState(true);
    return open ? (
      <AnnouncementSheet
        spaceId={7}
        entry={entry}
        showTab={showTab}
        returnFocus={() => null}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
      />
    ) : null;
  }
  const view = render(
    <QueryClientProvider client={client}>
      <Opened />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { ...view, requests, onClose, showTab, invalidated };
}

/** The scopes read again, by their keys. */
const keysOf = (invalidated: MockInstance<QueryClient['invalidateQueries']>) =>
  invalidated.mock.calls.map(([filters]) => filters?.queryKey);

const keyOf = (request: { headers: { get: (name: string) => unknown } } | undefined) =>
  request?.headers.get('Idempotency-Key');

/** Chooses «At a time» for the start, so its date and time show. */
async function startAtATime(user: ReturnType<typeof userEvent.setup>) {
  const starts = screen.getByRole('radiogroup', { name: 'Starts' });
  await user.click(within(starts).getByRole('radio', { name: 'At a time' }));
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

describe('useAnnouncementSheet', () => {
  it('posts with one key, kept across the transport’s re-sends and «Try again» after no answer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let lost = true;
    const { requests, onClose } = renderSheet(() =>
      lost ? { failure: 'ERR_NETWORK' } : ok(POSTED, 201),
    );

    await user.type(screen.getByRole('textbox', { name: 'Text in Arabic' }), 'مغلق للصيانة');
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    // The transport re-sends a keyed post by itself, after 1 s and then 2 s.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No answer came back. Try again — it won’t be published twice.',
    );
    const first = keyOf(requests[0]);
    expect(first).toEqual(expect.any(String));
    expect(requests.length).toBeGreaterThan(1);
    expect(screen.getByRole('textbox', { name: 'Text in Arabic' })).toHaveValue('مغلق للصيانة');

    lost = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await findToast('Announcement published');
    expect(onClose).toHaveBeenCalled();
    expect(new Set(requests.map(keyOf))).toEqual(new Set([first]));
    // Started now: no start is sent; the end is today's 18:00, the sheet's default.
    expect(bodyOf(requests.at(-1))).toMatchObject({ type: 'GENERAL', textAr: 'مغلق للصيانة' });
    expect(bodyOf(requests.at(-1))).not.toHaveProperty('startsAt');
  });

  it('sends a double press once, and a new opening with a new key', async () => {
    const user = userEvent.setup();
    const answer = deferred<FakeAnswer>();
    const first = renderSheet(() => answer.promise);

    await user.type(screen.getByRole('textbox', { name: 'Text in Arabic' }), 'نص');
    await user.dblClick(screen.getByRole('button', { name: 'Publish' }));
    expect(first.requests).toHaveLength(1);
    answer.resolve(ok(POSTED, 201));
    await findToast('Announcement published');
    const key = keyOf(first.requests[0]);
    first.unmount();
    act(() => {
      toast.dismiss();
    });

    const second = renderSheet();
    await user.type(screen.getByRole('textbox', { name: 'Text in Arabic' }), 'نص');
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await findToast('Announcement published');
    expect(keyOf(second.requests[0])).toEqual(expect.any(String));
    expect(keyOf(second.requests[0])).not.toBe(key);
  });

  it('puts the server’s period refusals on their fields', async () => {
    const user = userEvent.setup();
    let answer = refused(422, { type: 'validation', errors: { startsAt: ['out_of_range'] } });
    const { requests } = renderSheet(() => answer);

    await user.type(screen.getByRole('textbox', { name: 'Text in Arabic' }), 'نص');
    await startAtATime(user);
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(
      await screen.findByText('The start is between 30 days ago and 365 days ahead.'),
    ).toBeInTheDocument();

    answer = refused(422, { type: 'validation', errors: { endsAt: ['out_of_range'] } });
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(
      await screen.findByText(
        'The end comes after now and after the start, within 365 days of it.',
      ),
    ).toBeInTheDocument();
    expect(requests).toHaveLength(2);
  });

  it('requires the Arabic text before sending anything', async () => {
    const user = userEvent.setup();
    const { requests } = renderSheet();

    await user.type(screen.getByRole('textbox', { name: 'Text in Arabic' }), '   ');
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    expect(await screen.findByText('Enter the Arabic text')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('words an extended closure’s refusal and reads the space again; a 403 reads the user’s spaces', async () => {
    const user = userEvent.setup();
    let answer = refused(409, { type: 'conflict', code: 'CLOSURE_EXTENDED' });
    const loaded = announcement({ type: 'CLOSURE', state: 'RUNNING' });
    const { invalidated } = renderSheet(() => answer, { mode: 'edit', announcement: loaded });

    await user.type(screen.getByRole('textbox', { name: 'Text in Arabic' }), ' اليوم');
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Subscriptions were extended for this closure: it is not deleted, and its type, start and later end stay as they are.',
    );
    expect(keysOf(invalidated)).toEqual([['space', 7]]);

    answer = refused(403, { type: 'forbidden' });
    invalidated.mockClear();
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This is no longer open to you at this space.',
    );
    expect(keysOf(invalidated)).toEqual([['me']]);
  });

  it('says an edit that changed nothing, and sends nothing', async () => {
    const user = userEvent.setup();
    const { requests } = renderSheet(undefined, { mode: 'edit', announcement: announcement() });

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('says nothing changed for a start posted «now», which the server keeps with its seconds', async () => {
    const user = userEvent.setup();
    const { requests } = renderSheet(undefined, {
      mode: 'edit',
      announcement: announcementPostedNow(),
    });

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Nothing changed')).toBeInTheDocument();
    expect(requests).toHaveLength(0);
  });

  it('edits with only what changed, and no key', async () => {
    const user = userEvent.setup();
    const { requests } = renderSheet(() => ok(announcement()), {
      mode: 'edit',
      announcement: announcement(),
    });

    await user.clear(screen.getByRole('textbox', { name: 'Text in English' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    await findToast('Announcement saved');
    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'patch /manage/spaces/7/announcements/5',
    ]);
    expect(bodyOf(requests[0])).toEqual({ textEn: null });
    expect(keyOf(requests[0])).toBeUndefined();
  });

  it('names the tab the announcement went to, and «Show» opens it', async () => {
    const user = userEvent.setup();
    const { showTab } = renderSheet();

    await user.type(screen.getByRole('textbox', { name: 'Text in Arabic' }), 'نص');
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    const published = await findToast('Announcement published');
    const card = published.closest('li') ?? document.body;
    expect(within(card).getByText('In “Scheduled”')).toBeInTheDocument();
    // Sonner's action pressed by its key: jsdom has no pointer capture.
    within(card).getByRole('button', { name: 'Show' }).focus();
    await user.keyboard('{Enter}');
    expect(showTab).toHaveBeenCalledWith('UPCOMING');
  });
});
