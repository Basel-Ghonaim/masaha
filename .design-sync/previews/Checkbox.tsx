import './_document';
import { Checkbox, Field } from '@masaha/design-system';

// Ported from the showcase's CheckboxSection (apps/web/src/pages/showcase/sections/CheckboxSection.tsx).

export function States() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="المساحات الموثّقة فقط" orientation="horizontal">
        <Checkbox />
      </Field>
      <Field label="متاحة الآن للحجز المباشر" orientation="horizontal">
        <Checkbox defaultChecked />
      </Field>
      <Field
        label="إظهار المساحات القريبة"
        helper="حسب المنطقة التي اخترتها في ملفك"
        orientation="horizontal"
      >
        <Checkbox />
      </Field>
    </div>
  );
}

export function DisabledAndInvalid() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="خيار غير متاح في منطقتك" orientation="horizontal">
        <Checkbox disabled />
      </Field>
      <Field label="مفعّل من إدارة المنصة" orientation="horizontal">
        <Checkbox disabled defaultChecked />
      </Field>
      <Field
        label="أوافق على شروط الاستخدام"
        error="وافق على الشروط للمتابعة"
        orientation="horizontal"
      >
        <Checkbox />
      </Field>
    </div>
  );
}
