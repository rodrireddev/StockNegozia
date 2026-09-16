/**
 * Estructura mínima para poder asociar una compra a un proveedor — ver
 * docs/inventory/PURCHASES.md. Deliberadamente sin direcciones, cuenta corriente ni condiciones de
 * pago: eso queda fuera de alcance hasta que exista una necesidad real. `phone` es el único dato
 * de contacto — opcional, nunca inventado.
 */
export interface SupplierDto {
  id: number;
  name: string;
  phone: string | null;
  createdAt: string;
}
