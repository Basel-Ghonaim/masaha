import { Slot } from 'radix-ui';
import {
  createContext,
  use,
  useId,
  useMemo,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
} from 'react';
import { MenuIcon } from '../../icons';
import { cn } from '../../lib/cn';
import { useMediaQuery } from '../../lib/useMediaQuery';
import { Button } from '../Button';
import { useDirection } from '../../lib/DirectionProvider';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '../Sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '../Tooltip';

// The breakpoints of foundation §9: md (768px) and lg (1024px).
const TABLET_UP = '(min-width: 768px)';
const DESKTOP_UP = '(min-width: 1024px)';

/** phone: a drawer (Sheet) · tablet: a rail of icons · desktop: expanded. */
type SidebarMode = 'phone' | 'tablet' | 'desktop';

type SidebarState = {
  mode: SidebarMode;
  setOpen: (open: boolean) => void;
};

const SidebarContext = createContext<SidebarState | null>(null);

function useSidebar(): SidebarState {
  const state = use(SidebarContext);
  if (state === null) throw new Error('Sidebar parts must be inside a SidebarProvider.');
  return state;
}

/**
 * The dashboard shell's frame: the Sidebar beside the page (SidebarInset). The width decides the
 * sidebar's form (foundation §9): expanded on desktop, icons only on a tablet, and a drawer opened
 * by SidebarTrigger on a phone. The form follows the screen, not a user toggle.
 */
export function SidebarProvider({ className, children, ...props }: ComponentProps<'div'>) {
  const tabletUp = useMediaQuery(TABLET_UP);
  const desktopUp = useMediaQuery(DESKTOP_UP);
  const mode: SidebarMode = desktopUp ? 'desktop' : tabletUp ? 'tablet' : 'phone';
  const [open, setOpen] = useState(false);
  const state = useMemo(() => ({ mode, setOpen }), [mode]);

  // The drawer's root holds no markup, so it wraps the shell in every mode: a resize never remounts
  // the page, and SidebarTrigger is the drawer's own trigger, which gets the focus back on close.
  // The drawer is open only while the screen is a phone's.
  return (
    <SidebarContext value={state}>
      <Sheet open={open && mode === 'phone'} onOpenChange={setOpen}>
        <div
          data-slot="sidebar-wrapper"
          className={cn('flex min-h-svh w-full', className)}
          {...props}
        >
          {children}
        </div>
      </Sheet>
    </SidebarContext>
  );
}

export type SidebarProps = Omit<ComponentProps<'nav'>, 'aria-label'> & {
  /** Names the navigation, and the drawer on a phone, such as "Owner dashboard". */
  label: string;
};

export function Sidebar({ label, className, children, ...props }: SidebarProps) {
  const { mode } = useSidebar();
  const collapsed = mode === 'tablet';

  if (mode === 'phone') {
    return (
      <SheetContent
        side="start"
        aria-describedby={undefined}
        className="w-72 border-sidebar-border bg-sidebar text-sidebar-foreground"
      >
        <SheetTitle className="sr-only">{label}</SheetTitle>
        <nav
          data-slot="sidebar"
          data-mode={mode}
          aria-label={label}
          className={cn('flex min-h-0 flex-1 flex-col', className)}
          {...props}
        >
          {children}
        </nav>
      </SheetContent>
    );
  }

  return (
    <nav
      data-slot="sidebar"
      data-mode={mode}
      aria-label={label}
      className={cn(
        'group/sidebar sticky top-0 flex h-svh shrink-0 flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground',
        collapsed ? 'w-16' : 'w-62',
        className,
      )}
      {...props}
    >
      {children}
    </nav>
  );
}

export type SidebarHeaderProps = ComponentProps<'div'> & {
  /** Always shown, also on the rail: the logo mark. */
  mark: ReactNode;
};

/** The logo mark and, beside it, the product name and area; on the rail, the mark alone. */
export function SidebarHeader({ mark, className, children, ...props }: SidebarHeaderProps) {
  const { mode } = useSidebar();

  return (
    <div
      data-slot="sidebar-header"
      className={cn(
        'flex shrink-0 items-center gap-3 p-4',
        mode === 'tablet' && 'justify-center px-0',
        className,
      )}
      {...props}
    >
      {mark}
      <div className={cn('flex min-w-0 flex-col', mode === 'tablet' && 'sr-only')}>{children}</div>
    </div>
  );
}

export function SidebarContent({ className, ...props }: ComponentProps<'div'>) {
  const { mode } = useSidebar();

  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-2',
        mode === 'tablet' && 'px-2',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarFooter({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="sidebar-footer" className={cn('shrink-0 p-3', className)} {...props} />;
}

export function SidebarGroup({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div data-slot="sidebar-group" className={cn('flex flex-col gap-1', className)} {...props} />
  );
}

/** A group's heading; on the rail it is kept for assistive technology only. */
export function SidebarGroupLabel({ className, ...props }: ComponentProps<'div'>) {
  const { mode } = useSidebar();

  return (
    <div
      data-slot="sidebar-group-label"
      className={cn(
        'px-3 text-caption text-muted-foreground',
        mode === 'tablet' && 'sr-only',
        className,
      )}
      {...props}
    />
  );
}

export function SidebarMenu({ className, ...props }: ComponentProps<'ul'>) {
  return (
    <ul data-slot="sidebar-menu" className={cn('flex flex-col gap-1', className)} {...props} />
  );
}

export function SidebarMenuItem({ className, ...props }: ComponentProps<'li'>) {
  return <li data-slot="sidebar-menu-item" className={cn('relative', className)} {...props} />;
}

export type SidebarMenuButtonProps = Omit<ComponentProps<'a'>, 'children'> & {
  icon: ReactNode;
  /** The item's name. On the rail it is the tooltip, and stays its accessible name. */
  label: string;
  /** The page shown now: highlighted, and marked as the current page. */
  isActive?: boolean;
  /** A count at the end of the item, such as new reports. It is shown only; `badgeLabel` says it. */
  badge?: ReactNode;
  /** What the count means, such as "3 new reports": the item's description for assistive technology. */
  badgeLabel?: string;
  /** Renders its single child (a router link) as the item, with the icon and label inside it. */
  asChild?: boolean;
  /** With `asChild`, the link to render; it needs no content of its own. */
  children?: ReactNode;
};

export function SidebarMenuButton({
  icon,
  label,
  isActive = false,
  badge,
  badgeLabel,
  asChild = false,
  className,
  children,
  onClick,
  ...props
}: SidebarMenuButtonProps) {
  const { mode, setOpen } = useSidebar();
  const direction = useDirection();
  const collapsed = mode === 'tablet';
  const Comp = asChild ? Slot.Root : 'a';
  const badgeLabelId = useId();

  const item = (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive}
      aria-current={isActive ? 'page' : undefined}
      aria-describedby={badgeLabel === undefined ? undefined : badgeLabelId}
      className={cn(
        'flex h-10 w-full items-center gap-3 rounded-md px-3 text-body text-sidebar-foreground transition-colors pointer-coarse:h-(--control-height) hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sidebar-ring data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*="size-"])]:size-5',
        collapsed && 'relative justify-center px-0',
        className,
      )}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        onClick?.(event);
        // Choosing a page closes the phone drawer, so the page shows.
        if (mode === 'phone') setOpen(false);
      }}
      {...props}
    >
      {icon}
      <Slot.Slottable>{children}</Slot.Slottable>
      <span className={cn('min-w-0 flex-1 truncate', collapsed && 'sr-only')}>{label}</span>
      {badge !== undefined && (
        <span
          data-slot="sidebar-menu-badge"
          aria-hidden
          className={cn(
            'flex h-5 min-w-5 items-center justify-center rounded-full bg-sidebar-primary px-1.5 text-caption text-sidebar-primary-foreground',
            collapsed && 'absolute top-0.5 end-1 h-4 min-w-4 px-1',
          )}
        >
          {badge}
        </span>
      )}
      {badgeLabel !== undefined && (
        <span id={badgeLabelId} hidden>
          {badgeLabel}
        </span>
      )}
    </Comp>
  );

  if (!collapsed) return item;

  // On the rail the label is hidden, so a tooltip shows it toward the page, on the end side.
  return (
    <Tooltip>
      <TooltipTrigger asChild>{item}</TooltipTrigger>
      <TooltipContent side={direction === 'rtl' ? 'left' : 'right'}>{label}</TooltipContent>
    </Tooltip>
  );
}

export type SidebarTriggerProps = Omit<ComponentProps<'button'>, 'children'> & {
  /** Names the button, such as "Open the navigation". */
  label: string;
};

/** Opens the drawer on a phone; placed at the top start of the page. Wider screens do not show it. */
export function SidebarTrigger({ label, className, ...props }: SidebarTriggerProps) {
  const { mode } = useSidebar();
  if (mode !== 'phone') return null;

  return (
    <SheetTrigger asChild>
      <Button
        data-slot="sidebar-trigger"
        variant="ghost"
        size="icon"
        aria-label={label}
        className={className}
        {...props}
      >
        <MenuIcon aria-hidden />
      </Button>
    </SheetTrigger>
  );
}

/** The page beside the sidebar. */
export function SidebarInset({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn('flex min-w-0 flex-1 flex-col', className)}
      {...props}
    />
  );
}
