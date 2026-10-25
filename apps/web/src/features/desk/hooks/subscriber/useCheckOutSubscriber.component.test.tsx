import type { PresentPerson } from '@masaha/shared/occupancy';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { checkedOut } from '../../../../test/deskCustomer';
import { findToast } from '../../../../test/findToast';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { CheckOutAction } from '../../components/check-out/CheckOutAction';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

const SARA: PresentPerson = {
  kind: 'CHECK_IN',
  id: 3,
  customerId: 4,
  name: 'Sara Khalid',
  since: '2026-10-25T07:00:00.000Z',
};

function renderAction(answer: () => FakeAnswer, { fromSearch = false } = {}) {
  const requests = fakeTransport(answer);
  const done = vi.fn();
  const focus = createRef<HTMLInputElement>();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <input ref={focus} aria-label="Search" />
      <CheckOutAction
        spaceId={7}
        person={SARA}
        terms={undefined}
        after={fromSearch ? { done, focus } : undefined}
      />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, done };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('useCheckOutSubscriber', () => {
  it('checks out in one tap with no key; the toast names the stay and what the subscription owes', async () => {
    const user = userEvent.setup();
    const { requests } = renderAction(() => ok(checkedOut(3660)));

    const button = screen.getByRole('button', { name: heard('Check out Sara Khalid') });
    await user.click(button);

    await findToast(heard('Sara Khalid checked out'));
    expect(
      screen.getByText(heard('Stayed 2h 5m · ₪36.60 stays on the subscription')),
    ).toBeInTheDocument();
    expect(requests.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'post /manage/spaces/7/check-ins/3/check-out',
    ]);
    expect(requests[0]?.headers.get('Idempotency-Key')).toBeUndefined();
    // The button keeps the focus until the row leaves the list, which hands it on (S10).
    expect(button).toHaveFocus();
  });

  it('says nothing owed when the subscription is settled', async () => {
    const user = userEvent.setup();
    renderAction(() => ok(checkedOut(0)));

    await user.click(screen.getByRole('button', { name: heard('Check out Sara Khalid') }));
    await findToast(heard('Sara Khalid checked out'));
    expect(screen.getByText(heard('Stayed 2h 5m'))).toBeInTheDocument();
  });

  it('clears and focuses the search after a check-out from it', async () => {
    const user = userEvent.setup();
    const { done } = renderAction(() => ok(checkedOut(0)), { fromSearch: true });

    await user.click(screen.getByRole('button', { name: heard('Check out Sara Khalid') }));
    await waitFor(() => {
      expect(done).toHaveBeenCalledTimes(1);
    });
  });

  it('is never sent again by itself after no answer', async () => {
    const user = userEvent.setup();
    const { requests } = renderAction(() => ({ failure: 'ERR_NETWORK' }));

    await user.click(screen.getByRole('button', { name: heard('Check out Sara Khalid') }));
    await findToast('No answer came back. Try again — it won’t be recorded twice.');
    expect(requests).toHaveLength(1);
  });
});
