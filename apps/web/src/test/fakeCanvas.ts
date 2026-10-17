import { vi } from 'vitest';

/** What the fake browser decodes a file as, and whether it can. */
type FakeDecode = {
  /** The size the file is decoded at, before any bounding. */
  width?: number;
  height?: number;
  /** The browser cannot decode it, as with a HEIC on a browser that has no codec for it. */
  decodes?: boolean;
  /** The browser cannot draw on a canvas, as where canvas support is off. */
  draws?: boolean;
  /** The encoder yields nothing, as where the type is one the browser cannot write. */
  encodes?: boolean;
};

/** One decode, one draw and one encode: what the stand-in was asked for. */
export type FakeCanvas = {
  /** The options the file was decoded with, or `null` when it was never decoded. */
  decodeOptions: () => ImageBitmapOptions | undefined;
  /** The size the decoded photo was drawn at, or `null` when it never was. */
  drawn: () => { width: number; height: number } | null;
  /** The colour the canvas was filled with before the photo was drawn, or `null` when it was not. */
  backdrop: () => string | null;
  /** The type and quality the encoder was asked for, or `null` when it was never asked. */
  encoded: () => { type: string; quality: number | undefined } | null;
};

/**
 * Stands in for the browser's image work — `createImageBitmap` and a canvas that draws and encodes —
 * which jsdom has none of, as `fakeAdapter` stands in for the transport: the test decides what the
 * file decodes as and reads back what was asked of each step. It is reached through the globals the
 * production code uses, never a mocked module. Undo it with `vi.unstubAllGlobals()` and
 * `vi.restoreAllMocks()`.
 */
export function fakeCanvas({
  width = 4000,
  height = 3000,
  decodes = true,
  draws = true,
  encodes = true,
}: FakeDecode = {}): FakeCanvas {
  let decodeOptions: ImageBitmapOptions | undefined;
  let drawn: { width: number; height: number } | null = null;
  let backdrop: string | null = null;
  let encoded: { type: string; quality: number | undefined } | null = null;

  vi.stubGlobal(
    'createImageBitmap',
    decodes
      ? vi.fn((_file: Blob, options?: ImageBitmapOptions) => {
          decodeOptions = options;
          return Promise.resolve({ width, height, close: () => undefined });
        })
      : vi.fn(() => Promise.reject(new Error('The browser cannot decode this file.'))),
  );

  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() =>
    draws
      ? ({
          fillStyle: '#000000',
          fillRect() {
            backdrop = String((this as { fillStyle: unknown }).fillStyle);
          },
          drawImage: (_source: unknown, x: number, y: number, w: number, h: number) => {
            drawn = { width: w, height: h };
          },
        } as unknown as CanvasRenderingContext2D)
      : null,
  );

  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function toBlob(
    this: HTMLCanvasElement,
    done,
    type,
    quality,
  ) {
    encoded = { type: type ?? '', quality: quality ?? undefined };
    done(encodes ? new Blob([`encoded ${type ?? ''}`], { type: type ?? '' }) : null);
  });

  return {
    decodeOptions: () => decodeOptions,
    backdrop: () => backdrop,
    drawn: () => drawn,
    encoded: () => encoded,
  };
}

/** A file as the browser's file picker hands one over, with bytes of its own. */
export function fakeFile(name: string, type: string, bytes = 8): File {
  return new File([new Uint8Array(bytes).fill(7)], name, { type });
}
