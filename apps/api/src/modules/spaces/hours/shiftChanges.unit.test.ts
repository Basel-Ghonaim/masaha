import { describe, expect, it } from 'vitest';

import { shiftChanges } from './shiftChanges.ts';

const MORNING = { id: 1, nameAr: 'صباحية', nameEn: 'Morning', startsMinute: 480, endsMinute: 780 };
const EVENING = { id: 2, nameAr: 'مسائية', nameEn: null, startsMinute: 780, endsMinute: 1080 };

describe('shiftChanges', () => {
  it('updates a kept shift by its id, in its new place, and creates one without an id', () => {
    const night = { nameAr: 'ليلية', nameEn: null, startsMinute: 1080, endsMinute: 1320 };

    expect(
      shiftChanges([MORNING, EVENING], [night, { ...EVENING, endsMinute: 1000 }, MORNING]),
    ).toEqual({
      unknown: [],
      remove: [],
      rename: [],
      update: [
        {
          id: 2,
          data: {
            nameAr: 'مسائية',
            nameEn: null,
            startsMinute: 780,
            endsMinute: 1000,
            sortOrder: 1,
          },
        },
        {
          id: 1,
          data: {
            nameAr: 'صباحية',
            nameEn: 'Morning',
            startsMinute: 480,
            endsMinute: 780,
            sortOrder: 2,
          },
        },
      ],
      create: [{ ...night, sortOrder: 0 }],
    });
  });

  it('removes the shifts the request leaves out, never re-creating a kept one', () => {
    const changes = shiftChanges([MORNING, EVENING], [{ ...MORNING, nameEn: 'AM' }]);

    expect(changes.remove).toEqual([2]);
    expect(changes.create).toEqual([]);
    expect(changes.update.map(({ id }) => id)).toEqual([1]);
  });

  it('renames out of the way every kept shift whose Arabic name changes, so two can swap names', () => {
    const changes = shiftChanges(
      [MORNING, EVENING],
      [
        { ...MORNING, nameAr: 'مسائية' },
        { ...EVENING, nameAr: 'صباحية' },
      ],
    );

    expect(changes.rename).toEqual([1, 2]);
  });

  it('names the positions of ids that are not the space’s shifts', () => {
    expect(shiftChanges([MORNING], [{ ...EVENING, id: 9 }, MORNING]).unknown).toEqual([0]);
  });

  it('treats a missing English name as none', () => {
    const unnamed = { id: 1, nameAr: 'صباحية', startsMinute: 480, endsMinute: 780 };

    expect(shiftChanges([MORNING], [unnamed]).update[0]?.data.nameEn).toBeNull();
  });
});
