import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
} from '@shared/design-system';
import { useRef } from 'react';
import { Link } from 'react-router';
import type { UncollectedRowView } from '../../hooks/uncollected/useUncollectedCard';

/**
 * One uncollected visit (DI-24): who — a customer's name leading to their file —, how and when it
 * closed, what it still owes; «تحصيل» the primary (DI-4), «تسجيل دين» outlined, and the owner's «⋯»,
 * named by the visit, holding «لن يُحصَّل…», destructive (DI-27). The actions take the layer's default size, 44 px on touch (DI-16). `opened`
 * hears which control opened a dialog, so the focus goes back to it (DI-30).
 */
export function UncollectedRow({
  row,
  opened,
  fileLink,
}: {
  row: UncollectedRowView;
  opened: (trigger: HTMLElement) => void;
  /** Where a customer's file is; none in the file itself, whose rows name no customer. */
  fileLink?: (customerId: number) => string;
}) {
  const menu = useRef<HTMLButtonElement | null>(null);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        {row.customerId === null || fileLink === undefined ? (
          <span className="self-start text-label" dir="auto">
            {row.name}
          </span>
        ) : (
          <Link
            to={fileLink(row.customerId)}
            dir="auto"
            className="self-start text-label text-foreground underline-offset-4 hover:underline"
          >
            {row.name}
          </Link>
        )}
        <span className="text-caption text-muted-foreground">{row.how}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-label">{row.amount}</span>
        {row.collect !== null && (
          <Button
            onClick={(event) => {
              opened(event.currentTarget);
              row.collect?.run();
            }}
          >
            {row.collect.label}
          </Button>
        )}
        {row.debt !== null && (
          <Button
            variant="outline"
            onClick={(event) => {
              opened(event.currentTarget);
              row.debt?.run();
            }}
          >
            {row.debt.label}
          </Button>
        )}
        {row.more !== null && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button ref={menu} variant="ghost" size="icon" aria-label={row.more.label}>
                <EllipsisVerticalIcon aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                variant="destructive"
                onSelect={() => {
                  if (menu.current !== null) opened(menu.current);
                  row.more?.writeOff.run();
                }}
              >
                {row.more.writeOff.label}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </li>
  );
}
