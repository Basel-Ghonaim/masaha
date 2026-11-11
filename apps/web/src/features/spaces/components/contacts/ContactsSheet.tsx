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
import { useContactsSheet } from '../../hooks/contacts/useContactsSheet';
import type { SectionHost } from '../../types/SectionHost';
import { EditSheet } from '../editor/EditSheet';
import { CONTACT_ICONS } from './contactIcons';

/**
 * «التواصل»'s Sheet (C2): a block per contact — its type from a list with icons, «وسيلة أخرى»'s own
 * name, its value with the form it is saved in and a phone's carrier, its removal — then «إضافة
 * وسيلة تواصل», its limit said beside it once reached.
 */
export function ContactsSheet({ host }: { host: SectionHost }) {
  const view = useContactsSheet(host);
  return (
    <EditSheet frame={view.frame}>
      <ul className="flex flex-col gap-3">
        {view.list.map((row) => (
          <li
            key={row.key}
            className="grid gap-3 rounded-lg border border-border p-3 md:grid-cols-12 md:items-start"
          >
            <Field label={row.type.label} className="md:col-span-4">
              <Select
                value={row.type.value}
                onValueChange={row.type.choose}
                disabled={row.type.disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {row.type.options.map((option) => {
                    const Icon = CONTACT_ICONS[option.value];
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <span className="flex items-center gap-2">
                          <Icon aria-hidden className="size-4 text-primary" />
                          {option.label}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>
            {row.label && (
              <Field label={row.label.label} error={row.label.error} className="md:col-span-7">
                <Input
                  dir="auto"
                  autoComplete="off"
                  placeholder={row.label.placeholder}
                  {...row.label.binding}
                />
              </Field>
            )}
            <Field
              label={row.value.label}
              labelEnd={
                row.value.carrier === null ? undefined : (
                  <Badge variant="neutral">{row.value.carrier}</Badge>
                )
              }
              helper={row.value.helper}
              error={row.value.error}
              className={row.label ? 'md:col-span-11' : 'md:col-span-7'}
            >
              <Input
                dir="ltr"
                autoComplete="off"
                spellCheck={false}
                placeholder={row.value.placeholder}
                {...row.value.binding}
              />
            </Field>
            <div className="flex justify-end md:col-span-1 md:pt-7">
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
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" disabled={view.add.disabled} onClick={view.add.run}>
          {view.add.label}
        </Button>
        {view.add.reason && (
          <span className="text-caption text-muted-foreground">{view.add.reason}</span>
        )}
      </div>
    </EditSheet>
  );
}
