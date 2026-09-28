import './_document';
import { Field, Switch } from '@masaha/design-system';

// Ported from the showcase's SwitchSection (apps/web/src/pages/showcase/sections/SwitchSection.tsx).

export function OffAndOn() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="تنبيه عند امتلاء المساحة" orientation="horizontal">
        <Switch />
      </Field>
      <Field
        label="تسجيل خروج الأعضاء تلقائيًا"
        helper="عند وقت الإغلاق كل يوم"
        orientation="horizontal"
      >
        <Switch defaultChecked />
      </Field>
    </div>
  );
}

export function Disabled() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="مزامنة التقويم غير متاحة" orientation="horizontal">
        <Switch disabled />
      </Field>
      <Field label="إشعارات الأمان مفعّلة دائمًا" orientation="horizontal">
        <Switch disabled defaultChecked />
      </Field>
    </div>
  );
}
