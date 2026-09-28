import {
  BadGatewayException,
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import type { CloudAccountStatusDto } from "@stocknegozia/api-contracts";
import {
  setCloudAccountSessionSchema,
  type SetCloudAccountSessionInput,
} from "@stocknegozia/validation";
import { AdminDeviceGuard } from "../auth/guards/admin-device.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CloudSessionService } from "./cloud-session.service";

/**
 * Proxy hacia `apps/cloud-backend` para lo que `apps/mobile` necesita de la cuenta cloud del
 * desktop emparejado (saldo, objetivos activos, rewarded ad) — ver
 * docs/monetization/ADS_CREDITS_GAMIFICATION.md §6. Todo endpoint salvo `session` reenvía tal cual
 * con el JWT en memoria (`CloudSessionService`); nunca revela el token ni la URL de cloud-backend
 * al llamador.
 */
@Controller("cloud-account")
export class CloudAccountController {
  // @Inject explícito: ver el comentario equivalente en GlobalExceptionFilter (esbuild/Vitest no
  // emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(@Inject(CloudSessionService) private readonly cloudSession: CloudSessionService) {}

  /**
   * Solo Electron main llama esto (con el device credential del propio desktop) — ver
   * `apps/desktop/electron/main/index.ts`. `AdminDeviceGuard` es lo que impide que un `apps/mobile`
   * emparejado pueda fijar/borrar la sesión de otro dispositivo.
   */
  @UseGuards(AdminDeviceGuard)
  @Put("session")
  setSession(
    @Body(new ZodValidationPipe(setCloudAccountSessionSchema)) body: SetCloudAccountSessionInput,
  ): CloudAccountStatusDto {
    this.cloudSession.setToken(body.accessToken);
    return { linked: this.cloudSession.isLinked() };
  }

  /** Poll-eado por `apps/mobile` para decidir si "Beneficios" existe en su menú (doc, requisito 4). */
  @Get("status")
  status(): CloudAccountStatusDto {
    return { linked: this.cloudSession.isLinked() };
  }

  @Get("me")
  me() {
    return this.forwardOrThrow("/accounts/me");
  }

  @Get("goals/active")
  activeGoals() {
    return this.forwardOrThrow("/gamification/goals/active");
  }

  @Get("rewarded-ad/status")
  rewardedAdStatus() {
    return this.forwardOrThrow("/gamification/rewarded-ad/status");
  }

  @Get("ads/placement/:key")
  adPlacement(@Param("key") key: string, @Query("platform") platform: string) {
    const query = platform ? `?platform=${encodeURIComponent(platform)}` : "";
    return this.forwardOrThrow(`/ads/placements/${encodeURIComponent(key)}${query}`);
  }

  @Post("rewarded-ad/claim")
  claimRewardedAd() {
    return this.forwardOrThrow("/gamification/rewarded-ad/claim", { method: "POST" });
  }

  private async forwardOrThrow<T>(path: string, init?: RequestInit): Promise<T> {
    const result = await this.cloudSession.forward<T>(path, init);
    if (result.ok) return result.body;
    if (result.status === "upstream_error") {
      throw new BadGatewayException("No se pudo contactar a la cuenta cloud en este momento");
    }
    throw new NotFoundException({
      code: "not_linked",
      message: "El desktop emparejado no tiene una cuenta cloud logueada",
    });
  }
}
