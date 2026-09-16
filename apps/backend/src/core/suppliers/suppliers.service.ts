import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { SupplierDto } from "@stocknegozia/api-contracts";
import type { CreateSupplierInput, UpdateSupplierInput } from "@stocknegozia/validation";
import type { DrizzleExecutor } from "../../database/database.types";
import { SuppliersRepository } from "./suppliers.repository";

type SupplierRow = ReturnType<SuppliersRepository["findById"]>;

function toDto(row: NonNullable<SupplierRow>): SupplierDto {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
  };
}

/**
 * Estructura mínima para poder asociar una compra a un proveedor — ver
 * docs/inventory/PURCHASES.md. Sin contactos, direcciones, cuenta corriente ni condiciones de
 * pago: fuera de alcance hasta que exista una necesidad real.
 */
@Injectable()
export class SuppliersService {
  // @Inject explícito: la inyección automática por tipo de NestJS depende de metadata que `tsc`
  // emite pero esbuild (usado por Vitest) no — ver el mismo comentario en GlobalExceptionFilter.
  constructor(@Inject(SuppliersRepository) private readonly repository: SuppliersRepository) {}

  findAll(): SupplierDto[] {
    return this.repository.findAll().map(toDto);
  }

  /** `executor` permite validar la existencia del proveedor dentro de la transacción de Purchases. */
  findById(id: number, executor?: DrizzleExecutor): SupplierDto {
    const row = this.repository.findById(id, executor);
    if (!row) throw new NotFoundException("Proveedor no encontrado");
    return toDto(row);
  }

  create(input: CreateSupplierInput): SupplierDto {
    const created = this.repository.insert({ name: input.name, phone: input.phone });
    return toDto(created);
  }

  /**
   * Edita nombre y/o teléfono de un proveedor existente — nunca afecta compras ya creadas, que
   * conservan su propio snapshot (`purchases.supplierName`, ver
   * database/schema/purchases.ts §Snapshot inmutable). `input` refleja siempre el estado completo
   * deseado de ambos campos (ver `updateSupplierSchema`).
   */
  update(id: number, input: UpdateSupplierInput): SupplierDto {
    this.findById(id); // 404 si no existe
    // `?? null` explícito — no `undefined`: un UPDATE con `undefined` dejaría el teléfono anterior
    // sin tocar, pero acá "sin teléfono" en el formulario debe sobrescribirlo (ver
    // `UpdateSupplierRecord`).
    const updated = this.repository.update(id, { name: input.name, phone: input.phone ?? null });
    return toDto(updated);
  }

  /**
   * Punto único usado por Products para resolver un proveedor escrito a mano en el propio
   * formulario de creación (`input.supplierName`) — mismo patrón que
   * `CategoriesService.findOrCreateByName()`, que ese mismo formulario ya usa para categorías.
   * Nunca inventa un nombre: el nombre viene siempre de lo que la persona tipeó. `executor`
   * permite participar en la transacción de `ProductsService.create()`.
   */
  findOrCreateByName(name: string, executor?: DrizzleExecutor): SupplierDto {
    const existing = this.repository.findByName(name, executor);
    if (existing) return toDto(existing);
    const created = this.repository.insert({ name }, executor);
    return toDto(created);
  }
}
