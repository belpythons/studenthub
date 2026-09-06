import {
  Award,
  BookOpen,
  CalendarPlus,
  ClipboardCopy,
  FileText,
  FolderKanban,
  HelpCircle,
  LayoutDashboard,
  NotebookPen,
  Printer,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for navigation.
 *
 * The sidebar, the mobile drawer, the bottom tab bar and the active-route
 * highlight all read from here, so a route can never appear in one place and
 * be missing from another.
 */

export interface NavItem {
  href: string;
  label: string;
  /** Shorter label for the bottom tab bar. */
  shortLabel?: string;
  icon: LucideIcon;
  /** Extra path prefixes that should light this item up. */
  matches?: string[];
  /** Paths that must NOT light this item up (siblings under the same prefix). */
  excludes?: string[];
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "Beranda",
    items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    title: "SKM & Portofolio",
    items: [
      {
        href: "/skm",
        label: "Daftar SKM",
        icon: Award,
        matches: ["/skm/"],
        excludes: ["/skm/new", "/skm/linkedin"],
      },
      { href: "/skm/new", label: "Tambah SKM", icon: CalendarPlus },
      { href: "/skm/linkedin", label: "LinkedIn Assistant", icon: ClipboardCopy },
    ],
  },
  {
    title: "Task Report Magang",
    items: [
      { href: "/reports/feed", label: "Daftar Kegiatan", icon: Users },
      {
        href: "/reports",
        label: "Laporan Saya",
        icon: FileText,
        matches: ["/reports/"],
        excludes: ["/reports/new", "/reports/export", "/reports/feed"],
      },
      { href: "/reports/new", label: "Buat Laporan", icon: CalendarPlus },
      { href: "/reports/export", label: "Ekspor / Rekap", icon: Printer },
    ],
  },
  {
    title: "Log Book Konsultasi",
    items: [
      {
        href: "/logbook",
        label: "Log Book",
        icon: BookOpen,
        matches: ["/logbook/"],
        excludes: [
          "/logbook/new",
          "/logbook/supervisors",
          "/logbook/rekap",
          "/logbook/projects",
        ],
      },
      { href: "/logbook/new", label: "Tambah Entri", icon: CalendarPlus },
      {
        href: "/logbook/projects",
        label: "Proyek Konsultasi",
        icon: FolderKanban,
        matches: ["/logbook/projects/"],
      },
      { href: "/logbook/supervisors", label: "Pembimbing", icon: Users },
      { href: "/logbook/rekap", label: "Rekap Konsultasi", icon: NotebookPen },
    ],
  },
  {
    title: "Akun",
    items: [{ href: "/account", label: "Profil & Pengesahan", icon: UserCog }],
  },
  {
    title: "Bantuan",
    items: [{ href: "/faq", label: "FAQ & Tentang", icon: HelpCircle }],
  },
];

/** The four destinations reachable from the mobile bottom bar. */
export const BOTTOM_TABS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", shortLabel: "Beranda", icon: LayoutDashboard },
  { href: "/skm", label: "Daftar SKM", shortLabel: "SKM", icon: Award, matches: ["/skm/"] },
  {
    href: "/reports",
    label: "Laporan Saya",
    shortLabel: "Laporan",
    icon: FileText,
    matches: ["/reports/"],
  },
  {
    href: "/logbook",
    label: "Log Book",
    shortLabel: "Log Book",
    icon: BookOpen,
    matches: ["/logbook/"],
  },
];

/**
 * Explicit prefix matching. Replaces the previous regex over hex characters,
 * which happened to work but would have silently mis-highlighted any future
 * route whose segment used only the letters a-f.
 */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (pathname === item.href) return true;
  if (item.excludes?.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return false;
  return (item.matches ?? []).some((p) => pathname.startsWith(p));
}

/** Human-readable name of the current route, for the mobile top bar. */
export function currentPageTitle(pathname: string): string {
  const all = NAV_GROUPS.flatMap((g) => g.items);
  const exact = all.find((i) => i.href === pathname);
  if (exact) return exact.label;

  const active = all.find((i) => isNavItemActive(pathname, i));
  return active?.label ?? "Student Hub";
}
