// The design-system layer's third entry, @shared/design-system/calendar: the calendar and the date
// picker, built on react-day-picker. Only what draws them imports this entry, so the library stays
// out of the site's first download (docs/frontend/design-system/foundation.md §3, finding 169).
export { Calendar, type CalendarProps, type DateRange } from './components/fields/Calendar';
export {
  DatePicker,
  DatePickerContent,
  DatePickerTrigger,
  type DatePickerContentProps,
  type DatePickerTriggerProps,
} from './components/fields/DatePicker';
