import { useCopy } from '@shared/copy';
import { EyeIcon, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@shared/design-system';
import { publicSpacePath } from '@shared/routing';

/** The sidebar's foot: the space's page on the public site, in a new tab. */
export function PublicPageLink({ slug }: { slug: string }) {
  const copy = useCopy();

  return (
    <SidebarMenu className="w-full">
      <SidebarMenuItem>
        <SidebarMenuButton asChild icon={<EyeIcon aria-hidden />} label={copy.dashboard.publicPage}>
          <a href={publicSpacePath(slug)} target="_blank" rel="noreferrer" />
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
