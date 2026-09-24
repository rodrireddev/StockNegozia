import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { Resend } from "resend";
import { appConfig } from "../config/configuration";

export interface OutgoingEmail {
  to: string;
  subject: string;
  body: string;
}

/**
 * Resend (doc ADS_CREDITS_GAMIFICATION.md §3) — si `RESEND_API_KEY` no está seteada, sigue
 * logueando en vez de mandar (mismo comportamiento que siempre tuvo en dev/test, sin necesitar
 * cuenta real para probar el resto del flujo). `AccountsService` solo conoce este `send()`, nunca
 * el SDK de Resend directamente.
 */
@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly resend: Resend | null;
  private readonly fromEmail: string;

  constructor(@Inject(ConfigService) configService: ConfigService) {
    const config = configService.get<ConfigType<typeof appConfig>>("app")!;
    this.resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;
    this.fromEmail = config.resendFromEmail;
  }

  async send(email: OutgoingEmail): Promise<void> {
    if (!this.resend) {
      this.logger.log(`[EMAIL simulado] Para: ${email.to} | Asunto: ${email.subject}\n${email.body}`);
      return;
    }

    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to: email.to,
      subject: email.subject,
      // El body siempre fue texto plano simple (códigos/links) — un <br> por salto de línea
      // alcanza, no hace falta una plantilla HTML para esto.
      text: email.body,
      html: email.body.replace(/\n/g, "<br>"),
    });

    if (error) {
      // No relanza — mismo criterio que `sendVerificationEmail`/`requestPasswordReset` en
      // `AccountsService`, que ya tratan el email como best-effort y nunca bloquean el flujo por
      // esto (doc "nunca bloquea nada, en ningún nivel").
      this.logger.error(`No se pudo mandar el email a ${email.to}: ${error.message}`);
    }
  }
}
