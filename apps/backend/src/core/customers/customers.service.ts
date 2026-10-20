import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";
import type {
  CustomerAccountDto,
  CustomerAccountEntryDto,
  CustomerDto,
} from "@stocknegozia/api-contracts";
import { formatMoney, roundMoney } from "@stocknegozia/shared";
import type {
  CreateCustomerInput,
  CustomerPaymentInput,
  UpdateCustomerInput,
} from "@stocknegozia/validation";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import { CustomersRepository, type CustomerRecord } from "./customers.repository";

type CustomerRow = NonNullable<ReturnType<CustomersRepository["findById"]>>;

function toDto(row: CustomerRow): CustomerDto {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    documentNumber: row.documentNumber,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    salesCount: row.salesCount,
    totalSpent: row.totalSpent,
    lastSaleAt: row.lastSaleAt ? row.lastSaleAt.toISOString() : null,
    balance: roundMoney(row.balance),
  };
}

// `?? null` explícito: un UPDATE con `undefined` dejaría el valor anterior, y vaciar un campo en
// el formulario tiene que borrarlo (mismo criterio que `SuppliersService.update`).
function toRecord(input: CreateCustomerInput): CustomerRecord {
  return {
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    documentNumber: input.documentNumber ?? null,
    notes: input.notes ?? null,
  };
}

@Injectable()
export class CustomersService {
  constructor(
    @Inject(CustomersRepository) private readonly repository: CustomersRepository,
    @Inject(DRIZZLE_CLIENT) private readonly db: Database,
  ) {}

  findAll(): CustomerDto[] {
    return this.repository.findAll().map(toDto);
  }

  /** `executor` permite validar el cliente dentro de la transacción de `SalesService.create()`. */
  findById(id: number, executor?: DrizzleExecutor): CustomerDto {
    const row = this.repository.findById(id, executor);
    if (!row) throw new NotFoundException("Cliente no encontrado");
    return toDto(row);
  }

  create(input: CreateCustomerInput): CustomerDto {
    const { id } = this.repository.insert(toRecord(input));
    return this.findById(id);
  }

  update(id: number, input: UpdateCustomerInput): CustomerDto {
    this.findById(id); // 404 si no existe
    this.repository.update(id, toRecord(input));
    return this.findById(id);
  }

  /** `GET /customers/:id/account` — saldo y movimientos de la cuenta corriente. */
  getAccount(id: number): CustomerAccountDto {
    const customer = this.findById(id);
    const entries: CustomerAccountEntryDto[] = [
      ...this.repository.findAccountSales(id).map((row) => ({
        type: "sale" as const,
        id: row.saleId,
        amount: roundMoney(row.amount),
        createdAt: row.createdAt.toISOString(),
        saleId: row.saleId,
        method: null,
        note: null,
      })),
      ...this.repository.findPayments(id).map((row) => ({
        type: "payment" as const,
        id: row.id,
        amount: row.amount,
        createdAt: row.createdAt.toISOString(),
        saleId: null,
        method: row.method,
        note: row.note,
      })),
      // Timestamps al segundo: con empate, el pago va primero (siempre es posterior a la venta).
    ].sort(
      (a, b) =>
        b.createdAt.localeCompare(a.createdAt) ||
        (a.type === b.type ? 0 : a.type === "payment" ? -1 : 1),
    );
    return { customerId: id, balance: customer.balance, entries };
  }

  /**
   * `POST /customers/:id/payments` — no se acepta pagar más de lo adeudado: un saldo a favor solo
   * aparece si se cancela una venta ya pagada, nunca por un error de tipeo en el monto. Lectura del
   * saldo y escritura en la misma transacción.
   */
  registerPayment(id: number, input: CustomerPaymentInput): CustomerAccountDto {
    this.db.transaction((tx) => {
      const { balance } = this.findById(id, tx);
      if (input.amount > balance + 0.005) {
        throw new BadRequestException(
          balance > 0
            ? `El pago supera el saldo de la cuenta (${formatMoney(balance)})`
            : "Este cliente no tiene saldo pendiente",
        );
      }
      this.repository.insertPayment(
        {
          customerId: id,
          amount: roundMoney(input.amount),
          method: input.method,
          note: input.note ?? null,
        },
        tx,
      );
    });
    return this.getAccount(id);
  }
}
