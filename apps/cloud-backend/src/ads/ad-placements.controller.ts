import { BadRequestException, Body, Controller, Get, Inject, Param, Patch, Req, UseGuards } from "@nestjs/common";
import type { AdPlacementDto, AdPlacementRevisionDto, AdPlatform } from "@stocknegozia/api-contracts";
import { updateAdPlacementSchema, type UpdateAdPlacementInput } from "@stocknegozia/validation";
import { AdminJwtGuard, type RequestWithAdmin } from "../admin-auth/admin-jwt.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdPlacementsService } from "./ad-placements.service";

const VALID_PLATFORMS: readonly AdPlatform[] = ["android", "ios", "desktop"];

function parsePlatform(raw: string): AdPlatform {
  if (!VALID_PLATFORMS.includes(raw as AdPlatform)) {
    throw new BadRequestException(`Plataforma desconocida: "${raw}"`);
  }
  return raw as AdPlatform;
}

/** Panel admin (doc §7/§1bis) — balancea qué ad unit/red usa cada placement, sin tocar código. */
@Controller("admin/ad-placements")
@UseGuards(AdminJwtGuard)
export class AdPlacementsController {
  constructor(@Inject(AdPlacementsService) private readonly service: AdPlacementsService) {}

  @Get()
  list(): Promise<AdPlacementDto[]> {
    return this.service.list();
  }

  @Get(":key/:platform")
  getOne(@Param("key") key: string, @Param("platform") platform: string): Promise<AdPlacementDto> {
    return this.service.getByKeyAndPlatform(key, parsePlatform(platform));
  }

  @Get(":key/:platform/revisions")
  listRevisions(
    @Param("key") key: string,
    @Param("platform") platform: string,
  ): Promise<AdPlacementRevisionDto[]> {
    return this.service.listRevisions(key, parsePlatform(platform));
  }

  @Patch(":key/:platform")
  update(
    @Param("key") key: string,
    @Param("platform") platform: string,
    @Body(new ZodValidationPipe(updateAdPlacementSchema)) body: UpdateAdPlacementInput,
    @Req() request: RequestWithAdmin,
  ): Promise<AdPlacementDto> {
    return this.service.update(key, parsePlatform(platform), body, request.admin!.id, body.note);
  }
}
