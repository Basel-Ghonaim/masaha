import { randomInt } from 'node:crypto';

/**
 * How long a forgotten password's answer that sends no email waits: about as long as a real send
 * takes, so a probe on a fast network cannot tell an address with an account from one without
 * (docs/backend/security.md › Passwords). An estimate of a send through Gmail's SMTP relay, not a
 * measurement: no send has been timed yet, here or on the deployment (finding 65).
 */
export const NO_SEND_WAIT = { minMs: 1_500, maxMs: 3_000 } as const;

/** A wait drawn anew for each answer, uniformly within the bounds: a fixed delay would itself tell. */
export function drawNoSendWait(): number {
  return randomInt(NO_SEND_WAIT.minMs, NO_SEND_WAIT.maxMs + 1);
}
