import type { AdminGovernorateWithAreas, LookupsCatalogue } from '@masaha/shared/lookups';
import { Field } from '@shared/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { AreaCombobox } from './AreaCombobox';

const CATALOGUE: LookupsCatalogue = {
  governorates: [
    {
      id: 1,
      nameAr: 'غزة',
      nameEn: 'Gaza',
      areas: [
        { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
        { id: 13, nameAr: 'تل الهوى', nameEn: 'Tal al-Hawa' },
      ],
    },
    {
      id: 3,
      nameAr: 'رفح',
      nameEn: 'Rafah',
      areas: [{ id: 31, nameAr: 'تل السلطان', nameEn: 'Tal as-Sultan' }],
    },
  ],
  amenities: [],
};

// The admin's lists hold the hidden rows too: Al-Nasr was hidden since a space took it.
const ADMIN_GOVERNORATES: AdminGovernorateWithAreas[] = [
  {
    id: 1,
    nameAr: 'غزة',
    nameEn: 'Gaza',
    isActive: true,
    areas: [
      { id: 11, governorateId: 1, nameAr: 'الرمال', nameEn: 'Al-Rimal', isActive: true },
      { id: 12, governorateId: 1, nameAr: 'النصر', nameEn: 'Al-Nasr', isActive: false },
    ],
  },
];

/** The combobox inside a Field, as a Sheet sets it. */
function renderCombobox(value: number | null, source: 'admin' | 'public' = 'admin') {
  fakeTransport(({ url }) => (url === '/lookups' ? ok(CATALOGUE) : ok(ADMIN_GOVERNORATES)));
  const onValueChange = vi.fn<(areaId: number) => void>();
  const Wrapper = queryWrapper();
  const rendered = render(
    <Wrapper>
      <Field label="Area">
        <AreaCombobox source={source} value={value} onValueChange={onValueChange} />
      </Field>
    </Wrapper>,
  );
  return { ...rendered, onValueChange };
}

/** The options' texts, in the order the open list shows them. */
const optionTexts = () => screen.queryAllByRole('option').map((option) => option.textContent);

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AreaCombobox', () => {
  it('is named by its Field and asks for an area until one is chosen', () => {
    renderCombobox(null);

    expect(screen.getByRole('combobox', { name: 'Area' })).toHaveTextContent('Choose an area');
  });

  it('lists each governorate’s areas under its name, and hands back the area chosen', async () => {
    const { onValueChange } = renderCombobox(null);

    await userEvent.click(screen.getByRole('combobox', { name: 'Area' }));
    const rafah = await screen.findByRole('group', { name: 'Rafah' });
    expect(within(rafah).getAllByRole('option')).toHaveLength(1);
    expect(within(screen.getByRole('group', { name: 'Gaza' })).getAllByRole('option')).toHaveLength(
      2,
    );

    await userEvent.click(within(rafah).getByRole('option', { name: 'Tal as-Sultan' }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(31);
  });

  it('finds an area by its own name or by its governorate’s', async () => {
    renderCombobox(null);
    await userEvent.click(screen.getByRole('combobox', { name: 'Area' }));
    await screen.findByRole('group', { name: 'Rafah' });
    const search = screen.getByRole('combobox', { name: 'Search the areas' });

    await userEvent.type(search, 'hawa');
    expect(optionTexts()).toEqual(['Tal al-Hawa']);

    await userEvent.clear(search);
    await userEvent.type(search, 'rafah');
    expect(optionTexts()).toEqual(['Tal as-Sultan']);

    await userEvent.clear(search);
    await userEvent.type(search, 'nowhere');
    expect(optionTexts()).toEqual([]);
    expect(screen.getByText('No area by that name')).toBeInTheDocument();
  });

  it('shows the area chosen', async () => {
    renderCombobox(11);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Area' })).toHaveTextContent('Al-Rimal');
    });
  });

  it('keeps a space’s own hidden area, marked, first in the list and in its trigger', async () => {
    renderCombobox(12);

    const trigger = screen.getByRole('combobox', { name: 'Area' });
    await waitFor(() => {
      expect(trigger).toHaveTextContent('Al-Nasr · Gaza (hidden)');
    });
    await userEvent.click(trigger);
    await screen.findByRole('group', { name: 'Rafah' });
    expect(optionTexts()[0]).toBe('Al-Nasr · Gaza (hidden)');
  });

  it('keeps an owner’s own area the public catalogue no longer names, as no longer offered', async () => {
    renderCombobox(12, 'public');

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Area' })).toHaveTextContent(
        'Current area — no longer offered',
      );
    });
  });

  it('has no detectable accessibility violations, closed and open', async () => {
    const { container } = renderCombobox(11);
    await screen.findByText('Al-Rimal');
    expect(await axe(container)).toHaveNoViolations();

    await userEvent.click(screen.getByRole('combobox', { name: 'Area' }));
    await screen.findByRole('group', { name: 'Rafah' });
    // The list is portalled to <body>; landmarks belong to a page, not to a field.
    expect(
      await axe(document.body, { rules: { region: { enabled: false } } }),
    ).toHaveNoViolations();
  });
});
