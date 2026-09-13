import { Inject, Injectable } from "@nestjs/common";
import type { HealthStatus } from "@stocknegozia/api-contracts";
import { sql } from "drizzle-orm";
import type { BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { DRIZZLE_CLIENT } from "../database/database.constants";

@Injectable()
export class HealthService {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: BetterSQLite3Database) {}

  check(): HealthStatus {
    let databaseConnected = false;
    try {
      this.db.get(sql`select 1`);
      databaseConnected = true;
    } catch {
      databaseConnected = false;
    }

    return {
      status: databaseConnected ? "ok" : "error",
      uptimeSeconds: process.uptime(),
      database: { connected: databaseConnected },
      timestamp: new Date().toISOString(),
    };
  }
}
