import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Query, UseGuards } from "@nestjs/common";
import type { ActiveAdPlacementDto, ActiveHouseAdDto, AdPlatform } from "@stocknegozia/api-contracts";
import { recordHouseAdImpressionSchema, type RecordHouseAdImpressionInput } from "@stocknegozia/validation";
import { AccountJwtGuard } from "../accounts/account-jwt.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdPlacementsService } from "./ad-placements.service";
import { HouseAdsService } from "./house-ads.service";

const VALID_PLATFORMS: readonly AdPlatform[] = ["android", "ios", "desktop"];

/**
 * Lo que consume `mobile-mini`/`apps/desktop` para saber qué anuncio pedir — sin metadata de
 * admin. El placement vive detrás de cuenta (mismo gate que el resto de "Beneficios"); el house
 * ad NO (doc: `mobile-mini` funciona sin cuenta, así que su fallback tiene que funcionar igual).
 */
@Controller("ads")
export class AdsClientController {
  constructor(
    @Inject(AdPlacementsService) private readonly adPlacementsService: AdPlacementsService,
    @Inject(HouseAdsService) private readonly houseAdsService: HouseAdsService,
  ) {}

  @UseGuards(AccountJwtGuard)
  @Get("placements/:key")
  getPlacement(
    @Param("key") key: string,
    @Query("platform") platform: string,
  ): Promise<ActiveAdPlacementDto | null> {
    if (!VALID_PLATFORMS.includes(platform as AdPlatform)) {
      throw new BadRequestException(`Plataforma desconocida: "${platform}"`);
    }
    return this.adPlacementsService.getActiveForClient(key, platform as AdPlatform);
  }

  @Get("house-ad/active")
  getActiveHouseAd(): Promise<ActiveHouseAdDto | null> {
    return this.houseAdsService.getActiveForClient();
  }

  @Post("house-ad/:id/impression")
  recordImpression(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(recordHouseAdImpressionSchema)) body: RecordHouseAdImpressionInput,
  ): Promise<void> {
    return this.houseAdsService.recordImpression(id, body.userId);
  }
}
