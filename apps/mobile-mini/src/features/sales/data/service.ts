import type {
  PaymentMethod,
  PaymentTermsDto,
  SaleDto,
  SaleItemDto,
  SalePaymentDto,
  SaleSummaryDto,
} from "@stocknegozia/api-contracts";
import type { CreateSaleInput, SaleItemInput, SalePaymentInput } from "@stocknegozia/validation";
import { computePaymentCharges, DEFAULT_PAYMENT_TERMS, roundMoney } from "@stocknegozia/shared";
import { db } from "@/database/client";
import { ConflictError, NotFoundError, BadRequestError } from "@/database/errors";
import { customersService } from "@/features/customers/data/service";
import { productsService } from "@/features/products/data/service";
import type { sales } from "@/database/schema";
import { salesRepository, type NewSalePaymentRecord } from "./repository";

type SaleRow = typeof sales.$inferSelect;
type SaleItemRow = ReturnType<typeof salesRepository.findItemsBySaleId>[number];
type SalePaymentRow = ReturnType<typeof salesRepository.findPaymentsBySaleId>[number];

/** Suma cantidades de items que repiten el mismo producto, para no crear más de una línea por
 *  producto dentro de una misma venta. */
function normalizeItems(items: SaleItemInput[]): SaleItemInput[] {
  const quantitiesByProduct = new Map<number, number>();
  for (const item of items) {
    quantitiesByProduct.set(
      item.productId,
      (quantitiesByProduct.get(item.productId) ?? 0) + item.quantity,
    );
  }
  return Array.from(quantitiesByProduct, ([productId, quantity]) => ({ productId, quantity }));
}

function toSummaryDto(row: SaleRow, paymentMethods: PaymentMethod[]): SaleSummaryDto {
  return {
    id: row.id,
    status: row.status,
    total: row.total,
    createdAt: row.createdAt.toISOString(),
    cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
    customerId: row.customerId,
    paymentMethods,
  };
}

function toPaymentDto(row: SalePaymentRow): SalePaymentDto {
  return {
    id: row.id,
    method: row.method,
    amount: row.amount,
    installments: row.installments,
    cardBrand: row.cardBrand,
    reference: row.reference,
    amountReceived: row.amountReceived,
    change: row.change,
    surchargePercent: row.surchargePercent,
    surchargeAmount: row.surchargeAmount,
    feePercent: row.feePercent,
    feeAmount: row.feeAmount,
    netAmount: roundMoney(row.amount + row.surchargeAmount - row.feeAmount),
    settlementDate: row.settlementDate ? row.settlementDate.toISOString() : null,
  };
}

/** Mismas reglas que `resolvePayments` en `apps/backend/src/core/sales/sales.service.ts`: con un
 *  único pago el monto es el total; con pago mixto la suma tiene que dar el total al centavo. */
function resolvePayments(
  saleId: number,
  input: SalePaymentInput[] | undefined,
  total: number,
  terms: PaymentTermsDto,
  createdAt: Date,
): NewSalePaymentRecord[] {
  if (!input || input.length === 0) return [];

  const amounts =
    input.length === 1 ? [total] : input.map((payment) => roundMoney(payment.amount ?? 0));
  const assigned = roundMoney(amounts.reduce((sum, amount) => sum + amount, 0));
  if (Math.abs(assigned - total) > 0.005) {
    throw new BadRequestError("Los pagos no coinciden con el total de la venta");
  }

  return input.map((payment, index) => {
    const amount = amounts[index] ?? 0;
    // Recargo/comisión/acreditación según las condiciones VIGENTES — quedan congeladas en el pago.
    const charges = computePaymentCharges(
      {
        method: payment.method,
        amount,
        installments: payment.installments,
        waiveSurcharge: payment.waiveSurcharge,
      },
      terms,
      createdAt,
    );
    let change: number | null = null;
    if (payment.method === "cash" && payment.amountReceived !== undefined) {
      if (payment.amountReceived + 0.005 < amount) {
        throw new BadRequestError("El monto recibido en efectivo es menor al monto a cobrar");
      }
      change = roundMoney(payment.amountReceived - amount);
    }
    return {
      saleId,
      method: payment.method,
      amount,
      installments: payment.method === "credit_card" ? (payment.installments ?? 1) : null,
      cardBrand: payment.cardBrand ?? null,
      reference: payment.reference ?? null,
      amountReceived: payment.method === "cash" ? (payment.amountReceived ?? null) : null,
      change,
      surchargePercent: charges.surchargePercent,
      surchargeAmount: charges.surchargeAmount,
      feePercent: charges.feePercent,
      feeAmount: charges.feeAmount,
      settlementDate: charges.settlementDate,
    };
  });
}

function toItemDto(row: SaleItemRow): SaleItemDto {
  return {
    id: row.id,
    productId: row.productId,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    subtotal: row.subtotal,
  };
}

/** Mismas reglas que `apps/backend/src/core/sales/sales.service.ts` — ver ese archivo para el
 *  razonamiento completo. */
export const salesService = {
  findById(id: number): SaleDto {
    const sale = salesRepository.findById(id);
    if (!sale) throw new NotFoundError("Venta no encontrada");
    const items = salesRepository.findItemsBySaleId(id);
    const payments = salesRepository.findPaymentsBySaleId(id).map(toPaymentDto);
    return {
      ...toSummaryDto(sale, [...new Set(payments.map((payment) => payment.method))]),
      items: items.map(toItemDto),
      payments,
    };
  },

  /**
   * Crea la venta completa (cabecera + items + descuento de stock) en una única transacción: si
   * cualquier paso falla (producto inexistente, stock insuficiente), la excepción revierte todo.
   */
  /**
   * `terms`: condiciones de cobro vigentes (las lee quien llama, desde `AsyncStorage` — no se
   * puede leer async dentro de la transacción síncrona). Sin ellas, las de por defecto.
   */
  create(input: CreateSaleInput, terms: PaymentTermsDto = DEFAULT_PAYMENT_TERMS): SaleDto {
    const normalizedItems = normalizeItems(input.items);

    // Mismo refine que `createSaleSchema` del backend (acá no pasa por zod).
    if (!input.customerId && input.payments?.some((payment) => payment.method === "account")) {
      throw new BadRequestError("Para vender a cuenta corriente elegí un cliente");
    }
    const saleId = db.transaction((tx) => {
      if (input.customerId) customersService.findById(input.customerId, tx); // 404 si no existe
      const lines = normalizedItems.map((item) => {
        const product = productsService.findById(item.productId, tx); // 404 si no existe
        const subtotal = roundMoney(product.salePrice * item.quantity);
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.salePrice,
          // Snapshot histórico del costo — ver comentario en el schema (`sale_items.unitCost`).
          unitCost: product.purchasePrice,
          subtotal,
        };
      });

      const total = roundMoney(lines.reduce((sum, line) => sum + line.subtotal, 0));

      const createdAt = new Date();
      const sale = salesRepository.insertSale(
        { status: "completed", total, createdAt, customerId: input.customerId ?? null },
        tx,
      );
      salesRepository.insertSaleItems(
        lines.map((line) => ({ ...line, saleId: sale.id })),
        tx,
      );
      // Lanza BadRequestError si los pagos no cubren el total — la transacción entera revierte.
      salesRepository.insertSalePayments(
        resolvePayments(sale.id, input.payments, total, terms, createdAt),
        tx,
      );

      for (const line of lines) {
        // Lanza ConflictError si no hay stock suficiente — la transacción entera revierte.
        productsService.adjustStock(line.productId, -line.quantity, tx, {
          type: "SALE",
          saleId: sale.id,
        });
      }

      return sale.id;
    });

    return salesService.findById(saleId);
  },

  /**
   * Anula una venta `completed` y devuelve al stock todos sus items, en una única transacción.
   * Una venta anulada no vuelve a `completed` ni se puede anular dos veces.
   */
  cancel(id: number): SaleDto {
    const saleId = db.transaction((tx) => {
      const sale = salesRepository.findById(id, tx);
      if (!sale) throw new NotFoundError("Venta no encontrada");
      if (sale.status === "cancelled") throw new ConflictError("La venta ya está anulada");

      for (const item of salesRepository.findItemsBySaleId(id, tx)) {
        // Movimiento nuevo (SALE_CANCELLATION): el SALE original nunca se edita.
        productsService.adjustStock(item.productId, item.quantity, tx, {
          type: "SALE_CANCELLATION",
          saleId: id,
        });
      }

      salesRepository.markCancelled(id, new Date(), tx);
      return id;
    });

    return salesService.findById(saleId);
  },
};
