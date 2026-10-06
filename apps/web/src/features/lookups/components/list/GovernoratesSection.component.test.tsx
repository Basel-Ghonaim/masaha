import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import type { FakeAnswer } from '../../../../test/fakeAdapter';
import { deferred } from '../../../../test/fakeSession';
import { fakeTransport, ok, refused, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { GovernoratesSection } from './GovernoratesSection';

const GAZA: AdminGovernorateWithAreas = {
  id: 2,
  nameAr: 'محافظة غزة',
  nameEn: 'Gaza City',
  isActive: true,
  areas: [
    { id: 5, governorateId: 2, nameAr: 'الرمال', nameEn: 'Al-Rimal', isActive: true },
    { id: 6, governorateId: 2, nameAr: 'الشجاعية', nameEn: 'Ash-Shuja’iyya', isActive: false },
  ],
};

const RAFAH: AdminGovernorateWithAreas = {
  id: 3,
  nameAr: 'محافظة رفح',
  nameEn: 'Rafah',
  isActive: false,
  areas: [],
};

/** The section, with the governorates answered by `answer`. */
function renderSection(answer: () => FakeAnswer | Promise<FakeAnswer>) {
  fakeTransport(answer);
  const Wrapper = queryWrapper();
  return render(
    <Wrapper>
      <GovernoratesSection />
    </Wrapper>,
  );
}

/** A governorate's card, found by its heading. */
async function cardOf(name: string) {
  const heading = await screen.findByRole('heading', { name, level: 2 });
  const card = heading.closest<HTMLElement>('[data-slot="card"]');
  if (card === null) throw new Error(`No card for ${name}`);
  return card;
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('GovernoratesSection', () => {
  it('shows a card per governorate, its English name first, then its Arabic name and count of areas', async () => {
    renderSection(() => ok([GAZA, RAFAH]));

    const gaza = await cardOf('Gaza City');
    expect(within(gaza).getByText('محافظة غزة')).toHaveAttribute('lang', 'ar');
    expect(within(gaza).getByText('2 areas')).toBeInTheDocument();
    const rows = within(gaza).getAllByRole('listitem');
    expect(rows.map((row) => row.textContent)).toEqual([
      'Al-Rimalالرمال',
      'Ash-Shuja’iyyaالشجاعيةHidden',
    ]);
    expect(screen.getByRole('region', { name: 'Governorates and areas' })).toBeInTheDocument();
  });

  it('marks a hidden governorate with its badge, and says once that it has no areas', async () => {
    renderSection(() => ok([GAZA, RAFAH]));

    const rafah = await cardOf('Rafah');
    expect(within(rafah).getByText('Hidden')).toBeInTheDocument();
    expect(within(rafah).getAllByText('0 areas')).toHaveLength(1);
    expect(within(rafah).queryByRole('list')).not.toBeInTheDocument();
    expect(within(await cardOf('Gaza City')).getAllByText('Hidden')).toHaveLength(1);
  });

  it('shows placeholders in a busy status named Loading while the list loads', async () => {
    const answer = deferred<FakeAnswer>();
    renderSection(() => answer.promise);

    expect(screen.getByRole('status', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true');
    answer.resolve(ok([GAZA]));
    await cardOf('Gaza City');
    expect(screen.queryByRole('status', { name: 'Loading' })).not.toBeInTheDocument();
  });

  it('shows the failure with the refusal’s line and Try again', async () => {
    renderSection(() => refused(403, { type: 'forbidden' }));

    expect(
      await screen.findByRole('heading', { name: 'We couldn’t load the governorates' }),
    ).toBeInTheDocument();
    expect(screen.getByText('You don’t have permission to do this.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument();
  });

  it('says there are no governorates yet when the list is empty', async () => {
    renderSection(() => ok([]));

    expect(await screen.findByRole('heading', { name: 'No governorates yet' })).toBeInTheDocument();
    expect(screen.getByText('Add the first governorate, then its areas.')).toBeInTheDocument();
  });

  it('has no axe violations', async () => {
    const { container } = renderSection(() => ok([GAZA, RAFAH]));
    await cardOf('Rafah');

    expect(await axe(container)).toHaveNoViolations();
  });
});
