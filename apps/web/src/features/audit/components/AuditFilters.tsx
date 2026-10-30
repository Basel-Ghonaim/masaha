import {
  Badge,
  Button,
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  useMediaQuery,
} from '@shared/design-system';
import { useState } from 'react';
import type { AuditLogView } from '../hooks/useAuditLog';

type Filters = AuditLogView['filters'];
type Choice = Filters['type'];

/** One filter, a choice applied at once. */
function ChoiceField({ choice }: { choice: Choice }) {
  return (
    <Field label={choice.label}>
      <Select value={choice.value} onValueChange={choice.choose}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {choice.options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

/** The period, the actor (when offered) and the action type. */
function Fields({ filters }: { filters: Filters }) {
  return (
    <>
      <ChoiceField choice={filters.period} />
      {filters.actor !== null && <ChoiceField choice={filters.actor} />}
      <ChoiceField choice={filters.type} />
    </>
  );
}

/**
 * The phone's filters (P5): a button that shows how many apply, opening a bottom sheet with the
 * filters, which apply at once, «عرض {n} نتيجة», which closes it on the log they leave, and «مسح
 * الفلاتر», unavailable while none applies.
 */
function FiltersSheet({ filters }: { filters: Filters }) {
  const { sheet } = filters;
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="w-full" aria-label={sheet.label}>
          {sheet.title}
          {sheet.count > 0 && (
            <Badge variant="primary" aria-hidden>
              {sheet.count}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" closeLabel={sheet.closeLabel} aria-describedby={undefined}>
        <SheetHeader>
          <SheetTitle>{sheet.title}</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4">
          <Fields filters={filters} />
        </SheetBody>
        <SheetFooter>
          <Button
            size="lg"
            className="w-full"
            onClick={() => {
              setOpen(false);
            }}
          >
            {sheet.show}
          </Button>
          <Button variant="ghost" disabled={sheet.clear.disabled} onClick={sheet.clear.run}>
            {sheet.clear.label}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** A log's filters: in a row from 768 px, in a bottom sheet below it (P5). */
export function AuditFilters({ filters }: { filters: Filters }) {
  const wide = useMediaQuery('(min-width: 768px)');
  return wide ? (
    <div className="grid items-start gap-3 md:grid-cols-3">
      <Fields filters={filters} />
    </div>
  ) : (
    <FiltersSheet filters={filters} />
  );
}
