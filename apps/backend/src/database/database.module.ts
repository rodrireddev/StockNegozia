import { Global, Logger, Module } from "@nestjs/common";
import { ConfigService, ConfigType } from "@nestjs/config";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import path from "node:path";
import { appConfig } from "../config/configuration";
import { ensureDataDirs } from "../config/ensure-data-dirs";
import { DRIZZLE_CLIENT } from "./database.constants";
import { backupBeforeMigrations } from "./pre-migration-backup";
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
        // SQLite no valida foreign keys por defecto; a partir de Sales (sale_items → sales,
        // sale_items → products) las FKs declaradas en el schema deben aplicarse de verdad.
        sqlite.pragma("foreign_keys = ON");

        const db = drizzle(sqlite, { schema });
        // Se resuelve desde el árbol fuente (no desde dist/) para evitar condiciones de
        // carrera entre la copia de assets y el watcher de "nest start --watch".
        const migrationsFolder = path.join(process.cwd(), "src/database/migrations");
        // Actualización de la app: si hay migraciones pendientes sobre una base con datos, se
        // respalda antes de migrar (ver pre-migration-backup.ts).
        const preUpdateBackup = backupBeforeMigrations(sqlite, {
          migrationsFolder,
          backupsDir: path.join(config.dataDir, "backups", "pre-update"),
        });
        if (preUpdateBackup) {
          new Logger("Database").log(`Respaldo previo a la actualización: ${preUpdateBackup}`);
        }
        migrate(db, { migrationsFolder });

        return db;
      },
    },
  ],
  exports: [DRIZZLE_CLIENT],
})
export class DatabaseModule {}
