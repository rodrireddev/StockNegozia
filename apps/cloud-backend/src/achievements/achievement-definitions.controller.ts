import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type {
  AchievementDefinitionDto,
  AchievementDefinitionRevisionDto,
} from "@stocknegozia/api-contracts";
import {
  createAchievementSchema,
  updateAchievementSchema,
  type CreateAchievementInput,
  type UpdateAchievementInput,
} from "@stocknegozia/validation";
import { AdminJwtGuard, type RequestWithAdmin } from "../admin-auth/admin-jwt.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AchievementDefinitionsService } from "./achievement-definitions.service";

/** Panel admin — gestión completa de logros (crear/editar/desactivar) y su calendario. */
@Controller("admin/achievements")
@UseGuards(AdminJwtGuard)
export class AchievementDefinitionsController {
  constructor(
    @Inject(AchievementDefinitionsService) private readonly service: AchievementDefinitionsService,
  ) {}

  @Get()
  list(): Promise<AchievementDefinitionDto[]> {
    return this.service.list();
  }

  @Get(":key")
  getOne(@Param("key") key: string): Promise<AchievementDefinitionDto> {
    return this.service.getByKey(key);
  }

  @Get(":key/revisions")
  listRevisions(@Param("key") key: string): Promise<AchievementDefinitionRevisionDto[]> {
    return this.service.listRevisions(key);
  }

  @Post()
  create(
    @Body(new ZodValidationPipe(createAchievementSchema)) body: CreateAchievementInput,
    @Req() request: RequestWithAdmin,
  ): Promise<AchievementDefinitionDto> {
    return this.service.create(body, request.admin!.id);
  }

  @Patch(":key")
  update(
    @Param("key") key: string,
    @Body(new ZodValidationPipe(updateAchievementSchema)) body: UpdateAchievementInput,
    @Req() request: RequestWithAdmin,
  ): Promise<AchievementDefinitionDto> {
    return this.service.update(key, body, request.admin!.id);
  }
}
