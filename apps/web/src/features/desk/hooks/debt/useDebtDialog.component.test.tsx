import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
import { DebtDialog } from '../../components/debt/DebtDialog';
import type { UncollectedItem } from '../../types/UncollectedItem';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

const ITEM: UncollectedItem = { uncollected: uncollectedVisit(), name: 'Khalid', day: '6 Oct' };

function renderDialog(answer: () => FakeAnswer) {
  const requests = fakeTransport(answer);
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <DebtDialog spaceId={7} item={ITEM} onClose={onClose} returnFocus={vi.fn()} />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, onClose };
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

describe('useDebtDialog', () => {
  it('leaves the visit to the phone, with the name, focused first', async () => {
    const user = userEvent.setup();
    const { requests, onClose } = renderDialog(() =>
      ok(
        deskVisit({
          id: 3,
          visitorName: 'Khalid',
          customer: { id: 9, name: 'Khalid', phone: '+970599000303' },
        }),
      ),
    );

    expect(
      screen.getByText(
        heard(
          '₪25 stays owed by this number’s holder; a customer file is created if there is none.',
        ),
      ),
    ).toBeInTheDocument();
    const name = screen.getByRole('textbox', { name: 'Name' });
    expect(name).toHaveValue('Khalid');
    expect(name).toHaveFocus();
    await user.type(screen.getByRole('textbox', { name: 'Mobile number' }), '0599000303');
    await user.click(screen.getByRole('button', { name: 'Record the debt' }));

    await findToast(heard('₪25 recorded as a debt for Khalid'));
    const [put] = requests;
    expect(`${String(put?.method)} ${String(put?.url)}`).toBe(
      'put /manage/spaces/7/visits/3/customer',
    );
    expect(bodyOf(put)).toEqual({ phone: '+970599000303', customerName: 'Khalid' });
    expect(onClose).toHaveBeenCalled();
  });

  it('carries no key, and is never sent again by itself after no answer', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { requests } = renderDialog(() => ({ failure: 'ERR_NETWORK' }));

    await user.type(screen.getByRole('textbox', { name: 'Mobile number' }), '0599000303');
    await user.click(screen.getByRole('button', { name: 'Record the debt' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No answer came back. Try again — it won’t be recorded twice.',
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(10_000);
    });

    expect(requests).toHaveLength(1);
    expect(requests[0]?.headers.get('Idempotency-Key')).toBeUndefined();
  });

  it('words VISIT_HAS_CUSTOMER and VISIT_ALREADY_PAID', async () => {
    const user = userEvent.setup();
    let answer = refused(409, { type: 'conflict', code: 'VISIT_HAS_CUSTOMER' });
    renderDialog(() => answer);

    await user.type(screen.getByRole('textbox', { name: 'Mobile number' }), '0599000303');
    await user.click(screen.getByRole('button', { name: 'Record the debt' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nothing was recorded. This visit belongs to another customer; their number can’t change here.',
    );

    answer = refused(409, { type: 'conflict', code: 'VISIT_ALREADY_PAID' });
    await user.click(screen.getByRole('button', { name: 'Record the debt' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nothing was recorded. Nothing is owed on this visit any more.',
    );
  });
});
