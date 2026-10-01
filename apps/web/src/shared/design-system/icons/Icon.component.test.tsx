import { render } from '@testing-library/react';
import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';
import { DirectionProvider } from '../lib/DirectionProvider';
import {
  ArrowEndIcon,
  ArrowStartIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronEndIcon,
  ChevronStartIcon,
  ChevronUpIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  LanguagesIcon,
  LoaderIcon,
  LogInIcon,
  LogOutIcon,
  MoonIcon,
  SearchIcon,
  SunIcon,
  XIcon,
  type IconProps,
} from '.';

const MIRRORED = '-scale-x-100';

const DIRECTIONAL = [
  ChevronStartIcon,
  ChevronEndIcon,
  ArrowStartIcon,
  ArrowEndIcon,
  LogInIcon,
  LogOutIcon,
].map((icon) => ({ name: icon.name, icon }));

const NON_DIRECTIONAL = [
  SearchIcon,
  LoaderIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  XIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  SunIcon,
  MoonIcon,
  LanguagesIcon,
].map((icon) => ({ name: icon.name, icon }));

function svgOf(dir: 'ltr' | 'rtl', Glyph: ComponentType<IconProps>, props: IconProps = {}) {
  const { container } = render(
    <DirectionProvider dir={dir}>
      <Glyph {...props} />
    </DirectionProvider>,
  );
  return container.querySelector('svg');
}

describe('icon mirroring', () => {
  it.each(DIRECTIONAL)('mirrors $name in RTL', ({ icon }) => {
    expect(svgOf('rtl', icon)).toHaveClass(MIRRORED);
  });

  it.each(DIRECTIONAL)('does not mirror $name in LTR', ({ icon }) => {
    expect(svgOf('ltr', icon)).not.toHaveClass(MIRRORED);
  });

  it.each(NON_DIRECTIONAL)('never mirrors $name', ({ icon }) => {
    expect(svgOf('rtl', icon)).not.toHaveClass(MIRRORED);
  });

  it('keeps the classes it is given', () => {
    expect(svgOf('rtl', ChevronEndIcon, { className: 'size-4' })).toHaveClass('size-4', MIRRORED);
  });
});
