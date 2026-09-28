import type {
  AchievementDefinitionDto,
  AchievementDefinitionRevisionDto,
} from "@stocknegozia/api-contracts";
import type { CreateAchievementInput, UpdateAchievementInput } from "@stocknegozia/validation";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { AchievementDefinitionsRepository } from "./achievement-definitions.repository";

type DefinitionRow = Awaited<ReturnType<AchievementDefinitionsRepository["findByKey"]>>;

function toDto(row: NonNullable<DefinitionRow>): AchievementDefinitionDto {
  return {
    id: row.definition.id,
    key: row.definition.key,
    label: row.definition.label,
    description: row.definition.description,
    category: row.definition.category,
    metricType: row.definition.metricType,
    target: row.definition.target,
    scheduleType: row.definition.scheduleType,
    scheduleConfig: row.definition.scheduleConfig,
    creditsAwarded: row.definition.creditsAwarded,
    active: row.definition.active,
    updatedAt: row.definition.updatedAt.toISOString(),
    updatedByAdminEmail: row.updatedByEmail,
  };
}

/**
 * Panel admin (doc §7 + sección "Logros") — catálogo editable de logros. Reemplaza los catálogos
 * hardcodeados que existían antes de este refactor.
 */
@Injectable()
export class AchievementDefinitionsService {
  constructor(
    @Inject(AchievementDefinitionsRepository) private readonly repository: AchievementDefinitionsRepository,
  ) {}

  async list(): Promise<AchievementDefinitionDto[]> {
    const rows = await this.repository.findAll();
    return rows.map(toDto);
  }

  async getByKey(key: string): Promise<AchievementDefinitionDto> {
    const row = await this.repository.findByKey(key);
    if (!row) throw new NotFoundException(`No existe un logro con key "${key}"`);
    return toDto(row);
  }

  /**
   * `POST /admin/achievements` — a propósito NO acepta `category: "setup_quest"`: esos siguen
   * atados a un call site exacto en `mobile-mini` (ver comentario en `achievement-definitions.ts`
   * del schema), crear uno nuevo desde acá dejaría un logro que la app nunca va a poder reclamar.
   * Solo se puede crear `scheduled_goal` (con una métrica ya whitelisteada) o `streak_milestone`
   * (cualquier día de racha nuevo) — ambos funcionan de punta a punta sin tocar código.
   */
  async create(input: CreateAchievementInput, adminId: string): Promise<AchievementDefinitionDto> {
    if (input.category === "setup_quest") {
      throw new BadRequestException(
        "No se puede crear un setup quest nuevo desde el panel — requiere un call site nuevo en la app. " +
          "Editá uno de los que ya existen.",
      );
    }
    this.validateCategoryShape(input.category, input);

    const created = await this.repository.insert({
      id: randomUUID(),
      key: input.key,
      label: input.label,
      description: input.description,
      category: input.category,
      metricType: input.metricType,
      target: input.target,
      scheduleType: input.scheduleType,
      scheduleConfig: input.scheduleConfig,
      creditsAwarded: input.creditsAwarded,
      active: input.active ?? true,
      updatedByAdminId: adminId,
    });
    return this.getByKey(created.key);
  }

  /**
   * `PATCH /admin/achievements/:key` — `key`/`category`/`metricType` son inmutables (no vienen en
   * `UpdateAchievementInput`, ver validation). "Borrar" desde el panel es `active: false` acá
   * (borrado suave, ver comentario en el schema de Postgres).
   */
  async update(key: string, input: UpdateAchievementInput, adminId: string): Promise<AchievementDefinitionDto> {
    const row = await this.repository.findByKey(key);
    if (!row) throw new NotFoundException(`No existe un logro con key "${key}"`);
    const { note, ...changes } = input;

    await this.repository.updateWithRevision({
      definitionId: row.definition.id,
      previous: {
        label: row.definition.label,
        description: row.definition.description,
        target: row.definition.target,
        scheduleType: row.definition.scheduleType,
        scheduleConfig: row.definition.scheduleConfig,
        creditsAwarded: row.definition.creditsAwarded,
        active: row.definition.active,
      },
      changes,
      note,
      changedByAdminId: adminId,
    });

    return this.getByKey(key);
  }

  async listRevisions(key: string): Promise<AchievementDefinitionRevisionDto[]> {
    const row = await this.repository.findByKey(key);
    if (!row) throw new NotFoundException(`No existe un logro con key "${key}"`);

    const revisions = await this.repository.findRevisionsByDefinitionId(row.definition.id);
    return revisions.map((r) => ({
      id: r.revision.id,
      previousLabel: r.revision.previousLabel,
      newLabel: r.revision.newLabel,
      previousDescription: r.revision.previousDescription,
      newDescription: r.revision.newDescription,
      previousTarget: r.revision.previousTarget,
      newTarget: r.revision.newTarget,
      previousScheduleType: r.revision.previousScheduleType,
      newScheduleType: r.revision.newScheduleType,
      previousScheduleConfig: r.revision.previousScheduleConfig,
      newScheduleConfig: r.revision.newScheduleConfig,
      previousCreditsAwarded: r.revision.previousCreditsAwarded,
      newCreditsAwarded: r.revision.newCreditsAwarded,
      previousActive: r.revision.previousActive,
      newActive: r.revision.newActive,
      note: r.revision.note,
      changedByAdminEmail: r.changedByEmail,
      changedAt: r.revision.changedAt.toISOString(),
    }));
  }

  private validateCategoryShape(category: "scheduled_goal" | "streak_milestone", input: CreateAchievementInput): void {
    if (category === "scheduled_goal") {
      if (!input.metricType) throw new BadRequestException("Un objetivo programado necesita `metricType`");
      if (!input.target) throw new BadRequestException("Un objetivo programado necesita `target`");
      if (input.scheduleType === "once" || input.scheduleType === "streak") {
        throw new BadRequestException(`scheduleType "${input.scheduleType}" no aplica a un objetivo programado`);
      }
      if (input.scheduleType === "specific_date" && !input.scheduleConfig?.date) {
        throw new BadRequestException('scheduleType "specific_date" necesita `scheduleConfig.date`');
      }
      return;
    }

    // streak_milestone
    if (input.metricType) throw new BadRequestException("Un hito de racha no usa `metricType`");
    if (!input.target) throw new BadRequestException("Un hito de racha necesita `target` (el día de racha)");
    if (input.scheduleType !== "streak") {
      throw new BadRequestException('Un hito de racha necesita scheduleType "streak"');
    }
  }
}
