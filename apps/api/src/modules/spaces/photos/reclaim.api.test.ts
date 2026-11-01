import { utimes } from 'node:fs/promises';
import path from 'node:path';

import { pino } from 'pino';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createTestApp } from '../../../../test/app.ts';
import { dataOf } from '../../../../test/admin.ts';
import { createSpace } from '../../../../test/factories.ts';
import { resetDatabase } from '../../../../test/reset-database.ts';
import { addPhotos } from '../../../../test/spaces.ts';
import { createTestStorage, type TestStorage } from '../../../../test/storage.ts';
import { prisma } from '../../../db/index.ts';

// The reclamation of the files no photo holds (finding 63; api-contract › Internal): a timed job,
// acting only in Gaza's 03:00 hour, on Sunday 2026-10-18 (UTC+3).

const SECRET = 'a-jobs-secret-of-at-least-32-characters';
const gaza = (time: string) => new Date(`2026-10-18T${time}+03:00`);
const file = { bytes: Buffer.from('RIFF....WEBP'), contentType: 'image/webp' };

let store: TestStorage;

beforeEach(async () => {
  await resetDatabase(prisma);
  store = await createTestStorage();
});

afterEach(async () => {
  await store.cleanup();
});

/** Every line the API logs, parsed. */
function recordingLogger() {
  const lines: Record<string, unknown>[] = [];
  const logger = pino(
    { level: 'info' },
    { write: (line: string) => void lines.push(JSON.parse(line) as Record<string, unknown>) },
  );
  return { logger, lines };
}

/** Stores a file dated `at`. */
async function stored(key: string, at: Date) {
  await store.storage.put(key, file);
  await utimes(path.join(store.root, ...key.split('/')), at, at);
}

/** Runs the timed jobs at `at`: the reclamation's counts. */
async function reclaimAt(at: Date, logger = pino({ level: 'silent' })) {
  const response = await request(
    createTestApp({ jobsSecret: SECRET, clock: () => at, storage: store.storage, logger }),
  )
    .post('/api/v1/internal/jobs/run')
    .set('Authorization', `Bearer ${SECRET}`);
  expect(response.status).toBe(200);
  const { jobs } = dataOf(response) as { jobs: { name: string; done: object }[] };
  return jobs.find(({ name }) => name === 'photos.reclaimOrphans')?.done;
}

describe('the reclamation of files no photo holds', () => {
  it('removes only the files no row holds and older than an hour, in its hour', async () => {
    const { id: spaceId } = await createSpace();
    await addPhotos(spaceId, ['held']);
    const old = gaza('01:00:00');
    await stored('spaces/held/card.webp', old);
    await stored('spaces/held/page.webp', old);
    await stored('spaces/gone/card.webp', old);
    await stored('spaces/gone/page.webp', old);
    // Stored 30 minutes ago: its photo's row may still be on its way.
    await stored('spaces/fresh/card.webp', gaza('03:00:00'));

    // Outside its hour it does nothing.
    expect(await reclaimAt(gaza('04:30:00'))).toEqual({ skipped: true });
    expect(await store.files()).toHaveLength(5);

    const { logger, lines } = recordingLogger();
    expect(await reclaimAt(gaza('03:30:00'), logger)).toEqual({ removed: 2, kept: 3 });
    expect(await store.files()).toEqual([
      'spaces/fresh/card.webp',
      'spaces/held/card.webp',
      'spaces/held/page.webp',
    ]);
    expect(lines.filter(({ msg }) => msg === '[storage:reclaimed]').map(({ key }) => key)).toEqual(
      expect.arrayContaining(['spaces/gone/card.webp', 'spaces/gone/page.webp']),
    );
  });

  it('removes at most 200 files a run, the rest left to the next', async () => {
    const old = gaza('01:00:00');
    await Promise.all(
      Array.from({ length: 101 }, (_, i) => [
        stored(`spaces/gone${String(i)}/card.webp`, old),
        stored(`spaces/gone${String(i)}/page.webp`, old),
      ]).flat(),
    );

    expect(await reclaimAt(gaza('03:30:00'))).toEqual({ removed: 200, kept: 2 });
    expect(await store.files()).toHaveLength(2);
  });
});
