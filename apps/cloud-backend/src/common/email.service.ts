import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { createTransport, type Transporter } from "nodemailer";
import { appConfig } from "../config/configuration";

export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
}

/**
 * SMTP real de Gmail, no un ESP de terceros (Resend/SendGrid) — doc ADS_CREDITS_GAMIFICATION.md
 * §3. Tanto Resend como SendGrid mandan desde SUS PROPIOS servidores diciendo "From: alguien@
 * gmail.com" — sin dominio propio verificado no hay forma de alinear SPF/DKIM para ese remitente,
 * y Gmail (con razón) lo trata como spoofing y lo manda a spam, confirmado mandando un registro
 * real en producción. Autenticarse contra `smtp.gmail.com` con una cuenta de Gmail de verdad
 * evita el problema de raíz: el mensaje sale genuinamente de la infraestructura de Google, no de
 * un tercero que dice serlo. Sin `GMAIL_USER`/`GMAIL_APP_PASSWORD`, sigue logueando en vez de
 * mandar (mismo comportamiento que siempre tuvo en dev/test, sin necesitar la cuenta para probar
 * el resto del flujo). `AccountsService` solo conoce este `send()`, nunca Nodemailer directamente.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter | null;
  private readonly fromEmail: string | undefined;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const config = configService.get<ConfigType<typeof appConfig>>("app")!;
    this.fromEmail = config.gmailUser;
    this.transporter =
      config.gmailUser && config.gmailAppPassword
        ? createTransport({
            service: "gmail",
            auth: { user: config.gmailUser, pass: config.gmailAppPassword },
          })
        : null;
  }

  async send(email: OutgoingEmail): Promise<void> {
    if (!this.transporter || !this.fromEmail) {
      this.logger.log(`[EMAIL simulado] Para: ${email.to} | Asunto: ${email.subject}\n${email.body}`);
      return;
    }

    // No relanza — mismo criterio que `sendVerificationEmail`/`requestPasswordReset` en
    // `AccountsService`, que ya tratan el email como best-effort y nunca bloquean el flujo por
    // esto (doc "nunca bloquea nada, en ningún nivel").
    try {
      await this.transporter.sendMail({
        from: `StockNegozia <${this.fromEmail}>`,
        to: email.to,
        subject: email.subject,
        // El body siempre fue texto plano simple (códigos/links) — un <br> por salto de línea
        // alcanza, no hace falta una plantilla HTML para esto.
        text: email.body,
        html: email.body.replace(/\n/g, "<br>"),
      });
      this.logger.log(`Email enviado a ${email.to} | Asunto: ${email.subject}`);
    } catch (err) {
      this.logger.error(
        `No se pudo mandar el email a ${email.to}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }
}
