import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { AreaName } from './AreaName';

const GOVERNORATES: AdminGovernorateWithAreas[] = [
  {
    id: 1,
    nameAr: 'غزة',
    nameEn: 'Gaza',
    isActive: true,
    areas: [
      { id: 11, governorateId: 1, nameAr: 'الرمال', nameEn: 'Al-Rimal', isActive: true },
      { id: 12, governorateId: 1, nameAr: 'الشجاعية', nameEn: 'Shujaiya', isActive: false },
    ],
  },
];

function renderName(areaId: number) {
  fakeTransport(() => ok(GOVERNORATES));
  const Wrapper = queryWrapper();
  render(
    <Wrapper>
      <p>
        <AreaName areaId={areaId} />
      </p>
    </Wrapper>,
  );
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
  vi.unstubAllGlobals();
});

describe('AreaName', () => {
  it('shows a space’s area with its governorate as text', async () => {
    renderName(11);

    expect(await screen.findByText('Al-Rimal · Gaza')).toBeInTheDocument();
  });
});
