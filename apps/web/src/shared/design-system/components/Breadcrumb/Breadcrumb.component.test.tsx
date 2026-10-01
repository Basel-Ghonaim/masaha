import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '.';
import { DirectionProvider } from '../../lib/DirectionProvider';

const MIRRORED = '-scale-x-100';

function MembersTrail() {
  return (
    <Breadcrumb label="Breadcrumb">
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbEllipsis label="More pages" />
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Members</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

describe('Breadcrumb', () => {
  it('is a navigation named by its label, ending on the current page', () => {
    render(<MembersTrail />);
    const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });

    expect(within(nav).getByRole('link', { name: 'Dashboard' })).toHaveAttribute(
      'href',
      '/dashboard',
    );
    expect(within(nav).getByText('Members')).toHaveAttribute('aria-current', 'page');
    expect(within(nav).queryByRole('link', { name: 'Members' })).not.toBeInTheDocument();
  });

  it('lists only the pages, hiding the separators from assistive technology', () => {
    render(<MembersTrail />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
  });

  it('names the left-out pages with its label', () => {
    render(<MembersTrail />);

    expect(screen.getByText('More pages')).toBeInTheDocument();
  });

  it.each([
    { dir: 'ltr' as const, mirrored: false },
    { dir: 'rtl' as const, mirrored: true },
  ])('points its separators along the reading direction in $dir', ({ dir, mirrored }) => {
    const { container } = render(
      <DirectionProvider dir={dir}>
        <MembersTrail />
      </DirectionProvider>,
    );

    const separators = container.querySelectorAll('[data-slot=breadcrumb-separator] svg');
    expect(separators).toHaveLength(2);
    for (const chevron of separators) {
      expect(chevron.classList.contains(MIRRORED)).toBe(mirrored);
    }
  });

  it('has no accessibility violations', async () => {
    const { container } = render(<MembersTrail />);

    expect(await axe(container)).toHaveNoViolations();
  });
});
