import type { AdminAmenity } from '@masaha/shared/lookups';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { bodyOf, fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
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

  it('the edit sheet has no active switch', async () => {
    await renderSection();
    // The row keeps its switch: the one control of whether it is offered.
    expect(screen.getByRole('switch', { name: heard('Active: Internet') })).toBeChecked();

    const sheet = await editInternet();

    expect(within(sheet).getAllByRole('textbox')).toHaveLength(2);
    expect(within(sheet).getByRole('radiogroup', { name: 'Icon' })).toBeInTheDocument();
    expect(within(sheet).queryByRole('switch')).not.toBeInTheDocument();
  });

  it('a list of 11 offers «الترتيب» and moves the amenity there', async () => {
    const eleven: AdminAmenity[] = Array.from({ length: 11 }, (_, index) => ({
      ...INTERNET,
      id: 20 + index,
      key: `amenity_${String(index + 1)}`,
      nameEn: `Amenity ${String(index + 1)}`,
    }));
    const requests = fakeTransport((request) =>
      request.method === 'get'
        ? ok(eleven)
        : request.method === 'put'
          ? { status: 204 }
          : ok(eleven[0]),
    );
    const Wrapper = queryWrapper();
    render(
      <Wrapper>
        <AmenitiesSection />
      </Wrapper>,
    );
    await screen.findByRole('list');

    await userEvent.click(screen.getByRole('button', { name: heard('Edit: Amenity 1') }));
    const sheet = await screen.findByRole('dialog', { name: 'Edit amenity' });
    const position = within(sheet).getByRole('textbox', { name: 'Position' });
    expect(position).toHaveValue('1');
    expect(position).toHaveAccessibleDescription('From 1 to 11');
    await userEvent.clear(position);
    await userEvent.type(position, '3');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    const writes = requests.filter(({ method }) => method !== 'get');
    expect(writes.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'patch /admin/amenities/20',
      'put /admin/amenities/order',
    ]);
    expect(bodyOf(writes[1])).toEqual({ ids: [21, 22, 20, 23, 24, 25, 26, 27, 28, 29, 30] });
  });

  it('adds an amenity with empty names, no icon chosen, and no switch', async () => {
    await renderSection();

    await userEvent.click(screen.getByRole('button', { name: 'Add amenity' }));

    const sheet = await screen.findByRole('dialog', { name: 'Add amenity' });
    expect(within(sheet).getByRole('textbox', { name: 'Name in Arabic' })).toHaveValue('');
    expect(within(sheet).getByRole('textbox', { name: 'Name in English' })).toHaveValue('');
    const icons = within(sheet).getByRole('radiogroup', { name: 'Icon' });
    expect(within(icons).queryByRole('radio', { checked: true })).not.toBeInTheDocument();
    expect(within(sheet).queryByRole('switch')).not.toBeInTheDocument();
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
