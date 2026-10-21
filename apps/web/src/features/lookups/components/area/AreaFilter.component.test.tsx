import type { LookupsCatalogue } from '@masaha/shared/lookups';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { AreaFilter } from './AreaFilter';

const CATALOGUE: LookupsCatalogue = {
  governorates: [
    {
      id: 2,
      nameAr: 'غزة',
      nameEn: 'Gaza City',
      areas: [
        { id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' },
        { id: 12, nameAr: 'النصر', nameEn: 'An-Nasr' },
      ],
    },
  ],
  amenities: [],
};

/** The filter as the site's Directory sets it: its value held by the caller. */
function Filter({ onChange }: { onChange: (ids: number[]) => void }) {
  const [value, setValue] = useState<number[]>([]);
  return (
    <AreaFilter
      value={value}
      onValueChange={(ids) => {
        setValue(ids);
        onChange(ids);
      }}
    />
  );
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AreaFilter', () => {
  it('is named by its label, finds an area by its English name in the Arabic interface, and is axe-clean', async () => {
    startPreferences('ar');
    const user = userEvent.setup();
    fakeTransport(() => ok(CATALOGUE));
    const onChange = vi.fn<(ids: number[]) => void>();
    const Wrapper = queryWrapper();
    render(
      <Wrapper>
        <Filter onChange={onChange} />
      </Wrapper>,
    );
    // Landmarks belong to a page, not to a component, so that rule is off.
    const options = { rules: { region: { enabled: false } } };

    const trigger = screen.getByRole('combobox', { name: 'المنطقة' });
    expect(trigger).toHaveTextContent('كل المناطق');
    expect(await axe(document.body, options)).toHaveNoViolations();

    await user.click(trigger);
    await screen.findByRole('option', { name: 'الرمال' });
    expect(screen.getByRole('group', { name: 'غزة' })).toBeInTheDocument();
    await user.keyboard('Nasr');

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['النصر']);
    await user.click(screen.getByRole('option', { name: 'النصر' }));

    expect(onChange).toHaveBeenLastCalledWith([12]);
    expect(trigger).toHaveTextContent('النصر');
    expect(await axe(document.body, options)).toHaveNoViolations();
  });
});
