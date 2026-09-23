import { Body, Controller, Inject, Post } from "@nestjs/common";
import type { AdminLoginResult } from "@stocknegozia/api-contracts";
import { adminLoginSchema, type AdminLoginInput } from "@stocknegozia/validation";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdminAuthService } from "./admin-auth.service";

@Controller("admin/auth")
export class AdminAuthController {
  constructor(@Inject(AdminAuthService) private readonly adminAuthService: AdminAuthService) {}

  @Post("login")
  login(
    @Body(new ZodValidationPipe(adminLoginSchema)) body: AdminLoginInput,
  ): Promise<AdminLoginResult> {
    return this.adminAuthService.login(body.email, body.password);
  }
}
