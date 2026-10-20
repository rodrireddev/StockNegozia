import { Module } from "@nestjs/common";
import { AccountAuthModule } from "../accounts/account-auth.module";
import { AdminAuthModule } from "../admin-auth/admin-auth.module";
import { GamificationModule } from "../gamification/gamification.module";
import { AdPlacementsController } from "./ad-placements.controller";
import { AdPlacementsRepository } from "./ad-placements.repository";
import { AdPlacementsService } from "./ad-placements.service";
import { AdRewardCallbackController } from "./ad-reward-callback.controller";
import { AdRewardCallbackService } from "./ad-reward-callback.service";
import { AdRewardCallbacksRepository } from "./ad-reward-callbacks.repository";
import { AdsClientController } from "./ads-client.controller";
import { HouseAdsController } from "./house-ads.controller";
import { HouseAdsRepository } from "./house-ads.repository";
import { HouseAdsService } from "./house-ads.service";
import { SsvKeysService } from "./ssv-keys.service";

@Module({
  imports: [AdminAuthModule, AccountAuthModule, GamificationModule],
  controllers: [
    AdPlacementsController,
    HouseAdsController,
    AdsClientController,
    AdRewardCallbackController,
  ],
  providers: [
    AdPlacementsService,
    AdPlacementsRepository,
    HouseAdsService,
    HouseAdsRepository,
    AdRewardCallbackService,
    AdRewardCallbacksRepository,
    SsvKeysService,
  ],
})
export class AdsModule {}
