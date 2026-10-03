import { describe, expect, it } from 'vitest';
import { settle, type FakeAnswer } from '../../test/fakeAdapter';
import { AppError } from './AppError';
import { toAppError } from './toAppError';

const REQUEST_ID = '0b5c8f9e-6a51-4a4e-9d6c-2f1f0f9a7c11';

/** The failure Axios rejects with for this answer. */
function failed(answer: FakeAnswer): unknown {
  return settle(answer);
}

function envelope(error: Record<string, unknown>) {
  return { success: false, error: { message: 'For developers', requestId: REQUEST_ID, ...error } };
}

describe('toAppError, given the server’s envelope', () => {
  it('takes a known error type from the envelope, over the status', () => {
    const error = toAppError(failed({ status: 400, data: envelope({ type: 'validation' }) }));

    expect(error.type).toBe('validation');
    expect(error.status).toBe(400);
  });

  it('infers the type from the status when the envelope’s type is unknown', () => {
    const error = toAppError(failed({ status: 409, data: envelope({ type: 'brand_new_type' }) }));

    expect(error.type).toBe('conflict');
  });

  it('carries the domain code, the field errors and the request id', () => {
    const error = toAppError(
      failed({
        status: 409,
        data: envelope({
          type: 'conflict',
          code: 'EMAIL_TAKEN',
          errors: { email: ['not_unique'] },
        }),
      }),
    );

    expect(error.code).toBe('EMAIL_TAKEN');
    expect(error.errors).toEqual({ email: ['not_unique'] });
    expect(error.requestId).toBe(REQUEST_ID);
  });

  it('drops a domain code the client does not know', () => {
    const error = toAppError(
      failed({ status: 409, data: envelope({ type: 'conflict', code: 'NOT_A_KNOWN_CODE' }) }),
    );

    expect(error.code).toBeUndefined();
    expect(error.type).toBe('conflict');
  });

  it('keeps only the field-error codes the client knows, and drops a field left with none', () => {
    const error = toAppError(
      failed({
        status: 422,
        data: envelope({
          type: 'validation',
          errors: { phone: ['invalid_format', 'brand_new_code'], name: ['brand_new_code'] },
        }),
      }),
    );

    expect(error.errors).toEqual({ phone: ['invalid_format'] });
  });

  it('carries Retry-After as whole seconds', () => {
    const error = toAppError(
      failed({
        status: 429,
        data: envelope({ type: 'rate_limit' }),
        headers: { 'Retry-After': '30' },
      }),
    );

    expect(error.retryAfterSeconds).toBe(30);
  });
});

describe('toAppError, given an answer without the envelope', () => {
  it('reads the request id from the X-Request-Id header', () => {
    const error = toAppError(
      failed({
        status: 502,
        data: '<html>Bad gateway</html>',
        headers: { 'X-Request-Id': REQUEST_ID },
      }),
    );

    expect(error.requestId).toBe(REQUEST_ID);
  });

  it('types a status of the contract by its status', () => {
    expect(toAppError(failed({ status: 503 })).type).toBe('service_unavailable');
  });

  it('types any other 5xx as server', () => {
    expect(toAppError(failed({ status: 502 })).type).toBe('server');
  });

  it('types any other status as unknown', () => {
    expect(toAppError(failed({ status: 418 })).type).toBe('unknown');
  });
});

describe('toAppError, given no answer', () => {
  it('types ERR_NETWORK as network, with status 0', () => {
    const error = toAppError(failed({ failure: 'ERR_NETWORK' }));

    expect(error.type).toBe('network');
    expect(error.status).toBe(0);
  });

  it('types ECONNABORTED and ETIMEDOUT as timeout', () => {
    expect(toAppError(failed({ failure: 'ECONNABORTED' })).type).toBe('timeout');
    expect(toAppError(failed({ failure: 'ETIMEDOUT' })).type).toBe('timeout');
  });

  it('types ERR_CANCELED as canceled', () => {
    expect(toAppError(failed({ failure: 'ERR_CANCELED' })).type).toBe('canceled');
  });
});

describe('toAppError, given anything else', () => {
  it('passes an AppError through unchanged', () => {
    const original = new AppError({ type: 'forbidden', status: 403, message: 'Forbidden' });

    expect(toAppError(original)).toBe(original);
  });

  it('types a thrown Error as unknown, keeping it as the cause', () => {
    const thrown = new TypeError('x is not a function');
    const error = toAppError(thrown);

    expect(error).toBeInstanceOf(AppError);
    expect(error.type).toBe('unknown');
    expect(error.cause).toBe(thrown);
  });

  it('types a thrown non-error as unknown', () => {
    expect(toAppError('a string').type).toBe('unknown');
  });
});
