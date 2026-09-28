import './_document';
import {
  CircleCheckIcon,
  InfoIcon,
  LogOutIcon,
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  TriangleAlertIcon,
  UsersIcon,
} from '@masaha/design-system';

// Ported from the showcase's SidebarSection (apps/web/src/pages/showcase/sections/SidebarSection.tsx).
// The form follows the screen width: expanded here (desktop), icons only on a tablet, a drawer on a
// phone.

const PRODUCT = 'مساحة للعرض';

type Page = 'overview' | 'attendance' | 'members' | 'reports';

function Shell({ active, page }: { active: Page; page: string }) {
  return (
    // A frame for the shell: the sidebar fills its height instead of the screen's.
    <SidebarProvider className="h-120 min-h-0 overflow-hidden rounded-lg border border-border">
      <Sidebar label="لوحة تحكم مالك مساحة الريادة" className="static h-full">
        <SidebarHeader
          mark={
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-label text-primary-foreground"
            >
              {Array.from(PRODUCT)[0]}
            </span>
          }
        >
          <span className="text-heading-3 text-foreground">{PRODUCT}</span>
          <span className="text-caption text-muted-foreground">لوحة تحكم المالك</span>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>العمل اليومي</SidebarGroupLabel>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  href="#"
                  icon={<InfoIcon />}
                  label="نظرة على المساحة"
                  isActive={active === 'overview'}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  href="#"
                  icon={<CircleCheckIcon />}
                  label="حضور اليوم"
                  isActive={active === 'attendance'}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  href="#"
                  icon={<UsersIcon />}
                  label="مشتركو المساحة"
                  isActive={active === 'members'}
                />
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  href="#"
                  icon={<TriangleAlertIcon />}
                  label="البيانات المبلّغ عنها"
                  badge="3"
                  badgeLabel="3 بلاغات بانتظار المراجعة"
                  isActive={active === 'reports'}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="#" icon={<LogOutIcon />} label="مغادرة لوحة التحكم" />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <div className="flex h-14 items-center gap-2 border-b border-border px-4">
          <SidebarTrigger label="فتح تنقل لوحة التحكم" />
          <span className="text-label">{page}</span>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

/** The owner dashboard shell, expanded, on the members page. */
export function OwnerDashboard() {
  return <Shell active="members" page="صفحة مشتركي المساحة" />;
}

/** The same shell with the reports item current: its count badge on the active background. */
export function ReportsActive() {
  return <Shell active="reports" page="البيانات المبلّغ عنها" />;
}
