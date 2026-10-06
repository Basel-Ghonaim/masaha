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
import { useGovernorateCard } from '../../hooks/list/useGovernorateCard';
import { AreaRow } from './AreaRow';

/**
 * A governorate's card: its names, English first, its count of areas and its badge when hidden,
 * then its areas. A hidden governorate's names are dimmed, not its surface.
 */
export function GovernorateCard({ governorate }: { governorate: AdminGovernorateWithAreas }) {
  const card = useGovernorateCard(governorate);

  return (
    <Card>
      <CardHeader>
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
      </CardHeader>
      <CardContent>
        {card.areas.length > 0 && (
          <ul className="divide-y divide-border rounded-md border border-border">
            {card.areas.map((area) => (
              <AreaRow key={area.id} area={area} hiddenLabel={card.hiddenLabel} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
