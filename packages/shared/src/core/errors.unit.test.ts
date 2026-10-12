import { describe, expect, it } from 'vitest';

import { errorTypeOfStatus } from './errors.ts';

describe('errorTypeOfStatus', () => {
  it.each([
    [400, 'bad_request'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'not_found'],
    [409, 'conflict'],
    [413, 'payload_too_large'],
    [415, 'unsupported_media_type'],
    [422, 'validation'],
    [429, 'rate_limit'],
    [500, 'server'],
    [503, 'service_unavailable'],
  ])('types %i as %s, as the contract gives it', (status, type) => {
    expect(errorTypeOfStatus(status)).toBe(type);
  });

  it.each([418, 502])('types %i, which the contract does not give, as none', (status) => {
    expect(errorTypeOfStatus(status)).toBeUndefined();
  });
});
