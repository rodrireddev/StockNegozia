/** Mismo límite que Desktop (`MAX_IMAGE_BYTES` en su `ProductForm.tsx`) — el campo `image` es un
 *  string libre (URL o data URI) sin límite de tamaño en el backend; el límite es una convención
 *  de cliente que ambas apps respetan igual, para no guardar fotos enormes en la base SQLite.
 *  Compartido entre `ProductPhotoCapture` (cámara) y el picker de galería en `ProductForm`. */
export const MAX_IMAGE_BYTES = 2 * 1024 * 1024;

export function estimateBase64Bytes(base64: string): number {
  // Cada 4 caracteres base64 codifican 3 bytes — estimación estándar sin decodificar el string.
  return Math.ceil((base64.length * 3) / 4);
}
