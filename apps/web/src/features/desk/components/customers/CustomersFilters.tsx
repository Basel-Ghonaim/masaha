import { CUSTOMER_NAME_MAX_LENGTH } from '@masaha/shared/customers';
import {
  Badge,
  Button,
  Field,
  Input,
  SearchIcon,
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
import type { CustomersListView } from '../../hooks/customers/useCustomersList';

type Toolbar = CustomersListView['toolbar'];
type Choice = Toolbar['kind'];

/** One of the list's choices, as a select with its label; it applies at once. */
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

/**
 * The phone's filters (P5): a button that shows how many apply, opening a bottom sheet with the kind
 * and the payment, which apply at once, «مسح الفلاتر», and «عرض {n} زبون», which closes it on the
 * list they leave.
 */
function FiltersSheet({ toolbar }: { toolbar: Toolbar }) {
  const { sheet } = toolbar;
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
          <ChoiceField choice={toolbar.kind} />
          <ChoiceField choice={toolbar.payment} />
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={sheet.clear}>
            {sheet.clearLabel}
          </Button>
          <Button
            onClick={() => {
              setOpen(false);
            }}
          >
            {sheet.show}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The search and the filters above the customers: from 768 px the kind and the payment stand beside
 * the search; below it they move into a sheet (P5). Under them, on every width, the status chips —
 * one chosen at a time — and the count the filters keep, said politely as it changes.
 */
export function CustomersFilters({
  toolbar,
  count,
}: {
  toolbar: Toolbar;
  /** The count the filters keep, once the list has loaded. */
  count: string | undefined;
}) {
  const wide = useMediaQuery('(min-width: 768px)');
  const { search, status } = toolbar;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid items-end gap-3 md:grid-cols-3">
        <Field label={search.label}>
          <Input
            type="search"
            placeholder={search.placeholder}
            startIcon={<SearchIcon />}
            maxLength={CUSTOMER_NAME_MAX_LENGTH}
            value={search.text}
            onChange={(event) => {
              search.change(event.target.value);
            }}
          />
        </Field>
        {wide ? (
          <>
            <ChoiceField choice={toolbar.kind} />
            <ChoiceField choice={toolbar.payment} />
          </>
        ) : (
          <FiltersSheet toolbar={toolbar} />
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="single"
          value={status.value}
          onValueChange={status.choose}
          aria-label={status.label}
        >
          {status.options.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {count !== undefined && (
          <p className="text-body-sm text-muted-foreground" aria-live="polite">
            {count}
          </p>
        )}
      </div>
    </div>
  );
}
