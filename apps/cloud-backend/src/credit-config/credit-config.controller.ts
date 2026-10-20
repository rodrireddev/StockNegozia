import { Body, Controller, Get, Inject, Param, Patch, Req, UseGuards } from "@nestjs/common";
import type { CreditConfigItemDto, CreditConfigItemRevisionDto } from "@stocknegozia/api-contracts";
import {
  updateCreditConfigItemSchema,
  type UpdateCreditConfigItemInput,
} from "@stocknegozia/validation";
import { AdminJwtGuard, type RequestWithAdmin } from "../admin-auth/admin-jwt.guard";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { CreditConfigService } from "./credit-config.service";

/**
 * Panel admin (doc §7) — balancea el costo/tope de cada feature sin tocar código. Protegido
 * enteramente por `AdminJwtGuard`, sin excepciones "públicas" (a diferencia de `/health`).
 */
@Controller("admin/credit-config")
@UseGuards(AdminJwtGuard)
export class CreditConfigController {
  constructor(@Inject(CreditConfigService) private readonly service: CreditConfigService) {}

  @Get()
  list(): Promise<CreditConfigItemDto[]> {
    return this.service.list();
  }

  @Get(":key")
  getByKey(@Param("key") key: string): Promise<CreditConfigItemDto> {
    return this.service.getByKey(key);
  }

  @Get(":key/revisions")
  listRevisions(@Param("key") key: string): Promise<CreditConfigItemRevisionDto[]> {
    return this.service.listRevisions(key);
  }

  @Patch(":key")
  update(
    @Param("key") key: string,
    @Body(new ZodValidationPipe(updateCreditConfigItemSchema)) body: UpdateCreditConfigItemInput,
    @Req() request: RequestWithAdmin,
  ): Promise<CreditConfigItemDto> {
    return this.service.updateValue(key, body.value, request.admin!.id, body.note);
  }
}
