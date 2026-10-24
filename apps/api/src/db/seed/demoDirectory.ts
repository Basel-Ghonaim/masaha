import { randomUUID } from 'node:crypto';

import { normaliseContact, type ContactType } from '@masaha/shared/spaces';
import sharp from 'sharp';

import type { PrismaClient } from '../../generated/prisma/client.ts';
import { createPhotosService } from '../../modules/spaces/index.ts';
import { newSpaceDefaultsSchema } from '../../modules/platform-settings/index.ts';
import { hashPassword } from '../../modules/users/index.ts';
import { writeAudit } from '../../shared/audit/index.ts';
import type { Actor, LoadedSpace } from '../../shared/auth/index.ts';
import { createLogger } from '../../shared/http/index.ts';
import type { Storage } from '../../shared/storage/index.ts';
import { createRunInTransaction } from '../index.ts';
import { gazaClock } from './demo.ts';

// Development-only demo data for the public directory: 24 listed spaces across the Strip, with
// each case its pages show from data alone (docs/features/directory.md): verified and unverified
// spaces, prices hidden as stale, photos and none, no hours, shifts, student prices, Friday open
// and closed, each live state. Its own unit beside the demo space, which it never touches; dated
// around `now`. It never runs in production.

/** The set's marker: its first space. */
export const DIRECTORY_MARKER_SLUG = 'noor-hub';
/** The one owner of the set's verified spaces; never the demo space's owner. */
export const DIRECTORY_OWNER_EMAIL = 'demo-directory-owner@example.com';

export interface DemoDirectoryInput {
  /** The directory owner's password. */
  readonly password: string;
  /** process.env.NODE_ENV: the set refuses to run in production. */
  readonly nodeEnv: string | undefined;
  /** Where the photos' files are stored: the port the app serves them from. */
  readonly storage: Storage;
  readonly now?: Date;
}

/** `HH:MM`–`HH:MM`, on the Gaza clock. */
type Range = readonly [opens: string, closes: string];

interface SpaceSeed {
  slug: string;
  nameAr: string | null;
  nameEn: string;
  /** The area's English name, as the lookups seed it. */
  area: string;
  lat: number;
  lng: number;
  addressAr: string;
  addressEn?: string;
  descriptionAr?: string;
  descriptionEn?: string;
  verified: boolean;
  /**
   * Its week: `around-the-clock`, every day 0–1440; a range for every day, with Friday's own (null
   * closed), and today's Gaza day closed when `closedToday`; null, never saved.
   */
  hours: 'around-the-clock' | { open: Range; friday?: Range | null; closedToday?: boolean } | null;
  /** Saved this many days before now: older than the thresholds is stale. */
  hoursDaysAgo?: number;
  /** In shekels; the student prices apart. */
  prices: {
    hour?: number;
    day?: number;
    week?: number;
    month?: number;
    studentHour?: number;
    studentDay?: number;
    studentMonth?: number;
  };
  pricesDaysAgo?: number;
  /** Shifts, each with its month price in shekels. */
  shifts?: readonly { nameAr: string; nameEn: string; range: Range; month: number }[];
  amenities: readonly string[];
  ownAmenities?: readonly (readonly [nameAr: string, nameEn?: string])[];
  contacts: readonly (readonly [ContactType, string])[];
  /** Private: what the live status compares the people present with. */
  capacity?: number;
  /** Visitors checked in now. */
  present?: number;
  /** An active closure announcement, with no end. */
  closed?: boolean;
  photos?: number;
}

const DAY: Range = ['08:00', '22:00'];

export const DIRECTORY_SPACES: readonly SpaceSeed[] = [
  {
    slug: DIRECTORY_MARKER_SLUG,
    nameAr: 'نور هب',
    nameEn: 'Noor Hub',
    area: 'Al-Rimal',
    lat: 31.5228,
    lng: 34.4489,
    addressAr: 'شارع عمر المختار، قرب الجندي المجهول',
    addressEn: 'Omar Al-Mukhtar Street, near the Unknown Soldier Square',
    descriptionAr: 'مساحة واسعة بإنترنت سريع وطاقة شمسية، وركن هادئ للمكالمات.',
    descriptionEn: 'A wide space with fast internet, solar power and a quiet call booth.',
    verified: true,
    hours: { open: DAY, friday: null },
    prices: { hour: 6, day: 30, week: 140, month: 400, studentHour: 5, studentDay: 25 },
    shifts: [
      { nameAr: 'صباحي', nameEn: 'Morning', range: ['08:00', '15:00'], month: 250 },
      { nameAr: 'مسائي', nameEn: 'Evening', range: ['15:00', '22:00'], month: 220 },
    ],
    amenities: ['internet', 'stable_power', 'solar_power', 'hot_drinks', 'meeting_room'],
    ownAmenities: [['ركن هادئ للمكالمات', 'Quiet call booth'], ['خزائن شخصية']],
    contacts: [
      ['WHATSAPP', '+970599111001'],
      ['PHONE', '+970599111002'],
      ['INSTAGRAM', 'noorhub.gaza'],
    ],
    capacity: 30,
    present: 3,
    photos: 3,
  },
  {
    slug: 'sada-space',
    nameAr: 'مساحة صدى',
    nameEn: 'Sada Space',
    area: 'An-Nasr',
    lat: 31.5312,
    lng: 34.4583,
    addressAr: 'شارع النصر، مقابل مسجد التقوى',
    descriptionAr: 'غرفة صغيرة تعمل على مدار الساعة.',
    verified: true,
    hours: 'around-the-clock',
    prices: { hour: 5, day: 25 },
    amenities: ['internet', 'generator_line'],
    contacts: [['WHATSAPP', '+970599111011']],
    // As many present as it holds: full.
    capacity: 4,
    present: 4,
    photos: 1,
  },
  {
    slug: 'tal-al-hawa-desks',
    nameAr: 'مكاتب تل الهوى',
    nameEn: 'Tal al-Hawa Desks',
    area: 'Tal al-Hawa',
    lat: 31.5071,
    lng: 34.4405,
    addressAr: 'شارع الجامعات، قرب برج الظافر',
    addressEn: 'Universities Street, near Al-Thafer Tower',
    verified: true,
    hours: 'around-the-clock',
    prices: { hour: 4, day: 20, month: 300, studentDay: 15 },
    amenities: ['internet', 'stable_power', 'hot_drinks'],
    contacts: [
      ['WHATSAPP', '+970599111021'],
      ['EMAIL', 'desks@example.com'],
    ],
    capacity: 20,
    present: 2,
    photos: 2,
  },
  {
    slug: 'radwan-study-hall',
    nameAr: 'قاعة الرضوان للدراسة',
    nameEn: 'Radwan Study Hall',
    area: 'Sheikh Radwan',
    lat: 31.5361,
    lng: 34.4689,
    addressAr: 'الشيخ رضوان، قرب بركة الشيخ رضوان',
    verified: true,
    // Closed today, whichever day it is: outside its hours.
    hours: { open: ['09:00', '17:00'], closedToday: true },
    prices: { day: 15, studentDay: 10 },
    amenities: ['internet', 'stable_power'],
    contacts: [['PHONE', '+970599111031']],
    capacity: 25,
  },
  {
    slug: 'shati-sea-view',
    nameAr: 'إطلالة الشاطئ',
    nameEn: 'Shati Sea View',
    area: 'Al-Shati (Beach)',
    lat: 31.5335,
    lng: 34.4475,
    addressAr: 'شارع الرشيد، مقابل البحر',
    addressEn: 'Al-Rasheed Street, facing the sea',
    verified: true,
    hours: 'around-the-clock',
    prices: { hour: 5, day: 25, month: 350 },
    amenities: ['internet', 'solar_power', 'hot_drinks'],
    contacts: [['WHATSAPP', '+970599111041']],
    capacity: 15,
    // Closed by an announcement in force, while open by its hours.
    closed: true,
    photos: 1,
  },
  {
    slug: 'daraj-corner',
    nameAr: 'ركن الدرج',
    nameEn: 'Daraj Corner',
    area: 'Al-Daraj',
    lat: 31.5122,
    lng: 34.4702,
    addressAr: 'حي الدرج، شارع الوحدة',
    verified: true,
    // No hours: no live state.
    hours: null,
    prices: { hour: 4, day: 18 },
    amenities: ['internet'],
    contacts: [['PHONE', '+970599111051']],
    capacity: 10,
  },
  {
    slug: 'zeitoun-works',
    nameAr: null,
    nameEn: 'Zeitoun Works',
    area: 'Al-Zeitoun',
    lat: 31.4985,
    lng: 34.461,
    addressAr: 'حي الزيتون، شارع صلاح الدين',
    addressEn: 'Al-Zeitoun, Salah Al-Din Street',
    verified: true,
    hours: { open: ['10:00', '20:00'] },
    prices: { day: 20 },
    amenities: ['internet', 'generator_line'],
    contacts: [['WHATSAPP', '+970599111061']],
    // No capacity: no live state.
  },
  {
    slug: 'sabra-lab',
    nameAr: 'مختبر الصبرة',
    nameEn: 'Sabra Lab',
    area: 'Al-Sabra',
    lat: 31.504,
    lng: 34.4545,
    addressAr: 'حي الصبرة، قرب مفترق السامر',
    verified: true,
    hours: { open: ['08:00', '18:00'], friday: null },
    // Stale hours and prices: a verified space's prices are shown, with a note.
    hoursDaysAgo: 70,
    prices: { hour: 5, day: 22, studentDay: 18 },
    pricesDaysAgo: 40,
    amenities: ['internet', 'stable_power', 'technical_training'],
    contacts: [
      ['WHATSAPP', '+970599111071'],
      ['PHONE', '+970599111072'],
    ],
    capacity: 12,
  },
  {
    slug: 'tuffah-place',
    nameAr: 'مكان التفاح',
    nameEn: 'Tuffah Place',
    area: 'Al-Tuffah',
    lat: 31.5175,
    lng: 34.478,
    addressAr: 'حي التفاح، شارع يافا',
    verified: false,
    hours: { open: ['09:00', '21:00'] },
    // Stale on an unverified space: hidden, and found by no price filter.
    prices: { hour: 5, day: 22, studentDay: 18 },
    pricesDaysAgo: 60,
    amenities: ['internet', 'hot_drinks'],
    contacts: [['WHATSAPP', '+970599111081']],
    photos: 1,
  },
  {
    slug: 'freelancers-house',
    nameAr: 'بيت المستقلين',
    nameEn: 'Freelancers House',
    area: 'Al-Rimal',
    lat: 31.5196,
    lng: 34.4441,
    addressAr: 'الرمال، شارع الثلاثيني',
    addressEn: 'Al-Rimal, Al-Thalathini Street',
    descriptionAr: 'مكان للعاملين عن بعد، بمكاتب مشتركة وقاعة صغيرة.',
    verified: false,
    hours: { open: ['08:00', '20:00'], friday: ['14:00', '22:00'] },
    prices: { day: 20, month: 350 },
    amenities: ['internet', 'stable_power', 'meeting_room', 'halls_for_rent'],
    contacts: [
      ['WHATSAPP', '+970599111091'],
      ['FACEBOOK', 'freelancershouse.gaza'],
    ],
    photos: 2,
  },
  {
    slug: 'nasr-coworking',
    nameAr: 'النصر للعمل المشترك',
    nameEn: 'Nasr Coworking',
    area: 'An-Nasr',
    lat: 31.529,
    lng: 34.462,
    addressAr: 'شارع النصر، قرب مستشفى النصر',
    verified: false,
    hours: { open: ['09:00', '17:00'], friday: null },
    prices: { hour: 4, day: 18 },
    amenities: ['internet'],
    contacts: [['PHONE', '+970599111101']],
  },
  {
    slug: 'hawa-tech-space',
    nameAr: null,
    nameEn: 'Hawa Tech Space',
    area: 'Tal al-Hawa',
    lat: 31.505,
    lng: 34.437,
    addressAr: 'تل الهوى، شارع الكرامة',
    verified: false,
    hours: { open: ['10:00', '22:00'] },
    prices: { hour: 6, day: 28 },
    amenities: ['internet', 'stable_power', 'technical_training'],
    contacts: [['WHATSAPP', '+970599111111']],
  },
  {
    slug: 'jabalia-hub',
    nameAr: 'مساحة جباليا',
    nameEn: 'Jabalia Hub',
    area: 'North Gaza Strip',
    lat: 31.533,
    lng: 34.497,
    addressAr: 'جباليا البلد، قرب السوق',
    verified: true,
    hours: { open: ['08:00', '16:00'], friday: null },
    prices: { hour: 3, day: 15, studentDay: 12 },
    amenities: ['internet', 'solar_power'],
    contacts: [
      ['WHATSAPP', '+970599111121'],
      ['PHONE', '+970599111122'],
    ],
    capacity: 10,
    present: 1,
    photos: 1,
  },
  {
    slug: 'beit-lahia-desk',
    nameAr: 'مكتب بيت لاهيا',
    nameEn: 'Beit Lahia Desk',
    area: 'North Gaza Strip',
    lat: 31.553,
    lng: 34.499,
    addressAr: 'بيت لاهيا، شارع المدارس',
    verified: false,
    hours: { open: ['09:00', '15:00'] },
    prices: { day: 12 },
    amenities: ['internet'],
    contacts: [['PHONE', '+970599111131']],
  },
  {
    slug: 'deir-al-balah-campus',
    nameAr: 'حرم دير البلح',
    nameEn: 'Deir al-Balah Campus',
    area: 'Deir al-Balah',
    lat: 31.418,
    lng: 34.351,
    addressAr: 'دير البلح، شارع صلاح الدين، قرب البلدية',
    addressEn: 'Deir al-Balah, Salah Al-Din Street, near the municipality',
    descriptionAr: 'أكبر مساحة في الوسطى، بقاعة اجتماعات وفترتين.',
    descriptionEn: 'The Middle Area’s largest space, with a meeting room and two shifts.',
    verified: true,
    hours: { open: DAY, friday: ['16:00', '22:00'] },
    prices: { hour: 5, day: 25, month: 380, studentHour: 4, studentMonth: 300 },
    shifts: [
      { nameAr: 'صباحي', nameEn: 'Morning', range: ['08:00', '14:00'], month: 230 },
      { nameAr: 'مسائي', nameEn: 'Evening', range: ['14:00', '22:00'], month: 230 },
    ],
    amenities: ['internet', 'stable_power', 'solar_power', 'hot_drinks', 'meeting_room'],
    contacts: [
      ['WHATSAPP', '+970599111141'],
      ['PHONE', '+970599111142'],
      ['WEBSITE', 'campus.example.com'],
    ],
    capacity: 40,
    present: 6,
    photos: 2,
  },
  {
    slug: 'palm-space',
    nameAr: 'مساحة النخيل',
    nameEn: 'Palm Space',
    area: 'Deir al-Balah',
    lat: 31.4215,
    lng: 34.348,
    addressAr: 'دير البلح، قرب البحر',
    verified: false,
    hours: { open: ['09:00', '19:00'] },
    prices: { day: 18, week: 90 },
    amenities: ['internet', 'hot_drinks'],
    contacts: [['WHATSAPP', '+970599111151']],
  },
  {
    slug: 'nuseirat-station',
    nameAr: 'محطة النصيرات',
    nameEn: 'Nuseirat Station',
    area: 'Nuseirat',
    lat: 31.449,
    lng: 34.393,
    addressAr: 'النصيرات، شارع الشهداء، قرب دوار النويري',
    verified: true,
    hours: { open: ['07:00', '19:00'], friday: null },
    prices: { hour: 4, day: 20, month: 320 },
    amenities: ['internet', 'stable_power', 'generator_line'],
    ownAmenities: [['مصلى'], ['شاحن لكل مكتب', 'A charger at every desk']],
    contacts: [['WHATSAPP', '+970599111161']],
    capacity: 18,
  },
  {
    slug: 'nuseirat-study-house',
    nameAr: 'دار النصيرات للدراسة',
    nameEn: 'Nuseirat Study House',
    area: 'Nuseirat',
    lat: 31.446,
    lng: 34.396,
    addressAr: 'النصيرات، المخيم الجديد',
    verified: false,
    hours: { open: ['08:00', '23:00'] },
    prices: { hour: 3, day: 15, studentHour: 2, studentDay: 10 },
    amenities: ['internet', 'stable_power'],
    contacts: [['PHONE', '+970599111171']],
  },
  {
    slug: 'bureij-work',
    nameAr: 'عمل البريج',
    nameEn: 'Bureij Work',
    area: 'Bureij',
    lat: 31.438,
    lng: 34.403,
    addressAr: 'البريج، الشارع الرئيسي',
    verified: false,
    hours: { open: ['09:00', '18:00'], friday: null },
    prices: { day: 15 },
    amenities: ['internet'],
    contacts: [['WHATSAPP', '+970599111181']],
  },
  {
    slug: 'maghazi-room',
    nameAr: 'غرفة المغازي',
    nameEn: 'Maghazi Room',
    area: 'Maghazi',
    lat: 31.4205,
    lng: 34.386,
    addressAr: 'المغازي، قرب مدرسة الوكالة',
    verified: false,
    hours: { open: ['08:00', '16:00'] },
    prices: { hour: 3, day: 12 },
    amenities: ['internet', 'solar_power'],
    contacts: [['PHONE', '+970599111191']],
  },
  {
    slug: 'zawaida-garden',
    nameAr: 'حديقة الزوايدة',
    nameEn: 'Zawaida Garden',
    area: 'Al-Zawaida',
    lat: 31.435,
    lng: 34.372,
    addressAr: 'الزوايدة، شارع البحر',
    verified: true,
    hours: { open: ['08:00', '20:00'], friday: ['10:00', '18:00'] },
    prices: { hour: 4, day: 20 },
    amenities: ['internet', 'solar_power', 'hot_drinks'],
    contacts: [
      ['WHATSAPP', '+970599111201'],
      ['PHONE', '+970599111202'],
    ],
    capacity: 8,
    photos: 1,
  },
  {
    slug: 'khan-younis-hub',
    nameAr: 'مركز خان يونس',
    nameEn: 'Khan Younis Hub',
    area: 'Khan Younis (city)',
    lat: 31.346,
    lng: 34.306,
    addressAr: 'خان يونس، شارع جمال عبد الناصر',
    addressEn: 'Khan Younis, Gamal Abdel Nasser Street',
    verified: true,
    hours: { open: DAY, friday: null },
    prices: { hour: 5, day: 25, month: 360, studentDay: 20 },
    amenities: ['internet', 'stable_power', 'meeting_room', 'technical_training'],
    contacts: [
      ['WHATSAPP', '+970599111211'],
      ['PHONE', '+970599111212'],
    ],
    capacity: 35,
    present: 5,
    photos: 1,
  },
  {
    slug: 'mawasi-field-office',
    nameAr: null,
    nameEn: 'Mawasi Field Office',
    area: 'Al-Mawasi',
    lat: 31.36,
    lng: 34.27,
    addressAr: 'المواصي، قرب شارع الرشيد',
    verified: false,
    hours: { open: ['08:00', '17:00'] },
    prices: { day: 10 },
    amenities: ['solar_power'],
    contacts: [['PHONE', '+970599111221']],
  },
  {
    slug: 'khan-younis-library',
    nameAr: 'مكتبة خان يونس',
    nameEn: 'Khan Younis Library',
    area: 'Khan Younis (city)',
    lat: 31.343,
    lng: 34.302,
    addressAr: 'خان يونس، قرب القلعة',
    verified: false,
    hours: { open: ['09:00', '21:00'], friday: null },
    prices: { hour: 3, day: 14, studentHour: 2, studentDay: 10 },
    amenities: ['internet', 'stable_power'],
    contacts: [['WHATSAPP', '+970599111231']],
  },
];

const DAY_MINUTES = 1440;
const FRIDAY = 5;

function minutesOf(hhmm: string): number {
  const [hours = 0, minutes = 0] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Creates the directory set once, or renews its day-bound states when the set already exists.
 * Returns true on first creation, false on renewal (or when nothing changed).
 * Needs the lookups and the admin (run `seed` first).
 */
export async function seedDemoDirectory(
  db: PrismaClient,
  input: DemoDirectoryInput,
): Promise<boolean> {
  if (input.nodeEnv === 'production') {
    throw new Error('Refusing to seed demo data in production (NODE_ENV=production).');
  }

  const markerExists = await db.space.findUnique({
    where: { slug: DIRECTORY_MARKER_SLUG },
    select: { id: true },
  });
  if (markerExists) {
    return renewDemoDirectory(db, input);
  }

  const [areas, amenities, defaults, admin] = await Promise.all([
    db.area.findMany({ select: { id: true, nameEn: true } }),
    db.amenity.findMany({ select: { id: true, key: true } }),
    db.setting.findUnique({ where: { key: 'newSpaceDefaults' } }),
    db.user.findFirst({ where: { role: 'ADMIN' }, select: { id: true, role: true } }),
  ]);
  if (!defaults || !admin)
    throw new Error('Seed the platform before the demo data (npm run db:seed).');
  const settings = newSpaceDefaultsSchema.parse(defaults.value);
  const areaId = new Map(areas.map(({ id, nameEn }) => [nameEn, id]));
  const amenityId = new Map(amenities.map(({ id, key }) => [key, id]));

  const now = input.now ?? new Date();
  const at = gazaClock(now);
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);
  // The Gaza day of `now`: the calendar date is UTC midnight, so its UTC day is the weekday.
  const today = at.date(0).getUTCDay();
  const startOfToday = at.time(0, '00:00').getTime();

  const owner = await db.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: DIRECTORY_OWNER_EMAIL,
        name: 'سامي الحلو',
        role: 'OWNER',
        passwordHash: await hashPassword(input.password),
      },
    });

    for (const [index, seed] of DIRECTORY_SPACES.entries()) {
      const area = areaId.get(seed.area);
      if (area === undefined) throw new Error(`No area named ${seed.area}: seed the lookups.`);
      const week = weekOf(seed.hours, today);
      const space = await tx.space.create({
        data: {
          slug: seed.slug,
          nameAr: seed.nameAr,
          nameEn: seed.nameEn,
          descriptionAr: seed.descriptionAr,
          descriptionEn: seed.descriptionEn,
          addressAr: seed.addressAr,
          addressEn: seed.addressEn,
          areaId: area,
          lat: seed.lat,
          lng: seed.lng,
          // A few hours apart, so the order by the last update is the list's.
          profileUpdatedAt: new Date(now.getTime() - index * 3_600_000),
          hoursUpdatedAt: week ? daysAgo(seed.hoursDaysAgo ?? 0) : null,
          pricesUpdatedAt: daysAgo(seed.pricesDaysAgo ?? 0),
          amenitiesUpdatedAt: now,
          contactsUpdatedAt: now,
          settings: { create: settings },
          occupancy: { create: { capacity: seed.capacity ?? null } },
          managers: seed.verified ? { create: { userId: user.id, role: 'OWNER' } } : undefined,
          hours: week ? { createMany: { data: week } } : undefined,
          amenities: {
            createMany: {
              data: seed.amenities.map((key) => {
                const id = amenityId.get(key);
                if (id === undefined) throw new Error(`No amenity ${key}: seed the lookups.`);
                return { amenityId: id };
              }),
            },
          },
          ownAmenities: {
            createMany: {
              data: (seed.ownAmenities ?? []).map(([nameAr, nameEn], sortOrder) => ({
                nameAr,
                nameEn,
                sortOrder,
              })),
            },
          },
          contacts: {
            createMany: {
              data: seed.contacts.map(([type, typed], sortOrder) => {
                const value = normaliseContact(type, typed);
                if (!value) throw new Error(`Not a valid ${type}: ${typed}`);
                return { type, value, sortOrder };
              }),
            },
          },
        },
      });
      const spaceId = space.id;

      const shiftPrices = [];
      for (const [sortOrder, shift] of (seed.shifts ?? []).entries()) {
        const { id } = await tx.spaceShift.create({
          data: {
            spaceId,
            nameAr: shift.nameAr,
            nameEn: shift.nameEn,
            startsMinute: minutesOf(shift.range[0]),
            endsMinute: minutesOf(shift.range[1]),
            sortOrder,
          },
        });
        shiftPrices.push({
          period: 'MONTH' as const,
          shiftId: id,
          amountAgorot: shift.month * 100,
        });
      }
      const { prices } = seed;
      const rows = [
        { period: 'HOUR', audience: 'GENERAL', shekels: prices.hour },
        { period: 'DAY', audience: 'GENERAL', shekels: prices.day },
        { period: 'WEEK', audience: 'GENERAL', shekels: prices.week },
        { period: 'MONTH', audience: 'GENERAL', shekels: prices.month },
        { period: 'HOUR', audience: 'STUDENT', shekels: prices.studentHour },
        { period: 'DAY', audience: 'STUDENT', shekels: prices.studentDay },
        { period: 'MONTH', audience: 'STUDENT', shekels: prices.studentMonth },
      ] as const;
      await tx.spacePrice.createMany({
        data: [
          ...rows.flatMap(({ period, audience, shekels }) =>
            shekels === undefined ? [] : [{ period, audience, amountAgorot: shekels * 100 }],
          ),
          ...shiftPrices,
        ].map((price, sortOrder) => ({ ...price, spaceId, sortOrder })),
      });

      // Visitors present now, checked in within today, so no auto check-out has closed them.
      const hourRateAgorot = prices.hour === undefined ? null : prices.hour * 100;
      const dayRateAgorot = prices.day === undefined ? null : prices.day * 100;
      await tx.visit.createMany({
        data: Array.from({ length: seed.present ?? 0 }, (_, i) => ({
          spaceId,
          idempotencyKey: randomUUID(),
          visitorName: VISITORS[i % VISITORS.length],
          hourRateAgorot,
          dayRateAgorot,
          checkedInAt: new Date(Math.max(startOfToday, now.getTime() - (i + 1) * 20 * 60_000)),
        })),
      });

      if (seed.closed) {
        await tx.announcement.create({
          data: {
            spaceId,
            type: 'CLOSURE',
            textAr: 'مغلقة مؤقتًا للصيانة.',
            textEn: 'Closed for maintenance for now.',
            startsAt: daysAgo(1),
            idempotencyKey: randomUUID(),
          },
        });
      }
    }
    return user;
  });

  await addPhotos(db, input.storage, { admin, owner: { id: owner.id, role: owner.role } });
  return true;
}

async function renewDemoDirectory(db: PrismaClient, input: DemoDirectoryInput): Promise<boolean> {
  const now = input.now ?? new Date();
  const at = gazaClock(now);
  const today = at.date(0).getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const startOfToday = at.time(0, '00:00').getTime();
  const endOfToday = startOfToday + 86_400_000;

  // Load the set's spaces with their visits and hours
  const slugs = DIRECTORY_SPACES.map((s) => s.slug);
  const spaces = await db.space.findMany({
    where: { slug: { in: slugs } },
    include: {
      occupancy: true,
      visits: { where: { checkedOutAt: null }, orderBy: { checkedInAt: 'asc' } },
      hours: true,
    },
  });
  const spaceBySlug = new Map(spaces.map((s) => [s.slug, s]));

  // 1. Renew visits for spaces with present > 0
  for (const seed of DIRECTORY_SPACES) {
    const present = seed.present ?? 0;
    if (present === 0) continue;

    const space = spaceBySlug.get(seed.slug);
    if (!space) continue;

    // Delete open visits from before today (Gaza date)
    await db.visit.deleteMany({
      where: {
        spaceId: space.id,
        checkedOutAt: null,
        checkedInAt: { lt: new Date(startOfToday) },
      },
    });

    // Count open visits checked in today
    const todaysVisits = await db.visit.findMany({
      where: {
        spaceId: space.id,
        checkedOutAt: null,
        checkedInAt: { gte: new Date(startOfToday), lt: new Date(endOfToday) },
      },
      orderBy: { checkedInAt: 'asc' },
    });

    const toInsert = present - todaysVisits.length;
    if (toInsert <= 0) continue;

    // Get the space's prices for rates
    const prices = await db.spacePrice.findMany({ where: { spaceId: space.id } });
    const hourRateAgorot =
      prices.find((p) => p.period === 'HOUR' && p.audience === 'GENERAL')?.amountAgorot ?? null;
    const dayRateAgorot =
      prices.find((p) => p.period === 'DAY' && p.audience === 'GENERAL')?.amountAgorot ?? null;

    // Insert remaining visits at now - i seconds
    await db.visit.createMany({
      data: Array.from({ length: toInsert }, (_, i) => ({
        spaceId: space.id,
        idempotencyKey: randomUUID(),
        visitorName: VISITORS[(todaysVisits.length + i) % VISITORS.length],
        hourRateAgorot,
        dayRateAgorot,
        checkedInAt: new Date(now.getTime() - i * 1000),
      })),
    });
  }

  // 2. Renew closed-today space (radwan-study-hall)
  const closedTodaySeed = DIRECTORY_SPACES.find(
    (s): s is typeof s & { hours: { open: Range; friday?: Range | null; closedToday: true } } =>
      s.hours !== null &&
      typeof s.hours === 'object' &&
      'closedToday' in s.hours &&
      s.hours.closedToday === true,
  );
  if (closedTodaySeed) {
    const space = spaceBySlug.get(closedTodaySeed.slug);
    if (space && space.hours.length === 7) {
      const openRange = closedTodaySeed.hours.open; // [opens, closes]
      const opensMinute = minutesOf(openRange[0]);
      const closesMinute = minutesOf(openRange[1]);

      // Check if renewal is needed: today's row closed, other 6 match open range
      const todaysRow = space.hours.find((h) => h.dayOfWeek === today);
      if (!todaysRow) throw new Error('No hours row for weekday ' + String(today));
      const otherRows = space.hours.filter((h) => h.dayOfWeek !== today);
      const needsUpdate =
        !todaysRow.isClosed ||
        todaysRow.opensMinute !== null ||
        todaysRow.closesMinute !== null ||
        otherRows.some(
          (h) => h.isClosed || h.opensMinute !== opensMinute || h.closesMinute !== closesMinute,
        );

      if (needsUpdate) {
        await db.$transaction(async (tx) => {
          // Update today's row to closed
          await tx.spaceHours.update({
            where: { id: todaysRow.id },
            data: { isClosed: true, opensMinute: null, closesMinute: null },
          });
          // Update other rows to open range
          for (const row of otherRows) {
            await tx.spaceHours.update({
              where: { id: row.id },
              data: { isClosed: false, opensMinute, closesMinute },
            });
          }
          // Update space's hoursUpdatedAt
          await tx.space.update({
            where: { id: space.id },
            data: { hoursUpdatedAt: now },
          });
        });
      }
    }
  }

  // 3. Photos are not renewed (they stay as they are)
  // 4. Announcement is not renewed (idempotencyKey preserved)

  return false;
}

const VISITORS = ['عمر', 'هبة', 'يوسف', 'ليان', 'محمود', 'سلمى'];

/** The week's rows of `hours`, or null for a week never saved. */
function weekOf(hours: SpaceSeed['hours'], today: number) {
  if (hours === null) return null;
  return [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => {
    if (hours === 'around-the-clock')
      return { dayOfWeek, opensMinute: 0, closesMinute: DAY_MINUTES };
    const range = dayOfWeek === FRIDAY && hours.friday !== undefined ? hours.friday : hours.open;
    if (range === null || (hours.closedToday && dayOfWeek === today)) {
      return { dayOfWeek, isClosed: true };
    }
    return { dayOfWeek, opensMinute: minutesOf(range[0]), closesMinute: minutesOf(range[1]) };
  });
}

/**
 * The photos, through the app's own photo service, so they are stored, sized and ordered as an
 * upload is, cover first: by the owner on a verified space, by the admin on an unverified one.
 */
async function addPhotos(
  db: PrismaClient,
  storage: Storage,
  actors: { admin: Actor; owner: Actor },
): Promise<void> {
  const photos = createPhotosService({
    runInTransaction: createRunInTransaction(db),
    audit: writeAudit,
    storage,
    logger: createLogger('warn'),
  });
  // A space's photos one after another, so their order is the cover first; the spaces at once.
  await Promise.all(
    DIRECTORY_SPACES.map(async (seed, index) => {
      if (!seed.photos) return;
      const { id } = await db.space.findUniqueOrThrow({ where: { slug: seed.slug } });
      const linksUnder: LoadedSpace['linksUnder'] = (tx) =>
        tx.spaceManager.findMany({
          where: { spaceId: id },
          select: { userId: true, role: true, deactivatedAt: true },
        });
      const space: LoadedSpace = { id, links: await linksUnder(db), linksUnder };
      for (let photo = 0; photo < seed.photos; photo += 1) {
        await photos.upload(
          seed.verified ? actors.owner : actors.admin,
          space,
          await pictureOf(index * 47 + photo * 113),
        );
      }
    }),
  );
}

/** A plain picture of a room, its colours turned by `hue`: made in memory, no file committed. */
function pictureOf(hue: number): Promise<Buffer> {
  const turn = (by: number) => String((hue + by) % 360);
  const wall = `hsl(${turn(0)}, 35%, 72%)`;
  const floor = `hsl(${turn(30)}, 25%, 45%)`;
  const desk = `hsl(${turn(180)}, 30%, 30%)`;
  // Small: the card's size wide, so the seed stays quick.
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="400">
    <rect width="640" height="400" fill="${wall}"/>
    <rect y="260" width="640" height="140" fill="${floor}"/>
    <rect x="64" y="60" width="192" height="120" fill="hsl(200, 60%, 85%)"/>
    <rect x="384" y="60" width="192" height="120" fill="hsl(200, 60%, 85%)"/>
    <rect x="85" y="235" width="203" height="20" fill="${desk}"/>
    <rect x="352" y="235" width="203" height="20" fill="${desk}"/>
  </svg>`;
  return sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toBuffer();
}
