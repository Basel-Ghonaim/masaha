import type { AdminAmenity } from '@masaha/shared/lookups';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { AmenitiesSection } from '../list/AmenitiesSection';

const INTERNET: AdminAmenity = {
  id: 4,
  key: 'internet',
  nameAr: 'إنترنت',
  nameEn: 'Internet',
  icon: 'sun',
  isActive: true,
  isFilterable: false,
};

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/** The section, its list answered whole and each write answered as saved. */
async function renderSection() {
  fakeTransport((request) => (request.method === 'get' ? ok([INTERNET]) : ok(INTERNET)));
  const Wrapper = queryWrapper();
  const rendered = render(
    <Wrapper>
      <AmenitiesSection />
    </Wrapper>,
  );
  await screen.findByRole('list');
  return rendered;
}

/** The sheet that edits Internet, opened from its row. */
async function editInternet() {
  await userEvent.click(screen.getByRole('button', { name: heard('Edit: Internet') }));
  return screen.findByRole('dialog', { name: 'Edit amenity' });
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('the amenity’s sheet', () => {
  it('edits an amenity from its names as they stand, the Arabic name focused', async () => {
    await renderSection();

    const sheet = await editInternet();

    const arabic = within(sheet).getByRole('textbox', { name: 'Name in Arabic' });
    expect(arabic).toHaveValue('إنترنت');
    expect(arabic).toHaveFocus();
    expect(within(sheet).getByRole('textbox', { name: 'Name in English' })).toHaveValue('Internet');
  });

  it('offers the eight icons as one named group, each option named, the amenity’s own chosen', async () => {
    await renderSection();

    const sheet = await editInternet();

    const icons = within(sheet).getByRole('radiogroup', { name: 'Icon' });
    const names = [
      'Wi-Fi',
      'Lightning',
      'Sun',
      'Power plug',
      'Coffee cup',
      'People',
      'Presentation board',
      'Graduation cap',
    ];
    expect(within(icons).getAllByRole('radio')).toEqual(
      names.map((name) => within(icons).getByRole('radio', { name })),
    );
    expect(within(icons).getByRole('radio', { name: 'Sun' })).toBeChecked();
    expect(within(icons).getByRole('radio', { name: 'Graduation cap' })).not.toBeChecked();
  });

  it('moves the chosen icon with the arrow keys', async () => {
    await renderSection();
    const sheet = await editInternet();
    const icons = within(sheet).getByRole('radiogroup', { name: 'Icon' });

    within(icons).getByRole('radio', { name: 'Sun' }).focus();
    // Held, as a real key press is: Radix chooses the option it lands on only while an arrow is down.
    await userEvent.keyboard('{ArrowRight>}');

    expect(within(icons).getByRole('radio', { name: 'Power plug' })).toBeChecked();
    expect(within(icons).getByRole('radio', { name: 'Power plug' })).toHaveFocus();
  });

  it('shows the filter and Active switches, each with its hint', async () => {
    await renderSection();

    const sheet = await editInternet();

    const inFilters = within(sheet).getByRole('switch', { name: 'In filters' });
    expect(inFilters).not.toBeChecked();
    expect(inFilters).toHaveAccessibleDescription('Offered in the directory’s filter.');
    const active = within(sheet).getByRole('switch', { name: 'Active' });
    expect(active).toBeChecked();
    expect(active).toHaveAccessibleDescription(
      'Inactive: not offered in forms and filters; spaces that have it keep it.',
    );
  });

  it('adds an amenity with empty names, no icon chosen, in the filters, and no Active switch', async () => {
    await renderSection();

    await userEvent.click(screen.getByRole('button', { name: 'Add amenity' }));

    const sheet = await screen.findByRole('dialog', { name: 'Add amenity' });
    expect(within(sheet).getByRole('textbox', { name: 'Name in Arabic' })).toHaveValue('');
    expect(within(sheet).getByRole('textbox', { name: 'Name in English' })).toHaveValue('');
    const icons = within(sheet).getByRole('radiogroup', { name: 'Icon' });
    expect(within(icons).queryByRole('radio', { checked: true })).not.toBeInTheDocument();
    expect(within(sheet).getByRole('switch', { name: 'In filters' })).toBeChecked();
    expect(within(sheet).queryByRole('switch', { name: 'Active' })).not.toBeInTheDocument();
  });

  it('asks for an icon when none is chosen, the grid taking the focus', async () => {
    await renderSection();
    await userEvent.click(screen.getByRole('button', { name: 'Add amenity' }));
    const sheet = await screen.findByRole('dialog', { name: 'Add amenity' });

    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Name in Arabic' }), 'شاي');
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Name in English' }), 'Tea');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await within(sheet).findByText('Choose an icon');
    const icons = within(sheet).getByRole('radiogroup', { name: 'Icon' });
    expect(icons).toHaveAccessibleDescription('Choose an icon');
    expect(within(icons).getByRole('radio', { name: 'Wi-Fi' })).toHaveFocus();
  });

  it('has no accessibility violations while open', async () => {
    await renderSection();
    const sheet = await editInternet();

    expect(await axe(sheet)).toHaveNoViolations();
  });
});
