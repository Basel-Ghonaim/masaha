import type { PublicSpace } from '@masaha/shared/directory';
import { useCopy } from '@shared/copy';
import { useMediaQuery } from '@shared/design-system';
import { contactLinkOf, mapsLink, spaceNameOf, updatedAgo } from '@shared/lib';
import { useLanguage } from '@shared/localisation';
import type { PageTitle } from '@shared/routing';
import { useState } from 'react';
import { statusViewOf } from '../../services/cardView';
import { distanceText } from '../../services/distanceText';
import { freshnessOf } from '../../services/freshness';
import { localText } from '../../services/localText';
import { priceGroups } from '../../services/priceGroups';
import { straightLine } from '../../services/straightLine';
import { todayHours } from '../../services/todayHours';
import { weekRows } from '../../services/weekRows';
import type { SectionMeta, SpacePageView } from '../../types/SpacePageView';
import { useFailureView } from '../list/useFailureView';
import { useNearState } from '../near/nearMeStore';
import { useSpacePageQuery } from './useSpacePageQuery';
import { useLiveStatusQuery } from '../status/useLiveStatusQuery';

/** From here up the status and the contacts are an aside; below it, a card and a section. */
const DESKTOP_UP = '(min-width: 1024px)';
/** From here up there is no bar at the page's foot. */
const TABLET_UP = '(min-width: 768px)';

/** How old the status last read may grow, once a refresh has failed, before the page says its age. */
const STALE_STATUS_MS = 3 * 60_000;

/** Whether a closure the space announced runs at `now`. */
const closureRuns = (announcements: PublicSpace['announcements'], now: Date) =>
  announcements.some(
    (announcement) =>
      announcement.type === 'CLOSURE' &&
      Date.parse(announcement.startsAt) <= now.getTime() &&
      (announcement.endsAt === null || Date.parse(announcement.endsAt) > now.getTime()),
  );

/**
 * A space's public page, ready to render (screen 3): its states (loading; a failure, said with its
 * reference and a retry; a hidden, deleted or unknown space, «لم نجد هذه المساحة»), then its parts in
 * U8's order. Each fact group says when it was last updated, and «قد يكون تغيّر» while stale (U4).
 * The prices go per audience (U9), hidden ones explained, and by shift when a price names one; the
 * hours Saturday first with today marked; the distance only while near me holds a point, by the
 * straight line rounded as the server rounds it. From 1024 px the status and the contacts are an
 * aside; below 768 px a bar at the foot offers WhatsApp and a call, when the space has either. The
 * status card is always drawn; today's line says «مغلقة مؤقتًا اليوم» while a closure runs; the live
 * badge is the cards' (`statusViewOf`), and once a refresh fails and the status shown is older than
 * 3 minutes, «الحالة مباشرة الآن» gives way to its age and the badge turns neutral (finding 138).
 */
export function useSpacePage(slug: string): SpacePageView {
  const copy = useCopy();
  const words = copy.directory.page;
  const english = useLanguage() === 'en';
  const language = english ? 'en' : 'ar';
  const wide = useMediaQuery(DESKTOP_UP);
  const phone = !useMediaQuery(TABLET_UP);
  const near = useNearState();
  const [allDays, setAllDays] = useState(false);
  const query = useSpacePageQuery(slug);
  const liveQuery = useLiveStatusQuery(slug);
  const notFound = query.error?.status === 404;
  const failure = useFailureView(
    query.data === undefined && !notFound ? query.error : null,
    words.loadFailed,
    () => {
      void query.refetch();
    },
  );

  const now = new Date();
  const space: PublicSpace | undefined = notFound ? undefined : query.data;
  const metaOf = (group: Parameters<typeof freshnessOf>[2], ...lines: string[]): SectionMeta => {
    const updatedAt = space?.updatedAt[group] ?? null;
    const fresh = freshnessOf(
      updatedAt,
      space?.staleGroups.includes(group) ?? false,
      group,
      now,
      language,
      words,
    );
    return { lines: [fresh.line, ...lines].filter((line) => line !== null), stale: fresh.stale };
  };

  const prices = space?.prices;
  const groups = priceGroups(prices ?? [], space?.hours?.shifts ?? [], words, language);
  const week =
    space?.hours === null || space?.hours === undefined
      ? null
      : weekRows(space.hours.days, now, words.hours, allDays);
  const contacts = (space?.contacts ?? []).map((contact) => contactLinkOf(contact, words.contacts));
  const whatsapp = space?.contacts.find((contact) => contact.type === 'WHATSAPP');
  const call = space?.contacts.find((contact) => contact.type === 'PHONE');
  const point = near.point;
  const meters =
    space === undefined || point === null
      ? null
      : Math.round(straightLine(point, space.location) / 100) * 100;
  const name = space === undefined ? null : spaceNameOf(space, english);
  const shiftNames = (space?.hours?.shifts ?? []).map(
    (shift) => localText(shift.nameAr, shift.nameEn, english)?.text ?? shift.nameAr,
  );
  // A failed refresh keeps the status last read: TanStack Query keeps its data beside the error.
  // Past 3 minutes after a failure it says its age instead of «live», and its badge goes neutral:
  // its age as of the last failed try, which the polling renews each minute.
  const age = liveQuery.errorUpdatedAt - liveQuery.dataUpdatedAt;
  const stale = liveQuery.isError && liveQuery.data !== undefined && age > STALE_STATUS_MS;
  const status = statusViewOf(liveQuery.data?.status ?? null, copy);
  const hoursStatus = liveQuery.data?.hoursStatus ?? null;
  const live = liveQuery.isPending
    ? ({ kind: 'loading', label: words.liveStatus.live } as const)
    : liveQuery.data === undefined
      ? ({ kind: 'line', line: words.liveStatus.failed } as const)
      : space?.isVerified === false
        ? // An unverified space: its state by its hours, neutral, as on its card; without hours, none.
          hoursStatus === null
          ? ({ kind: 'line', line: words.liveStatus.unverified } as const)
          : {
              kind: 'badge' as const,
              live: words.liveStatus.byHours,
              label: copy.directory.status.byHours[hoursStatus],
              variant: 'neutral' as const,
            }
        : status === null
          ? ({ kind: 'line', line: words.liveStatus.unset } as const)
          : {
              kind: 'badge' as const,
              live: stale
                ? words.liveStatus.updated({ minutes: Math.floor(age / 60_000) })
                : words.liveStatus.live,
              label: status.label,
              variant: stale ? ('neutral' as const) : status.variant,
            };

  return {
    state: query.isPending
      ? 'loading'
      : notFound
        ? 'notFound'
        : space === undefined
          ? 'failed'
          : 'ready',
    failure,
    notFound: {
      title: words.notFound.title,
      text: words.notFound.text,
      browse: copy.site.browseSpaces,
    },
    header:
      space === undefined || name === null
        ? null
        : {
            name,
            other:
              space.nameAr === null
                ? null
                : english
                  ? { text: space.nameAr, lang: 'ar', dir: 'rtl' }
                  : { text: space.nameEn, lang: 'en', dir: 'ltr' },
            areaId: space.area.id,
            verified: space.isVerified ? copy.directory.card.verified : null,
            noPhotos: space.photos.length === 0 ? words.noPhotos : null,
          },
    space:
      space === undefined || name === null
        ? null
        : { id: space.id, slug: space.slug, name, verified: space.isVerified },
    unverified:
      space === undefined || space.isVerified
        ? null
        : {
            text:
              space.updatedAt.profile === null
                ? null
                : words.unverified.text({
                    ago: updatedAgo(space.updatedAt.profile, language, now),
                  }),
            contact: words.unverified.contact,
            dialog: words.dialog,
          },
    panel: {
      title: wide && contacts.length > 0 ? words.statusContact.title : words.status.title,
      today:
        space !== undefined && closureRuns(space.announcements, now)
          ? words.closedToday
          : todayHours(space?.hours?.days ?? null, now, copy.directory.card),
      distance: meters === null ? null : words.distance({ km: distanceText(meters, language) }),
      live,
    },
    photos: space?.photos ?? [],
    announcements: space?.announcements ?? [],
    prices: {
      title: words.sections.prices,
      meta: metaOf('prices', ...(prices && prices.length > 0 ? [words.prices.displayOnly] : [])),
      state:
        prices === null ? 'hidden' : prices === undefined || prices.length === 0 ? 'none' : 'shown',
      hidden: words.prices.hidden,
      none: words.prices.none,
      check:
        prices && prices.length > 0 && space.staleGroups.includes('prices')
          ? words.prices.check
          : null,
      byShift: words.prices.byShift,
      tabs: groups.tabs,
      audiences: groups.audiences,
    },
    hours: {
      title: words.sections.hours,
      meta: metaOf('hours'),
      none: week === null ? words.hours.none : null,
      caption: words.hours.caption,
      head: { days: words.hours.days, hours: words.hours.hours },
      todayBadge: words.hours.today,
      rows: week?.rows ?? [],
      toggle:
        week?.canExpand === true
          ? {
              label: allDays ? words.hours.showLess : words.hours.showAll,
              expanded: allDays,
              run: () => {
                setAllDays(!allDays);
              },
            }
          : null,
      shifts:
        shiftNames.length === 0
          ? null
          : words.hours.shifts({ list: shiftNames.join(english ? ', ' : '، ') }),
    },
    amenities:
      space === undefined || space.amenities.length === 0
        ? null
        : {
            title: words.sections.amenities,
            meta: metaOf('amenities'),
            items: space.amenities.map((amenity, index) => ({
              key: `${String(index)}-${amenity.nameAr}`,
              text: localText(amenity.nameAr, amenity.nameEn, english) ?? { text: amenity.nameAr },
              icon: amenity.icon,
            })),
          },
    about: (() => {
      const text = space && localText(space.descriptionAr, space.descriptionEn, english);
      return text ? { title: words.sections.about, text } : null;
    })(),
    location: {
      title: words.sections.location,
      point: space?.location ?? { lat: 0, lng: 0 },
      user:
        point === null
          ? null
          : {
              point,
              label: near.source === 'pin' ? copy.directory.map.yourPin : copy.directory.map.you,
            },
      mapLabel: words.location.map({ name: name?.text ?? '' }),
      failed: words.location.failed,
      address: space ? localText(space.addressAr, space.addressEn, english) : null,
      landmark: space ? localText(space.landmarkAr, space.landmarkEn, english) : null,
      directions: {
        label: words.location.directions,
        href: mapsLink(space?.location ?? { lat: 0, lng: 0 }),
      },
    },
    contacts:
      contacts.length === 0
        ? null
        : { title: words.sections.contacts, meta: metaOf('contacts'), items: contacts },
    bar:
      whatsapp === undefined && call === undefined
        ? null
        : {
            label: words.bar.label,
            whatsapp:
              whatsapp === undefined
                ? null
                : { label: words.bar.whatsapp, href: contactLinkOf(whatsapp, words.contacts).href },
            call:
              call === undefined
                ? null
                : { label: words.bar.call, href: contactLinkOf(call, words.contacts).href },
          },
    wide,
    phone,
  };
}

/** Whether the space's page draws its contact bar on a phone: the space has a WhatsApp or a phone. */
export function useSpaceContactBar(slug: string): boolean {
  const query = useSpacePageQuery(slug);
  return (query.data?.contacts ?? []).some(
    (contact) => contact.type === 'WHATSAPP' || contact.type === 'PHONE',
  );
}

/** The space's name, for the page's title, once its page has loaded; nothing until then. */
export function useSpacePageTitle(slug: string): PageTitle | undefined {
  const english = useLanguage() === 'en';
  const query = useSpacePageQuery(slug);
  if (query.error?.status === 404 || query.data === undefined) return undefined;
  return spaceNameOf(query.data, english);
}
