// The design-system layer's only public surface: consumers import from @shared/design-system,
// never from inside it (docs/frontend/design-system/foundation.md §3).
export { DirectionProvider } from './components/DirectionProvider';
export {
  ArrowEndIcon,
  ArrowStartIcon,
  ChevronEndIcon,
  ChevronStartIcon,
  LogInIcon,
  LogOutIcon,
  SearchIcon,
  type IconProps,
} from './icons';
export { cn } from './lib/cn';
