import './_document';
import { Avatar, AvatarFallback } from '@masaha/design-system';

// Ported from the showcase's AvatarSection (apps/web/src/pages/showcase/sections/AvatarSection.tsx).

export function Sizes() {
  return (
    <div className="flex items-center gap-3">
      <Avatar size="sm">
        <AvatarFallback>س ح</AvatarFallback>
      </Avatar>
      <Avatar size="md">
        <AvatarFallback>س ح</AvatarFallback>
      </Avatar>
      <Avatar size="lg">
        <AvatarFallback>س ح</AvatarFallback>
      </Avatar>
    </div>
  );
}

// Beside the name, the avatar is hidden from assistive technology so the name is not read twice.
export function WithName() {
  return (
    <div className="flex items-center gap-3">
      <Avatar aria-hidden>
        <AvatarFallback>س ح</AvatarFallback>
      </Avatar>
      <div className="flex flex-col">
        <span>سارة الحلو</span>
        <span dir="ltr" className="text-body-sm text-muted-foreground">
          +970 59 234 1188
        </span>
      </div>
    </div>
  );
}
