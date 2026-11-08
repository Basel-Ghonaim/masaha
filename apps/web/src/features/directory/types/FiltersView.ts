/** A field's words, its text and its line when refused. */
type BoundView = {
  label: string;
  text: string;
  change: (text: string) => void;
  error: string | null;
};

/** The price filter: a period and a budget in whole shekels, with its help line. */
export type PriceFilterView = {
  label: string;
  period: {
    label: string;
    value: string;
    options: { value: string; label: string }[];
    choose: (value: string) => void;
  };
  min: BoundView;
  max: BoundView;
  /** The amount's unit, at the start of each bound. */
  currency: string;
  help: string;
};

/** A labelled group of checkboxes, each one narrowing the list. */
export type CheckGroupView = {
  label: string;
  items: { key: string; label: string; checked: boolean; toggle: (checked: boolean) => void }[];
};

/** An action of the filters: its words, whether it may run, and what it does. */
type ActionView = { label: string; disabled: boolean; run: () => void };

/**
 * The directory's filters, ready to render: the place, the price, «الدوام» and «أخرى», drawn once,
 * as a sidebar from 1024 px (`wide`) or a bottom sheet below it.
 */
export type FiltersView = {
  wide: boolean;
  place: { value: number[]; change: (ids: number[]) => void };
  price: PriceFilterView;
  /** «الدوام»: open now, in the evening, on Friday. */
  hours: CheckGroupView;
  /** «أخرى»: verified only, student prices. */
  others: CheckGroupView;
  sheet: {
    open: boolean;
    setOpen: (open: boolean) => void;
    /** The button's text and the sheet's title. */
    title: string;
    description: string;
    /** How many filters apply: the badge's number, and its words for assistive technology. */
    count: number;
    applied: string;
    /** The primary button: the spaces the filters leave; it closes the sheet. */
    show: string;
    close: string;
    clear: ActionView;
  };
  sidebar: { title: string; clear: ActionView };
};
