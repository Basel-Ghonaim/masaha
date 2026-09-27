import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  CircleAlert,
  Eye,
  EyeOff,
  Info,
  Languages,
  LoaderCircle,
  LogIn,
  LogOut,
  Moon,
  Search,
  Sun,
  TriangleAlert,
  X,
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

export function CircleAlertIcon(props: IconProps) {
  return <Icon glyph={CircleAlert} {...props} />;
}

export function InfoIcon(props: IconProps) {
  return <Icon glyph={Info} {...props} />;
}

export function TriangleAlertIcon(props: IconProps) {
  return <Icon glyph={TriangleAlert} {...props} />;
}

export function EyeIcon(props: IconProps) {
  return <Icon glyph={Eye} {...props} />;
}

export function EyeOffIcon(props: IconProps) {
  return <Icon glyph={EyeOff} {...props} />;
}

export function XIcon(props: IconProps) {
  return <Icon glyph={X} {...props} />;
}

export function SearchIcon(props: IconProps) {
  return <Icon glyph={Search} {...props} />;
}

export function LoaderIcon(props: IconProps) {
  return <Icon glyph={LoaderCircle} {...props} />;
}

export function CheckIcon(props: IconProps) {
  return <Icon glyph={Check} {...props} />;
}

export function ChevronDownIcon(props: IconProps) {
  return <Icon glyph={ChevronDown} {...props} />;
}

export function ChevronUpIcon(props: IconProps) {
  return <Icon glyph={ChevronUp} {...props} />;
}

export function SunIcon(props: IconProps) {
  return <Icon glyph={Sun} {...props} />;
}

export function MoonIcon(props: IconProps) {
  return <Icon glyph={Moon} {...props} />;
}

export function LanguagesIcon(props: IconProps) {
  return <Icon glyph={Languages} {...props} />;
}
