import type { ConfigService } from "@nestjs/config";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSilentTestLogger } from "../test/create-test-logger";
import { createTestDb } from "../test/create-test-db";
import { AutoBackupService } from "./auto-backup.service";
import { BackupService } from "./backup.service";

describe("AutoBackupService", () => {
  let dataDir: string;
  let service: AutoBackupService;
  const autoDir = () => path.join(dataDir, "backups", "auto");

  beforeEach(() => {
    dataDir = mkdtempSync(path.join(tmpdir(), "stocknegozia-autobackup-"));
    const logger = createSilentTestLogger();
    const config = { get: () => ({ dataDir, nodeEnv: "test" }) } as unknown as ConfigService;
    service = new AutoBackupService(config, new BackupService(createTestDb(), logger), logger);
  });

  afterEach(() => {
    rmSync(dataDir, { recursive: true, force: true });
  });

  it("crea un backup por día y no lo repite el mismo día", async () => {
    const day = new Date("2026-10-20T10:00:00Z");
    const created = await service.run(day);
    expect(created).toBe(path.join(autoDir(), "auto-2026-10-20.db"));
    expect(existsSync(created!)).toBe(true);
    expect(await service.run(new Date("2026-10-20T15:00:00Z"))).toBeNull();
  });

  it("conserva solo los últimos 7 backups automáticos", async () => {
    mkdirSync(autoDir(), { recursive: true });
    for (let d = 1; d <= 9; d++) writeFileSync(path.join(autoDir(), `auto-2026-10-0${d}.db`), "");
    writeFileSync(path.join(autoDir(), "manual.db"), "");

    await service.run(new Date("2026-10-20T10:00:00Z"));

    const files = readdirSync(autoDir()).sort();
    expect(files).toContain("manual.db");
    expect(files.filter((f) => f.startsWith("auto-"))).toEqual([
      "auto-2026-10-04.db",
      "auto-2026-10-05.db",
      "auto-2026-10-06.db",
      "auto-2026-10-07.db",
      "auto-2026-10-08.db",
      "auto-2026-10-09.db",
      "auto-2026-10-20.db",
    ]);
  });
});
