import '@fontsource-variable/inter';
import * as Lucide from 'lucide';
import './styles.css';

// Keep the icon bundle limited to the icons used by the dashboard.
const icons = {
  Activity: Lucide.Activity, AlertTriangle: Lucide.AlertTriangle, ArrowDown: Lucide.ArrowDown,
  ArrowRight: Lucide.ArrowRight, ArrowUp: Lucide.ArrowUp, BarChart3: Lucide.BarChart3,
  Bell: Lucide.Bell, Briefcase: Lucide.Briefcase, Building2: Lucide.Building2,
  Calendar: Lucide.Calendar, CalendarCheck: Lucide.CalendarCheck, CalendarPlus: Lucide.CalendarPlus,
  CheckCircle2: Lucide.CheckCircle2, ChevronDown: Lucide.ChevronDown, ChevronLeft: Lucide.ChevronLeft,
  ChevronRight: Lucide.ChevronRight, ChevronsUpDown: Lucide.ChevronsUpDown, ClipboardList: Lucide.ClipboardList,
  Clock: Lucide.Clock, Columns3: Lucide.Columns3, Contact: Lucide.Contact,
  Crown: Lucide.Crown, DollarSign: Lucide.DollarSign, Download: Lucide.Download,
  Eye: Lucide.Eye, FilePlus: Lucide.FilePlus, FileText: Lucide.FileText,
  Filter: Lucide.Filter, Inbox: Lucide.Inbox, Info: Lucide.Info,
  Keyboard: Lucide.Keyboard, LayoutGrid: Lucide.LayoutGrid, Mail: Lucide.Mail,
  MailOpen: Lucide.MailOpen, Menu: Lucide.Menu, MicOff: Lucide.MicOff,
  Package: Lucide.Package, Pause: Lucide.Pause, Pencil: Lucide.Pencil,
  Phone: Lucide.Phone, PhoneCall: Lucide.PhoneCall, PhoneOff: Lucide.PhoneOff,
  Plus: Lucide.Plus, Printer: Lucide.Printer, Receipt: Lucide.Receipt,
  RotateCcw: Lucide.RotateCcw, Search: Lucide.Search, Send: Lucide.Send,
  Settings: Lucide.Settings, Sparkles: Lucide.Sparkles, StickyNote: Lucide.StickyNote,
  Target: Lucide.Target, Trash2: Lucide.Trash2, TrendingUp: Lucide.TrendingUp,
  Trophy: Lucide.Trophy, UserPlus: Lucide.UserPlus, Users: Lucide.Users, X: Lucide.X,
};

// Classic scripts render the dashboard and call this from their view updates.
window.lucide = { createIcons: () => Lucide.createIcons({ icons }) };
