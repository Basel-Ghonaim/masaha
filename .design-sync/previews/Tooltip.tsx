import './_document';
import {
  Button,
  LogOutIcon,
  SearchIcon,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@masaha/design-system';

// Ported from the showcase's TooltipSection (apps/web/src/pages/showcase/sections/TooltipSection.tsx),
// rendered open.

export function IconButton() {
  return (
    <div className="flex gap-3 p-12">
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <Button variant="outline" size="icon" aria-label="البحث في المشتركين">
            <SearchIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">البحث في المشتركين</TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="تسجيل الخروج من الحساب">
            <LogOutIcon />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">تسجيل الخروج من الحساب</TooltipContent>
      </Tooltip>
    </div>
  );
}

export function HintOnAction() {
  return (
    <div className="p-12">
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <Button variant="outline">نسخ رابط المساحة</Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">ينسخ عنوان صفحة المساحة العامة</TooltipContent>
      </Tooltip>
    </div>
  );
}
