import { stockMovementQuerySchema } from "@stocknegozia/validation";
import { describe, expect, it } from "vitest";

/**
 * `type` del filtro de `GET /stock-movements` debe aceptar los 4 tipos reales que existen en la
 * base (`stock_movements.type`, ver database/schema/stock-movements.ts) — hasta M11 solo aceptaba
 * 3, así que filtrar por `type=PURCHASE` era rechazado por el `ZodValidationPipe` con un 400,
 * pese a que el movimiento sí existe y se puede ver sin filtrar. Bloqueaba directamente el
 * criterio de aceptación de M11 ("ver movimiento PURCHASE" en el historial).
 */
describe("stockMovementQuerySchema", () => {
  it.each(["SALE", "SALE_CANCELLATION", "ADJUSTMENT", "PURCHASE"] as const)(
    "acepta type=%s",
    (type) => {
      const result = stockMovementQuerySchema.safeParse({ type });
      expect(result.success).toBe(true);
    },
  );

  it("rechaza un type inexistente", () => {
    const result = stockMovementQuerySchema.safeParse({ type: "REFUND" });
    expect(result.success).toBe(false);
  });

  it("acepta la query sin filtros (todos opcionales)", () => {
    const result = stockMovementQuerySchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
