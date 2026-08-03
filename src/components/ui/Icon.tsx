import React from 'react';
import { Colors } from '@/constants/theme';
import {
  Home,
  Map,
  Settings,
  MessageCircle,
  User,
  Bell,
  Egg,
  ClipboardList,
  Calendar,
  AlertTriangle,
  PawPrint,
  Pencil,
  HeartPulse,
  Syringe,
  Pill,
  Bug,
  Dna,
  MoreHorizontal,
  Search,
  SlidersHorizontal,
  X,
  Clock,
  ChevronRight,
  ChevronDown,
  Star,
  MapPin,
  Lock,
  HelpCircle,
  LogOut,
  Edit,
  Wrench,
  ShieldAlert,
  CheckCircle2,
  Plus,
  Check,
  UserCheck,
  Users,
  UserCog,
  Image as ImageIcon,
  Video as VideoIcon,
  ThumbsUp,
  Camera,
  Play,
  Send,
  Trash2,
  type LucideProps,
  MessageSquareText,
  Logs,
} from 'lucide-react-native';

export type IconName =
  | 'home'
  | 'map'
  | 'services'
  | 'messages'
  | 'profile'
  | 'bell'
  | 'hen'
  | 'cow'
  | 'clipboard'
  | 'calendar'
  | 'alert'
  | 'paw'
  | 'pencil'
  | 'health-check'
  | 'vaccination'
  | 'treatment'
  | 'bug'
  | 'dna'
  | 'dots'
  | 'search'
  | 'filter'
  | 'close'
  | 'clock'
  | 'chevron-right'
  | 'chevron-down'
  | 'star'
  | 'location'
  | 'lock'
  | 'help'
  | 'logout'
  | 'door'
  | 'edit'
  | 'farmer'
  | 'technician'
  | 'shield-alert'
  | 'check-circle'
  | 'plus'
  | 'check'
  | 'user-cog'
  | 'image'
  | 'video'
  | 'thumbs-up'
  | 'camera'
  | 'play'
  | 'send'
  | 'trash'
  | 'messages-square'
  | 'logs';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const iconMap: Record<IconName, React.FC<LucideProps>> = {
  home: Home,
  map: Map,
  services: Settings,
  messages: MessageCircle,
  profile: User,
  bell: Bell,
  hen: Egg,
  cow: Egg,
  clipboard: ClipboardList,
  calendar: Calendar,
  alert: AlertTriangle,
  paw: PawPrint,
  pencil: Pencil,
  'health-check': HeartPulse,
  vaccination: Syringe,
  treatment: Pill,
  bug: Bug,
  dna: Dna,
  dots: MoreHorizontal,
  search: Search,
  filter: SlidersHorizontal,
  close: X,
  clock: Clock,
  'chevron-right': ChevronRight,
  'chevron-down': ChevronDown,
  star: Star,
  location: MapPin,
  lock: Lock,
  help: HelpCircle,
  logout: LogOut,
  door: LogOut,
  edit: Edit,
  farmer: UserCheck,
  technician: Wrench,
  'shield-alert': ShieldAlert,
  'check-circle': CheckCircle2,
  plus: Plus,
  check: Check,
  'user-cog': UserCog,
  'messages-square': MessageSquareText,
  image: ImageIcon,
  video: VideoIcon,
  'thumbs-up': ThumbsUp,
  camera: Camera,
  play: Play,
  send: Send,
  trash: Trash2,
  'logs': Logs
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = Colors.text,
  strokeWidth = 1.5,
}) => {
  const LucideIcon = iconMap[name];

  if (!LucideIcon) {
    return null;
  }

  return <LucideIcon size={size} color={color} strokeWidth={strokeWidth} />;
};
