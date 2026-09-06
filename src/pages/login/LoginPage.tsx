import { Link, useSearchParams } from "react-router-dom";

import AuthCard from "@/components/layout/AuthCard";
import LoginForm from "@/pages/login/LoginForm";
import { useTitle } from "@/lib/use-title";

export default function LoginPage() {
  useTitle("Masuk");
  const [params] = useSearchParams();

  return (
    <AuthCard title="Masuk" subtitle="Student Hub & Internship Logbook">
      <LoginForm next={params.get("next") ?? undefined} verifyError={params.get("err") === "verifikasi"} />
      <p className="text-center text-[12.5px] text-muted-foreground">
        Belum punya akun?{" "}
        <Link to="/register" className="font-semibold text-primary hover:underline">
          Daftar di sini
        </Link>
      </p>
    </AuthCard>
  );
}
