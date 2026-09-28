import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { and, eq } from "drizzle-orm";
import { randomBytes, randomUUID, scryptSync } from "node:crypto";
import { Pool } from "pg";
import type {
  AchievementDefinitionCategory,
  AchievementScheduleType,
  TrackableMetricType,
} from "@stocknegozia/api-contracts";
import { achievementDefinitions, adminUsers, adPlacements, creditConfigItems } from "./schema";

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

interface SeedAdPlacement {
  key: string;
  platform: "android" | "ios" | "desktop";
  adNetwork: string;
  adUnitId: string;
}

/**
 * Ad units de PRUEBA oficiales de Google (los mismos que resuelve `TestIds.REWARDED` de
 * `react-native-google-mobile-ads`) — reemplazar por los reales es editar estas dos filas desde
 * el panel admin, nunca tocar código (doc §1bis). Sin fila para "desktop": el proveedor todavía no
 * está confirmado (ver doc), no hay nada real que sembrar ahí todavía.
 */
const SEED_AD_PLACEMENTS: SeedAdPlacement[] = [
  { key: "rewarded_credits", platform: "android", adNetwork: "admob", adUnitId: "ca-app-pub-3940256099942544/5224354917" },
  { key: "rewarded_credits", platform: "ios", adNetwork: "admob", adUnitId: "ca-app-pub-3940256099942544/1712485313" },
];

interface SeedAchievementDefinition {
  key: string;
  label: string;
  description?: string;
  category: AchievementDefinitionCategory;
  metricType?: TrackableMetricType;
  target?: number;
  scheduleType: AchievementScheduleType;
  scheduleConfig?: { date: string };
  creditsAwarded: number;
}

/**
 * Los logros que ya existían hardcodeados en código antes de este refactor (ver
 * docs/monetization/ADS_CREDITS_GAMIFICATION.md, sección "Logros"), sembrados acá como filas reales
 * — quedan de ejemplo de uso real del panel admin, no solo de documentación. `goal.daily_cash_in_1`
 * es la única fila sin equivalente viejo: demuestra la métrica de caja de punta a punta.
 */
const SEED_ACHIEVEMENT_DEFINITIONS: SeedAchievementDefinition[] = [
  {
    key: "setup_quest.first_product",
    label: "Cargaste tu primer producto",
    category: "setup_quest",
    scheduleType: "once",
    creditsAwarded: 5,
  },
  {
    key: "setup_quest.first_sale",
    label: "Registraste tu primera venta",
    category: "setup_quest",
    scheduleType: "once",
    creditsAwarded: 5,
  },
  {
    key: "setup_quest.first_scan",
    label: "Escaneaste tu primer código",
    category: "setup_quest",
    scheduleType: "once",
    creditsAwarded: 5,
  },
  {
    key: "setup_quest.profile_complete",
    label: "Completaste tu perfil",
    category: "setup_quest",
    scheduleType: "once",
    creditsAwarded: 5,
  },
  {
    key: "streak_milestone.day_3",
    label: "3 días seguidos usando StockNegozia",
    category: "streak_milestone",
    target: 3,
    scheduleType: "streak",
    creditsAwarded: 2,
  },
  {
    key: "streak_milestone.day_7",
    label: "1 semana seguida usando StockNegozia",
    category: "streak_milestone",
    target: 7,
    scheduleType: "streak",
    creditsAwarded: 5,
  },
  {
    key: "streak_milestone.day_14",
    label: "2 semanas seguidas usando StockNegozia",
    category: "streak_milestone",
    target: 14,
    scheduleType: "streak",
    creditsAwarded: 10,
  },
  {
    key: "streak_milestone.day_30",
    label: "1 mes seguido usando StockNegozia",
    category: "streak_milestone",
    target: 30,
    scheduleType: "streak",
    creditsAwarded: 20,
  },
  {
    key: "goal.daily_sales_3",
    label: "Registrá 3 ventas hoy",
    category: "scheduled_goal",
    metricType: "sale_completed",
    target: 3,
    scheduleType: "daily",
    creditsAwarded: 3,
  },
  {
    key: "goal.daily_stock_adjustments_5",
    label: "Actualizá el stock de 5 productos hoy",
    category: "scheduled_goal",
    metricType: "stock_adjustment_in",
    target: 5,
    scheduleType: "daily",
    creditsAwarded: 3,
  },
  {
    key: "goal.daily_cash_in_1",
    label: "Registrá un ingreso de caja hoy",
    category: "scheduled_goal",
    metricType: "cash_adjustment_in",
    target: 1,
    scheduleType: "daily",
    creditsAwarded: 3,
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

  let placementsInserted = 0;
  for (const placement of SEED_AD_PLACEMENTS) {
    const [existing] = await db
      .select()
      .from(adPlacements)
      .where(and(eq(adPlacements.key, placement.key), eq(adPlacements.platform, placement.platform)));
    if (existing) continue;

    await db.insert(adPlacements).values({
      id: randomUUID(),
      key: placement.key,
      platform: placement.platform,
      adNetwork: placement.adNetwork,
      adUnitId: placement.adUnitId,
      enabled: true,
      updatedAt: new Date(),
      updatedByAdminId: null,
    });
    placementsInserted++;
  }
  console.log(
    `[seed] ad_placements: ${placementsInserted} insertados, ${SEED_AD_PLACEMENTS.length - placementsInserted} ya existían`,
  );

  let achievementsInserted = 0;
  for (const achievement of SEED_ACHIEVEMENT_DEFINITIONS) {
    const [existing] = await db.select().from(achievementDefinitions).where(eq(achievementDefinitions.key, achievement.key));
    if (existing) continue;

    const now = new Date();
    await db.insert(achievementDefinitions).values({
      id: randomUUID(),
      key: achievement.key,
      label: achievement.label,
      description: achievement.description ?? null,
      category: achievement.category,
      metricType: achievement.metricType ?? null,
      target: achievement.target ?? null,
      scheduleType: achievement.scheduleType,
      scheduleConfig: achievement.scheduleConfig ?? null,
      creditsAwarded: achievement.creditsAwarded,
      active: true,
      createdAt: now,
      updatedAt: now,
      updatedByAdminId: null,
    });
    achievementsInserted++;
  }
  console.log(
    `[seed] achievement_definitions: ${achievementsInserted} insertados, ${SEED_ACHIEVEMENT_DEFINITIONS.length - achievementsInserted} ya existían`,
  );

  await pool.end();
}

main().catch((error) => {
  console.error("[seed] falló:", error);
  process.exitCode = 1;
});
