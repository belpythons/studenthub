import * as React from "react";
import { useNavigate } from "react-router-dom";
import { LogIn } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Field, fieldAria } from "@/components/shared/field";
import { createClient } from "@/lib/supabase/client";
import { describeError } from "@/lib/notify";
import { AnimatePresence } from "@/components/motion/motion-primitives";
import { FormAlert } from "@/components/shared/form-alert";

export default function LoginForm({
  next,
  verifyError,
}: {
  next?: string;
  /** Dikirim /auth/confirm ketika tautan verifikasi gagal atau kedaluwarsa. */
  verifyError?: boolean;
}) {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(
    verifyError
      ? "Tautan verifikasi tidak berlaku lagi — biasanya karena sudah dipakai atau lewat 24 jam. Masuk saja bila akun Anda sudah aktif, atau daftar ulang untuk mendapat tautan baru."
      : null,
  );
  const [busy, setBusy] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setError(
        error.message === "Invalid login credentials"
          ? "Email atau password salah."
          : error.message === "Email not confirmed"
            ? "Email belum dikonfirmasi. Cek kotak masuk Anda."
            : describeError(error),
      );
      setBusy(false);
      return;
    }

    navigate(next || "/dashboard", { replace: true });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3.5">
      <AnimatePresence initial={false}>
        {error && <FormAlert tone="error">{error}</FormAlert>}
      </AnimatePresence>

      <Field label="Email" htmlFor="email" required error={null}>
        <Input
          {...fieldAria("email")}
          type="email"
          placeholder="nama@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          autoFocus
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <PasswordInput
          {...fieldAria("password")}
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />
      </Field>

      <Button type="submit" variant="gradient" loading={busy} className="w-full">
        {!busy && <LogIn aria-hidden />}
        {busy ? "Memproses…" : "Masuk"}
      </Button>
    </form>
  );
}
