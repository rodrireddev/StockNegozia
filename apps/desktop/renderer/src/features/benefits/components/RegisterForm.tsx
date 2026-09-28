import { useState } from "react";
import { accountRegisterSchema } from "@stocknegozia/validation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAccount } from "../AccountContext";
import { TurnstileWidget } from "./TurnstileWidget";

export function RegisterForm({ onSwitchToLogin }: { onSwitchToLogin: () => void }) {
  const { register } = useAccount();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileNonce, setTurnstileNonce] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const parsed = accountRegisterSchema.safeParse({
      email,
      password,
      referralCode: referralCode.trim() || undefined,
      turnstileToken: turnstileToken ?? undefined,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Datos inválidos");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await register(parsed.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
      // El token se consume en el `siteverify` del backend en cada intento — hace falta uno nuevo
      // para el próximo submit, sea cual sea el resultado de este.
      setTurnstileToken(null);
      setTurnstileNonce((n) => n + 1);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="register-password">Contraseña</Label>
        <Input
          id="register-password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="register-referral-code">Código de referido (opcional)</Label>
        <Input
          id="register-referral-code"
          value={referralCode}
          onChange={(e) => setReferralCode(e.target.value)}
        />
      </div>
      <TurnstileWidget resetKey={turnstileNonce} onToken={setTurnstileToken} />
      {error && <Alert variant="destructive">{error}</Alert>}
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Creando cuenta…" : "Crear cuenta"}
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={submitting}
        onClick={onSwitchToLogin}
      >
        Ya tengo cuenta
      </Button>
    </form>
  );
}
