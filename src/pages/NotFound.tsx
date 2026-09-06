import { Link } from "react-router-dom";
import { Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon3d } from "@/components/shared/icon-3d";
import { useTitle } from "@/lib/use-title";

export default function NotFound() {
  useTitle("Halaman tidak ditemukan");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 text-center">
        <img src="/icon.png" alt="Universitas Sains dan Teknologi Bontang" width={48} height={33} className="mx-auto h-auto w-12 rounded-lg" />
        <Icon3d name="zoom" size={80} className="mx-auto mt-4" />
        <h1 className="mt-4 text-base font-bold">Halaman atau data tidak ditemukan</h1>
        <p className="mx-auto mt-1.5 max-w-sm text-[13px] leading-relaxed text-muted-foreground">
          Tautannya mungkin sudah berubah, atau catatan yang dituju sudah dihapus.
          Bisa juga catatan itu milik peserta lain.
        </p>
        <Button asChild className="mt-5">
          <Link to="/dashboard">
            <Home aria-hidden />
            Ke Dashboard
          </Link>
        </Button>
      </Card>
    </main>
  );
}
