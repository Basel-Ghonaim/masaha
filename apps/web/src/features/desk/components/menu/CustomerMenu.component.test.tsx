import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { CustomerMenu } from './CustomerMenu';

function renderMenu(archive: { label: string; run: () => void } | null = null) {
  const edit = vi.fn();
  render(
    <MemoryRouter>
      <main>
        <CustomerMenu
          menu={{
            label: 'More actions: Sara Khalid',
            file: { label: 'Customer file', to: '/file/4' },
            edit: { label: 'Edit details', run: edit },
            archive,
          }}
        />
      </main>
    </MemoryRouter>,
  );
  return { edit };
}

describe('CustomerMenu', () => {
  it('is named by the customer, its menu too; axe-clean', async () => {
    const user = userEvent.setup();
    renderMenu();

    const trigger = screen.getByRole('button', { name: 'More actions: Sara Khalid' });
    await user.click(trigger);
    const menu = await screen.findByRole('menu', { name: 'More actions: Sara Khalid' });
    expect(screen.getByRole('menuitem', { name: 'Customer file' })).toHaveAttribute(
      'href',
      '/file/4',
    );
    expect(await axe(menu)).toHaveNoViolations();
    expect(screen.queryByRole('menuitem', { name: 'Archive…' })).toBeNull();
  });

  it('marks «Archive…» destructive, for the owner', async () => {
    const user = userEvent.setup();
    const archive = vi.fn();
    renderMenu({ label: 'Archive…', run: archive });

    await user.click(screen.getByRole('button', { name: 'More actions: Sara Khalid' }));
    const item = await screen.findByRole('menuitem', { name: 'Archive…' });
    expect(item).toHaveAttribute('data-variant', 'destructive');
    await user.click(item);
    expect(archive).toHaveBeenCalledTimes(1);
  });

  it('gives the focus back to its trigger once closed', async () => {
    const user = userEvent.setup();
    const { edit } = renderMenu();

    const trigger = screen.getByRole('button', { name: 'More actions: Sara Khalid' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(trigger).toHaveFocus();

    await user.click(trigger);
    await user.click(await screen.findByRole('menuitem', { name: 'Edit details' }));
    expect(edit).toHaveBeenCalledTimes(1);
  });
});
