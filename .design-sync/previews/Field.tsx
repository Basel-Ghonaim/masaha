import './_document';
import { Field, Input } from '@masaha/design-system';

// Ported from the showcase's FieldSection (apps/web/src/pages/showcase/sections/FieldSection.tsx).

export function HelperAndError() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="السعة الكلية للمساحة" helper="عدد المقاعد عند امتلاء المساحة بالكامل">
        <Input />
      </Field>
      <Field label="كلمة المرور الحالية" error="كلمة المرور غير صحيحة، حاول مرة أخرى">
        <Input />
      </Field>
      <Field
        label="مدة الإعلان بالأيام"
        helper="يختفي الإعلان تلقائيًا بعد انتهاء المدة"
        error="اختر مدة بين يوم واحد وثلاثين يومًا"
      >
        <Input />
      </Field>
    </div>
  );
}

export function LabelLinkAndDisabled() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field
        label="كلمة المرور الحالية للحساب"
        labelEnd={
          <a href="#field" className="text-caption text-primary underline-offset-4 hover:underline">
            استعادة كلمة مرور منسية
          </a>
        }
        helper="ثمانية أحرف على الأقل"
      >
        <Input type="password" dir="ltr" />
      </Field>
      <Field label="البريد الإلكتروني، مقفل للتعديل" helper="يتغيّر من إعدادات الحساب فقط">
        <Input type="email" dir="ltr" defaultValue="showcase.locked@example.com" disabled />
      </Field>
    </div>
  );
}
