import { AppError } from '@shared/errors';
import { describe, expect, it, vi } from 'vitest';
import { deskFailure } from './deskRefusal';

const LINES = {
  lost: 'No answer came back. Try again — it won’t be recorded twice.',
  nothing: 'Nothing was recorded.',
  retryLabel: 'Try again',
};

const refusal = (type: ConstructorParameters<typeof AppError>[0]['type']) =>
  new AppError({ type, status: 0, message: 'Fake' });

describe('deskFailure', () => {
  it('says a lost answer can be sent again, and offers to', () => {
    const retry = vi.fn();
    for (const type of ['network', 'timeout'] as const) {
      expect(
        deskFailure(refusal(type), null, { ...LINES, title: 'We couldn’t check out', retry }),
      ).toEqual({
        kind: 'offline',
        title: 'We couldn’t check out',
        message: LINES.lost,
        retryLabel: 'Try again',
        retry,
      });
    }
  });

  it('says a refusal recorded nothing, before its reason', () => {
    expect(
      deskFailure(
        refusal('conflict'),
        { kind: 'refused', title: 'We couldn’t check out', message: 'Another desk did it.' },
        { ...LINES, title: 'We couldn’t check out', retry: vi.fn() },
      ),
    ).toEqual({
      kind: 'refused',
      title: 'We couldn’t check out',
      message: 'Nothing was recorded. Another desk did it.',
    });
  });

  it('keeps the countdown of too many attempts, and nothing without a failure', () => {
    const wait = { kind: 'rateLimit', message: 'Try again in 0:30' } as const;
    expect(deskFailure(refusal('rate_limit'), wait, { ...LINES, title: 'x', retry: vi.fn() })).toBe(
      wait,
    );
    expect(deskFailure(null, null, { ...LINES, title: 'x', retry: vi.fn() })).toBeNull();
  });
});
