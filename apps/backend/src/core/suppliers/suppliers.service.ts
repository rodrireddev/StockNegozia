import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import type { SupplierDto } from "@stocknegozia/api-contracts";
import type { CreateSupplierInput } from "@stocknegozia/validation";
import type { DrizzleExecutor } from "../../database/database.types";
import { SuppliersRepository } from "./suppliers.repository";

type SupplierRow = ReturnType<SuppliersRepository["findById"]>;

function toDto(row: NonNullable<SupplierRow>): SupplierDto {
  return {
    id: row.id,
    name: row.name,
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
    const created = this.repository.insert({ name: input.name });
    return toDto(created);
  }
}
