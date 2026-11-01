import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
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
import { PlatformSettingsCards } from './PlatformSettingsCards';

const CONTACT = { email: 'team@masaha.ps', whatsapp: '+970599000099' };
const STALENESS = { stalenessDays: 60, priceStalenessDays: 30 };
const DEFAULTS = {
  autoCheckoutAtClosing: true,
  visitRounding: 'NEAREST_HALF_HOUR',
  visitRoundingMinutes: null,
  visitCapAtDayPrice: true,
};

type Config = Parameters<Parameters<typeof fakeTransport>[0]>[0];

/** The server: each card's read and save, unless `answer` answers first. */
function server(answer: (config: Config) => FakeAnswer | undefined = () => undefined) {
  return (config: Config): FakeAnswer => {
    const own = answer(config);
    if (own !== undefined) return own;
    const saved = config.method === 'put' ? bodyOf(config) : undefined;
    if (config.url === '/admin/settings/contact') return ok(saved ?? CONTACT);
    if (config.url === '/admin/settings/staleness') return ok(saved ?? STALENESS);
    if (config.url === '/admin/settings/new-space-defaults') return ok(saved ?? DEFAULTS);
    return refused(404, { type: 'not_found' });
  };
}

function renderCards(answer: ReturnType<typeof server>) {
  const requests = fakeTransport(answer);
  const view = render(
    <QueryClientProvider client={createQueryClient()}>
      <PlatformSettingsCards />
      <Toaster label="Notifications" />
    </QueryClientProvider>,
  );
  return { ...view, requests };
}

/** Once every card is read: three «حفظ». */
const allRead = () =>
  waitFor(() => {
    expect(screen.getAllByRole('button', { name: /^(Save|حفظ)$/ })).toHaveLength(3);
  });

/** A card by its title. */
const card = (title: string) =>
  screen.getByRole('heading', { name: title }).closest('[data-slot="card"]') as HTMLElement;

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  vi.unstubAllGlobals();
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
});

describe('PlatformSettingsCards', () => {
  it('each settings card loads, saves and fails on its own; axe-clean', async () => {
    const user = userEvent.setup();
    const { container, requests } = renderCards(
      server((config) => {
        if (config.url === '/admin/settings/contact') return refused(403, { type: 'forbidden' });
        if (config.url === '/admin/settings/staleness' && config.method === 'put')
          return refused(429, { type: 'rate_limit' }, { 'retry-after': '30' });
        return undefined;
      }),
    );

    expect(await screen.findByText('Couldn’t load “Platform contact”')).toBeInTheDocument();
    const staleness = card('Data freshness');
    await within(staleness).findByRole('textbox', { name: 'Prices (days)' });
    expect(
      screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent),
    ).toEqual(['Platform contact', 'Data freshness', 'Defaults for new spaces']);
    expect(await axe(container)).toHaveNoViolations();

    await user.click(within(staleness).getByRole('button', { name: 'Save' }));
    expect(await within(staleness).findByText(/Try again in/)).toBeInTheDocument();
    const defaults = card('Defaults for new spaces');
    expect(within(defaults).queryByRole('alert')).not.toBeInTheDocument();

    await user.click(within(defaults).getByRole('button', { name: 'Save' }));
    await findToast('Settings saved');
    expect(within(staleness).getByText(/Try again in/)).toBeInTheDocument();
    expect(
      bodyOf(
        requests.find(
          (request) =>
            request.method === 'put' && request.url === '/admin/settings/new-space-defaults',
        ),
      ),
    ).toEqual(DEFAULTS);

    // The contact's own retry reads it again.
    await user.click(within(card('Platform contact')).getByRole('button', { name: 'Try again' }));
    await waitFor(() => {
      expect(requests.filter((request) => request.url === '/admin/settings/contact')).toHaveLength(
        2,
      );
    });
  });

  it('an empty contact field sends null', async () => {
    const user = userEvent.setup();
    const { requests } = renderCards(server());

    await allRead();
    const contact = card('Platform contact');
    const whatsapp = await within(contact).findByRole('textbox', { name: 'WhatsApp' });
    expect(whatsapp).toHaveAttribute('placeholder', '+970 59 000 0000');
    expect(whatsapp).toHaveAttribute('dir', 'ltr');
    await user.clear(whatsapp);
    await user.click(within(contact).getByRole('button', { name: 'Save' }));

    await findToast('Settings saved');
    expect(
      bodyOf(
        requests.find(
          (request) => request.method === 'put' && request.url === '/admin/settings/contact',
        ),
      ),
    ).toEqual({ email: 'team@masaha.ps', whatsapp: null });
  });

  it('refuses an email and a number that are not valid, in the card’s words', async () => {
    const user = userEvent.setup();
    const { requests } = renderCards(server());

    await allRead();
    const contact = card('Platform contact');
    const email = await within(contact).findByRole('textbox', { name: 'Email' });
    await user.clear(email);
    await user.type(email, 'not an email');
    const whatsapp = within(contact).getByRole('textbox', { name: 'WhatsApp' });
    await user.clear(whatsapp);
    await user.type(whatsapp, '12345');
    await user.click(within(contact).getByRole('button', { name: 'Save' }));

    expect(await within(contact).findByText('Enter a valid email')).toBeInTheDocument();
    expect(
      within(contact).getByText('Not a valid number, e.g. +970 59 000 0000'),
    ).toBeInTheDocument();
    expect(requests.some((request) => request.method === 'put')).toBe(false);
  });

  it('freshness refuses 0 and 366 with its words', async () => {
    const user = userEvent.setup();
    const { requests } = renderCards(server());

    await allRead();
    const staleness = card('Data freshness');
    const prices = await within(staleness).findByRole('textbox', { name: 'Prices (days)' });
    const other = within(staleness).getByRole('textbox', { name: 'Other data (days)' });
    await user.clear(prices);
    await user.type(prices, '0');
    await user.clear(other);
    await user.type(other, '366');
    await user.click(within(staleness).getByRole('button', { name: 'Save' }));

    expect(await within(staleness).findAllByText('From 1 to 365 days')).toHaveLength(2);
    await user.clear(prices);
    await user.click(within(staleness).getByRole('button', { name: 'Save' }));
    expect(await within(staleness).findByText('Enter the number of days')).toBeInTheDocument();
    expect(requests.some((request) => request.method === 'put')).toBe(false);

    // Arabic-Indic digits are read.
    await user.type(prices, '٤٥');
    await user.clear(other);
    await user.type(other, '90');
    await user.click(within(staleness).getByRole('button', { name: 'Save' }));
    await findToast('Settings saved');
    expect(bodyOf(requests.find((request) => request.method === 'put'))).toEqual({
      priceStalenessDays: 45,
      stalenessDays: 90,
    });
  });

  it('the rounding minutes field shows only for «تقريب لأعلى…»', async () => {
    const user = userEvent.setup();
    const { requests } = renderCards(server());

    await allRead();
    const defaults = card('Defaults for new spaces');
    await within(defaults).findByRole('radio', { name: 'To the nearest half hour' });
    expect(
      within(defaults).queryByRole('textbox', { name: 'After (minutes)' }),
    ).not.toBeInTheDocument();
    await user.click(
      within(defaults).getByRole('radio', { name: 'Round up after a number of minutes' }),
    );
    const minutes = within(defaults).getByRole('textbox', { name: 'After (minutes)' });
    await user.click(within(defaults).getByRole('button', { name: 'Save' }));
    expect(await within(defaults).findByText('Enter the minutes')).toBeInTheDocument();

    await user.type(minutes, '15');
    await user.click(within(defaults).getByRole('button', { name: 'Save' }));
    await findToast('Settings saved');
    expect(bodyOf(requests.find((request) => request.method === 'put'))).toEqual({
      ...DEFAULTS,
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 15,
    });

    await user.click(within(defaults).getByRole('radio', { name: 'By the minute' }));
    expect(
      within(defaults).queryByRole('textbox', { name: 'After (minutes)' }),
    ).not.toBeInTheDocument();
  });

  it('«تغييرات غير محفوظة» and «تجاهل التغييرات» while a card differs', async () => {
    startPreferences('ar');
    const user = userEvent.setup();
    renderCards(server());

    await allRead();
    const defaults = card('الإعدادات الافتراضية للمساحات الجديدة');
    const cap = await within(defaults).findByRole('switch', { name: 'لا يتجاوز سعر اليوم' });
    expect(within(defaults).queryByText('تغييرات غير محفوظة')).not.toBeInTheDocument();
    expect(
      within(defaults).queryByRole('button', { name: 'تجاهل التغييرات' }),
    ).not.toBeInTheDocument();
    await user.click(cap);

    expect(within(defaults).getByText('تغييرات غير محفوظة')).toBeInTheDocument();
    expect(card('حداثة البيانات').textContent).not.toContain('تغييرات غير محفوظة');
    await user.click(within(defaults).getByRole('button', { name: 'تجاهل التغييرات' }));
    expect(cap).toBeChecked();
    expect(within(defaults).queryByText('تغييرات غير محفوظة')).not.toBeInTheDocument();
  });
});
