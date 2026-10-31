import { useCopy } from '@shared/copy';
import { useRefusalView } from '@shared/forms';
import { priceText } from '@shared/lib';
import { isolate, useLanguage } from '@shared/localisation';
import { addedText } from '../../services/addedText';
import { badgesOf } from '../../services/staffBadges';
import type { StaffCollections } from '../../types/StaffCollections';
import type { StaffRowView } from '../../types/StaffRowView';
import { useStaffQuery } from './useStaffQuery';

/**
 * The space's staff, ready to render: the list's state (loading, failed with its reference and a
 * retry, empty, or the list), each reception account as a row in the server's order — its name, its
 * email, whether it may reach the space, and a temporary password still to be changed or expired,
 * when it was added and what it collected this month, a link to that ledger («—» when the month's
 * collections could not be read, D5.6) — and their count, in its plural form, once the list has arrived.
 */
export function useStaffList(spaceId: number, collections: StaffCollections) {
  const copy = useCopy();
  const words = copy.staff;
  const query = useStaffQuery(spaceId);
  // A failed refetch keeps the list already loaded: only a list that never arrived is an error.
  const { view, blocked } = useRefusalView(
    query.data === undefined ? query.error : null,
    words.loadFailed,
  );
  const members = query.data ?? [];
  const collectedOf = (userId: number) => {
    const agorot = collections.of(userId);
    return {
      amount: agorot === null ? words.noCollections : priceText(agorot, language),
      href: collections.link(userId),
    };
  };
  const now = new Date();
  const language = useLanguage() === 'en' ? ('en' as const) : ('ar' as const);

  const rows = members.map((member): StaffRowView => ({
    key: member.userId,
    name: member.name,
    email: member.email,
    badges: badgesOf(member, now, words.badges),
    added: addedText(member.addedAt, language),
    collected: collectedOf(member.userId),
    member,
  }));

  return {
    label: words.label,
    columns: words.columns,
    addedOn: (date: string) => words.addedOn({ date: isolate(date) }),
    thisMonth: (amount: string) => words.thisMonth({ amount: isolate(amount) }),
    status: query.isPending
      ? ('loading' as const)
      : query.data === undefined
        ? ('error' as const)
        : members.length === 0
          ? ('empty' as const)
          : ('ready' as const),
    count: query.data === undefined ? undefined : words.count({ count: members.length }),
    rows,
    empty: { title: words.empty.title, description: words.empty.text },
    failure: {
      title: words.loadFailed,
      message: view?.message,
      reference: view?.kind === 'refused' ? view.reference : undefined,
      retryLabel: copy.status.retry,
      blocked,
      retry: () => {
        void query.refetch();
      },
    },
  };
}

/** The staff list, ready to render. */
export type StaffListView = ReturnType<typeof useStaffList>;
