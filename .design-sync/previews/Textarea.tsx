import './_document';
import { Field, Textarea } from '@masaha/design-system';

// Ported from the showcase's TextareaSection (apps/web/src/pages/showcase/sections/TextareaSection.tsx).

export function EmptyAndFilled() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="وصف المشكلة في البيانات">
        <Textarea placeholder="ما الذي تغيّر في بيانات المساحة؟" />
      </Field>
      <Field label="نص الإعلان للأعضاء">
        <Textarea
          defaultValue={'تُغلق المساحة يوم الجمعة للصيانة.\nنعود يوم السبت في التاسعة صباحًا.'}
        />
      </Field>
    </div>
  );
}

export function DisabledAndInvalid() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="ملاحظة الإدارة، للقراءة فقط">
        <Textarea defaultValue="تمت مراجعة هذا البلاغ وإغلاقه." disabled />
      </Field>
      <Field label="سبب إيقاف العضوية" error="اكتب سببًا قبل الإيقاف">
        <Textarea />
      </Field>
    </div>
  );
}
