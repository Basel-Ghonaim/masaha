import { useCopy } from '@shared/copy';
import { isolate, useLanguage } from '@shared/localisation';
import type { Direction } from '../../services/moved';
import type { RowControlsView } from '../../types/RowControlsView';
import type { SheetView } from '../../types/SheetView';

/** A row's place in its list, and what it waits on: its own action, its list's order, a 429. */
export type RowState = { index: number; count: number; busy: boolean; listMoving: boolean };

/**
 * What a governorate's row and an area's row share, worded: the name a control is called by, the
 * controls, and the sheets. A governorate's card and each area's row build theirs from these.
 */
export function useRowViews() {
  const copy = useCopy();
  const english = useLanguage() === 'en';

  // The accessible names carry the name in the interface's language: a label is read in one voice.
  const nameOf = (row: { nameAr: string; nameEn: string }) =>
    isolate(english ? row.nameEn : row.nameAr);

  const controlsOf = (
    name: string,
    isActive: boolean,
    { index, count, busy, listMoving }: RowState,
    toggle: (isActive: boolean) => void,
    move: (direction: Direction) => void,
  ): RowControlsView => ({
    shown: {
      checked: isActive,
      label: copy.lookups.row.shown({ name }),
      waiting: busy,
      toggle,
    },
    up: {
      label: copy.lookups.row.moveUp({ name }),
      disabled: index === 0,
      waiting: busy || listMoving,
      move: () => {
        move('up');
      },
    },
    down: {
      label: copy.lookups.row.moveDown({ name }),
      disabled: index === count - 1,
      waiting: busy || listMoving,
      move: () => {
        move('down');
      },
    },
  });

  // A sheet's own words; an area's sheet names its governorate, in its English name.
  const sheetOf = (sheet: Omit<SheetView, 'closeLabel'>): SheetView => ({
    ...sheet,
    closeLabel: copy.lookups.sheet.close,
  });
  const editOf = (name: string, title: string, description?: string) =>
    sheetOf({
      trigger: copy.lookups.row.edit,
      triggerName: copy.lookups.row.editName({ name }),
      title,
      ...(description !== undefined && { description }),
    });

  return { nameOf, controlsOf, sheetOf, editOf };
}
