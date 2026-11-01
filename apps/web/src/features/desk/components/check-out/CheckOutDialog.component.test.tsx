import type { PresentPerson } from '@masaha/shared/occupancy';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { quotedVisit, visitTerms } from '../../../../test/deskVisit';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { CheckOutDialog } from './CheckOutDialog';

const OMAR: Extract<PresentPerson, { kind: 'VISIT' }> = {
  kind: 'VISIT',
  id: 12,
  customerId: null,
  name: 'Omar',
  audience: 'GENERAL',
  since: '2026-07-01T07:00:00.000Z',
  chargeNowAgorot: 1250,
};

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

function renderQuoted(quote: ReturnType<typeof quotedVisit>) {
  fakeTransport(() => ok(quote));
  render(
    <QueryClientProvider client={createQueryClient()}>
      <CheckOutDialog spaceId={7} person={OMAR} terms={visitTerms()} onClose={() => undefined} />
    </QueryClientProvider>,
  );
}

describe('CheckOutDialog', () => {
  it('names the rate and the amount in its line, the cap with the day price, and a day price alone', async () => {
    const heard = (expected: string) => (content: string) =>
      content.replace(/[⁦-⁩]/g, '') === expected;
    renderQuoted(quotedVisit(1250));
    expect(
      await screen.findByText(heard('2.25 h × ₪5 = ₪12.50 · Rounded up after 15 minutes')),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Visit');
    cleanup();
    restoreTransport();

    renderQuoted({
      ...quotedVisit(2500),
      quote: {
        at: new Date().toISOString(),
        chargeAgorot: 2500,
        billedMinutes: 135,
        capApplied: true,
      },
    });
    expect(
      await screen.findByText(heard('2.25 h × ₪5 · Rounded up after 15 minutes')),
    ).toBeInTheDocument();
    expect(screen.getByText(heard('Cap: the day price ₪25'))).toBeInTheDocument();
    cleanup();
    restoreTransport();

    renderQuoted(quotedVisit(2500, undefined, { hourRateAgorot: null, audience: 'STUDENT' }));
    expect(
      await screen.findByText(heard('No hourly price — the day price ₪25')),
    ).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription('Visit · student');
  });

  it('is titled by the visitor; the money block is a named group; «Received now» is focused and described as filled with the due; a failure is an alert; axe-clean', async () => {
    const user = userEvent.setup();
    fakeTransport((request) =>
      request.method === 'get'
        ? ok(quotedVisit(1250))
        : refused(409, { type: 'conflict', code: 'VISIT_ALREADY_CLOSED' }),
    );
    render(
      <QueryClientProvider client={createQueryClient()}>
        <CheckOutDialog spaceId={7} person={OMAR} terms={visitTerms()} onClose={() => undefined} />
      </QueryClientProvider>,
    );

    const dialog = await screen.findByRole('dialog', { name: /Check out · .*Omar/ });
    const money = await within(dialog).findByRole('group', { name: 'Payment' });
    const amount = await within(money).findByRole('textbox', { name: 'Received now (₪)' });
    expect(amount).toHaveFocus();
    expect(amount).toHaveAccessibleDescription(
      'Filled with the amount due; change it if they pay another amount.',
    );
    expect(await axe(document.body)).toHaveNoViolations();

    await user.click(within(dialog).getByRole('button', { name: /Check out and receive/ }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nothing was recorded.');
    expect(await axe(document.body)).toHaveNoViolations();
  });
});
