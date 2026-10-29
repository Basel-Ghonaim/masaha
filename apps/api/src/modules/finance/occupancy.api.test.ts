import { gazaInstant } from '@masaha/shared/core';
import type { OccupancyReport } from '@masaha/shared/finance';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  createVisit,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

// The occupancy statistics (docs/api/api-contract.md › Finance; data model › Occupancy
// statistics): from closed stays only, the auto check-out's included. Now is Thursday 2026-10-29,
// 10:00 in Gaza: the 14 days run from the 16th to today, the 28 days from the 1st to the 28th.
const NOW = new Date('2026-10-29T10:00:00+02:00');
const app = createTestApp({ clock: () => NOW });

let spaceId: number;
let owner: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  owner = await signInOwnerOf(spaceId);
});

/** The instant of a Gaza day's `HH:MM`. */
function gaza(day: string, time: string): Date {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return gazaInstant(day, hours * 60 + minutes);
}

/** A stay on a Gaza day from `from` to `to` (`null`: still open), closed by hand unless AUTO. */
function stayOn(day: string, from: string, to: string | null, auto = false) {
  return {
    checkedInAt: gaza(day, from),
    checkedOutAt: to === null ? null : gaza(day, to),
    checkoutMethod: to === null ? null : auto ? ('AUTO' as const) : ('MANUAL' as const),
  };
}

/** A visit of the space with this stay. */
function visit(
  day: string,
  from: string,
  to: string | null,
  { auto = false, space = spaceId } = {},
) {
  return createVisit(space, stayOn(day, from, to, auto));
}

/**
 * The stays the tests read. Tuesday the 20th: visits 09:00–12:00 and 13:00–14:00 (auto-closed),
 * one still open; member M 08:00–10:00 and 16:00–17:00, member N 09:00–09:30. Wednesday the
 * 14th: a visit 10:00–11:00. Sunday the 18th: a visit 09:30–11:15. Sunday the 11th: member N
 * 10:00–12:00, auto-closed. Monday the 26th: a visit 14:00–15:00. Today: a visit 08:00–09:00.
 * September the 30th: a visit 10:00–11:00. Another space's stays never count.
 */
async function seedStays() {
  await visit('2026-10-20', '09:00', '12:00');
  await visit('2026-10-20', '13:00', '14:00', { auto: true });
  await visit('2026-10-20', '15:00', null);
  const m = await createSubscription(await createCustomer(spaceId, { name: 'M' }));
  const n = await createSubscription(await createCustomer(spaceId, { name: 'N' }));
  await createCheckIn(m, stayOn('2026-10-20', '08:00', '10:00'));
  await createCheckIn(m, stayOn('2026-10-20', '16:00', '17:00'));
  await createCheckIn(n, stayOn('2026-10-20', '09:00', '09:30'));
  await visit('2026-10-14', '10:00', '11:00');
  await visit('2026-10-18', '09:30', '11:15');
  await createCheckIn(n, stayOn('2026-10-11', '10:00', '12:00', true));
  await visit('2026-10-26', '14:00', '15:00');
  await visit('2026-10-29', '08:00', '09:00');
  await visit('2026-09-30', '10:00', '11:00');
  const { id: elsewhere } = await createSpace('elsewhere');
  await visit('2026-10-20', '09:00', '12:00', { space: elsewhere });
  await visit('2026-10-18', '09:00', '12:00', { space: elsewhere });
}

function occupancy(query = '') {
  return request(app)
    .get(`/api/v1/manage/spaces/${String(spaceId)}/finance/occupancy${query}`)
    .set('Authorization', owner.authorization);
}

const reportOf = (response: request.Response) => dataOf(response) as OccupancyReport;

describe("the space's occupancy statistics", () => {
  it('visits and members per day over the 14 days: closed stays only, a member twice in a day once', async () => {
    await seedStays();

    const response = await occupancy();

    expect(response.status).toBe(200);
    const { byDay } = reportOf(response);
    expect(byDay).toHaveLength(14);
    expect([byDay[0]?.date, byDay[13]?.date]).toEqual(['2026-10-16', '2026-10-29']);
    expect(byDay.filter(({ visits, members }) => visits + members > 0)).toEqual([
      { date: '2026-10-18', visits: 1, members: 0 },
      { date: '2026-10-20', visits: 2, members: 2 },
      { date: '2026-10-26', visits: 1, members: 0 },
      { date: '2026-10-29', visits: 1, members: 0 },
    ]);
  });

  it("the average present per hour over the 28 days before today, by Gaza weekday and hour; an auto-closed stay counted; today's left out", async () => {
    await seedStays();

    const { byHour } = reportOf(await occupancy());

    expect(byHour.map(({ weekday }) => weekday)).toEqual([0, 1, 2, 3, 4, 5, 6]);
    const at = (weekday: number, hour: number) => byHour[weekday]?.hours[hour];
    // Sunday: 09:30–11:15 on the 18th; 10:00–12:00 on the 11th (auto-closed). Over 4 weeks.
    expect([at(0, 9), at(0, 10), at(0, 11), at(0, 12)]).toEqual([0.3, 0.5, 0.5, 0]);
    // Tuesday the 20th: at 09:00 a visit and two members, at 10:00 the visit alone (M left at 10).
    expect([at(2, 8), at(2, 9), at(2, 10), at(2, 11), at(2, 13), at(2, 15), at(2, 16)]).toEqual([
      0.3, 0.8, 0.3, 0.3, 0.3, 0, 0.3,
    ]);
    // Monday the 26th, after the change to UTC+2: 14:00–15:00.
    expect([at(1, 14), at(1, 15)]).toEqual([0.3, 0]);
    expect(at(3, 10)).toBe(0.3);
    // Thursday: today's stay is not among the 28 days.
    expect(byHour[4]?.hours.every((value) => value === 0)).toBe(true);
  });

  it("the month's average stay, members and visits apart, its peak hour and daily attendance; none: nulls", async () => {
    await seedStays();

    const october = reportOf(await occupancy());

    expect(october.month).toBe('2026-10');
    // Visits: 180, 60, 60, 60, 105, 60 → 87.5; members: 120, 60, 30, 120 → 82.5; all: 85.5.
    expect(october.averageStayMinutes).toEqual({ all: 86, members: 83, visits: 88 });
    // 09:00 and 10:00 each hold four stays over the month: the earlier.
    expect(october.peakHour).toBe(9);
    // 1 (the 11th), 1, 1, 4 (the 20th), 1, 1 (today) over six days.
    expect(october.averageDailyAttendance).toBe(1.5);

    const september = reportOf(await occupancy('?month=2026-09'));
    expect(september).toMatchObject({
      month: '2026-09',
      averageStayMinutes: { all: 60, members: null, visits: 60 },
      peakHour: 10,
      averageDailyAttendance: 1,
    });
    // The 14 days and the 28 always end with today.
    expect(september.byDay).toEqual(october.byDay);

    await prisma.visit.deleteMany();
    await prisma.checkIn.deleteMany();
    const none = reportOf(await occupancy());
    expect(none).toMatchObject({
      averageStayMinutes: { all: null, members: null, visits: null },
      peakHour: null,
      averageDailyAttendance: null,
    });
    expect(none.byDay.every(({ visits, members }) => visits + members === 0)).toBe(true);
    expect(none.byHour.every(({ hours }) => hours.every((value) => value === 0))).toBe(true);
  });
});
