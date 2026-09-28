import './_document';
import { useState } from 'react';
import {
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  Field,
  Input,
  InputAction,
  SearchIcon,
  XIcon,
} from '@masaha/design-system';

// Ported from the showcase's InputSection (apps/web/src/pages/showcase/sections/InputSection.tsx).

function SearchField() {
  const [query, setQuery] = useState('خالد عيسى');
  return (
    <Field label="البحث في المشتركين">
      <Input
        type="search"
        value={query}
        placeholder="ابحث بالاسم أو رقم الهاتف"
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        startIcon={<SearchIcon />}
        action={
          query === '' ? undefined : (
            <InputAction
              label="مسح نص البحث"
              icon={<XIcon />}
              onClick={() => {
                setQuery('');
              }}
            />
          )
        }
      />
    </Field>
  );
}

function PasswordField() {
  const [visible, setVisible] = useState(false);
  return (
    <Field label="كلمة المرور للحساب">
      <Input
        type={visible ? 'text' : 'password'}
        dir="ltr"
        defaultValue="showcase secret phrase"
        action={
          <InputAction
            label={visible ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
            icon={visible ? <EyeOffIcon /> : <EyeIcon />}
            onClick={() => {
              setVisible(!visible);
            }}
          />
        }
      />
    </Field>
  );
}

export function States() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="الاسم الكامل في الحساب">
        <Input placeholder="اسمك الأول واسم العائلة" />
      </Field>
      <Field label="اسم مساحة العمل">
        <Input defaultValue="مساحة شارع عمر المختار" />
      </Field>
      <Field label="تاريخ الانضمام، لا يمكن تعديله">
        <Input defaultValue="عضو منذ يناير 2026" disabled />
      </Field>
      <Field label="المقاعد المتاحة الآن" error="أدخل عددًا من صفر فأكثر">
        <Input defaultValue="سالب ثلاثة" />
      </Field>
    </div>
  );
}

export function IconsAndActions() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <SearchField />
      <PasswordField />
      <Field
        label="البريد الإلكتروني للحساب"
        error="أدخل بريدًا إلكترونيًا صحيحًا، مثل showcase.sample@example.com"
      >
        <Input
          type="email"
          dir="ltr"
          defaultValue="ahmad@riyada"
          endIcon={<CircleAlertIcon className="text-destructive" />}
        />
      </Field>
    </div>
  );
}

export function LeftToRightValues() {
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="البريد الإلكتروني لتسجيل الدخول">
        <Input type="email" dir="ltr" placeholder="showcase.sample@example.com" />
      </Field>
      <Field label="رقم الجوال مع رمز الدولة">
        <Input type="tel" dir="ltr" defaultValue="+970 59 000 0000" />
      </Field>
    </div>
  );
}
