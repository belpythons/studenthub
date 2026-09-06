import { Link } from "react-router-dom";

import AuthCard from "@/components/layout/AuthCard";
import RegisterForm from "@/pages/register/RegisterForm";
import { useTitle } from "@/lib/use-title";

export default function RegisterPage() {
  useTitle("Daftar");

  return (
    <AuthCard title="Daftar Akun" subtitle="Student Hub & Internship Logbook">
      <RegisterForm />
      <p className="text-center text-[12.5px] text-muted-foreground">
        Sudah punya akun?{" "}
        <Link to="/login" className="font-semibold text-primary hover:underline">
          Masuk di sini
        </Link>
      </p>
    </AuthCard>
  );
}
