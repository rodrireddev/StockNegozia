import { HttpException } from "@nestjs/common";
import type { LogErrorInfo, LogLevel } from "./log-entry";

export function normalizeError(error: unknown): LogErrorInfo {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { name: "UnknownError", message: String(error) };
}

/**
 * Errores de negocio conocidos (HttpException con status < 500, ej. NotFoundException,
 * ConflictException) son WARN — son parte del funcionamiento esperado de la aplicación. Cualquier
 * otra cosa es un error inesperado y se registra como ERROR.
 */
export function errorLogLevel(error: unknown): LogLevel {
  if (error instanceof HttpException && error.getStatus() < 500) {
    return "WARN";
  }
  return "ERROR";
}
