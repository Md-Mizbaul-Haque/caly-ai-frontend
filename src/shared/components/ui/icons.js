// Per-icon lucide imports: Metro bundles these ~24 modules instead of the whole ~1,800-icon root entry.
// Wrapped with strokeWidth=1.25 for ultra-light, premium linework (avoids thick AI-slop look).
import HouseIcon from 'lucide-react-native/icons/house';
import ChartColumnIcon from 'lucide-react-native/icons/chart-column';
import SettingsIcon from 'lucide-react-native/icons/settings';
import EllipsisIcon from 'lucide-react-native/icons/ellipsis';
import PlusIcon from 'lucide-react-native/icons/plus';
import MinusIcon from 'lucide-react-native/icons/minus';
import XIcon from 'lucide-react-native/icons/x';
import BeefIcon from 'lucide-react-native/icons/beef';
import WheatIcon from 'lucide-react-native/icons/wheat';
import DropletIcon from 'lucide-react-native/icons/droplet';
import FlameIcon from 'lucide-react-native/icons/flame';
import TrashIcon from 'lucide-react-native/icons/trash';
import ChevronLeftIcon from 'lucide-react-native/icons/chevron-left';
import CircleQuestionMarkIcon from 'lucide-react-native/icons/circle-question-mark';
import ZapIcon from 'lucide-react-native/icons/zap';
import ZapOffIcon from 'lucide-react-native/icons/zap-off';
import ScanLineIcon from 'lucide-react-native/icons/scan-line';
import ScanBarcodeIcon from 'lucide-react-native/icons/scan-barcode';
import FileTextIcon from 'lucide-react-native/icons/file-text';
import ImagesIcon from 'lucide-react-native/icons/images';
import CameraIcon from 'lucide-react-native/icons/camera';
import DumbbellIcon from 'lucide-react-native/icons/dumbbell';
import GlassWaterIcon from 'lucide-react-native/icons/glass-water';
import MicIcon from 'lucide-react-native/icons/mic';
import ScaleIcon from 'lucide-react-native/icons/scale';
import SearchIcon from 'lucide-react-native/icons/search';
import ArrowRightIcon from 'lucide-react-native/icons/arrow-right';
import TrendingUpIcon from 'lucide-react-native/icons/trending-up';
import TrendingDownIcon from 'lucide-react-native/icons/trending-down';
import PencilIcon from 'lucide-react-native/icons/pencil';
import TargetIcon from 'lucide-react-native/icons/target';
import TrophyIcon from 'lucide-react-native/icons/trophy';
import CrownIcon from 'lucide-react-native/icons/crown';
import UserIcon from 'lucide-react-native/icons/user';
import BellIcon from 'lucide-react-native/icons/bell';
import HeartIcon from 'lucide-react-native/icons/heart';
import NewspaperIcon from 'lucide-react-native/icons/newspaper';
import RocketIcon from 'lucide-react-native/icons/rocket';
import LogOutIcon from 'lucide-react-native/icons/log-out';
import ChevronRightIcon from 'lucide-react-native/icons/chevron-right';
import ChevronDownIcon from 'lucide-react-native/icons/chevron-down';
import Share2Icon from 'lucide-react-native/icons/share-2';
import SparklesIcon from 'lucide-react-native/icons/sparkles';
import MailIcon from 'lucide-react-native/icons/mail';
import BookOpenIcon from 'lucide-react-native/icons/book-open';
import InfoIcon from 'lucide-react-native/icons/info';
import StarIcon from 'lucide-react-native/icons/star';
import ClockIcon from 'lucide-react-native/icons/clock';
import ChefHatIcon from 'lucide-react-native/icons/chef-hat';
import GiftIcon from 'lucide-react-native/icons/gift';
import ShieldIcon from 'lucide-react-native/icons/shield';
import RefreshCwIcon from 'lucide-react-native/icons/refresh-cw';
import CalendarDaysIcon from 'lucide-react-native/icons/calendar-days';
import AlertCircleIcon from 'lucide-react-native/icons/circle-alert';
import TicketPercentIcon from 'lucide-react-native/icons/ticket-percent';
import UtensilsIcon from 'lucide-react-native/icons/utensils';
import EyeIcon from 'lucide-react-native/icons/eye';
import EyeOffIcon from 'lucide-react-native/icons/eye-off';
import BikeIcon from 'lucide-react-native/icons/bike';
import FootprintsIcon from 'lucide-react-native/icons/footprints';
import SofaIcon from 'lucide-react-native/icons/sofa';
import CircleIcon from 'lucide-react-native/icons/circle';
import CircleUserIcon from 'lucide-react-native/icons/circle-user';
import UserRoundIcon from 'lucide-react-native/icons/user-round';
import PartyPopperIcon from 'lucide-react-native/icons/party-popper';
import CheckIcon from 'lucide-react-native/icons/check';
import AppleIcon from 'lucide-react-native/icons/apple';
import CarrotIcon from 'lucide-react-native/icons/carrot';
import MilkIcon from 'lucide-react-native/icons/milk';
import CookieIcon from 'lucide-react-native/icons/cookie';
import SunIcon from 'lucide-react-native/icons/sun';
import MoonIcon from 'lucide-react-native/icons/moon';
import SmartphoneIcon from 'lucide-react-native/icons/smartphone';
import DownloadIcon from 'lucide-react-native/icons/download';

const withThinStroke = (IconComponent, displayName) => {
  const Wrapped = (props) => (
    <IconComponent {...props} strokeWidth={props.strokeWidth ?? 1.25} size={props.size ?? 24} />
  );
  Wrapped.displayName = displayName;
  return Wrapped;
};

const House = withThinStroke(HouseIcon, 'House');
const ChartColumn = withThinStroke(ChartColumnIcon, 'ChartColumn');
const Settings = withThinStroke(SettingsIcon, 'Settings');
const Ellipsis = withThinStroke(EllipsisIcon, 'Ellipsis');
const Plus = withThinStroke(PlusIcon, 'Plus');
const Minus = withThinStroke(MinusIcon, 'Minus');
const X = withThinStroke(XIcon, 'X');
const Beef = withThinStroke(BeefIcon, 'Beef');
const Wheat = withThinStroke(WheatIcon, 'Wheat');
const Droplet = withThinStroke(DropletIcon, 'Droplet');
const Flame = withThinStroke(FlameIcon, 'Flame');
const Trash = withThinStroke(TrashIcon, 'Trash');
const ChevronLeft = withThinStroke(ChevronLeftIcon, 'ChevronLeft');
const CircleQuestionMark = withThinStroke(CircleQuestionMarkIcon, 'CircleQuestionMark');
const Zap = withThinStroke(ZapIcon, 'Zap');
const ZapOff = withThinStroke(ZapOffIcon, 'ZapOff');
const ScanLine = withThinStroke(ScanLineIcon, 'ScanLine');
const ScanBarcode = withThinStroke(ScanBarcodeIcon, 'ScanBarcode');
const FileText = withThinStroke(FileTextIcon, 'FileText');
const Images = withThinStroke(ImagesIcon, 'Images');
const Camera = withThinStroke(CameraIcon, 'Camera');
const Dumbbell = withThinStroke(DumbbellIcon, 'Dumbbell');
const GlassWater = withThinStroke(GlassWaterIcon, 'GlassWater');
const Mic = withThinStroke(MicIcon, 'Mic');
const Scale = withThinStroke(ScaleIcon, 'Scale');
const Search = withThinStroke(SearchIcon, 'Search');
const ArrowRight = withThinStroke(ArrowRightIcon, 'ArrowRight');
const TrendingUp = withThinStroke(TrendingUpIcon, 'TrendingUp');
const TrendingDown = withThinStroke(TrendingDownIcon, 'TrendingDown');
const Pencil = withThinStroke(PencilIcon, 'Pencil');
const Target = withThinStroke(TargetIcon, 'Target');
const Trophy = withThinStroke(TrophyIcon, 'Trophy');
const Crown = withThinStroke(CrownIcon, 'Crown');
const User = withThinStroke(UserIcon, 'User');
const Bell = withThinStroke(BellIcon, 'Bell');
const Heart = withThinStroke(HeartIcon, 'Heart');
const Newspaper = withThinStroke(NewspaperIcon, 'Newspaper');
const Rocket = withThinStroke(RocketIcon, 'Rocket');
const LogOut = withThinStroke(LogOutIcon, 'LogOut');
const ChevronRight = withThinStroke(ChevronRightIcon, 'ChevronRight');
const ChevronDown = withThinStroke(ChevronDownIcon, 'ChevronDown');
const Share2 = withThinStroke(Share2Icon, 'Share2');
const Sparkles = withThinStroke(SparklesIcon, 'Sparkles');
const Mail = withThinStroke(MailIcon, 'Mail');
const BookOpen = withThinStroke(BookOpenIcon, 'BookOpen');
const Info = withThinStroke(InfoIcon, 'Info');
const Star = withThinStroke(StarIcon, 'Star');
const Clock = withThinStroke(ClockIcon, 'Clock');
const ChefHat = withThinStroke(ChefHatIcon, 'ChefHat');
const Gift = withThinStroke(GiftIcon, 'Gift');
const Shield = withThinStroke(ShieldIcon, 'Shield');
const RefreshCw = withThinStroke(RefreshCwIcon, 'RefreshCw');
const CalendarDays = withThinStroke(CalendarDaysIcon, 'CalendarDays');
const AlertCircle = withThinStroke(AlertCircleIcon, 'AlertCircle');
const TicketPercent = withThinStroke(TicketPercentIcon, 'TicketPercent');
const Utensils = withThinStroke(UtensilsIcon, 'Utensils');
const Eye = withThinStroke(EyeIcon, 'Eye');
const EyeOff = withThinStroke(EyeOffIcon, 'EyeOff');
const Bike = withThinStroke(BikeIcon, 'Bike');
const Footprints = withThinStroke(FootprintsIcon, 'Footprints');
const Sofa = withThinStroke(SofaIcon, 'Sofa');
const Circle = withThinStroke(CircleIcon, 'Circle');
const CircleUser = withThinStroke(CircleUserIcon, 'CircleUser');
const UserRound = withThinStroke(UserRoundIcon, 'UserRound');
const PartyPopper = withThinStroke(PartyPopperIcon, 'PartyPopper');
const Check = withThinStroke(CheckIcon, 'Check');
const Apple = withThinStroke(AppleIcon, 'Apple');
const Carrot = withThinStroke(CarrotIcon, 'Carrot');
const Milk = withThinStroke(MilkIcon, 'Milk');
const Cookie = withThinStroke(CookieIcon, 'Cookie');
const Sun = withThinStroke(SunIcon, 'Sun');
const Moon = withThinStroke(MoonIcon, 'Moon');
const Smartphone = withThinStroke(SmartphoneIcon, 'Smartphone');
const Download = withThinStroke(DownloadIcon, 'Download');

export {
  House,
  ChartColumn,
  Settings,
  Ellipsis,
  Plus,
  Minus,
  X,
  Beef,
  Wheat,
  Droplet,
  Flame,
  Trash,
  ChevronLeft,
  CircleQuestionMark,
  Zap,
  ZapOff,
  ScanLine,
  ScanBarcode,
  FileText,
  Images,
  Camera,
  Dumbbell,
  GlassWater,
  Mic,
  Scale,
  Search,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Pencil,
  Target,
  Trophy,
  Crown,
  User,
  Bell,
  Heart,
  Newspaper,
  Rocket,
  LogOut,
  ChevronRight,
  ChevronDown,
  Share2,
  Sparkles,
  Mail,
  BookOpen,
  Info,
  Star,
  Clock,
  ChefHat,
  Gift,
  Shield,
  RefreshCw,
  CalendarDays,
  AlertCircle,
  TicketPercent,
  Utensils,
  Eye,
  EyeOff,
  Bike,
  Footprints,
  Sofa,
  Circle,
  CircleUser,
  UserRound,
  PartyPopper,
  Check,
  Apple,
  Carrot,
  Milk,
  Cookie,
  Sun,
  Moon,
  Smartphone,
  Download,
};
export { Icon } from '@/components/ui/icon';
