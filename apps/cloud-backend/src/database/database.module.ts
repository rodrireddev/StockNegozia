import { Global, Module } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import path from "node:path";
import { Pool } from "pg";
import { appConfig } from "../config/configuration";
import { DRIZZLE_CLIENT } from "./database.constants";
import * as schema from "./schema";

const PG_POOL = Symbol("PG_POOL");

@Global()
@Module({
  providers: [
    {
      provide: PG_POOL,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const config = configService.get<ConfigType<typeof appConfig>>("app")!;
        return new Pool({ connectionString: config.databaseUrl });
      },
    },
    {
      provide: DRIZZLE_CLIENT,
      inject: [PG_POOL],
      useFactory: async (pool: Pool) => {
        const db = drizzle(pool, { schema });
        // Se resuelve desde el árbol fuente (no desde dist/) para evitar condiciones de carrera
        // entre la copia de assets y el watcher de "nest start --watch" — mismo motivo que
        // apps/backend/src/database/database.module.ts.
        await migrate(db, { migrationsFolder: path.join(process.cwd(), "src/database/migrations") });
        return db;
      },
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class DatabaseModule {}
