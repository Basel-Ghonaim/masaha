import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { axe } from 'vitest-axe';
import { LanguageToggle } from '.';

describe('LanguageToggle', () => {
  it('offers the other language by its own name, marked with its language', async () => {
    const onClick = vi.fn();
    render(<LanguageToggle lang="en" label="English" onClick={onClick} />);

    await userEvent.click(screen.getByRole('button', { name: 'English' }));

    expect(screen.getByText('English')).toHaveAttribute('lang', 'en');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('has no accessibility violations', async () => {
    const { container } = render(
      <div lang="en">
        <LanguageToggle lang="ar" label="العربية" />
      </div>,
    );

    expect(await axe(container)).toHaveNoViolations();
  });
});
