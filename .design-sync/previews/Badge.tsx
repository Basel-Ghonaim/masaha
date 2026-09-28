import './_document';
import { Avatar, AvatarFallback, Badge } from '@masaha/design-system';

// Ported from the showcase's BadgeSection (apps/web/src/pages/showcase/sections/BadgeSection.tsx).

export function Variants() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Badge variant="neutral">مرفوض</Badge>
      <Badge variant="primary">مالك</Badge>
      <Badge variant="success">نشط</Badge>
      <Badge variant="warning">ينتهي خلال 3 أيام</Badge>
      <Badge variant="info">جديد</Badge>
      <Badge variant="destructive">منتهية</Badge>
    </div>
  );
}

// A membership status beside each member, as the members list shows it.
export function InMemberRows() {
  return (
    <div className="flex w-full max-w-96 flex-col divide-y rounded-lg border bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar size="sm" aria-hidden>
          <AvatarFallback>س ح</AvatarFallback>
        </Avatar>
        <span className="flex-1">سارة الحلو</span>
        <Badge variant="success">نشط</Badge>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar size="sm" aria-hidden>
          <AvatarFallback>م ع</AvatarFallback>
        </Avatar>
        <span className="flex-1">محمد عوض</span>
        <Badge variant="warning">ينتهي خلال 3 أيام</Badge>
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <Avatar size="sm" aria-hidden>
          <AvatarFallback>ل ن</AvatarFallback>
        </Avatar>
        <span className="flex-1">ليلى النجار</span>
        <Badge variant="destructive">منتهية</Badge>
      </div>
    </div>
  );
}
