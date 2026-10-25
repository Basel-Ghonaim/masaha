import { createQueryClient, type QueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deskVisit } from '../../../../test/deskVisit';
import { findToast } from '../../../../test/findToast';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { PriceDialog } from '../../components/unpriced/PriceDialog';

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

const LAYLA = deskVisit({ id: 8, visitorName: 'Layla', checkoutMethod: 'MANUAL' });

function renderDialog(answer: () => FakeAnswer, client: QueryClient = createQueryClient()) {
  const requests = fakeTransport(answer);
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <PriceDialog spaceId={7} visit={LAYLA} name="Layla" onClose={onClose} returnFocus={vi.fn()} />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { requests, onClose };
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

describe('usePriceDialog', () => {
  it('prices a visit with its reason, required', async () => {
    const user = userEvent.setup();
    const { requests, onClose } = renderDialog(() =>
      ok({
        ...LAYLA,
        charge: {
          amountAgorot: 3000,
          roundingRule: null,
          roundingMinutes: null,
          capApplied: null,
          typedById: 14,
          reason: 'A long stay',
        },
      }),
    );

    const amount = screen.getByRole('textbox', { name: 'Visit amount (₪)' });
    expect(amount).toHaveFocus();
    await user.type(amount, '30');
    await user.click(screen.getByRole('button', { name: 'Save the price' }));
    expect(await screen.findByText('This field is required.')).toBeInTheDocument();
    expect(requests).toHaveLength(0);

    await user.type(screen.getByRole('textbox', { name: 'Reason for the price' }), 'A long stay');
    await user.click(screen.getByRole('button', { name: 'Save the price' }));

    await findToast(heard('Layla’s visit priced at ₪30'));
    const [put] = requests;
    expect(`${String(put?.method)} ${String(put?.url)}`).toBe(
      'put /manage/spaces/7/visits/8/charge',
    );
    expect(bodyOf(put)).toEqual({ amountAgorot: 3000, reason: 'A long stay' });
    expect(onClose).toHaveBeenCalled();
  });

  it('words VISIT_ALREADY_PRICED, and PRICE_TYPING_NOT_ALLOWED reads the terms again', async () => {
    const user = userEvent.setup();
    let answer = refused(409, { type: 'conflict', code: 'VISIT_ALREADY_PRICED' });
    const client = createQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    renderDialog(() => answer, client);

    await user.type(screen.getByRole('textbox', { name: 'Visit amount (₪)' }), '30');
    await user.type(screen.getByRole('textbox', { name: 'Reason for the price' }), 'A long stay');
    await user.click(screen.getByRole('button', { name: 'Save the price' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nothing was recorded. This visit already has a price.',
    );

    answer = refused(403, { type: 'forbidden', code: 'PRICE_TYPING_NOT_ALLOWED' });
    await user.click(screen.getByRole('button', { name: 'Save the price' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nothing was recorded. Reception may no longer type a price at this space.',
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['space', 7, 'desk', 'terms'] });
  });
});
