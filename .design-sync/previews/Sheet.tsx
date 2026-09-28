import './_document';
import {
  Button,
  Field,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  ToggleGroup,
  ToggleGroupItem,
} from '@masaha/design-system';

// Ported from the showcase's SheetSection (apps/web/src/pages/showcase/sections/SheetSection.tsx),
// one open sheet per side. The focus stays where it was on open, so no control shows a focus ring
// the capture could read as a selected state.

const skipAutoFocus = (event: Event) => event.preventDefault();

export function StartNavigation() {
  return (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline">فتح درج التنقل</Button>
      </SheetTrigger>
      <SheetContent
        side="start"
        closeLabel="إغلاق درج التنقل"
        aria-describedby={undefined}
        onOpenAutoFocus={skipAutoFocus}
      >
        <SheetHeader>
          <SheetTitle>لوحة المالك</SheetTitle>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-1">
          <Button variant="ghost" className="justify-start">
            صفحة النظرة العامة
          </Button>
          <Button variant="ghost" className="justify-start">
            صفحة المشتركين
          </Button>
          <Button variant="ghost" className="justify-start">
            صفحة الإعلانات
          </Button>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export function EndDetails() {
  return (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline">فتح لوح التفاصيل</Button>
      </SheetTrigger>
      <SheetContent side="end" closeLabel="إغلاق لوح التفاصيل" onOpenAutoFocus={skipAutoFocus}>
        <SheetHeader>
          <SheetTitle>تفاصيل البلاغ</SheetTitle>
          <SheetDescription>أرسله رامي خليل عن سعر اليوم الكامل.</SheetDescription>
        </SheetHeader>
      </SheetContent>
    </Sheet>
  );
}

const statuses = [
  'البلاغات الجديدة',
  'البلاغات قيد المراجعة',
  'البلاغات المصححة',
  'البلاغات المرفوضة',
];
const areas = ['كل المناطق', 'الرمال', 'تل الهوا'];

export function BottomFilters() {
  return (
    <Sheet defaultOpen>
      <SheetTrigger asChild>
        <Button variant="outline">فتح لوح الفلاتر</Button>
      </SheetTrigger>
      <SheetContent side="bottom" aria-describedby={undefined} onOpenAutoFocus={skipAutoFocus}>
        <SheetHeader className="flex-row items-center justify-between">
          <SheetTitle>فلاتر البلاغات</SheetTitle>
          <Button variant="link" size="sm">
            مسح كل الفلاتر
          </Button>
        </SheetHeader>
        <SheetBody className="flex flex-col gap-4">
          <Field label="حالة البلاغ">
            <ToggleGroup type="multiple" defaultValue={['0', '1']}>
              {statuses.map((status, index) => (
                <ToggleGroupItem key={status} value={String(index)}>
                  {status}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </Field>
          <Field label="منطقة المساحة">
            <Select defaultValue={areas[0]}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button>عرض 20 بلاغاً مطابقاً</Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
