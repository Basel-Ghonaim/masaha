import type { AdminGovernorateWithAreas, LookupsCatalogue } from '@masaha/shared/lookups';
import { Field } from '@shared/design-system';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { AreaSelect } from './AreaSelect';

const CATALOGUE: LookupsCatalogue = {
  governorates: [
    {
      id: 1,
      nameAr: 'غزة',
      nameEn: 'Gaza',
      areas: [{ id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' }],
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

/** The select inside a Field, as a form sets it. */
function renderSelect(value: number | null) {
  fakeTransport(({ url }) => (url === '/lookups' ? ok(CATALOGUE) : ok(ADMIN_GOVERNORATES)));
  const onValueChange = vi.fn<(areaId: number) => void>();
  const Wrapper = queryWrapper();
  const rendered = render(
    <Wrapper>
      <Field label="Area">
        <AreaSelect value={value} onValueChange={onValueChange} />
      </Field>
    </Wrapper>,
  );
  return { ...rendered, onValueChange };
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AreaSelect', () => {
  it('is named by its Field and asks for an area until one is chosen', () => {
    renderSelect(null);

    expect(screen.getByRole('combobox', { name: 'Area' })).toHaveTextContent('Choose an area');
  });

  it('lists each governorate’s areas in a group named after it, and hands back the area chosen', async () => {
    const { onValueChange } = renderSelect(null);

    await userEvent.click(screen.getByRole('combobox', { name: 'Area' }));
    const rafah = await screen.findByRole('group', { name: 'Rafah' });
    expect(within(rafah).getByRole('option', { name: 'Tal as-Sultan' })).toBeInTheDocument();
    expect(within(screen.getByRole('group', { name: 'Gaza' })).getAllByRole('option')).toHaveLength(
      1,
    );

    await userEvent.click(within(rafah).getByRole('option', { name: 'Tal as-Sultan' }));
    expect(onValueChange).toHaveBeenCalledExactlyOnceWith(31);
  });

  it('shows the area chosen', async () => {
    renderSelect(11);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Area' })).toHaveTextContent('Al-Rimal');
    });
  });

  it('shows a space’s own hidden area in its trigger, marked hidden', async () => {
    renderSelect(12);

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: 'Area' })).toHaveTextContent(
        'Al-Nasr · Gaza (hidden)',
      );
    });
  });

  it('has no detectable accessibility violations', async () => {
    const { container } = renderSelect(11);
    await screen.findByText('Al-Rimal');

    expect(await axe(container)).toHaveNoViolations();
  });
});
