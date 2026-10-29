import { gazaClockOf } from '@masaha/shared/core';
import { describe, expect, it } from 'vitest';

import { prisma } from './prisma.ts';

// Gaza's dates are read by two zone databases: Node's (the shared calendar) and PostgreSQL's (every
// `AT TIME ZONE 'Asia/Gaza'` of the money and the attendance). They must agree, above all where
// Gaza's offset changes (finding 120). The transitions are found with Node's own zone data, so no
// decree is written here.

const HOUR = 3_600_000;
const MINUTE = 60_000;

/** Gaza's offset from UTC at an instant, in minutes, as Node's zone data reads it. */
function offsetAt(instant: Date): number {
  const { date, minute } = gazaClockOf(instant);
  const [year = 0, month = 1, day = 1] = date.split('-').map(Number);
  const local = Date.UTC(year, month - 1, day) + minute * MINUTE;
  return Math.round((local - Math.floor(instant.getTime() / MINUTE) * MINUTE) / MINUTE);
}

/** Every instant of `year` where Gaza's offset changes, to the minute. */
function transitionsOf(year: number): Date[] {
  const found: Date[] = [];
  const end = Date.UTC(year + 1, 0, 1);
  for (let at = Date.UTC(year, 0, 1); at < end; at += HOUR) {
    if (offsetAt(new Date(at)) === offsetAt(new Date(at + HOUR))) continue;
    // The first minute of the hour at the new offset.
    let low = at;
    let high = at + HOUR;
    while (high - low > MINUTE) {
      const middle = low + Math.floor((high - low) / 2 / MINUTE) * MINUTE;
      if (offsetAt(new Date(middle)) === offsetAt(new Date(low))) low = middle;
      else high = middle;
    }
    found.push(new Date(high));
  }
  return found;
}

/** The Gaza date and minute of each instant, as PostgreSQL reads them. */
async function postgresClocks(instants: readonly Date[]) {
  const rows = await prisma.$queryRaw<{ at: Date; date: string; minute: number }[]>`
    SELECT at, (at AT TIME ZONE 'Asia/Gaza')::date::text AS date,
           (extract(hour FROM at AT TIME ZONE 'Asia/Gaza') * 60
             + extract(minute FROM at AT TIME ZONE 'Asia/Gaza'))::integer AS minute
    FROM unnest(${instants.map((instant) => instant.toISOString())}::timestamptz[]) AS at
    ORDER BY at`;
  return rows.map(({ date, minute }) => ({ date, minute }));
}

describe("Gaza's zone in PostgreSQL", () => {
  it("PostgreSQL's Gaza date equals Node's around every 2026 transition", async () => {
    const transitions = transitionsOf(2026);
    // Gaza moves its clocks twice a year: one change forward, one back.
    expect(transitions.length).toBeGreaterThanOrEqual(2);
    const instants = transitions.flatMap((t) => [
      new Date(t.getTime() - HOUR),
      t,
      new Date(t.getTime() + HOUR),
    ]);

    expect(await postgresClocks(instants)).toEqual(
      instants.map((instant) => {
        const { date, minute } = gazaClockOf(instant);
        return { date, minute };
      }),
    );
  });
});
