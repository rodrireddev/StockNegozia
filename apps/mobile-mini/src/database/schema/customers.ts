import { sqliteTable, text, integer, index, real } from "drizzle-orm/sqlite-core";

/**
 * Clientes — misma tabla que apps/backend/src/database/schema/customers.ts: opcionales en una venta
 * (la de mostrador anónima es el caso normal); con cliente se puede vender a cuenta corriente.
 */
export const customers = sqliteTable(
  "customers",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    phone: text("phone"),
    email: text("email"),
    // DNI/CUIT libre — sin validar formato: depende del país y de si es persona o empresa.
    documentNumber: text("document_number"),
    notes: text("notes"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    nameIdx: index("customers_name_idx").on(table.name),
  }),
);

/**
 * Pagos de cuenta corriente: lo que un cliente abona de lo que compró a cuenta (`sale_payments`
 * con `method = 'account'`). Saldo = ventas a cuenta no canceladas − estos pagos.
 */
export const customerPayments = sqliteTable(
  "customer_payments",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    customerId: integer("customer_id")
      .notNull()
      .references(() => customers.id),
    amount: real("amount").notNull(),
    method: text("method", {
      enum: ["cash", "debit_card", "credit_card", "transfer", "qr", "other"],
    }).notNull(),
    note: text("note"),
    createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  },
  (table) => ({
    customerIdx: index("customer_payments_customer_id_idx").on(table.customerId),
    createdAtIdx: index("customer_payments_created_at_idx").on(table.createdAt),
  }),
);
