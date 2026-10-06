import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import {
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Separator,
} from '@shared/design-system';
import { FormFailure } from '@shared/forms';
import { useGovernorateCard } from '../../hooks/list/useGovernorateCard';
import { AddAreaForm } from '../sheet/AddAreaForm';
import { EditGovernorateForm } from '../sheet/EditGovernorateForm';
import { LookupSheet } from '../sheet/LookupSheet';
import { AreaRow } from './AreaRow';
import { RowControls } from './RowControls';

/**
 * A governorate's card: its names, English first, its count of areas, its badge when hidden and its
 * controls with its edit sheet, which wrap under the names on a narrow screen, as an area's do; then
 * the failure of an action on it, its areas, and the sheet that adds one. A hidden governorate's
 * names are dimmed, not its surface.
 */
export function GovernorateCard({ governorate }: { governorate: AdminGovernorateWithAreas }) {
  const card = useGovernorateCard(governorate);

  return (
    <Card>
      <CardHeader className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex min-w-0 grow flex-col gap-1">
          <CardTitle className="flex flex-wrap items-center gap-2">
            <h2 lang="en" dir="auto" className={card.hidden ? 'text-muted-foreground' : undefined}>
              {card.nameEn}
            </h2>
            {card.hidden && <Badge variant="warning">{card.hiddenLabel}</Badge>}
          </CardTitle>
          <CardDescription className="flex flex-wrap items-center gap-2">
            <span lang="ar" dir="auto">
              {card.nameAr}
            </span>
            <Separator orientation="vertical" />
            <span>{card.countLine}</span>
          </CardDescription>
        </div>
        <RowControls controls={card.controls}>
          <LookupSheet sheet={card.edit} variant="ghost">
            {(close) => <EditGovernorateForm governorate={governorate} onSaved={close} />}
          </LookupSheet>
        </RowControls>
      </CardHeader>
      <CardContent>
        {card.failure && <FormFailure view={card.failure} />}
        {card.areas.length > 0 && (
          <ul className="divide-y divide-border rounded-md border border-border">
            {card.areas.map((area, index) => (
              <AreaRow
                key={area.id}
                governorate={governorate}
                area={area}
                index={index}
                blocked={card.blocked}
              />
            ))}
          </ul>
        )}
        <div>
          <LookupSheet sheet={card.addArea} variant="outline">
            {(close) => <AddAreaForm governorateId={governorate.id} onSaved={close} />}
          </LookupSheet>
        </div>
      </CardContent>
    </Card>
  );
}
