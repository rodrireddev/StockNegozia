import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { Pool } from "pg";
import { adminUsers, creditConfigItems } from "./schema";

/**
 * Carga inicial de datos, pensada para correrse una sola vez por entorno (`pnpm run db:seed`):
 * un admin (desde env, nunca hardcodeado) + los números del doc §1 como filas de
 * `credit_config_items`. Es idempotente — no pisa un admin ni un ítem que ya existan, para no
 * perder ajustes que un admin ya haya hecho desde el panel.
 */

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const derivedKey = scryptSync(password, salt, 64);
  return `${salt.toString("hex")}:${derivedKey.toString("hex")}`;
}

interface SeedConfigItem {
  key: string;
  label: string;
  description?: string;
  category: "source" | "sink";
  unit: "credits" | "count" | "minutes" | "days";
  value: number;
}

/** Números de doc/monetization/ADS_CREDITS_GAMIFICATION.md §1 — punto de partida, no verdad fija. */
const SEED_CONFIG_ITEMS: SeedConfigItem[] = [
  { key: "source.welcome_bonus", label: "Bienvenida (una vez)", category: "source", unit: "credits", value: 20 },
  {
    key: "source.setup_quest",
    label: "Quest de setup (c/u)",
    description: "Primer producto, primera venta, primer escaneo, perfil completo.",
    category: "source",
    unit: "credits",
    value: 5,
  },
  { key: "source.streak_milestone_day_3", label: "Hito de racha — día 3", category: "source", unit: "credits", value: 2 },
  { key: "source.streak_milestone_day_7", label: "Hito de racha — día 7", category: "source", unit: "credits", value: 5 },
  { key: "source.streak_milestone_day_14", label: "Hito de racha — día 14", category: "source", unit: "credits", value: 10 },
  { key: "source.streak_milestone_day_30", label: "Hito de racha — día 30", category: "source", unit: "credits", value: 20 },
  { key: "source.daily_mission", label: "Misión diaria", category: "source", unit: "credits", value: 3 },
  { key: "cap.daily_mission_max_per_day", label: "Tope de misiones/día", category: "source", unit: "count", value: 1 },
  {
    key: "source.rewarded_ad_view_1",
    label: "Rewarded ad — 1ra vista del día",
    category: "source",
    unit: "credits",
    value: 3,
  },
  {
    key: "source.rewarded_ad_view_2",
    label: "Rewarded ad — 2da vista del día",
    category: "source",
    unit: "credits",
    value: 2,
  },
  {
    key: "source.rewarded_ad_view_3",
    label: "Rewarded ad — 3ra vista del día",
    category: "source",
    unit: "credits",
    value: 1,
  },
  { key: "cap.rewarded_ad_max_per_day", label: "Tope de rewarded ads/día", category: "source", unit: "count", value: 3 },
  {
    key: "cooldown.rewarded_ad_minutes",
    label: "Cooldown entre rewarded ads",
    category: "source",
    unit: "minutes",
    value: 120,
  },
  { key: "source.referral_bonus", label: "Referido validado", category: "source", unit: "credits", value: 15 },
  {
    key: "cap.referral_max_per_month",
    label: "Tope de referidos validados/mes",
    category: "source",
    unit: "count",
    value: 10,
  },
  { key: "sink.export_report", label: "Exportar reporte (PDF/Excel)", category: "sink", unit: "credits", value: 10 },
  {
    key: "sink.cloud_backup_30d",
    label: "Backup en la nube — 30 días",
    category: "sink",
    unit: "credits",
    value: 160,
  },
  {
    key: "sink.remove_ads_30d",
    label: "Sacarse anuncios — 30 días",
    category: "sink",
    unit: "credits",
    value: 150,
  },
  {
    key: "sink.feature_request_create",
    label: "Crear pedido de feature",
    category: "sink",
    unit: "credits",
    value: 20,
  },
  {
    key: "sink.feature_request_vote",
    label: "Votar/boostear un pedido (c/u)",
    category: "sink",
    unit: "credits",
    value: 5,
  },
  {
    key: "cap.feature_request_vote_max_per_item",
    label: "Tope de votos por usuario/pedido",
    category: "sink",
    unit: "count",
    value: 6,
  },
];

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL no está seteada");

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool);

  const seedAdminEmail = process.env.ADMIN_SEED_EMAIL;
  const seedAdminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (seedAdminEmail && seedAdminPassword) {
    const [existing] = await db.select().from(adminUsers).where(eq(adminUsers.email, seedAdminEmail));
    if (existing) {
      console.log(`[seed] admin_users: "${seedAdminEmail}" ya existe, no se toca`);
    } else {
      await db.insert(adminUsers).values({
        id: randomUUID(),
        email: seedAdminEmail,
        passwordHash: hashPassword(seedAdminPassword),
        createdAt: new Date(),
      });
      console.log(`[seed] admin_users: creado "${seedAdminEmail}"`);
    }
  } else {
    console.log("[seed] ADMIN_SEED_EMAIL/ADMIN_SEED_PASSWORD no están seteadas, se omite el admin inicial");
  }

  let inserted = 0;
  for (const item of SEED_CONFIG_ITEMS) {
    const [existing] = await db.select().from(creditConfigItems).where(eq(creditConfigItems.key, item.key));
    if (existing) continue;

    await db.insert(creditConfigItems).values({
      id: randomUUID(),
      key: item.key,
      label: item.label,
      description: item.description ?? null,
      category: item.category,
      unit: item.unit,
      value: item.value,
      updatedAt: new Date(),
      updatedByAdminId: null,
    });
    inserted++;
  }
  console.log(`[seed] credit_config_items: ${inserted} insertados, ${SEED_CONFIG_ITEMS.length - inserted} ya existían`);

  await pool.end();
}

main().catch((error) => {
  console.error("[seed] falló:", error);
  process.exitCode = 1;
});
