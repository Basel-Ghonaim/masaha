import { DATA_REPORT_FIELDS } from '@masaha/shared/data-reports';
import { CATALOGUES } from '@shared/copy';
import { describe, expect, it } from 'vitest';
import { fieldLabel, messageView, reportDay, statusView } from './reportView';

const EN = CATALOGUES.en.dataReports;
const AR = CATALOGUES.ar.dataReports;

describe('fieldLabel', () => {
  it('words each of the six field groups', () => {
    expect(DATA_REPORT_FIELDS.map((field) => fieldLabel(field, EN.fields))).toEqual([
      'Prices',
      'Opening hours',
      'Contact',
      'Location',
      'Amenities',
      'Other',
    ]);
    expect(DATA_REPORT_FIELDS.map((field) => fieldLabel(field, AR.fields))).toEqual([
      'الأسعار',
      'ساعات العمل',
      'التواصل',
      'الموقع',
      'المرافق',
      'أخرى',
    ]);
  });
});

describe('statusView', () => {
  it('says an open report «جديد» to the staff and «قيد المراجعة» to its reporter, each decision by its tone', () => {
    expect(statusView('OPEN', AR.statuses, 'staff')).toEqual({ label: 'جديد', tone: 'info' });
    expect(statusView('OPEN', AR.statuses, 'reporter')).toEqual({
      label: 'قيد المراجعة',
      tone: 'info',
    });
    expect(statusView('RESOLVED', AR.statuses, 'staff')).toEqual({
      label: 'تم التصحيح',
      tone: 'success',
    });
    expect(statusView('DISMISSED', EN.statuses, 'reporter')).toEqual({
      label: 'Not accepted',
      tone: 'neutral',
    });
  });
});

describe('reportDay', () => {
  const NOW = new Date('2026-10-28T09:00:00.000Z');

  it('says the Gaza day a report was made, never its time', () => {
    // 21:30 UTC on the 20th is 00:30 on the 21st in Gaza (UTC+3 in October).
    expect(reportDay('2026-10-20T21:30:00.000Z', 'ar', NOW)).toBe('21 أكتوبر');
    expect(reportDay('2026-10-20T21:30:00.000Z', 'en', NOW)).toBe('21 October');
    // 20:59 UTC on the 20th is still the 20th in Gaza.
    expect(reportDay('2026-10-20T20:59:00.000Z', 'en', NOW)).toBe('20 October');
  });

  it('adds the year when it is not the current one, on Gaza’s calendar', () => {
    // 22:30 UTC on 31 December 2025 is already 1 January 2026 in Gaza (UTC+2 in winter).
    expect(reportDay('2025-12-31T22:30:00.000Z', 'en', NOW)).toBe('1 January');
    expect(reportDay('2025-12-31T20:00:00.000Z', 'en', NOW)).toBe('31 December 2025');
    expect(reportDay('2025-03-04T09:00:00.000Z', 'ar', NOW)).toBe('4 مارس 2025');
  });
});

describe('messageView', () => {
  it('shows a message as it is, and says, muted, that there is none', () => {
    expect(messageView('Opens at 9', EN)).toEqual({ text: 'Opens at 9', none: false });
    expect(messageView(null, AR)).toEqual({ text: 'لم يكتب المُبلِّغ تفاصيل.', none: true });
  });
});
