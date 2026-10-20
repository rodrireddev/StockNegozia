import { useState } from "react";
import { accountLoginSchema } from "@stocknegozia/validation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/cloud-api-client";
import { useAccount } from "../AccountContext";
import { TurnstileWidget } from "./TurnstileWidget";

export function LoginForm({ onSwitchToRegister }: { onSwitchToRegister: () => void }) {
  const { login } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileNonce, setTurnstileNonce] = useState(0);
  // Arranca oculto — el backend solo exige captcha a partir del 5° login fallido consecutivo
  // desde esta IP, no en cada login normal (ver AccountsService.login en apps/cloud-backend).
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = accountLoginSchema.safeParse({
      email,
      password,
      turnstileToken: turnstileToken ?? undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await login(parsed.data);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CAPTCHA_REQUIRED") setCaptchaRequired(true);
      setError(err instanceof Error ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
      setTurnstileToken(null);
      setTurnstileNonce((n) => n + 1);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="login-password">Contraseña</Label>
        <Input
          id="login-password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {captchaRequired && <TurnstileWidget resetKey={turnstileNonce} onToken={setTurnstileToken} />}
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Ingresando…" : "Ingresar"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={submitting}
        onClick={onSwitchToRegister}
      >
        Crear cuenta
      </Button>
    </form>
  );
}
