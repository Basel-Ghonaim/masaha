import {
  Badge,
  Button,
  Calendar,
  DatePicker,
  DatePickerContent,
  DatePickerTrigger,
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
  type DateRange,
} from '@shared/design-system';
import { useLanguage } from '@shared/localisation';
import { useState } from 'react';
import type { LedgerView } from '../../hooks/ledger/useLedger';

type Toolbar = LedgerView['toolbar'];
type Choice = Toolbar['staff'];

/** A Gaza date (`YYYY-MM-DD`) as the calendar's day: that date at the browser's midnight. */
const dayOf = (date: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
};
/** The calendar's day as its date (`YYYY-MM-DD`), read on the browser's calendar it was drawn on. */
const dateOf = (day: Date) =>
  `${String(day.getFullYear())}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;

/** One of the ledger's choices, as a select with its label; it applies at once. */
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
 * The period, a range of days chosen on a calendar: the trigger says the period («اليوم», a day, a
 * range). Each opening's first click starts a range, even over the one applied (`resetOnSelect`:
 * react-day-picker would otherwise end a range on its first click, from == to); the second click ends
 * it — the earlier day first, the same day twice one day — and only then is it applied and the picker
 * closed. «اليوم» takes it off. A range over 92 days is not applied, and its line says so.
 */
function RangeField({ range }: { range: Toolbar['range'] }) {
  const lang = useLanguage() === 'en' ? 'en' : 'ar';
  const [open, setOpen] = useState(false);
  // The range being chosen: its first end until the second is picked.
  const [picking, setPicking] = useState<DateRange | undefined>(undefined);
  const chosen =
    picking ??
    (range.value === null
      ? undefined
      : { from: dayOf(range.value.from), to: dayOf(range.value.to) });

  return (
    <Field label={range.label} error={range.error ?? undefined}>
      <DatePicker
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          setPicking(undefined);
        }}
      >
        <DatePickerTrigger>{range.text}</DatePickerTrigger>
        <DatePickerContent label={range.panel}>
          <Calendar
            lang={lang}
            mode="range"
            resetOnSelect
            defaultMonth={chosen?.from}
            selected={chosen}
            onSelect={(next) => {
              if (next?.from === undefined || next.to === undefined) {
                setPicking(next);
                return;
              }
              setPicking(undefined);
              range.choose(dateOf(next.from), dateOf(next.to));
              setOpen(false);
            }}
            previousMonthLabel={range.calendar.previous}
            nextMonthLabel={range.calendar.next}
          />
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => {
                range.today.run();
                setOpen(false);
              }}
            >
              {range.today.label}
            </Button>
          </div>
        </DatePickerContent>
      </DatePicker>
    </Field>
  );
}

/** The four filters, in the row from 768 px or in the phone's sheet. */
function Fields({ toolbar }: { toolbar: Toolbar }) {
  return (
    <>
      <RangeField range={toolbar.range} />
      <ChoiceField choice={toolbar.staff} />
      <ChoiceField choice={toolbar.method} />
      <ChoiceField choice={toolbar.kind} />
    </>
  );
}

/**
 * The phone's filters (P5): a button that shows how many apply — the range counted when set (DI-2) —
 * opening a bottom sheet with the four, which apply at once, «عرض {n} دفعة», which closes it on the
 * list they leave, and «مسح الفلاتر».
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
          <Fields toolbar={toolbar} />
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
 * The ledger's filters: from 768 px the period, the staff member, the method and the kind in a row;
 * below it they move into a sheet (P5). Under them, on every width, «إظهار الملغاة», «مسح الفلاتر»
 * while any applies (DI-3), and the count the filters keep, said politely as it changes.
 */
export function LedgerFilters({
  toolbar,
  count,
}: {
  toolbar: Toolbar;
  /** The count the filters keep, once the list has loaded. */
  count: string | undefined;
}) {
  const wide = useMediaQuery('(min-width: 768px)');
  const { voided, clear } = toolbar;

  return (
    <div className="flex flex-col gap-3">
      {wide ? (
        <div className="grid items-start gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Fields toolbar={toolbar} />
        </div>
      ) : (
        <FiltersSheet toolbar={toolbar} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          type="multiple"
          value={voided.on ? ['voided'] : []}
          onValueChange={(values) => {
            voided.toggle(values.includes('voided'));
          }}
          aria-label={voided.quick}
        >
          <ToggleGroupItem value="voided">{voided.label}</ToggleGroupItem>
        </ToggleGroup>
        {clear !== null && (
          <Button variant="link" onClick={clear.run}>
            {clear.label}
          </Button>
        )}
        {count !== undefined && (
          <p className="text-body-sm text-muted-foreground" aria-live="polite">
            {count}
          </p>
        )}
      </div>
    </div>
  );
}
