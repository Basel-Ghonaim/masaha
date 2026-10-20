import type { FactGroup } from '@masaha/shared/spaces';
import { useCopy } from '@shared/copy';
import { useIsMutating } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { mayEdit } from '../../services/mayEdit';
import type { EditorPlace } from '../../types/EditorPlace';
import { EDITOR_SCOPES } from '../editor/editorScope';
import { useLeaveGuard } from '../editor/useLeaveGuard';
import { useSpaceQuery } from '../editor/useSpaceQuery';

/**
 * A space's prices on a page of their own, Packages & prices, ready to render: the space's loading,
 * failure and not-found states, as the editor's; then the space, whether the place may edit it
 * (`mayEdit`), and the guard that asks before the page is left with unsaved prices, which the section
 * reports (`onDirtyChange`), and says they are being saved while one of the space's writes is pending.
 */
export function useSpacePricesEditor(place: EditorPlace, spaceId: number) {
  const copy = useCopy();
  const words = copy.spaces.editor;
  const query = useSpaceQuery(place, spaceId);
  const [dirty, setDirty] = useState(false);
  const onDirtyChange = useCallback((_group: FactGroup, isDirty: boolean) => {
    setDirty(isDirty);
  }, []);
  const saving = useIsMutating({ mutationKey: EDITOR_SCOPES[place].writeKey(spaceId) }) > 0;
  const title = place === 'owner' ? words.prices.publishedTitle : words.sections.prices;
  const guard = useLeaveGuard(dirty ? [title] : [], saving, false);
  const space = query.data;

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
    readOnly: !mayEdit(place, space.isVerified),
    onDirtyChange,
    guard,
  };
}
