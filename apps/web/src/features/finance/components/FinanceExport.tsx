import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EllipsisIcon,
  useMediaQuery,
} from '@shared/design-system';
import { useFinanceExport } from '../hooks/useFinanceExport';

/**
 * The export of the tab shown, for the page's top bar: an outline button from 768 px, an item of a
 * «⋯» menu below it (P1).
 */
export function FinanceExport({ spaceId }: { spaceId: number }) {
  const exported = useFinanceExport(spaceId);
  const wide = useMediaQuery('(min-width: 768px)');

  if (wide) {
    return (
      <Button
        variant="outline"
        size="sm"
        disabled={exported.disabled}
        loading={exported.loading}
        onClick={exported.run}
      >
        {exported.label}
      </Button>
    );
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={exported.more}>
          <EllipsisIcon aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem disabled={exported.disabled || exported.loading} onSelect={exported.run}>
          {exported.label}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
