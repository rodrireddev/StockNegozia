import { Module } from "@nestjs/common";
import { AdminAuthModule } from "../admin-auth/admin-auth.module";
import { AchievementDefinitionsController } from "./achievement-definitions.controller";
import { AchievementDefinitionsRepository } from "./achievement-definitions.repository";
import { AchievementDefinitionsService } from "./achievement-definitions.service";

@Module({
  imports: [AdminAuthModule],
  controllers: [AchievementDefinitionsController],
  providers: [AchievementDefinitionsService, AchievementDefinitionsRepository],
})
export class AchievementsModule {}
