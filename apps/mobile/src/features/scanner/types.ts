/**
 * Contrato preparado para un futuro milestone de escaneo de códigos (QR/barcode de productos) —
 * ver docs/mobile/MOBILE_CLIENT.md §Scanner-ready architecture. NO implementado en M15: sin
 * cámara, sin librería de barcode, sin permiso `CAMERA` (ver app.json — `android.permissions` está
 * vacío a propósito).
 *
 * La idea es que cuando se implemente el scanner, produzca un `ScanResult` y se lo entregue a
 * `features/products` (o a quien corresponda) sin que ese consumidor conozca la librería de
 * cámara usada — igual que `features/pairing` hoy no depende de cómo se obtuvo el JSON del QR
 * (pegado a mano), solo de su forma ya parseada.
 */
export interface ScanResult {
  /** Valor crudo leído del código (contenido del QR, o el número del barcode). */
  code: string;
  /** Formato detectado — ej. "qr", "ean13", "code128". Definido por la implementación futura. */
  format: string;
}
