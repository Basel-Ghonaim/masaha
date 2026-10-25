import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
} from '@shared/design-system';
import { Link } from 'react-router';

/** A customer's «⋯», ready to render. */
export type CustomerMenuView = {
  /** «إجراءات أخرى: {name}», naming the trigger and the menu alike (DI-39). */
  label: string;
  /** «ملف الزبون», a link; none in the file itself. */
  file: { label: string; to: string } | null;
  edit: { label: string; run: () => void };
  /** «أرشفة…», the owner's (S5). */
  archive: { label: string; run: () => void } | null;
};

/**
 * A customer's «⋯» (DI-39): a quiet icon trigger and its menu, both named by the customer; «ملف
 * الزبون» where it leads elsewhere, «تعديل البيانات», and the owner's «أرشفة…», destructive (DI-46).
 * Closed, the focus returns to the trigger.
 */
export function CustomerMenu({ menu }: { menu: CustomerMenuView }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={menu.label}>
          <EllipsisVerticalIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" aria-label={menu.label}>
        {menu.file !== null && (
          <DropdownMenuItem asChild>
            <Link to={menu.file.to}>{menu.file.label}</Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onSelect={menu.edit.run}>{menu.edit.label}</DropdownMenuItem>
        {menu.archive !== null && (
          <DropdownMenuItem variant="destructive" onSelect={menu.archive.run}>
            {menu.archive.label}
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
