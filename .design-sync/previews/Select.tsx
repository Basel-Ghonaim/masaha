import './_document';
import {
  Field,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@masaha/design-system';

// Ported from the showcase's SelectSection (apps/web/src/pages/showcase/sections/SelectSection.tsx).
// The last option of the last group is unavailable, to show a disabled item.

function AreaSelect({
  defaultValue,
  disabled,
  defaultOpen,
  position,
}: {
  defaultValue?: string;
  disabled?: boolean;
  defaultOpen?: boolean;
  position?: 'item-aligned' | 'popper';
}) {
  return (
    <Select defaultValue={defaultValue} disabled={disabled} defaultOpen={defaultOpen}>
      <SelectTrigger>
        <SelectValue placeholder="اختر منطقة المساحة" />
      </SelectTrigger>
      <SelectContent position={position}>
        <SelectGroup>
          <SelectLabel>أحياء مدينة غزة</SelectLabel>
          <SelectItem value="rimal">حي الرمال</SelectItem>
          <SelectItem value="tal-al-hawa">حي تل الهوى</SelectItem>
          <SelectItem value="shujaiya">حي الشجاعية</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>مخيمات المنطقة الوسطى</SelectLabel>
          <SelectItem value="nuseirat">مخيم النصيرات</SelectItem>
          <SelectItem value="deir-al-balah">مدينة دير البلح</SelectItem>
          <SelectItem value="bureij" disabled>
            مخيم البريج
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

// The default list opens over the trigger, aligned to the chosen item; beside the trigger
// (`position="popper"`) the whole list and the field's label stay visible in the card.
export function OpenList() {
  return (
    <Field label="المنطقة الأقرب إليك" className="w-full max-w-80">
      <AreaSelect defaultValue="tal-al-hawa" defaultOpen position="popper" />
    </Field>
  );
}

export function EmptyAndChosen() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="منطقة مساحة العمل">
        <AreaSelect />
      </Field>
      <Field label="المنطقة الأقرب إليك">
        <AreaSelect defaultValue="tal-al-hawa" />
      </Field>
    </div>
  );
}

export function DisabledAndInvalid() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="المنطقة التي حددتها الإدارة">
        <AreaSelect defaultValue="nuseirat" disabled />
      </Field>
      <Field label="المنطقة في طلب الإضافة" error="اختر المنطقة قبل الإرسال">
        <AreaSelect />
      </Field>
    </div>
  );
}
