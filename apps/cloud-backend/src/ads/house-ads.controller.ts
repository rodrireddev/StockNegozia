import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { HouseAdDto } from "@stocknegozia/api-contracts";
import {
  createHouseAdSchema,
  updateHouseAdSchema,
  type CreateHouseAdInput,
  type UpdateHouseAdInput,
} from "@stocknegozia/validation";
import { AdminJwtGuard, type RequestWithAdmin } from "../admin-auth/admin-jwt.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { HouseAdsService } from "./house-ads.service";

/** Panel admin (doc §7/§1bis) — catálogo de anuncios propios (fallback cuando no hay fill). */
@Controller("admin/house-ads")
@UseGuards(AdminJwtGuard)
export class HouseAdsController {
  constructor(@Inject(HouseAdsService) private readonly service: HouseAdsService) {}

  @Get()
  list(): Promise<HouseAdDto[]> {
    return this.service.list();
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createHouseAdSchema)) body: CreateHouseAdInput,
    @Req() request: RequestWithAdmin,
  ): Promise<HouseAdDto> {
    return this.service.create(body, request.admin!.id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body(new ZodValidationPipe(updateHouseAdSchema)) body: UpdateHouseAdInput,
    @Req() request: RequestWithAdmin,
  ): Promise<HouseAdDto> {
    return this.service.update(id, body, request.admin!.id);
  }
}
