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
  ToggleGroup,
  ToggleGroupItem,
  useMediaQuery,
} from '@shared/design-system';
import { useState } from 'react';
import type { AdminReportsView } from '../../hooks/admin/useAdminReports';
import type { AdminSpaceFilterSlot } from '../../types/AdminSpaceFilterSlot';

type Filters = AdminReportsView['filters'];

/** «يعالجه»'s chips: all, the admin's, the owners'. */
function HandledBy({ handledBy }: { handledBy: Filters['handledBy'] }) {
  return (
    <ToggleGroup
      type="single"
      value={handledBy.value}
      onValueChange={handledBy.choose}
      aria-label={handledBy.label}
    >
      {handledBy.options.map((option) => (
        <ToggleGroupItem key={option.value} value={option.value}>
          {option.label}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}

/** The space (the page's search) and the field, each applied at once. */
function Fields({ filters, spaceFilter }: { filters: Filters; spaceFilter: AdminSpaceFilterSlot }) {
  const { space, field } = filters;
  return (
    <>
      {spaceFilter({
        label: space.label,
        value: space.value,
        chosenName: space.chosenName,
        chosenFallback: space.chosenFallback,
        onChange: space.choose,
      })}
      <Field label={field.label}>
        <Select value={field.value} onValueChange={field.choose}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {field.options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
    </>
  );
}

/**
 * The phone's filters (P5): a button that shows how many apply, opening a bottom sheet with the space,
 * the field and «يعالجه», which apply at once, «عرض {n} بلاغ», which closes it on the list they leave, and
 * «مسح الفلاتر».
 */
function FiltersSheet({
  filters,
  spaceFilter,
}: {
  filters: Filters;
  spaceFilter: AdminSpaceFilterSlot;
}) {
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
          <Fields filters={filters} spaceFilter={spaceFilter} />
          <HandledBy handledBy={filters.handledBy} />
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
          <Button variant="ghost" onClick={sheet.clear.run}>
            {sheet.clear.label}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The admin's filters: the space and the field in a row from 768 px, «يعالجه»'s chips under them; in
 * a bottom sheet below it.
 */
export function AdminReportFilters({
  filters,
  spaceFilter,
}: {
  filters: Filters;
  spaceFilter: AdminSpaceFilterSlot;
}) {
  const wide = useMediaQuery('(min-width: 768px)');
  return wide ? (
    <div className="flex flex-col gap-3">
      <div className="grid items-start gap-3 md:grid-cols-2">
        <Fields filters={filters} spaceFilter={spaceFilter} />
      </div>
      <HandledBy handledBy={filters.handledBy} />
    </div>
  ) : (
    <FiltersSheet filters={filters} spaceFilter={spaceFilter} />
  );
}
