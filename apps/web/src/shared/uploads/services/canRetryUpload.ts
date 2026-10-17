import type { AppError } from '@shared/errors';

/**
 * The failures an upload may be sent again after: the answer never arrived, or arrived broken, so
 * the same bytes may yet succeed. A `rate_limit` is one of them — the window is the server's, and
 * its `Retry-After` says when.
 */
const RETRYABLE = [
  'network',
  'timeout',
  'canceled',
  'unknown',
  'server',
  'service_unavailable',
  'rate_limit',
] as const satisfies readonly AppError['type'][];

/**
 * Whether a re-send of these same bytes could succeed, so a failed upload offers a retry where one
 * can work and none where it cannot. Every 4xx is the server's verdict on what was sent: a re-send
 * of the same file meets it again.
 */
export function canRetryUpload(error: Pick<AppError, 'type'> | AppError): boolean {
  return (RETRYABLE as readonly string[]).includes(error.type);
}
