import type { AdminSpace, Price } from '@masaha/shared/spaces';
import type { AppError } from '@shared/errors';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { EditorPlace } from '../../types/EditorPlace';
import { EDITOR_SCOPES } from './editorScope';

/** A space's published prices, as one read of the space answers them. */
export type SpacePrices = {
  /** `loading` until a read made since the screen opened has answered. */
  state: 'loading' | 'failed' | 'ready';
  /** The prices, in the order they are shown in; none until ready. */
  prices: Price[];
  /** Reads the space again, as after a refusal that says a price changed. */
  refresh: () => void;
};

/**
 * The space's published prices, as the editor at `place` reads the space, for another capability's
 * screen that sells from them (the desk's subscription sheet): read again whenever that screen opens,
 * never shown from an older read meanwhile, so what it offers is what the server holds now (finding
 * 171). Once a read since then has answered, the prices stay shown while the space is read again
 * behind them (a return to the window); a refresh hides them until it answers.
 */
export function useSpacePrices(place: EditorPlace, spaceId: number): SpacePrices {
  const scope = EDITOR_SCOPES[place];
  // The repository rejects with the AppError the transport made (docs/frontend/architecture.md §7).
  const query = useQuery<AdminSpace, AppError, Price[]>({
    queryKey: scope.spaceKey(spaceId),
    queryFn: () => scope.repository.get(spaceId),
    refetchOnMount: 'always',
    select: (space) => space.prices,
  });
  const [refreshing, setRefreshing] = useState(false);
  const waiting = !query.isFetchedAfterMount || refreshing;
  return {
    state: waiting ? 'loading' : query.isError ? 'failed' : 'ready',
    prices: waiting ? [] : (query.data ?? []),
    refresh: () => {
      setRefreshing(true);
      void query.refetch().finally(() => {
        setRefreshing(false);
      });
    },
  };
}
