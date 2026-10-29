import { describe, expect, it } from 'vitest';

import { adminSpacesQuerySchema, SPACE_STATUSES } from './requests.ts';

describe('the admin’s spaces list query', () => {
  it('the spaces list’s schema takes editable and the four others', () => {
    expect(SPACE_STATUSES).toEqual(['verified', 'unverified', 'hidden', 'deleted', 'editable']);
    for (const status of SPACE_STATUSES) {
      expect(adminSpacesQuerySchema.safeParse({ status }).success).toBe(true);
    }
    expect(adminSpacesQuerySchema.parse({ status: 'editable', stale: 'true' })).toMatchObject({
      status: 'editable',
      stale: true,
    });
    expect(adminSpacesQuerySchema.safeParse({ status: 'archived' }).success).toBe(false);
  });
});
