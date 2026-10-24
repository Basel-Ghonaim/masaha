import { describe, expect, it } from 'vitest';
import { findConflictMarkers } from './checkConflicts.ts';

const hitsOf = (text: string) =>
  findConflictMarkers(text).map((h) => `${String(h.line)}:${h.marker}`);

describe('findConflictMarkers', () => {
  it('finds a real conflict block', () => {
    const text = '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> branch\n';
    expect(hitsOf(text)).toEqual(['1:<<<<<<<', '3:=======', '5:>>>>>>>']);
  });

  it('ignores a setext heading underline', () => {
    const text = '# Title\n=======\n\nBody\n';
    expect(hitsOf(text)).toEqual([]);
  });

  it('ignores a marker not at column 0', () => {
    const text = "const x = '<<<<<<< HEAD';\n";
    expect(hitsOf(text)).toEqual([]);
  });

  it('passes a clean file', () => {
    const text = '# Hello\n\nWorld\n';
    expect(hitsOf(text)).toEqual([]);
  });

  it('finds a minimal conflict block', () => {
    const text = '<<<<<<< HEAD\n=======\n>>>>>>> branch\n';
    expect(hitsOf(text)).toEqual(['1:<<<<<<<', '2:=======', '3:>>>>>>>']);
  });

  it('finds multiple conflict blocks', () => {
    const text =
      '<<<<<<< HEAD\na\n=======\nb\n>>>>>>> b1\n\n<<<<<<< HEAD\nc\n=======\nd\n>>>>>>> b2\n';
    expect(hitsOf(text)).toEqual([
      '1:<<<<<<<',
      '3:=======',
      '5:>>>>>>>',
      '7:<<<<<<<',
      '9:=======',
      '11:>>>>>>>',
    ]);
  });

  it('finds a conflict with CRLF line endings', () => {
    const text = '<<<<<<< HEAD\r\nours\r\n=======\r\ntheirs\r\n>>>>>>> branch\r\n';
    expect(hitsOf(text)).toEqual(['1:<<<<<<<', '3:=======', '5:>>>>>>>']);
  });

  it('finds a diff3 conflict with base marker', () => {
    const text = '<<<<<<< HEAD\nours\n||||||| base\nbase\n=======\ntheirs\n>>>>>>> branch\n';
    expect(hitsOf(text)).toEqual(['1:<<<<<<<', '3:|||||||', '5:=======', '7:>>>>>>>']);
  });
});
