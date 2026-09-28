import './_document';
import { useState } from 'react';
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxTrigger,
  Field,
} from '@masaha/design-system';

// Ported from the showcase's ComboboxSection (apps/web/src/pages/showcase/sections/ComboboxSection.tsx).

const AREAS = ['حي الرمال', 'حي تل الهوا', 'حي الشجاعية', 'مخيم النصيرات', 'مدينة دير البلح'];
const AMENITIES = [
  'إنترنت ألياف سريع',
  'كهرباء من مولّد احتياطي',
  'غرفة اجتماعات هادئة',
  'مياه شرب مجانية',
];
const STATUSES = [
  'بلاغ بيانات جديد',
  'بلاغ بيانات قيد المراجعة',
  'بلاغ بيانات مصحّح',
  'بلاغ بيانات مرفوض',
];

function Options({ options }: { options: string[] }) {
  return options.map((option, index) => (
    <ComboboxItem key={option} value={String(index)}>
      {option}
    </ComboboxItem>
  ));
}

function AreaList() {
  return (
    <ComboboxContent
      searchLabel="البحث في قائمة المناطق"
      searchPlaceholder="اكتب جزءاً من اسم المنطقة"
      listLabel="المناطق في قطاع غزة"
      emptyText="لا توجد منطقة تطابق هذا البحث"
    >
      <Options options={AREAS} />
    </ComboboxContent>
  );
}

function AmenityList() {
  return (
    <ComboboxContent
      searchLabel="البحث في قائمة المرافق"
      searchPlaceholder="اكتب جزءاً من اسم المرفق"
      listLabel="المرافق التي قد توفرها المساحة"
      emptyText="لا يوجد مرفق يطابق هذا البحث"
    >
      <Options options={AMENITIES} />
    </ComboboxContent>
  );
}

export function OpenMultiple() {
  const [chosen, setChosen] = useState(['0', '2']);
  return (
    <Field label="مرافق المساحة" className="w-full max-w-80">
      <Combobox type="multiple" value={chosen} onValueChange={setChosen} defaultOpen>
        <ComboboxTrigger empty={chosen.length === 0}>
          {chosen.length === 0 ? 'اختر المرافق' : `${String(chosen.length)} مرافق مختارة`}
        </ComboboxTrigger>
        <AmenityList />
      </Combobox>
    </Field>
  );
}

export function SingleAndInvalid() {
  const [area, setArea] = useState('');
  return (
    <div className="flex w-full max-w-96 flex-col gap-3">
      <Field label="منطقة مساحة العمل">
        <Combobox type="single" value={area} onValueChange={setArea}>
          <ComboboxTrigger empty={area === ''}>
            {area === '' ? 'اختر منطقة من القائمة' : AREAS[Number(area)]}
          </ComboboxTrigger>
          <AreaList />
        </Combobox>
      </Field>
      <Field label="المنطقة في طلب الإدراج" error="اختر المنطقة قبل إرسال الطلب">
        <Combobox type="single">
          <ComboboxTrigger empty>اختر منطقة الإدراج</ComboboxTrigger>
          <AreaList />
        </Combobox>
      </Field>
    </div>
  );
}

export function FilterTriggers() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Combobox type="multiple" defaultValue={['0', '1']}>
        <ComboboxTrigger className="w-auto">الحالة: حالتان محدّدتان</ComboboxTrigger>
        <ComboboxContent
          searchLabel="البحث في حالات البلاغ"
          searchPlaceholder="اكتب جزءاً من الحالة"
          listLabel="حالات البلاغ للفلترة"
          emptyText="لا توجد حالة تطابق هذا البحث"
        >
          <Options options={STATUSES} />
        </ComboboxContent>
      </Combobox>
      <Combobox type="single">
        <ComboboxTrigger className="w-auto">المنطقة: كل المناطق</ComboboxTrigger>
        <AreaList />
      </Combobox>
    </div>
  );
}
