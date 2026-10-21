import { describe, expect, it } from 'vitest';
import { attendanceSchema } from './attendanceSchema';

const pathsOf = (result: ReturnType<typeof attendanceSchema.safeParse>) =>
  result.success ? [] : result.error.issues.map(({ path }) => path.join('.'));

describe('attendanceSchema', () => {
  it('merges both contracts’ refusals onto their fields: a capacity of 0, and 24 hours as 1440 minutes', () => {
    const refused = attendanceSchema.safeParse({
      capacity: 0,
      autoCheckoutAtClosing: true,
      maxStayMinutes: 24 * 60,
    });

    expect(pathsOf(refused)).toEqual(['capacity', 'maxStayMinutes']);
  });

  it('takes both parts whole when both pass', () => {
    expect(
      attendanceSchema.safeParse({
        capacity: null,
        autoCheckoutAtClosing: false,
        maxStayMinutes: 300,
      }),
    ).toEqual({
      success: true,
      data: { capacity: null, autoCheckoutAtClosing: false, maxStayMinutes: 300 },
    });
  });
});
