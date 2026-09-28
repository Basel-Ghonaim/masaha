import './_document';
import { ArrowEndIcon, Button, LogInIcon, SearchIcon } from '@masaha/design-system';

// Ported from the showcase's ButtonSection (apps/web/src/pages/showcase/sections/ButtonSection.tsx).

export function Variants() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Button variant="primary">إجراء أساسي</Button>
      <Button variant="secondary">إجراء ثانوي</Button>
      <Button variant="outline">إجراء بإطار</Button>
      <Button variant="ghost">إجراء بلا خلفية</Button>
      <Button variant="destructive">إجراء حذف نهائي</Button>
      <Button variant="link">إجراء بشكل رابط</Button>
    </div>
  );
}

export function Sizes() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button size="sm">زر صغير</Button>
      <Button size="md">زر متوسط</Button>
      <Button size="lg">زر كبير</Button>
      <Button size="icon" variant="outline" aria-label="بحث في المساحات">
        <SearchIcon />
      </Button>
    </div>
  );
}

export function WithIcons() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Button>
        <LogInIcon />
        تسجيل الدخول إلى الحساب
      </Button>
      <Button variant="outline">
        متابعة إلى الخطوة التالية
        <ArrowEndIcon />
      </Button>
    </div>
  );
}

export function States() {
  return (
    <div className="flex flex-wrap items-start gap-3">
      <Button loading>جارٍ حفظ التغييرات</Button>
      <Button variant="secondary" loading>
        جارٍ حفظ التغييرات
      </Button>
      <Button disabled>إجراء غير متاح الآن</Button>
      <Button variant="outline" disabled>
        إجراء غير متاح الآن
      </Button>
      <Button asChild variant="link">
        <a href="#buttons">رابط يبدو كزر</a>
      </Button>
    </div>
  );
}
