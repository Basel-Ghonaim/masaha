import { Badge, Button, cn, Field, Switch } from '@shared/design-system';
import type { PackageRowView } from '../../types/PackageRowView';

/**
 * One package: its name, «موقوفة» when paused, its terms and its price; its switch «متاحة» and its
 * «تعديل», each named after the package. A paused row is muted, and one that still holds a shift
 * says so, with the way to clear it.
 */
export function PackageRow({ row }: { row: PackageRowView }) {
  return (
    <li
      className={cn(
        'flex flex-col gap-3 p-4 md:flex-row md:items-start md:justify-between',
        row.paused !== null && 'bg-muted',
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-label text-foreground">{row.name}</span>
          {row.paused !== null && <Badge variant="neutral">{row.paused}</Badge>}
        </div>
        {row.summary !== '' && <p className="text-body-sm text-muted-foreground">{row.summary}</p>}
        <p className="text-body-sm text-foreground">{row.price}</p>
        {row.heldShift && (
          <div className="flex flex-col items-start gap-2 pt-1">
            <p className="text-caption text-muted-foreground">{row.heldShift.text}</p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-disabled={row.heldShift.clear.pending || undefined}
              onClick={row.heldShift.clear.run}
            >
              {row.heldShift.clear.label}
            </Button>
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-3">
        <Field orientation="horizontal" label={row.available.label}>
          <Switch
            checked={row.available.checked}
            aria-label={row.available.name}
            aria-disabled={row.available.pending || undefined}
            onCheckedChange={row.available.toggle}
          />
        </Field>
        <Button
          type="button"
          variant="outline"
          size="sm"
          aria-label={row.edit.name}
          onClick={row.edit.run}
        >
          {row.edit.label}
        </Button>
      </div>
    </li>
  );
}
