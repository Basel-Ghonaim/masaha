import type { AdminSpaceRow } from '@masaha/shared/space-links';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { rowView } from './rowView';

const NOW = new Date('2026-10-07T09:00:00Z');

const FOCUS: AdminSpaceRow = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: null,
  area: { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  state: 'verified',
  owners: [
    { id: 3, name: 'Ahmad' },
    { id: 4, name: 'مها' },
  ],
  staleGroups: [],
  missingGroups: [],
  lastUpdatedAt: '2026-09-27T08:00:00Z',
};

const english = (row: AdminSpaceRow) =>
  rowView(row, { lines: CATALOGUES.en.spaceLinks.adminList, english: true, now: NOW });
const arabic = (row: AdminSpaceRow) =>
  rowView(row, { lines: CATALOGUES.ar.spaceLinks.adminList, english: false, now: NOW });

describe('rowView', () => {
  it('names the space, its area, its state, its owners and its last update in English', () => {
    expect(english(FOCUS)).toEqual({
      id: 7,
      row: FOCUS,
      name: { text: 'Focus Hub' },
      area: 'Al-Rimal',
      state: { label: 'Verified', variant: 'success' },
      owners: '⁨Ahmad⁩, ⁨مها⁩',
      ownersLine: { shown: 'Owner: ⁨Ahmad⁩, ⁨مها⁩', heard: 'Owner: ⁨Ahmad⁩, ⁨مها⁩' },
      freshness: [{ label: 'Up to date', variant: 'success' }],
      lastUpdated: '27 Sept',
    });
  });

  it('shows an English-only name in the Arabic interface, marked as English', () => {
    expect(arabic(FOCUS)).toMatchObject({
      name: { text: 'Focus Hub', lang: 'en', dir: 'ltr' },
      area: 'الرمال',
      owners: '⁨Ahmad⁩، ⁨مها⁩',
      lastUpdated: '27 سبتمبر',
    });
  });

  it('shows the Arabic name in the Arabic interface, unmarked, and the English one in English', () => {
    const named = { ...FOCUS, nameAr: 'فوكس' };
    expect(arabic(named).name).toEqual({ text: 'فوكس' });
    expect(english(named).name).toEqual({ text: 'Focus Hub' });
  });

  it.each([
    ['verified', 'success', 'Verified'],
    ['unverified', 'neutral', 'Unverified'],
    ['hidden', 'warning', 'Hidden'],
  ] as const)('shows a %s space’s state as a %s badge', (state, variant, label) => {
    expect(english({ ...FOCUS, state }).state).toEqual({ label, variant });
  });

  it('shows a dash for a space with no owner, and reads it as having none', () => {
    const none = { ...FOCUS, owners: [] };
    expect(english(none).owners).toBeNull();
    expect(english(none).ownersLine).toEqual({ shown: 'Owner: —', heard: 'Owner: No owner' });
    expect(arabic(none).ownersLine).toEqual({
      shown: 'صاحب المساحة: —',
      heard: 'صاحب المساحة: بلا صاحب مساحة',
    });
  });

  it('names the stale groups on a warning badge and the missing ones on a neutral badge, in order', () => {
    const stale: AdminSpaceRow = {
      ...FOCUS,
      staleGroups: ['prices', 'contacts'],
      missingGroups: ['hours'],
    };

    expect(english(stale).freshness).toEqual([
      { label: 'Stale: Prices, Contacts', variant: 'warning' },
      { label: 'Missing: Opening hours', variant: 'neutral' },
    ]);
    expect(arabic(stale).freshness).toEqual([
      { label: 'قديمة: الأسعار، التواصل', variant: 'warning' },
      { label: 'غير مُدخلة: ساعات العمل', variant: 'neutral' },
    ]);
  });

  it('shows only the missing groups when nothing is stale', () => {
    expect(english({ ...FOCUS, missingGroups: ['amenities'] }).freshness).toEqual([
      { label: 'Missing: Amenities', variant: 'neutral' },
    ]);
  });
});
