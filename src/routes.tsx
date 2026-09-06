import { createBrowserRouter, Navigate } from "react-router-dom";

import { AuthOnly, RequireAuth } from "@/lib/session";
import AppLayout from "@/pages/AppLayout";
import RouteError from "@/pages/RouteError";
import NotFound from "@/pages/NotFound";
import OfflinePage from "@/pages/OfflinePage";

import LoginPage from "@/pages/login/LoginPage";
import RegisterPage from "@/pages/register/RegisterPage";
import ConfirmPage from "@/pages/auth/ConfirmPage";
import FaqPage from "@/pages/faq/FaqPage";

import DashboardPage from "@/pages/dashboard/DashboardPage";
import AccountPage from "@/pages/account/AccountPage";

import SkmListPage from "@/pages/skm/SkmListPage";
import SkmFormPage from "@/pages/skm/SkmFormPage";
import LinkedInPage from "@/pages/skm/LinkedInPage";

import MyReportsPage from "@/pages/reports/MyReportsPage";
import FeedPage from "@/pages/reports/FeedPage";
import ExportPage from "@/pages/reports/ExportPage";
import ReportDetailPage from "@/pages/reports/ReportDetailPage";
import ReportFormPage from "@/pages/reports/ReportFormPage";

import LogbookPage from "@/pages/logbook/LogbookPage";
import LogbookFormPage from "@/pages/logbook/LogbookFormPage";
import LogbookDetailPage from "@/pages/logbook/LogbookDetailPage";
import RekapKonsultasiPage from "@/pages/logbook/RekapKonsultasiPage";
import SupervisorsPage from "@/pages/logbook/SupervisorsPage";
import ProjectsPage from "@/pages/logbook/ProjectsPage";
import ProjectDetailPage from "@/pages/logbook/ProjectDetailPage";
import BriefingPage from "@/pages/logbook/BriefingPage";

import PrintLayout from "@/pages/print/PrintLayout";
import RekapMagangPage from "@/pages/print/RekapMagangPage";
import Formulir2Page from "@/pages/print/Formulir2Page";
import PrintBriefingPage from "@/pages/print/PrintBriefingPage";

/*
  Peta 1:1 dari App Router yang digantikan; `[id]` menjadi `:id`.

  errorElement dipasang pada tiap cabang teratas, bukan hanya di akar: sebuah
  galat di /logbook seharusnya menampilkan layar galat di dalam AppShell, bukan
  menelan seluruh navigasi bersamanya.
*/
export const router = createBrowserRouter([
  { path: "/", element: <Navigate to="/dashboard" replace /> },
  { path: "/offline", element: <OfflinePage /> },

  {
    element: <AuthOnly><LoginPage /></AuthOnly>,
    path: "/login",
    errorElement: <RouteError />,
  },
  {
    element: <AuthOnly><RegisterPage /></AuthOnly>,
    path: "/register",
    errorElement: <RouteError />,
  },
  { path: "/auth/confirm", element: <ConfirmPage />, errorElement: <RouteError /> },

  /*
    FAQ sengaja publik dan di luar AppLayout.

    Halaman ini menjelaskan aplikasinya untuk apa dan kenapa ada — pembacanya
    justru orang yang belum punya akun. Menaruhnya di balik RequireAuth akan
    memantulkan mereka ke halaman login sebelum sempat membaca satu kalimat pun.
  */
  { path: "/faq", element: <FaqPage />, errorElement: <RouteError /> },

  {
    // Cetak memakai RequireAuth juga: halaman-halamannya membaca data pengguna,
    // dan tanpa sesi dulu mereka mengalihkan sendiri satu per satu.
    element: <RequireAuth><PrintLayout /></RequireAuth>,
    errorElement: <RouteError />,
    children: [
      { path: "/print/rekap-magang", element: <RekapMagangPage /> },
      { path: "/print/formulir2", element: <Formulir2Page /> },
      { path: "/print/briefing", element: <PrintBriefingPage /> },
    ],
  },

  {
    element: <RequireAuth><AppLayout /></RequireAuth>,
    errorElement: <RouteError />,
    children: [
      { path: "/dashboard", element: <DashboardPage /> },
      { path: "/account", element: <AccountPage /> },

      { path: "/skm", element: <SkmListPage /> },
      { path: "/skm/new", element: <SkmFormPage /> },
      { path: "/skm/:id/edit", element: <SkmFormPage /> },
      { path: "/skm/linkedin", element: <LinkedInPage /> },

      { path: "/reports", element: <MyReportsPage /> },
      { path: "/reports/new", element: <ReportFormPage /> },
      { path: "/reports/feed", element: <FeedPage /> },
      { path: "/reports/export", element: <ExportPage /> },
      { path: "/reports/:id", element: <ReportDetailPage /> },
      { path: "/reports/:id/edit", element: <ReportFormPage /> },

      { path: "/logbook", element: <LogbookPage /> },
      { path: "/logbook/new", element: <LogbookFormPage /> },
      { path: "/logbook/rekap", element: <RekapKonsultasiPage /> },
      { path: "/logbook/supervisors", element: <SupervisorsPage /> },
      { path: "/logbook/projects", element: <ProjectsPage /> },
      { path: "/logbook/projects/:id", element: <ProjectDetailPage /> },
      { path: "/logbook/projects/:id/briefing", element: <BriefingPage /> },
      { path: "/logbook/:id", element: <LogbookDetailPage /> },
      { path: "/logbook/:id/edit", element: <LogbookFormPage /> },
    ],
  },

  { path: "*", element: <NotFound /> },
]);
