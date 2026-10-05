// The design-system layer's only public surface: consumers import from @shared/design-system,
// never from inside it (docs/frontend/design-system/foundation.md §3).
export {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  type AlertProps,
} from './components/feedback/Alert';
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './components/overlays/AlertDialog';
export { Avatar, AvatarFallback, AvatarImage, type AvatarProps } from './components/display/Avatar';
export { Badge, type BadgeProps } from './components/display/Badge';
export {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
  type BreadcrumbEllipsisProps,
  type BreadcrumbLinkProps,
  type BreadcrumbProps,
} from './components/navigation/Breadcrumb';
export { Button, type ButtonProps } from './components/actions/Button';
export { Calendar, type CalendarProps, type DateRange } from './components/fields/Calendar';
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/display/Card';
export { Checkbox, type CheckboxProps } from './components/fields/Checkbox';
export {
  Combobox,
  ComboboxContent,
  ComboboxGroup,
  ComboboxItem,
  ComboboxTrigger,
  type ComboboxContentProps,
  type ComboboxGroupProps,
  type ComboboxItemProps,
  type ComboboxProps,
  type ComboboxTriggerProps,
} from './components/fields/Combobox';
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  type DialogContentProps,
} from './components/overlays/Dialog';
export {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
  type DataTableColumnMeta,
  type DataTableProps,
  type DataTableSorting,
} from './components/data/DataTable';
export {
  DatePicker,
  DatePickerContent,
  DatePickerTrigger,
  type DatePickerContentProps,
  type DatePickerTriggerProps,
} from './components/fields/DatePicker';
export { DirectionProvider } from './lib/DirectionProvider';
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  type DropdownMenuItemProps,
} from './components/actions/DropdownMenu';
export { EmptyState, type EmptyStateProps } from './components/feedback/EmptyState';
export { Field, type FieldProps } from './components/fields/Field';
export {
  Input,
  InputAction,
  type InputActionProps,
  type InputProps,
} from './components/fields/Input';
export { LanguageToggle, type LanguageToggleProps } from './components/actions/LanguageToggle';
export {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationSummary,
  type PaginationEllipsisProps,
  type PaginationLinkProps,
  type PaginationNextProps,
  type PaginationPreviousProps,
  type PaginationProps,
} from './components/navigation/Pagination';
export {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from './components/overlays/Popover';
export {
  RadioGroup,
  RadioGroupItem,
  type RadioGroupItemProps,
  type RadioGroupProps,
} from './components/fields/RadioGroup';
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/fields/Select';
export { Separator, type SeparatorProps } from './components/display/Separator';
export {
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  type SheetContentProps,
} from './components/overlays/Sheet';
export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarText,
  SidebarTrigger,
  type SidebarHeaderProps,
  type SidebarMenuButtonProps,
  type SidebarProps,
  type SidebarTriggerProps,
} from './components/navigation/Sidebar';
export { Skeleton } from './components/feedback/Skeleton';
export { Spinner, type SpinnerProps } from './components/feedback/Spinner';
export { StatCard, type StatCardProps } from './components/display/StatCard';
export { Switch, type SwitchProps } from './components/fields/Switch';
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './components/data/Table';
export {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabsListProps,
} from './components/navigation/Tabs';
export { Textarea, type TextareaProps } from './components/fields/Textarea';
export { THEMES, type Theme } from './tokens/themes';
export { ThemeToggle, type ThemeToggleProps } from './components/actions/ThemeToggle';
export {
  ToggleGroup,
  ToggleGroupItem,
  type ToggleGroupItemProps,
  type ToggleGroupProps,
} from './components/fields/ToggleGroup';
export { Toaster, toast, type ToasterProps } from './components/feedback/Toast';
export {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  type TooltipProps,
} from './components/overlays/Tooltip';
export {
  ArrowDownIcon,
  ArrowEndIcon,
  ArrowStartIcon,
  ArrowUpIcon,
  CalendarIcon,
  ChartColumnIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronEndIcon,
  ChevronStartIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  CircleIcon,
  CoffeeIcon,
  ConciergeBellIcon,
  EllipsisIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeOffIcon,
  FlagIcon,
  GraduationCapIcon,
  IdCardIcon,
  InfoIcon,
  LanguagesIcon,
  LayoutDashboardIcon,
  ListChecksIcon,
  LoaderIcon,
  LockIcon,
  LogInIcon,
  LogOutIcon,
  MegaphoneIcon,
  MenuIcon,
  MoonIcon,
  PlugZapIcon,
  PresentationIcon,
  ReceiptIcon,
  ScrollTextIcon,
  SearchIcon,
  SearchXIcon,
  SettingsIcon,
  StoreIcon,
  SunIcon,
  TagIcon,
  TriangleAlertIcon,
  UserCogIcon,
  UsersIcon,
  WifiIcon,
  XIcon,
  ZapIcon,
  type IconProps,
} from './icons';
export { cn } from './lib/cn';
