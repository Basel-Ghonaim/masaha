import { AppError } from '@shared/errors';
import { describe, expect, it } from 'vitest';
import { canRetryUpload } from './canRetryUpload';

describe('canRetryUpload', () => {
  it.each([
    'network',
    'timeout',
    'canceled',
    'unknown',
    'server',
    'service_unavailable',
    'rate_limit',
  ] as const)('offers a retry after %s, which another attempt could cure', (type) => {
    expect(canRetryUpload({ type })).toBe(true);
  });

  it.each([
    'bad_request',
    'unauthorized',
    'forbidden',
    'not_found',
    'conflict',
    'validation',
    'payload_too_large',
    'unsupported_media_type',
  ] as const)('offers none after %s, which the server judged about these bytes', (type) => {
    expect(canRetryUpload({ type })).toBe(false);
  });

  it('reads the refusal as it is caught, so a caller hands it over whole', () => {
    expect(
      canRetryUpload(new AppError({ type: 'service_unavailable', status: 503, message: '' })),
    ).toBe(true);
  });
});
