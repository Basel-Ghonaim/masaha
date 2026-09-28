import './_document';
import { Button, Popover, PopoverContent, PopoverTrigger } from '@masaha/design-system';

// Ported from the showcase's PopoverSection (apps/web/src/pages/showcase/sections/PopoverSection.tsx),
// rendered open beside its trigger.

export function OpeningHours() {
  return (
    <div className="p-8">
      <Popover defaultOpen>
        <PopoverTrigger asChild>
          <Button variant="outline">عرض ساعات العمل</Button>
        </PopoverTrigger>
        <PopoverContent align="start" aria-label="ساعات عمل المساحة">
          <p>مفتوحة كل يوم من الثامنة صباحاً حتى الثامنة مساءً.</p>
        </PopoverContent>
      </Popover>
    </div>
  );
}
