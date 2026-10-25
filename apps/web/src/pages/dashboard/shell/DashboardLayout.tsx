import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
} from '@shared/design-system';
import { cn } from '@shared/design-system';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { Outlet } from 'react-router';
import { PageActionSlot } from './PageActionSlot';
import { PageHeaderSlot } from './PageHeaderSlot';
import { TopBar } from './TopBar';
import { DashboardLanguageToggle } from './DashboardLanguageToggle';

/**
 * The dashboard's shell (ADR 0016): the sidebar, named `label`, with its `header`, the navigation
 * (`children`) and its `footer`; beside it the top bar and the page. The sidebar's form follows the
 * width (foundation §9). On a phone the language moves from the top bar to the drawer's foot. Below
 * 768 px a page may put its one all-day action in a bar fixed at the foot (`PageActionBar`): the bar
 * is drawn only while a page fills it, and the content then makes room for it.
 */
export function DashboardLayout({
  label,
  header,
  footer,
  children,
}: {
  label: string;
  header: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null);
  const [bar, setBar] = useState<HTMLDivElement | null>(null);
  const [filled, setFilled] = useState(0);
  const fill = useCallback(() => {
    setFilled((count) => count + 1);
    return () => {
      setFilled((count) => count - 1);
    };
  }, []);
  const action = useMemo(() => ({ target: bar, fill }), [bar, fill]);

  return (
    <SidebarProvider className="bg-background text-foreground">
      <Sidebar label={label}>
        {header}
        <SidebarContent>{children}</SidebarContent>
        <SidebarFooter className="flex flex-col items-start gap-2">
          {footer}
          <DashboardLanguageToggle className="md:hidden" />
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <TopBar slot={setSlot} />
        <main
          className={cn(
            'flex flex-1 flex-col gap-6 px-4 py-6 md:px-8',
            filled > 0 && 'pb-24 md:pb-6',
          )}
        >
          <PageHeaderSlot value={slot}>
            <PageActionSlot value={action}>
              <Outlet />
            </PageActionSlot>
          </PageHeaderSlot>
        </main>
        <div
          ref={setBar}
          data-slot="page-action-bar"
          hidden={filled === 0}
          className="fixed inset-x-0 bottom-0 z-sticky border-t border-border bg-background px-4 py-3 md:hidden"
        />
      </SidebarInset>
    </SidebarProvider>
  );
}
