/** The filters' sidebar, from 1024 px: a landmark, and where «اختر منطقتك» leads. */
export const FILTERS_SIDEBAR_ID = 'directory-filters';

/** The filters' form, in the sidebar or the sheet; its first control is the place filter. */
export const FILTERS_FORM_ID = 'directory-filters-form';

/** Brings the sidebar into view and focuses its first control, the place filter. */
export function focusFilters(): void {
  document.getElementById(FILTERS_SIDEBAR_ID)?.scrollIntoView({ block: 'start' });
  document
    .getElementById(FILTERS_FORM_ID)
    ?.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled)')
    ?.focus();
}
