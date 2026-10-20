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
import { db } from "@/database/client";
import type { DrizzleExecutor } from "@/database/database.types";
import { BadRequestError, NotFoundError } from "@/database/errors";
import { customersRepository, type CustomerRecord } from "./repository";

type CustomerRow = NonNullable<ReturnType<typeof customersRepository.findById>>;

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

function toRecord(input: CreateCustomerInput): CustomerRecord {
  return {
    name: input.name,
    phone: input.phone ?? null,
    email: input.email ?? null,
    documentNumber: input.documentNumber ?? null,
    notes: input.notes ?? null,
  };
}

/** Mismas reglas que `apps/backend/src/core/customers/customers.service.ts`. */
export const customersService = {
  findAll(): CustomerDto[] {
    return customersRepository.findAll().map(toDto);
  },

  findById(id: number, executor?: DrizzleExecutor): CustomerDto {
    const row = customersRepository.findById(id, executor);
    if (!row) throw new NotFoundError("Cliente no encontrado");
    return toDto(row);
  },

  create(input: CreateCustomerInput): CustomerDto {
    const { id } = customersRepository.insert(toRecord(input));
    return customersService.findById(id);
  },

  update(id: number, input: UpdateCustomerInput): CustomerDto {
    customersService.findById(id);
    customersRepository.update(id, toRecord(input));
    return customersService.findById(id);
  },

  getAccount(id: number): CustomerAccountDto {
    const customer = customersService.findById(id);
    const entries: CustomerAccountEntryDto[] = [
      ...customersRepository.findAccountSales(id).map((row) => ({
        type: "sale" as const,
        id: row.saleId,
        amount: roundMoney(row.amount),
        createdAt: row.createdAt.toISOString(),
        saleId: row.saleId,
        method: null,
        note: null,
      })),
      ...customersRepository.findPayments(id).map((row) => ({
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
  },

  /** No se acepta pagar más de lo adeudado — mismo criterio que el backend. */
  registerPayment(id: number, input: CustomerPaymentInput): CustomerAccountDto {
    db.transaction((tx) => {
      const { balance } = customersService.findById(id, tx);
      if (input.amount > balance + 0.005) {
        throw new BadRequestError(
          balance > 0
            ? `El pago supera el saldo de la cuenta (${formatMoney(balance)})`
            : "Este cliente no tiene saldo pendiente",
        );
      }
      customersRepository.insertPayment(
        {
          customerId: id,
          amount: roundMoney(input.amount),
          method: input.method,
          note: input.note ?? null,
        },
        tx,
      );
    });
    return customersService.getAccount(id);
  },
};
