import './_document';
import {
  Calendar,
  DatePicker,
  DatePickerContent,
  DatePickerTrigger,
  Field,
} from '@masaha/design-system';

// Ported from the showcase's DatePickerSection
// (apps/web/src/pages/showcase/sections/DatePickerSection.tsx). Fixed dates in September 2026, the
// month the stress tests are set in, so the capture does not depend on today.

const MONTH = new Date(2026, 8, 1);
const FIELD_WIDTH = 'w-full max-w-80';
const TODAY = new Date(2026, 8, 28);
const LABELS = { previousMonthLabel: 'عرض الشهر السابق', nextMonthLabel: 'عرض الشهر التالي' };

/** A subscription start date in a Field, with the panel open and a date chosen. */
export function OpenPanel() {
  return (
    <Field label="بداية الاشتراك" helper="أول يوم يمكن للمشترك الحضور فيه" className={FIELD_WIDTH}>
      <DatePicker defaultOpen>
        <DatePickerTrigger>28/09/2026</DatePickerTrigger>
        {/* Keeps the focus on the trigger, so the still capture shows no focus ring in the panel. */}
        <DatePickerContent
          label="اختيار بداية الاشتراك"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Calendar
            lang="ar"
            mode="single"
            defaultMonth={MONTH}
            today={TODAY}
            selected={new Date(2026, 8, 28)}
            {...LABELS}
          />
        </DatePickerContent>
      </DatePicker>
    </Field>
  );
}

/** Closed triggers: an empty field, a period in a filter row, and an invalid field. */
export function Triggers() {
  return (
    <div className="flex w-full flex-col items-start gap-4">
      <Field
        label="بداية الاشتراك"
        helper="أول يوم يمكن للمشترك الحضور فيه"
        className={FIELD_WIDTH}
      >
        <DatePicker>
          <DatePickerTrigger empty>اختر أول يوم في الاشتراك</DatePickerTrigger>
          <DatePickerContent label="اختيار بداية الاشتراك">
            <Calendar lang="ar" mode="single" defaultMonth={MONTH} today={TODAY} {...LABELS} />
          </DatePickerContent>
        </DatePicker>
      </Field>
      <DatePicker>
        <DatePickerTrigger className="w-auto">آخر 30 يوماً من البلاغات</DatePickerTrigger>
        <DatePickerContent label="اختيار مدة البلاغات">
          <Calendar lang="ar" mode="range" defaultMonth={MONTH} today={TODAY} {...LABELS} />
        </DatePickerContent>
      </DatePicker>
      <Field label="نهاية الاشتراك" error="اختر تاريخ النهاية قبل الحفظ" className={FIELD_WIDTH}>
        <DatePicker>
          <DatePickerTrigger empty>اختر آخر يوم في الاشتراك</DatePickerTrigger>
          <DatePickerContent label="اختيار نهاية الاشتراك">
            <Calendar lang="ar" mode="single" defaultMonth={MONTH} today={TODAY} {...LABELS} />
          </DatePickerContent>
        </DatePicker>
      </Field>
    </div>
  );
}
