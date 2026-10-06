import type { AdminArea, AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { useCopy } from '@shared/copy';
import { useMutationState } from '@tanstack/react-query';
import { moved } from '../../services/moved';
import type { RowAction } from '../../types/RowAction';
import { rowActionKey } from '../mutationKeys';
import { useOrderAreas } from '../order/useOrderAreas';
import { useSetAreaVisibility } from '../visibility/useSetAreaVisibility';
import { useRowViews } from './useRowViews';

/**
 * One area's row in its governorate's card, ready to render: its names, English first, whether it is
 * hidden and its controls. The row owns its own actions, so its last one stays held
 * while the row is on screen, and its failure with it.
 *
 * Its controls wait while its own action is pending, while any order of its governorate's areas is
 * (so two orders never race), and while its card waits out a 429 (`blocked`).
 */
export function useAreaRow({
  governorate,
  area,
  index,
  blocked,
}: {
  governorate: AdminGovernorateWithAreas;
  area: AdminArea;
  index: number;
  blocked: boolean;
}) {
  const copy = useCopy();
  const { nameOf, controlsOf } = useRowViews();
  const setVisibility = useSetAreaVisibility();
  const order = useOrderAreas();
  const governorateId = governorate.id;
  const listMoving =
    useMutationState({
      filters: {
        mutationKey: rowActionKey('areaOrder'),
        status: 'pending',
        predicate: (mutation) =>
          (mutation.state.variables as RowAction | undefined)?.governorateId === governorateId,
      },
    }).length > 0;
  const areaIds = governorate.areas.map(({ id }) => id);
  const name = nameOf(area);

  return {
    nameEn: area.nameEn,
    nameAr: area.nameAr,
    hidden: !area.isActive,
    hiddenLabel: copy.lookups.row.hidden,
    controls: controlsOf(
      name,
      area.isActive,
      {
        index,
        count: areaIds.length,
        busy: setVisibility.isPending || order.isPending || blocked,
        listMoving,
      },
      (isActive) => {
        setVisibility.mutate({ governorateId, areaId: area.id, isActive });
      },
      (direction) => {
        order.mutate({ governorateId, areaId: area.id, ids: moved(areaIds, area.id, direction) });
      },
    ),
  };
}
