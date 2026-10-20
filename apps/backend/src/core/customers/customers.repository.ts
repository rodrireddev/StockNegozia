import { Inject, Injectable } from "@nestjs/common";
import type { CustomerPaymentMethod } from "@stocknegozia/api-contracts";
import { and, asc, count, desc, eq, getTableColumns, max, sql, sum, type SQL } from "drizzle-orm";
import { DRIZZLE_CLIENT } from "../../database/database.constants";
import type { Database, DrizzleExecutor } from "../../database/database.types";
import { customerPayments, customers, salePayments, sales } from "../../database/schema";

export interface CustomerRecord {
  name: string;
  phone: string | null;
  email: string | null;
  documentNumber: string | null;
  notes: string | null;
}

export interface NewCustomerPaymentRecord {
  customerId: number;
  amount: number;
  method: CustomerPaymentMethod;
  note: string | null;
}

/**
 * Saldo de cuenta corriente de `customerId` (una columna SQL): ventas a cuenta no canceladas −
 * pagos registrados. Subconsultas correlacionadas en vez de joins: con dos joins a tablas hijas las
 * sumas se multiplicarían entre sí. Exportado para que Finanzas calcule el total adeudado igual.
 */
export function customerBalanceSql(customerId: SQL | typeof customers.id): SQL<number> {
  return sql<number>`(
    coalesce((select sum(sp.amount) from sale_payments sp join sales s on s.id = sp.sale_id
      where s.customer_id = ${customerId} and s.status = 'completed' and sp.method = 'account'), 0)
    - coalesce((select sum(cp.amount) from customer_payments cp where cp.customer_id = ${customerId}), 0)
  )`.mapWith(Number);
}

@Injectable()
export class CustomersRepository {
  constructor(@Inject(DRIZZLE_CLIENT) private readonly db: Database) {}

  /** Clientes + agregados de sus ventas completadas, en una sola query. */
  private selectWithStats(executor: DrizzleExecutor) {
    return executor
      .select({
        ...getTableColumns(customers),
        salesCount: count(sales.id),
        totalSpent: sql<number>`coalesce(${sum(sales.total)}, 0)`.mapWith(Number),
        lastSaleAt: max(sales.createdAt),
        balance: customerBalanceSql(customers.id),
      })
      .from(customers)
      .leftJoin(sales, and(eq(sales.customerId, customers.id), eq(sales.status, "completed")))
      .groupBy(customers.id);
  }

  findAll(executor: DrizzleExecutor = this.db) {
    return this.selectWithStats(executor).orderBy(asc(customers.name)).all();
  }

  findById(id: number, executor: DrizzleExecutor = this.db) {
    return this.selectWithStats(executor).where(eq(customers.id, id)).get();
  }

  insert(data: CustomerRecord, executor: DrizzleExecutor = this.db) {
    return executor
      .insert(customers)
      .values({ ...data, createdAt: new Date() })
      .returning({ id: customers.id })
      .get();
  }

  update(id: number, data: CustomerRecord, executor: DrizzleExecutor = this.db) {
    executor.update(customers).set(data).where(eq(customers.id, id)).run();
  }

  /** Ventas a cuenta (no canceladas) del cliente — una fila por venta, con lo que quedó a cuenta. */
  findAccountSales(customerId: number, executor: DrizzleExecutor = this.db) {
    return executor
      .select({
        saleId: sales.id,
        amount: sql<number>`sum(${salePayments.amount})`.mapWith(Number),
        createdAt: sales.createdAt,
      })
      .from(salePayments)
      .innerJoin(sales, eq(salePayments.saleId, sales.id))
      .where(
        and(
          eq(sales.customerId, customerId),
          eq(sales.status, "completed"),
          eq(salePayments.method, "account"),
        ),
      )
      .groupBy(sales.id)
      .orderBy(desc(sales.createdAt))
      .all();
  }

  findPayments(customerId: number, executor: DrizzleExecutor = this.db) {
    return executor
      .select()
      .from(customerPayments)
      .where(eq(customerPayments.customerId, customerId))
      .orderBy(desc(customerPayments.createdAt))
      .all();
  }

  insertPayment(data: NewCustomerPaymentRecord, executor: DrizzleExecutor = this.db) {
    return executor
      .insert(customerPayments)
      .values({ ...data, createdAt: new Date() })
      .returning()
      .get();
  }
}
