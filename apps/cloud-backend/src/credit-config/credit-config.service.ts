import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { CreditConfigItemDto, CreditConfigItemRevisionDto } from "@stocknegozia/api-contracts";
import { CreditConfigRepository } from "./credit-config.repository";

type ItemRow = Awaited<ReturnType<CreditConfigRepository["findByKey"]>>;

function toDto(row: NonNullable<ItemRow>): CreditConfigItemDto {
  return {
    id: row.item.id,
    key: row.item.key,
    label: row.item.label,
    description: row.item.description,
    category: row.item.category,
    unit: row.item.unit,
    value: row.item.value,
    updatedAt: row.item.updatedAt.toISOString(),
    updatedByAdminEmail: row.updatedByEmail,
  };
}

@Injectable()
export class CreditConfigService {
  constructor(
    @Inject(CreditConfigRepository) private readonly repository: CreditConfigRepository,
  ) {}

  async list(): Promise<CreditConfigItemDto[]> {
    const rows = await this.repository.findAll();
    return rows.map(toDto);
  }

  async getByKey(key: string): Promise<CreditConfigItemDto> {
    const row = await this.repository.findByKey(key);
    if (!row) throw new NotFoundException(`No existe un ítem de config con key "${key}"`);
    return toDto(row);
  }

  /**
   * Para uso interno de otros módulos (créditos, gamification) que necesitan el número vigente de
   * un ítem (ej. "source.welcome_bonus") sin el DTO completo — mismo dato, sin el join a
   * `admin_users` que no hace falta acá.
   */
  async getValueByKey(key: string): Promise<number> {
    const row = await this.repository.findByKey(key);
    if (!row) throw new NotFoundException(`No existe un ítem de config con key "${key}"`);
    return row.item.value;
  }

  /** `PATCH /admin/credit-config/:key` — balancea el costo/tope de una feature (doc §7). */
  async updateValue(
    key: string,
    newValue: number,
    changedByAdminId: string,
    note?: string,
  ): Promise<CreditConfigItemDto> {
    const row = await this.repository.findByKey(key);
    if (!row) throw new NotFoundException(`No existe un ítem de config con key "${key}"`);

    await this.repository.updateValueWithRevision({
      itemId: row.item.id,
      previousValue: row.item.value,
      newValue,
      note,
      changedByAdminId,
    });

    return this.getByKey(key);
  }

  async listRevisions(key: string): Promise<CreditConfigItemRevisionDto[]> {
    const item = await this.repository.findByKey(key);
    if (!item) throw new NotFoundException(`No existe un ítem de config con key "${key}"`);

    const rows = await this.repository.findRevisionsByItemId(item.item.id);
    return rows.map((row) => ({
      id: row.revision.id,
      previousValue: row.revision.previousValue,
      newValue: row.revision.newValue,
      note: row.revision.note,
      changedByAdminEmail: row.changedByEmail,
      changedAt: row.revision.changedAt.toISOString(),
    }));
  }
}
