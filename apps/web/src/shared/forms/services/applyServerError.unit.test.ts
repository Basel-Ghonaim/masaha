import { AppError } from '@shared/errors';
import { describe, expect, it, vi } from 'vitest';
import { applyServerError } from './applyServerError';

type Values = { name: string; email: string; password: string };
const FIELDS = ['name', 'email', 'password'] as const;

function failure(fields: Partial<ConstructorParameters<typeof AppError>[0]> = {}) {
  return new AppError({ type: 'validation', status: 422, message: 'Fake', ...fields });
}

describe('applyServerError', () => {
  it("puts each field's first code on it, in the form's order", () => {
    const setError = vi.fn();
    const error = failure({
      errors: { password: ['too_short'], email: ['invalid_format', 'too_long'] },
    });

    const left = applyServerError<Values>(error, setError, FIELDS);

    expect(left).toBeNull();
    expect(setError.mock.calls).toEqual([
      ['email', { type: 'invalid_format' }],
      ['password', { type: 'too_short' }],
    ]);
  });

  it('places a conflict on its field and leaves the form nothing to show', () => {
    const setError = vi.fn();
    const error = failure({
      type: 'conflict',
      status: 409,
      code: 'EMAIL_TAKEN',
      errors: { email: ['not_unique'] },
    });

    expect(applyServerError<Values>(error, setError, FIELDS)).toBeNull();
    expect(setError).toHaveBeenCalledWith('email', { type: 'not_unique' });
  });

  it('hands the form a failure with no field errors, to show as its message', () => {
    const setError = vi.fn();
    const error = failure({ type: 'unauthorized', status: 401, code: 'INVALID_CREDENTIALS' });

    expect(applyServerError<Values>(error, setError, FIELDS)).toBe(error);
    expect(setError).not.toHaveBeenCalled();
  });

  it("hands the form a failure whose field errors name none of the form's fields", () => {
    const setError = vi.fn();
    const error = failure({ errors: { phone: ['invalid_format'] } });

    expect(applyServerError<Values>(error, setError, FIELDS)).toBe(error);
    expect(setError).not.toHaveBeenCalled();
  });
});
