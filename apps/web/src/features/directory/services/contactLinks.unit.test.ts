import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { contactLinkOf } from './contactLinks';

const WORDS = CATALOGUES.ar.directory.page.contacts;

describe('contactLinkOf', () => {
  it('each contact its link; a phone’s carrier in its label', () => {
    expect(contactLinkOf({ type: 'WHATSAPP', value: '+970599111001' }, WORDS)).toEqual({
      key: 'WHATSAPP:+970599111001',
      label: 'واتساب',
      value: '+970599111001',
      href: 'https://wa.me/970599111001',
      external: true,
    });
    expect(contactLinkOf({ type: 'PHONE', value: '+970599111002' }, WORDS)).toMatchObject({
      label: 'اتصال — جوال',
      href: 'tel:+970599111002',
      external: false,
    });
    expect(contactLinkOf({ type: 'PHONE', value: '+970562000000' }, WORDS).label).toBe(
      'اتصال — أوريدو',
    );
    expect(contactLinkOf({ type: 'PHONE', value: '+97082800000' }, WORDS).label).toBe('اتصال');
    expect(contactLinkOf({ type: 'EMAIL', value: 'hi@noor.ps' }, WORDS)).toMatchObject({
      label: 'بريد',
      href: 'mailto:hi@noor.ps',
      external: false,
    });
    expect(
      contactLinkOf({ type: 'INSTAGRAM', value: 'https://www.instagram.com/noorhub' }, WORDS),
    ).toMatchObject({
      label: 'إنستغرام',
      href: 'https://www.instagram.com/noorhub',
      external: true,
    });
    expect(contactLinkOf({ type: 'WEBSITE', value: 'https://noor.ps' }, WORDS)).toMatchObject({
      label: 'الموقع الإلكتروني',
      href: 'https://noor.ps',
      external: true,
    });
  });
});
