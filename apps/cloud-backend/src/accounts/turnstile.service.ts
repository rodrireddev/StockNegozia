import { Inject, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { appConfig } from "../config/configuration";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

interface SiteverifyResponse {
  success: boolean;
}

/**
 * Verifica el token de Cloudflare Turnstile siempre del lado del servidor — un token que el
 * cliente diga que es válido no alcanza, se descarta y se re-verifica acá contra la API de
 * Cloudflare en cada llamada.
 */
@Injectable()
export class TurnstileService {
  private readonly logger = new Logger(TurnstileService.name);

  constructor(@Inject(ConfigService) private readonly configService: ConfigService) {}

  async verify(token: string, remoteIp?: string): Promise<boolean> {
    const config = this.configService.get<ConfigType<typeof appConfig>>("app")!;
    const secretKey = config.turnstileSecretKey;

    if (!secretKey) {
      // Mismo patrón que `SENDGRID_API_KEY`: sin la key, no se puede llamar a Cloudflare. En
      // producción eso es un error de configuración real; en dev/test se omite la verificación
      // para no obligar a nadie a dar de alta una cuenta de Cloudflare para correr el backend local.
      if (config.nodeEnv === "production") {
        throw new InternalServerErrorException("Turnstile no está configurado");
      }
      this.logger.warn(
        "TURNSTILE_SECRET_KEY no configurada — se omite la verificación del captcha (solo dev)",
      );
      return true;
    }

    const params = new URLSearchParams({ secret: secretKey, response: token });
    if (remoteIp) params.set("remoteip", remoteIp);

    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString(),
    });
    const result = (await response.json()) as SiteverifyResponse;
    return result.success === true;
  }
}
