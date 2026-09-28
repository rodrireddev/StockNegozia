import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAccount } from "../AccountContext";
import { AchievementsList } from "../components/AchievementsList";
import { ActiveGoalsCard } from "../components/ActiveGoalsCard";
import { LoginForm } from "../components/LoginForm";
import { RegisterForm } from "../components/RegisterForm";

/**
 * Beneficios en `apps/desktop` (doc ADS_CREDITS_GAMIFICATION.md §6) — equivalente de
 * `BenefitsScreen` de `mobile-mini`, salvo la card de rewarded ad: Electron no tiene SDK de AdMob
 * (doc §1bis), así que en su lugar hay un aviso fijo señalando la app mobile emparejada. Nunca
 * muestra un botón de "ver anuncio" acá — ese feature es exclusivo de `apps/mobile` (requisito 2).
 */
export function BenefitsPage() {
  const { status, me } = useAccount();
  const [mode, setMode] = useState<"login" | "register">("login");

  if (status === "bootstrapping") {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Cargando…</span>
      </div>
    );
  }

  if (status === "unauthenticated" || !me) {
    return (
      <div className="mx-auto max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">Beneficios</h1>
        <p className="text-sm text-muted-foreground">
          Creá una cuenta gratis para juntar créditos y desbloquear backup en la nube, reportes y
          más — nunca hace falta para vender o cargar stock.
        </p>
        <Card>
          <CardContent className="pt-6">
            {mode === "login" ? (
              <LoginForm onSwitchToRegister={() => setMode("register")} />
            ) : (
              <RegisterForm onSwitchToLogin={() => setMode("login")} />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return <AuthenticatedBenefits />;
}

function AuthenticatedBenefits() {
  const { me, signOut } = useAccount();
  if (!me) return null;

  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">Beneficios</h1>

      <Card>
        <CardHeader>
          <CardTitle>Tu saldo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          <p className="text-2xl font-semibold">{me.creditBalance} créditos</p>
          <p className="text-sm text-muted-foreground">Racha actual: {me.currentStreak} días</p>
          <p className="text-sm text-muted-foreground">Código de referido: {me.referralCode}</p>
        </CardContent>
      </Card>

      <ActiveGoalsCard />
      <AchievementsList />

      <Card>
        <CardHeader>
          <CardTitle>Ganá créditos gratis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            En la versión de escritorio no se pueden ver anuncios para sumar créditos. Para ganar
            créditos mirando anuncios, usá la app StockNegozia Mobile en tu celular emparejado con
            esta PC.
          </p>
        </CardContent>
      </Card>

      <Button variant="ghost" onClick={signOut}>
        Cerrar sesión
      </Button>
    </div>
  );
}
