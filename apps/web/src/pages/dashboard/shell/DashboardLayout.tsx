import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarInset,
  SidebarProvider,
} from '@shared/design-system';
import { useState, type ReactNode } from 'react';
import { Outlet } from 'react-router';
import { PageHeaderSlot } from './PageHeaderSlot';
import { TopBar } from './TopBar';
import { DashboardLanguageToggle } from './DashboardLanguageToggle';

/**
 * The dashboard's shell (ADR 0016): the sidebar, named `label`, with its `header`, the navigation
 * (`children`) and its `footer`; beside it the top bar and the page. The sidebar's form follows the
 * width (foundation §9). On a phone the language moves from the top bar to the drawer's foot.
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
        <main className="flex flex-1 flex-col gap-6 px-4 py-6 md:px-8">
          <PageHeaderSlot value={slot}>
            <Outlet />
          </PageHeaderSlot>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
