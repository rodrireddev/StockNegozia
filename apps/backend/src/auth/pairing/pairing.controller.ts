import { Body, Controller, Inject, Post, Req } from "@nestjs/common";
import type { PairingConfirmResult, PairingCreateResult } from "@stocknegozia/api-contracts";
import {
  pairingCancelSchema,
  pairingConfirmSchema,
  type PairingCancelInput,
  type PairingConfirmInput,
} from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { Public } from "../decorators/public.decorator";
import type { RequestWithDevice } from "../guards/api-access.guard";
import { PairingService } from "./pairing.service";

/**
 * Pairing de nuevos dispositivos vía QR + código — ver docs/security/PAIRING.md. Solo `confirm`
 * es público: por definición, el dispositivo que confirma todavía no tiene credential. Crear y
 * cancelar un pairing sí requieren una credential válida (`ApiAccessGuard`, sin `@Public()`).
 */
@Controller("auth/pairing")
export class PairingController {
  // @Inject explícito: ver el comentario equivalente en GlobalExceptionFilter (esbuild/Vitest no
  // emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(@Inject(PairingService) private readonly pairingService: PairingService) {}

  @Post()
  create(@Req() request: RequestWithDevice): PairingCreateResult {
    return this.pairingService.createPairing({ initiatedByDeviceId: request.device?.id });
  }

  @Public()
  @Post("confirm")
  confirm(
    @Body(new ZodValidationPipe(pairingConfirmSchema)) body: PairingConfirmInput,
  ): PairingConfirmResult {
    return this.pairingService.confirmPairing(body);
  }

  @Post("cancel")
  cancel(@Body(new ZodValidationPipe(pairingCancelSchema)) body: PairingCancelInput): { ok: true } {
    this.pairingService.cancelPairing(body.pairingId);
    return { ok: true };
  }
}
