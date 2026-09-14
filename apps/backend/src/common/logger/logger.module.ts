import { Global, Module } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { appConfig } from "../../config/configuration";
import { AppLogger } from "./app-logger.service";
import { GlobalExceptionFilter } from "./global-exception.filter";
import { RequestContextMiddleware } from "./request-context.middleware";

@Global()
@Module({
  providers: [
    {
      provide: AppLogger,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<ConfigType<typeof appConfig>>("app")!;
        return new AppLogger({
          level: config.logLevel,
          dir: config.logDir,
          persistence: config.logPersistence,
          console: config.logConsole,
        });
      },
    },
    RequestContextMiddleware,
    {
      provide: APP_FILTER,
      useClass: GlobalExceptionFilter,
    },
  ],
  exports: [AppLogger, RequestContextMiddleware],
})
export class LoggerModule {}
