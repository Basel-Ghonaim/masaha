import type { DirectorySpace } from '@masaha/shared/directory';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { cardViewOf } from './cardView';

const SPACE: DirectorySpace = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: 'مركز التركيز',
  area: { id: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  days: null,
  cover: '/api/v1/files/spaces/x/card.webp',
  liveStatus: 'AVAILABLE',
};

const NOW = new Date('2026-10-21T12:00:00Z');
const card = (space: DirectorySpace, { english = false, byDistance = false } = {}) =>
  cardViewOf(space, { english, now: NOW, copy: CATALOGUES.ar, byDistance });

describe('cardViewOf', () => {
  it('shows a live state by its word and its role: available success, full warning, closed neutral, none in words', () => {
    expect(card(SPACE).status).toEqual({ label: 'متاح', variant: 'success' });
    expect(card({ ...SPACE, liveStatus: 'FULL' }).status).toEqual({
      label: 'ممتلئ',
      variant: 'warning',
    });
    expect(card({ ...SPACE, liveStatus: 'CLOSED' }).status).toEqual({
      label: 'مغلق الآن',
      variant: 'neutral',
    });
    const none = card({ ...SPACE, liveStatus: null });
    expect(none.status).toBeNull();
    expect(none.noStatus).toBe('لا تتوفر حالة مباشرة');
  });

  it('names the space in the interface’s language, its mark the shown name’s first letter, and says whether it is verified', () => {
    expect(card(SPACE)).toMatchObject({
      key: 7,
      slug: 'focus-hub',
      name: { text: 'مركز التركيز' },
      mark: 'م',
      areaId: 2,
      cover: '/api/v1/files/spaces/x/card.webp',
      verified: 'موثّقة',
      today: null,
      distance: null,
    });
    expect(card({ ...SPACE, distanceMeters: 700 }).distance).toBeNull();
    expect(card({ ...SPACE, distanceMeters: 700 }, { byDistance: true }).distance).toBe(
      'على بعد \u20660.7\u2069 كم',
    );
    expect(card({ ...SPACE, nameAr: null, isVerified: false })).toMatchObject({
      name: { text: 'Focus Hub', lang: 'en', dir: 'ltr' },
      mark: 'F',
      verified: null,
    });
  });
});
