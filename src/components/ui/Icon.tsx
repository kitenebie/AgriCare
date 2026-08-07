import { Colors } from "@/constants/theme";
import { Image } from "react-native";
import {
  Activity,
  AlertTriangle,
  Atom,
  Bandage,
  Bell,
  Bug,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  Dna,
  Edit,
  FlaskConical,
  Heart,
  HeartHandshake,
  HeartPulse,
  HelpCircle,
  Home,
  Image as ImageIcon,
  Lock,
  LogOut,
  Logs,
  Map,
  MapPin,
  MessageCircle,
  MessageSquareText,
  Microscope,
  PawPrint,
  Pencil,
  PiggyBank,
  Pill,
  Pipette,
  Play,
  Plus,
  Ribbon,
  Search,
  Send,
  Settings,
  ShieldAlert,
  ShieldCheck,
  ShieldPlus,
  SlidersHorizontal,
  Star,
  Stethoscope,
  Syringe,
  TestTube,
  Thermometer,
  ThumbsUp,
  Trash2,
  User,
  UserCheck,
  UserCog,
  Video as VideoIcon,
  Wrench,
  X,
  type LucideProps,
} from "lucide-react-native";
import React from "react";

export type IconName =
  | "home"
  | "map"
  | "services"
  | "messages"
  | "profile"
  | "bell"
  | "hen"
  | "cow"
  | "clipboard"
  | "calendar"
  | "alert"
  | "paw"
  | "pencil"
  | "health-check"
  | "vaccination"
  | "treatment"
  | "bug"
  | "dna"
  | "dots"
  | "search"
  | "filter"
  | "close"
  | "clock"
  | "chevron-right"
  | "chevron-down"
  | "star"
  | "location"
  | "lock"
  | "help"
  | "logout"
  | "door"
  | "edit"
  | "farmer"
  | "technician"
  | "shield-alert"
  | "check-circle"
  | "plus"
  | "check"
  | "user-cog"
  | "image"
  | "video"
  | "thumbs-up"
  | "camera"
  | "play"
  | "send"
  | "trash"
  | "messages-square"
  | "logs"
  | "med-activity"
  | "med-bandage"
  | "med-bottle"
  | "med-clipboard"
  | "med-first-aid-kit"
  | "med-bone-fracture"
  | "med-heart"
  | "med-pills"
  | "med-stethoscope"
  | "med-syringe"
  | "med-dna"
  | "med-microscope"
  | "med-thermometer"
  | "med-vial"
  | "med-x-ray"
  | "med-pill"
  | "med-pill-bottle"
  | "med-ribbon"
  | "med-scan-heart"
  | "med-sheild-check"
  | "med-sheild-alert"
  | "med-tablet"
  | "med-haart-shake"
  | "med-worm"
  | "med-atom"
  | "med-test-tube"
  | "med-pipette"
  | "med-piggy-bank"
  | "med-cow"
  | "gallery"
  | "refresh";

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

const iconMap: Record<IconName, React.FC<LucideProps> | string> = {
  home: Home,
  map: Map,
  services: Settings,
  messages: MessageCircle,
  profile: User,
  bell: Bell,
  hen: PiggyBank,
  cow: PiggyBank,
  clipboard: ClipboardList,
  calendar: Calendar,
  alert: AlertTriangle,
  paw: PawPrint,
  pencil: Pencil,
  "health-check": HeartPulse,
  vaccination: Syringe,
  treatment: Pill,
  bug: Bug,
  dna: Dna,
  dots: Plus,
  search: Search,
  filter: SlidersHorizontal,
  close: X,
  clock: Clock,
  "chevron-right": ChevronRight,
  "chevron-down": ChevronDown,
  star: Star,
  location: MapPin,
  lock: Lock,
  help: HelpCircle,
  logout: LogOut,
  door: LogOut,
  edit: Edit,
  farmer: UserCheck,
  technician: Wrench,
  "shield-alert": ShieldAlert,
  "check-circle": CheckCircle2,
  plus: Plus,
  check: Check,
  "user-cog": UserCog,
  "messages-square": MessageSquareText,
  image: ImageIcon,
  video: VideoIcon,
  "thumbs-up": ThumbsUp,
  camera: Camera,
  play: Play,
  send: Send,
  trash: Trash2,
  logs: Logs,
  gallery: ImageIcon,
  refresh: Activity,
  "med-activity": Activity,
  "med-bandage": Bandage,
  "med-bottle": FlaskConical,
  "med-clipboard": ClipboardList,
  "med-first-aid-kit": HeartPulse,
  "med-bone-fracture": Activity,
  "med-heart": Heart,
  "med-pills": Pill,
  "med-stethoscope": Stethoscope,
  "med-syringe": Syringe,
  "med-dna": Dna,
  "med-microscope": Microscope,
  "med-thermometer": Thermometer,
  "med-vial": FlaskConical,
  "med-x-ray": Activity,
  "med-pill": Pill,
  "med-pill-bottle": Pill,
  "med-ribbon": Ribbon,
  "med-scan-heart": HeartPulse,
  "med-sheild-check": ShieldCheck,
  "med-sheild-alert": ShieldPlus,
  "med-tablet": Pill,
  "med-haart-shake": HeartHandshake,
  "med-worm": Bug,
  "med-atom": Atom,
  "med-test-tube": TestTube,
  "med-pipette": Pipette,
  "med-piggy-bank": PiggyBank,
  "med-cow": "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWNvdy1oZWFkLWljb24gbHVjaWRlLWNvdy1oZWFkIj48cGF0aCBkPSJNMTcuOCAxNS4xYTEwIDEwIDAgMCAwIC45LTcuMWguM2MxLjcgMCAzLTEuMyAzLTNWM2gtM2MtMS4zIDAtMi40LjgtMi44IDEuOWExMCAxMCAwIDAgMC04LjQgMEM3LjQgMy44IDYuMyAzIDUgM0gydjJjMCAxLjcgMS4zIDMgMyAzaC4zYTEwIDEwIDAgMCAwIC45IDcuMSIvPjxwYXRoIGQ9Ik05IDkuNXYuNSIvPjxwYXRoIGQ9Ik0xNSA5LjV2LjUiLz48cGF0aCBkPSJNMTUgMjJhNCA0IDAgMSAwLTMtNi42QTQgNCAwIDEgMCA5IDIyWiIvPjxwYXRoIGQ9Ik05IDE4aC4wMSIvPjxwYXRoIGQ9Ik0xNSAxOGguMDEiLz48L3N2Zz4=",
};

export const Icon: React.FC<IconProps> = ({
  name,
  size = 24,
  color = Colors.text,
  strokeWidth = 1.5,
  style,
}) => {
  const LucideIcon = iconMap[name];

  if (!LucideIcon) {
    return null;
  }

  // Handle data URL strings (SVG as image)
  if (typeof LucideIcon === "string") {
    return <Image source={{ uri: LucideIcon }} style={[{ width: size, height: size, tintColor: color }, style]} />;
    }

  return <LucideIcon size={size} color={color} strokeWidth={strokeWidth} />;
};
