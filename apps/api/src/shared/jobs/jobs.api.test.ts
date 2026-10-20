import { pino } from 'pino';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../test/app.ts';
import { dataOf, errorOf } from '../../../test/admin.ts';
import {
  createCheckIn,
  createCustomer,
  createSpace,
  createSubscription,
  createVisit,
} from '../../../test/factories.ts';
import { resetDatabase } from '../../../test/reset-database.ts';
import { prisma } from '../../db/index.ts';

const SECRET = 'a-jobs-secret-of-at-least-32-characters';
const RUN = '/api/v1/internal/jobs/run';

/** A time on Sunday 2026-10-18 in Gaza, UTC+3 until 2026-10-24. */
const sunday = (time: string) => new Date(`2026-10-18T${time}+03:00`);

/** Every line the API logs, parsed. */
function recordingLogger() {
  const lines: Record<string, unknown>[] = [];
  const logger = pino(
    { level: 'info' },
    { write: (line: string) => void lines.push(JSON.parse(line) as Record<string, unknown>) },
  );
  return { logger, lines };
}

/** The API with the jobs' secret, its clock at 19:00 (every stay below is due). */
const withSecret = (logger = pino({ level: 'silent' })) =>
  createTestApp({ jobsSecret: SECRET, clock: () => sunday('19:00:00'), logger });

let spaceId: number;
let visitId: number;

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
  // No hours: due at 23:59 the day it opened; this one opened the day before.
  ({ id: visitId } = await createVisit(spaceId, {
    checkedInAt: new Date('2026-10-17T10:00:00+03:00'),
  }));
});

const stored = () => prisma.visit.findUniqueOrThrow({ where: { id: visitId } });

describe('the jobs endpoint', () => {
  it('refuses a missing or wrong secret with 401 and runs nothing', async () => {
    for (const authorization of [undefined, `Bearer ${SECRET}x`, SECRET]) {
      const call = request(withSecret()).post(RUN);
      const response = await (authorization ? call.set('Authorization', authorization) : call);
      expect(response.status).toBe(401);
      expect(errorOf(response).type).toBe('unauthorized');
    }
    expect(await stored()).toMatchObject({ checkedOutAt: null });
  });

  it('with the secret it runs the jobs and answers what each did', async () => {
    const response = await request(withSecret()).post(RUN).set('Authorization', `Bearer ${SECRET}`);

    expect(response.status).toBe(200);
    expect(dataOf(response)).toEqual({
      ranAt: '2026-10-18T16:00:00.000Z',
      jobs: [
        { name: 'visits.autoCheckOut', done: { visits: 1, remaining: 0 } },
        { name: 'subscriptions.autoCheckOut', done: { checkIns: 0, remaining: 0 } },
      ],
    });
    expect(await stored()).toMatchObject({ checkoutMethod: 'AUTO' });
  });

  it('without JOBS_SECRET the endpoint does not exist', async () => {
    const response = await request(createTestApp({ clock: () => sunday('19:00:00') }))
      .post(RUN)
      .set('Authorization', `Bearer ${SECRET}`);

    expect(response.status).toBe(404);
    expect(await stored()).toMatchObject({ checkedOutAt: null });
  });

  it('a failing job answers 500, logs it, and the other jobs still ran', async () => {
    // A space without its settings row is a fault by space-settings' rule: the visits' job throws.
    await prisma.spaceSettings.delete({ where: { spaceId } });
    const { id: otherId } = await createSpace('other-space');
    await prisma.spaceSettings.create({
      data: {
        spaceId: otherId,
        autoCheckoutAtClosing: true,
        visitRounding: 'PER_MINUTE',
        visitCapAtDayPrice: false,
      },
    });
    const customer = await createCustomer(otherId);
    const checkIn = await createCheckIn(await createSubscription(customer), {
      checkedInAt: new Date('2026-10-17T09:00:00+03:00'),
    });
    const { logger, lines } = recordingLogger();

    const response = await request(withSecret(logger))
      .post(RUN)
      .set('Authorization', `Bearer ${SECRET}`);

    expect(response.status).toBe(500);
    expect(errorOf(response).type).toBe('server');
    expect(lines.filter(({ msg }) => msg === 'job failed')).toMatchObject([
      { level: 50, job: 'visits.autoCheckOut', err: { type: 'Error' } },
    ]);
    expect(lines.filter(({ msg }) => msg === 'job ran')).toMatchObject([
      { level: 30, job: 'subscriptions.autoCheckOut', checkIns: 1, remaining: 0 },
    ]);
    expect(await prisma.checkIn.findUniqueOrThrow({ where: { id: checkIn.id } })).toMatchObject({
      checkedOutAt: new Date('2026-10-17T23:59:00+03:00'),
      checkoutMethod: 'AUTO',
    });
    expect(await stored()).toMatchObject({ checkedOutAt: null });
  });
});
