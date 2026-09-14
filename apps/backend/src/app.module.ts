import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { appConfig } from "./config/configuration";
import { RequestContextMiddleware } from "./common/logger/request-context.middleware";
import { LoggerModule } from "./common/logger/logger.module";
import { AuthModule } from "./auth/auth.module";
import { CoreModule } from "./core/core.module";
import { DatabaseModule } from "./database/database.module";
import { HealthModule } from "./health/health.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
    }),
    EventEmitterModule.forRoot(),
    LoggerModule,
    DatabaseModule,
    AuthModule,
    CoreModule,
    HealthModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestContextMiddleware).forRoutes("*");
  }
}
