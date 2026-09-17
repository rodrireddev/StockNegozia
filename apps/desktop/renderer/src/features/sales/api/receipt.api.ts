/**
 * Igual que Backup: no pasa por `apiGet`/`apiPost` (no es HTTP directo al backend) — pasa por
 * `window.receipt.*` (IPC vía preload, ver apps/desktop/electron/preload/index.ts). Electron Main
 * es quien de verdad descarga el PDF del backend y lo escribe en la ruta que el usuario eligió en
 * un diálogo nativo; el Renderer nunca ve esa ruta.
 */
export function downloadSaleReceipt(saleId: number) {
  return window.receipt.downloadSale(saleId);
}
