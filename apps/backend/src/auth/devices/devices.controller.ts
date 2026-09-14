import {
  Body,
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { DeviceDto } from "@stocknegozia/api-contracts";
import { updateDeviceSchema, type UpdateDeviceInput } from "@stocknegozia/validation";
import { ZodValidationPipe } from "../../common/pipes/zod-validation.pipe";
import { AdminDeviceGuard } from "../guards/admin-device.guard";
import type { RequestWithDevice } from "../guards/api-access.guard";
import { DevicesService } from "./devices.service";

/**
 * Device Management — ver docs/security/DEVICE_MANAGEMENT.md. Todo lo que administra OTROS
 * dispositivos (`list`, `getById`, `update`, `revoke`) exige el dispositivo administrador
 * (`AdminDeviceGuard`); `/me` es la única excepción — cualquier dispositivo autenticado puede
 * consultar su propia información, resuelta siempre desde `request.device` (nunca desde un `:id`
 * de la URL, para que un dispositivo no pueda "consultarse como otro" manipulando el path).
 */
@Controller("auth/devices")
export class DevicesController {
  // @Inject explícito: ver el comentario equivalente en GlobalExceptionFilter (esbuild/Vitest no
  // emite la metadata de tipos que la inyección automática de NestJS necesita).
  constructor(@Inject(DevicesService) private readonly devicesService: DevicesService) {}

  @UseGuards(AdminDeviceGuard)
  @Get()
  list(@Req() request: RequestWithDevice): DeviceDto[] {
    return this.devicesService.list(request.device?.id);
  }

  // Declarado ANTES de `:id` — de lo contrario Nest/Express matchearía "me" como si fuera un `:id`.
  @Get("me")
  me(@Req() request: RequestWithDevice): DeviceDto {
    if (!request.device) {
      throw new NotFoundException("No hay un dispositivo autenticado en este request");
    }
    return this.devicesService.getById(request.device.id, request.device.id);
  }

  @UseGuards(AdminDeviceGuard)
  @Get(":id")
  getById(@Param("id", new ParseUUIDPipe()) id: string, @Req() request: RequestWithDevice): DeviceDto {
    return this.devicesService.getById(id, request.device?.id);
  }

  @UseGuards(AdminDeviceGuard)
  @Patch(":id")
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body(new ZodValidationPipe(updateDeviceSchema)) body: UpdateDeviceInput,
    @Req() request: RequestWithDevice,
  ): DeviceDto {
    return this.devicesService.updateName(id, body.name, request.device?.id);
  }

  @UseGuards(AdminDeviceGuard)
  @Post(":id/revoke")
  revoke(@Param("id", new ParseUUIDPipe()) id: string, @Req() request: RequestWithDevice): DeviceDto {
    return this.devicesService.revoke(id, request.device?.id);
  }
}
