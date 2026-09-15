/**
 * Piso de visibilidad del splash en producción — ver `ensureMinimumVisible` más abajo. 1000ms:
 * suficiente para que el logo se alcance a percibir incluso si backend+renderer están listos casi
 * al instante, sin que se sienta como una demora artificial.
 */
export const MIN_SPLASH_VISIBLE_MS = 1000;

/**
 * El splash NO usa un `setTimeout` como mecanismo principal de cierre — se cierra cuando el
 * backend está saludable y la ventana principal emitió `ready-to-show` (ver `index.ts`). Esta
 * función solo evita el "flash" de un splash que aparece y desaparece en un puñado de
 * milisegundos cuando el arranque es excepcionalmente rápido: si ya pasó `minimumMs` desde que se
 * mostró, resuelve inmediatamente sin esperar nada extra; si no, espera únicamente el resto que
 * falta. Nunca agrega demora a un arranque lento — solo pone un piso al rápido.
 */
export async function ensureMinimumVisible(shownAt: number, minimumMs: number): Promise<void> {
  const remaining = minimumMs - (Date.now() - shownAt);
  if (remaining > 0) {
    await new Promise((resolve) => setTimeout(resolve, remaining));
  }
}
