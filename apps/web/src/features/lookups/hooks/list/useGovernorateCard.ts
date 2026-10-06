import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import type { AppError } from '@shared/errors';
import { useRefusalView, type FormFailureView } from '@shared/forms';
import { useMutationState } from '@tanstack/react-query';
import { moved } from '../../services/moved';
import type { RowAction } from '../../types/RowAction';
import { ROW_ACTIONS, rowActionKindOf, type RowActionKind } from '../mutationKeys';
import { useOrderGovernorates } from '../order/useOrderGovernorates';
import { useSetGovernorateVisibility } from '../visibility/useSetGovernorateVisibility';
import { useGovernoratesQuery } from './useGovernoratesQuery';
import { useRowViews } from './useRowViews';

type Action = { kind: RowActionKind | undefined; action: RowAction; error: AppError | null };

/**
 * What an action acts on: a row, for hiding or restoring it, or a list, for an order. The next action
 * on the same row or list replaces its failure; an action elsewhere leaves it standing.
 */
function targetOf({ kind, action }: Action): string {
  if (kind === 'governorateOrder') return 'governorates';
  if (kind === 'areaOrder') return `areas of ${String(action.governorateId)}`;
  return `row ${String(action.governorateId)} ${String(action.areaId ?? '')}`;
}

/**
 * One governorate's card, ready to render: its names, English first (the line most names are used
 * in), its count of areas, whether it is hidden, its controls, its areas in order, and the failure
 * of an action on it or its areas.
 *
 * Nothing changes before the server answers: the governorate's controls wait while its own action is
 * pending, its arrows while any governorate's order is, so two orders never race, and every control of
 * the card while it waits out a 429 (`blocked`, which its areas' rows wait on too). A failure stands
 * until the next action on its row or list, the newest one shown.
 */
export function useGovernorateCard(governorate: AdminGovernorateWithAreas) {
  const copy = useCopy();
  const { nameOf, controlsOf } = useRowViews();
  const { data: governorates = [] } = useGovernoratesQuery();
  const setVisibility = useSetGovernorateVisibility();
  const order = useOrderGovernorates();
  const governorateId = governorate.id;
  // Every action on a row of the lists that is still held, oldest first, wherever it was started.
  const actions = useMutationState({
    filters: { mutationKey: ROW_ACTIONS },
    select: (mutation): Action & { pending: boolean } => ({
      kind: rowActionKindOf(mutation.options.mutationKey),
      action: mutation.state.variables as RowAction,
      pending: mutation.state.status === 'pending',
      error: mutation.state.status === 'error' ? (mutation.state.error as AppError) : null,
    }),
  });

  const latest = actions.filter((one, index) =>
    actions.slice(index + 1).every((later) => targetOf(later) !== targetOf(one)),
  );
  const last = latest
    .filter(({ action, error }) => error !== null && action.governorateId === governorateId)
    .at(-1);
  const refusal = last?.error ?? null;
  const { view, blocked } = useRefusalView(refusal, copy.lookups.failure.title);
  const orderChanged =
    refusal?.type === 'conflict' &&
    (last?.kind === 'governorateOrder' || last?.kind === 'areaOrder');
  const failure: FormFailureView | null = orderChanged
    ? {
        kind: 'refused',
        title: copy.lookups.failure.title,
        message: copy.lookups.failure.orderChanged,
      }
    : view;

  const governorateIds = governorates.map(({ id }) => id);
  const name = nameOf(governorate);

  return {
    nameEn: governorate.nameEn,
    nameAr: governorate.nameAr,
    hidden: !governorate.isActive,
    countLine: copy.lookups.governorates.areaCount({ count: governorate.areas.length }),
    hiddenLabel: copy.lookups.row.hidden,
    failure,
    blocked,
    controls: controlsOf(
      name,
      governorate.isActive,
      {
        index: governorateIds.indexOf(governorateId),
        count: governorateIds.length,
        busy: setVisibility.isPending || order.isPending || blocked,
        listMoving: actions.some(({ kind, pending }) => pending && kind === 'governorateOrder'),
      },
      (isActive) => {
        setVisibility.mutate({ governorateId, isActive });
      },
      (direction) => {
        order.mutate({ governorateId, ids: moved(governorateIds, governorateId, direction) });
      },
    ),
    areas: governorate.areas,
  };
}
