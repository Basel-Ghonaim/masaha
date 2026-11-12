import {
  Badge,
  Button,
  cn,
  Field,
  GripVerticalIcon,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  XIcon,
} from '@shared/design-system';
import { Sortable, type SortableWords } from '@shared/design-system/sortable';
import { useContactsSheet } from '../../hooks/contacts/useContactsSheet';
import type { SectionHost } from '../../types/SectionHost';
import { EditSheet } from '../editor/EditSheet';
import { CONTACT_ICONS } from './contactIcons';

/** A single row has nothing to be ordered against: the list is held, and says nothing. */
const NO_WORDS: SortableWords = {
  roleDescription: '',
  instructions: '',
  lifted: () => '',
  moved: () => '',
  dropped: () => '',
  cancelled: () => '',
};

/**
 * «التواصل»'s Sheet (C2): a block per contact — its handle, which orders it by a drag or from the
 * keyboard, its type from a list with icons, «وسيلة أخرى»'s own name, its value with the form it is
 * saved in and a phone's carrier, its removal — then «إضافة وسيلة تواصل», its limit said beside it
 * once reached.
 */
export function ContactsSheet({ host }: { host: SectionHost }) {
  const view = useContactsSheet(host);
  const byKey = new Map(view.list.map((row) => [row.key, row]));
  return (
    <EditSheet frame={view.frame}>
      {view.order && <p className="text-body-sm text-muted-foreground">{view.order.hint}</p>}
      <Sortable
        items={view.list.map(({ key }) => key)}
        layout="list"
        label={view.order?.label ?? view.frame.title}
        words={view.order?.words ?? NO_WORDS}
        nameOf={(key) => byKey.get(key)?.name ?? ''}
        onMove={(next, moved) => {
          view.order?.move(next, moved);
        }}
        disabled={view.order === null}
        className="gap-3"
        renderItem={(key, { handleProps, lifted, dragging }) => {
          const row = byKey.get(key);
          if (row === undefined) return null;
          return (
            <div
              className={cn(
                'grid gap-3 rounded-lg border border-border bg-card p-3 md:grid-cols-12 md:items-start',
                (lifted || dragging) && 'border-primary shadow-floating',
              )}
            >
              {view.order && (
                <span
                  {...handleProps}
                  aria-label={row.handle}
                  className="flex size-9 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground select-none hover:bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring md:col-span-1 md:mt-6"
                >
                  <GripVerticalIcon aria-hidden />
                </span>
              )}
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
            </div>
          );
        }}
      />
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
