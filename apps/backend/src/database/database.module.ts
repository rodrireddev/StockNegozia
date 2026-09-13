import { Global, Module } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { appConfig } from "../config/configuration";
import { ensureDataDirs } from "../config/ensure-data-dirs";
import { DRIZZLE_CLIENT } from "./database.constants";
import * as schema from "./schema";

@Global()
@Module({
  providers: [
    {
      provide: DRIZZLE_CLIENT,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<ConfigType<typeof appConfig>>("app")!;
        ensureDataDirs(config);

        const sqlite = new Database(config.databaseFile);
        sqlite.pragma("journal_mode = WAL");

        const db = drizzle(sqlite, { schema });
        // Se resuelve desde el árbol fuente (no desde dist/) para evitar condiciones de
        // carrera entre la copia de assets y el watcher de "nest start --watch".
        migrate(db, { migrationsFolder: path.join(process.cwd(), "src/database/migrations") });

        return db;
      },
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class DatabaseModule {}
