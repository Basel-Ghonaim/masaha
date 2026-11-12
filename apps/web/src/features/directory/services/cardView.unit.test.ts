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
  worksEvenings: false,
  cover: '/api/v1/files/spaces/x/card.webp',
  liveStatus: 'AVAILABLE',
  hoursStatus: null,
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

  it('shows an unverified space’s state by its hours, always neutral, never its live status’s colours', () => {
    const unverified = { ...SPACE, isVerified: false, liveStatus: null };
    expect(card({ ...unverified, hoursStatus: 'OPEN' }).status).toEqual({
      label: 'مفتوحة الآن',
      variant: 'neutral',
    });
    expect(card({ ...unverified, hoursStatus: 'CLOSED' }).status).toEqual({
      label: 'مغلقة الآن',
      variant: 'neutral',
    });
    expect(
      cardViewOf(
        { ...unverified, hoursStatus: 'OPEN' },
        { english: true, now: NOW, copy: CATALOGUES.en, byDistance: false },
      ).status,
    ).toEqual({ label: 'Open now', variant: 'neutral' });
    // Without hours: none, in words.
    expect(card({ ...unverified, hoursStatus: null }).status).toBeNull();
  });

  it('keeps a verified space’s live status, whatever its state by its hours says', () => {
    expect(card({ ...SPACE, liveStatus: 'FULL', hoursStatus: 'OPEN' }).status).toEqual({
      label: 'ممتلئ',
      variant: 'warning',
    });
    expect(card({ ...SPACE, liveStatus: null, hoursStatus: 'OPEN' }).status).toBeNull();
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
      today: 'ساعات العمل غير متوفرة',
      distance: null,
      price: null,
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

  it('says the subscription’s price, isolated, only with a period and a price in the answer', () => {
    const priced = { ...SPACE, priceAgorot: 1500 };
    expect(
      cardViewOf(priced, {
        english: false,
        now: NOW,
        copy: CATALOGUES.ar,
        byDistance: false,
        period: 'DAY',
      }).price,
    ).toBe('\u2066\u200f15\u00a0₪\u2069 / يوم');
    expect(
      cardViewOf(priced, {
        english: true,
        now: NOW,
        copy: CATALOGUES.en,
        byDistance: false,
        period: 'MONTH',
      }).price,
    ).toBe('\u2066₪15\u2069 / month');
    expect(
      cardViewOf(
        { ...SPACE, priceAgorot: 1250 },
        { english: true, now: NOW, copy: CATALOGUES.en, byDistance: false, period: 'HOUR' },
      ).price,
    ).toBe('\u2066₪12.50\u2069 / hour');
    // Under «الكل», or with no price in the answer, none.
    expect(card(priced).price).toBeNull();
    expect(
      cardViewOf(SPACE, {
        english: false,
        now: NOW,
        copy: CATALOGUES.ar,
        byDistance: false,
        period: 'DAY',
      }).price,
    ).toBeNull();
  });
});
