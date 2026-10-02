import { createHash } from 'node:crypto';

import type { Logger } from 'pino';

import type { Limiter, RateLimitPolicy, Reservation } from '../../../shared/rate-limit/index.ts';
import type { EmailSender } from './emailSender.ts';

// docs/backend/security.md › Passwords. The caps protect people and the sender, not the endpoint.
/** One inbox is never flooded. */
export const EMAIL_PER_RECIPIENT: RateLimitPolicy = {
  name: 'email-recipient',
  limit: 3,
  windowMs: 60 * 60_000,
};
/**
 * Delivered emails asked for from one address: one address cannot spend the daily ceiling on many
 * inboxes. Only a delivered email keeps its count.
 */
export const EMAIL_PER_REQUESTER: RateLimitPolicy = {
  name: 'email-requester',
  limit: 10,
  windowMs: 24 * 60 * 60_000,
};
/** Gmail's daily quota and the sender's reputation, with headroom: a circuit breaker. */
export const EMAIL_CEILING: RateLimitPolicy = {
  name: 'email-ceiling',
  limit: 100,
  windowMs: 24 * 60 * 60_000,
};

/** The line to search the logs for when the ceiling trips. */
export const CEILING_REACHED = '[email:ceiling] the daily email ceiling is reached';

/**
 * The abuse controls, as a decorator over any sender, so the same path runs in every mode and is
 * exercised in development too. Both caps count in the shared rate-limit table, keyed by digests:
 * no address is stored. When a cap cannot be checked, nothing is sent (fail closed).
 */
export function createCappedEmailSender(
  inner: EmailSender,
  { limiter, logger }: { limiter: Limiter; logger: Logger },
): EmailSender {
  return {
    async send(message, context) {
      const recipient = createHash('sha256').update(message.to.toLowerCase()).digest('hex');
      try {
        await limiter.count(EMAIL_PER_RECIPIENT, recipient);
      } catch {
        logger.warn({ reason: 'recipient-cap' }, '[email] not sent');
        return { sent: false, reason: 'recipient cap reached, or the cap could not be checked' };
      }
      try {
        await limiter.count(EMAIL_CEILING, 'all');
      } catch {
        logger.warn(CEILING_REACHED);
        return { sent: false, reason: 'ceiling reached, or the ceiling could not be checked' };
      }
      let requester: Reservation | undefined;
      if (context) {
        try {
          requester = await limiter.reserve(EMAIL_PER_REQUESTER, context.requester);
        } catch {
          logger.warn({ reason: 'requester-cap' }, '[email] not sent');
          return { sent: false, reason: 'requester cap reached, or the cap could not be checked' };
        }
      }
      const result = await inner.send(message);
      if (!result.sent) await requester?.refund();
      // The reason only: the message holds a single-use link, and the address is personal.
      if (!result.sent) logger.warn({ reason: result.reason }, '[email] not sent');
      return result;
    },
  };
}
