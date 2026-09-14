/**
 * Estructura mínima para poder asociar una compra a un proveedor — ver
 * docs/inventory/PURCHASES.md. Deliberadamente sin contactos, direcciones, cuenta corriente ni
 * condiciones de pago: eso queda fuera de alcance hasta que exista una necesidad real.
 */
export interface SupplierDto {
  id: number;
  name: string;
  createdAt: string;
}
