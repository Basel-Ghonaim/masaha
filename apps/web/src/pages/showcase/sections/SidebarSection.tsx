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
} from '@shared/design-system';
import { ShowcaseGroup, ShowcaseSection } from '../ShowcaseSection';

type SidebarSamples = {
  title: string;
  caption: string;
  label: string;
  product: string;
  area: string;
  groupLabel: string;
  items: { overview: string; attendance: string; members: string; reports: string };
  reportsBadge: string;
  signOut: string;
  trigger: string;
  page: string;
};

export function SidebarSection({ samples }: { samples: SidebarSamples }) {
  const { items } = samples;

  return (
    <ShowcaseSection title={samples.title}>
      <ShowcaseGroup caption={samples.caption}>
        {/* A frame for the shell: the sidebar fills its height instead of the screen's. */}
        <SidebarProvider className="h-120 min-h-0 overflow-hidden rounded-lg border border-border">
          <Sidebar label={samples.label} className="static h-full">
            <SidebarHeader
              mark={
                <span
                  aria-hidden
                  className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-label text-primary-foreground"
                >
                  {Array.from(samples.product)[0]}
                </span>
              }
            >
              <span className="text-heading-3 text-foreground">{samples.product}</span>
              <span className="text-caption text-muted-foreground">{samples.area}</span>
            </SidebarHeader>
            <SidebarContent>
              <SidebarGroup>
                <SidebarGroupLabel>{samples.groupLabel}</SidebarGroupLabel>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton href="#" icon={<InfoIcon />} label={items.overview} />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      href="#"
                      icon={<CircleCheckIcon />}
                      label={items.attendance}
                    />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      href="#"
                      icon={<UsersIcon />}
                      label={items.members}
                      isActive
                    />
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      href="#"
                      icon={<TriangleAlertIcon />}
                      label={items.reports}
                      badge="3"
                      badgeLabel={samples.reportsBadge}
                    />
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton href="#" icon={<LogOutIcon />} label={samples.signOut} />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>
          </Sidebar>
          <SidebarInset>
            <div className="flex h-14 items-center gap-2 border-b border-border px-4">
              <SidebarTrigger label={samples.trigger} />
              <span className="text-label">{samples.page}</span>
            </div>
          </SidebarInset>
        </SidebarProvider>
      </ShowcaseGroup>
    </ShowcaseSection>
  );
}
