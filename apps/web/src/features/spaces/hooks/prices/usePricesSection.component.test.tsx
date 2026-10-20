import type { AdminSpace, FactGroup, Price } from '@masaha/shared/spaces';
import { createQueryClient } from '@shared/api';
import { Toaster, toast } from '@shared/design-system';
import { QueryClientProvider } from '@tanstack/react-query';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import {
  bodyOf,
  fakeTransport,
  ok,
  refused,
  restoreTransport,
} from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import { startPreferences } from '../../../../test/startPreferences';
import { usePricesSection } from './usePricesSection';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const DAY: Price = {
  period: 'DAY',
  audience: 'GENERAL',
  shiftId: null,
  labelAr: null,
  labelEn: null,
  amountAgorot: 1500,
};

/** A space whose prices were saved: a day for everyone; with two saved shifts, one named in Arabic only. */
const SPACE = {
  id: 7,
  hours: {
    days: [null, null, null, null, null, null, { opensMinute: 480, closesMinute: 1080 }],
    shifts: [
      { id: 4, nameAr: 'صباحية', nameEn: 'Morning', startsMinute: 480, endsMinute: 780 },
      { id: 5, nameAr: 'مسائية', nameEn: null, startsMinute: 780, endsMinute: 1080 },
    ],
  },
  prices: [DAY],
  isVerified: false,
  updatedAt: { prices: '2026-10-10T08:00:00Z' },
  staleGroups: [],
} as unknown as AdminSpace;

/** A space whose prices were never saved. */
const MISSING = { ...SPACE, prices: [], updatedAt: { prices: null } } as unknown as AdminSpace;

/** The prices' section of `space`, the server answering every write with `write`. */
function renderSection(
  space: AdminSpace,
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ok(space),
  hoursUnsaved = false,
) {
  const requests = fakeTransport((request) =>
    request.method === 'get' ? ok(space) : write(request),
  );
  const client = createQueryClient();
  const onDirtyChange = vi.fn<(group: FactGroup, dirty: boolean) => void>();
  render(<Toaster label="Notifications" closeLabel="Close notification" />);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(
    ({ current, unsaved }) =>
      usePricesSection({ place: 'admin', space: current, hoursUnsaved: unsaved, onDirtyChange }),
    { wrapper, initialProps: { current: space, unsaved: hoursUnsaved } },
  );
  const writes = () => requests.filter(({ method }) => method !== 'get');
  return { ...rendered, writes, client };
}

type Rendered = ReturnType<typeof renderSection>['result'];
type Choices = { period?: string; audience?: string; shift?: string };
type Texts = { labelAr?: string; labelEn?: string; amount?: string };

/** Adds a price, chooses its selects and types its texts. */
async function addPrice(result: Rendered, choices: Choices & Texts) {
  act(() => {
    result.current.add.run();
  });
  const index = result.current.rows.length - 1;
  const row = () => {
    const shown = result.current.rows[index];
    if (shown === undefined) throw new Error('no row');
    return shown;
  };
  act(() => {
    if (choices.period !== undefined) row().period.choose(choices.period);
    if (choices.audience !== undefined) row().audience.choose(choices.audience);
    if (choices.shift !== undefined) row().shift.choose(choices.shift);
  });
  const texts = [
    ['labelAr', choices.labelAr],
    ['labelEn', choices.labelEn],
    ['amountAgorot', choices.amount],
  ] as const;
  for (const [name, value] of texts) {
    if (value === undefined) continue;
    const binding = row()[name === 'amountAgorot' ? 'amount' : name].binding;
    await act(async () => {
      await binding.onChange({ target: { name: `prices.${String(index)}.${name}`, value } });
    });
  }
}

function save(result: Rendered) {
  act(() => {
    result.current.frame.save.submit();
  });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  act(() => {
    toast.dismiss();
  });
  vi.unstubAllGlobals();
});

describe('usePricesSection', () => {
  it('sends the prices in their order, an amount in shekels as agorot, no shift and a blank label as none', async () => {
    const { result, writes } = renderSection(SPACE);
    await addPrice(result, {
      period: 'MONTH',
      audience: 'STUDENT',
      shift: '4',
      labelAr: ' ',
      amount: '٢٥٠٫٥',
    });

    save(result);

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(writes()[0]).toMatchObject({ method: 'put', url: '/admin/spaces/7/prices' });
    expect(bodyOf(writes()[0])).toEqual({
      prices: [
        DAY,
        {
          period: 'MONTH',
          audience: 'STUDENT',
          shiftId: 4,
          labelAr: null,
          labelEn: null,
          amountAgorot: 25050,
        },
      ],
    });
  });

  it('saves prices never saved even empty, which dates them', async () => {
    const { result, writes } = renderSection(MISSING);

    save(result);

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({ prices: [] });
    await findToast('Prices saved');
  });

  it('sends nothing for saved prices as they are, and says how to renew their date', async () => {
    const { result, writes } = renderSection(SPACE);

    save(result);

    await waitFor(() => {
      expect(result.current.frame.note).toBe(
        'Nothing changed. To renew its date, choose “Still correct”.',
      );
    });
    expect(writes()).toHaveLength(0);
  });

  it('offers the space’s saved shifts only, and holds the field while there are none, saying why', async () => {
    const { result } = renderSection(SPACE);
    await addPrice(result, {});

    expect(result.current.rows[1]?.shift).toMatchObject({
      label: 'Shift',
      value: 'none',
      disabled: false,
      options: [
        { value: 'none', label: 'No shift' },
        { value: '4', label: 'Morning' },
        { value: '5', label: 'مسائية', lang: 'ar' },
      ],
    });
    expect(result.current.notes).toEqual([]);

    const none = renderSection({ ...SPACE, hours: null });
    expect(none.result.current.rows[0]?.shift.disabled).toBe(true);
    expect(none.result.current.notes).toEqual(['No saved shifts — add shifts first.']);
  });

  it('says to save the opening hours while they have unsaved changes', () => {
    const { result, rerender } = renderSection(SPACE);
    expect(result.current.notes).toEqual([]);

    rerender({ current: SPACE, unsaved: true });

    expect(result.current.notes).toEqual(['Save the opening hours for a new shift to show here.']);
  });

  it.each([
    ['period', {}, 'period'],
    ['shift', { shift: '4' }, 'shift'],
    ['label', { labelAr: 'مسائي' }, 'labelAr'],
  ] as const)('refuses a repeated price on its %s, sending nothing', async (_, choices, field) => {
    const { result, writes } = renderSection(MISSING);
    await addPrice(result, { ...choices, amount: '10' });
    await addPrice(result, { ...choices, amount: '12' });

    save(result);

    await waitFor(() => {
      expect(result.current.rows[1]?.[field].error).toBe('A repeated price: change this field');
    });
    expect(result.current.rows[0]?.[field].error).toBeUndefined();
    expect(writes()).toHaveLength(0);
  });

  it('refuses an amount empty, zero or not an amount, on its field', async () => {
    const { result, writes } = renderSection(MISSING);
    await addPrice(result, { period: 'HOUR', amount: '' });
    await addPrice(result, { period: 'DAY', amount: '0' });
    await addPrice(result, { period: 'WEEK', amount: 'fifteen' });
    await addPrice(result, { period: 'MONTH', amount: '12.555' });

    save(result);

    await waitFor(() => {
      expect(result.current.rows.map((row) => row.amount.error)).toEqual([
        'Enter the amount',
        'Above zero, up to ₪100000',
        'An amount in shekels, such as 15 or 12.50',
        'An amount in shekels, such as 15 or 12.50',
      ]);
    });
    expect(writes()).toHaveLength(0);
  });

  it('refuses an English label without its Arabic one, on the Arabic', async () => {
    const { result, writes } = renderSection(MISSING);
    await addPrice(result, { labelEn: 'Evening', amount: '10' });

    save(result);

    await waitFor(() => {
      expect(result.current.rows[0]?.labelAr.error).toBe('The Arabic label first');
    });
    expect(writes()).toHaveLength(0);
  });

  it('puts a shift removed meanwhile on its field, and fetches the space again', async () => {
    const { result, client } = renderSection(SPACE, () =>
      refused(422, { type: 'validation', errors: { 'prices.1.shiftId': ['invalid_choice'] } }),
    );
    client.setQueryData(['admin', 'spaces', 'space', 7], SPACE);
    await addPrice(result, { shift: '5', amount: '10' });

    save(result);

    await waitFor(() => {
      expect(result.current.rows[1]?.shift.error).toBe('This shift is no longer the space’s');
    });
    expect(client.getQueryState(['admin', 'spaces', 'space', 7])?.isInvalidated).toBe(true);
  });

  it('stops adding prices at forty, saying why', () => {
    const { result } = renderSection({
      ...SPACE,
      prices: Array.from({ length: 40 }, (_, index) => ({
        ...DAY,
        labelAr: `سعر ${String(index + 1)}`,
      })),
    });

    expect(result.current.add).toMatchObject({ disabled: true, reason: 'Up to 40 prices' });
  });

  it('keeps its unsaved changes when the space arrives again with its prices changed elsewhere', async () => {
    const { result, rerender } = renderSection(SPACE);
    await addPrice(result, { period: 'WEEK', amount: '60' });

    rerender({ current: { ...SPACE, prices: [] }, unsaved: false });

    expect(result.current.frame.unsaved).toBe('Unsaved changes');
    expect(result.current.rows).toHaveLength(2);
  });

  it('confirms its own group, and names it', async () => {
    const { result, writes } = renderSection(SPACE);

    act(() => {
      result.current.frame.confirm?.run();
    });

    await findToast('Prices confirmed as still correct');
    expect(writes()[0]?.url).toBe('/admin/spaces/7/prices/confirm');
  });

  it('holds each Remove and Add while a save is pending', async () => {
    const answer = deferred<FakeAnswer>();
    const { result } = renderSection(SPACE, () => answer.promise);
    await addPrice(result, { period: 'WEEK', amount: '60' });

    save(result);

    await waitFor(() => {
      expect(result.current.frame.save.pending).toBe(true);
    });
    expect(result.current.rows.map((row) => row.remove.disabled)).toEqual([true, true]);
    expect(result.current.add.disabled).toBe(true);
    await act(async () => {
      answer.resolve(ok(SPACE));
      await answer.promise;
    });
  });
});
