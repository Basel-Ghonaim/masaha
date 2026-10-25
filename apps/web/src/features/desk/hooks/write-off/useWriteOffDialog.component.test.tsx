import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deskVisit, uncollectedVisit } from '../../../../test/deskVisit';
import { findToast } from '../../../../test/findToast';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { WriteOffDialog } from '../../components/write-off/WriteOffDialog';
import type { UncollectedItem } from '../../types/UncollectedItem';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

const ITEM: UncollectedItem = { uncollected: uncollectedVisit(), name: 'Khalid', day: '6 Oct' };
const WRITTEN_OFF = deskVisit({
  id: 3,
  visitorName: 'Khalid',
  writeOff: { at: '2026-10-08T09:00:00.000Z', byId: 14, reason: 'Left the country' },
});

type Server = { writeOff?: () => FakeAnswer; undo?: () => FakeAnswer };

function renderDialog({
  writeOff = () => ok(WRITTEN_OFF),
  undo = () => ok(deskVisit({ id: 3, visitorName: 'Khalid' })),
}: Server = {}) {
  const requests = fakeTransport((request) => (request.method === 'delete' ? undo() : writeOff()));
  const onClose = vi.fn();
  // The card closes the dialog once it is done, as here.
  function Opened() {
    const [open, setOpen] = useState(true);
    return open ? (
      <WriteOffDialog
        spaceId={7}
        item={ITEM}
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        returnFocus={vi.fn()}
      />
    ) : null;
  }
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Opened />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, onClose };
}

const of = (requests: ReturnType<typeof fakeTransport>, method: string) =>
  requests.filter((request) => request.method === method);

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

describe('useWriteOffDialog', () => {
  it('requires a reason, and its toast offers «Undo», which undoes it once', async () => {
    const user = userEvent.setup();
    const { requests, onClose } = renderDialog();

    expect(
      screen.getByText(
        heard(
          'Khalid · 6 Oct · ₪25. It leaves “Not collected” (and its customer’s debt, if it has one). It isn’t a payment or a deletion: it stays on record with the reason, and it can be undone from the notice.',
        ),
      ),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Write off' }));
    expect(await screen.findByText('Write the reason')).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    await user.type(screen.getByRole('textbox', { name: 'Reason' }), 'Left the country');
    await user.click(screen.getByRole('button', { name: 'Write off' }));

    await findToast(heard('₪25 written off · Khalid'));
    expect(onClose).toHaveBeenCalled();
    const [post] = of(requests, 'post');
    expect(post?.url).toBe('/manage/spaces/7/visits/3/write-off');
    expect(bodyOf(post)).toEqual({ reason: 'Left the country' });

    // Sonner's swipe needs pointer capture, which jsdom lacks: the action is pressed by its key.
    screen.getByRole('button', { name: 'Undo' }).focus();
    await user.keyboard('{Enter}');
    await findToast('The visit is back in “Not collected”');
    expect(of(requests, 'delete').map(({ url }) => url)).toEqual([
      '/manage/spaces/7/visits/3/write-off',
    ]);
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();
    });
  });

  it('words a write-off refused 403 for reception, shown by mistake', async () => {
    const user = userEvent.setup();
    renderDialog({ writeOff: () => refused(403, { type: 'forbidden' }) });

    await user.type(screen.getByRole('textbox', { name: 'Reason' }), 'Left the country');
    await user.click(screen.getByRole('button', { name: 'Write off' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nothing was recorded. This is no longer open to you at this space.',
    );
  });

  it('never sends a write-off or its undo again by itself after no answer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let lost = true;
    const { requests } = renderDialog({
      writeOff: () => (lost ? { failure: 'ERR_NETWORK' } : ok(WRITTEN_OFF)),
      undo: () => ({ failure: 'ERR_NETWORK' }),
    });

    await user.type(screen.getByRole('textbox', { name: 'Reason' }), 'Left the country');
    await user.click(screen.getByRole('button', { name: 'Write off' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No answer came back. Try again — it won’t be recorded twice.',
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(of(requests, 'post')).toHaveLength(1);

    lost = false;
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await findToast(heard('₪25 written off · Khalid'));
    // Sonner's swipe needs pointer capture, which jsdom lacks: the action is pressed by its key.
    screen.getByRole('button', { name: 'Undo' }).focus();
    await user.keyboard('{Enter}');
    await findToast('We couldn’t undo the write-off');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(of(requests, 'post')).toHaveLength(2);
    expect(of(requests, 'delete')).toHaveLength(1);
    expect(requests.map(({ headers }) => headers.get('Idempotency-Key'))).toEqual([
      undefined,
      undefined,
      undefined,
    ]);
  });
});
