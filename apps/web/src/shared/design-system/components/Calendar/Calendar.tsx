import { useEffect, useRef } from 'react';
import {
  DateLib,
  DayPicker,
  type DayButtonProps,
  type DayPickerProps,
  type PreviousMonthButtonProps,
} from 'react-day-picker';

/** A chosen range, as a range-mode Calendar gives it: `to` is missing until the second click. */
export type { DateRange } from 'react-day-picker';
import { ar, enUS } from 'react-day-picker/locale';
import { ChevronEndIcon, ChevronStartIcon } from '../../icons';
import { cn } from '../../lib/cn';
import { Button } from '../Button';
import { useDirection } from '../DirectionProvider';

// Arabic starts the week on Saturday; English keeps its own locale's Sunday.
const LANGUAGES = {
  ar: { locale: ar, weekStartsOn: 6 },
  en: { locale: enUS, weekStartsOn: 0 },
} as const;

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

export type CalendarProps = DistributiveOmit<
  DayPickerProps,
  'locale' | 'dir' | 'numerals' | 'weekStartsOn' | 'labels' | 'captionLayout' | 'components'
> & {
  /** The interface language, which sets the month and day names and the first day of the week. */
  lang: 'ar' | 'en';
  /** Names the button that shows the previous month, such as "Previous month". */
  previousMonthLabel: string;
  /** Names the button that shows the next month, such as "Next month". */
  nextMonthLabel: string;
};

// A day is named by its full date only. day-picker would add "Today" and "selected" in words;
// the grid cell's aria-selected and the button's aria-current say both without any.
function labelDate(date: Date, options?: DateLib['options'], dateLib?: DateLib) {
  return (dateLib ?? new DateLib(options)).format(date, 'PPPP');
}

// day-picker's own chevron arrives as children; the JSX children below replace it.
function MonthButton({
  side,
  className,
  ...props
}: PreviousMonthButtonProps & { side: 'previous' | 'next' }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn('size-(--cell-size) aria-disabled:opacity-50', className)}
      {...props}
    >
      {side === 'previous' ? <ChevronStartIcon aria-hidden /> : <ChevronEndIcon aria-hidden />}
    </Button>
  );
}

// A filled day (chosen, or an end of a range) takes the primary pair, and its hover mixes toward
// the foreground as the primary Button's does; a day inside a range takes the accent pair.
const FILLED =
  'bg-primary text-primary-foreground hover:bg-[color-mix(in_oklch,var(--primary),var(--foreground)_12%)] hover:text-primary-foreground';

function CalendarDayButton({ className, day, modifiers, ...props }: DayButtonProps) {
  const ref = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (modifiers.focused) {
      ref.current?.focus();
    }
  }, [modifiers.focused]);

  const single =
    modifiers.selected && !modifiers.range_start && !modifiers.range_end && !modifiers.range_middle;

  return (
    <Button
      ref={ref}
      variant="ghost"
      size="icon"
      data-day={day.isoDate}
      aria-current={modifiers.today ? 'date' : undefined}
      data-selected-single={single || undefined}
      data-range-start={modifiers.range_start || undefined}
      data-range-end={modifiers.range_end || undefined}
      data-range-middle={modifiers.range_middle || undefined}
      className={cn(
        'relative isolate z-10 flex aspect-square size-auto w-full min-w-(--cell-size) rounded-(--cell-radius) text-body-sm leading-none',
        'data-range-middle:rounded-none data-range-middle:bg-accent data-range-middle:text-accent-foreground',
        // The ghost Button's colour would hide the cell's `outside` style, so the day sets it.
        modifiers.outside && 'text-muted-foreground',
        (single || modifiers.range_start || modifiers.range_end) && FILLED,
        className,
      )}
      {...props}
    />
  );
}

/**
 * A month of days to choose from: one date (`mode="single"`) or a range (`mode="range"`). The
 * calendar is Gregorian with Western digits in either language. Arrow keys move by day and follow
 * the reading direction, and the month buttons point along it: previous at the start, next at the
 * end.
 */
export function Calendar({
  lang,
  previousMonthLabel,
  nextMonthLabel,
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  const dir = useDirection();
  const { locale, weekStartsOn } = LANGUAGES[lang];

  return (
    <DayPicker
      locale={locale}
      weekStartsOn={weekStartsOn}
      numerals="latn"
      dir={dir}
      showOutsideDays={showOutsideDays}
      labels={{
        labelNav: () => '',
        labelPrevious: () => previousMonthLabel,
        labelNext: () => nextMonthLabel,
        labelDayButton: (date, _modifiers, options, dateLib) => labelDate(date, options, dateLib),
        labelGridcell: (date, _modifiers, options, dateLib) => labelDate(date, options, dateLib),
      }}
      className={cn(
        'w-fit p-3 [--cell-radius:var(--radius-md)] [--cell-size:--spacing(9)] pointer-coarse:[--cell-size:var(--control-height)]',
        className,
      )}
      classNames={{
        months: 'relative flex flex-col gap-4 md:flex-row',
        month: 'flex w-full flex-col gap-4',
        nav: 'absolute inset-x-0 top-0 flex w-full items-center justify-between gap-1',
        month_caption: 'flex h-(--cell-size) w-full items-center justify-center px-(--cell-size)',
        caption_label: 'text-label select-none',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'flex h-(--cell-size) flex-1 items-center justify-center text-caption text-muted-foreground select-none',
        week: 'mt-1 flex w-full',
        day: 'group/day relative aspect-square h-full w-full p-0 text-center select-none',
        range_start: 'rounded-s-(--cell-radius) bg-accent',
        range_middle: 'rounded-none',
        range_end: 'rounded-e-(--cell-radius) bg-accent',
        today: 'rounded-(--cell-radius) bg-muted text-foreground data-[selected=true]:rounded-none',
        outside: 'text-muted-foreground',
        disabled: 'text-muted-foreground opacity-50',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Root: ({ className: rootClassName, rootRef, ...rootProps }) => (
          <div data-slot="calendar" ref={rootRef} className={rootClassName} {...rootProps} />
        ),
        PreviousMonthButton: (buttonProps) => <MonthButton side="previous" {...buttonProps} />,
        NextMonthButton: (buttonProps) => <MonthButton side="next" {...buttonProps} />,
        DayButton: CalendarDayButton,
      }}
      {...props}
    />
  );
}
