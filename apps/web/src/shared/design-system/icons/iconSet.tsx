import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Calendar,
  ChartColumn,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronsUpDown,
  Circle,
  CircleAlert,
  CircleCheck,
  Coffee,
  ConciergeBell,
  Ellipsis,
  EllipsisVertical,
  Eye,
  EyeOff,
  Flag,
  GraduationCap,
  IdCard,
  Info,
  Languages,
  LayoutDashboard,
  ListChecks,
  LoaderCircle,
  Lock,
  LogIn,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  PlugZap,
  Presentation,
  Receipt,
  ScrollText,
  Search,
  SearchX,
  Settings,
  Store,
  Sun,
  Tag,
  TriangleAlert,
  UserCog,
  Users,
  Wifi,
  X,
  Zap,
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

export function CircleCheckIcon(props: IconProps) {
  return <Icon glyph={CircleCheck} {...props} />;
}

export function CircleIcon(props: IconProps) {
  return <Icon glyph={Circle} {...props} />;
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

export function SearchXIcon(props: IconProps) {
  return <Icon glyph={SearchX} {...props} />;
}

export function UsersIcon(props: IconProps) {
  return <Icon glyph={Users} {...props} />;
}

export function WifiIcon(props: IconProps) {
  return <Icon glyph={Wifi} {...props} />;
}

export function ZapIcon(props: IconProps) {
  return <Icon glyph={Zap} {...props} />;
}

export function PlugZapIcon(props: IconProps) {
  return <Icon glyph={PlugZap} {...props} />;
}

export function CoffeeIcon(props: IconProps) {
  return <Icon glyph={Coffee} {...props} />;
}

export function PresentationIcon(props: IconProps) {
  return <Icon glyph={Presentation} {...props} />;
}

export function GraduationCapIcon(props: IconProps) {
  return <Icon glyph={GraduationCap} {...props} />;
}

export function LockIcon(props: IconProps) {
  return <Icon glyph={Lock} {...props} />;
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

export function EllipsisIcon(props: IconProps) {
  return <Icon glyph={Ellipsis} {...props} />;
}

export function EllipsisVerticalIcon(props: IconProps) {
  return <Icon glyph={EllipsisVertical} {...props} />;
}

export function MenuIcon(props: IconProps) {
  return <Icon glyph={Menu} {...props} />;
}

export function CalendarIcon(props: IconProps) {
  return <Icon glyph={Calendar} {...props} />;
}

export function ArrowUpIcon(props: IconProps) {
  return <Icon glyph={ArrowUp} {...props} />;
}

export function ArrowDownIcon(props: IconProps) {
  return <Icon glyph={ArrowDown} {...props} />;
}

export function ChevronsUpDownIcon(props: IconProps) {
  return <Icon glyph={ChevronsUpDown} {...props} />;
}

// The dashboard's navigation.

export function LayoutDashboardIcon(props: IconProps) {
  return <Icon glyph={LayoutDashboard} {...props} />;
}

export function ConciergeBellIcon(props: IconProps) {
  return <Icon glyph={ConciergeBell} {...props} />;
}

export function ReceiptIcon(props: IconProps) {
  return <Icon glyph={Receipt} {...props} />;
}

export function ChartColumnIcon(props: IconProps) {
  return <Icon glyph={ChartColumn} {...props} />;
}

export function TagIcon(props: IconProps) {
  return <Icon glyph={Tag} {...props} />;
}

export function StoreIcon(props: IconProps) {
  return <Icon glyph={Store} {...props} />;
}

export function MegaphoneIcon(props: IconProps) {
  return <Icon glyph={Megaphone} {...props} />;
}

export function FlagIcon(props: IconProps) {
  return <Icon glyph={Flag} {...props} />;
}

export function IdCardIcon(props: IconProps) {
  return <Icon glyph={IdCard} {...props} />;
}

export function SettingsIcon(props: IconProps) {
  return <Icon glyph={Settings} {...props} />;
}

export function UserCogIcon(props: IconProps) {
  return <Icon glyph={UserCog} {...props} />;
}

export function ListChecksIcon(props: IconProps) {
  return <Icon glyph={ListChecks} {...props} />;
}

export function ScrollTextIcon(props: IconProps) {
  return <Icon glyph={ScrollText} {...props} />;
}
