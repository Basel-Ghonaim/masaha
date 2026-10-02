import type { Logger } from 'pino';

import type { Limiter, RateLimitPolicy, Reservation } from '../../../shared/rate-limit/index.ts';
import { AppError } from '../../../shared/errors/index.ts';
import type { EmailResult, EmailSender } from './emailSender.ts';

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
      // One warn line per unsent email, with a fixed reason: never the address or the message.
      const notSent = (reason: string, detail?: object): EmailResult => {
        logger.warn(
          { reason, ...detail },
          reason === 'ceiling' ? CEILING_REACHED : '[email] not sent',
        );
        return { sent: false, reason };
      };
      // A cap that refused is a refusal; any other error means the cap could not be checked, and
      // nothing is sent (fail closed).
      const refusal = (error: unknown, cap: string) => {
        if (error instanceof AppError && error.type === 'rate_limit') return notSent(cap);
        logger.error({ err: error }, '[email] a cap could not be checked');
        return notSent('cap-unavailable');
      };

      try {
        await limiter.count(EMAIL_PER_RECIPIENT, message.to.toLowerCase());
      } catch (error) {
        return refusal(error, 'recipient-cap');
      }
      try {
        await limiter.count(EMAIL_CEILING, 'all');
      } catch (error) {
        return refusal(error, 'ceiling');
      }
      let requester: Reservation | undefined;
      if (context) {
        try {
          requester = await limiter.reserve(EMAIL_PER_REQUESTER, context.requester);
        } catch (error) {
          return refusal(error, 'requester-cap');
        }
      }

      let result: EmailResult;
      try {
        result = await inner.send(message);
      } catch (error) {
        logger.error({ err: error }, '[email] the sender threw');
        result = { sent: false, reason: 'sender-threw' };
      }
      if (result.sent) return result;
      await requester?.refund();
      notSent(result.reason, result.detail);
      return result;
    },
  };
}
