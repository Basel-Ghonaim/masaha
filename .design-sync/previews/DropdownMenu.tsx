import './_document';
import {
  Button,
  CheckIcon,
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  EllipsisIcon,
  EyeIcon,
  XIcon,
} from '@masaha/design-system';
import { useState } from 'react';

// Ported from the showcase's DropdownMenuSection
// (apps/web/src/pages/showcase/sections/DropdownMenuSection.tsx), rendered open.

export function RowActions() {
  return (
    <div className="p-8">
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="إجراءات البلاغ عن مساحة الريادة">
            <EllipsisIcon aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem>
            <EyeIcon aria-hidden />
            عرض تفاصيل البلاغ
          </DropdownMenuItem>
          <DropdownMenuItem>
            <CheckIcon aria-hidden />
            وضع علامة: تم تصحيح البلاغ
          </DropdownMenuItem>
          <DropdownMenuItem disabled>تعديل بيانات المساحة (غير متاح)</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">
            <XIcon aria-hidden />
            رفض البلاغ المرسل
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const columns = ['هاتف المشترك', 'تاريخ انتهاء العضوية', 'وقت آخر حضور'];
const sorts = ['الأحدث اشتراكاً أولاً', 'الأسماء أبجدياً'];

export function TableOptions() {
  const [shown, setShown] = useState<string[]>(columns.slice(0, 2));
  const [sort, setSort] = useState(sorts[0]);

  return (
    <div className="p-8">
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger asChild>
          <Button variant="outline">خيارات عرض الجدول</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuLabel>الأعمدة الظاهرة</DropdownMenuLabel>
          {columns.map((column) => (
            <DropdownMenuCheckboxItem
              key={column}
              checked={shown.includes(column)}
              onCheckedChange={(checked) => {
                setShown((current) =>
                  checked ? [...current, column] : current.filter((item) => item !== column),
                );
              }}
            >
              {column}
            </DropdownMenuCheckboxItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuLabel>ترتيب الصفوف</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={sort} onValueChange={setSort}>
            {sorts.map((option) => (
              <DropdownMenuRadioItem key={option} value={option}>
                {option}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
          <DropdownMenuSeparator />
          <DropdownMenuSub open>
            <DropdownMenuSubTrigger>تصدير الجدول</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem>كملف جدول بيانات</DropdownMenuItem>
              <DropdownMenuItem>كصفحة قابلة للطباعة</DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
