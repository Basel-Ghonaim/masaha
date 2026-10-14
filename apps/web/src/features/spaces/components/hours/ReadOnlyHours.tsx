import type { AdminSpace } from '@masaha/shared/spaces';
import { useReadOnlyHours } from '../../hooks/hours/useReadOnlyHours';
import { ReadOnlyCard } from '../editor/ReadOnlyCard';
import { ReadOnlyItem } from '../editor/ReadOnlyRows';

/** «ساعات العمل» of a verified space, to read: each day, Saturday first, its hours or closed; its shifts. */
export function ReadOnlyHours({ space }: { space: AdminSpace }) {
  const view = useReadOnlyHours(space);

  return (
    <ReadOnlyCard id="hours" title={view.title}>
      {view.none !== null ? (
        <p className="text-body-sm text-muted-foreground">{view.none}</p>
      ) : (
        <>
          <dl className="flex flex-col divide-y divide-border">
            {view.days.map((day) => (
              <ReadOnlyItem key={day.key} label={day.name}>
                {day.closed ? day.value : <span dir="ltr">{day.value}</span>}
              </ReadOnlyItem>
            ))}
          </dl>
          {view.shifts.length > 0 && (
            <>
              <h3 className="text-label">{view.shiftsTitle}</h3>
              <dl className="flex flex-col divide-y divide-border">
                {view.shifts.map((shift) => (
                  <ReadOnlyItem key={shift.key} label={<span lang={shift.lang}>{shift.name}</span>}>
                    <span dir="ltr">{shift.value}</span>
                  </ReadOnlyItem>
                ))}
              </dl>
            </>
          )}
        </>
      )}
    </ReadOnlyCard>
  );
}
