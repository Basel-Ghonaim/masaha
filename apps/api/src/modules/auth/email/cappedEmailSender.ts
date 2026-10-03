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

/**
 * What a log line may say of an error: its name and code, never its message, which can quote the
 * recipient's address.
 */
function errorShape(error: unknown): { error: string; code?: string } {
  const name = error instanceof Error ? error.name : typeof error;
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? { error: name, code } : { error: name };
}

/** The line to search the logs for when the ceiling trips. */
export const CEILING_REACHED = '[email:ceiling] the daily email ceiling is reached';

/**
 * The abuse controls, as a decorator over any sender, so the same path runs in every mode and is
 * exercised in development too. Every cap counts in the shared rate-limit table, keyed by digests:
 * no address is stored in clear. When a cap cannot be checked, nothing is sent (fail closed).
 *
 * The caps run in this order, so each is spent only by what the ones before it accepted:
 * 1. the requester's daily slot is reserved first, and given back whenever a later cap refuses or
 *    the send fails, so it counts only delivered emails;
 * 2. the inbox's hourly count, then the daily ceiling, count every attempt that reached them. The
 *    ceiling is therefore spent only by a request that both the requester cap and the inbox cap
 *    accepted: one address cannot exhaust it beyond its own 10 a day.
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
        logger.error(
          { reason: 'cap-unavailable', ...errorShape(error) },
          '[email] a cap could not be checked',
        );
        return notSent('cap-unavailable');
      };

      let requester: Reservation | undefined;
      if (context) {
        try {
          requester = await limiter.reserve(EMAIL_PER_REQUESTER, context.requester);
        } catch (error) {
          return refusal(error, 'requester-cap');
        }
      }
      try {
        await limiter.count(EMAIL_PER_RECIPIENT, message.to.toLowerCase());
      } catch (error) {
        await requester?.refund();
        return refusal(error, 'recipient-cap');
      }
      try {
        await limiter.count(EMAIL_CEILING, 'all');
      } catch (error) {
        await requester?.refund();
        return refusal(error, 'ceiling');
      }

      let result: EmailResult;
      try {
        result = await inner.send(message);
      } catch (error) {
        logger.error({ reason: 'sender-threw', ...errorShape(error) }, '[email] the sender threw');
        result = { sent: false, reason: 'sender-threw' };
      }
      if (result.sent) return result;
      await requester?.refund();
      notSent(result.reason, result.detail);
      return result;
    },
  };
}
