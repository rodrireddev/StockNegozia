/**
 * Un lector de código de barras USB/Bluetooth "tipea" el código como si fuera un teclado — cada
 * carácter llega en pocos milisegundos, muy por debajo de lo que puede sostener una persona
 * tipeando a mano (incluso rápido, los intervalos entre teclas rondan los 100ms+). Esta función
 * usa esa diferencia de velocidad para reconocer un escaneo sin depender de que el lector además
 * mande un Enter al terminar — algunos vienen configurados sin ese sufijo, y ahí un buscador que
 * solo reacciona al Enter se queda con el código tipeado sin agregar nada (ver
 * docs/inventory/PRODUCT_SCANNER.md §Lectores HID).
 *
 * `timestamps` son los momentos (ms, `Date.now()`) en que se tipeó cada carácter de la carga
 * actual, en orden. Devuelve `true` solo si TODOS los intervalos entre caracteres consecutivos
 * están por debajo de `maxIntervalMs` — un solo intervalo lento (una persona tipeando) alcanza
 * para descartar el resto de la serie.
 */
export function isRapidKeystrokeBurst(timestamps: number[], maxIntervalMs = 40): boolean {
  if (timestamps.length < 2) return false;

  for (let i = 1; i < timestamps.length; i++) {
    const current = timestamps[i];
    const previous = timestamps[i - 1];
    if (current === undefined || previous === undefined) continue;
    if (current - previous > maxIntervalMs) return false;
  }
  return true;
}
