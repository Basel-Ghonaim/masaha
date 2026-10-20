import type { AdminSpace, FactGroup } from '@masaha/shared/spaces';
import {
  Badge,
  Button,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  XIcon,
} from '@shared/design-system';
import { useContactsSection } from '../../hooks/contacts/useContactsSection';
import type { EditorPlace } from '../../types/EditorPlace';
import { SectionCard } from '../editor/SectionCard';

/**
 * «التواصل»: the contacts, a row each, its type, its value with the form it is stored in under it,
 * and a phone's carrier beside it; added up to the limit and removed; saved, dated and confirmed as
 * one group.
 */
export function ContactsSection({
  place,
  space,
  onDirtyChange,
}: {
  place: EditorPlace;
  space: AdminSpace;
  onDirtyChange: (group: FactGroup, dirty: boolean) => void;
}) {
  const view = useContactsSection({ place, space, onDirtyChange });

  return (
    <SectionCard frame={view.frame}>
      {view.rows.length > 0 && (
        <ul className="flex flex-col gap-4">
          {view.rows.map((row) => (
            <li key={row.key} className="grid gap-2 md:grid-cols-12 md:items-start">
              <Field label={row.type.label} className="md:col-span-3">
                <Select
                  value={row.type.value}
                  onValueChange={row.type.choose}
                  disabled={row.type.disabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {row.type.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label={row.value.label}
                labelEnd={
                  row.value.carrier === null ? undefined : (
                    <Badge variant="neutral">{row.value.carrier}</Badge>
                  )
                }
                helper={row.value.helper}
                error={row.value.error}
                className="md:col-span-8"
              >
                <Input dir="ltr" autoComplete="off" spellCheck={false} {...row.value.binding} />
              </Field>
              <div className="md:col-span-1 md:flex md:justify-end md:pt-7">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={row.remove.label}
                  disabled={row.remove.disabled}
                  onClick={row.remove.run}
                >
                  <XIcon aria-hidden />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={view.add.disabled} onClick={view.add.run}>
          {view.add.label}
        </Button>
        {view.add.reason && (
          <span className="text-caption text-muted-foreground">{view.add.reason}</span>
        )}
      </div>
    </SectionCard>
  );
}
