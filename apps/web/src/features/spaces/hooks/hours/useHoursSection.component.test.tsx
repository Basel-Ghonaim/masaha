import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
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
import { useHoursSection } from './useHoursSection';

type Request = Parameters<Parameters<typeof fakeTransport>[0]>[0];

const MORNING = { id: 4, nameAr: 'صباحية', nameEn: null, startsMinute: 480, endsMinute: 780 };

/**
 * A space whose hours were saved: Sunday to Thursday 08:00–18:00, Friday closed, Saturday
 * 09:00–24:00, and one shift, 08:00–13:00.
 */
const SPACE = {
  id: 7,
  hours: {
    days: [
      { opensMinute: 480, closesMinute: 1080 },
      { opensMinute: 480, closesMinute: 1080 },
      { opensMinute: 480, closesMinute: 1080 },
      { opensMinute: 480, closesMinute: 1080 },
      { opensMinute: 480, closesMinute: 1080 },
      null,
      { opensMinute: 540, closesMinute: 1440 },
    ],
    shifts: [MORNING],
  },
  prices: [],
  isVerified: false,
  updatedAt: { hours: '2026-10-10T08:00:00Z' },
  staleGroups: [],
} as unknown as AdminSpace;

/** A space whose hours were never saved. */
const MISSING = { ...SPACE, hours: null, updatedAt: { hours: null } } as unknown as AdminSpace;

/** The week the template sends, Sunday first: 08:00–18:00 but Friday. */
const TEMPLATE_DAYS = [
  { opensMinute: 480, closesMinute: 1080 },
  { opensMinute: 480, closesMinute: 1080 },
  { opensMinute: 480, closesMinute: 1080 },
  { opensMinute: 480, closesMinute: 1080 },
  { opensMinute: 480, closesMinute: 1080 },
  null,
  { opensMinute: 480, closesMinute: 1080 },
];

/** The hours' section of `space`, the server answering every write with `write`. */
function renderSection(
  space: AdminSpace,
  write: (request: Request) => FakeAnswer | Promise<FakeAnswer> = () => ok(space),
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
  const rendered = renderHook(({ current }) => useHoursSection({ space: current, onDirtyChange }), {
    wrapper,
    initialProps: { current: space },
  });
  const writes = () => requests.filter(({ method }) => method !== 'get');
  return { ...rendered, writes, client };
}

type Rendered = ReturnType<typeof renderSection>['result'];
type Binding = { onChange: (event: { target: { name: string; value: string } }) => unknown };

/** Types `value` into a field. */
async function type(binding: Binding | undefined, name: string, value: string) {
  if (binding === undefined) throw new Error('no field');
  await act(async () => {
    await binding.onChange({ target: { name, value } });
  });
}

/** The day shown at `position` (0 = Saturday). */
function day(result: Rendered, position: number) {
  const shown = result.current.days[position];
  if (shown === undefined) throw new Error('no day');
  return shown;
}

/** Adds a shift and fills it. */
async function addShift(result: Rendered, nameAr: string, starts: string, ends: string) {
  act(() => {
    result.current.shifts.add.run();
  });
  const index = result.current.shifts.rows.length - 1;
  const row = () => result.current.shifts.rows[index];
  await type(row()?.nameAr.binding, `shifts.${String(index)}.nameAr`, nameAr);
  await type(row()?.starts.binding, `shifts.${String(index)}.startsMinute`, starts);
  await type(row()?.ends.binding, `shifts.${String(index)}.endsMinute`, ends);
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

describe('useHoursSection', () => {
  it('fills a space with no hours from the template, Saturday first', () => {
    const { result } = renderSection(MISSING);

    expect(result.current.days.map(({ name, state }) => `${name} ${state}`)).toEqual([
      'Saturday Open',
      'Sunday Open',
      'Monday Open',
      'Tuesday Open',
      'Wednesday Open',
      'Thursday Open',
      'Friday Closed',
    ]);
    expect(day(result, 6)).toMatchObject({
      toggle: { label: 'Open on Friday', checked: false },
      opens: null,
      closes: null,
    });
    expect(day(result, 0).opens).toMatchObject({ label: 'From', placeholder: '08:00' });
    expect(result.current.shifts.rows).toEqual([]);
    expect(result.current.frame.date).toBe('Not added yet');
  });

  it('saves hours never saved, the template as it is, which dates them', async () => {
    const { result, writes } = renderSection(MISSING, () =>
      ok({ ...MISSING, updatedAt: { hours: '2026-10-13T08:00:00Z' } }),
    );

    save(result);

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(writes()[0]).toMatchObject({ method: 'put', url: '/admin/spaces/7/hours' });
    expect(bodyOf(writes()[0])).toEqual({ days: TEMPLATE_DAYS, shifts: [] });
    await findToast('Opening hours saved');
  });

  it('sends the week Sunday first and the shifts with their ids, a day to 24:00 as 1440', async () => {
    const { result, writes } = renderSection(SPACE);
    await type(day(result, 1).closes?.binding, 'days.0.closesMinute', '1700');
    await addShift(result, 'ليلية', '20:00', '23:30');

    save(result);

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({
      days: [
        { opensMinute: 480, closesMinute: 1020 },
        { opensMinute: 480, closesMinute: 1080 },
        { opensMinute: 480, closesMinute: 1080 },
        { opensMinute: 480, closesMinute: 1080 },
        { opensMinute: 480, closesMinute: 1080 },
        null,
        { opensMinute: 540, closesMinute: 1440 },
      ],
      shifts: [MORNING, { nameAr: 'ليلية', nameEn: null, startsMinute: 1200, endsMinute: 1410 }],
    });
  });

  it('writes a time it can read as HH:MM once its field is left', async () => {
    const { result } = renderSection(MISSING);
    // The field as the page renders it: an input the form fills and reads.
    const input = document.createElement('input');
    input.name = 'days.6.opensMinute';
    act(() => {
      day(result, 0).opens?.binding.ref(input);
    });
    input.value = '٩٣٠';

    await act(async () => {
      await day(result, 0).opens?.binding.onChange({ target: input, type: 'change' });
    });
    expect(input.value).toBe('٩٣٠');
    await act(async () => {
      await day(result, 0).opens?.binding.onBlur({ target: input, type: 'blur' });
    });

    expect(input.value).toBe('09:30');
  });

  it('copies the first open day’s hours to every open day, leaving closed days closed', async () => {
    // No shift, so none falls outside the hours copied.
    const { result, writes } = renderSection({
      ...SPACE,
      hours: { ...SPACE.hours, shifts: [] },
    } as AdminSpace);
    act(() => {
      day(result, 3).toggle.run(false);
    });

    act(() => {
      result.current.copyAll.run();
    });
    save(result);

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    const saturday = { opensMinute: 540, closesMinute: 1440 };
    expect(bodyOf(writes()[0])).toMatchObject({
      days: [saturday, saturday, null, saturday, saturday, null, saturday],
    });
    expect(result.current.copyAll).toMatchObject({ label: 'Copy to all days', disabled: false });
    expect(result.current.hint).toBe(
      '“Copy to all days” copies Saturday’s hours to every open day.',
    );
  });

  it('holds the copy while no day is open, saying why', () => {
    const { result } = renderSection(MISSING);

    act(() => {
      for (const shown of result.current.days) shown.toggle.run(false);
    });

    expect(result.current.copyAll.disabled).toBe(true);
    expect(result.current.hint).toBe('Open at least one day.');
  });

  it('refuses a shift outside every open day on the shift, sending nothing', async () => {
    const { result, writes } = renderSection(MISSING);
    await addShift(result, 'فجر', '06:00', '07:00');

    save(result);

    await waitFor(() => {
      expect(result.current.shifts.rows[0]?.ends.error).toBe('Outside the hours of every open day');
    });
    expect(writes()).toHaveLength(0);
  });

  it('names the open days a shift does not apply on', async () => {
    const { result } = renderSection(SPACE);

    await addShift(result, 'ليلية', '20:00', '23:30');

    expect(result.current.shifts.rows[0]?.ends.helper).toBe('Doesn’t apply on Saturday');
    expect(result.current.shifts.rows[1]?.ends.helper).toBe(
      'Doesn’t apply on Sunday, Monday, Tuesday, Wednesday, and Thursday',
    );
  });

  it('refuses a day that closes before it opens, and a time it cannot read, on their fields', async () => {
    const { result, writes } = renderSection(MISSING);
    await type(day(result, 0).closes?.binding, 'days.6.closesMinute', '07:00');
    await type(day(result, 1).opens?.binding, 'days.0.opensMinute', 'soon');
    await type(day(result, 2).opens?.binding, 'days.1.opensMinute', '');
    await type(day(result, 3).closes?.binding, 'days.2.closesMinute', '25:00');

    save(result);

    await waitFor(() => {
      expect(day(result, 0).closes?.error).toBe('Must be after the start');
    });
    expect(day(result, 1).opens?.error).toBe('A time from 00:00 to 23:59');
    expect(day(result, 2).opens?.error).toBe('Enter a time');
    expect(day(result, 3).closes?.error).toBe('A time up to 24:00, such as 18:30');
    expect(writes()).toHaveLength(0);
  });

  it('holds a shift’s Remove while a saved price uses it, saying why', () => {
    const { result } = renderSection({
      ...SPACE,
      prices: [
        {
          period: 'DAY',
          audience: 'GENERAL',
          shiftId: 4,
          labelAr: null,
          labelEn: null,
          amountAgorot: 1500,
        },
      ],
    });

    expect(result.current.shifts.rows[0]?.remove).toMatchObject({
      label: 'Remove shift 1',
      text: 'Remove shift',
      disabled: true,
      reason: 'A price uses it — remove that price first',
    });
  });

  it('says a removed shift is still in use when the server refuses it, and fetches the space again', async () => {
    const { result, client } = renderSection(SPACE, () => refused(409, { type: 'conflict' }));
    client.setQueryData(['admin', 'spaces', 'space', 7], SPACE);
    act(() => {
      result.current.shifts.rows[0]?.remove.run();
    });

    save(result);

    await waitFor(() => {
      expect(result.current.frame.failure).toMatchObject({
        message:
          'A shift you removed is still used by a price, a package or a subscription, so nothing was saved. Change what uses it first.',
      });
    });
    expect(client.getQueryState(['admin', 'spaces', 'space', 7])?.isInvalidated).toBe(true);
  });

  it('says the shifts changed meanwhile when the server refuses a shift’s id, and fetches the space again', async () => {
    const { result, client } = renderSection(SPACE, () =>
      refused(422, { type: 'validation', errors: { 'shifts.0.id': ['invalid_choice'] } }),
    );
    client.setQueryData(['admin', 'spaces', 'space', 7], SPACE);
    await type(day(result, 1).closes?.binding, 'days.0.closesMinute', '17:00');

    save(result);

    await waitFor(() => {
      expect(result.current.frame.failure).toMatchObject({
        message:
          'This space’s shifts changed since the page was opened. Discard your changes to see them as saved.',
      });
    });
    expect(client.getQueryState(['admin', 'spaces', 'space', 7])?.isInvalidated).toBe(true);
  });

  it('sends nothing for saved hours as they are, and says how to renew their date', async () => {
    const { result, writes } = renderSection(SPACE);

    save(result);

    await waitFor(() => {
      expect(result.current.frame.note).toBe(
        'Nothing changed. To renew its date, choose “Still correct”.',
      );
    });
    expect(writes()).toHaveLength(0);
  });

  it('stops adding shifts at ten, saying why', () => {
    const { result } = renderSection({
      ...SPACE,
      hours: {
        ...SPACE.hours,
        shifts: Array.from({ length: 10 }, (_, index) => ({
          ...MORNING,
          id: index + 1,
          nameAr: `وردية ${String(index + 1)}`,
        })),
      },
    } as AdminSpace);

    expect(result.current.shifts.add).toMatchObject({ disabled: true, reason: 'Up to 10 shifts' });
  });

  it('keeps its unsaved changes when the space arrives again with its hours changed elsewhere', async () => {
    const { result, rerender } = renderSection(SPACE);
    await addShift(result, 'ليلية', '20:00', '23:30');

    rerender({ current: { ...SPACE, hours: { ...SPACE.hours, shifts: [] } } as AdminSpace });

    expect(result.current.frame.unsaved).toBe('Unsaved changes');
    expect(result.current.shifts.rows).toHaveLength(2);
  });

  it('confirms its own group, and names it', async () => {
    const { result, writes } = renderSection(SPACE);

    act(() => {
      result.current.frame.confirm?.run();
    });

    await findToast('Opening hours confirmed as still correct');
    expect(writes()[0]?.url).toBe('/admin/spaces/7/hours/confirm');
  });

  it('holds each Remove, switch and Add while a save is pending', async () => {
    const answer = deferred<FakeAnswer>();
    const { result } = renderSection(SPACE, () => answer.promise);
    await addShift(result, 'ليلية', '20:00', '23:30');

    save(result);

    await waitFor(() => {
      expect(result.current.frame.save.pending).toBe(true);
    });
    expect(result.current.shifts.rows.map((row) => row.remove.disabled)).toEqual([true, true]);
    expect(result.current.days.every((shown) => shown.toggle.disabled)).toBe(true);
    expect(result.current.shifts.add.disabled).toBe(true);
    expect(result.current.copyAll.disabled).toBe(true);
    await act(async () => {
      answer.resolve(ok(SPACE));
      await answer.promise;
    });
  });
});
