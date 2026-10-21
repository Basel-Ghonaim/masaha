import { randomUUID } from 'node:crypto';

import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf, signIn } from '../../../test/admin.ts';
import { createSpace, createVisit } from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { addPrice, setWeek, signInOwnerOf } from '../../../test/spaces.ts';
import { prisma } from '../../db/index.ts';

/** A time on Sunday 2026-10-18 in Gaza, UTC+3 until 2026-10-24. */
const sunday = (time: string) => new Date(`2026-10-18T${time}:00+03:00`);
/** The API with its clock at that time. */
const at = (time: string) => createTestApp({ clock: () => sunday(time) });
const app = at('10:20');

/** Open 08:00–18:00 every day. */
const EVERY_DAY = Array.from({ length: 7 }, () => [8 * 60, 18 * 60] as [number, number]);

let spaceId: number;
let otherSpaceId: number;
let evening: number;
let morning: number;
let owner: { id: number; authorization: string };
let reception: { id: number; authorization: string };
let stranger: { id: number; authorization: string };
let unrelatedOwner: { id: number; authorization: string };
let admin: { id: number; authorization: string };

beforeEach(async () => {
  await resetDatabase(prisma);
  ({ id: spaceId } = await createSpace());
  await prisma.spaceSettings.create({
    data: {
      spaceId,
      autoCheckoutAtClosing: true,
      visitRounding: 'UP_AFTER_MINUTES',
      visitRoundingMinutes: 15,
      visitCapAtDayPrice: true,
    },
  });
  owner = await signInOwnerOf(spaceId);
  reception = await signIn('USER', 'reception@example.com');
  stranger = await signIn('USER', 'stranger@example.com');
  ({ id: otherSpaceId } = await createSpace('other-space'));
  unrelatedOwner = await signInOwnerOf(otherSpaceId);
  admin = await signIn('ADMIN');
  await prisma.spaceManager.create({
    data: { spaceId, userId: reception.id, role: 'RECEPTION' },
  });
  await setWeek(spaceId, EVERY_DAY);
  ({ id: evening } = await prisma.spaceShift.create({
    data: { spaceId, nameAr: 'مسائي', startsMinute: 14 * 60, endsMinute: 18 * 60, sortOrder: 0 },
  }));
  ({ id: morning } = await prisma.spaceShift.create({
    data: { spaceId, nameAr: 'صباحي', startsMinute: 8 * 60, endsMinute: 12 * 60, sortOrder: 1 },
  }));
  await addPrice(spaceId, 'HOUR', 500);
  await addPrice(spaceId, 'DAY', 2_500);
  await addPrice(spaceId, 'HOUR', 400, 'STUDENT');
  await prisma.spacePrice.create({
    data: { spaceId, period: 'HOUR', audience: 'GENERAL', shiftId: evening, amountAgorot: 300 },
  });
});

/** Reads as the caller, through `app` unless another is given. */
function read(caller: { authorization: string }, path: string, through = app) {
  return request(through)
    .get(`/api/v1/manage/spaces/${String(spaceId)}${path}`)
    .set('Authorization', caller.authorization);
}

/** Checks a visitor in at 08:00, through the API; answers the visit's id. */
async function checkedIn() {
  const response = await request(at('08:00'))
    .post(`/api/v1/manage/spaces/${String(spaceId)}/visits`)
    .set('Authorization', owner.authorization)
    .set('Idempotency-Key', randomUUID())
    .send({ visitorName: 'Omar' });
  return (dataOf(response) as { id: number }).id;
}

describe("a visit's quote and the visit terms", () => {
  it('the quote of an open visit is its charge now; a closed visit has none', async () => {
    const visitId = await checkedIn();

    for (const caller of [owner, reception]) {
      const response = await read(caller, `/visits/${String(visitId)}`);
      expect(response.status).toBe(200);
      expect(dataOf(response)).toEqual({
        id: visitId,
        visitorName: 'Omar',
        customer: null,
        audience: 'GENERAL',
        shiftId: null,
        hourRateAgorot: 500,
        dayRateAgorot: 2_500,
        checkedInAt: '2026-10-18T05:00:00.000Z',
        checkedOutAt: null,
        checkoutMethod: null,
        charge: null,
        writeOff: null,
        // 2 h 20 min, up after 15 minutes: 3 hours at 5 ₪.
        quote: {
          at: '2026-10-18T07:20:00.000Z',
          chargeAgorot: 1_500,
          billedMinutes: 140,
          capApplied: false,
        },
      });
    }

    const closed = await request(app)
      .post(`/api/v1/manage/spaces/${String(spaceId)}/visits/${String(visitId)}/check-out`)
      .set('Authorization', owner.authorization)
      .set('Idempotency-Key', randomUUID())
      .send({ payment: { amountAgorot: 1_500, method: 'CASH' } });
    expect(closed.status).toBe(200);
    const response = await read(owner, `/visits/${String(visitId)}`, at('11:00'));
    expect(dataOf(response)).toMatchObject({
      checkedOutAt: '2026-10-18T07:20:00.000Z',
      charge: { amountAgorot: 1_500 },
      quote: null,
    });

    // With no rate, the quote has no charge, only the minutes.
    await prisma.spacePrice.deleteMany({ where: { spaceId } });
    const unrated = await checkedIn();
    expect(dataOf(await read(owner, `/visits/${String(unrated)}`))).toMatchObject({
      quote: { chargeAgorot: null, billedMinutes: 140, capApplied: null },
    });
  });

  it("the quote of a stay past its day's end charges it up to 23:59 of its check-in's day, at the time sent back", async () => {
    // Checked in on Saturday at 21:00, after closing, so due at 23:59: 2 h 59 min, up after 15
    // minutes, is 3 hours at 5 ₪ (up to 10:20, 13 h 20 min, it would be capped at the day price).
    const { id } = await createVisit(spaceId, {
      checkedInAt: new Date('2026-10-17T21:00:00+03:00'),
      hourRateAgorot: 500,
      dayRateAgorot: 2_500,
    });

    const response = await read(owner, `/visits/${String(id)}`);
    expect(response.status).toBe(200);
    expect((dataOf(response) as { quote: object }).quote).toEqual({
      at: '2026-10-18T07:20:00.000Z',
      chargeAgorot: 1_500,
      billedMinutes: 179,
      capApplied: false,
    });
  });

  it('the visit terms: the rounding, the cap, the rates per shift, the student rates only where they change one, and whether the caller may type a price', async () => {
    const terms = await read(owner, '/visit-terms');
    expect(terms.status).toBe(200);
    expect(dataOf(terms)).toEqual({
      rounding: { rule: 'UP_AFTER_MINUTES', minutes: 15 },
      capAtDayPrice: true,
      mayTypePrice: true,
      rates: [
        {
          shiftId: null,
          general: { hourAgorot: 500, dayAgorot: 2_500 },
          student: { hourAgorot: 400, dayAgorot: 2_500 },
        },
        // The evening's own hour price; a student pays it too, so no student rates.
        { shiftId: evening, general: { hourAgorot: 300, dayAgorot: 2_500 }, student: null },
        // No price of its own: the prices with no shift.
        {
          shiftId: morning,
          general: { hourAgorot: 500, dayAgorot: 2_500 },
          student: { hourAgorot: 400, dayAgorot: 2_500 },
        },
      ],
    });

    expect(dataOf(await read(reception, '/visit-terms'))).toMatchObject({ mayTypePrice: false });
    await prisma.spaceSettings.update({
      where: { spaceId },
      data: { receptionMayTypePrices: true, visitStudentPrices: false },
    });
    const switched = dataOf(await read(reception, '/visit-terms')) as {
      mayTypePrice: boolean;
      rates: { student: unknown }[];
    };
    expect(switched.mayTypePrice).toBe(true);
    // Student prices off: no student rates anywhere.
    expect(switched.rates.map(({ student }) => student)).toEqual([null, null, null]);
  });

  it('refuses a stranger, an owner of another space and the admin with not_found', async () => {
    const visitId = await checkedIn();
    for (const caller of [stranger, unrelatedOwner, admin]) {
      for (const path of [`/visits/${String(visitId)}`, '/visit-terms']) {
        const response = await read(caller, path);
        expect(response.status).toBe(404);
        expect(errorOf(response).type).toBe('not_found');
      }
    }

    // Another space's visit is not this space's.
    const theirs = await createVisit(otherSpaceId, { checkedInAt: sunday('08:00') });
    expect((await read(owner, `/visits/${String(theirs.id)}`)).status).toBe(404);
  });
});
