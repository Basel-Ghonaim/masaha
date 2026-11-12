import { describe, expect, it } from 'vitest';
import { contactsInput, contactsValues, labelFor } from './contactsForm';

describe('contactsValues', () => {
  it('holds the saved contacts with their names, or one new WhatsApp row with none', () => {
    expect(
      contactsValues({
        contacts: [{ type: 'OTHER', value: 'https://discord.gg/x', label: 'ديسكورد' }],
      }),
    ).toEqual({ contacts: [{ type: 'OTHER', value: 'https://discord.gg/x', label: 'ديسكورد' }] });
    expect(contactsValues({ contacts: [] })).toEqual({
      contacts: [{ type: 'WHATSAPP', value: '', label: null }],
    });
  });
});

describe('labelFor', () => {
  it('gives a row turned into «وسيلة أخرى» a name to type, and drops it once it leaves', () => {
    expect(labelFor('OTHER', null)).toBe('');
    expect(labelFor('OTHER', 'ديسكورد')).toBe('ديسكورد');
    expect(labelFor('TELEGRAM', 'ديسكورد')).toBeNull();
  });
});

describe('contactsInput', () => {
  it('sends «وسيلة أخرى»’s name as typed and every other type’s as none', () => {
    expect(
      contactsInput({
        contacts: [
          { type: 'OTHER', value: 'discord.gg/x', label: ' ديسكورد ' },
          { type: 'WHATSAPP', value: '0599123456', label: 'stale' },
          { type: 'OTHER', value: 'discord.gg/y', label: null },
        ],
      }),
    ).toEqual({
      contacts: [
        { type: 'OTHER', value: 'discord.gg/x', label: ' ديسكورد ' },
        { type: 'WHATSAPP', value: '0599123456', label: null },
        { type: 'OTHER', value: 'discord.gg/y', label: '' },
      ],
    });
  });
});
