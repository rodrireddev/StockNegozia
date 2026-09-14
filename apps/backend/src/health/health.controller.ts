import { Controller, Get } from "@nestjs/common";
import type { HealthStatus } from "@stocknegozia/api-contracts";
import { Public } from "../auth/decorators/public.decorator";
import { HealthService } from "./health.service";

@Controller("health")
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  // Público: Electron hace polling de /health antes de tener ninguna credential (bootstrap).
  @Public()
  @Get()
  check(): HealthStatus {
    return this.healthService.check();
  }
}
