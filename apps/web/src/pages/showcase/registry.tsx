import type { ReactNode } from 'react';
import fixtures from './fixtures.json';
import { ButtonSection } from './sections/actions/ButtonSection';
import { DropdownMenuSection } from './sections/actions/DropdownMenuSection';
import { TogglesSection } from './sections/actions/TogglesSection';
import { DataTableSection } from './sections/data/DataTableSection';
import { TableSection } from './sections/data/TableSection';
import { AvatarSection } from './sections/display/AvatarSection';
import { BadgeSection } from './sections/display/BadgeSection';
import { CardSection } from './sections/display/CardSection';
import { SeparatorSection } from './sections/display/SeparatorSection';
import { StatCardSection } from './sections/display/StatCardSection';
import { AlertSection } from './sections/feedback/AlertSection';
import { EmptyStateSection } from './sections/feedback/EmptyStateSection';
import { SkeletonSection } from './sections/feedback/SkeletonSection';
import { SpinnerSection } from './sections/feedback/SpinnerSection';
import { ToastSection } from './sections/feedback/ToastSection';
import { CalendarSection } from './sections/fields/CalendarSection';
import { CheckboxSection } from './sections/fields/CheckboxSection';
import { ComboboxSection } from './sections/fields/ComboboxSection';
import { DatePickerSection } from './sections/fields/DatePickerSection';
import { FieldSection } from './sections/fields/FieldSection';
import { InputSection } from './sections/fields/InputSection';
import { RadioGroupSection } from './sections/fields/RadioGroupSection';
import { SelectSection } from './sections/fields/SelectSection';
import { SwitchSection } from './sections/fields/SwitchSection';
import { TextareaSection } from './sections/fields/TextareaSection';
import { ToggleGroupSection } from './sections/fields/ToggleGroupSection';
import { IconsSection } from './sections/icons/IconsSection';
import { BreadcrumbSection } from './sections/navigation/BreadcrumbSection';
import { PaginationSection } from './sections/navigation/PaginationSection';
import { SidebarSection } from './sections/navigation/SidebarSection';
import { TabsSection } from './sections/navigation/TabsSection';
import { AlertDialogSection } from './sections/overlays/AlertDialogSection';
import { DialogSection } from './sections/overlays/DialogSection';
import { PopoverSection } from './sections/overlays/PopoverSection';
import { SheetSection } from './sections/overlays/SheetSection';
import { TooltipSection } from './sections/overlays/TooltipSection';
import type { Language } from './settings';

// The showcase's one list: the navigation, the routes and the three views (every section, one
// category, one entry) all read it. Each entry is one section; the layer's own icons come first,
// then the component categories of foundation §3, which sections/ mirrors.

export const SHOWCASE_ROOT = '/__showcase';

export const CATEGORIES = [
  'icons',
  'actions',
  'fields',
  'display',
  'data',
  'feedback',
  'overlays',
  'navigation',
] as const;

export type Category = (typeof CATEGORIES)[number];

export type Samples = (typeof fixtures.samples)[Language];

type SampleKey = keyof Samples;

export type PreviewContext = { samples: Samples; language: Language };

export type ShowcaseEntry = {
  category: Category;
  /** The component's export name, shown in the navigation. */
  name: string;
  /** The entry's address inside its category: the name in kebab case. */
  slug: string;
  /** Its section's key in the fixtures. */
  sample: SampleKey;
  render: (context: PreviewContext) => ReactNode;
};

export function slugOf(name: string) {
  return name.replace(/(?<=[a-z])([A-Z])/g, '-$1').toLowerCase();
}

/** One entry, whose section gets its own samples; a section that needs more reads the context. */
function entry<K extends SampleKey>(
  category: Category,
  name: string,
  sample: K,
  render: (samples: Samples[K], context: PreviewContext) => ReactNode,
): ShowcaseEntry {
  return {
    category,
    name,
    slug: slugOf(name),
    sample,
    render: (context) => render(context.samples[sample], context),
  };
}

/** Every entry, in the order the components were built: the order of the all view. */
export const ENTRIES: readonly ShowcaseEntry[] = [
  entry('icons', 'Icons', 'icons', (samples) => <IconsSection samples={samples} />),
  entry('actions', 'Button', 'button', (samples) => <ButtonSection samples={samples} />),
  // One section for the two toggles: ThemeToggle and LanguageToggle.
  entry('actions', 'Toggles', 'toggles', (samples, { language }) => (
    <TogglesSection samples={samples} otherLanguage={language === 'ar' ? 'en' : 'ar'} />
  )),
  entry('fields', 'Field', 'field', (samples) => <FieldSection samples={samples} />),
  entry('fields', 'Input', 'input', (samples) => <InputSection samples={samples} />),
  entry('fields', 'Textarea', 'textarea', (samples) => <TextareaSection samples={samples} />),
  entry('fields', 'Select', 'select', (samples) => <SelectSection samples={samples} />),
  entry('fields', 'Checkbox', 'checkbox', (samples) => <CheckboxSection samples={samples} />),
  entry('fields', 'RadioGroup', 'radioGroup', (samples) => <RadioGroupSection samples={samples} />),
  entry('fields', 'Switch', 'switch', (samples) => <SwitchSection samples={samples} />),
  entry('display', 'Badge', 'badge', (samples) => <BadgeSection samples={samples} />),
  entry('display', 'Card', 'card', (samples) => <CardSection samples={samples} />),
  entry('display', 'Separator', 'separator', (samples) => <SeparatorSection samples={samples} />),
  entry('display', 'Avatar', 'avatar', (samples) => <AvatarSection samples={samples} />),
  entry('feedback', 'Skeleton', 'skeleton', (samples) => <SkeletonSection samples={samples} />),
  entry('feedback', 'Spinner', 'spinner', (samples) => <SpinnerSection samples={samples} />),
  entry('feedback', 'Alert', 'alert', (samples) => <AlertSection samples={samples} />),
  entry('overlays', 'Tooltip', 'tooltip', (samples) => <TooltipSection samples={samples} />),
  entry('feedback', 'Toast', 'toast', (samples) => <ToastSection samples={samples} />),
  entry('feedback', 'EmptyState', 'emptyState', (samples) => (
    <EmptyStateSection samples={samples} />
  )),
  entry('display', 'StatCard', 'statCard', (samples) => <StatCardSection samples={samples} />),
  entry('overlays', 'Dialog', 'dialog', (samples) => <DialogSection samples={samples} />),
  entry('overlays', 'AlertDialog', 'alertDialog', (samples) => (
    <AlertDialogSection samples={samples} />
  )),
  entry('overlays', 'Sheet', 'sheet', (samples) => <SheetSection samples={samples} />),
  entry('actions', 'DropdownMenu', 'dropdownMenu', (samples) => (
    <DropdownMenuSection samples={samples} />
  )),
  entry('navigation', 'Tabs', 'tabs', (samples) => <TabsSection samples={samples} />),
  entry('navigation', 'Breadcrumb', 'breadcrumb', (samples) => (
    <BreadcrumbSection samples={samples} />
  )),
  entry('navigation', 'Pagination', 'pagination', (samples) => (
    <PaginationSection samples={samples} />
  )),
  entry('navigation', 'Sidebar', 'sidebar', (samples) => <SidebarSection samples={samples} />),
  entry('fields', 'ToggleGroup', 'toggleGroup', (samples) => (
    <ToggleGroupSection samples={samples} />
  )),
  entry('overlays', 'Popover', 'popover', (samples) => <PopoverSection samples={samples} />),
  entry('fields', 'Combobox', 'combobox', (samples) => <ComboboxSection samples={samples} />),
  entry('fields', 'Calendar', 'calendar', (samples, { language }) => (
    <CalendarSection samples={samples} lang={language} />
  )),
  entry('fields', 'DatePicker', 'datePicker', (samples, { language }) => (
    <DatePickerSection samples={samples} lang={language} />
  )),
  entry('data', 'Table', 'table', (samples, context) => (
    <TableSection samples={samples} members={context.samples.members} />
  )),
  entry('data', 'DataTable', 'dataTable', (samples, { samples: all, language }) => (
    <DataTableSection
      samples={samples}
      members={all.members}
      pagination={all.pagination}
      emptyState={all.emptyState}
      lists={{ areas: all.combobox.areas, statuses: all.combobox.filters.statuses }}
      calendar={all.calendar}
      lang={language}
    />
  )),
];

export type ShowcaseView =
  | { kind: 'all'; entries: readonly ShowcaseEntry[] }
  | { kind: 'category'; category: Category; entries: readonly ShowcaseEntry[] }
  | { kind: 'entry'; entry: ShowcaseEntry; entries: readonly ShowcaseEntry[] };

function isCategory(value: string): value is Category {
  return CATEGORIES.some((category) => category === value);
}

export function entriesOf(category: Category) {
  return ENTRIES.filter((item) => item.category === category);
}

/** The view an address names, from its optional segments; null when it names nothing. */
export function resolveView(category?: string, slug?: string): ShowcaseView | null {
  if (category === undefined) {
    return slug === undefined ? { kind: 'all', entries: ENTRIES } : null;
  }
  if (!isCategory(category)) return null;
  if (slug === undefined) return { kind: 'category', category, entries: entriesOf(category) };
  const found = ENTRIES.find((item) => item.category === category && item.slug === slug);
  return found === undefined ? null : { kind: 'entry', entry: found, entries: [found] };
}

export function categoryPath(category: Category) {
  return `${SHOWCASE_ROOT}/${category}`;
}

export function entryPath(item: ShowcaseEntry) {
  return `${SHOWCASE_ROOT}/${item.category}/${item.slug}`;
}

/** The view's path below the showcase's root: empty for the all view. */
export function viewSegments(view: ShowcaseView | null) {
  if (view === null || view.kind === 'all') return '';
  if (view.kind === 'category') return `/${view.category}`;
  return `/${view.entry.category}/${view.entry.slug}`;
}
