import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EllipsisVerticalIcon,
} from '@shared/design-system';
import { useRef } from 'react';
import type { UncollectedRowView } from '../../hooks/uncollected/useUncollectedCard';

/**
 * One uncollected visit (DI-24): who, how and when it closed, what it still owes; «تحصيل» the primary
 * (DI-4), «تسجيل دين» outlined, and the owner's «⋯», named by the visit, holding «لن يُحصَّل…»,
 * destructive (DI-27). The actions take the layer's default size, 44 px on touch (DI-16). `opened`
 * hears which control opened a dialog, so the focus goes back to it (DI-30).
 */
export function UncollectedRow({
  row,
  opened,
}: {
  row: UncollectedRowView;
  opened: (trigger: HTMLElement) => void;
}) {
  const menu = useRef<HTMLButtonElement | null>(null);

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
      <div className="flex min-w-0 flex-col gap-1">
        <span className="self-start text-label" dir="auto">
          {row.name}
        </span>
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
