import type { PresentPerson } from '@masaha/shared/occupancy';
import type { VisitTerms } from '@masaha/shared/visits';
import { createQueryClient, type QueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { checkedOut, quotedVisit, visitTerms } from '../../../../test/deskVisit';
import { findToast } from '../../../../test/findToast';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { CheckOutDialog } from '../../components/check-out/CheckOutDialog';

const OMAR: Extract<PresentPerson, { kind: 'VISIT' }> = {
  kind: 'VISIT',
  id: 12,
  name: 'Omar',
  since: '2026-07-01T07:00:00.000Z',
  chargeNowAgorot: 1250,
};

/** A line with the Unicode isolates around its values removed, as a reader hears it. */
const heard = (expected: string) => (content: string) => content.replace(/[⁦-⁩]/g, '') === expected;

type Server = {
  quote?: () => FakeAnswer;
  checkOut?: () => FakeAnswer | Promise<FakeAnswer>;
};

function serve({
  quote = () => ok(quotedVisit(1250)),
  checkOut = () => ok(checkedOut(1250, null)),
}: Server) {
  return fakeTransport((request) => {
    if (request.url === '/manage/spaces/7/visits/12' && request.method === 'get') return quote();
    return checkOut();
  });
}

function renderDialog(terms: VisitTerms = visitTerms(), client: QueryClient = createQueryClient()) {
  const onClose = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <CheckOutDialog spaceId={7} person={OMAR} terms={terms} onClose={onClose} />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { onClose };
}

const posts = (requests: ReturnType<typeof fakeTransport>) =>
  requests.filter(({ method }) => method === 'post');

async function received() {
  return screen.findByRole('textbox', { name: 'Received now (₪)' });
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

describe('useCheckOutDialog', () => {
  it('sends the quote’s time and the recorded amount, never the typed amount above the due', async () => {
    const user = userEvent.setup();
    const quote = quotedVisit(1250);
    const requests = serve({
      quote: () => ok(quote),
      checkOut: () => ok(checkedOut(1250, { amountAgorot: 1250, method: 'CASH' })),
    });
    const { onClose } = renderDialog();

    const amount = await received();
    expect(amount).toHaveValue('12.50');
    await user.clear(amount);
    await user.type(amount, '20');
    expect(screen.getByText(heard('₪7.50 change'))).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: heard('Check out and receive ₪12.50') }));

    await findToast(heard('Omar checked out'));
    const [post] = posts(requests);
    expect(post?.url).toBe('/manage/spaces/7/visits/12/check-out');
    expect(bodyOf(post)).toEqual({
      checkedOutAt: quote.quote?.at,
      payment: { amountAgorot: 1250, method: 'CASH' },
    });
    expect(screen.getByText(heard('₪12.50 received in cash'))).toBeInTheDocument();
    expect(onClose).toHaveBeenCalled();
  });

  it('asks the name and the phone for a remainder on a visit with no customer, and keeps them once shown', async () => {
    const user = userEvent.setup();
    const requests = serve({
      checkOut: () => ok(checkedOut(1250, { amountAgorot: 500, method: 'CASH' })),
    });
    renderDialog();

    const amount = await received();
    expect(screen.queryByRole('textbox', { name: 'Mobile number' })).toBeNull();
    await user.clear(amount);
    await user.type(amount, '5');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue('Omar');
    expect(screen.getByText(heard('₪7.50 stays owed by Omar'))).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: heard('Check out and receive ₪5') }));
    expect(
      await screen.findByText(
        'A mobile number is needed to record the debt, e.g. +970 59 000 0000',
      ),
    ).toBeInTheDocument();
    expect(posts(requests)).toHaveLength(0);

    // Covered again, the fields stay, no longer required.
    await user.clear(amount);
    await user.type(amount, '12.5');
    expect(screen.getByRole('textbox', { name: 'Mobile number' })).toBeInTheDocument();
    await user.clear(amount);
    await user.type(amount, '5');

    await user.type(screen.getByRole('textbox', { name: 'Mobile number' }), '0599000301');
    await user.click(screen.getByRole('button', { name: heard('Check out and receive ₪5') }));

    await findToast(heard('Omar checked out'));
    expect(bodyOf(posts(requests)[0])).toMatchObject({
      payment: { amountAgorot: 500, method: 'CASH' },
      phone: '+970599000301',
      customerName: 'Omar',
    });
    expect(
      screen.getByText(heard('₪5 received in cash · ₪7.50 stays owed by Omar')),
    ).toBeInTheDocument();
  });

  it('reads a stale quote again before sending, and a changed due stops the send with its line', async () => {
    const user = userEvent.setup();
    const stale = new Date(Date.now() - 5 * 60_000).toISOString();
    let reads = 0;
    const fresh = quotedVisit(1500);
    const requests = serve({
      quote: () => {
        reads += 1;
        return ok(reads === 1 ? quotedVisit(1250, stale) : fresh);
      },
      checkOut: () => ok(checkedOut(1500, { amountAgorot: 1500, method: 'CASH' })),
    });
    renderDialog();

    await received();
    await user.click(screen.getByRole('button', { name: heard('Check out and receive ₪12.50') }));

    expect(
      await screen.findByText(heard('The amount due changed to ₪15; check it, then confirm.')),
    ).toBeInTheDocument();
    expect(posts(requests)).toHaveLength(0);
    expect(reads).toBe(2);

    await user.click(screen.getByRole('button', { name: heard('Check out and receive ₪15') }));
    await findToast(heard('Omar checked out'));
    expect(bodyOf(posts(requests)[0])).toEqual({
      checkedOutAt: fresh.quote?.at,
      payment: { amountAgorot: 1500, method: 'CASH' },
    });
  });

  it('with no rate, has whoever may type a price type it with its reason', async () => {
    const user = userEvent.setup();
    const requests = serve({
      quote: () => ok(quotedVisit(null)),
      checkOut: () => ok(checkedOut(3000, { amountAgorot: 3000, method: 'CASH' })),
    });
    renderDialog(visitTerms({ mayTypePrice: true }));

    const typed = await screen.findByRole('textbox', { name: 'Visit amount (₪)' });
    expect(screen.getByText('Typed price')).toBeInTheDocument();
    await user.type(typed, '30');
    await user.click(screen.getByRole('button', { name: heard('Check out and receive ₪30') }));
    expect(await screen.findByText('This field is required.')).toBeInTheDocument();
    expect(posts(requests)).toHaveLength(0);

    await user.type(screen.getByRole('textbox', { name: 'Reason for the price' }), 'A long stay');
    await user.click(screen.getByRole('button', { name: heard('Check out and receive ₪30') }));

    await findToast(heard('Omar checked out'));
    expect(bodyOf(posts(requests)[0])).toMatchObject({
      payment: { amountAgorot: 3000, method: 'CASH' },
      charge: { amountAgorot: 3000, reason: 'A long stay' },
    });
  });

  it('with no rate, has whoever may not type a price close it unpriced, with a phone', async () => {
    const user = userEvent.setup();
    const requests = serve({
      quote: () => ok(quotedVisit(null)),
      checkOut: () => ok(checkedOut(null, null)),
    });
    renderDialog(visitTerms({ mayTypePrice: false }));

    expect(
      await screen.findByText(
        'This visit has no price. It closes unpriced, and the owner prices it later.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: 'Visit amount (₪)' })).toBeNull();
    expect(screen.queryByRole('textbox', { name: 'Received now (₪)' })).toBeNull();
    await user.type(screen.getByRole('textbox', { name: 'Mobile number' }), '0599000302');
    await user.click(screen.getByRole('button', { name: 'Check out without paying' }));

    await findToast(heard('Omar checked out'));
    const body = bodyOf(posts(requests)[0]) as Record<string, unknown>;
    expect(body).toMatchObject({ payment: null, phone: '+970599000302', customerName: 'Omar' });
    expect(body).not.toHaveProperty('charge');
    expect(screen.getByText('Closed unpriced')).toBeInTheDocument();
  });

  it('says VISIT_ALREADY_CLOSED recorded nothing, and reads the quote again on PAYMENT_EXCEEDS_DUE', async () => {
    const user = userEvent.setup();
    let answer: FakeAnswer = refused(409, { type: 'conflict', code: 'VISIT_ALREADY_CLOSED' });
    let reads = 0;
    serve({
      quote: () => {
        reads += 1;
        return ok(quotedVisit(1250));
      },
      checkOut: () => answer,
    });
    renderDialog();

    await received();
    await user.click(screen.getByRole('button', { name: heard('Check out and receive ₪12.50') }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nothing was recorded. Another desk checked this visit out first, so this payment wasn’t recorded. Don’t take the money twice.',
    );

    answer = refused(409, { type: 'conflict', code: 'PAYMENT_EXCEEDS_DUE' });
    await user.click(screen.getByRole('button', { name: heard('Check out and receive ₪12.50') }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The amount is more than is due now; the amount due was updated.',
    );
    await waitFor(() => {
      expect(reads).toBe(2);
    });
  });

  it('says a retry is safe after no answer, sending it again with the same key', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    let attempt = 0;
    const requests = serve({
      checkOut: () => {
        attempt += 1;
        return attempt <= 3 ? { failure: 'ERR_NETWORK' } : ok(checkedOut(1250, null));
      },
    });
    renderDialog();

    await received();
    await user.click(screen.getByRole('button', { name: heard('Check out and receive ₪12.50') }));
    await act(async () => {
      await vi.advanceTimersByTimeAsync(3_100);
    });
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No answer came back. Try again — it won’t be recorded twice.',
    );

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await findToast(heard('Omar checked out'));
    const keys = posts(requests).map(({ headers }) => headers.get('Idempotency-Key'));
    expect(keys).toHaveLength(4);
    expect(new Set(keys).size).toBe(1);
  });

  it('says a 403 is no longer open to them, and reads their own spaces again', async () => {
    const user = userEvent.setup();
    serve({ checkOut: () => refused(403, { type: 'forbidden' }) });
    const client = createQueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    renderDialog(visitTerms(), client);

    await received();
    await user.click(screen.getByRole('button', { name: heard('Check out and receive ₪12.50') }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Nothing was recorded. This is no longer open to you at this space.',
    );
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['me'] });
  });
});
