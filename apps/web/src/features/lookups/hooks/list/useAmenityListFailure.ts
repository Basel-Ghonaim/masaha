import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView, type FormFailureView } from '@shared/forms';
import { useMutationState } from '@tanstack/react-query';
import type { AmenityAction } from '../../types/AmenityAction';
import { AMENITY_ACTIONS, amenityActionKindOf, type AmenityActionKind } from '../mutationKeys';

type Action = {
  kind: AmenityActionKind | undefined;
  action: AmenityAction;
  error: AppError | null;
  /** When it was sent, in milliseconds. */
  submittedAt: number;
};

/**
 * What an action acts on: a row, for either of its switches, or the list, for an order. The next
 * action on the same row or list replaces its failure; an action elsewhere leaves it standing.
 */
function targetOf({ kind, action }: Action): string {
  return kind === 'amenityOrder' ? 'list' : `row ${String(action.amenityId)}`;
}

/** When a standing 429 lets the rows act again: when it was sent, plus the wait it asked for. */
function endOf({ error, submittedAt }: Action): number {
  return submittedAt + (error?.retryAfterSeconds ?? 0) * 1000;
}

/**
 * What the amenities' list shows of its actions' failures: an order's, the newest one standing until
 * the next order (a 409 means the list changed meanwhile, and says so); and whether every row waits
 * out a 429 (`blocked`), while any standing failure, on a row or the list, is one still counting
 * down, whatever failed after it. A row's own failure is its row's (`useAmenityRowFailure`).
 */
export function useAmenityListFailure(): { failure: FormFailureView | null; blocked: boolean } {
  const copy = useCopy();
  // Every action on the amenities that is still held, oldest first.
  const actions = useMutationState({
    filters: { mutationKey: AMENITY_ACTIONS },
    select: (mutation): Action => ({
      kind: amenityActionKindOf(mutation.options.mutationKey),
      action: mutation.state.variables as AmenityAction,
      error: mutation.state.status === 'error' ? (mutation.state.error as AppError) : null,
      submittedAt: mutation.state.submittedAt,
    }),
  });

  const standing = actions.filter((one, index) =>
    actions.slice(index + 1).every((later) => targetOf(later) !== targetOf(one)),
  );
  const order = standing.find(({ kind }) => kind === 'amenityOrder')?.error ?? null;
  // The 429 that ends last, whichever row or list it stands on.
  const hold =
    standing
      .filter(({ error }) => error?.type === 'rate_limit')
      .reduce<Action | undefined>(
        (last, one) => (last === undefined || endOf(one) > endOf(last) ? one : last),
        undefined,
      )?.error ?? null;

  const { view } = useRefusalView(order, copy.lookups.failure.title);
  const { blocked } = useRefusalView(hold, copy.lookups.failure.title);

  return {
    failure:
      order?.type === 'conflict'
        ? {
            kind: 'refused',
            title: copy.lookups.failure.title,
            message: copy.lookups.failure.orderChanged,
          }
        : view,
    blocked,
  };
}
