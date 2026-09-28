import './_document';
import { Field, RadioGroup, RadioGroupItem } from '@masaha/design-system';

// Ported from the showcase's RadioGroupSection (apps/web/src/pages/showcase/sections/RadioGroupSection.tsx).

export function WithHelperAndDisabledOption() {
  return (
    <Field
      label="نوع الاشتراك في المساحة"
      helper="يمكنك تغييره عند التجديد"
      className="w-full max-w-96"
    >
      <RadioGroup defaultValue="daily">
        <Field label="اشتراك يومي" orientation="horizontal">
          <RadioGroupItem value="daily" />
        </Field>
        <Field label="اشتراك أسبوعي" orientation="horizontal">
          <RadioGroupItem value="weekly" disabled />
        </Field>
        <Field label="اشتراك شهري" orientation="horizontal">
          <RadioGroupItem value="monthly" />
        </Field>
      </RadioGroup>
    </Field>
  );
}

export function Invalid() {
  return (
    <Field
      label="نوع الإعلان للأعضاء"
      error="اختر نوع الإعلان قبل النشر"
      className="w-full max-w-96"
    >
      <RadioGroup>
        <Field label="خبر عام للأعضاء" orientation="horizontal">
          <RadioGroupItem value="news" />
        </Field>
        <Field label="إغلاق مؤقت للمساحة" orientation="horizontal">
          <RadioGroupItem value="closure" />
        </Field>
      </RadioGroup>
    </Field>
  );
}
