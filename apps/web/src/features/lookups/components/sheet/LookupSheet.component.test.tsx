import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
import { queryWrapper } from '../../../../test/queryWrapper';
import { startPreferences } from '../../../../test/startPreferences';
import { GovernoratesSection } from '../list/GovernoratesSection';

const SHUJAIYYA = {
  id: 6,
  governorateId: 2,
  nameAr: 'الشجاعية',
  nameEn: 'Ash-Shuja’iyya',
  isActive: false,
};

const GAZA: AdminGovernorateWithAreas = {
  id: 2,
  nameAr: 'محافظة غزة',
  nameEn: 'Gaza City',
  isActive: true,
  areas: [SHUJAIYYA],
};

/** A name with the Unicode isolates around its inserted values removed, as a reader hears it. */
const heard = (expected: string) => (name: string) => name.replace(/[⁦-⁩]/g, '') === expected;

/** The section, its list answered whole and each write answered as saved. */
async function renderSection() {
  fakeTransport((request) => (request.method === 'get' ? ok([GAZA]) : ok(SHUJAIYYA)));
  const Wrapper = queryWrapper();
  const rendered = render(
    <Wrapper>
      <GovernoratesSection />
    </Wrapper>,
  );
  await screen.findByRole('heading', { name: 'Gaza City', level: 2 });
  return rendered;
}

beforeEach(() => {
  startPreferences('en');
});

afterEach(() => {
  restoreTransport();
});

describe('the lookups’ sheet', () => {
  it('edits an area under its governorate’s name, from the area as it stands, the Arabic name focused', async () => {
    await renderSection();

    await userEvent.click(screen.getByRole('button', { name: heard('Edit: Ash-Shuja’iyya') }));

    const sheet = await screen.findByRole('dialog', { name: 'Edit area' });
    expect(sheet).toHaveAccessibleDescription('Gaza City');
    const arabic = within(sheet).getByRole('textbox', { name: 'Name in Arabic' });
    expect(arabic).toHaveValue('الشجاعية');
    expect(arabic).toHaveFocus();
    expect(within(sheet).getByRole('textbox', { name: 'Name in English' })).toHaveValue(
      'Ash-Shuja’iyya',
    );
    const active = within(sheet).getByRole('switch', { name: 'Active' });
    expect(active).not.toBeChecked();
    expect(active).toHaveAccessibleDescription('Hidden: not shown in filters and forms.');
    expect(within(sheet).getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('adds a governorate with its two names and no Active switch', async () => {
    await renderSection();

    await userEvent.click(screen.getByRole('button', { name: 'Add governorate' }));

    const sheet = await screen.findByRole('dialog', { name: 'Add governorate' });
    expect(within(sheet).getByRole('textbox', { name: 'Name in Arabic' })).toHaveValue('');
    expect(within(sheet).getByRole('textbox', { name: 'Name in English' })).toHaveValue('');
    expect(within(sheet).queryByRole('switch')).not.toBeInTheDocument();
  });

  it('describes an empty name by its error on Save, and focuses it', async () => {
    await renderSection();
    await userEvent.click(screen.getByRole('button', { name: 'Add area' }));
    const sheet = await screen.findByRole('dialog', { name: 'Add area' });

    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    const arabic = within(sheet).getByRole('textbox', { name: 'Name in Arabic' });
    await waitFor(() => {
      expect(arabic).toHaveFocus();
    });
    expect(arabic).toHaveAccessibleDescription('Enter the Arabic name');
    expect(arabic).toBeInvalid();
    expect(
      within(sheet).getByRole('textbox', { name: 'Name in English' }),
    ).toHaveAccessibleDescription('Enter the English name');
  });

  it('closes once saved, the focus back on the button that opened it', async () => {
    await renderSection();
    const edit = screen.getByRole('button', { name: heard('Edit: Ash-Shuja’iyya') });
    await userEvent.click(edit);
    const sheet = await screen.findByRole('dialog', { name: 'Edit area' });

    await userEvent.click(within(sheet).getByRole('switch', { name: 'Active' }));
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(edit).toHaveFocus();
  });

  it('adds the first governorate, the focus back on Add governorate once the list shows it', async () => {
    let list: AdminGovernorateWithAreas[] = [];
    fakeTransport((request) => {
      if (request.method === 'get') return ok(list);
      list = [GAZA];
      return ok(GAZA, 201);
    });
    const Wrapper = queryWrapper();
    render(
      <Wrapper>
        <GovernoratesSection />
      </Wrapper>,
    );
    await screen.findByRole('heading', { name: 'No governorates yet' });

    await userEvent.click(screen.getByRole('button', { name: 'Add governorate' }));
    const sheet = await screen.findByRole('dialog', { name: 'Add governorate' });
    await userEvent.type(within(sheet).getByRole('textbox', { name: 'Name in Arabic' }), 'غزة');
    await userEvent.type(
      within(sheet).getByRole('textbox', { name: 'Name in English' }),
      'Gaza City',
    );
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await screen.findByRole('heading', { name: 'Gaza City', level: 2 });
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Add governorate' })).toHaveFocus();
  });

  it('has no axe violations while open', async () => {
    await renderSection();
    await userEvent.click(screen.getByRole('button', { name: heard('Edit: Gaza City') }));
    await screen.findByRole('dialog', { name: 'Edit governorate' });

    expect(await axe(document.body)).toHaveNoViolations();
  });
});
