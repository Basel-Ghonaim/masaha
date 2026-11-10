import type { Contact, ContactType } from '@masaha/shared/spaces';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { contactLinkOf } from './contactLink';

const WORDS = CATALOGUES.ar.directory.page.contacts;

const contact = (type: ContactType, value: string, label: string | null = null): Contact => ({
  type,
  value,
  label,
});

describe('contactLinkOf', () => {
  it('each contact its link; a phone’s carrier in its label', () => {
    expect(contactLinkOf(contact('WHATSAPP', '+970599111001'), WORDS)).toEqual({
      key: 'WHATSAPP:+970599111001',
      label: 'واتساب',
      ownName: false,
      value: '+970599111001',
      href: 'https://wa.me/970599111001',
      external: true,
    });
    expect(contactLinkOf(contact('PHONE', '+970599111002'), WORDS)).toMatchObject({
      label: 'اتصال — جوال',
      href: 'tel:+970599111002',
      external: false,
    });
    expect(contactLinkOf(contact('PHONE', '+970562000000'), WORDS).label).toBe('اتصال — أوريدو');
    expect(contactLinkOf(contact('PHONE', '+97082800000'), WORDS).label).toBe('اتصال');
    expect(contactLinkOf(contact('EMAIL', 'hi@noor.ps'), WORDS)).toMatchObject({
      label: 'بريد',
      href: 'mailto:hi@noor.ps',
      external: false,
    });
    expect(
      contactLinkOf(contact('INSTAGRAM', 'https://www.instagram.com/noorhub'), WORDS),
    ).toMatchObject({
      label: 'إنستغرام',
      href: 'https://www.instagram.com/noorhub',
      external: true,
    });
    expect(contactLinkOf(contact('WEBSITE', 'https://noor.ps'), WORDS)).toMatchObject({
      label: 'الموقع الإلكتروني',
      href: 'https://noor.ps',
      external: true,
    });
  });

  it.each([
    ['TELEGRAM', 'https://t.me/noorhub', 'تيليجرام'],
    ['X', 'https://x.com/noorhub', 'X (تويتر)'],
    ['LINKEDIN', 'https://www.linkedin.com/company/noorhub', 'لينكدإن'],
    ['YOUTUBE', 'https://www.youtube.com/@noorhub', 'يوتيوب'],
  ] as const)('a %s address opens in a new tab, named by its network', (type, value, label) => {
    expect(contactLinkOf(contact(type, value), WORDS)).toEqual({
      key: `${type}:${value}`,
      label,
      ownName: false,
      value,
      href: value,
      external: true,
    });
  });

  it('a contact of another kind is named by its own name: a number calls, a link opens', () => {
    expect(contactLinkOf(contact('OTHER', 'https://discord.gg/noor', 'ديسكورد'), WORDS)).toEqual({
      key: 'OTHER:https://discord.gg/noor',
      label: 'ديسكورد',
      ownName: true,
      value: 'https://discord.gg/noor',
      href: 'https://discord.gg/noor',
      external: true,
    });
    expect(contactLinkOf(contact('OTHER', '+970599111003', 'سيجنال'), WORDS)).toMatchObject({
      label: 'سيجنال',
      href: 'tel:+970599111003',
      external: false,
    });
  });
});
