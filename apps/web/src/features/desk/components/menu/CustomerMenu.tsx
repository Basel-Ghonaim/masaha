import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
} from '@shared/design-system';
import type { Ref } from 'react';
import { Link } from 'react-router';

/** A customer's «⋯», ready to render. */
export type CustomerMenuView = {
  /** «إجراءات أخرى: {name}», naming the trigger and the menu alike (DI-39). */
  label: string;
  /** «ملف الزبون», a link; none in the file itself. */
  file: { label: string; to: string } | null;
  /** «اشتراك جديد»: the subscription sheet for this customer. */
  subscribe: { label: string; run: () => void };
  edit: { label: string; run: () => void };
  /** «أرشفة…», the owner's (S5). */
  archive: { label: string; run: () => void } | null;
  /** The customer's actions by their state, first (D8.1); none where they are buttons. */
  state: { key: string; label: string; run: () => void }[];
  /**
   * Their file is still being read for those actions: the menu holds one busy item in their place
   * and none other, so no item moves under a tap once it answers (R5-F4).
   */
  reading: boolean;
  /** The busy item's words. */
  readingLabel: string;
};

/**
 * A customer's «⋯» (DI-39): a quiet icon trigger and its menu, both named by the customer; first
 * their actions by their state (D8.1), then «ملف الزبون» where it leads elsewhere, «اشتراك جديد»,
 * «تعديل البيانات», and the owner's «أرشفة…», destructive (DI-46).
 * While their file is read for those actions, one held, busy item stands alone in their place.
 * Closed, the focus returns to the trigger, which `triggerRef` lets a dialog the menu opened return
 * to as well. `onOpen` hears it open.
 */
export function CustomerMenu({
  menu,
  triggerRef,
  onOpen,
}: {
  menu: CustomerMenuView;
  triggerRef?: Ref<HTMLButtonElement>;
  onOpen?: () => void;
}) {
  return (
    <DropdownMenu
      onOpenChange={(open) => {
        if (open) onOpen?.();
      }}
    >
      <DropdownMenuTrigger asChild>
        <Button ref={triggerRef} variant="ghost" size="icon" aria-label={menu.label}>
          <EllipsisVerticalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-label={menu.label}>
        {menu.reading ? (
          <DropdownMenuItem held aria-busy>
            {menu.readingLabel}
          </DropdownMenuItem>
        ) : (
          <CustomerMenuItems menu={menu} />
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The menu's items, once the customer's state is known (or not asked). */
function CustomerMenuItems({ menu }: { menu: CustomerMenuView }) {
  return (
    <>
      {menu.state.map((action) => (
        <DropdownMenuItem key={action.key} onSelect={action.run}>
          {action.label}
        </DropdownMenuItem>
      ))}
      {menu.file !== null && (
        <DropdownMenuItem asChild>
          <Link to={menu.file.to}>{menu.file.label}</Link>
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onSelect={menu.subscribe.run}>{menu.subscribe.label}</DropdownMenuItem>
      <DropdownMenuItem onSelect={menu.edit.run}>{menu.edit.label}</DropdownMenuItem>
      {menu.archive !== null && (
        <DropdownMenuItem variant="destructive" onSelect={menu.archive.run}>
          {menu.archive.label}
        </DropdownMenuItem>
      )}
    </>
  );
}
