import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

// The text styles and shadows tokens/tailwind.css defines. tailwind-merge only knows Tailwind's
// default names (text-sm, shadow-md), so it would read text-body as a text colour and drop it
// next to text-primary.
const TEXT_STYLES = [
  'display',
  'heading-1',
  'heading-2',
  'heading-3',
  'body',
  'body-sm',
  'label',
  'caption',
];
const SHADOWS = ['raised', 'floating', 'overlay'];

// Pure, so a bundle that imports the layer without using cn leaves tailwind-merge out.
const twMerge = /* @__PURE__ */ extendTailwindMerge({
  extend: { theme: { text: TEXT_STYLES, shadow: SHADOWS } },
});

/** Joins class names; when two classes set the same thing, the later one wins. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
