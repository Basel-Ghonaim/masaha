import { z } from 'zod';

import { VisitRounding } from '../../generated/prisma/enums.ts';

// The lookups every environment starts with: the owner's list of the Gaza Strip's governorates and
// areas (confirmed 2026-09-28) and the amenity list, in both languages. Order is display order.
// An inactive row is hidden from filters and forms, and the admin can restore it.

interface AreaSeed {
  readonly nameAr: string;
  readonly nameEn: string;
  readonly isActive: boolean;
}

interface GovernorateSeed extends AreaSeed {
  readonly areas: readonly AreaSeed[];
}

export const GOVERNORATES: readonly GovernorateSeed[] = [
  {
    nameAr: 'شمال غزة',
    nameEn: 'North Gaza',
    isActive: true,
    // One area for now: most of the governorate is unreachable.
    areas: [{ nameAr: 'شمال قطاع غزة', nameEn: 'North Gaza Strip', isActive: true }],
  },
  {
    nameAr: 'غزة',
    nameEn: 'Gaza City',
    isActive: true,
    areas: [
      { nameAr: 'الرمال', nameEn: 'Al-Rimal', isActive: true },
      { nameAr: 'النصر', nameEn: 'An-Nasr', isActive: true },
      { nameAr: 'الشيخ رضوان', nameEn: 'Sheikh Radwan', isActive: true },
      { nameAr: 'تل الهوا', nameEn: 'Tal al-Hawa', isActive: true },
      { nameAr: 'الشيخ عجلين', nameEn: 'Sheikh Ijlin', isActive: true },
      { nameAr: 'الصبرة', nameEn: 'Al-Sabra', isActive: true },
      { nameAr: 'الزيتون', nameEn: 'Al-Zeitoun', isActive: true },
      { nameAr: 'الدرج', nameEn: 'Al-Daraj', isActive: true },
      { nameAr: 'التفاح', nameEn: 'Al-Tuffah', isActive: true },
      { nameAr: 'الشاطئ', nameEn: 'Al-Shati (Beach)', isActive: true },
      { nameAr: 'الشجاعية', nameEn: "Al-Shuja'iyya", isActive: false },
    ],
  },
  {
    nameAr: 'الوسطى (دير البلح)',
    nameEn: 'Deir al-Balah (Middle Area)',
    isActive: true,
    areas: [
      { nameAr: 'دير البلح', nameEn: 'Deir al-Balah', isActive: true },
      { nameAr: 'النصيرات', nameEn: 'Nuseirat', isActive: true },
      { nameAr: 'البريج', nameEn: 'Bureij', isActive: true },
      { nameAr: 'المغازي', nameEn: 'Maghazi', isActive: true },
      { nameAr: 'الزوايدة', nameEn: 'Al-Zawaida', isActive: true },
    ],
  },
  {
    nameAr: 'خان يونس',
    nameEn: 'Khan Younis',
    isActive: true,
    areas: [
      { nameAr: 'خان يونس (المدينة)', nameEn: 'Khan Younis (city)', isActive: true },
      { nameAr: 'المواصي', nameEn: 'Al-Mawasi', isActive: true },
      { nameAr: 'بني سهيلا', nameEn: 'Bani Suheila', isActive: false },
      { nameAr: 'عبسان', nameEn: 'Abasan', isActive: false },
      { nameAr: 'القرارة', nameEn: 'Al-Qarara', isActive: false },
      { nameAr: 'خزاعة', nameEn: "Khuza'a", isActive: false },
    ],
  },
  {
    nameAr: 'رفح',
    nameEn: 'Rafah',
    // Wholly unreachable today.
    isActive: false,
    areas: [
      { nameAr: 'رفح (المدينة)', nameEn: 'Rafah (city)', isActive: false },
      { nameAr: 'تل السلطان', nameEn: 'Tal al-Sultan', isActive: false },
    ],
  },
];

// Icon keys are mapped to icons by the web (docs/architecture/findings.md, finding 10). The
// directory filter offers every amenity except those nearly every space has (isFilterable: false).
export const AMENITIES = [
  // One entry: no fiber or fast distinction.
  { key: 'internet', nameAr: 'إنترنت', nameEn: 'Internet', icon: 'wifi', isFilterable: false },
  {
    key: 'stable_power',
    nameAr: 'كهرباء مستقرة',
    nameEn: 'Stable power',
    icon: 'zap',
    isFilterable: false,
  },
  { key: 'solar_power', nameAr: 'طاقة شمسية', nameEn: 'Solar power', icon: 'sun' },
  {
    key: 'generator_line',
    nameAr: 'خط كهرباء مولّد',
    nameEn: 'Generator power line',
    icon: 'plug-zap',
  },
  { key: 'hot_drinks', nameAr: 'مشروبات ساخنة', nameEn: 'Hot drinks', icon: 'coffee' },
  { key: 'meeting_room', nameAr: 'قاعة اجتماعات', nameEn: 'Meeting room', icon: 'users' },
  // Amenities only in v1: no prices and no booking.
  {
    key: 'halls_for_rent',
    nameAr: 'قاعات للإيجار',
    nameEn: 'Halls for rent',
    icon: 'presentation',
  },
  {
    key: 'technical_training',
    nameAr: 'دورات تدريبية تقنية',
    nameEn: 'Technical training',
    icon: 'graduation-cap',
  },
] as const;

/**
 * The defaults a new space's settings are copied from (docs/backend/conventions.md › New-space
 * defaults). The rounding minutes belong to the "up after N minutes" rule, and only to it.
 * Moves into the platform-settings key catalogue when that module is built.
 */
export const newSpaceDefaultsSchema = z
  .object({
    autoCheckoutAtClosing: z.boolean(),
    visitRounding: z.enum(VisitRounding),
    visitRoundingMinutes: z.int().min(1).max(59).nullable(),
    visitCapAtDayPrice: z.boolean(),
  })
  .refine(
    ({ visitRounding, visitRoundingMinutes }) =>
      (visitRounding === 'UP_AFTER_MINUTES') === (visitRoundingMinutes !== null),
    { path: ['visitRoundingMinutes'], message: 'set exactly for the UP_AFTER_MINUTES rule' },
  );

export type NewSpaceDefaults = z.infer<typeof newSpaceDefaultsSchema>;

/** Platform settings with a default. The contact settings have none: the admin sets them. */
export const DEFAULT_SETTINGS = {
  stalenessDays: 60,
  priceStalenessDays: 30,
  newSpaceDefaults: {
    autoCheckoutAtClosing: true,
    visitRounding: 'UP_AFTER_MINUTES',
    visitRoundingMinutes: 15,
    visitCapAtDayPrice: true,
  } satisfies NewSpaceDefaults,
} as const;
