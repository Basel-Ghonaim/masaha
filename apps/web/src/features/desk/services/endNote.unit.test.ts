import { describe, expect, it } from 'vitest';
import { endNote } from './endNote';

const WORDS = {
  noEnd: 'No end date · it stays active until it is ended',
  noEndLimit: ({ limit }: { limit: string }) => `No end date · ends once ${limit} are used`,
  endOrLimit: ({ date, limit }: { date: string; limit: string }) =>
    `Ends on ${date} or once ${limit} are used, whichever comes first`,
  days: ({ count }: { count: number }) => `${String(count)} days`,
  hours: ({ count }: { count: number }) => `${String(count)} hours`,
};
const day = (date: string) => `<${date}>`;

describe('endNote', () => {
  it('words a total and an end, a total alone, and neither', () => {
    expect(endNote({ endsOn: '', totalDays: '', totalHours: '' }, WORDS, day)).toBe(
      'No end date · it stays active until it is ended',
    );
    expect(endNote({ endsOn: '', totalDays: '12', totalHours: '' }, WORDS, day)).toBe(
      'No end date · ends once 12 days are used',
    );
    expect(endNote({ endsOn: '', totalDays: '', totalHours: '40' }, WORDS, day)).toBe(
      'No end date · ends once 40 hours are used',
    );
    expect(endNote({ endsOn: '2026-11-30', totalDays: '12', totalHours: '' }, WORDS, day)).toBe(
      'Ends on <2026-11-30> or once 12 days are used, whichever comes first',
    );
  });

  it('says nothing for an end with no total, and reads digits typed in Arabic', () => {
    expect(endNote({ endsOn: '2026-11-30', totalDays: '', totalHours: '' }, WORDS, day)).toBeNull();
    expect(endNote({ endsOn: '', totalDays: '١٢', totalHours: '' }, WORDS, day)).toBe(
      'No end date · ends once 12 days are used',
    );
  });
});
