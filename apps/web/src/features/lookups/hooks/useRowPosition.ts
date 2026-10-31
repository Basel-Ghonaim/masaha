import { useCopy } from '@shared/copy';
import type { FormSchema } from '@shared/forms';
import { wholeNumberOf } from '@shared/lib';
import { useState } from 'react';
import { placed } from '../services/moved';
import { offersPosition, withPosition, type Positioned } from '../services/withPosition';
import type { PositionFieldView } from '../types/PositionFieldView';
import type { RowPlace } from '../types/RowPlace';

/**
 * A sheet's position field, for the row it edits (`place`): offered when its list holds more than
 * ten rows, as the list stands when the sheet opens. It starts at the row's place; Arabic-Indic
 * digits are read; it is refused outside 1 to the list's count. Once the names are saved, a new
 * position is saved through the list's order route, the whole order with the row moved; the same
 * place sends nothing more.
 */
export function useRowPosition(place: RowPlace | undefined) {
  const lines = useCopy().lookups.sheet;
  // Fixed while the sheet is open: the schema that bounds it is made once, with the form.
  const [{ shown, count, current }] = useState(() => {
    const index = place === undefined ? -1 : place.ids.indexOf(place.id);
    const rows = place?.ids.length ?? 0;
    return { shown: index !== -1 && offersPosition(rows), count: rows, current: index + 1 };
  });
  const range = lines.positionRange({ count });

  return {
    schema: <Request>(schema: FormSchema<Request>): FormSchema<Positioned<Request>> =>
      withPosition(schema, count),
    defaultValue: shown ? String(current) : '',
    /** The position as the schema reads it: none when not offered, `null` when left blank. */
    input: (typed: string) => (shown ? (wholeNumberOf(typed) ?? null) : undefined),
    lines: { required: range, invalid_format: range, out_of_range: range },
    /** Saves the row's new place, if it has one, after its names. */
    save: async (position: number | undefined) => {
      if (place === undefined || position === undefined || position === current) return;
      await place.order(placed(place.ids, place.id, position));
    },
    view: (
      binding: PositionFieldView['binding'],
      error: string | undefined,
    ): PositionFieldView | undefined =>
      shown ? { label: lines.position, helper: range, binding, error } : undefined,
  };
}
