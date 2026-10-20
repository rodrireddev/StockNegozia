const NETWORK_ERROR_MESSAGE =
  "No pudimos conectar con la aplicación. Verificá que esté funcionando e intentá nuevamente.";
const SERVER_ERROR_MESSAGE =
  "No pudimos completar la operación. Intentá nuevamente en unos segundos.";
const UNKNOWN_ERROR_MESSAGE = "Ocurrió un error inesperado. Intentá nuevamente.";

// Coincide con el mensaje de fallback genérico de `parseErrorMessage` en `api-client.ts`
// (`Request to ${path} failed with status ${status}`) — se usa cuando el backend respondió con
// un error pero sin un `body.message` legible (por ejemplo, un 500 con cuerpo no-JSON).
const RAW_HTTP_FALLBACK_PATTERN = /^Request to .+ failed with status \d+$/;

/**
 * Traduce un error técnico a un mensaje en español que un usuario no técnico pueda entender.
 *
 * Cuando el backend respondió con un error de negocio (`ConflictException`, `NotFoundException`,
 * validación Zod), `api-client.ts` ya arma `error.message` con el texto en español que viene de
 * `body.message` — ese mensaje se usa tal cual. Solo se reemplaza cuando el error es técnico:
 * `fetch` no llegó a conectar (`TypeError`) o el backend no devolvió un mensaje legible.
 */
export function getUserFriendlyError(error: unknown): string {
  if (error instanceof TypeError) {
    return NETWORK_ERROR_MESSAGE;
  }
  if (error instanceof Error) {
    if (RAW_HTTP_FALLBACK_PATTERN.test(error.message)) {
      return SERVER_ERROR_MESSAGE;
    }
    if (error.message.trim().length > 0) {
      return error.message;
    }
  }
  return UNKNOWN_ERROR_MESSAGE;
}
