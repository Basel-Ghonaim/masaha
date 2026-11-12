import { Fragment } from 'react';
import { useShiftsSection } from '../../hooks/shifts/useShiftsSection';
import type { SectionHost } from '../../types/SectionHost';
import { SectionCard } from '../editor/SectionCard';
import { ShiftsSheet } from './ShiftsSheet';

/** «الورديات»: the shifts on one line, and their Sheet, which opens once the hours are saved. */
export function ShiftsSection({
  host,
  packageShifts,
}: {
  host: SectionHost;
  packageShifts: readonly number[];
}) {
  const view = useShiftsSection(host);
  return (
    <>
      <SectionCard frame={view.frame} notice={host.notice} empty={view.empty}>
        <p className="text-body">
          {view.shifts.map((shift, index) => (
            <Fragment key={shift.key}>
              {index > 0 && <span className="text-muted-foreground">{view.separator}</span>}
              <span>
                <span lang={shift.lang}>{shift.name}</span> {shift.range}
              </span>
            </Fragment>
          ))}
        </p>
      </SectionCard>
      {host.editable && host.space.hours !== null && (
        <ShiftsSheet host={host} packageShifts={packageShifts} />
      )}
    </>
  );
}
