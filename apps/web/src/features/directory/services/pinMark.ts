import type { LiveStatus } from '@masaha/shared/occupancy';
import type { MapMark } from '@shared/map';

/** Each live state's mark (U6): a shape as well as a colour, so no state is told by colour alone. */
const MARKS = {
  AVAILABLE: { shape: 'filled', tone: 'success' },
  FULL: { shape: 'bar', tone: 'warning' },
  CLOSED: { shape: 'hollow', tone: 'neutral' },
} as const satisfies Record<LiveStatus, MapMark>;

/** A space with no live status, verified or not (design issue 21). */
const NONE: MapMark = { shape: 'dashed', tone: 'muted' };

/** A pin's mark from its live status: available filled, full barred, closed hollow, none dashed. */
export function pinMark(status: LiveStatus | null): MapMark {
  return status === null ? NONE : MARKS[status];
}
