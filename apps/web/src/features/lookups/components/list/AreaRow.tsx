import { Badge } from '@shared/design-system';

/** An area in its governorate's card: its names, English first, and its badge when hidden. */
export function AreaRow({
  area,
  hiddenLabel,
}: {
  area: { nameEn: string; nameAr: string; hidden: boolean };
  hiddenLabel: string;
}) {
  return (
    <li className="flex flex-wrap items-center gap-x-4 gap-y-2 px-3 py-2">
      <span className="flex min-w-0 grow flex-wrap items-baseline gap-x-2">
        <span lang="en" dir="auto" className={area.hidden ? 'text-muted-foreground' : undefined}>
          {area.nameEn}
        </span>
        <span lang="ar" dir="auto" className="text-caption text-muted-foreground">
          {area.nameAr}
        </span>
        {area.hidden && <Badge variant="warning">{hiddenLabel}</Badge>}
      </span>
    </li>
  );
}
