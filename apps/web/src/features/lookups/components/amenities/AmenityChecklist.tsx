import { Badge, Button, Checkbox, Field } from '@shared/design-system';
import { useAmenityChecklist } from '../../hooks/amenities/useAmenityChecklist';

/**
 * A space's amenities to tick, from the platform's list, as a group named by `label`: the active
 * ones, and a retired one the space still has (`linked`), marked inactive. It hands back the
 * amenities chosen. While the list loads, or once it has failed, it says so, with a way to try again.
 */
export function AmenityChecklist({
  label,
  value,
  linked,
  onValueChange,
  disabled,
}: {
  label: string;
  value: number[];
  linked: number[];
  onValueChange: (ids: number[]) => void;
  disabled: boolean;
}) {
  const checklist = useAmenityChecklist({ value, linked, onValueChange });
  const { words } = checklist;

  return (
    <div role="group" aria-label={label} className="flex flex-col gap-2">
      {checklist.status === 'loading' && (
        <p className="text-body-sm text-muted-foreground">{words.loading}</p>
      )}
      {checklist.status === 'error' && (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-body-sm text-destructive">{words.failed}</p>
          <Button type="button" variant="outline" size="sm" onClick={checklist.retry}>
            {words.retry}
          </Button>
        </div>
      )}
      {checklist.status === 'ready' && checklist.items.length === 0 && (
        <p className="text-body-sm text-muted-foreground">{words.empty}</p>
      )}
      {checklist.items.length > 0 && (
        <ul className="grid gap-2 md:grid-cols-2">
          {checklist.items.map((item) => (
            <li key={item.id}>
              <Field
                orientation="horizontal"
                label={
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {item.name}
                    {/* A space, so the name and its mark are heard as two words. */}
                    {item.inactive && ' '}
                    {item.inactive && <Badge variant="neutral">{words.inactive}</Badge>}
                  </span>
                }
              >
                <Checkbox
                  checked={item.checked}
                  onCheckedChange={(checked) => {
                    item.toggle(checked === true);
                  }}
                  disabled={disabled}
                />
              </Field>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
