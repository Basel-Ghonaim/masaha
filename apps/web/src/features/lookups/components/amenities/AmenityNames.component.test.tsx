import type { AdminAmenity } from '@masaha/shared/lookups';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { AmenityNames } from './AmenityNames';

const amenity = (id: number, nameEn: string, nameAr: string, isActive = true): AdminAmenity => ({
  id,
  key: nameEn.toLowerCase(),
  nameAr,
  nameEn,
  icon: 'wifi',
  isActive,
});

const AMENITIES = [
  amenity(1, 'Internet', 'إنترنت'),
  amenity(2, 'Generator', 'مولّد', false),
  amenity(3, 'Solar power', 'طاقة شمسية'),
];

function renderNames(ids: number[]) {
  fakeTransport(() => ok(AMENITIES));
  const Wrapper = queryWrapper();
  render(
    <Wrapper>
      <p>
        <AmenityNames ids={ids} />
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

describe('AmenityNames', () => {
  it('shows the names of a space’s amenities as text', async () => {
    renderNames([3, 2, 1]);

    expect(await screen.findByText('Internet, Generator, and Solar power')).toBeInTheDocument();
  });
});
