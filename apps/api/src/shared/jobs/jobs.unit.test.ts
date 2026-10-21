import { pino } from 'pino';
import { describe, expect, it } from 'vitest';

import { createJobs } from './jobs.ts';

const RAN_AT = new Date('2026-10-18T16:00:00.000Z');

/** Every line the scheduler logs, parsed. */
function recordingLogger() {
  const lines: Record<string, unknown>[] = [];
  const logger = pino(
    { level: 'info' },
    { write: (line: string) => void lines.push(JSON.parse(line) as Record<string, unknown>) },
  );
  return { logger, lines };
}

describe('createJobs', () => {
  it('a job that throws fails the run, logged by name, and the jobs after it still run', async () => {
    const { logger, lines } = recordingLogger();
    const jobs = createJobs({
      jobs: [
        { name: 'throws', run: () => Promise.reject(new Error('the read failed')) },
        { name: 'runs', run: () => Promise.resolve({ stays: 2, failed: 0 }) },
      ],
      now: () => RAN_AT,
      logger,
    });

    expect(await jobs.run()).toEqual({
      ranAt: '2026-10-18T16:00:00.000Z',
      jobs: [
        { name: 'throws', done: null },
        { name: 'runs', done: { stays: 2, failed: 0 } },
      ],
      failed: true,
    });
    expect(lines.filter(({ msg }) => msg === 'job failed')).toMatchObject([
      { level: 50, job: 'throws' },
    ]);
  });

  it('a job that ran with stays it could not close does not fail the run: it counts them', async () => {
    const jobs = createJobs({
      jobs: [{ name: 'runs', run: () => Promise.resolve({ stays: 1, failed: 2 }) }],
      now: () => RAN_AT,
      logger: pino({ level: 'silent' }),
    });

    expect(await jobs.run()).toEqual({
      ranAt: '2026-10-18T16:00:00.000Z',
      jobs: [{ name: 'runs', done: { stays: 1, failed: 2 } }],
      failed: false,
    });
  });
});
