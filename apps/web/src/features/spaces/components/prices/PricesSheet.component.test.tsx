import { toast } from '@shared/design-system';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import { bodyOf, ok, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { stubScreenWidth } from '../../../../test/screenWidth';
import {
  NEW_SPACE,
  NOW,
  SPACE,
  renderProfile,
  sectionOf,
  sheetOf,
} from '../../../../test/spaceProfile';
import { startPreferences } from '../../../../test/startPreferences';

// A Sheet's lists draw every option each time one opens (the time lists hold 48 half hours), which
// jsdom is slow at: a test that chooses several times outlasts 5 s on a busy machine, so this file
// allows each test longer.
vi.setConfig({ testTimeout: 15_000 });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  startPreferences('en');
  fakeIntersectionObserver();
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

type User = ReturnType<typeof userEvent.setup>;

const TITLE = 'Edit the published prices';
const NO_SHIFTS = { ...SPACE, hours: { days: SPACE.hours?.days ?? [], shifts: [] } };

async function choose(user: User, scope: HTMLElement, name: string, option: string) {
  await user.click(within(scope).getByRole('combobox', { name }));
  await user.click(await screen.findByRole('option', { name: option }));
}

/** The price rows of the open Sheet, each a block on a phone. */
const rows = (sheet: HTMLElement) => within(sheet).getAllByRole('listitem');

describe('the prices’ Sheet', () => {
  it('opens an empty section on one row, the first period not yet priced, with no change', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile({ read: () => ok(NEW_SPACE) });
    await user.click(await screen.findByRole('button', { name: 'Add a price' }));

    const sheet = sheetOf(TITLE);
    expect(rows(sheet)).toHaveLength(1);
    expect(within(sheet).getByRole('combobox', { name: 'Period' })).toHaveTextContent('Hour');
    await user.click(within(sheet).getAllByRole('button', { name: 'Back' })[1] as HTMLElement);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('adds the next price prefilled with the first period not yet priced for everyone (R7)', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile({ read: () => ok(NO_SHIFTS) });
    await user.click(await screen.findByRole('button', { name: 'Edit Published prices' }));
    const sheet = sheetOf(TITLE);

    await user.click(within(sheet).getByRole('button', { name: 'Add a price' }));

    const added = rows(sheet).at(-1) as HTMLElement;
    expect(within(added).getByRole('combobox', { name: 'Period' })).toHaveTextContent('Hour');
    expect(within(added).getByRole('combobox', { name: 'For' })).toHaveTextContent('Everyone');
  });

  it('says a repeat on the later row, and an empty amount on its own, sending nothing (R9)', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ read: () => ok(NO_SHIFTS) });
    await user.click(await screen.findByRole('button', { name: 'Edit Published prices' }));
    const sheet = sheetOf(TITLE);
    await user.click(within(sheet).getByRole('button', { name: 'Add a price' }));
    const added = rows(sheet).at(-1) as HTMLElement;

    await choose(user, added, 'Period', 'Day');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(added).findByText('Enter the amount')).toBeInTheDocument();

    // The amounts read, the rows are compared: the repeat is said on the later one.
    await user.type(within(added).getByRole('textbox', { name: 'Amount (₪)' }), '30');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    expect(await within(added).findByText('This price is already added')).toBeInTheDocument();
    expect(
      within(rows(sheet)[0] as HTMLElement).queryByText('This price is already added'),
    ).toBeNull();
    expect(writes()).toEqual([]);
  });

  it('offers «الوردية» only with saved shifts, «بدون وردية» first', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Edit Published prices' }));
    const sheet = sheetOf(TITLE);

    await user.click(
      within(rows(sheet)[0] as HTMLElement).getByRole('combobox', { name: 'Shift' }),
    );
    expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
      'No shift',
      'Morning',
    ]);
  });

  it('with no shift, leads to the shifts, asking first when the prices changed (S4)', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile({ read: () => ok(NO_SHIFTS) });
    await user.click(await screen.findByRole('button', { name: 'Edit Published prices' }));
    const sheet = sheetOf(TITLE);
    expect(within(sheet).queryByRole('combobox', { name: 'Shift' })).toBeNull();

    await user.type(
      within(rows(sheet)[0] as HTMLElement).getByRole('textbox', { name: 'Amount (₪)' }),
      '0',
    );
    await user.click(within(sheet).getByRole('button', { name: 'Add a shift' }));

    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    expect(await screen.findByRole('dialog', { name: 'Edit the shifts' })).toBeVisible();
  });

  it('with no hours, its «أضف وردية» leads to the hours first (DI-1)', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile({ read: () => ok(NEW_SPACE) });
    await screen.findByRole('heading', { level: 2, name: 'Published prices' });
    await user.click(
      within(sectionOf('Published prices')).getByRole('button', { name: 'Add a price' }),
    );

    await user.click(within(sheetOf(TITLE)).getByRole('button', { name: 'Add a shift' }));

    expect(await screen.findByRole('dialog', { name: 'Edit the opening hours' })).toBeVisible();
  });

  it('keeps a labelled price’s label, read-only, and sends it back as it was', async () => {
    const user = userEvent.setup({ delay: null });
    const labelled = {
      ...SPACE,
      prices: [
        {
          period: 'MONTH' as const,
          audience: 'GENERAL' as const,
          shiftId: null,
          labelAr: 'باقة المساء',
          labelEn: 'Evening pass',
          amountAgorot: 25000,
        },
      ],
    };
    const { writes } = renderProfile({ read: () => ok(labelled), write: () => ok(labelled) });
    await user.click(await screen.findByRole('button', { name: 'Edit Published prices' }));
    const sheet = sheetOf(TITLE);

    expect(within(sheet).getByText('Evening pass')).toBeInTheDocument();
    expect(within(sheet).queryByRole('combobox', { name: 'Period' })).toBeNull();
    const amount = within(sheet).getByRole('textbox', { name: 'Amount (₪)' });
    await user.clear(amount);
    await user.type(amount, '260');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({
      prices: [{ ...labelled.prices[0], amountAgorot: 26000 }],
    });
  });

  it('says what saving with no price left means, and saves it so', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ write: () => ok({ ...SPACE, prices: [] }) });
    await user.click(await screen.findByRole('button', { name: 'Edit Published prices' }));
    const sheet = sheetOf(TITLE);

    await user.click(within(sheet).getByRole('button', { name: 'Remove price 2' }));
    await user.click(within(sheet).getByRole('button', { name: 'Remove price 1' }));
    expect(
      within(sheet).getByText(
        'No prices. Save like this and the directory says prices aren’t available.',
      ),
    ).toBeInTheDocument();
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(await findToast('Published prices saved — visitors see it now')).toBeInTheDocument();
    expect(bodyOf(writes()[0])).toEqual({ prices: [] });
    await waitFor(() => {
      expect(within(sectionOf('Published prices')).getByText('No prices yet.')).toBeInTheDocument();
    });
  });

  it('heads the columns once from 768 px, each field named by its column and its row', async () => {
    stubScreenWidth(1440);
    const user = userEvent.setup({ delay: null });
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'Edit Published prices' }));
    const sheet = sheetOf(TITLE);

    expect(within(sheet).getByRole('combobox', { name: 'Period — price 2' })).toBeInTheDocument();
    expect(within(sheet).getByRole('textbox', { name: 'Amount (₪) — price 1' })).toHaveValue('25');
  });
});
