import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { Tabs, TabsContent, TabsList, TabsTrigger, type TabsListProps } from '.';
import { DirectionProvider } from '../../../lib/DirectionProvider';

function StatusTabs({ variant }: Pick<TabsListProps, 'variant'>) {
  return (
    <Tabs defaultValue="all">
      <TabsList aria-label="Membership status" variant={variant}>
        <TabsTrigger value="all">All 38</TabsTrigger>
        <TabsTrigger value="active">Active 31</TabsTrigger>
        <TabsTrigger value="ending" disabled>
          Ending soon 5
        </TabsTrigger>
        <TabsTrigger value="expired">Expired 2</TabsTrigger>
      </TabsList>
      <TabsContent value="all">Every member</TabsContent>
      <TabsContent value="active">Active members</TabsContent>
      <TabsContent value="expired">Expired members</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('shows the panel of the selected tab, named by it', () => {
    render(<StatusTabs />);

    expect(screen.getByRole('tablist', { name: 'Membership status' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'All 38' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'All 38' })).toHaveTextContent('Every member');
  });

  it('selects a tab when it is clicked', async () => {
    render(<StatusTabs />);

    await userEvent.click(screen.getByRole('tab', { name: 'Active 31' }));

    expect(screen.getByRole('tab', { name: 'Active 31' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel', { name: 'Active 31' })).toHaveTextContent('Active members');
  });

  it.each([
    { dir: 'ltr' as const, next: 'ArrowRight', previous: 'ArrowLeft' },
    { dir: 'rtl' as const, next: 'ArrowLeft', previous: 'ArrowRight' },
  ])(
    'moves to the next tab with $next and back with $previous in $dir, skipping a disabled one',
    async ({ dir, next, previous }) => {
      render(
        <DirectionProvider dir={dir}>
          <StatusTabs />
        </DirectionProvider>,
      );
      await userEvent.tab();

      await userEvent.keyboard(`{${next}}`);
      expect(screen.getByRole('tab', { name: 'Active 31' })).toHaveFocus();
      expect(screen.getByRole('tab', { name: 'Active 31' })).toHaveAttribute(
        'aria-selected',
        'true',
      );

      await userEvent.keyboard(`{${next}}`);
      expect(screen.getByRole('tab', { name: 'Expired 2' })).toHaveFocus();

      await userEvent.keyboard(`{${previous}}`);
      expect(screen.getByRole('tab', { name: 'Active 31' })).toHaveFocus();
    },
  );

  it.each(['default', 'line'] as const)(
    'has no accessibility violations in the %s variant',
    async (variant) => {
      const { container } = render(<StatusTabs variant={variant} />);

      expect(await axe(container)).toHaveNoViolations();
    },
  );
});
