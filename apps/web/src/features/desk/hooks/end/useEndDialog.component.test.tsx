import type { SubscriptionWithMoney } from '@masaha/shared/desk';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { customerFile, subscriptionState } from '../../../../test/deskCustomer';
import { findToast } from '../../../../test/findToast';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { EndDialog } from '../../components/end/EndDialog';
import { useCustomerFileQuery } from '../file/useCustomerFileQuery';
import { useEndDialog } from './useEndDialog';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const RUNNING: SubscriptionWithMoney = {
  ...subscriptionState({
    id: 3,
    name: 'Every other day',
    endsOn: '2026-10-27',
    status: 'ENDING_SOON',
  }),
  paidAgorot: 20000,
  balanceAgorot: 0,
};

/** The card's «إنهاء الاشتراك» and its dialog, beside the file the card is read from. */
function Harness({ subscription }: { subscription: SubscriptionWithMoney }) {
  useCustomerFileQuery(7, 4);
  const end = useEndDialog({ spaceId: 7, subscription });
  return (
    <>
      {end.action !== null && (
        <button type="button" onClick={end.action.run}>
          {end.action.label}
        </button>
      )}
      <EndDialog dialog={end.dialog} />
    </>
  );
}

function renderEnd(end: () => FakeAnswer, subscription = RUNNING) {
  const requests = fakeTransport((request) =>
    request.method === 'post' ? end() : ok(customerFile()),
  );
  render(
    <QueryClientProvider client={createQueryClient()}>
      <Harness subscription={subscription} />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return requests;
}

const of = (requests: Request[], method: string) =>
  requests.filter((request) => request.method === method);

beforeEach(() => {
  startPreferences('en');
  vi.useFakeTimers({ now: new Date('2026-10-25T09:00:00Z'), shouldAdvanceTime: true });
});

afterEach(() => {
  vi.useRealTimers();
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useEndDialog', () => {
  it('ends it today, saying the end it had; the card is read again', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const requests = renderEnd(() =>
      ok({ ...RUNNING, endsOn: '2026-10-25', status: 'EXPIRED', ended: { at: 'now', byId: 14 } }),
    );
    await waitFor(() => {
      expect(of(requests, 'get')).toHaveLength(1);
    });

    await user.click(screen.getByRole('button', { name: 'End subscription' }));
    const dialog = await screen.findByRole('alertdialog', { name: 'End the subscription today?' });
    expect(
      within(dialog).getByText(
        heard(
          'Every other day · The end date becomes 25 October instead of 27 October. Amounts paid and due don’t change.',
        ),
      ),
    ).toBeVisible();
    await user.click(within(dialog).getByRole('button', { name: 'End subscription' }));

    await findToast(heard('“Every other day” ended today'));
    expect(of(requests, 'post').map(({ url }) => url)).toEqual([
      '/manage/spaces/7/subscriptions/3/end',
    ]);
    expect(of(requests, 'post')[0]?.headers.get('Idempotency-Key')).toBeUndefined();
    await waitFor(() => {
      expect(of(requests, 'get')).toHaveLength(2);
    });
  });

  it('is never sent again by itself after no answer; the user retries', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const requests = renderEnd(() => ({ failure: 'ERR_NETWORK' }));

    await user.click(screen.getByRole('button', { name: 'End subscription' }));
    const dialog = await screen.findByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'End subscription' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent(
      'No answer came back. Try again — it won’t be recorded twice.',
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });
    expect(of(requests, 'post')).toHaveLength(1);
  });

  it('says the start as the end of one not started, and offers no end for one ended', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    renderEnd(() => ok(RUNNING), {
      ...RUNNING,
      startsOn: '2026-11-01',
      endsOn: '2026-11-30',
      status: 'UPCOMING',
      ended: null,
    });
    await user.click(screen.getByRole('button', { name: 'End subscription' }));
    expect(
      await screen.findByText(
        heard(
          'Every other day · The end date becomes 1 November instead of 30 November. Amounts paid and due don’t change.',
        ),
      ),
    ).toBeVisible();
    await user.keyboard('{Escape}');

    restoreTransport();
    renderEnd(() => ok(RUNNING), {
      ...RUNNING,
      status: 'EXPIRED',
      ended: { at: '2026-10-20T08:00:00Z', byId: 14 },
    });
    expect(screen.getAllByRole('button', { name: 'End subscription' })).toHaveLength(1);
  });
});
