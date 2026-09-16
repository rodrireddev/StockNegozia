import type { SupplierDto } from "@stocknegozia/api-contracts";
import type { CreateSupplierInput, UpdateSupplierInput } from "@stocknegozia/validation";
import { NotFoundError } from "@/database/errors";
import type { DrizzleExecutor } from "@/database/database.types";
import { suppliersRepository } from "./repository";

type SupplierRow = ReturnType<typeof suppliersRepository.findById>;

function toDto(row: NonNullable<SupplierRow>): SupplierDto {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Mismas reglas que `apps/backend/src/core/suppliers/suppliers.service.ts` — estructura mínima
 *  (nombre + teléfono opcional), sin contactos/direcciones/cuenta corriente. */
export const suppliersService = {
  findAll(): SupplierDto[] {
    return suppliersRepository.findAll().map(toDto);
  },

  findById(id: number, executor?: DrizzleExecutor): SupplierDto {
    const row = suppliersRepository.findById(id, executor);
    if (!row) throw new NotFoundError("Proveedor no encontrado");
    return toDto(row);
  },

  create(input: CreateSupplierInput): SupplierDto {
    const created = suppliersRepository.insert({ name: input.name, phone: input.phone });
    return toDto(created);
  },

  /** `input` refleja siempre el estado completo deseado (`phone ?? null` sobrescribe, nunca deja
   *  el valor anterior sin tocar) — mismo criterio que el backend. */
  update(id: number, input: UpdateSupplierInput): SupplierDto {
    suppliersService.findById(id); // 404 si no existe
    const updated = suppliersRepository.update(id, { name: input.name, phone: input.phone ?? null });
    return toDto(updated);
  },

  /** Punto único usado por Productos para resolver un proveedor escrito a mano — mismo patrón que
   *  `categoriesService.findOrCreateByName`. `executor` permite participar en la transacción de
   *  `productsService.create`. */
  findOrCreateByName(name: string, executor?: DrizzleExecutor): SupplierDto {
    const existing = suppliersRepository.findByName(name, executor);
    if (existing) return toDto(existing);
    const created = suppliersRepository.insert({ name }, executor);
    return toDto(created);
  },
};
