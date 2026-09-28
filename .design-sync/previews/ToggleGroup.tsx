import './_document';
import { Field, ToggleGroup, ToggleGroupItem } from '@masaha/design-system';

// Ported from the showcase's ToggleGroupSection (apps/web/src/pages/showcase/sections/ToggleGroupSection.tsx).

const STATUSES = [
  'بلاغات البيانات الجديدة',
  'بلاغات البيانات قيد المراجعة',
  'بلاغات البيانات المصحّحة',
  'بلاغات البيانات المرفوضة',
];

export function MultipleChips() {
  return (
    <Field label="حالة بلاغ البيانات" helper="اختر أي عدد من الحالات" className="w-full max-w-120">
      <ToggleGroup type="multiple" defaultValue={['0', '1']}>
        {STATUSES.map((status, index) => (
          <ToggleGroupItem key={status} value={String(index)}>
            {status}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}

export function DisabledChip() {
  return (
    <Field label="حالة يحدّدها مدير المنصة" className="w-full max-w-120">
      <ToggleGroup type="multiple" defaultValue={['0']}>
        {STATUSES.map((status, index) => (
          <ToggleGroupItem key={status} value={String(index)} disabled={index === 0}>
            {status}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Field>
  );
}
