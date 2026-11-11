import type { LookupsCatalogue } from '@masaha/shared/lookups';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { AreaLine } from './AreaLine';

const CATALOGUE: LookupsCatalogue = {
  governorates: [
    {
      id: 1,
      nameAr: 'غزة',
      nameEn: 'Gaza',
      areas: [{ id: 11, nameAr: 'الرمال', nameEn: 'Al-Rimal' }],
    },
  ],
  amenities: [],
};

function renderLine(language: 'ar' | 'en', areaId = 11) {
  startPreferences(language);
  fakeTransport(() => ok(CATALOGUE));
  const Wrapper = queryWrapper();
  render(
    <Wrapper>
      <p>
        <AreaLine areaId={areaId} source="public" />
      </p>
    </Wrapper>,
  );
}

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AreaLine', () => {
  it('writes the area, then its governorate after a comma, as the profile says it', async () => {
    renderLine('ar');

    expect(await screen.findByText('الرمال، غزة')).toBeInTheDocument();
  });

  it('writes it in English in the English interface', async () => {
    renderLine('en');

    expect(await screen.findByText('Al-Rimal, Gaza')).toBeInTheDocument();
  });

  it('says a space’s area hidden since is the current one, as the area field does, on the public source', async () => {
    renderLine('ar', 12);
    expect(await screen.findByText('المنطقة الحالية — لم تعد متاحة للاختيار')).toBeInTheDocument();
  });
});
