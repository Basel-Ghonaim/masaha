import type { Logger } from 'pino';

/** The first run's delay after start, so the server is listening first. */
const FIRST_RUN_MS = 10_000;

/**
 * Runs `run` every `ms`, the first time 10 s after start, in this process (the local scheduler,
 * ADR 0014). A tick while a run is in flight is skipped; the timers never hold the process open.
 * Answers a function that stops them.
 */
export function startEvery(ms: number, run: () => Promise<unknown>, logger: Logger): () => void {
  let running = false;
  const tick = () => {
    if (running) return;
    running = true;
    run()
      .catch((error: unknown) => {
        logger.error({ err: error }, 'Timed jobs failed');
      })
      .finally(() => {
        running = false;
      });
  };
  const first = setTimeout(tick, FIRST_RUN_MS).unref();
  const every = setInterval(tick, ms).unref();
  return () => {
    clearTimeout(first);
    clearInterval(every);
  };
}
