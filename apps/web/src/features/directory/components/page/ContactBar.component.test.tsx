import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { axe } from 'vitest-axe';
import { ContactBar } from './ContactBar';

describe('ContactBar', () => {
  it('draws «WhatsApp» as the page’s main action and «Call» outlined; axe-clean', async () => {
    const { container } = render(
      <ContactBar
        bar={{
          label: 'Quick contact',
          whatsapp: { label: 'WhatsApp', href: 'https://wa.me/970599000000' },
          call: { label: 'Call', href: 'tel:+970599000000' },
        }}
      />,
    );

    const whatsapp = screen.getByRole('link', { name: 'WhatsApp' });
    const call = screen.getByRole('link', { name: 'Call' });
    expect(whatsapp).toHaveClass('bg-main-action');
    expect(call).not.toHaveClass('bg-main-action');
    expect(call).not.toHaveClass('bg-primary');
    expect(await axe(container)).toHaveNoViolations();
  });
});
