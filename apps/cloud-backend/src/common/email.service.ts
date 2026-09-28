import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { appConfig } from "../config/configuration";

export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
}

interface GmailCredentials {
  user: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
}

/**
 * API REST de Gmail (OAuth2), no SMTP ni un ESP de terceros — doc ADS_CREDITS_GAMIFICATION.md §3.
 * Pasó por Resend, SendGrid y el SMTP real de Gmail antes de llegar acá:
 * - Resend/SendGrid mandan desde SUS servidores diciendo "From: alguien@gmail.com" sin poder
 *   alinear SPF/DKIM (no hay dominio propio) — Gmail lo trata como spoofing, cae a spam.
 * - El SMTP real de Gmail (`smtp.gmail.com`) evitaba el spam, pero Render bloquea el tráfico
 *   saliente a los puertos SMTP (25/465/587) en el plan free desde sep-2025 (ver el changelog de
 *   Render) — la conexión daba timeout siempre, sin excepción de puerto.
 * - La API REST (`gmail.googleapis.com`) es HTTPS normal, puerto 443 — nunca bloqueado — y el
 *   mensaje sigue saliendo genuinamente de la infraestructura de Google, mismo beneficio que el
 *   SMTP real sin el problema del puerto.
 *
 * Sin `GMAIL_USER`/`GMAIL_CLIENT_ID`/`GMAIL_CLIENT_SECRET`/`GMAIL_REFRESH_TOKEN`, sigue logueando
 * en vez de mandar (mismo comportamiento que siempre tuvo en dev/test). `AccountsService` solo
 * conoce este `send()`, nunca la API de Gmail directamente.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly credentials: GmailCredentials | null;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const config = configService.get<ConfigType<typeof appConfig>>("app")!;
    this.credentials =
      config.gmailUser && config.gmailClientId && config.gmailClientSecret && config.gmailRefreshToken
        ? {
            user: config.gmailUser,
            clientId: config.gmailClientId,
            clientSecret: config.gmailClientSecret,
            refreshToken: config.gmailRefreshToken,
          }
        : null;
  }

  async send(email: OutgoingEmail): Promise<void> {
    if (!this.credentials) {
      this.logger.log(`[EMAIL simulado] Para: ${email.to} | Asunto: ${email.subject}\n${email.body}`);
      return;
    }

    // No relanza — mismo criterio que `sendVerificationEmail`/`requestPasswordReset` en
    // `AccountsService`, que ya tratan el email como best-effort y nunca bloquean el flujo por
    // esto (doc "nunca bloquea nada, en ningún nivel").
    try {
      const accessToken = await this.getAccessToken(this.credentials);
      const raw = buildRawMessage({
        from: this.credentials.user,
        to: email.to,
        subject: email.subject,
        html: email.body.replace(/\n/g, "<br>"),
      });

      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        this.logger.error(`No se pudo mandar el email a ${email.to}: ${response.status} ${errorBody}`);
        return;
      }
      this.logger.log(`Email enviado a ${email.to} | Asunto: ${email.subject}`);
    } catch (err) {
      this.logger.error(
        `No se pudo mandar el email a ${email.to}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  /** Los access token de OAuth2 duran ~1h — se pide uno nuevo en cada envío en vez de cachearlo,
   *  el volumen de emails de esta app no justifica la complejidad de cachear/invalidar. */
  private async getAccessToken(credentials: GmailCredentials): Promise<string> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: credentials.clientId,
        client_secret: credentials.clientSecret,
        refresh_token: credentials.refreshToken,
        grant_type: "refresh_token",
      }),
    });
    if (!response.ok) {
      throw new Error(`No se pudo renovar el access token de Gmail: ${response.status} ${await response.text()}`);
    }
    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  }
}

/** Arma el mensaje RFC 2822 crudo que espera `messages.send` (base64url, ver doc de la Gmail API) —
 *  el asunto va codificado en RFC 2047 porque puede tener tildes/ñ, no ASCII plano. */
function buildRawMessage(params: { from: string; to: string; subject: string; html: string }): string {
  const encodedSubject = `=?UTF-8?B?${Buffer.from(params.subject, "utf-8").toString("base64")}?=`;
  const message = [
    `From: StockNegozia <${params.from}>`,
    `To: ${params.to}`,
    `Subject: ${encodedSubject}`,
    "MIME-Version: 1.0",
    `Content-Type: text/html; charset="UTF-8"`,
    "Content-Transfer-Encoding: base64",
    "",
    Buffer.from(params.html, "utf-8").toString("base64"),
  ].join("\r\n");
  return Buffer.from(message, "utf-8").toString("base64url");
}
