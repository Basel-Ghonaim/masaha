// The design-system layer's only public surface: consumers import from @shared/design-system,
// never from inside it (docs/frontend/design-system/foundation.md §3).
export {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  type AlertProps,
} from './components/Alert';
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
} from './components/AlertDialog';
export { Avatar, AvatarFallback, AvatarImage, type AvatarProps } from './components/Avatar';
export { Badge, type BadgeProps } from './components/Badge';
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
} from './components/Breadcrumb';
export { Button, type ButtonProps } from './components/Button';
export { Calendar, type CalendarProps, type DateRange } from './components/Calendar';
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './components/Card';
export { Checkbox, type CheckboxProps } from './components/Checkbox';
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
} from './components/Combobox';
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
} from './components/Dialog';
export {
  DataTable,
  createDataTableColumnHelper,
  type DataTableColumn,
  type DataTableColumnMeta,
  type DataTableProps,
  type DataTableSorting,
} from './components/DataTable';
export {
  DatePicker,
  DatePickerContent,
  DatePickerTrigger,
  type DatePickerContentProps,
  type DatePickerTriggerProps,
} from './components/DatePicker';
export { DirectionProvider } from './components/DirectionProvider';
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
} from './components/DropdownMenu';
export { EmptyState, type EmptyStateProps } from './components/EmptyState';
export { Field, type FieldProps } from './components/Field';
export { Input, InputAction, type InputActionProps, type InputProps } from './components/Input';
export { LanguageToggle, type LanguageToggleProps } from './components/LanguageToggle';
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
} from './components/Pagination';
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from './components/Popover';
export {
  RadioGroup,
  RadioGroupItem,
  type RadioGroupItemProps,
  type RadioGroupProps,
} from './components/RadioGroup';
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from './components/Select';
export { Separator, type SeparatorProps } from './components/Separator';
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
} from './components/Sheet';
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
  SidebarTrigger,
  type SidebarHeaderProps,
  type SidebarMenuButtonProps,
  type SidebarProps,
  type SidebarTriggerProps,
} from './components/Sidebar';
export { Skeleton } from './components/Skeleton';
export { Spinner, type SpinnerProps } from './components/Spinner';
export { StatCard, type StatCardProps } from './components/StatCard';
export { Switch, type SwitchProps } from './components/Switch';
export {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from './components/Table';
export { Tabs, TabsContent, TabsList, TabsTrigger, type TabsListProps } from './components/Tabs';
export { Textarea, type TextareaProps } from './components/Textarea';
export { ThemeToggle, type ThemeToggleProps } from './components/ThemeToggle';
export {
  ToggleGroup,
  ToggleGroupItem,
  type ToggleGroupItemProps,
  type ToggleGroupProps,
} from './components/ToggleGroup';
export { Toaster, toast, type ToasterProps } from './components/Toast';
export { Tooltip, TooltipContent, TooltipTrigger, type TooltipProps } from './components/Tooltip';
export {
  ArrowDownIcon,
  ArrowEndIcon,
  ArrowStartIcon,
  ArrowUpIcon,
  CalendarIcon,
  CheckIcon,
  ChevronDownIcon,
  ChevronEndIcon,
  ChevronStartIcon,
  ChevronUpIcon,
  ChevronsUpDownIcon,
  CircleAlertIcon,
  CircleCheckIcon,
  EllipsisIcon,
  EllipsisVerticalIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
  LanguagesIcon,
  LoaderIcon,
  LogInIcon,
  LogOutIcon,
  MenuIcon,
  MoonIcon,
  SearchIcon,
  SearchXIcon,
  SunIcon,
  TriangleAlertIcon,
  UsersIcon,
  XIcon,
  type IconProps,
} from './icons';
export { cn } from './lib/cn';
