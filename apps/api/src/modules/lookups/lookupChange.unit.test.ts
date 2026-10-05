import { describe, expect, it } from 'vitest';

import { added, lookupChange } from './lookupChange.ts';

const rafah = { nameAr: 'رفح', nameEn: 'Rafah', isActive: true };

describe('added', () => {
  it('records what the lookup was created with', () => {
    expect(added('area', { governorateId: 2, nameAr: 'النصر', nameEn: 'An-Nasr' })).toEqual({
      action: 'area.added',
      entityType: 'area',
      after: { governorateId: 2, nameAr: 'النصر', nameEn: 'An-Nasr' },
    });
  });
});

describe('lookupChange', () => {
  it('writes and audits only the names that change, as edited', () => {
    expect(lookupChange('governorate', rafah, { nameAr: 'رفح', nameEn: 'Rafah City' })).toEqual({
      data: { nameEn: 'Rafah City' },
      entries: [
        {
          action: 'governorate.edited',
          entityType: 'governorate',
          before: { nameEn: 'Rafah' },
          after: { nameEn: 'Rafah City' },
        },
      ],
    });
  });

  it('audits an active lookup turned off as hidden', () => {
    expect(lookupChange('governorate', rafah, { isActive: false })).toEqual({
      data: { isActive: false },
      entries: [
        {
          action: 'governorate.hidden',
          entityType: 'governorate',
          before: { isActive: true },
          after: { isActive: false },
        },
      ],
    });
  });

  it('audits a hidden lookup turned on as restored', () => {
    const hidden = { ...rafah, isActive: false };

    expect(lookupChange('area', hidden, { isActive: true }).entries).toEqual([
      {
        action: 'area.restored',
        entityType: 'area',
        before: { isActive: false },
        after: { isActive: true },
      },
    ]);
  });

  it('audits a new name and the flag as two entries, edited first', () => {
    const { data, entries } = lookupChange('governorate', rafah, {
      nameAr: 'محافظة رفح',
      isActive: false,
    });

    expect(data).toEqual({ nameAr: 'محافظة رفح', isActive: false });
    expect(entries.map(({ action }) => action)).toEqual([
      'governorate.edited',
      'governorate.hidden',
    ]);
    expect(entries[0]).toMatchObject({
      before: { nameAr: 'رفح' },
      after: { nameAr: 'محافظة رفح' },
    });
  });

  it('writes and audits nothing when nothing changes', () => {
    expect(lookupChange('governorate', rafah, {})).toEqual({ data: {}, entries: [] });
    expect(lookupChange('governorate', rafah, { ...rafah })).toEqual({ data: {}, entries: [] });
  });

  it('audits any other changed field as edited, for an amenity', () => {
    const wifi = { ...rafah, icon: 'wifi', isFilterable: true };

    expect(lookupChange('amenity', wifi, { icon: 'zap', isFilterable: false }).entries).toEqual([
      {
        action: 'amenity.edited',
        entityType: 'amenity',
        before: { icon: 'wifi', isFilterable: true },
        after: { icon: 'zap', isFilterable: false },
      },
    ]);
  });
});
