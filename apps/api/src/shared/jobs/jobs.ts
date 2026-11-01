import { performance } from 'node:perf_hooks';

import type { Logger } from 'pino';

/**
 * How many rows a sweep deletes at most a table a run, so a run stays within the function's time
 * (ADR 0014): what is left goes at the next run.
 */
export const SWEEP_BATCH = 5_000;

/**
 * What a job did, counted; `stalled: true` when it closed nothing and its failures filled a full
 * batch, so the next run would only fail the same rows again (finding 121).
 */
export type JobDone = Record<string, number | boolean>;

/** A module's timed work: what it did, counted, at the run's time. */
export interface Job {
  name: string;
  run(now: Date): Promise<JobDone>;
}

/** One run of every job: each one's counts, `null` for one that failed; whether one stalled. */
export interface JobsRun {
  ranAt: string;
  jobs: { name: string; done: JobDone | null }[];
  failed: boolean;
  stalled: boolean;
}

interface Dependencies {
  jobs: readonly Job[];
  /** The one clock (conventions §11). */
  now: () => Date;
  logger: Logger;
}

/**
 * The scheduler port (ADR 0014; conventions §12): runs each registered job in turn, at one time
 * read from the clock. A job that throws is logged and the others still run; so does one that
 * stalled, logged `job stalled` with its count of failures.
 */
export function createJobs({ jobs, now, logger }: Dependencies) {
  return {
    async run(): Promise<JobsRun> {
      const ranAt = now();
      const ran: JobsRun['jobs'] = [];
      for (const job of jobs) {
        const started = performance.now();
        try {
          const done = await job.run(ranAt);
          const ms = Math.round(performance.now() - started);
          logger.info({ job: job.name, ...done, ms }, 'job ran');
          if (done.stalled === true)
            logger.error({ job: job.name, failed: done.failed }, 'job stalled');
          ran.push({ name: job.name, done });
        } catch (error) {
          logger.error({ err: error, job: job.name }, 'job failed');
          ran.push({ name: job.name, done: null });
        }
      }
      return {
        ranAt: ranAt.toISOString(),
        jobs: ran,
        failed: ran.some(({ done }) => done === null),
        stalled: ran.some(({ done }) => done?.stalled === true),
      };
    },
  };
}

export type Jobs = ReturnType<typeof createJobs>;
