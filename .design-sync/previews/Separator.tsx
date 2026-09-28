import './_document';
import { Separator } from '@masaha/design-system';

// Ported from the showcase's SeparatorSection (apps/web/src/pages/showcase/sections/SeparatorSection.tsx).

export function Horizontal() {
  return (
    <div className="flex w-full max-w-80 flex-col gap-3">
      <p>بيانات المساحة</p>
      <Separator />
      <p>بيانات التواصل</p>
    </div>
  );
}

export function Vertical() {
  return (
    <div className="flex h-6 items-center gap-3">
      <span>الملف الشخصي</span>
      <Separator orientation="vertical" />
      <span>المفضلة</span>
      <Separator orientation="vertical" />
      <span>بلاغاتي</span>
    </div>
  );
}
