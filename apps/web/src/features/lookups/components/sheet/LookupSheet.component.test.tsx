import type { AdminGovernorateWithAreas } from '@masaha/shared/lookups';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { bodyOf, fakeTransport, ok, restoreTransport } from '../../../../test/fakeTransport';
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

/** Eleven areas of Gaza City, in order: more than ten, so a sheet offers a position. */
const ELEVEN = Array.from({ length: 11 }, (_, index) => ({
  id: 100 + index,
  governorateId: 2,
  nameAr: `منطقة ${String(index + 1)}`,
  nameEn: `Area ${String(index + 1)}`,
  isActive: true,
}));

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
    expect(within(sheet).getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });

  it('the edit sheet has no active switch', async () => {
    await renderSection();

    for (const name of ['Edit: Gaza City', 'Edit: Ash-Shuja’iyya']) {
      await userEvent.click(screen.getByRole('button', { name: heard(name) }));
      const sheet = await screen.findByRole('dialog');
      expect(within(sheet).getAllByRole('textbox')).toHaveLength(2);
      expect(within(sheet).queryByRole('switch')).not.toBeInTheDocument();
      expect(within(sheet).queryByText('Hidden: not shown in filters and forms.')).toBeNull();
      await userEvent.click(within(sheet).getByRole('button', { name: 'Close' }));
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    }
    // The row keeps its switch: the one control of whether it is shown.
    expect(screen.getByRole('switch', { name: heard('Shown: Ash-Shuja’iyya') })).not.toBeChecked();
  });

  it('a list of 11 offers «الترتيب» and moves the row there', async () => {
    const requests = fakeTransport((request) =>
      request.method === 'get'
        ? ok([{ ...GAZA, areas: ELEVEN }])
        : request.method === 'put'
          ? { status: 204 }
          : ok(ELEVEN[10]),
    );
    const Wrapper = queryWrapper();
    render(
      <Wrapper>
        <GovernoratesSection />
      </Wrapper>,
    );
    await screen.findByRole('heading', { name: 'Gaza City', level: 2 });

    await userEvent.click(screen.getByRole('button', { name: heard('Edit: Area 11') }));
    const sheet = await screen.findByRole('dialog', { name: 'Edit area' });
    const position = within(sheet).getByRole('textbox', { name: 'Position' });
    expect(position).toHaveValue('11');
    expect(position).toHaveAccessibleDescription('From 1 to 11');

    await userEvent.clear(position);
    await userEvent.type(position, '١٢');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));
    await waitFor(() => {
      expect(position).toBeInvalid();
    });
    expect(position).toHaveFocus();
    expect(requests.filter(({ method }) => method !== 'get')).toEqual([]);

    // Arabic-Indic digits are read as the number they are.
    await userEvent.clear(position);
    await userEvent.type(position, '١');
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    const writes = requests.filter(({ method }) => method !== 'get');
    expect(writes.map(({ method, url }) => `${String(method)} ${String(url)}`)).toEqual([
      'patch /admin/areas/110',
      'put /admin/governorates/2/areas/order',
    ]);
    expect(bodyOf(writes[0])).toEqual({ nameAr: 'منطقة 11', nameEn: 'Area 11' });
    expect(bodyOf(writes[1])).toEqual({
      ids: [110, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109],
    });
  });

  it('a list of 10 offers no position, and saves the names alone', async () => {
    const requests = fakeTransport((request) =>
      request.method === 'get' ? ok([{ ...GAZA, areas: ELEVEN.slice(0, 10) }]) : ok(ELEVEN[9]),
    );
    const Wrapper = queryWrapper();
    render(
      <Wrapper>
        <GovernoratesSection />
      </Wrapper>,
    );
    await screen.findByRole('heading', { name: 'Gaza City', level: 2 });

    await userEvent.click(screen.getByRole('button', { name: heard('Edit: Area 10') }));
    const sheet = await screen.findByRole('dialog', { name: 'Edit area' });
    expect(within(sheet).queryByRole('textbox', { name: 'Position' })).not.toBeInTheDocument();
    await userEvent.click(within(sheet).getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    expect(requests.filter(({ method }) => method !== 'get').map(({ method }) => method)).toEqual([
      'patch',
    ]);
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
