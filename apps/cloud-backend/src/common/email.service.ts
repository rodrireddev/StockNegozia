import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { appConfig } from "../config/configuration";

export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
}

/**
 * SendGrid — pasó por Resend, el SMTP real de Gmail y la API REST de Gmail antes de volver acá
 * (doc ADS_CREDITS_GAMIFICATION.md §3). Resend exige un dominio propio verificado para mandar a
 * cualquier destinatario (sin dominio, solo deja mandar a la casilla dueña de la cuenta). El SMTP
 * real de Gmail evitaba el problema de spam de un remitente @gmail.com sin dominio, pero Render
 * bloquea los puertos SMTP salientes en el plan free. La API REST de Gmail (OAuth2) evitaba el
 * bloqueo de puertos, pero requiere un proyecto de Google Cloud con facturación — sin tarjeta que
 * pase esa verificación, no se puede completar el alta. SendGrid con "Single Sender Verification"
 * es la opción que factualmente funciona sin dominio propio ni tarjeta: manda por HTTPS (443,
 * nunca bloqueado) y llega, aunque sin dominio propio verificado en SendGrid cae a la carpeta de
 * spam del destinatario (limitación conocida, no hay forma de evitarla sin ese dominio). Sin
 * `SENDGRID_API_KEY`, sigue logueando en vez de mandar (mismo comportamiento que siempre tuvo en
 * dev/test). `AccountsService` solo conoce este `send()`, nunca la API de SendGrid directamente.
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
      this.logger.log(
        `[EMAIL simulado] Para: ${email.to} | Asunto: ${email.subject}\n${email.body}`,
      );
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
        this.logger.error(
          `No se pudo mandar el email a ${email.to}: ${response.status} ${errorBody}`,
        );
        return;
      }
      this.logger.log(`Email enviado a ${email.to} | Asunto: ${email.subject}`);
    } catch (err) {
      this.logger.error(
        `No se pudo mandar el email a ${email.to}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
