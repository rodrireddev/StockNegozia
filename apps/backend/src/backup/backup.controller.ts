import { Body, Controller, Inject, Post, UseGuards } from "@nestjs/common";
import type { BackupResultDto, BackupValidationResultDto } from "@stocknegozia/api-contracts";
import {
  createBackupSchema,
  validateBackupSchema,
  type CreateBackupInput,
  type ValidateBackupInput,
} from "@stocknegozia/validation";
import { ZodValidationPipe } from "../common/pipes/zod-validation.pipe";
import { AdminDeviceGuard } from "../auth/guards/admin-device.guard";
import { BackupService } from "./backup.service";

/**
 * Solo Electron Main llama a estos endpoints — nunca el Renderer directamente (ver
 * docs/backup/BACKUP_RESTORE.md §Seguridad). `AdminDeviceGuard` porque backup/restore son
 * operaciones de administración de la instalación, mismo criterio que `/auth/devices`.
 *
 * No hay un endpoint de restore acá: el reemplazo del archivo ocurre con el backend DETENIDO (ver
 * docs/backup/BACKUP_RESTORE.md §Arquitectura de Restore) — no puede ser un endpoint HTTP porque,
 * durante ese paso, no hay ningún servidor escuchando.
 */
@Controller("backup")
@UseGuards(AdminDeviceGuard)
export class BackupController {
  constructor(@Inject(BackupService) private readonly backupService: BackupService) {}

  @Post()
  create(
    @Body(new ZodValidationPipe(createBackupSchema)) body: CreateBackupInput,
  ): Promise<BackupResultDto> {
    return this.backupService.create(body.destinationPath);
  }

  @Post("validate")
  validate(
    @Body(new ZodValidationPipe(validateBackupSchema)) body: ValidateBackupInput,
  ): BackupValidationResultDto {
    return this.backupService.validate(body.filePath);
  }
}
