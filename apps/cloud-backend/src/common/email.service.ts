import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { appConfig } from "../config/configuration";

export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
}

/**
 * SendGrid, no Resend (doc ADS_CREDITS_GAMIFICATION.md §3) — Resend exige un dominio propio
 * verificado para mandar a cualquier destinatario (sin dominio, solo deja mandar a la casilla
 * dueña de la cuenta, ver el error real que tiramos al probarlo). SendGrid en cambio permite
 * "Single Sender Verification": verificás un email que ya tenés (no hace falta dominio) y desde
 * ahí mandás a cualquiera. Sin `SENDGRID_API_KEY`, sigue logueando en vez de mandar (mismo
 * comportamiento que siempre tuvo en dev/test, sin necesitar cuenta real para probar el resto del
 * flujo). `AccountsService` solo conoce este `send()`, nunca la API de SendGrid directamente.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly apiKey: string | undefined;
  private readonly fromEmail: string | undefined;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const config = configService.get<ConfigType<typeof appConfig>>("app")!;
    this.apiKey = config.sendgridApiKey;
    this.fromEmail = config.sendgridFromEmail;
  }

  async send(email: OutgoingEmail): Promise<void> {
    if (!this.apiKey || !this.fromEmail) {
      this.logger.log(`[EMAIL simulado] Para: ${email.to} | Asunto: ${email.subject}\n${email.body}`);
      return;
    }

    // No relanza — mismo criterio que `sendVerificationEmail`/`requestPasswordReset` en
    // `AccountsService`, que ya tratan el email como best-effort y nunca bloquean el flujo por
    // esto (doc "nunca bloquea nada, en ningún nivel").
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: email.to }] }],
          from: { email: this.fromEmail, name: "StockNegozia" },
          subject: email.subject,
          // El body siempre fue texto plano simple (códigos/links) — un <br> por salto de línea
          // alcanza, no hace falta una plantilla HTML para esto.
          content: [
            { type: "text/plain", value: email.body },
            { type: "text/html", value: email.body.replace(/\n/g, "<br>") },
          ],
        }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        this.logger.error(`No se pudo mandar el email a ${email.to}: ${response.status} ${errorBody}`);
      }
    } catch (err) {
      this.logger.error(
        `No se pudo mandar el email a ${email.to}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
