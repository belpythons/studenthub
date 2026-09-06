import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { LogOut, Menu, UserCog } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BottomTabBar } from "@/components/layout/bottom-tab-bar";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { currentPageTitle } from "@/lib/navigation";
import { signOut } from "@/lib/session";
import { AnimatePresence, motion } from "@/components/motion/motion-primitives";

export function AppShell({
  nama,
  instansi,
  logoSrc,
  subtitle,
  children,
}: {
  nama: string;
  instansi: string;
  logoSrc?: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const inisial = nama.trim().charAt(0).toUpperCase() || "?";

  // Any route change closes the drawer, including browser Back.
  React.useEffect(() => setDrawerOpen(false), [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop rail */}
      <aside className="hidden w-[250px] shrink-0 border-r border-foreground lg:block">
        <div className="fixed inset-y-0 left-0 z-30 w-[250px]">
          <SidebarNav logoSrc={logoSrc} subtitle={subtitle} />
        </div>
      </aside>

      {/*
        Mobile drawer. Radix Sheet supplies Escape, focus trap, focus restore
        and body scroll lock — all missing from the previous hand-rolled panel.
      */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent side="left" className="w-[290px] gap-0 border-0 p-0" hideClose>
          <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
          <SheetDescription className="sr-only">
            Semua halaman pada tiga modul: SKM, Task Report Magang, dan Log Book.
          </SheetDescription>
          <SidebarNav logoSrc={logoSrc} subtitle={subtitle} onNavigate={() => setDrawerOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-foreground bg-card px-3 sm:px-6">
          <Button
            variant="outline"
            size="icon-sm"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Buka menu navigasi"
          >
            <Menu aria-hidden />
          </Button>

          {/* On mobile the top bar states where you are; desktop has the rail. */}
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground lg:hidden">
            {currentPageTitle(pathname)}
          </p>
          <div className="hidden flex-1 lg:block" />

          <ThemeToggle />

          <Badge variant="primary" className="hidden sm:inline-flex">
            PESERTA
          </Badge>

          {/*
            Avatar dulu hanya gambar mati — afordansi palsu: ia terlihat bisa
            diklik dan tidak melakukan apa pun. Sekarang ia membuka menu akun,
            yang sekaligus memunculkan Keluar di luar drawer; sebelumnya itu
            satu-satunya tempat tombol Keluar ada di ponsel.
          */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={`Menu akun ${nama}`}
                className="flex min-h-11 items-center gap-2 rounded-full px-1 py-1 pr-2 transition-colors hover:bg-accent"
              >
                <Avatar className="size-8">
                  <AvatarFallback>{inisial}</AvatarFallback>
                </Avatar>

                <span className="hidden min-w-0 flex-col text-left leading-tight sm:flex">
                  <strong className="truncate text-[13px] font-semibold text-foreground">
                    {nama}
                  </strong>
                  <small className="truncate text-[10.5px] text-muted-foreground">
                    {instansi}
                  </small>
                </span>
              </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="normal-case">
                <span className="block truncate text-[13px] font-semibold text-foreground">
                  {nama}
                </span>
                <span className="block truncate text-[11px] font-normal tracking-normal text-muted-foreground">
                  {instansi}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />

              {/* Label persis sama dengan NAV_GROUPS di lib/navigation.ts — satu
                  tujuan tidak boleh punya dua nama. */}
              <DropdownMenuItem asChild>
                <Link to="/account">
                  <UserCog aria-hidden />
                  Profil &amp; Pengesahan
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem destructive onSelect={signOut}>
                <LogOut aria-hidden />
                Keluar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Bottom padding clears the mobile tab bar and its safe-area inset. */}
        {/*
            overflow-x-clip: bayangan keras 4px menonjol ke kanan setiap kartu.
            Tanpa ini, satu kartu selebar penuh membuat seluruh dokumen bisa
            digeser mendatar di ponsel.
          */}
          <main className="w-full max-w-[1280px] flex-1 overflow-x-clip px-3 pb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] pt-4 sm:px-6 sm:pt-6 lg:pb-10">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2, ease: [0.22, 0.61, 0.36, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomTabBar />
    </div>
  );
}
