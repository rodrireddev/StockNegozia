import { Module } from "@nestjs/common";
import { BackupController } from "./backup.controller";
import { AutoBackupService } from "./auto-backup.service";
import { BackupService } from "./backup.service";

@Module({
  controllers: [BackupController],
  providers: [BackupService, AutoBackupService],
})
export class BackupModule {}
