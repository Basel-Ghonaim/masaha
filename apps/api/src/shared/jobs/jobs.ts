import { performance } from 'node:perf_hooks';

import type { Logger } from 'pino';

/** A module's timed work: what it did, counted, at the run's time. */
export interface Job {
  name: string;
  run(now: Date): Promise<Record<string, number>>;
}

/** One run of every job: each one's counts, `null` for one that failed. */
export interface JobsRun {
  ranAt: string;
  jobs: { name: string; done: Record<string, number> | null }[];
  failed: boolean;
}

interface Dependencies {
  jobs: readonly Job[];
  /** The one clock (conventions §11). */
  now: () => Date;
  logger: Logger;
}

/**
 * The scheduler port (ADR 0014; conventions §12): runs each registered job in turn, at one time
 * read from the clock. A job that throws is logged and the others still run.
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
      };
    },
  };
}

export type Jobs = ReturnType<typeof createJobs>;
