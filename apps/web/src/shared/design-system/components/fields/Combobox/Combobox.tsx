import { Command as CommandPrimitive } from 'cmdk';
import {
  createContext,
  useContext,
  useId,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react';
import { CheckIcon, ChevronDownIcon, SearchIcon } from '../../../icons';
import { cn } from '../../../lib/cn';
import { useField, useFieldControl } from '../Field';
import { Popover, PopoverContent, PopoverTrigger } from '../../overlays/Popover';

type ComboboxContextValue = {
  isChosen: (value: string) => boolean;
  choose: (value: string) => void;
};

const ComboboxContext = createContext<ComboboxContextValue | null>(null);

function useCombobox() {
  const context = useContext(ComboboxContext);
  if (context === null) {
    throw new Error('Combobox parts must be used inside a Combobox.');
  }
  return context;
}

type OpenProps = {
  children: ReactNode;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export type ComboboxProps = OpenProps &
  (
    | {
        /** One value; choosing it closes the list. */
        type: 'single';
        value?: string;
        defaultValue?: string;
        onValueChange?: (value: string) => void;
      }
    | {
        /** Any number of values; the list stays open while they are chosen. */
        type: 'multiple';
        value?: string[];
        defaultValue?: string[];
        onValueChange?: (value: string[]) => void;
      }
  );

function toList(value: string | string[] | undefined): string[] {
  if (value === undefined || value === '') {
    return [];
  }
  return typeof value === 'string' ? [value] : value;
}

/**
 * A choice from a list that can be searched, such as the area or amenity filters. Compose it from
 * ComboboxTrigger, ComboboxContent and ComboboxItem. The trigger shows whatever summary it is given
 * («المنطقة: الكل», «الحالة: 2 محدّدة»), so every word stays with the caller.
 */
export function Combobox(props: ComboboxProps) {
  const { children, open: openProp, defaultOpen = false, onOpenChange } = props;
  const [openState, setOpenState] = useState(defaultOpen);
  const [chosenState, setChosenState] = useState(() => toList(props.defaultValue));
  const open = openProp ?? openState;
  const chosen = props.value === undefined ? chosenState : toList(props.value);

  function setOpen(next: boolean) {
    if (openProp === undefined) {
      setOpenState(next);
    }
    onOpenChange?.(next);
  }

  function choose(value: string) {
    if (props.type === 'single') {
      if (props.value === undefined) {
        setChosenState([value]);
      }
      props.onValueChange?.(value);
      setOpen(false);
      return;
    }
    const next = chosen.includes(value)
      ? chosen.filter((item) => item !== value)
      : [...chosen, value];
    if (props.value === undefined) {
      setChosenState(next);
    }
    props.onValueChange?.(next);
  }

  return (
    <ComboboxContext value={{ isChosen: (value) => chosen.includes(value), choose }}>
      <Popover open={open} onOpenChange={setOpen}>
        {children}
      </Popover>
    </ComboboxContext>
  );
}

export type ComboboxTriggerProps = ComponentProps<'button'> & {
  /** Nothing is chosen yet, so the text is a placeholder and is shown muted. */
  empty?: boolean;
};

/**
 * The control that opens the list, drawn like a Select trigger. Inside a Field it takes the Field's
 * label, descriptions and error; outside one, its own text names it, since that text carries the
 * filter's name («المنطقة: الكل»).
 */
export function ComboboxTrigger({
  className,
  children,
  empty = false,
  id,
  'aria-describedby': describedBy,
  'aria-invalid': invalid,
  ...props
}: ComboboxTriggerProps) {
  const field = useField();
  const valueId = useId();
  const fieldProps = useFieldControl({
    id,
    'aria-describedby': describedBy,
    'aria-invalid': invalid,
  });

  return (
    <PopoverTrigger asChild>
      <button
        type="button"
        role="combobox"
        data-slot="combobox-trigger"
        data-empty={empty || undefined}
        className={cn(
          "flex h-(--control-height) w-full items-center justify-between gap-2 rounded-(--radius-control) border border-input bg-background ps-3 pe-2 text-(length:--control-text-size) leading-(--type-body-line-height) whitespace-nowrap text-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:not-aria-invalid:border-ring disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive data-empty:text-muted-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
        // A Field's label names the control through its `for`; without one, the text does.
        aria-labelledby={field === null && props['aria-label'] === undefined ? valueId : undefined}
        {...fieldProps}
        {...props}
      >
        <span id={valueId} data-slot="combobox-value" className="truncate">
          {children}
        </span>
        <ChevronDownIcon aria-hidden className="text-muted-foreground" />
      </button>
    </PopoverTrigger>
  );
}

export type ComboboxContentProps = Omit<ComponentProps<typeof PopoverContent>, 'children'> & {
  children: ReactNode;
  /** Names the search box, such as "Search the areas". */
  searchLabel: string;
  /** Shown in the empty search box. */
  searchPlaceholder?: string;
  /** Names the list of options, such as "Areas". */
  listLabel: string;
  /** Shown when nothing matches the search. */
  emptyText: ReactNode;
};

/**
 * The search box and the list, in a Popover at least as wide as the trigger. Typing filters the
 * options; arrow keys move through them and Enter chooses.
 */
export function ComboboxContent({
  className,
  children,
  searchLabel,
  searchPlaceholder,
  listLabel,
  emptyText,
  align = 'start',
  ...props
}: ComboboxContentProps) {
  return (
    <PopoverContent
      data-slot="combobox-content"
      // The popover is a dialog, and a dialog needs a name: the list's, unless one is given.
      aria-label={listLabel}
      align={align}
      className={cn('w-(--radix-popover-trigger-width) min-w-56 gap-0 p-0', className)}
      {...props}
    >
      <CommandPrimitive label={searchLabel} loop className="flex flex-col">
        {/* The search box has the focus while the list is open, so it shows it by its divider, in
            `ring`, rather than by the outline every other control uses. */}
        <div className="flex items-center gap-2 border-b border-border px-3 transition-colors focus-within:border-ring">
          <SearchIcon aria-hidden className="size-4 shrink-0 text-muted-foreground" />
          <CommandPrimitive.Input
            data-slot="combobox-search"
            placeholder={searchPlaceholder}
            className="h-(--control-height) w-full min-w-0 bg-transparent text-(length:--control-text-size) leading-(--type-body-line-height) text-foreground outline-hidden placeholder:text-muted-foreground"
          />
        </div>
        <CommandPrimitive.List
          label={listLabel}
          className="max-h-72 scroll-py-1 overflow-x-hidden overflow-y-auto p-1"
        >
          <CommandPrimitive.Empty className="px-2 py-6 text-center text-body-sm text-muted-foreground">
            {emptyText}
          </CommandPrimitive.Empty>
          {children}
        </CommandPrimitive.List>
      </CommandPrimitive>
    </PopoverContent>
  );
}

export type ComboboxGroupProps = ComponentProps<typeof CommandPrimitive.Group>;

/** Options under a heading, such as the neighbourhoods of one city. */
export function ComboboxGroup({ className, ...props }: ComboboxGroupProps) {
  return (
    <CommandPrimitive.Group
      data-slot="combobox-group"
      className={cn(
        '**:[[cmdk-group-heading]]:px-2 **:[[cmdk-group-heading]]:py-1.5 **:[[cmdk-group-heading]]:text-caption **:[[cmdk-group-heading]]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

export type ComboboxItemProps = Omit<
  ComponentProps<typeof CommandPrimitive.Item>,
  'value' | 'onSelect'
> & {
  /** What the option stands for. The search matches its text, its keywords and this value. */
  value: string;
};

/**
 * One option, a full control tall. A chosen option shows a check at its end and is marked
 * `aria-checked`: cmdk keeps `aria-selected` for the option the arrow keys are on.
 */
export function ComboboxItem({
  className,
  value,
  keywords,
  children,
  ...props
}: ComboboxItemProps) {
  const combobox = useCombobox();
  const chosen = combobox.isChosen(value);

  return (
    <CommandPrimitive.Item
      data-slot="combobox-item"
      value={value}
      keywords={[...(typeof children === 'string' ? [children] : []), ...(keywords ?? [])]}
      onSelect={() => {
        combobox.choose(value);
      }}
      aria-checked={chosen}
      className={cn(
        "relative flex min-h-(--control-height) w-full cursor-default items-center gap-2 rounded-sm py-1.5 ps-2 pe-8 text-body outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <span className="pointer-events-none absolute end-2 flex size-4 items-center justify-center">
        {chosen && <CheckIcon aria-hidden />}
      </span>
    </CommandPrimitive.Item>
  );
}
