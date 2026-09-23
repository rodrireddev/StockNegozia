import { Controller, Get } from "@nestjs/common";
import { Public } from "./public.decorator";

@Controller("health")
export class HealthController {
  // Público: el pinger anti cold-start de Render (doc §6) le pega a este endpoint sin credential.
  @Public()
  @Get()
  check() {
    return { status: "ok" };
  }
}
