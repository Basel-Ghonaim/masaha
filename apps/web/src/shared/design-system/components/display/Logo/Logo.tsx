import type { ComponentProps } from 'react';
import { cn } from '../../../lib/cn';
import {
  DOTS,
  FULL_VIEW_BOX,
  MARK_DOTS_CLIP,
  MARK_DOTS_SHIFT,
  MARK_LETTER_CLIP,
  MARK_LETTER_MIRROR,
  MARK_VIEW_BOX,
  WORDS,
} from './drawing';

export type LogoProps = Omit<ComponentProps<'svg'>, 'children'> & {
  /** `full`: «مساحة» over "MASAHA" (the default); `mark`: the ة with its two dots. */
  form?: 'full' | 'mark';
  /**
   * The logo's accessible name, «مساحة» or "Masaha" in the interface's language. Without one the
   * logo is decorative: hidden from assistive technology, for a place whose name is beside it.
   */
  label?: string;
};

type Clip = { x: number; y: number; width: number; height: number };

/** A nested viewport clips what it holds to its rectangle, so the mark needs no clip-path id. */
function Clipped({ clip, children }: { clip: Clip; children: ComponentProps<'svg'>['children'] }) {
  const { x, y, width, height } = clip;
  return (
    <svg x={x} y={y} width={width} height={height} viewBox={[x, y, width, height].join(' ')}>
      {children}
    </svg>
  );
}

/**
 * Masaha's logo (docs/frontend/design-system/foundation.md §16), drawn inline in the theme's ink
 * (`foreground`) and spark, so it follows the theme. The caller sizes it by its height (`h-10`,
 * `size-9`); its width follows the drawing's proportions. It is never mirrored: the same drawing
 * in both directions.
 */
export function Logo({ form = 'full', label, className, ...props }: LogoProps) {
  const name = label
    ? { role: 'img', 'aria-label': label }
    : { 'aria-hidden': true, focusable: 'false' as const };
  const words = <path className="fill-foreground" fillRule="evenodd" d={WORDS} />;
  const dots = <path className="fill-spark" fillRule="evenodd" d={DOTS} />;

  return (
    <svg
      data-slot="logo"
      xmlns="http://www.w3.org/2000/svg"
      viewBox={form === 'full' ? FULL_VIEW_BOX : MARK_VIEW_BOX}
      className={cn(
        'w-auto shrink-0',
        form === 'full' ? 'aspect-[2473/903]' : 'aspect-square',
        className,
      )}
      {...name}
      {...props}
    >
      {form === 'full' ? (
        <>
          {words}
          {dots}
        </>
      ) : (
        <>
          <Clipped clip={MARK_LETTER_CLIP}>{words}</Clipped>
          <g transform={MARK_LETTER_MIRROR}>
            <Clipped clip={MARK_LETTER_CLIP}>{words}</Clipped>
          </g>
          <g transform={MARK_DOTS_SHIFT}>
            <Clipped clip={MARK_DOTS_CLIP}>{dots}</Clipped>
          </g>
        </>
      )}
    </svg>
  );
}
