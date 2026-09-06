import { Link } from "react-router-dom";

import { Card } from "@/components/ui/card";
import { FadeIn } from "@/components/motion/motion-primitives";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { ORG } from "@/lib/constants";

export default function AuthCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <FadeIn className="w-full max-w-[420px]">
        <Card className="overflow-hidden">
          <div className="border-b border-foreground bg-[hsl(var(--sidebar))] px-6 py-7 text-center">
            {/* Lockup penuh, bukan lambang saja: ini satu-satunya layar tempat
                wordmark "Universitas Sains dan Teknologi Bontang" punya ruang
                untuk benar-benar terbaca. */}
            <img
              src="/logo.png"
              alt="Universitas Sains dan Teknologi Bontang"
              width={640}
              height={375}
              className="mx-auto h-auto w-full max-w-[220px] rounded-lg border border-foreground bg-white p-3"
            />
            <h1 className="mt-3 text-lg font-bold text-white">{title}</h1>
            <p className="mt-0.5 text-[12.5px] text-[hsl(var(--sidebar-muted))]">{subtitle}</p>
          </div>

          <div className="space-y-3.5 p-6">{children}</div>
        </Card>

        <p className="mt-4 text-center text-[11.5px] text-muted-foreground">
          {ORG.kampus} · Program Studi Teknik Informatika
        </p>

        <p className="mt-1.5 text-center text-[11.5px]">
          <Link to="/faq" className="font-semibold text-primary underline-offset-4 hover:underline">
            Apa itu Student Hub?
          </Link>
        </p>
      </FadeIn>

      {/* Pengunjung baru mendarat di sinilah, bukan di dashboard — tawaran
          pasang yang hanya hidup di dalam aplikasi praktis tak pernah dilihat. */}
      <InstallPrompt />
    </main>
  );
}
