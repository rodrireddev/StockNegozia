/**
 * Errores de dominio para la capa de datos local — mismos tres casos que
 * `apps/backend/src/core/*` señaliza con excepciones de NestJS (`NotFoundException`,
 * `ConflictException`, `BadRequestException`), sin el framework HTTP: acá no hay un
 * `GlobalExceptionFilter` que las traduzca a un status code, así que las pantallas las atrapan
 * directamente (`error.message`) en el `onError` de la mutación o el `catch` del formulario.
 */
export class NotFoundError extends Error {}
export class ConflictError extends Error {}
export class BadRequestError extends Error {}
