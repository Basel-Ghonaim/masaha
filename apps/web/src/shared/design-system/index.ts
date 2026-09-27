// The design-system layer's only public surface: consumers import from @shared/design-system,
// never from inside it (docs/frontend/design-system/foundation.md §3).
export { Button, type ButtonProps } from './components/Button';
export { DirectionProvider } from './components/DirectionProvider';
export { Field, type FieldProps } from './components/Field';
export { Input, InputAction, type InputActionProps, type InputProps } from './components/Input';
export { Textarea, type TextareaProps } from './components/Textarea';
export {
  ArrowEndIcon,
  ArrowStartIcon,
  ChevronEndIcon,
  ChevronStartIcon,
  CircleAlertIcon,
  EyeIcon,
  EyeOffIcon,
  LoaderIcon,
  LogInIcon,
  LogOutIcon,
  SearchIcon,
  XIcon,
  type IconProps,
} from './icons';
export { cn } from './lib/cn';
