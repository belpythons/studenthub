import * as React from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerSW } from "virtual:pwa-register";

// Efek samping: memasang listener beforeinstallprompt sebelum React merender.
import "@/lib/pwa-install";

import { ThemeProvider } from "@/components/layout/theme-provider";
import { MotionProvider } from "@/components/motion/motion-primitives";
import { SessionProvider } from "@/lib/session";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { router } from "@/routes";

import "@/globals.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data magang tidak berubah di belakang layar; menyegarkan tiap kali
      // jendela mendapat fokus hanya membuang kuota dan memicu kedip skeleton.
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/*
      defaultTheme="light" + enableSystem={false}: mesin ber-OS gelap dulu
      mendapat mode gelap tanpa pernah memilihnya. Toggle Terang/Gelap tetap ada.
    */}
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false} disableTransitionOnChange>
      <MotionProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <TooltipProvider delayDuration={250}>
              {/* Lets keyboard users jump past the nav rail. */}
              <a
                href="#konten-utama"
                className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-primary-foreground"
              >
                Lompat ke konten utama
              </a>
              <RouterProvider router={router} />
              <Toaster />
            </TooltipProvider>
          </SessionProvider>
        </QueryClientProvider>
      </MotionProvider>
    </ThemeProvider>
  </React.StrictMode>,
);

registerSW({ immediate: true });
