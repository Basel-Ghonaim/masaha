import type { LiveStatus } from '@masaha/shared/occupancy';
import { useCopy } from '@shared/copy';
import { isolate, useLanguage } from '@shared/localisation';
import { attentionRows } from '../../services/attentionRows';
import { endsText } from '../../services/endsText';
import type { OwnerOverviewLinks } from '../../types/OwnerOverviewLinks';
import { useLoadFailure } from '../useLoadFailure';
import { useOwnerOverviewQuery } from './useOwnerOverviewQuery';

const STATE_WORDS = { AVAILABLE: 'available', FULL: 'full', CLOSED: 'closedNow' } as const;

/** What visitors see, as the desk's control colours it. */
function toneOf(state: LiveStatus | null): 'success' | 'warning' | 'neutral' {
  if (state === 'AVAILABLE') return 'success';
  if (state === 'FULL') return 'warning';
  return 'neutral';
}

/**
 * The owner's overview of the space (screen 12, D5.1), ready to render: «يحتاج انتباهك», who is
 * present now with the meter only once a capacity is set, the announcements running, and the
 * subscriptions ending this week, at most five. Never an amount (O3). Its states: loading, failed or
 * offline with a retry, ready.
 */
export function useOwnerOverview(spaceId: number, links: OwnerOverviewLinks) {
  const copy = useCopy();
  const words = copy.overview.owner;
  const english = useLanguage() === 'en';
  const result = useOwnerOverviewQuery(spaceId);
  const answer = result.data;
  const failure = useLoadFailure(answer === undefined ? result.error : null, () => {
    void result.refetch();
  });

  if (answer === undefined) {
    return result.isPending
      ? { state: 'loading' as const, failure }
      : { state: 'failed' as const, failure };
  }

  const { presentNow: present, endingSoon, announcements, at } = answer;
  const capacity = present.capacity;
  const full = capacity !== null && present.total >= capacity;
  const total = String(present.total);

  return {
    state: 'ready' as const,
    failure,
    attention: {
      title: words.attention.title,
      rows: attentionRows(answer.attention, { copy, links }),
      allClear: words.attention.allClear,
    },
    present: {
      title: words.present.title,
      ratio: capacity === null ? total : `${total} / ${String(capacity)}`,
      view: { label: words.present.view, href: links.presentNow },
      meter:
        capacity === null
          ? null
          : {
              value: present.total,
              max: capacity,
              label: words.present.meter,
              tone: full ? ('warning' as const) : ('primary' as const),
              valueText: words.present.meterValue({ total, capacity: String(capacity) }),
            },
      now: words.present.now({
        members: words.present.members({ count: present.members }),
        visits: words.present.visits({ count: present.visits }),
      }),
      state: {
        label:
          present.status === null
            ? copy.occupancy.status.none
            : copy.occupancy.status.line({
                state: isolate(copy.terms.liveStatuses[STATE_WORDS[present.status]]),
              }),
        tone: toneOf(present.status),
      },
      line:
        capacity === null
          ? words.present.noCapacity
          : full
            ? words.present.full
            : words.present.hidden,
    },
    announcements: {
      label: words.announcements.label,
      value: String(announcements.running),
      helper:
        announcements.types.length === 0
          ? undefined
          : announcements.types
              .map((type) => copy.announcements.types[type])
              .join(english ? ', ' : '، '),
      href: links.announcements,
    },
    ending: {
      title: words.ending.title,
      count: words.ending.count({ count: endingSoon.total }),
      viewAll: { label: words.ending.viewAll, href: links.endingAll },
      rows: endingSoon.first.slice(0, 5).map(({ customer, subscription }) => ({
        key: String(subscription.id),
        name: customer.name,
        href: links.customer(customer.id),
        line:
          subscription.endsOn === null
            ? null
            : words.ending.line({
                subscription: isolate(subscription.name),
                ends: endsText(subscription.endsOn, at, words.ending),
              }),
        renew: { label: words.ending.renew, href: links.customer(customer.id) },
      })),
      none: words.ending.none,
    },
  };
}

/** The owner's overview, ready to render. */
export type OwnerOverviewView = ReturnType<typeof useOwnerOverview>;
