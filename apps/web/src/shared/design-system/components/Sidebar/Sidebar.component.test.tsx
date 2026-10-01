import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import type { ReactNode } from 'react';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '.';
import { SearchIcon, UsersIcon } from '../../icons';
import { DirectionProvider } from '../../lib/DirectionProvider';

// jsdom has no media queries. This stand-in answers the (min-width: …px) queries the sidebar asks
// against a chosen screen width.
let screenWidth = 1280;

beforeEach(() => {
  vi.stubGlobal('matchMedia', (query: string) => {
    const minWidth = /\(min-width:\s*(\d+)px\)/.exec(query);
    return {
      matches: minWidth !== null && screenWidth >= Number(minWidth[1]),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    };
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function OwnerShell() {
  return (
    <SidebarProvider>
      <Sidebar label="Owner dashboard">
        <SidebarHeader mark={<span aria-hidden>M</span>}>Masaha</SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton href="/overview" icon={<SearchIcon />} label="Overview" />
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                href="/members"
                icon={<UsersIcon />}
                label="Members"
                badge="3"
                badgeLabel="3 new reports"
                isActive
              />
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <SidebarTrigger label="Open the navigation" />
      </SidebarInset>
    </SidebarProvider>
  );
}

function renderShell(width: number, wrap: (shell: ReactNode) => ReactNode = (shell) => shell) {
  screenWidth = width;
  return render(wrap(<OwnerShell />));
}

describe('Sidebar', () => {
  it('is an expanded navigation on a desktop, marking the current page', () => {
    renderShell(1280);
    const nav = screen.getByRole('navigation', { name: 'Owner dashboard' });

    expect(nav).toHaveAttribute('data-mode', 'desktop');
    const members = within(nav).getByRole('link', { name: 'Members' });
    expect(members).toHaveAttribute('aria-current', 'page');
    expect(members).toHaveAccessibleDescription('3 new reports');
    expect(within(nav).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
    expect(screen.queryByRole('button', { name: 'Open the navigation' })).not.toBeInTheDocument();
  });

  it('is a rail of icons on a tablet, each still named and with a tooltip for its label', async () => {
    renderShell(800);
    const nav = screen.getByRole('navigation', { name: 'Owner dashboard' });
    expect(nav).toHaveAttribute('data-mode', 'tablet');

    await userEvent.hover(within(nav).getByRole('link', { name: 'Overview' }));

    expect(await screen.findByRole('tooltip')).toHaveTextContent('Overview');
  });

  it('shows no tooltip on a desktop, where the label is visible', async () => {
    renderShell(1280);

    await userEvent.hover(screen.getByRole('link', { name: 'Overview' }));

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('is a drawer on a phone, opened by its trigger and closed by choosing a page', async () => {
    renderShell(360);
    const trigger = screen.getByRole('button', { name: 'Open the navigation' });
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await userEvent.click(trigger);

    const drawer = screen.getByRole('dialog', { name: 'Owner dashboard' });
    expect(within(drawer).getByRole('navigation', { name: 'Owner dashboard' })).toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await userEvent.click(within(drawer).getByRole('link', { name: 'Overview' }));

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('keeps the focus inside the phone drawer and returns it to the trigger on Escape', async () => {
    renderShell(360);
    const trigger = screen.getByRole('button', { name: 'Open the navigation' });
    await userEvent.click(trigger);
    const drawer = screen.getByRole('dialog', { name: 'Owner dashboard' });

    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(drawer).toContainElement(document.activeElement as HTMLElement);

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('renders a router link as the item with asChild', () => {
    screenWidth = 1280;
    render(
      <SidebarProvider>
        <Sidebar label="Owner dashboard">
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild icon={<UsersIcon />} label="Members">
                <a href="/members" data-router-link="" />
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </Sidebar>
      </SidebarProvider>,
    );

    expect(screen.getByRole('link', { name: 'Members' })).toHaveAttribute('data-router-link');
  });

  it.each([
    { width: 1280, dir: 'ltr' as const },
    { width: 800, dir: 'rtl' as const },
  ])('has no accessibility violations at $width px', async ({ width, dir }) => {
    const { container } = renderShell(width, (shell) => (
      <DirectionProvider dir={dir}>{shell}</DirectionProvider>
    ));

    expect(await axe(container)).toHaveNoViolations();
  });

  it('has no accessibility violations with the phone drawer open', async () => {
    renderShell(360);
    await userEvent.click(screen.getByRole('button', { name: 'Open the navigation' }));

    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
