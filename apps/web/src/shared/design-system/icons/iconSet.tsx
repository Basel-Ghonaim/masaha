import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  LoaderCircle,
  LogIn,
  LogOut,
  Search,
} from 'lucide-react';
import { Icon, type IconProps } from './Icon';

// Every icon the app uses is declared here once, with whether it mirrors. Directional icons are
// named for the reading direction: the start side is the left in LTR and the right in RTL, so each
// is drawn for LTR and mirrored in RTL.

export function ChevronStartIcon(props: IconProps) {
  return <Icon glyph={ChevronLeft} mirror {...props} />;
}

export function ChevronEndIcon(props: IconProps) {
  return <Icon glyph={ChevronRight} mirror {...props} />;
}

export function ArrowStartIcon(props: IconProps) {
  return <Icon glyph={ArrowLeft} mirror {...props} />;
}

export function ArrowEndIcon(props: IconProps) {
  return <Icon glyph={ArrowRight} mirror {...props} />;
}

export function LogInIcon(props: IconProps) {
  return <Icon glyph={LogIn} mirror {...props} />;
}

export function LogOutIcon(props: IconProps) {
  return <Icon glyph={LogOut} mirror {...props} />;
}

export function SearchIcon(props: IconProps) {
  return <Icon glyph={Search} {...props} />;
}

export function LoaderIcon(props: IconProps) {
  return <Icon glyph={LoaderCircle} {...props} />;
}
