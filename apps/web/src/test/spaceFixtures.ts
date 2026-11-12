import type { AdminSpace, SpacePhoto } from '@masaha/shared/spaces';
import type { AmenityCatalogue } from '../features/spaces/types/AmenityCatalogue';

// A space's profile as the web's tests read it: one space, its photos, the platform's amenities.

// 10:00 in Gaza, a Tuesday.
export const NOW = new Date('2026-10-13T07:00:00Z');

/**
 * A space every section of the profile has something for: unverified, its groups dated three days
 * ago, open Saturday to Thursday 08:00–18:00, one morning shift, two prices, an amenity of the
 * platform's and one of its own, and two contacts.
 */
export const SPACE: AdminSpace = {
  id: 7,
  slug: 'focus-hub',
  nameEn: 'Focus Hub',
  nameAr: 'فوكس هب',
  descriptionAr: 'مساحة هادئة للعمل والدراسة.',
  descriptionEn: null,
  areaId: 11,
  addressAr: 'شارع النصر',
  addressEn: 'Al-Nasr Street',
  landmarkAr: 'قرب المفترق',
  landmarkEn: null,
  location: { lat: 31.5195, lng: 34.447 },
  isHidden: false,
  isVerified: false,
  owners: [],
  updatedAt: {
    profile: '2026-10-10T08:00:00Z',
    hours: '2026-10-10T08:00:00Z',
    prices: '2026-10-10T08:00:00Z',
    amenities: '2026-10-10T08:00:00Z',
    contacts: '2026-10-10T08:00:00Z',
  },
  staleGroups: [],
  missingGroups: [],
  hours: {
    worksEvenings: false,
    days: [
      { opensMinute: 480, closesMinute: 1080 },
      { opensMinute: 480, closesMinute: 1080 },
      { opensMinute: 480, closesMinute: 1080 },
      { opensMinute: 480, closesMinute: 1080 },
      { opensMinute: 480, closesMinute: 1080 },
      null,
      { opensMinute: 480, closesMinute: 1080 },
    ],
    shifts: [{ id: 21, nameAr: 'الصباحية', nameEn: 'Morning', startsMinute: 480, endsMinute: 780 }],
  },
  prices: [
    {
      period: 'DAY',
      audience: 'GENERAL',
      shiftId: null,
      labelAr: null,
      labelEn: null,
      amountAgorot: 2500,
    },
    {
      period: 'MONTH',
      audience: 'STUDENT',
      shiftId: null,
      labelAr: null,
      labelEn: null,
      amountAgorot: 30000,
    },
  ],
  amenityIds: [1],
  retiredAmenities: [],
  ownAmenities: [{ nameAr: 'مكتبة', nameEn: 'Library' }],
  contacts: [
    { type: 'WHATSAPP', value: '+970599123456', label: null },
    { type: 'OTHER', value: 'https://discord.gg/focushub', label: 'ديسكورد' },
  ],
};

/** A space just added: its profile dated, every other group never saved, nothing in them. */
export const NEW_SPACE: AdminSpace = {
  ...SPACE,
  descriptionAr: null,
  updatedAt: {
    profile: '2026-10-10T08:00:00Z',
    hours: null,
    prices: null,
    amenities: null,
    contacts: null,
  },
  missingGroups: ['hours', 'prices', 'amenities', 'contacts'],
  hours: null,
  prices: [],
  amenityIds: [],
  ownAmenities: [],
  contacts: [],
};

export const PHOTOS: SpacePhoto[] = [
  { id: 3, urls: { card: '/files/3-card.webp', page: '/files/3-page.webp' } },
  { id: 4, urls: { card: '/files/4-card.webp', page: '/files/4-page.webp' } },
  { id: 5, urls: { card: '/files/5-card.webp', page: '/files/5-page.webp' } },
];

/** The platform's amenities as the page hands them in: Internet, then Generator. */
export const CATALOGUE: NonNullable<AmenityCatalogue['entries']> = [
  { id: 1, nameAr: 'إنترنت', nameEn: 'Internet', icon: 'wifi', isActive: true },
  { id: 2, nameAr: 'مولّد', nameEn: 'Generator', icon: 'plug-zap', isActive: true },
];
