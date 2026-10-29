import type { AnnouncementType } from '../announcements/index.ts';
import type { LiveStatus } from '../occupancy/index.ts';
import type { FactGroup } from '../spaces/index.ts';

// The overviews' answers (docs/api/api-contract.md › Overview): one per screen, each figure a count
// or a short list from the module that owns its rule, linking to where it is acted on. Never an
// amount (the owner's O3).

/** A space's fact groups never saved, and its stale ones with their Gaza days since their date. */
export interface GroupsFreshness {
  missing: FactGroup[];
  stale: { group: FactGroup; days: number }[];
}

/** The owner's overview of their space (screen 12): a work queue, read at `at`. */
export interface OwnerOverview {
  /** «يحتاج انتباهك»: what waits on the owner, each a count of the list it links to. */
  attention: {
    groups: GroupsFreshness;
    /** The space's data reports still open. */
    openReports: number;
    /** The desk's uncollected visits. */
    uncollectedVisits: number;
    /** The desk's closed visits with no charge. */
    unpricedVisits: number;
    /** The closures started in the last 30 days with no extension applied. */
    closuresAwaitingExtension: number;
    capacitySet: boolean;
    /** How many customers owe: Finance › debts' count, never its amount. */
    customersOwing: number;
  };
  /** «الحاضرون الآن»: who is present, the capacity, and the live status as the public sees it. */
  presentNow: {
    visits: number;
    members: number;
    total: number;
    capacity: number | null;
    status: LiveStatus | null;
  };
  /** The customers whose current subscription is ending soon, and the first five, soonest first. */
  endingSoon: {
    total: number;
    first: {
      customer: { id: number; name: string };
      subscription: { id: number; name: string; endsOn: string | null };
    }[];
  };
  /** The announcements running, and their types, each once, in `ANNOUNCEMENT_TYPES`' order. */
  announcements: { running: number; types: AnnouncementType[] };
  /** The instant read, ISO 8601, for «آخر تحديث». */
  at: string;
}
