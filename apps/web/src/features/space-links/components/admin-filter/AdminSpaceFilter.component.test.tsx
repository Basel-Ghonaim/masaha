import type { PaginationMeta } from '@masaha/shared/core';
import type { AdminSpaceRow } from '@masaha/shared/space-links';
import { createQueryClient } from '@shared/api';
import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { fakeTransport, restoreTransport } from '../../../../test/fakeTransport';
import { startPreferences } from '../../../../test/startPreferences';
import { AdminSpaceFilter } from './AdminSpaceFilter';

const NOOK: AdminSpaceRow = {
  id: 3,
  slug: 'nook',
  nameEn: 'Nook',
  nameAr: null,
  area: { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
  isVerified: true,
  isHidden: false,
  deletedAt: null,
  owners: [{ id: 3, name: 'Hadi' }],
  staleGroups: [],
  missingGroups: [],
  lastUpdatedAt: '2026-09-27T08:00:00.000Z',
};

/** A page of `rows`, the only one. */
function page(rows: unknown[]): FakeAnswer {
  const meta: PaginationMeta = {
    currentPage: 1,
    limit: 50,
    totalPages: rows.length > 0 ? 1 : 0,
    totalRecords: rows.length,
    hasNextPage: false,
    hasPreviousPage: false,
  };
  return { status: 200, data: { success: true, data: rows, meta } };
}

function renderFilter(value: number | undefined, chosenName: { text: string } | null = null) {
  const requests = fakeTransport(() => page([NOOK]));
  const onChange = vi.fn();
  render(
    <QueryClientProvider client={createQueryClient()}>
      <AdminSpaceFilter
        label="Space"
        value={value}
        chosenName={chosenName}
        chosenFallback="A chosen space"
        onChange={onChange}
      />
    </QueryClientProvider>,
  );
  return { requests, onChange };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('AdminSpaceFilter', () => {
  it('searches the server only while open, once typing pauses, and chooses a space', async () => {
    const user = userEvent.setup();
    const { requests, onChange } = renderFilter(undefined);

    const trigger = screen.getByRole('combobox', { name: 'Space' });
    expect(trigger).toHaveTextContent('All spaces');
    expect(requests).toEqual([]);

    await user.click(trigger);
    await user.type(await screen.findByRole('combobox', { name: 'Search' }), 'No');
    await waitFor(() => {
      expect(requests.at(-1)?.params).toEqual({ q: 'No', limit: 50 });
    });
    expect(requests.filter(({ params }) => (params as { q?: string }).q === 'N')).toEqual([]);
    expect(requests.every(({ url }) => url === '/admin/spaces')).toBe(true);

    await user.click(await screen.findByRole('option', { name: 'Nook' }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('clears the filter with «All spaces», its first choice', async () => {
    const user = userEvent.setup();
    const { onChange } = renderFilter(3, { text: 'Nook' });

    await user.click(screen.getByRole('combobox', { name: 'Space' }));
    const options = await screen.findAllByRole('option');
    expect(options[0]).toHaveTextContent('All spaces');
    await user.click(options[0] as HTMLElement);

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('shows the chosen space’s name, or «A chosen space» until it is known', () => {
    renderFilter(3, { text: 'Nook' });
    expect(screen.getByRole('combobox', { name: 'Space' })).toHaveTextContent('Nook');
  });

  it('says «A chosen space» for a chosen space whose name is not known yet', () => {
    renderFilter(12);
    expect(screen.getByRole('combobox', { name: 'Space' })).toHaveTextContent('A chosen space');
  });
});
