import { FACT_GROUPS, type AdminSpace, type FactGroup } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import type { BadgeProps } from '@shared/design-system';
import { isolate, useLanguage } from '@shared/localisation';
import { useIsMutating } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { mayEdit } from '../../services/mayEdit';
import { spaceNameOf } from '../../services/spaceName';
import type { EditorPlace } from '../../types/EditorPlace';
import type { OwnedSpace } from '../../types/OwnersSlot';
import { EDITOR_SCOPES } from './editorScope';
import { useLeaveGuard } from './useLeaveGuard';
import { usePricesLink } from './usePricesLink';
import { useSectionInView } from './useSectionInView';
import { useSpaceQuery } from './useSpaceQuery';

/** The sections the editor draws, in its order: the five fact groups, then the gallery. */
const SECTIONS = [...FACT_GROUPS, 'photos'] as const;

/**
 * A space's editor at `place`, ready to render: its loading, failure and not-found states; then its
 * state's badges, whether its fields are offered to edit here (`mayEdit`), the admin's notice that
 * says so (a verified one naming its owners), or an owner's head line with the way to the public
 * page and the prices as a row leading to Packages & prices (`pricesLink`), the space as the owners'
 * actions take it, the groups still missing while it is edited here, the sections' navigation with
 * the one in view marked, and the guard that asks before the page is left with unsaved changes,
 * which each section reports (`onDirtyChange`), and says they are being saved while one of the
 * space's writes is pending. A space found deleted is the 404, whatever was read before. The gallery
 * is a section like the rest, and no fact group: it is never in the checklist, which still maps the
 * five groups.
 */
export function useSpaceEditor(place: EditorPlace, spaceId: number) {
  const copy = useCopy();
  const words = copy.spaces.editor;
  const english = useLanguage() === 'en';
  const query = useSpaceQuery(place, spaceId);
  const [dirty, setDirty] = useState<FactGroup[]>([]);
  const onDirtyChange = useCallback((group: FactGroup, isDirty: boolean) => {
    setDirty((groups) =>
      isDirty
        ? groups.includes(group)
          ? groups
          : [...groups, group]
        : groups.filter((candidate) => candidate !== group),
    );
  }, []);
  const saving = useIsMutating({ mutationKey: EDITOR_SCOPES[place].writeKey(spaceId) }) > 0;
  // Photos are immediate actions, so nothing there is "unsaved": only an upload still travelling is
  // lost by leaving, and the gallery says so while it is.
  const [uploading, setUploading] = useState(false);
  const onUploadingChange = useCallback((running: boolean) => {
    setUploading(running);
  }, []);
  const guard = useLeaveGuard(
    FACT_GROUPS.filter((group) => dirty.includes(group)).map((group) => words.sections[group]),
    saving,
    uploading,
  );
  const space = query.data;
  const readOnly = space !== undefined && !mayEdit(place, space.isVerified);
  const pricesLink = usePricesLink(space, place);
  const inView = useSectionInView(space === undefined ? [] : SECTIONS, readOnly ? 'read' : 'edit');

  // A space found deleted is gone, even when an earlier read of it is still at hand.
  if (query.error?.status === 404) return { state: 'notFound' as const, guard };
  if (space === undefined) {
    if (query.isPending) return { state: 'loading' as const, label: copy.status.loading, guard };
    return {
      state: 'failed' as const,
      message: words.loadFailed,
      retry: {
        label: copy.status.retry,
        run: () => {
          void query.refetch();
        },
      },
      guard,
    };
  }

  return {
    state: 'ready' as const,
    space,
    readOnly,
    badges: place === 'admin' ? badgesOf(space, words.status) : ownerBadgesOf(space, words.owner),
    notice:
      place === 'admin'
        ? {
            unverified: words.unverified,
            verified: {
              // Each name isolated, so a name in one direction never reorders its neighbours.
              title: words.verified.ownedBy({
                names: space.owners
                  .map(({ name }) => isolate(name))
                  .join(words.verified.namesSeparator),
              }),
              description: words.verified.description,
              viewOnSite: words.verified.viewOnSite,
            },
          }
        : null,
    head:
      place === 'owner' ? { intro: words.owner.intro, viewPublic: words.owner.viewPublic } : null,
    pricesLink,
    owned: {
      id: space.id,
      name: spaceNameOf(space, english),
      isVerified: space.isVerified,
      owners: space.owners,
      unsaved: dirty.length > 0,
    } satisfies Omit<OwnedSpace, 'focusFallback'>,
    checklist: readOnly ? null : checklistOf(space, words),
    navigation: {
      label: words.navigation,
      items: SECTIONS.map((section) => ({
        id: section,
        label: words.sections[section],
        current: inView.current === section,
        choose: () => {
          inView.choose(section);
        },
      })),
    },
    privacy: place === 'admin' ? words.privacy : null,
    /** The opening hours have unsaved changes: a new shift is not yet the prices' to choose. */
    hoursUnsaved: dirty.includes('hours'),
    onDirtyChange,
    /** The gallery's queue, so the guard asks while a file is on its way up. */
    onUploadingChange,
    guard,
  };
}

type EditorWords = ReturnType<typeof useCopy>['spaces']['editor'];

/** A space's state as two facts: whether it is verified, always, and hidden, when it is. */
function badgesOf(space: AdminSpace, status: EditorWords['status']) {
  const badges: { label: string; variant: NonNullable<BadgeProps['variant']> }[] = [
    space.isVerified
      ? { label: status.verified, variant: 'success' }
      : { label: status.unverified, variant: 'neutral' },
  ];
  if (space.isHidden) badges.push({ label: status.hidden, variant: 'warning' });
  return badges;
}

/**
 * The space's state as an owner is shown it: only that it is hidden from visitors, when it is; the
 * space is always verified for its owner, so that is no news.
 */
function ownerBadgesOf(space: AdminSpace, owner: EditorWords['owner']) {
  return space.isHidden ? [{ label: owner.hidden, variant: 'warning' as const }] : [];
}

/** The five groups, each done or not yet added and leading to its section; none once all are done. */
function checklistOf(space: AdminSpace, words: EditorWords) {
  if (space.missingGroups.length === 0) return null;
  return {
    title: words.checklist.title,
    description: words.checklist.description,
    items: FACT_GROUPS.map((group) => {
      const missing = space.missingGroups.includes(group);
      return {
        group,
        label: words.sections[group],
        href: `#${group}`,
        status: missing ? words.checklist.missing : words.checklist.done,
        variant: missing ? ('warning' as const) : ('success' as const),
      };
    }),
  };
}
