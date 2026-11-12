import type { OpeningRange, SpaceHours } from '@masaha/shared/spaces';
import { toast } from '@shared/design-system';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeIntersectionObserver } from '../../../../test/fakeIntersectionObserver';
import { bodyOf, ok, restoreTransport } from '../../../../test/fakeTransport';
import { findToast } from '../../../../test/findToast';
import {
  NEW_SPACE,
  NOW,
  SPACE,
  renderProfile,
  sectionOf,
  sheetOf,
} from '../../../../test/spaceProfile';
import { startPreferences } from '../../../../test/startPreferences';

const DAY: OpeningRange = { opensMinute: 480, closesMinute: 1080 };
const SHIFTS = SPACE.hours?.shifts ?? [];
const HOURS = SPACE.hours as SpaceHours;
/** The space with its evening switch on, its days as saved (08:00–18:00, no evening). */
const EVENING = { ...SPACE, hours: { ...HOURS, worksEvenings: true } };

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

/** Chooses `option` in the select named `name` inside `within`. */
async function choose(user: User, scope: HTMLElement, name: string, option: string) {
  await user.click(within(scope).getByRole('combobox', { name }));
  await user.click(await screen.findByRole('option', { name: option }));
}

async function openHours(user: User) {
  await user.click(await screen.findByRole('button', { name: 'Edit Opening hours' }));
  return sheetOf('Edit the opening hours');
}

/** The page shown again past the half minute its reads stay fresh: the space is read again. */
function readAgain() {
  act(() => {
    vi.setSystemTime(Date.now() + 31_000);
    window.dispatchEvent(new Event('visibilitychange'));
  });
}

describe('the opening hours’ Sheet', () => {
  it('opens Saturday to Thursday as one line, Friday closed, times chosen every half hour', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile();
    const sheet = await openHours(user);

    expect(within(sheet).getByRole('group', { name: 'Saturday to Thursday' })).toBeInTheDocument();
    expect(within(sheet).getByRole('combobox', { name: 'From' })).toHaveTextContent('08:00');
    expect(within(sheet).getByRole('combobox', { name: 'To' })).toHaveTextContent('18:00');
    expect(within(sheet).getByRole('checkbox', { name: 'Also open on Friday' })).not.toBeChecked();
    expect(within(sheet).getByText('Friday: closed')).toBeInTheDocument();
  });

  it('sends the new week with the saved shifts exactly as read, then closes and names the section', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ write: () => ok(SPACE) });
    const sheet = await openHours(user);

    await choose(user, sheet, 'To', '20:00');
    await user.click(within(sheet).getByRole('checkbox', { name: 'Also open on Friday' }));
    await choose(user, sheet, 'Friday from', '13:00');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(await findToast('Opening hours saved — visitors see it now')).toBeInTheDocument();
    const late = { opensMinute: 480, closesMinute: 1200 };
    expect(writes().map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'put /admin/spaces/7/hours',
    ]);
    expect(bodyOf(writes()[0])).toEqual({
      days: [late, late, late, late, late, { opensMinute: 780, closesMinute: 1200 }, late],
      worksEvenings: false,
      shifts: SHIFTS,
    });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
    expect(
      within(sectionOf('Opening hours')).getByRole('button', { name: 'Edit Opening hours' }),
    ).toHaveFocus();
  });

  it('starts Friday from the main hours once ticked (W3)', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile();
    const sheet = await openHours(user);
    await choose(user, sheet, 'From', '09:00');

    await user.click(within(sheet).getByRole('checkbox', { name: 'Also open on Friday' }));

    expect(within(sheet).getByRole('combobox', { name: 'Friday from' })).toHaveTextContent('09:00');
  });

  it('opens hours that differ day by day in «تخصيص الأيام», and asks before making them one', async () => {
    const user = userEvent.setup({ delay: null });
    const shortThursday = [DAY, DAY, DAY, DAY, { opensMinute: 480, closesMinute: 840 }, null, DAY];
    renderProfile({
      read: () => ok({ ...SPACE, hours: { ...HOURS, days: shortThursday, shifts: SHIFTS } }),
    });
    const sheet = await openHours(user);

    expect(within(sheet).getByRole('group', { name: 'Thursday' })).toBeInTheDocument();
    expect(within(sheet).getByRole('switch', { name: 'Open on Friday' })).not.toBeChecked();
    await user.click(within(sheet).getByRole('button', { name: 'Back to the simple view' }));

    const ask = await screen.findByRole('alertdialog', {
      name: 'Every day will take the same hours. Continue?',
    });
    await user.click(within(ask).getByRole('button', { name: 'Continue' }));
    expect(
      await within(sheet).findByRole('group', { name: 'Saturday to Thursday' }),
    ).toBeInTheDocument();
  });

  it('goes to the custom view and back with nothing asked when every day is alike', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile();
    const sheet = await openHours(user);

    await user.click(within(sheet).getByRole('button', { name: 'Set each day' }));
    expect(within(sheet).getAllByRole('switch')).toHaveLength(7);
    await user.click(within(sheet).getByRole('button', { name: 'Back to the simple view' }));

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(within(sheet).getByRole('group', { name: 'Saturday to Thursday' })).toBeInTheDocument();
  });

  it('gives a day switched on the hours of the last open day edited (W5)', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile();
    const sheet = await openHours(user);
    await user.click(within(sheet).getByRole('button', { name: 'Set each day' }));
    const monday = within(sheet).getByRole('group', { name: 'Monday' });

    await choose(user, monday, 'From', '10:00');
    await user.click(within(sheet).getByRole('switch', { name: 'Open on Friday' }));

    const friday = within(sheet).getByRole('group', { name: 'Friday' });
    expect(within(friday).getByRole('combobox', { name: 'From' })).toHaveTextContent('10:00');
  });

  it('says on its row when «إلى» does not follow «من», and sends nothing', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile();
    const sheet = await openHours(user);

    await choose(user, sheet, 'To', '07:00');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(await within(sheet).findByText('“To” comes after “From”')).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it('says once that no day is open, and sends nothing', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({
      read: () =>
        ok({
          ...SPACE,
          hours: { ...HOURS, days: [DAY, DAY, DAY, DAY, DAY, null, DAY], shifts: [] },
        }),
    });
    const sheet = await openHours(user);
    await user.click(within(sheet).getByRole('button', { name: 'Set each day' }));
    for (const day of ['Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday']) {
      await user.click(within(sheet).getByRole('switch', { name: `Open on ${day}` }));
    }

    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(await within(sheet).findByText('Open at least one day.')).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it('sends the shifts as the space was read last, a shift added meanwhile kept (FR3)', async () => {
    const user = userEvent.setup({ delay: null });
    const evening = {
      id: 22,
      nameAr: 'المسائية',
      nameEn: 'Evening',
      startsMinute: 780,
      endsMinute: 1080,
    };
    let reads = 0;
    const { writes } = renderProfile({
      read: () => {
        reads += 1;
        const days = SPACE.hours?.days ?? [];
        return ok(
          reads === 1
            ? SPACE
            : { ...SPACE, hours: { ...HOURS, days, shifts: [...SHIFTS, evening] } },
        );
      },
      write: () => ok(SPACE),
    });
    const sheet = await openHours(user);
    readAgain();
    expect(await screen.findByText('Evening')).toBeInTheDocument();

    await choose(user, sheet, 'To', '20:00');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toMatchObject({ shifts: [...SHIFTS, evening] });
  });

  it('says before sending that a saved shift falls outside the new hours, with the way to the shifts (DI-2)', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile();
    const sheet = await openHours(user);

    await choose(user, sheet, 'From', '14:00');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(
      await within(sheet).findByText(
        'The shift “Morning” is outside the new hours. Edit the shifts first, or choose hours that hold it.',
      ),
    ).toBeInTheDocument();
    expect(writes()).toEqual([]);
    await user.click(within(sheet).getByRole('button', { name: 'Edit the shifts' }));
    await user.click(await screen.findByRole('button', { name: 'Discard changes' }));
    expect(await screen.findByRole('dialog', { name: 'Edit the shifts' })).toBeVisible();
  });

  it('opens hours never saved on the template, no change, and its save sends the week', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ read: () => ok(NEW_SPACE), write: () => ok(SPACE) });
    await screen.findByRole('heading', { level: 2, name: 'Opening hours' });
    const add = () =>
      within(sectionOf('Opening hours')).getByRole('button', { name: 'Add the opening hours' });
    await user.click(add());
    const sheet = sheetOf('Edit the opening hours');

    await user.click(within(sheet).getAllByRole('button', { name: 'Back' })[1] as HTMLElement);
    expect(screen.queryByRole('alertdialog')).toBeNull();

    await user.click(add());
    await user.click(
      within(sheetOf('Edit the opening hours')).getByRole('button', { name: 'Save' }),
    );
    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toEqual({
      days: [DAY, DAY, DAY, DAY, DAY, null, DAY],
      worksEvenings: false,
      shifts: [],
    });
  });
});

describe('the evening box (E6) and its hint (E9)', () => {
  const box = (sheet: HTMLElement) =>
    within(sheet).getByRole('checkbox', { name: 'The space works in the evening' });
  const HINT = 'Evening hours are on, but the opening hours don’t go past 18:00 on any day.';

  it('opens on the saved switch, and sends the switch alone as a change, the week and shifts as saved', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ write: () => ok(EVENING) });
    const sheet = await openHours(user);
    expect(box(sheet)).not.toBeChecked();
    expect(box(sheet)).toHaveAccessibleDescription(
      'Visitors see “Evening hours”; the opening hours above set until when the space stays open.',
    );

    await user.click(box(sheet));
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(await findToast('Opening hours saved — visitors see it now')).toBeInTheDocument();
    expect(bodyOf(writes()[0])).toEqual({ days: HOURS.days, worksEvenings: true, shifts: SHIFTS });
  });

  it('opens ticked on a saved switch, and unticked sends it off', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ read: () => ok(EVENING), write: () => ok(SPACE) });
    const sheet = await openHours(user);
    expect(box(sheet)).toBeChecked();

    await user.click(box(sheet));
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toMatchObject({ worksEvenings: false });
  });

  it('says the hint while ticked and no day closes after 18:00, never holding the save', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ write: () => ok(EVENING) });
    const sheet = await openHours(user);
    const status = within(sheet).getByRole('status');
    expect(status).toBeEmptyDOMElement();

    await user.click(box(sheet));
    expect(status).toHaveTextContent(HINT);
    await choose(user, sheet, 'To', '18:30');
    expect(status).toBeEmptyDOMElement();
    await choose(user, sheet, 'To', '18:00');
    expect(status).toHaveTextContent(HINT);

    await user.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
  });

  it('says the box and the hint in Arabic, with no detectable accessibility violations', async () => {
    startPreferences('ar');
    const user = userEvent.setup({ delay: null });
    renderProfile();
    await user.click(await screen.findByRole('button', { name: 'تعديل ساعات العمل' }));
    const sheet = sheetOf('تعديل ساعات العمل');

    await user.click(within(sheet).getByRole('checkbox', { name: 'المساحة تعمل مساءً' }));

    expect(within(sheet).getByRole('status')).toHaveTextContent(
      'شغّلت الدوام المسائي، لكن ساعات العمل لا تمتد بعد 18:00 في أي يوم.',
    );
    expect(await axe(document.body)).toHaveNoViolations();
  });
});

describe('the evening in the hours’ view', () => {
  it('says «دوام مسائي» and the hint while the switch is on and the days end early', async () => {
    renderProfile({ read: () => ok(EVENING) });
    await screen.findByRole('heading', { level: 2, name: 'Opening hours' });
    const hours = sectionOf('Opening hours');

    expect(within(hours).getByText('Evening hours')).toBeInTheDocument();
    expect(
      within(hours).getByText(
        'Evening hours are on, but the opening hours don’t go past 18:00 on any day.',
      ),
    ).toBeInTheDocument();
  });

  it('says only «دوام مسائي» once a day closes after 18:00, and nothing with the switch off', async () => {
    const late = { opensMinute: 480, closesMinute: 1320 };
    const { unmount } = renderProfile({
      read: () =>
        ok({
          ...SPACE,
          hours: { ...HOURS, days: [late, DAY, DAY, DAY, DAY, null, DAY], worksEvenings: true },
        }),
    });
    await screen.findByRole('heading', { level: 2, name: 'Opening hours' });
    expect(within(sectionOf('Opening hours')).getByText('Evening hours')).toBeInTheDocument();
    expect(within(sectionOf('Opening hours')).queryByText(/past 18:00/)).toBeNull();
    unmount();

    renderProfile();
    await screen.findByRole('heading', { level: 2, name: 'Opening hours' });
    expect(within(sectionOf('Opening hours')).queryByText('Evening hours')).toBeNull();
  });

  it('says «دوام مسائي» but no hint on the admin’s page of a verified space, which it cannot edit (X5)', async () => {
    renderProfile({ read: () => ok({ ...EVENING, isVerified: true }) });
    await screen.findByRole('heading', { level: 2, name: 'Opening hours' });
    const hours = sectionOf('Opening hours');

    expect(within(hours).queryByRole('button', { name: 'Edit Opening hours' })).toBeNull();
    expect(within(hours).getByText('Evening hours')).toBeInTheDocument();
    expect(within(hours).queryByText(/past 18:00/)).toBeNull();
  });

  it('says it in Arabic, with no detectable accessibility violations', async () => {
    startPreferences('ar');
    const { container } = renderProfile({ read: () => ok(EVENING) });
    await screen.findByRole('heading', { level: 2, name: 'ساعات العمل' });

    expect(within(sectionOf('ساعات العمل')).getByText('دوام مسائي')).toBeInTheDocument();
    expect(
      within(sectionOf('ساعات العمل')).getByText(
        'شغّلت الدوام المسائي، لكن ساعات العمل لا تمتد بعد 18:00 في أي يوم.',
      ),
    ).toBeInTheDocument();
    expect(await axe(container)).toHaveNoViolations();
  });
});

describe('the shifts’ Sheet', () => {
  async function openShifts(user: User) {
    await user.click(await screen.findByRole('button', { name: 'Edit Shifts' }));
    return sheetOf('Edit the shifts');
  }

  it('sends the saved week and evening switch unchanged with the shifts, ids kept and English names (X1)', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile({ read: () => ok(EVENING), write: () => ok(EVENING) });
    const sheet = await openShifts(user);

    await user.click(within(sheet).getByRole('button', { name: 'Add a shift' }));
    const second = within(sheet).getByRole('group', { name: 'Shift 2' });
    await user.type(within(second).getByRole('textbox', { name: 'Name in Arabic' }), 'المسائية');
    await user.type(within(second).getByRole('textbox', { name: /Name in English/ }), 'Evening');
    await choose(user, second, 'From', '13:00');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(await findToast('Shifts saved — visitors see it now')).toBeInTheDocument();
    expect(bodyOf(writes()[0])).toEqual({
      days: SPACE.hours?.days,
      worksEvenings: true,
      shifts: [
        { id: 21, nameAr: 'الصباحية', nameEn: 'Morning', startsMinute: 480, endsMinute: 780 },
        { nameAr: 'المسائية', nameEn: 'Evening', startsMinute: 780, endsMinute: 1080 },
      ],
    });
  });

  it('sends the week as the space was read last, a day opened meanwhile kept (FR3)', async () => {
    const user = userEvent.setup({ delay: null });
    const days = (SPACE.hours?.days ?? []).map((day, index) =>
      index === 5 ? { opensMinute: 780, closesMinute: 1200 } : day,
    );
    let reads = 0;
    const { writes } = renderProfile({
      read: () => {
        reads += 1;
        return ok(reads === 1 ? SPACE : { ...SPACE, hours: { ...HOURS, days, shifts: SHIFTS } });
      },
      write: () => ok(SPACE),
    });
    const sheet = await openShifts(user);
    readAgain();
    expect((await screen.findAllByText(/13:00–20:00/)).length).toBeGreaterThan(0);

    await user.type(within(sheet).getByRole('textbox', { name: /Name in English/ }), ' shift');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(writes()).toHaveLength(1);
    });
    expect(bodyOf(writes()[0])).toMatchObject({ days });
  });

  it('holds the removal of a shift a saved price uses, saying why', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile({
      read: () =>
        ok({ ...SPACE, prices: SPACE.prices.map((price) => ({ ...price, shiftId: 21 })) }),
    });
    const sheet = await openShifts(user);

    expect(within(sheet).getByRole('button', { name: 'Remove shift 1' })).toBeDisabled();
    expect(
      within(sheet).getByText('A price or a package uses this shift; take it off there first.'),
    ).toBeInTheDocument();
  });

  it('holds the removal of a shift a package uses, on the owner’s page (SD5)', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile({ owner: true, packageShifts: [21] });
    const sheet = await openShifts(user);

    expect(within(sheet).getByRole('button', { name: 'Remove shift 1' })).toBeDisabled();
  });

  it('says in the Sheet a removal the server refuses for something it cannot see (409), and reads the space again', async () => {
    const user = userEvent.setup({ delay: null });
    const { requests } = renderProfile({
      write: () => ({
        status: 409,
        headers: { 'x-request-id': 'req-1' },
        data: {
          success: false,
          error: { type: 'conflict', message: 'In use', requestId: 'req-1' },
        },
      }),
    });
    const sheet = await openShifts(user);

    await user.click(within(sheet).getByRole('button', { name: 'Remove shift 1' }));
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(
      await within(sheet).findByText(/A shift you removed is still used by a price, a package/),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(requests.filter(({ url }) => url === '/admin/spaces/7')).toHaveLength(2);
    });
  });

  it('names the days a shift does not apply on, and refuses one inside no open day', async () => {
    const user = userEvent.setup({ delay: null });
    const { writes } = renderProfile();
    const sheet = await openShifts(user);
    const first = within(sheet).getByRole('group', { name: 'Shift 1' });

    await choose(user, first, 'From', '19:00');
    await choose(user, first, 'To', '21:00');
    await user.click(within(sheet).getByRole('button', { name: 'Save' }));

    expect(
      await within(first).findByText('Outside the hours of every open day'),
    ).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it('opens with one row to fill when there is none', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile({
      read: () => ok({ ...SPACE, hours: { ...HOURS, days: SPACE.hours?.days ?? [], shifts: [] } }),
    });
    await user.click(await screen.findByRole('button', { name: 'Add a shift' }));

    const sheet = sheetOf('Edit the shifts');
    expect(within(sheet).getAllByRole('group', { name: /Shift \d/ })).toHaveLength(1);
    await user.click(within(sheet).getAllByRole('button', { name: 'Back' })[1] as HTMLElement);
    expect(screen.queryByRole('alertdialog')).toBeNull();
  });

  it('leads to the hours first without them: «أضف ساعات العمل» opens their Sheet (DI-1)', async () => {
    const user = userEvent.setup({ delay: null });
    renderProfile({ read: () => ok(NEW_SPACE) });
    await screen.findByRole('heading', { level: 2, name: 'Shifts' });

    await user.click(
      within(sectionOf('Shifts')).getByRole('button', { name: 'Add the opening hours' }),
    );

    expect(await screen.findByRole('dialog', { name: 'Edit the opening hours' })).toBeVisible();
  });
});
