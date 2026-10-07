import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { Field } from '@shared/design-system';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import type { PlaceValue } from '../../types/PlaceValue';
import { GovernorateAreaSelect } from './GovernorateAreaSelect';

const GAZA: AdminGovernorateWithAreas = {
  id: 1,
  nameAr: 'غزة',
  nameEn: 'Gaza',
  isActive: true,
  areas: [
    { id: 11, governorateId: 1, nameAr: 'الرمال', nameEn: 'Al-Rimal', isActive: true },
    { id: 12, governorateId: 1, nameAr: 'النصر', nameEn: 'An-Nasr', isActive: false },
  ],
};

/** The select inside a Field, as a filter sets it, the governorates answered by `answer`. */
function renderSelect(
  value: PlaceValue,
  answer: Parameters<typeof fakeTransport>[0] = () => ok([GAZA]),
) {
  fakeTransport(answer);
  const onValueChange = vi.fn<(value: PlaceValue) => void>();
  const Wrapper = queryWrapper();
  const rendered = render(
    <Wrapper>
      <Field label="Governorate / area">
        <GovernorateAreaSelect value={value} onValueChange={onValueChange} />
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

describe('GovernorateAreaSelect', () => {
  it('is named by its Field, and shows the place chosen', async () => {
    renderSelect({ areaId: 11 });

    const trigger = screen.getByRole('combobox', { name: 'Governorate / area' });
    await userEvent.click(trigger);
    await screen.findByRole('option', { name: 'Al-Rimal' });
    await userEvent.keyboard('{Escape}');
    expect(trigger).toHaveTextContent('Al-Rimal');
  });

  it('lists All areas, then the governorate and its areas as a group named after it', async () => {
    renderSelect(null);

    await userEvent.click(screen.getByRole('combobox', { name: 'Governorate / area' }));
    const listbox = await screen.findByRole('listbox');
    await within(listbox).findByRole('option', { name: 'Gaza' });

    expect(
      within(listbox)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['All areas', 'Gaza', 'Al-Rimal', 'An-Nasr (hidden)']);
    const group = within(listbox).getByRole('group', { name: 'Gaza' });
    expect(within(group).getAllByRole('option')).toHaveLength(3);
  });

  it('hands back the place chosen from the keyboard', async () => {
    const { onValueChange } = renderSelect(null);
    await userEvent.click(screen.getByRole('combobox', { name: 'Governorate / area' }));
    await screen.findByRole('option', { name: 'Gaza' });

    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    expect(onValueChange).toHaveBeenCalledExactlyOnceWith({ areaId: 11 });
  });

  it('offers only All areas, and says so, when the places could not be loaded', async () => {
    renderSelect(null, () => refused(403, { type: 'forbidden' }));

    await userEvent.click(screen.getByRole('combobox', { name: 'Governorate / area' }));
    const failed = await screen.findByRole('option', { name: 'We couldn’t load the areas' });

    expect(failed).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual([
      'All areas',
      'We couldn’t load the areas',
    ]);
  });

  it('has no accessibility violations, open', async () => {
    const { baseElement } = renderSelect(null);
    await userEvent.click(screen.getByRole('combobox', { name: 'Governorate / area' }));
    await screen.findByRole('option', { name: 'Gaza' });

    // The open list is portalled outside any landmark, as a page's own select's would be.
    expect(await axe(baseElement, { rules: { region: { enabled: false } } })).toHaveNoViolations();
  });
});
