import { afterEach, describe, expect, it, vi } from 'vitest';
import { downloadFile } from './downloadFile';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('downloadFile', () => {
  it('saves the text as a UTF-8 CSV under its name, and lets its address go', async () => {
    const created: Blob[] = [];
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      created.push(blob as Blob);
      return 'blob:masaha/1';
    });
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const clicked: HTMLAnchorElement[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicked.push(this);
    });

    downloadFile('payments-2026-10.csv', '﻿a,b');

    expect(clicked).toHaveLength(1);
    expect(clicked[0]?.download).toBe('payments-2026-10.csv');
    expect(clicked[0]?.href).toBe('blob:masaha/1');
    expect(created[0]?.type).toBe('text/csv;charset=utf-8');
    // The byte order mark is kept in the file (Blob.text() would drop it while reading).
    const bytes = new Uint8Array((await created[0]?.arrayBuffer()) ?? new ArrayBuffer(0));
    expect([...bytes]).toEqual([0xef, 0xbb, 0xbf, 0x61, 0x2c, 0x62]);
    expect(revoke).toHaveBeenCalledWith('blob:masaha/1');
    expect(document.querySelector('a[download]')).toBeNull();
  });
});
