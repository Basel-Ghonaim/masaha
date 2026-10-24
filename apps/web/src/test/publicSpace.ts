import type { PublicSpace } from '@masaha/shared/directory';

/** A space's page as the server answers it, changed as a test needs. */
export function publicSpace(change: Partial<PublicSpace> = {}): PublicSpace {
  return {
    id: 7,
    slug: 'noor-hub',
    nameEn: 'Noor Hub',
    nameAr: 'نور هب',
    descriptionAr: 'قاعة هادئة للعمل.',
    descriptionEn: null,
    area: { id: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
    addressAr: 'شارع عمر المختار',
    addressEn: null,
    landmarkAr: null,
    landmarkEn: null,
    location: { lat: 31.52, lng: 34.45 },
    isVerified: true,
    hours: {
      days: [
        { opensMinute: 480, closesMinute: 1320 },
        { opensMinute: 480, closesMinute: 1320 },
        { opensMinute: 480, closesMinute: 1320 },
        { opensMinute: 480, closesMinute: 1320 },
        { opensMinute: 480, closesMinute: 1320 },
        null,
        { opensMinute: 480, closesMinute: 1320 },
      ],
      shifts: [],
    },
    prices: [
      {
        period: 'DAY',
        audience: 'GENERAL',
        shiftId: null,
        labelAr: null,
        labelEn: null,
        amountAgorot: 2000,
      },
    ],
    amenities: [{ nameAr: 'إنترنت', nameEn: 'Internet', icon: 'wifi' }],
    contacts: [
      { type: 'WHATSAPP', value: '+970599111001' },
      { type: 'PHONE', value: '+970599111002' },
    ],
    updatedAt: {
      profile: '2026-10-20T08:00:00Z',
      hours: '2026-10-20T08:00:00Z',
      prices: '2026-10-20T08:00:00Z',
      amenities: '2026-10-20T08:00:00Z',
      contacts: '2026-10-20T08:00:00Z',
    },
    staleGroups: [],
    photos: [],
    announcements: [],
    ...change,
  };
}
