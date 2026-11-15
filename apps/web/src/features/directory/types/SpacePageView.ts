import type { GlyphName } from '@shared/design-system';
import type { Location } from '@masaha/shared/spaces';
import type { ContactLink, SpaceNameView, WeekRow } from '@shared/lib';
import type { LocalText } from '../services/localText';
import type { PriceTab } from '../services/priceGroups';
import type { ListFailureView } from './DirectoryListView';
import type { PriceGroupView } from './PriceGroupView';
import type { PhotoUrls } from '@masaha/shared/spaces';
import type { PublicAnnouncement } from '@masaha/shared/directory';

/** A space, as a page's slot is handed it: its id and slug, its name as shown, and whether it is verified. */
export type SlotSpace = { id: number; slug: string; name: SpaceNameView; verified: boolean };

/** A section's meta under its heading: its date, what else it says, and its stale badge. */
export type SectionMeta = { lines: string[]; stale: string | null };

/** A space's public page, ready to render: its state, then each part in U8's order. */
export type SpacePageView = {
  state: 'loading' | 'failed' | 'notFound' | 'ready';
  failure: ListFailureView | null;
  notFound: { title: string; text: string; browse: string };
  header: {
    name: SpaceNameView;
    /** The name in the other language, under it; none when the space has one name. */
    other: LocalText | null;
    areaId: number;
    verified: string | null;
    noPhotos: string | null;
  } | null;
  /** The space as the page's slots name it: what another capability's action is set up with. */
  space: SlotSpace | null;
  /** An unverified space's notice, and its dialog with the platform's contact. */
  unverified: {
    text: string | null;
    contact: string;
    dialog: { title: string; text: string; close: string; none: string };
  } | null;
  /** The status card: today's hours and, while a point is held, the distance. */
  panel: {
    title: string;
    /** Today's hours, a closure's line, or that the hours are not available. */
    today: string;
    distance: string | null;
    live:
      | { kind: 'loading'; label: string }
      | { kind: 'badge'; label: string; variant: 'success' | 'warning' | 'neutral'; live: string }
      | { kind: 'line'; line: string };
  };
  photos: PhotoUrls[];
  /** The space's running and upcoming announcements, as the API answers them; the page's slots draw them. */
  announcements: PublicAnnouncement[];
  prices: {
    title: string;
    meta: SectionMeta;
    state: 'shown' | 'hidden' | 'none';
    hidden: string;
    none: string;
    /** While the prices are stale. */
    check: string | null;
    byShift: string;
    tabs: PriceTab[] | null;
    audiences: PriceGroupView[];
  };
  hours: {
    title: string;
    meta: SectionMeta;
    /** Hours never saved. */
    none: string | null;
    caption: string;
    head: { days: string; hours: string };
    todayBadge: string;
    rows: WeekRow[];
    toggle: { label: string; expanded: boolean; run: () => void } | null;
    shifts: string | null;
    /** «دوام مسائي», while its owner declares the evening. */
    evening: string | null;
  };
  amenities: {
    title: string;
    meta: SectionMeta;
    items: { key: string; text: LocalText; icon: GlyphName | null }[];
  } | null;
  about: { title: string; text: LocalText } | null;
  location: {
    title: string;
    point: Location;
    /** The visitor's point while near me holds one, drawn on the map beside the place. */
    user: { point: Location; label: string } | null;
    mapLabel: string;
    failed: string;
    address: LocalText | null;
    landmark: LocalText | null;
    directions: { label: string; href: string };
  };
  contacts: { title: string; meta: SectionMeta; items: ContactLink[] } | null;
  /** Below 768 px, the bar fixed at the foot: only with a WhatsApp or a phone contact. */
  bar: {
    label: string;
    whatsapp: { label: string; href: string } | null;
    call: { label: string; href: string } | null;
  } | null;
  /** From 1024 px: the status and the contacts are an aside beside the sections. */
  wide: boolean;
  /** Below 768 px: the bar shows, and the page pads its foot. */
  phone: boolean;
};
