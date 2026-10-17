import { UnsupportedImageError } from '../types/UnsupportedImageError';
import { fitInside, SHRINK_DEFAULTS } from './photoGeometry';

/** The decoded photo, and the drawing surface it is put on, both freed as soon as they are used. */
type Decoded = { source: CanvasImageSource; width: number; height: number };

/**
 * Decodes a file the way a phone's photo must be read: turned by its EXIF orientation, because the
 * re-encode below drops the EXIF with everything else in it, and the server's own `autoOrient` then
 * has nothing left to turn.
 */
async function decode(file: File): Promise<Decoded> {
  if (typeof createImageBitmap !== 'function') throw new UnsupportedImageError();
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    return { source: bitmap, width: bitmap.width, height: bitmap.height };
  } catch {
    throw new UnsupportedImageError();
  }
}

/** A canvas holding the decoded photo at its bounded size, or nothing where there is no canvas. */
function draw(decoded: Decoded): HTMLCanvasElement | null {
  const canvas = document.createElement('canvas');
  const { width, height } = fitInside(decoded.width, decoded.height, SHRINK_DEFAULTS.maxSide);
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context === null) return null;
  // A JPEG has no alpha: left alone, a transparent PNG would be flattened onto black.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  context.drawImage(decoded.source, 0, 0, width, height);
  return canvas;
}

/** The canvas's bytes, or nothing where the browser has no encoder for the type. */
function encode(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob(resolve, SHRINK_DEFAULTS.mimeType, SHRINK_DEFAULTS.quality);
  });
}

/** The file's name without its extension, so the re-encoded file keeps the name the admin gave. */
const stemOf = (name: string) => name.replace(/\.[^.]*$/, '');

/**
 * A photo as it travels: its longest side bounded to `SHRINK_DEFAULTS.maxSide`, its EXIF dropped and
 * its orientation already applied, re-encoded at `SHRINK_DEFAULTS.quality` as
 * `SHRINK_DEFAULTS.mimeType` — one type every browser can write — under the name the admin chose.
 *
 * It rejects with `UnsupportedImageError` where the browser cannot decode the file, cannot draw on a
 * canvas, or cannot write the result out: such a file is refused here, and no request is made for it.
 */
export async function shrinkImage(file: File): Promise<File> {
  const decoded = await decode(file);
  try {
    const canvas = draw(decoded);
    if (canvas === null) throw new UnsupportedImageError();
    const blob = await encode(canvas);
    if (blob === null) throw new UnsupportedImageError();
    return new File([blob], `${stemOf(file.name)}.jpg`, { type: SHRINK_DEFAULTS.mimeType });
  } finally {
    const bitmap = decoded.source as Partial<ImageBitmap>;
    bitmap.close?.();
  }
}
