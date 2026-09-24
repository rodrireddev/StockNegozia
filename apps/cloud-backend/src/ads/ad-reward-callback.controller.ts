import { Controller, Get, HttpCode, Inject, Req } from "@nestjs/common";
import { AdRewardCallbackService } from "./ad-reward-callback.service";

/** Lo único que necesitamos de la request — evitar depender de los tipos de `express`. */
interface RawUrlRequest {
  url: string;
}

/**
 * Público a propósito — lo llama el servidor de AdMob, no un cliente nuestro (Server-Side
 * Verification, ver `AdRewardCallbackService`). La autenticación real es la firma ECDSA de
 * Google, verificada ahí — no un `AccountJwtGuard`. Google espera `HTTP 200 OK`; cualquier otra
 * respuesta hace que reintente hasta 5 veces cada 1 segundo (doc de Google).
 */
@Controller("ads")
export class AdRewardCallbackController {
  constructor(@Inject(AdRewardCallbackService) private readonly service: AdRewardCallbackService) {}

  @Get("reward-callback")
  @HttpCode(200)
  async rewardCallback(@Req() request: RawUrlRequest): Promise<{ status: "ok" }> {
    const rawQuery = request.url.split("?")[1] ?? "";
    await this.service.handle(rawQuery);
    return { status: "ok" };
  }
}
